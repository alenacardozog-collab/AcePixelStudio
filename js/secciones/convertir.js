/* CONVERTIR: toma una imagen de referencia (boceto, asset viejo, ilustración) y la pasa a asset siguiendo la guía de estilo:
   quita el fondo, la lleva al tamaño real, a la paleta, limpia píxeles sueltos y le pone el contorno. Sin gastar créditos de IA. */
'use strict';
(function () {
  const h = CK.h;
  let el, panel, centro, acciones, cvA, cvB, infoA, infoB, lista;
  const st = { fuente: null, res: null, cfg: null, gotero: false };
  const cfg = () => {
    if (!st.cfg)
      st.cfg = Object.assign(
        {},
        PIX.CONV,
        { alto: CK.P.estilo.tile * 2, ancho: CK.P.estilo.tile * 2, contorno: 'ninguno' },
        CK.P.ui.convertir || {}
      );
    return st.cfg;
  };
  const guardarCfg = () => {
    CK.P.ui.convertir = st.cfg;
  };

  const procesar = CK.debounce(() => {
    if (!st.fuente || !CK.img[st.fuente]) {
      st.res = null;
      pintarVista();
      return;
    }
    const t0 = performance.now(),
      src = CK.asset.pix(st.fuente);
    try {
      st.res = PIX.convert(src, cfg(), CK.P.estilo.paleta);
    } catch (e) {
      console.error(e);
      CK.aviso('No se pudo convertir: ' + e.message, 'error');
      st.res = null;
    }
    pintarVista();
    CK.estadoDer('Convertido en ' + Math.round(performance.now() - t0) + ' ms');
  }, 60);
  const dibujarEn = (cv, lienzo, info, txt) => {
    const caja = cv.parentElement.getBoundingClientRect(),
      W = Math.max(60, Math.floor(caja.width) - 20),
      H = Math.max(60, Math.floor(caja.height) - 46);
    cv.width = W;
    cv.height = H;
    const x = CK.ctx(cv);
    CK.cuadros(x, W, H, 10);
    if (!lienzo) {
      info.textContent = txt || '';
      return;
    }
    let k = Math.min(W / lienzo.width, H / lienzo.height);
    if (k >= 1) k = Math.floor(k);
    const w = Math.round(lienzo.width * k),
      hh = Math.round(lienzo.height * k);
    x.imageSmoothingEnabled = k < 1;
    x.drawImage(lienzo, Math.round((W - w) / 2), Math.round((H - hh) / 2), w, hh);
    cv._k = k;
    cv._ox = Math.round((W - w) / 2);
    cv._oy = Math.round((H - hh) / 2);
    info.textContent = txt;
  };
  const pintarVista = () => {
    if (!cvA) return;
    const a = st.fuente && CK.img[st.fuente];
    dibujarEn(cvA, a, infoA, a ? 'Referencia · ' + a.width + ' × ' + a.height + ' px' : 'Subí o elegí una referencia');
    if (st.res) {
      const s = PIX.stats(st.res, CK.P.estilo.paleta);
      dibujarEn(
        cvB,
        CK.aLienzo(st.res),
        infoB,
        'Resultado · ' +
          st.res.w +
          ' × ' +
          st.res.h +
          ' px · ' +
          s.colores +
          ' colores' +
          (s.fueraDePaleta > 0.01 ? ' · ' + Math.round(s.fueraDePaleta * 100) + '% fuera de paleta' : '')
      );
    } else dibujarEn(cvB, null, infoB, '');
    pintarAcciones();
  };

  const subir = async archivos => {
    const as = await CK.importarImagenes('ref', archivos);
    if (as.length) {
      st.fuente = as[0].id;
      lista.refrescar();
      auto();
      procesar();
    }
  };
  const auto = () => {
    const a = st.fuente && CK.img[st.fuente];
    if (!a) return;
    const f = PIX.pixelScale(CK.asset.pix(st.fuente));
    if (f > 1) {
      cfg().modoTam = 'auto';
      CK.aviso('Esta imagen ya es pixel art agrandado ×' + f + ': la llevo a su tamaño real.', 'info', 4000);
      pintarPanel();
    }
  };
  const guardar = async (tipo, extra) => {
    if (!st.res) return null;
    const base = CK.P.assets[st.fuente],
      d = { nombre: (base ? base.nombre : 'asset').replace(/_ref$/, ''), tipo: tipo || 'sprite' };
    const ok = await CK.ventana({
      titulo: 'Guardar como asset',
      cuerpo: h(
        'div',
        CK.campo(
          'Nombre',
          CK.txt(
            d.nombre,
            v => {
              d.nombre = v;
            },
            { vivo: true }
          )
        ),
        CK.campo(
          'Tipo',
          CK.sel(
            d.tipo,
            Object.keys(CK.asset.TIPOS)
              .filter(k => k !== 'ref')
              .map(k => [k, CK.asset.TIPOS[k]]),
            v => {
              d.tipo = v;
            }
          )
        )
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Guardar asset', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return null;
    const a = CK.asset.crear(
      Object.assign(
        {
          nombre: d.nombre.trim() || 'asset',
          tipo: d.tipo,
          lienzo: CK.aLienzo(st.res),
          origen: 'convertido de ' + (base ? base.nombre : '?')
        },
        extra || {}
      )
    );
    CK.aviso('Guardado: ' + a.nombre + ' (' + a.w + ' × ' + a.h + ')');
    return a;
  };
  const guardarTodas = async () => {
    const refs = CK.asset.lista('ref');
    if (!refs.length) return;
    if (
      !(await CK.confirmar(
        'Convertir todas',
        'Se convierten las ' +
          refs.length +
          ' referencias con estos mismos ajustes y cada una se guarda como asset. Las que ya tengan un asset con el mismo nombre se actualizan.',
        'Convertir ' + refs.length
      ))
    )
      return;
    let n = 0;
    for (const r of refs) {
      const res = PIX.convert(CK.asset.pix(r.id), cfg(), CK.P.estilo.paleta),
        nombre = r.nombre,
        ya = Object.values(CK.P.assets).find(a => a.tipo !== 'ref' && a.origen === 'convertido de ' + nombre);
      if (ya) CK.asset.poner(ya.id, CK.aLienzo(res));
      else CK.asset.crear({ nombre, tipo: 'sprite', lienzo: CK.aLienzo(res), origen: 'convertido de ' + nombre });
      n++;
    }
    CK.aviso('Convertidas ' + n + ' referencias');
  };
  const enCuadros = async () => {
    if (!st.res) return;
    const d = { fw: CK.P.estilo.personaje[0], fh: st.res.h, fps: 8 };
    const ok = await CK.ventana({
      titulo: 'Separar en cuadros de animación',
      cuerpo: h(
        'div',
        h(
          'p',
          'Si la referencia es una tira de poses, indicá el tamaño de cada cuadro. El resultado mide ' +
            st.res.w +
            ' × ' +
            st.res.h +
            ' px.'
        ),
        CK.campo(
          'Ancho del cuadro',
          CK.num(d.fw, { min: 1 }, v => {
            d.fw = v;
          })
        ),
        CK.campo(
          'Alto del cuadro',
          CK.num(d.fh, { min: 1 }, v => {
            d.fh = v;
          })
        ),
        CK.campo(
          'Cuadros por segundo',
          CK.num(d.fps, { min: 1, max: 30 }, v => {
            d.fps = v;
          })
        )
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Guardar animación', cls: 'pri', valor: true }
      ]
    });
    if (ok) {
      const a = await guardar('hoja', { cuadros: { fw: d.fw, fh: d.fh, fps: d.fps, bucle: true } });
      if (a) CK.ir('anim', { asset: a.id });
    }
  };

  // ---------------------------------------------------------------- panel de ajustes
  const fila = (rot, ctrl, ayuda) => CK.campo(rot, ctrl, ayuda);
  const pintarPanel = () => {
    if (!panel) return;
    CK.vaciar(panel);
    const c = cfg(),
      re = () => {
        guardarCfg();
        procesar();
      };
    lista = CK.galeria({
      tipos: ['ref'],
      actual: () => st.fuente,
      alElegir: id => {
        st.fuente = id;
        auto();
        procesar();
      },
      sinBuscar: true,
      vacio: 'Sin referencias. Subí una imagen o arrastrala acá.'
    });
    panel.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Referencias',
          CK.btn({
            ico: 'importar',
            txt: 'Subir',
            cls: 'chico pri',
            desc: 'Subí una o varias imágenes: bocetos, assets viejos, ilustraciones, capturas. Quedan guardadas en el proyecto.',
            on: () => subir()
          })
        ),
        lista,
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            txt: 'Usar un asset del proyecto',
            cls: 'chico',
            desc: 'Volver a pasar por el filtro un asset que ya tenés (por ejemplo, uno importado del juego).',
            on: async () => {
              const id = await CK.elegirAsset('Asset a convertir', ['sprite', 'hoja', 'personaje', 'textura', 'fondo', 'ui']);
              if (id) {
                st.fuente = id;
                auto();
                procesar();
              }
            }
          }),
          st.fuente && CK.P.assets[st.fuente] && CK.P.assets[st.fuente].tipo === 'ref'
            ? CK.btn({
                ico: 'basura',
                tip: 'Quitar esta referencia',
                cls: 'chico peligro',
                on: () => {
                  CK.asset.borrar(st.fuente);
                  st.fuente = null;
                  procesar();
                }
              })
            : null
        )
      )
    );
    panel.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', { html: CK.ico('recortar', 16) }, 'Recorte'),
        CK.chk(
          c.quitarFondo,
          'Quitar el fondo',
          v => {
            c.quitarFondo = v;
            re();
          },
          'Borra el color liso de alrededor (toma el de las esquinas) y deja transparente.'
        ),
        fila(
          'Tolerancia',
          CK.rango(c.tolFondo, { min: 0, max: 90 }, v => {
            c.tolFondo = v;
            re();
          }),
          'Qué tan parecido al fondo tiene que ser un color para borrarse. Subila si quedan restos; bajala si se come el dibujo.'
        ),
        CK.chk(
          c.fino !== false,
          'Recorte fino del borde',
          v => {
            c.fino = v;
            re();
          },
          'Pensado para imágenes hechas con IA sobre fondo blanco o liso. Revisa el borde píxel por píxel: lo que es más fondo que dibujo se va, y lo que es mezcla queda con el color limpio del dibujo, así no queda filo blanco. Un contorno oscuro o una prenda clara de verdad no se tocan.'
        ),
        fila(
          'Quitar sombra del piso',
          CK.rango(c.sombra === undefined ? 50 : c.sombra, { min: 0, max: 100, step: 5 }, v => {
            c.sombra = v;
            re();
          }),
          'Las IA suelen dibujar una sombra gris suave debajo del personaje. Este valor decide cuánto gris cuenta como sombra y se va con el fondo; solo mira la parte de abajo de la figura. Subilo si queda una mancha gris bajo los pies; bajalo a 0 si se come botas o piedras gris claro.'
        ),
        CK.chk(
          !!c.huecos,
          'Borrar también el fondo encerrado',
          v => {
            c.huecos = v;
            re();
          },
          'Quita el color de fondo que quedó atrapado dentro del dibujo: entre las ramas de un árbol, el hueco de un asa, una ventana. Apagalo si el dibujo tiene partes del mismo color que el fondo.'
        ),
        h(
          'div.fila',
          CK.btn({
            ico: 'gotero',
            txt: c.colorFondo ? 'Fondo: ' + c.colorFondo : 'Elegir color de fondo',
            cls: 'chico' + (st.gotero ? ' activo' : ''),
            desc: 'Hacé clic en la referencia sobre el color que querés borrar. Útil si el fondo no llega a las esquinas.',
            on: () => {
              st.gotero = !st.gotero;
              pintarPanel();
              CK.estado(st.gotero ? 'Clic en la referencia sobre el color de fondo' : '');
            }
          }),
          c.colorFondo
            ? CK.btn({
                ico: 'cerrar',
                tip: 'Volver a detectar el fondo solo',
                cls: 'chico',
                on: () => {
                  c.colorFondo = null;
                  re();
                  pintarPanel();
                }
              })
            : null
        ),
        CK.chk(
          c.recortar,
          'Recortar al contenido',
          v => {
            c.recortar = v;
            re();
          },
          'Quita el espacio vacío de alrededor.'
        )
      )
    );
    const tam = h(
      'div.bloque',
      h('h3.bloque-tit', { html: CK.ico('tamano', 16) }, 'Tamaño final'),
      fila(
        'Medir por',
        CK.sel(
          c.modoTam,
          [
            ['alto', 'Alto en píxeles'],
            ['ancho', 'Ancho en píxeles'],
            ['exacto', 'Ancho y alto exactos'],
            ['factor', 'Dividir por un número'],
            ['auto', 'Detectar pixel art agrandado'],
            ['igual', 'No cambiar']
          ],
          v => {
            c.modoTam = v;
            re();
            pintarPanel();
          }
        ),
        'Cómo se decide el tamaño real del asset.'
      )
    );
    const T = CK.P.estilo.tile,
      rap = (txt, v) =>
        CK.btn({
          txt,
          cls: 'chico',
          on: () => {
            c.alto = v;
            c.ancho = v;
            re();
            pintarPanel();
          }
        });
    if (c.modoTam === 'alto' || c.modoTam === 'exacto')
      tam.append(
        fila(
          'Alto',
          CK.num(c.alto, { min: 1, max: 1024 }, v => {
            c.alto = v;
            re();
          })
        )
      );
    if (c.modoTam === 'ancho' || c.modoTam === 'exacto')
      tam.append(
        fila(
          'Ancho',
          CK.num(c.ancho, { min: 1, max: 1024 }, v => {
            c.ancho = v;
            re();
          })
        )
      );
    if (c.modoTam === 'alto' || c.modoTam === 'ancho' || c.modoTam === 'exacto')
      tam.append(
        h('div.fila', h('span.nota-txt', 'En tiles:'), rap('1', T), rap('2', T * 2), rap('3', T * 3), rap('4', T * 4), rap('6', T * 6))
      );
    if (c.modoTam === 'factor')
      tam.append(
        fila(
          'Dividir por',
          CK.num(c.factor, { min: 1, max: 64 }, v => {
            c.factor = v;
            re();
          })
        )
      );
    if (c.modoTam !== 'igual' && c.modoTam !== 'auto')
      tam.append(
        fila(
          'Método',
          CK.sel(
            c.metodo,
            [
              ['dominante', 'Color dominante (más nítido)'],
              ['promedio', 'Promedio (más suave)']
            ],
            v => {
              c.metodo = v;
              re();
            }
          ),
          'Dominante: cada píxel toma el color que más aparece en su zona; conserva líneas y contornos. Promedio: mezcla; mejor para fotos.'
        )
      );
    panel.append(tam);
    panel.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', { html: CK.ico('paleta', 16) }, 'Colores'),
        CK.chk(
          c.usarPaleta,
          'Llevar a la paleta del proyecto (' + CK.P.estilo.paleta.length + ')',
          v => {
            c.usarPaleta = v;
            re();
          },
          'Reemplaza cada color por el más cercano de tu paleta fija. Es lo que más unifica.'
        ),
        fila(
          'Fuerza',
          CK.rango(Math.round(c.fuerza * 100), { min: 0, max: 100, step: 5 }, v => {
            c.fuerza = v / 100;
            re();
          }),
          '100: colores exactos de la paleta. Menos: solo los acerca.'
        ),
        fila(
          'Tramado',
          CK.rango(c.tramado, { min: 0, max: 3 }, v => {
            c.tramado = v;
            re();
          }),
          'Mezcla dos colores en damero para simular tonos intermedios. 0 = sin tramado (lo más limpio).'
        ),
        fila(
          'Reducir antes a',
          CK.sel(
            String(c.maxColores),
            [
              ['0', 'No reducir'],
              ['4', '4 colores'],
              ['8', '8 colores'],
              ['12', '12 colores'],
              ['16', '16 colores'],
              ['24', '24 colores'],
              ['32', '32 colores']
            ],
            v => {
              c.maxColores = +v;
              re();
            }
          ),
          'Simplifica la imagen a pocos colores propios antes de pasarla a la paleta. Ayuda con fotos y arte muy detallado.'
        )
      )
    );
    const cont = h(
      'div.bloque',
      h('h3.bloque-tit', { html: CK.ico('limpiar', 16) }, 'Limpieza y contorno'),
      CK.chk(
        c.bordesDuros,
        'Bordes duros',
        v => {
          c.bordesDuros = v;
          re();
        },
        'Elimina los bordes semitransparentes y borrosos: cada píxel queda opaco o transparente.'
      ),
      CK.chk(
        c.limpiar,
        'Quitar píxeles sueltos',
        v => {
          c.limpiar = v;
          re();
        },
        'Borra puntos aislados y corrige píxeles de un color que quedaron solos.'
      ),
      fila(
        'Contorno',
        CK.sel(
          c.contorno,
          [
            ['ninguno', 'No agregar'],
            ['color', 'De color (tono más oscuro)'],
            ['negro', 'Negro'],
            ['fijo', 'Color elegido']
          ],
          v => {
            c.contorno = v;
            re();
            pintarPanel();
          }
        ),
        'Agrega 1 píxel de borde alrededor de la figura. La guía de estilo dice: ' + CK.P.estilo.contorno + '.'
      )
    );
    if (c.contorno === 'fijo')
      cont.append(
        fila(
          'Color',
          CK.color(c.colorContorno, v => {
            c.colorContorno = v;
            re();
          })
        )
      );
    cont.append(
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        CK.btn({
          txt: 'Usar la guía de estilo',
          cls: 'chico',
          desc: 'Pone el contorno y la paleta como dice la guía.',
          on: () => {
            const e = CK.P.estilo;
            c.usarPaleta = true;
            c.fuerza = 1;
            c.contorno = e.contorno === 'negro' ? 'fijo' : e.contorno;
            c.colorContorno = e.colorContorno;
            re();
            pintarPanel();
          }
        }),
        CK.btn({
          txt: 'Restablecer',
          cls: 'chico',
          on: () => {
            st.cfg = Object.assign({}, PIX.CONV, { alto: T * 2, ancho: T * 2 });
            re();
            pintarPanel();
          }
        })
      )
    );
    panel.append(cont);
  };
  const pintarAcciones = () => {
    if (!acciones) return;
    CK.vaciar(acciones);
    const hay = !!st.res;
    acciones.append(
      CK.btn({
        ico: 'guardar',
        txt: 'Guardar como asset',
        cls: 'pri',
        desc: 'Guarda el resultado en el proyecto, listo para colocar en un mapa o seguir retocando.',
        on: () => guardar()
      }),
      CK.btn({
        ico: 'pixel',
        txt: 'Retocar en Pixel art',
        desc: 'Guarda el resultado y lo abre en el editor de píxeles para el retoque fino.',
        on: async () => {
          const a = await guardar();
          if (a) CK.ir('pixel', a.id);
        }
      }),
      CK.btn({
        ico: 'hoja',
        txt: 'Separar en cuadros',
        desc: 'Para una tira de poses: guarda el resultado como animación indicando el tamaño de cada cuadro.',
        on: enCuadros
      }),
      CK.btn({
        ico: 'texturas',
        txt: 'Usar como textura',
        desc: 'Guarda el resultado y lo lleva a Texturas para hacerlo repetible y armar transiciones.',
        on: async () => {
          const a = await guardar('textura');
          if (a) CK.ir('texturas', a.id);
        }
      }),
      CK.btn({
        ico: 'importar',
        txt: 'Descargar PNG',
        desc: 'Baja el resultado para abrirlo en Aseprite.',
        on: async () => {
          if (st.res) CK.descargar(await CK.aBlob(CK.aLienzo(st.res)), 'convertido.png');
        }
      }),
      h('span.crece'),
      CK.btn({
        ico: 'duplicar',
        txt: 'Convertir todas',
        desc: 'Aplica estos mismos ajustes a todas las referencias de la lista y guarda cada una como asset.',
        on: guardarTodas
      })
    );
    acciones.querySelectorAll('.btn').forEach((b, i) => {
      if (i < 5) b.disabled = !hay;
    });
  };

  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '318px 1fr';
    panel = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    cvA = h('canvas');
    cvB = h('canvas');
    infoA = h('div.ayuda-txt', { style: { padding: '6px 2px' } });
    infoB = h('div.ayuda-txt', { style: { padding: '6px 2px' } });
    const caja = (cv, info, tit) =>
      h(
        'div',
        { style: { minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px', overflow: 'hidden' } },
        h('div.bloque-tit', tit),
        h(
          'div',
          {
            style: {
              flex: 1,
              minHeight: 0,
              border: '1px solid var(--linea)',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--hueco)'
            }
          },
          cv
        ),
        info
      );
    acciones = h('div.fila', { style: { padding: '10px', borderTop: '1px solid var(--linea)', background: 'var(--panel)' } });
    const bCmp = CK.btn({
      ico: 'comparar',
      txt: 'Comparar',
      cls: 'chico',
      desc: 'Pone la referencia y el resultado uno encima del otro, con una cortina para arrastrar. Así se ve qué se perdió y qué se ganó.',
      on: () => {
        if (!st.res || !CK.img[st.fuente]) {
          CK.aviso('Primero elegí una referencia.', 'info');
          return;
        }
        CK.ventanaComparar('Referencia y resultado', CK.img[st.fuente], CK.aLienzo(st.res), {
          rotAntes: 'Referencia',
          rotDespues: 'Resultado'
        });
      }
    });
    bCmp.style.cssText = 'position:absolute;right:16px;top:8px;z-index:3';
    centro = h(
      'div',
      { style: { display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0, minWidth: 0, position: 'relative' } },
      h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 } },
        caja(cvA, infoA, 'Referencia'),
        caja(cvB, infoB, 'Resultado')
      ),
      acciones,
      bCmp
    );
    el.append(panel, centro);
    cvA.addEventListener('click', e => {
      if (!st.gotero || !st.fuente) return;
      const r = cvA.getBoundingClientRect(),
        px = Math.floor((e.clientX - r.left - cvA._ox) / cvA._k),
        py = Math.floor((e.clientY - r.top - cvA._oy) / cvA._k),
        src = CK.img[st.fuente];
      if (px < 0 || py < 0 || px >= src.width || py >= src.height) return;
      const d = CK.ctx(src).getImageData(px, py, 1, 1).data;
      cfg().colorFondo = PIX.rgb2hex(d[0], d[1], d[2]);
      st.gotero = false;
      guardarCfg();
      pintarPanel();
      procesar();
    });
    CK.soltarEn(el, fs => subir(fs));
    new ResizeObserver(
      CK.debounce(() => {
        if (el.style.display !== 'none') pintarVista();
      }, 80)
    ).observe(centro);
    CK.on('estilo', () => {
      if (CK.seccionVisible('convertir')) procesar();
    });
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && CK.P.assets[arg]) st.fuente = arg;
    if (st.fuente && !CK.P.assets[st.fuente]) st.fuente = null;
    pintarPanel();
    procesar();
  };
  CK.convertir = { st, procesar };
  CK.registrar({
    id: 'convertir',
    nombre: 'Convertir referencias',
    corto: 'Convertir',
    ico: 'convertir',
    desc: 'Subí una imagen de referencia y salí con un asset en tu tamaño, tu paleta y tu contorno.',
    crear,
    mostrar,
    alCambiarProyecto: () => {
      st.fuente = null;
      st.res = null;
      st.cfg = null;
    }
  });
})();
