/* GUÍA DE ESTILO: las reglas que comparten todas las secciones (tile, paleta, contorno, luz) y el texto fijo para pedirle arte a una IA. */
'use strict';
(function () {
  const h = CK.h;
  let el,
    selColor = null;
  const E = () => CK.P.estilo;
  const LUCES = ['arriba-izquierda', 'arriba', 'arriba-derecha', 'izquierda', 'derecha', 'abajo-izquierda', 'abajo', 'abajo-derecha'];
  const LUZ_EN = {
    'arriba-izquierda': 'top-left',
    arriba: 'top',
    'arriba-derecha': 'top-right',
    izquierda: 'left',
    derecha: 'right',
    'abajo-izquierda': 'bottom-left',
    abajo: 'bottom',
    'abajo-derecha': 'bottom-right'
  };
  const cambio = () => {
    E().definida = true;
    CK.tocar();
    CK.emit('estilo');
  };

  CK.estilo = {
    /** Texto fijo para pegar al final de cada pedido a una IA de imágenes. */
    bloqueIA(que) {
      const e = E(),
        cont =
          e.contorno === 'negro'
            ? 'black 1px outlines'
            : e.contorno === 'color'
              ? 'dark colored 1px outlines (darker shade of each area, not pure black)'
              : 'no outlines';
      return (
        '[' +
        (que || 'QUÉ QUIERO: e.g. "a blacksmith NPC, idle pose"') +
        ']\n\nStyle: ' +
        (/3\/4|top/i.test(e.perspectiva) ? 'top-down 3/4 view' : e.perspectiva) +
        ' pixel art, ' +
        e.tile +
        'x' +
        e.tile +
        ' tile grid, characters about ' +
        e.personaje[0] +
        'x' +
        e.personaje[1] +
        ' px,\nlimited ' +
        e.paleta.length +
        '-color palette (' +
        e.paleta.slice(0, 12).join(', ') +
        (e.paleta.length > 12 ? ', …' : '') +
        '),\n' +
        cont +
        ', light source from ' +
        LUZ_EN[e.luz] +
        ', flat cel shading with 3 tones,\nno anti-aliasing, no gradients, no blur, hard pixel edges, transparent background.' +
        (e.notas ? '\n' + e.notas : '')
      );
    },
    /** Aplica la guía a una imagen: paleta, bordes duros y limpieza. Es el "filtro" por el que pasa todo asset. */
    aplicar(im, o = {}) {
      const e = E();
      let r = PIX.hardenAlpha(im, 110);
      if (o.paleta !== false && e.paleta.length) r = PIX.quantize(r, e.paleta, { k: o.k === undefined ? 1 : o.k });
      if (o.limpiar !== false) r = PIX.cleanup(r);
      return r;
    }
  };

  const pintar = () => {
    if (!el || !CK.P) return;
    const e = E(),
      col = h('div.col');
    CK.vaciar(el).append(col);
    col.append(
      h('h1', 'Guía de estilo'),
      h(
        'p.bajada',
        'Las reglas del juego, escritas una sola vez. El conversor, las texturas, el editor de píxeles, las animaciones y el revisor leen de acá, así todo sale con las mismas medidas y los mismos colores.'
      )
    );

    // medidas
    const med = h(
      'div.caja',
      h('h2', { style: { marginTop: 0 } }, 'Medidas'),
      h(
        'div.cajas',
        { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' } },
        h(
          'div',
          CK.campo(
            'Tile',
            CK.sel(
              String(e.tile),
              ['8', '16', '24', '32', '48', '64'].map(v => [v, v + ' × ' + v + ' px']),
              v => {
                e.tile = +v;
                cambio();
              }
            ),
            'El tamaño de cada cuadro del suelo. CastleKnight usa 16.'
          ),
          h('p.nota-txt', 'Los mapas ya creados conservan su tamaño de tile.')
        ),
        h(
          'div',
          CK.campo(
            'Personaje',
            h(
              'div.duo',
              CK.num(e.personaje[0], { min: 8, max: 256 }, v => {
                e.personaje[0] = v;
                cambio();
              }),
              CK.num(e.personaje[1], { min: 8, max: 256 }, v => {
                e.personaje[1] = v;
                cambio();
              })
            ),
            'Ancho y alto del cuadro de un personaje. Los de CastleKnight vienen en cuadros de 100 × 100.'
          )
        ),
        h(
          'div',
          CK.campo(
            'Colores máx.',
            CK.num(e.maxColores, { min: 2, max: 64 }, v => {
              e.maxColores = v;
              cambio();
            }),
            'Cuántos colores distintos puede tener un asset. El revisor avisa si alguno se pasa.'
          )
        ),
        h(
          'div',
          CK.campo(
            'Perspectiva',
            CK.txt(e.perspectiva, v => {
              e.perspectiva = v;
              cambio();
            }),
            'Cómo se mira el mundo. Top-down 3/4: desde arriba pero viendo el frente de las cosas.'
          )
        ),
        h(
          'div',
          CK.campo(
            'Luz desde',
            CK.sel(e.luz, LUCES, v => {
              e.luz = v;
              cambio();
            }),
            'De dónde viene la luz en todos los dibujos. Las sombras caen hacia el lado opuesto.'
          )
        ),
        h(
          'div',
          CK.campo(
            'Contorno',
            CK.sel(
              e.contorno,
              [
                ['color', 'De color (tono más oscuro)'],
                ['negro', 'Negro o color fijo'],
                ['ninguno', 'Sin contorno']
              ],
              v => {
                e.contorno = v;
                cambio();
                pintar();
              }
            ),
            'El borde de cada figura. "De color" usa un tono más oscuro de cada zona, que es más suave que el negro.'
          ),
          e.contorno === 'negro'
            ? CK.campo(
                'Color',
                CK.color(e.colorContorno, v => {
                  e.colorContorno = v;
                  cambio();
                })
              )
            : null
        )
      )
    );
    col.append(med);

    // paleta
    const mu = CK.muestras(() => e.paleta, {
      actual: () => selColor,
      alElegir: hex => {
        selColor = hex;
        pintarSel();
      },
      pista: 'Clic para editarlo o quitarlo.'
    });
    const cajaSel = h('div.fila', { style: { marginTop: '10px', minHeight: '30px' } });
    const pintarSel = () => {
      CK.vaciar(cajaSel);
      const i = e.paleta.indexOf(selColor);
      if (i < 0) {
        cajaSel.append(h('span.nota-txt', 'Elegí un color para cambiarlo o quitarlo.'));
        return;
      }
      const hexIn = CK.txt(selColor, v => {
        if (/^#?[0-9a-f]{6}$/i.test(v)) {
          e.paleta[i] = selColor = '#' + v.replace('#', '').toLowerCase();
          cambio();
          mu.refrescar();
          pintarSel();
        }
      });
      hexIn.style.width = '90px';
      cajaSel.append(
        CK.color(selColor, v => {
          e.paleta[i] = selColor = v;
          cambio();
          mu.refrescar();
          hexIn.value = v;
        }),
        hexIn,
        CK.btn({
          ico: 'basura',
          txt: 'Quitar',
          cls: 'chico peligro',
          on: () => {
            e.paleta.splice(i, 1);
            selColor = null;
            cambio();
            mu.refrescar();
            pintarSel();
          }
        }),
        CK.btn({
          ico: 'subir',
          tip: 'Mover antes',
          cls: 'chico',
          on: () => {
            if (i > 0) {
              [e.paleta[i - 1], e.paleta[i]] = [e.paleta[i], e.paleta[i - 1]];
              cambio();
              mu.refrescar();
            }
          }
        }),
        CK.btn({
          ico: 'bajar',
          tip: 'Mover después',
          cls: 'chico',
          on: () => {
            if (i < e.paleta.length - 1) {
              [e.paleta[i + 1], e.paleta[i]] = [e.paleta[i], e.paleta[i + 1]];
              cambio();
              mu.refrescar();
            }
          }
        })
      );
    };
    const extraer = async () => {
      const d = { n: 24, id: null };
      const g = CK.galeria({
        grande: true,
        actual: () => d.id,
        alElegir: id => {
          d.id = id;
        }
      });
      const ok = await CK.ventana({
        titulo: 'Sacar la paleta de una imagen',
        ancho: 640,
        cuerpo: h(
          'div',
          h('p', 'Elegí la imagen que define el estilo (por ejemplo, la aldea que te gusta). Se toman sus colores más representativos.'),
          CK.campo(
            'Cantidad',
            CK.rango(d.n, { min: 4, max: 48 }, v => {
              d.n = v;
            })
          ),
          g,
          h(
            'div.fila',
            { style: { marginTop: '10px' } },
            CK.btn({
              ico: 'importar',
              txt: 'Usar una imagen de mi compu',
              on: async () => {
                const as = await CK.importarImagenes('ref');
                if (as.length) {
                  d.id = as[0].id;
                  g.refrescar();
                }
              }
            })
          )
        ),
        botones: [
          { txt: 'Cancelar', valor: false },
          { txt: 'Sumar a la paleta', valor: 'sumar' },
          { txt: 'Reemplazar la paleta', cls: 'pri', valor: 'reemplazar' }
        ]
      });
      if (!ok || !d.id) return;
      const pal = PIX.extractPalette(CK.asset.pix(d.id), d.n);
      e.paleta = ok === 'sumar' ? [...new Set(e.paleta.concat(pal))] : pal;
      e.ancla = d.id;
      cambio();
      pintar();
      CK.aviso('Paleta de ' + pal.length + ' colores tomada de "' + CK.P.assets[d.id].nombre + '"');
    };
    const pegar = async () => {
      const t = h('textarea.in', { rows: 8, placeholder: 'Un color por línea o separados por comas:\n1b1420\n#3b2a3a\n…' });
      const ok = await CK.ventana({
        titulo: 'Pegar una paleta',
        cuerpo: h(
          'div',
          h('p', 'Pegá la lista de colores en formato hexadecimal. Las paletas de Lospec se pueden bajar como archivo .hex y pegar acá.'),
          t
        ),
        botones: [
          { txt: 'Cancelar', valor: false },
          { txt: 'Usar esta paleta', cls: 'pri', valor: true }
        ]
      });
      if (!ok) return;
      const cs = (t.value.match(/[0-9a-f]{6}/gi) || []).map(c => '#' + c.toLowerCase());
      if (!cs.length) {
        CK.aviso('No encontré colores en ese texto.', 'error');
        return;
      }
      e.paleta = [...new Set(cs)];
      cambio();
      pintar();
    };
    col.append(
      h('h2', 'Paleta (' + e.paleta.length + ' colores)'),
      h(
        'div.caja',
        mu,
        cajaSel,
        h(
          'div.fila',
          { style: { marginTop: '12px' } },
          CK.btn({
            ico: 'mas',
            txt: 'Agregar color',
            on: () => {
              e.paleta.push('#808080');
              selColor = '#808080';
              cambio();
              mu.refrescar();
              pintarSel();
            }
          }),
          CK.btn({
            ico: 'gotero',
            txt: 'Sacar de una imagen',
            desc: 'Toma los colores más usados de una imagen de referencia: es la forma más rápida de fijar el estilo.',
            on: extraer
          }),
          CK.btn({ ico: 'texto', txt: 'Pegar lista', desc: 'Pegá una lista de colores hexadecimales (por ejemplo de Lospec).', on: pegar }),
          CK.btn({
            ico: 'bajar',
            txt: 'Ordenar',
            desc: 'Ordena los colores por tono y de oscuro a claro.',
            on: () => {
              e.paleta.sort((a, b) => {
                const A = PIX.rgb2hsv(...PIX.hex2rgb(a)),
                  B = PIX.rgb2hsv(...PIX.hex2rgb(b)),
                  ga = A[1] < 0.12 ? -1 : Math.floor(A[0] / 30),
                  gb = B[1] < 0.12 ? -1 : Math.floor(B[0] / 30);
                return ga - gb || A[2] - B[2];
              });
              cambio();
              mu.refrescar();
            }
          }),
          CK.btn({
            ico: 'importar',
            txt: 'Descargar .hex',
            desc: 'Baja la paleta para cargarla en Aseprite o Pyxel Edit.',
            on: () =>
              CK.descargar(
                new Blob([e.paleta.map(c => c.slice(1)).join('\n') + '\n'], { type: 'text/plain' }),
                CK.slug(CK.P.nombre) + '.hex'
              )
          })
        ),
        CK.chk(
          e.bloquearPaleta,
          'Bloquear el dibujo a estos colores',
          v => {
            e.bloquearPaleta = v;
            cambio();
          },
          'En el editor de píxeles solo se puede pintar con colores de la paleta.'
        )
      )
    );
    pintarSel();

    // ancla
    const an = CK.P.assets[e.ancla];
    col.append(
      h('h2', 'Imagen ancla'),
      h(
        'div.caja',
        h(
          'div.fila.junto',
          { style: { alignItems: 'flex-start', gap: '14px' } },
          an ? CK.mini(CK.img[an.id], 120) : h('div.vacio', { style: { width: '120px', padding: '10px' }, html: CK.ico('imagen', 30) }),
          h(
            'div.crece',
            h(
              'p.ayuda-txt',
              'La imagen contra la que se compara todo lo demás. Subila siempre junto a cada pedido de arte: pesa más que cualquier descripción.'
            ),
            h(
              'div.fila',
              { style: { marginTop: '8px' } },
              CK.btn({
                ico: 'imagen',
                txt: an ? 'Cambiar' : 'Elegir imagen ancla',
                on: async () => {
                  const id = await CK.elegirAsset('Imagen ancla del estilo');
                  if (id) {
                    e.ancla = id;
                    cambio();
                    pintar();
                  }
                }
              }),
              an
                ? CK.btn({
                    ico: 'importar',
                    txt: 'Descargar',
                    desc: 'Para adjuntarla en PixelLab o SpriteLab.',
                    on: async () => CK.descargar(await CK.aBlob(CK.img[an.id]), an.id + '.png')
                  })
                : null
            )
          )
        )
      )
    );

    // bloque IA
    const pre = h('textarea.in', { rows: 9, readonly: true, style: { fontFamily: 'Consolas, monospace', fontSize: '12px' } });
    pre.value = CK.estilo.bloqueIA();
    col.append(
      h('h2', 'Texto fijo para pedir arte a una IA'),
      h(
        'div.caja',
        h(
          'p.ayuda-txt',
          'Se arma solo con lo de arriba. Copialo idéntico al final de cada pedido en PixelLab o SpriteLab y cambiá solo la primera línea.'
        ),
        h('div', { style: { margin: '8px 0' } }, pre),
        h(
          'div.fila',
          CK.btn({
            ico: 'duplicar',
            txt: 'Copiar',
            cls: 'pri',
            on: async () => {
              try {
                await navigator.clipboard.writeText(pre.value);
                CK.aviso('Copiado');
              } catch (err) {
                pre.select();
                document.execCommand('copy');
                CK.aviso('Copiado');
              }
            }
          })
        ),
        h(
          'label.campo.ancho',
          { style: { marginTop: '10px' } },
          h('span.campo-rot', 'Línea extra de estilo (ambiente, época, materiales)'),
          CK.txt(
            e.notas,
            v => {
              e.notas = v;
              cambio();
              pre.value = CK.estilo.bloqueIA();
            },
            { ph: 'Medieval fantasy village, warm earthy colors.' }
          )
        )
      )
    );
  };
  CK.registrar({
    id: 'estilo',
    nombre: 'Guía de estilo',
    corto: 'Estilo',
    ico: 'estilo',
    desc: 'Tamaño de tile, paleta, contorno y luz: las reglas que respetan todas las secciones.',
    crear: e => {
      el = h('div.pagina');
      e.append(el);
    },
    mostrar: pintar
  });
})();
