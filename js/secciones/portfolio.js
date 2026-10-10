/* PORTFOLIO: arma una lámina de presentación (personaje con sus animaciones, tileset con un mapa de muestra, paleta)
   lista para mostrar, ampliada sin emborronar. */
'use strict';
(function () {
  const h = CK.h;
  let el, panel, cv, caja;
  const st = {
    titulo: '',
    sub: '',
    assets: [],
    mapa: '',
    escala: 4,
    fondo: '#1b1420',
    paleta: true,
    cuadros: true,
    rotulos: true,
    lienzo: null
  };
  const txtColor = f => (PIX.lum(...PIX.hex2rgb(f)) > 140 ? '#1b1420' : '#f5f1e6');

  const armar = () => {
    const P = CK.P,
      E = st.escala,
      pad = 28,
      as = st.assets.map(id => P.assets[id]).filter(Boolean),
      m = P.mapas[st.mapa],
      bloques = [];
    let W = 0,
      y = pad;
    const fg = txtColor(st.fondo),
      tenue = fg === '#f5f1e6' ? 'rgba(245,241,230,.6)' : 'rgba(27,20,32,.6)';
    if (st.titulo) {
      bloques.push({ t: 'titulo', y });
      y += 44 + (st.sub ? 22 : 0) + 16;
    }
    as.forEach(a => {
      const f = CK.asset.cuadro(a, 0),
        n = CK.asset.nCuadros(a),
        bw = f.w * E,
        bh = f.h * E,
        e2 = Math.max(1, Math.floor(E / 2)),
        tira = st.cuadros && a.cuadros && n > 1,
        tw = tira ? n * (f.w * e2 + 6) : 0,
        alto = Math.max(bh, tira ? f.h * e2 + 20 : 0) + (st.rotulos ? 26 : 0);
      bloques.push({ t: 'asset', a, f, n, y, bw, bh, e2, tira, alto });
      W = Math.max(W, bw + (tira ? 30 + tw : 0));
      y += alto + 22;
    });
    let foto = null,
      me = 1;
    if (m) {
      foto = CK.mapa.foto(m, { luces: true });
      me = Math.max(1, Math.min(E, Math.floor(1500 / foto.width)));
      bloques.push({ t: 'mapa', y, foto, me });
      W = Math.max(W, foto.width * me);
      y += foto.height * me + (st.rotulos ? 26 : 0) + 22;
    }
    const pal = P.estilo.paleta;
    let pw = 0;
    if (st.paleta && pal.length) {
      const s = 26;
      pw = Math.min(pal.length, 24) * s;
      bloques.push({ t: 'paleta', y, s });
      y += Math.ceil(pal.length / 24) * s + 30;
    }
    W = Math.max(W, pw, 360) + pad * 2;
    const H = y + pad - 22 + 22;
    const c = CK.lienzo(W, H),
      x = CK.ctx(c);
    x.fillStyle = st.fondo;
    x.fillRect(0, 0, W, H);
    x.textBaseline = 'top';
    bloques.forEach(b => {
      if (b.t === 'titulo') {
        x.fillStyle = fg;
        x.font = '700 34px "Segoe UI", system-ui, sans-serif';
        x.fillText(st.titulo, pad, b.y);
        if (st.sub) {
          x.fillStyle = tenue;
          x.font = '16px "Segoe UI", system-ui, sans-serif';
          x.fillText(st.sub, pad, b.y + 44);
        }
      } else if (b.t === 'asset') {
        const a = b.a;
        x.drawImage(CK.img[a.id], b.f.x, b.f.y, b.f.w, b.f.h, pad, b.y, b.bw, b.bh);
        if (b.tira) {
          for (let i = 0; i < b.n; i++) {
            const g = CK.asset.cuadro(a, i),
              px = pad + b.bw + 30 + i * (g.w * b.e2 + 6),
              py = b.y + (b.bh - g.h * b.e2);
            x.fillStyle = fg === '#f5f1e6' ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
            x.fillRect(px, py, g.w * b.e2, g.h * b.e2);
            x.drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, px, py, g.w * b.e2, g.h * b.e2);
          }
        }
        if (st.rotulos) {
          x.fillStyle = fg;
          x.font = '600 14px "Segoe UI", system-ui, sans-serif';
          x.fillText(a.nombre, pad, b.y + Math.max(b.bh, 0) + 8);
          const w0 = x.measureText(a.nombre).width;
          x.fillStyle = tenue;
          x.font = '13px "Segoe UI", system-ui, sans-serif';
          x.fillText(
            '   ' + b.f.w + ' × ' + b.f.h + ' px' + (b.n > 1 ? ' · ' + b.n + ' cuadros · ' + (a.cuadros.fps || 8) + ' fps' : ''),
            pad + w0,
            b.y + b.bh + 9
          );
        }
      } else if (b.t === 'mapa') {
        x.drawImage(b.foto, pad, b.y, b.foto.width * b.me, b.foto.height * b.me);
        if (st.rotulos) {
          x.fillStyle = fg;
          x.font = '600 14px "Segoe UI", system-ui, sans-serif';
          x.fillText(m.nombre, pad, b.y + b.foto.height * b.me + 8);
          const w0 = x.measureText(m.nombre).width;
          x.fillStyle = tenue;
          x.font = '13px "Segoe UI", system-ui, sans-serif';
          x.fillText('   ' + m.w + ' × ' + m.h + ' px · tile de ' + m.tile, pad + w0, b.y + b.foto.height * b.me + 9);
        }
      } else if (b.t === 'paleta') {
        pal.forEach((col, i) => {
          x.fillStyle = col;
          x.fillRect(pad + (i % 24) * b.s, b.y + Math.floor(i / 24) * b.s, b.s - 3, b.s - 3);
        });
        x.fillStyle = tenue;
        x.font = '13px "Segoe UI", system-ui, sans-serif';
        x.fillText('Paleta de ' + pal.length + ' colores', pad, b.y + Math.ceil(pal.length / 24) * b.s + 4);
      }
    });
    st.lienzo = c;
    return c;
  };
  const pintarVista = CK.debounce(() => {
    if (!caja || !CK.P) return;
    const c = armar();
    CK.vaciar(caja);
    c.style.maxWidth = '100%';
    c.style.height = 'auto';
    c.style.imageRendering = 'auto';
    c.style.borderRadius = '8px';
    c.style.boxShadow = '0 6px 30px rgba(0,0,0,.5)';
    caja.append(c);
  }, 60);
  const pintarPanel = () => {
    CK.vaciar(panel);
    const P = CK.P,
      re = () => pintarVista();
    panel.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Textos'),
        CK.h(
          'label.campo.ancho',
          h('span.campo-rot', 'Título'),
          CK.txt(
            st.titulo,
            v => {
              st.titulo = v;
              re();
            },
            { vivo: true, ph: 'Lancent — caballero' }
          )
        ),
        CK.h(
          'label.campo.ancho',
          h('span.campo-rot', 'Bajada'),
          CK.txt(
            st.sub,
            v => {
              st.sub = v;
              re();
            },
            { vivo: true, ph: 'Personaje jugable de CastleKnight · pixel art y animación' }
          )
        )
      )
    );
    const g = CK.galeria({
      tipos: ['sprite', 'hoja', 'personaje', 'tileset', 'textura', 'fx', 'ui'],
      actual: () => null,
      alElegir: id => {
        if (st.assets.includes(id)) st.assets = st.assets.filter(x => x !== id);
        else st.assets.push(id);
        pintarPanel();
        re();
      },
      pista: 'Clic para sumarlo o quitarlo de la lámina.'
    });
    const sel = h('div.lista');
    st.assets.forEach((id, i) => {
      const a = P.assets[id];
      if (!a) return;
      sel.append(
        h(
          'div.item',
          CK.mini(CK.img[id], 22, CK.asset.cuadro(a, 0)),
          h('span.nombre', a.nombre),
          CK.btn({
            ico: 'subir',
            tip: 'Subir',
            on: () => {
              if (i > 0) {
                [st.assets[i - 1], st.assets[i]] = [st.assets[i], st.assets[i - 1]];
                pintarPanel();
                re();
              }
            }
          }),
          CK.btn({
            ico: 'cerrar',
            tip: 'Quitar',
            on: () => {
              st.assets.splice(i, 1);
              pintarPanel();
              re();
            }
          })
        )
      );
    });
    panel.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Qué mostrar (' + st.assets.length + ')'),
        st.assets.length
          ? sel
          : h('p.nota-txt', 'Elegí abajo los assets que van en la lámina. Las animaciones se muestran con todos sus cuadros.'),
        h('div', { style: { maxHeight: '230px', overflowY: 'auto', marginTop: '8px' } }, g),
        CK.campo(
          'Mapa',
          CK.sel(st.mapa, [['', 'Ninguno']].concat(Object.values(P.mapas).map(m => [m.id, m.nombre])), v => {
            st.mapa = v;
            re();
          }),
          'Agrega la imagen de un mapa armado, como muestra del tileset en uso.'
        )
      )
    );
    panel.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Presentación'),
        CK.campo(
          'Ampliación',
          CK.sel(
            String(st.escala),
            [
              ['2', '×2'],
              ['3', '×3'],
              ['4', '×4'],
              ['6', '×6'],
              ['8', '×8']
            ],
            v => {
              st.escala = +v;
              re();
            }
          ),
          'Cuánto se agranda cada sprite. Siempre en números enteros, para que los píxeles queden nítidos.'
        ),
        CK.campo(
          'Fondo',
          h(
            'div.fila.junto',
            CK.color(st.fondo, v => {
              st.fondo = v;
              re();
            }),
            CK.muestras(() => P.estilo.paleta.slice(0, 10), {
              chicas: true,
              alElegir: hex => {
                st.fondo = hex;
                pintarPanel();
                re();
              }
            })
          )
        ),
        CK.chk(st.cuadros, 'Mostrar los cuadros de cada animación', v => {
          st.cuadros = v;
          re();
        }),
        CK.chk(st.rotulos, 'Mostrar nombres y medidas', v => {
          st.rotulos = v;
          re();
        }),
        CK.chk(st.paleta, 'Mostrar la paleta', v => {
          st.paleta = v;
          re();
        })
      )
    );
    panel.append(
      h(
        'div.bloque',
        h(
          'div.fila',
          CK.btn({
            ico: 'importar',
            txt: 'Descargar lámina PNG',
            cls: 'pri',
            on: async () => {
              if (st.lienzo) CK.descargar(await CK.aBlob(st.lienzo), 'lamina_' + CK.slug(st.titulo || CK.P.nombre) + '.png');
            }
          }),
          CK.btn({
            ico: 'play',
            txt: 'GIF de cada animación',
            desc: 'Descarga un GIF ampliado por cada animación elegida.',
            on: () => {
              let n = 0;
              st.assets.forEach(id => {
                const a = P.assets[id];
                if (!a || !a.cuadros || CK.asset.nCuadros(a) < 2) return;
                const frs = PIX.slice(CK.asset.pix(id), a.cuadros.fw, a.cuadros.fh);
                CK.descargar(
                  new Blob(
                    [
                      CKGif(a.cuadros.vaiven && frs.length > 2 ? frs.concat(frs.slice(1, -1).reverse()) : frs, {
                        fps: a.cuadros.fps || 8,
                        escala: st.escala
                      })
                    ],
                    { type: 'image/gif' }
                  ),
                  a.id + '_x' + st.escala + '.gif'
                );
                n++;
              });
              CK.aviso(n ? 'Descargando ' + n + ' GIF' : 'Ninguno de los elegidos es una animación.', n ? 'ok' : 'info');
            }
          })
        ),
        h(
          'p.nota-txt',
          { style: { marginTop: '8px' } },
          'Para un portfolio conviene mostrar lo que animaste o terminaste vos, y aclarar qué partió de una base generada con IA.'
        )
      )
    );
  };
  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '318px 1fr';
    panel = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    caja = h('div', {
      style: { overflow: 'auto', padding: '24px', display: 'grid', placeItems: 'start center', background: 'var(--hueco)', minWidth: 0 }
    });
    el.append(panel, caja);
  };
  const mostrar = () => {
    if (!CK.P) return;
    st.assets = st.assets.filter(id => CK.P.assets[id]);
    if (st.mapa && !CK.P.mapas[st.mapa]) st.mapa = '';
    if (!st.titulo) st.titulo = CK.P.nombre;
    pintarPanel();
    pintarVista();
  };
  CK.registrar({
    id: 'portfolio',
    nombre: 'Lámina de portfolio',
    corto: 'Portfolio',
    ico: 'portfolio',
    desc: 'Presentá un personaje con sus animaciones, o un tileset con su mapa, en una lámina lista para mostrar.',
    crear,
    mostrar,
    alCambiarProyecto: () => {
      st.assets = [];
      st.mapa = '';
      st.titulo = '';
    }
  });
})();
