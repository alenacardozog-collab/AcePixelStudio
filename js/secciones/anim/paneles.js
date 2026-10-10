/* ANIMAR · guardar, importar y exportar; paneles Generar y Hoja. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  // ---------------------------------------------------------------- guardar / importar / exportar
  const guardarGenerada = async () => {
    if (!An.st.frames.length) return;
    const b = CK.P.assets[An.st.base],
      def = PIX.ANIMS[An.st.tipo],
      nombre = await CK.pedir('Guardar animación', 'Nombre', b.nombre + '_' + An.st.tipo);
    if (!nombre) return;
    const fw = Math.max(...An.st.frames.map(f => f.w)),
      fh = Math.max(...An.st.frames.map(f => f.h));
    const a = CK.asset.crear({
      nombre,
      tipo: 'hoja',
      lienzo: CK.aLienzo(PIX.pack(An.st.frames, An.st.frames.length)),
      origen: 'animación "' + def.nombre + '" de ' + b.nombre,
      cuadros: {
        fw,
        fh,
        fps: An.st.fps,
        bucle: !['aparecer', 'golpe', 'humo', 'sacudir'].includes(An.st.tipo),
        oy: PIX.animBase(An.st.tipo, An.st.params)
      },
      extra: { base: b.id, col: b.col ? CK.clone(b.col) : undefined, receta: { tipo: An.st.tipo, params: CK.clone(An.st.params) } }
    });
    if (An.st.fxGen.length) a.fxPrueba = CK.clone(An.st.fxGen);
    if (An.st.origen && CK.P.mapas[An.st.origen.mapa]) {
      const m = CK.P.mapas[An.st.origen.mapa];
      let hecho = 0,
        iguales = 0;
      const fin = CK.hist.datos('Usar animación en el mapa', 'mapas', m.id);
      CK.mapa.objetosDe(m).forEach(o => {
        if (o.id === An.st.origen.objeto) {
          o.asset = a.id;
          delete o.clave;
          delete o.anim;
          if (o.marca) o.marca.estado = 'hecha';
          hecho++;
        } else if (o.asset === b.id) iguales++;
      });
      fin();
      CK.emit('notas');
      if (
        hecho &&
        iguales &&
        (await CK.confirmar(
          '¿Animar también los iguales?',
          'En "' + m.nombre + '" hay ' + iguales + ' objeto(s) más con el mismo dibujo (' + b.nombre + '). ¿Les pongo la misma animación?',
          'Sí, a todos'
        ))
      ) {
        const f2 = CK.hist.datos('Animar iguales', 'mapas', m.id);
        CK.mapa.objetosDe(m).forEach(o => {
          if (o.asset === b.id) {
            o.asset = a.id;
            delete o.clave;
            delete o.anim;
            if (o.marca) o.marca.estado = 'hecha';
          }
        });
        f2();
      }
      CK.aviso('Animación guardada y puesta en el mapa "' + m.nombre + '".', 'ok', 4500);
      An.st.origen = null;
    } else CK.aviso('Animación guardada: ' + a.nombre);
    An.st.hoja = a.id;
    An.tabs.ir('hoja');
    An.pintarIzq();
  };
  const importarTira = async () => {
    const [f] = await CK.elegirArchivos('image/png,image/gif,image/webp');
    if (!f) return;
    const c = await CK.cargarImagen(f),
      d = { fw: c.height <= c.width ? c.height : c.width, fh: c.height, fps: 8 };
    const ok = await CK.ventana({
      titulo: 'Importar tira de cuadros',
      cuerpo: h(
        'div',
        h('p', 'La imagen mide ' + c.width + ' × ' + c.height + ' px. Indicá el tamaño de cada cuadro.'),
        CK.campo(
          'Ancho del cuadro',
          CK.num(d.fw, { min: 1, max: c.width }, v => {
            d.fw = v;
          })
        ),
        CK.campo(
          'Alto del cuadro',
          CK.num(d.fh, { min: 1, max: c.height }, v => {
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
        { txt: 'Importar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    const a = CK.asset.crear({
      nombre: f.name.replace(/\.[a-z0-9]+$/i, ''),
      tipo: 'hoja',
      lienzo: c,
      origen: 'importado: ' + f.name,
      cuadros: { fw: d.fw, fh: d.fh, fps: d.fps, bucle: true }
    });
    An.st.hoja = a.id;
    An.tabs.ir('hoja');
    An.pintarIzq();
  };
  const importarSueltos = async archivos => {
    const fs = (archivos || (await CK.elegirArchivos('image/png,image/gif,image/webp', true))).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
    if (fs.length < 2) {
      if (fs.length) CK.aviso('Elegí dos o más imágenes (un cuadro por archivo).', 'info');
      return;
    }
    const frs = [];
    for (const f of fs) frs.push(CK.aPix(await CK.cargarImagen(f)));
    const fw = Math.max(...frs.map(f => f.w)),
      fh = Math.max(...frs.map(f => f.h));
    const a = CK.asset.crear({
      nombre: fs[0].name.replace(/[_\- ]?\d*\.[a-z0-9]+$/i, '') || 'animacion',
      tipo: 'hoja',
      lienzo: CK.aLienzo(PIX.pack(frs, frs.length)),
      origen: 'cuadros sueltos',
      cuadros: { fw, fh, fps: 8, bucle: true }
    });
    An.st.hoja = a.id;
    An.tabs.ir('hoja');
    An.pintarIzq();
    CK.aviso('Armada la hoja con ' + frs.length + ' cuadros');
  };
  /** Datos de la hoja en formato atlas (lo leen Phaser, Godot y Unity con sus importadores de JSON). */
  CK.animDatos = a => {
    const n = CK.asset.nCuadros(a),
      frames = {},
      ms = Math.round(1000 / (a.cuadros.fps || 8)),
      dur = a.cuadros.dur || [];
    for (let i = 0; i < n; i++) {
      const g = CK.asset.cuadro(a, i);
      frames[a.id + '_' + String(i).padStart(2, '0')] = {
        frame: { x: g.x, y: g.y, w: g.w, h: g.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: g.w, h: g.h },
        sourceSize: { w: g.w, h: g.h },
        duration: Math.round(dur[i] || ms)
      };
    }
    return {
      frames,
      meta: {
        app: 'Taller CastleKnight',
        image: a.id + '.png',
        format: 'RGBA8888',
        size: { w: a.w, h: a.h },
        scale: '1',
        frameTags: [{ name: a.id, from: 0, to: n - 1, direction: a.cuadros.vaiven ? 'pingpong' : 'forward' }],
        fps: a.cuadros.fps || 8,
        repeat: a.cuadros.bucle === false ? 0 : -1
      }
    };
  };
  const exportar = async (que, escala) => {
    const a = CK.P.assets[An.st.hoja];
    if (!a || !a.cuadros) return;
    if (que === 'png') {
      const im = PIX.resizeNearest(CK.asset.pix(a.id), a.w * escala, a.h * escala);
      CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (escala > 1 ? '_x' + escala : '') + '.png');
    } else if (que === 'json')
      CK.descargar(new Blob([JSON.stringify(CK.animDatos(a), null, 1)], { type: 'application/json' }), a.id + '.json');
    else if (que === 'gif') {
      const { ms } = An.secuencia(),
        frs = An.cuadrosVista().map(CK.aPix);
      CK.descargar(
        new Blob([CKGif(frs, { fps: a.cuadros.fps || 8, escala, bucle: a.cuadros.bucle !== false, delays: ms })], { type: 'image/gif' }),
        a.id + (escala > 1 ? '_x' + escala : '') + '.gif'
      );
    }
  };

  // ---------------------------------------------------------------- paneles
  An.pintarIzq = () => {
    if (!An.izq) return;
    CK.vaciar(An.izq);
    const pend = An.pendientes(),
      lp = h('div.lista');
    pend.forEach(({ mapa, o }) => {
      const a = CK.P.assets[o.asset],
        hecha = o.marca.estado === 'hecha';
      lp.append(
        h(
          'div.item' + (An.st.origen && An.st.origen.objeto === o.id ? '.activo' : ''),
          {
            style: { alignItems: 'flex-start' },
            onclick: () => {
              An.st.base = o.asset;
              An.st.origen = { objeto: o.id, mapa: mapa.id };
              if (PIX.ANIMS[o.marca.tipoAnim]) {
                An.st.tipo = o.marca.tipoAnim;
                An.st.params = {};
              }
              An.tabs.ir('generar');
              An.pintarIzq();
            }
          },
          CK.mini(CK.img[o.asset], 28, a && CK.asset.cuadro(a, 0)),
          h(
            'div.crece',
            h('div.nombre', (o.nombre || (a || {}).nombre || 'Objeto') + ' '),
            h('div.sub', { style: { whiteSpace: 'normal' } }, o.marca.nota || '(sin nota)'),
            h('div.sub', mapa.nombre + (o.marca.mascara ? ' · zona pintada' : ''))
          ),
          h('span.etq.' + (hecha ? 'verde' : 'oro'), hecha ? 'hecha' : 'pendiente')
        )
      );
    });
    An.izq.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Pendientes de animar (' + pend.filter(p => p.o.marca.estado !== 'hecha').length + ')'),
        pend.length
          ? lp
          : h(
              'p.nota-txt',
              'Acá aparecen los objetos que marques con la herramienta "Marcar para animar" (M) en un mapa, con la nota de cómo los querés.'
            )
      )
    );
    const g = CK.galeria({
      tipos: ['hoja', 'personaje', 'fx'],
      actual: () => (An.st.modo === 'hoja' ? An.st.hoja : null),
      alElegir: id => {
        if (!CK.P.assets[id].cuadros) {
          CK.aviso(
            'Ese asset todavía no tiene cuadros. Abrilo en Pixel art → "Convertir en animación", o usalo como base para generar.',
            'info',
            5000
          );
          An.st.base = id;
          An.tabs.ir('generar');
          return;
        }
        An.st.hoja = id;
        An.st.selC = new Set();
        An.tabs.ir('hoja');
      },
      alDoble: id => CK.ir('pixel', id),
      pista: 'Clic: verla y ajustarla. Doble clic: editar sus cuadros.',
      vacio: 'Todavía no hay animaciones.'
    });
    An.izq.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Animaciones del proyecto'),
        g,
        h(
          'div.fila',
          { style: { marginTop: '10px' } },
          CK.btn({
            ico: 'hoja',
            txt: 'Importar tira',
            cls: 'chico',
            desc: 'Una sola imagen con todos los cuadros en fila (como las que exporta PixelLab o Aseprite).',
            on: importarTira
          }),
          CK.btn({
            ico: 'importar',
            txt: 'Cuadros sueltos',
            cls: 'chico',
            desc: 'Varios archivos, uno por cuadro. Se ordenan por nombre y se arman en una hoja.',
            on: () => importarSueltos()
          }),
          CK.btn({
            ico: 'persona',
            txt: 'Sprites a poses',
            cls: 'chico',
            desc: 'Varios archivos de un personaje (walk_sur_1.png, idle_norte_2.png…): se reconocen la acción, la dirección y el número de cuadro, y se arman solas sus poses.',
            on: () => An.importarPoses()
          })
        )
      )
    );
  };
  /** Bloque de efectos para probar, en el panel derecho. */
  const bloqueFx = () => {
    const l = An.fxLista(),
      b = h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Probar con efectos',
          CK.btn({
            ico: 'mas',
            txt: 'Agregar',
            cls: 'chico',
            desc: 'Superpone un efecto (del proyecto, una plantilla o una hoja de efecto) para ver cómo queda con la animación.',
            on: An.agregarFx
          })
        )
      );
    if (!l.length) {
      b.append(
        h(
          'p.nota-txt',
          'Sumá un efecto (chispas al golpear, polvo al caminar, aura, fuego…) y ubicalo sobre el personaje. Se ve en la vista y en el GIF de prueba; con "Guardar con los efectos" queda todo en una hoja nueva.'
        )
      );
      return b;
    }
    const lista = h('div.lista');
    l.forEach((e, k) =>
      lista.append(
        h(
          'div.item' + (k === An.st.fxSel ? '.activo' : ''),
          {
            onclick: () => {
              An.st.fxSel = k;
              An.tabs.refrescar();
            },
            oncontextmenu: ev => {
              An.st.fxSel = k;
              CK.menu(ev, [
                { titulo: An.nombreFx(e) },
                {
                  txt: e.oculto ? 'Mostrar' : 'Ocultar',
                  ico: e.oculto ? 'ojo' : 'ojoNo',
                  on: () =>
                    An.cambiarFx('Ver efecto', () => {
                      e.oculto = !e.oculto;
                    })
                },
                {
                  txt: e.detras ? 'Poner delante' : 'Poner detrás',
                  ico: e.detras ? 'subir' : 'bajar',
                  on: () =>
                    An.cambiarFx('Orden del efecto', () => {
                      e.detras = !e.detras;
                    })
                },
                {
                  txt: 'Duplicar',
                  ico: 'duplicar',
                  on: () =>
                    An.cambiarFx('Duplicar efecto', q => {
                      q.splice(k + 1, 0, CK.clone(e));
                    })
                },
                e.tipo === 'fx' ? { txt: 'Editar el efecto', ico: 'fx', on: () => CK.ir('fx', e.id) } : null,
                '-',
                {
                  txt: 'Quitar',
                  ico: 'basura',
                  peligro: true,
                  on: () =>
                    An.cambiarFx('Quitar efecto', q => {
                      q.splice(k, 1);
                      An.st.fxSel = 0;
                    })
                }
              ]);
              setTimeout(() => An.tabs.refrescar(), 0);
            }
          },
          h('span', { html: CK.ico(e.tipo === 'hoja' ? 'hoja' : 'fx', 15) }),
          h('span.nombre', An.nombreFx(e)),
          h('span.sub', e.detras ? 'detrás' : 'delante'),
          CK.btn({
            ico: e.oculto ? 'ojoNo' : 'ojo',
            tip: e.oculto ? 'Mostrar' : 'Ocultar',
            cls: 'chico plano',
            on: ev => {
              ev.stopPropagation();
              An.cambiarFx('Ver efecto', () => {
                e.oculto = !e.oculto;
              });
              An.tabs.refrescar();
            }
          })
        )
      )
    );
    b.append(lista);
    const e = l[An.st.fxSel];
    if (e) {
      const n = Math.max(1, An.cuadrosCache().length);
      b.append(
        h(
          'div.duo',
          { style: { marginTop: '8px' } },
          h(
            'label',
            h('span.mini-rot', 'Posición →'),
            CK.num(e.x || 0, { step: 1 }, v =>
              An.cambiarFx('Posición del efecto', () => {
                e.x = v;
              })
            )
          ),
          h(
            'label',
            h('span.mini-rot', 'Posición ↓'),
            CK.num(e.y || 0, { step: 1 }, v =>
              An.cambiarFx('Posición del efecto', () => {
                e.y = v;
              })
            )
          )
        ),
        CK.btn({
          ico: 'mover',
          txt: An.st.moverFx ? 'Listo' : 'Ubicar con el mouse',
          cls: 'chico' + (An.st.moverFx ? ' activo' : ''),
          desc: 'Encendido: hacé clic o arrastrá sobre la vista para poner el efecto ahí.',
          on: () => {
            An.st.moverFx = !An.st.moverFx;
            An.tabs.refrescar();
            An.vista.pedir();
          }
        }),
        CK.campo(
          'Tamaño',
          CK.rango(e.escala || 1, { min: 0.25, max: 4, step: 0.25 }, (v, fin) => {
            e.escala = v;
            if (fin) An.cambiarFx('Tamaño del efecto', () => {});
            An.vista.pedir();
          })
        ),
        CK.campo(
          'Empieza en el cuadro',
          CK.sel(
            String(e.desde || 0),
            [...Array(n).keys()].map(i => [String(i), String(i + 1)]),
            v =>
              An.cambiarFx('Cuándo empieza', () => {
                e.desde = +v;
              })
          ),
          'Para efectos de una sola vez (golpe, polvo): salen cuando la animación llega a ese cuadro.'
        ),
        CK.chk(e.repetir !== false, 'Repetir en cada vuelta', v =>
          An.cambiarFx('Repetir efecto', () => {
            e.repetir = v;
          })
        ),
        CK.chk(!!e.detras, 'Detrás del personaje', v =>
          An.cambiarFx('Orden del efecto', () => {
            e.detras = v;
          })
        )
      );
    }
    b.append(
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        CK.btn({
          ico: 'guardar',
          txt: 'Guardar con los efectos',
          cls: 'chico',
          desc: 'Arma una animación nueva con los efectos dibujados en cada cuadro (en la paleta del proyecto). La original queda igual.',
          on: An.hornearConFx
        })
      )
    );
    return b;
  };
  /** Fila "Zona que se mueve": cuántos píxeles están marcados, ver/pintar y prender o apagar. */
  const zonaBloque = () => {
    const im = An.pixBase(),
      og = An.marcaOrigen(),
      z =
        im &&
        (og
          ? CK.marcaAnim.leer(og.marca, im.w, im.h)
          : An.st.zonaLibre && An.st.zonaLibre.base === An.st.base
            ? CK.marcaAnim.leer({ mascara: An.st.zonaLibre.mascara }, im.w, im.h)
            : null);
    let n = 0;
    if (z) z.forEach(v => (n += v));
    const nota = og && og.marca.nota ? h('div.nota-txt', { style: { whiteSpace: 'normal' } }, '“' + og.marca.nota + '”') : null;
    return h(
      'div',
      { style: { marginTop: '8px' } },
      nota,
      h(
        'div.fila.junto',
        h(
          'span.crece.nota-txt',
          z ? 'Zona marcada: ' + n + ' px se mueven, el resto queda quieto.' : 'Sin zona marcada: se mueve todo el dibujo.'
        ),
        CK.btn({
          ico: 'lapiz',
          txt: z ? 'Editar zona' : 'Pintar zona',
          cls: 'chico',
          desc: 'Pincel gris para marcar los píxeles exactos que se mueven. Lo que no pintes queda igual en todos los cuadros.',
          on: An.pintarZona
        })
      ),
      z
        ? CK.chk(An.st.soloZona !== false, 'Mover solo lo marcado', v => {
            An.st.soloZona = v;
            An.generar();
          })
        : null
    );
  };
  An.pGenerar = c => {
    An.st.modo = 'generar';
    const b = CK.P.assets[An.st.base],
      def = PIX.ANIMS[An.st.tipo];
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Qué animar'),
        h(
          'div.fila.junto',
          b ? CK.mini(CK.img[b.id], 48, CK.asset.cuadro(b, 0)) : h('span', { html: CK.ico('imagen', 30) }),
          h('div.crece', h('b', b ? b.nombre : 'Sin elegir'), b ? h('div.nota-txt', b.w + ' × ' + b.h + ' px') : null),
          CK.btn({
            txt: b ? 'Cambiar' : 'Elegir',
            cls: b ? 'chico' : 'chico pri',
            desc: 'El dibujo quieto del que sale la animación.',
            on: async () => {
              const id = await CK.elegirAsset('Asset para animar', ['sprite', 'hoja', 'personaje', 'ui', 'fx']);
              if (id) {
                An.st.base = id;
                An.st.origen = null;
                An.tabs.refrescar();
                An.pintarIzq();
              }
            }
          })
        ),
        An.st.origen
          ? h('p.nota-txt', { style: { color: 'var(--oro)' } }, 'Viene de una marca del mapa: al guardar, se coloca sola en ese objeto.')
          : null,
        b ? zonaBloque() : null
      )
    );
    const opsA = Object.keys(PIX.ANIMS).map(k => [k, PIX.ANIMS[k].nombre]);
    const bl = h(
      'div.bloque',
      h('h3.bloque-tit', 'Movimiento'),
      CK.campo(
        'Tipo',
        CK.sel(An.st.tipo, opsA, v => {
          An.st.tipo = v;
          An.st.params = {};
          An.tabs.refrescar();
        })
      ),
      h('p.nota-txt', def.desc)
    );
    Object.keys(def.params).forEach(k => {
      const p = def.params[k],
        val = An.st.params[k] === undefined ? p[0] : An.st.params[k],
        rot = { cuadros: 'Cuadros', fuerza: 'Fuerza (px)', ondas: 'Ondas', fijo: 'Lado fijo', ancho: 'Ancho del brillo' }[k] || k;
      if (Array.isArray(p[1]))
        bl.append(
          CK.campo(
            rot,
            CK.sel(val, p[1], v => {
              An.st.params[k] = v;
              An.generar();
            })
          )
        );
      else
        bl.append(
          CK.campo(
            rot,
            CK.rango(val, { min: p[1], max: p[2], step: p[0] % 1 ? 0.5 : 1 }, v => {
              An.st.params[k] = v;
              An.generar();
            })
          )
        );
    });
    bl.append(
      CK.campo(
        'Velocidad',
        CK.rango(An.st.fps, { min: 2, max: 24 }, v => {
          An.st.fps = v;
          An.pintarCentro();
        }),
        'Cuadros por segundo. Ambiente tranquilo: 4 a 6. Acción: 10 a 12.'
      ),
      CK.chk(
        An.st.usarPaleta,
        'Usar solo colores de la paleta',
        v => {
          An.st.usarPaleta = v;
          An.generar();
        },
        'Los brillos y sombras de la animación toman tonos vecinos de tu paleta, sin inventar colores.'
      )
    );
    c.append(
      bl,
      h(
        'div.bloque',
        CK.btn({
          ico: 'guardar',
          txt: An.st.origen ? 'Guardar y poner en el mapa' : 'Guardar animación',
          cls: 'pri',
          desc: 'Guarda los cuadros como una hoja de sprites del proyecto.',
          on: guardarGenerada
        }),
        h(
          'p.nota-txt',
          { style: { marginTop: '8px' } },
          'Estas animaciones mueven y recolorean los píxeles del dibujo original. Sirven para ambiente, objetos y efectos. Para poses nuevas de un personaje (caminar, atacar) hace falta dibujar cada cuadro: usá Pixel art o una base de PixelLab, y acá la alineás y exportás.'
        )
      ),
      bloqueFx()
    );
    An.generar();
  };
  An.pHoja = c => {
    An.st.modo = 'hoja';
    const a = CK.P.assets[An.st.hoja];
    if (!a || !a.cuadros) {
      c.append(CK.vacio('anim', 'Elegí una animación', 'En la lista de la izquierda, o importá una tira de cuadros.'));
      An.pintarCentro();
      return;
    }
    const k = a.cuadros,
      n = CK.asset.nCuadros(a),
      re = () => {
        CK.tocar();
        a.modificado = Date.now();
        An.pintarCentro();
      };
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', a.nombre),
        h(
          'div.duo',
          h(
            'label',
            h('span.mini-rot', 'Ancho del cuadro'),
            CK.num(k.fw, { min: 1, max: a.w }, v => {
              k.fw = v;
              re();
            })
          ),
          h(
            'label',
            h('span.mini-rot', 'Alto del cuadro'),
            CK.num(k.fh, { min: 1, max: a.h }, v => {
              k.fh = v;
              re();
            })
          )
        ),
        a.w % k.fw || a.h % k.fh
          ? h(
              'p.nota-txt',
              { style: { color: 'var(--rojo)' } },
              'La hoja (' + a.w + ' × ' + a.h + ') no se divide justo en cuadros de ese tamaño.'
            )
          : h('p.nota-txt', n + ' cuadros'),
        CK.campo(
          'Velocidad',
          CK.rango(k.fps || 8, { min: 1, max: 24 }, v => {
            k.fps = v;
            re();
          }),
          'Cuadros por segundo. Cada cuadro puede durar más: arrastrá su borde derecho en la línea de tiempo.'
        ),
        CK.chk(k.bucle !== false, 'Se repite en loop', v => {
          k.bucle = v;
          re();
        }),
        CK.chk(
          !!k.vaiven,
          'Ida y vuelta',
          v => {
            k.vaiven = v;
            re();
          },
          'Al llegar al último cuadro vuelve hacia atrás en vez de saltar al primero. Queda más suave en banderas y plantas.'
        ),
        k.dur
          ? h(
              'div.fila',
              { style: { marginTop: '4px' } },
              h('span.nota-txt.crece', 'Hay cuadros con duración propia.'),
              CK.btn({
                txt: 'Igualar duraciones',
                cls: 'chico',
                on: () =>
                  An.editarHoja('Igualar duraciones', (f, d) => {
                    d.fill(0);
                  })
              })
            )
          : null
      )
    );
    const jit = PIX.frameJitter(PIX.slice(CK.asset.pix(a.id), k.fw, k.fh));
    const aplicar = (nombre, fn) =>
      An.editarHoja(nombre, (f, d) => {
        const r = fn(f.map(PIX.clone));
        f.splice(0, f.length, ...r);
        while (d.length > f.length) d.pop();
        while (d.length < f.length) d.push(0);
      });
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Arreglar la hoja'),
        jit > 1
          ? h(
              'div.problema.medio',
              { html: CK.ico('alerta', 18) },
              h(
                'div',
                h('div.pt', 'El dibujo se corre ' + jit + ' px entre cuadros'),
                h('div.pd', 'Por eso el personaje "salta". Alinealo por los pies.')
              )
            )
          : h('p.nota-txt', 'Los cuadros están alineados.'),
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'centrar',
            txt: 'Alinear por los pies',
            cls: 'chico',
            desc: 'Corre cada cuadro para que la base del dibujo quede siempre en el mismo lugar. Es lo que evita que el personaje salte.',
            on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'pies'))
          }),
          CK.btn({
            txt: 'Alinear por el centro',
            cls: 'chico',
            desc: 'Centra cada cuadro. Mejor para efectos y objetos que giran.',
            on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'centro'))
          }),
          CK.btn({
            ico: 'bucle',
            txt: 'Invertir orden',
            cls: 'chico',
            on: () =>
              An.editarHoja('Invertir cuadros', (f, d) => {
                f.reverse();
                d.reverse();
              })
          }),
          CK.btn({
            ico: 'paleta',
            txt: 'Llevar a la paleta',
            cls: 'chico',
            desc: 'Pasa todos los cuadros a la paleta del proyecto.',
            on: () => aplicar('Paleta', f => f.map(x => PIX.quantize(x, CK.P.estilo.paleta)))
          }),
          CK.btn({
            ico: 'limpiar',
            txt: 'Limpiar',
            cls: 'chico',
            desc: 'Bordes duros y sin píxeles sueltos en todos los cuadros.',
            on: () => aplicar('Limpiar', f => f.map(x => PIX.cleanup(PIX.hardenAlpha(x, 110))))
          })
        ),
        h(
          'div.fila',
          { style: { marginTop: '6px' } },
          CK.btn({
            ico: 'voltearH',
            txt: 'Crear versión espejada',
            cls: 'chico',
            desc: 'Crea otra animación igual pero mirando al otro lado (para izquierda / derecha).',
            on: () => {
              const frs = PIX.slice(CK.asset.pix(a.id), k.fw, k.fh).map(PIX.flipH),
                nu = CK.asset.crear({
                  nombre: a.nombre + '_espejo',
                  tipo: a.tipo,
                  lienzo: CK.aLienzo(PIX.pack(frs, frs.length)),
                  cuadros: CK.clone(k),
                  origen: 'espejo de ' + a.nombre
                });
              An.st.hoja = nu.id;
              An.tabs.refrescar();
              An.pintarIzq();
            }
          }),
          CK.btn({
            ico: 'pixel',
            txt: 'Editar cuadros',
            cls: 'chico',
            desc: 'Abre la hoja en Pixel art, con papel cebolla, para retocar cuadro a cuadro.',
            on: () => An.editarEnPixel(An.fisico(An.rep.i))
          }),
          a.juego
            ? CK.btn({
                ico: 'exportar',
                txt: 'Devolver al juego',
                cls: 'chico' + (CK.animJuego.modificada(a) ? ' pri' : ''),
                desc: 'Esta hoja vino del juego: la reemplaza en su archivo (' + a.juego.archivo + ') con respaldo del original.',
                on: async () => {
                  if (await CK.animJuego.devolver(a.id)) An.tabs.refrescar();
                }
              })
            : null
        )
      )
    );
    c.append(bloqueFx());
    const esc = { v: 4 };
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Exportar'),
        h(
          'p.nota-txt',
          'Al usar "Exportar al juego" esta hoja va sola con el resto (con las duraciones de cada cuadro). Estos botones son para llevarla a otro lado.'
        ),
        CK.campo(
          'Ampliar',
          CK.sel(
            '4',
            [
              ['1', '×1 (tamaño real, para el juego)'],
              ['2', '×2'],
              ['4', '×4 (para mostrar)'],
              ['8', '×8']
            ],
            v => {
              esc.v = +v;
            }
          ),
          'Las ampliaciones no emborronan los píxeles.'
        ),
        h(
          'div.fila',
          CK.btn({ ico: 'hoja', txt: 'Hoja PNG', cls: 'chico', desc: 'La tira de cuadros como imagen.', on: () => exportar('png', esc.v) }),
          CK.btn({
            ico: 'texto',
            txt: 'Datos JSON',
            cls: 'chico',
            desc: 'Posición y duración de cada cuadro, en el formato de atlas que leen Phaser, Godot y Unity.',
            on: () => exportar('json')
          }),
          CK.btn({
            ico: 'play',
            txt: 'GIF',
            cls: 'chico',
            desc: 'La animación en loop (con la duración de cada cuadro), para revisar o para el portfolio.',
            on: () => exportar('gif', esc.v)
          })
        ),
        h(
          'div.fila',
          { style: { marginTop: '10px' } },
          CK.btn({
            ico: 'basura',
            txt: 'Borrar animación',
            cls: 'chico peligro',
            on: async () => {
              if (await CK.asset.preguntarBorrar(a.id)) {
                An.st.hoja = null;
                An.tabs.refrescar();
                An.pintarIzq();
              }
            }
          })
        )
      )
    );
    An.pintarCentro();
  };
})();
