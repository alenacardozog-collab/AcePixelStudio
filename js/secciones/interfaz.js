/* INTERFAZ DEL JUEGO: las piezas con las que CastleKnight arma paneles, botones y carteles (assets/UI/theme).
   Cada pieza es una imagen "de 9 partes": las esquinas no se estiran, los bordes y el centro sí.
   Acá se ven aplicadas en una maqueta del juego, se editan o reemplazan y se llevan de vuelta (con respaldo). */
'use strict';
(function () {
  const h = CK.h;
  let el, izq, centro, der, maqueta, lupa;
  const st = { id: null, fondo: 'pasto', fuente: false };
  const RUTA = 'assets/UI/theme/';
  /** Cómo corta el juego cada pieza: [recorte vertical, recorte horizontal, ancho del borde en pantalla] y dónde la usa. */
  const PIEZAS = {
    frame: [22, 22, '44px', 'Marco del héroe (vida y energía)'],
    panel_dark: [8, 8, '16px', 'Paneles oscuros: objetivo, menús'],
    panel_brown: [8, 8, '16px', 'Paneles marrones: inventario, tienda'],
    parchment: [14, 14, '14px', 'Pergamino: diálogos y carteles'],
    plank: [10, 18, '20px 36px', 'Botón de madera'],
    plank_gold: [10, 18, '20px 36px', 'Botón principal (dorado)'],
    plank_dark: [10, 18, '12px 24px', 'Botón oscuro'],
    plank_red: [10, 18, '20px 36px', 'Botón de peligro'],
    plate: [6, 6, '12px', 'Chapa: casillas de objetos y teclas'],
    pill_dark: [6, 6, '6px', 'Etiqueta redondeada'],
    bar_track: [0, 0, '', 'Fondo de las barras de vida y energía']
  };
  const piezas = () =>
    Object.values(CK.P.assets)
      .filter(a => a.rutaJuego && a.rutaJuego.indexOf(RUTA) === 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const clave = a => a.rutaJuego.slice(RUTA.length).replace(/\.png$/i, '');
  const porClave = k => piezas().find(a => clave(a) === k);
  const url = k => {
    const a = porClave(k);
    return a && CK.img[a.id] ? CK.img[a.id].toDataURL() : null;
  };
  const borde = (k, ancho) => {
    const u = url(k),
      p = PIEZAS[k];
    if (!u || !p) return {};
    return p[0]
      ? {
          borderStyle: 'solid',
          borderWidth: ancho || p[2],
          borderImage: 'url(' + u + ') ' + p[0] + (p[1] !== p[0] ? ' ' + p[1] : '') + ' fill / ' + (ancho || p[2]) + ' stretch',
          imageRendering: 'pixelated'
        }
      : { background: 'url(' + u + ') center / 100% 100% no-repeat', imageRendering: 'pixelated' };
  };

  const traer = async () => {
    const d = await CK.juego.dir();
    if (!d) return;
    let n = 0;
    for (const e of await CK.fs.listar(d, RUTA)) {
      if (e.carpeta || !/\.png$/i.test(e.nombre)) continue;
      const ruta = RUTA + e.nombre;
      if (Object.values(CK.P.assets).some(a => a.rutaJuego === ruta)) continue;
      try {
        const c = await CK.cargarImagen(await CK.fs.leer(d, ruta));
        CK.asset.crear({
          nombre: 'ui_' + e.nombre.replace(/\.png$/i, ''),
          tipo: 'ui',
          lienzo: c,
          origen: 'juego: ' + ruta,
          etiquetas: ['interfaz'],
          extra: { rutaJuego: ruta }
        });
        n++;
      } catch (err) {}
    }
    await fuente();
    CK.aviso(n ? 'Traje ' + n + ' pieza(s) de la interfaz del juego.' : 'No había piezas nuevas para traer.', n ? 'ok' : 'info');
    if (!st.id && piezas()[0]) st.id = piezas()[0].id;
    pintar();
  };
  /** Carga la fuente del juego para que la maqueta se lea igual. */
  const fuente = async () => {
    if (st.fuente) return;
    const d = CK.fs.dir('juego');
    if (!d) return;
    try {
      const f = await CK.fs.leer(d, 'assets/font/Pixuf.ttf');
      const ff = new FontFace('PixufJuego', await f.arrayBuffer());
      await ff.load();
      document.fonts.add(ff);
      st.fuente = true;
    } catch (e) {}
  };
  const original = async a => {
    const d = await CK.juego.dir();
    if (!d) return null;
    const de = CK.fs.dir('editor'),
      n = a.rutaJuego.split('/').pop();
    try {
      if (de) return await CK.cargarImagen(await CK.fs.leer(de, CK.rutaProyecto() + '/respaldo/ui/' + n));
    } catch (e) {}
    try {
      return await CK.cargarImagen(await CK.fs.leer(d, a.rutaJuego));
    } catch (e) {
      return null;
    }
  };
  const blob = c => new Promise(r => c.toBlob(r, 'image/png'));
  /** Escribe en el juego las piezas cambiadas. La primera vez guarda la original en respaldo/ui/. */
  const llevar = async () => {
    const d = await CK.juego.dir();
    if (!d) return;
    const de = CK.fs.dir('editor'),
      camb = piezas().filter(a => a.modificado && a.modificado !== a.llevado);
    if (!camb.length) {
      CK.aviso('No hay piezas cambiadas para llevar.', 'info');
      return;
    }
    if (
      !(await CK.confirmar(
        'Llevar la interfaz al juego',
        'Se reemplazan ' +
          camb.length +
          ' imagen(es) en ' +
          RUTA +
          ': ' +
          camb.map(clave).join(', ') +
          '. Las originales quedan guardadas en la carpeta del editor (respaldo/ui).',
        'Reemplazar'
      ))
    )
      return;
    for (const a of camb) {
      const n = a.rutaJuego.split('/').pop();
      if (de) {
        let ya = null;
        try {
          ya = await CK.fs.leer(de, CK.rutaProyecto() + '/respaldo/ui/' + n);
        } catch (e) {}
        if (!ya) {
          try {
            await CK.fs.escribir(de, CK.rutaProyecto() + '/respaldo/ui/' + n, await CK.fs.leer(d, a.rutaJuego));
          } catch (e) {}
        }
      }
      await CK.fs.escribir(d, a.rutaJuego, await blob(CK.img[a.id]));
      a.llevado = a.modificado;
    }
    CK.tocar();
    CK.aviso('Interfaz actualizada en el juego: ' + camb.length + ' pieza(s). Recargá el juego para verla.');
    pintar();
  };
  const cambiarImg = (a, nombre, c) => {
    const f = CK.hist.imagen(nombre, a.id);
    CK.asset.poner(a.id, c);
    f();
    pintar();
  };
  /** Tiñe una pieza conservando sus luces y sombras (para llevar toda la interfaz a un mismo tono). */
  const tenir = (im, hex, k) => {
    const c = parseInt(hex.slice(1), 16),
      R = (c >> 16) & 255,
      G = (c >> 8) & 255,
      B = c & 255,
      o = { w: im.w, h: im.h, d: new Uint8ClampedArray(im.d) };
    for (let i = 0; i < o.d.length; i += 4) {
      if (!o.d[i + 3]) continue;
      const l = ((o.d[i] * 0.3 + o.d[i + 1] * 0.59 + o.d[i + 2] * 0.11) / 255) * 1.9;
      o.d[i] += (Math.min(255, R * l) - o.d[i]) * k;
      o.d[i + 1] += (Math.min(255, G * l) - o.d[i + 1]) * k;
      o.d[i + 2] += (Math.min(255, B * l) - o.d[i + 2]) * k;
    }
    return o;
  };

  const pintarIzq = () => {
    CK.vaciar(izq);
    const ps = piezas(),
      l = h('div.lista');
    ps.forEach(a => {
      const k = clave(a),
        p = PIEZAS[k];
      l.append(
        h(
          'div.item' + (a.id === st.id ? '.activo' : ''),
          {
            onclick: () => {
              st.id = a.id;
              pintar();
            }
          },
          CK.mini(CK.img[a.id], 30),
          h('div.crece', h('div.nombre', k), h('div.sub', p ? p[3] : 'pieza suelta')),
          a.modificado && a.modificado !== a.llevado ? h('span.etq.oro', 'cambió') : null
        )
      );
    });
    izq.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Piezas',
          CK.btn({
            ico: 'importar',
            txt: 'Traer del juego',
            cls: 'chico' + (ps.length ? '' : ' pri'),
            desc: 'Lee las imágenes de ' + RUTA + ' de CastleKnight.',
            on: traer
          })
        ),
        ps.length
          ? l
          : h(
              'p.nota-txt',
              'La interfaz del juego (marcos, paneles, botones) se arma con unas pocas imágenes chicas que se estiran. Traelas para verlas aplicadas y unificarlas con el resto del arte.'
            )
      ),
      ps.length
        ? h(
            'div.bloque',
            h('h3.bloque-tit', 'Al juego'),
            CK.btn({
              ico: 'exportar',
              txt: 'Llevar cambios al juego',
              cls: 'pri',
              desc: 'Reemplaza en el juego solo las piezas que cambiaste. Guarda antes una copia de cada original.',
              on: llevar
            }),
            h('p.nota-txt', 'Cada pieza tiene que conservar su tamaño y el ancho de sus bordes: el juego las corta siempre igual.')
          )
        : null
    );
  };
  const pintarMaqueta = () => {
    CK.vaciar(maqueta);
    const F = st.fuente ? 'PixufJuego, monospace' : 'monospace';
    const fondos = { pasto: '#5d9a4c', piedra: '#6f6a66', noche: '#1c2238', claro: '#d9cfae' };
    maqueta.style.background = fondos[st.fondo];
    maqueta.style.fontFamily = F;
    const caja = (k, estilo, ...kids) => {
      const e = h(
        'div.mq',
        {
          style: Object.assign({ boxSizing: 'border-box' }, borde(k), estilo),
          onclick: ev => {
            ev.stopPropagation();
            const a = porClave(k);
            if (a) {
              st.id = a.id;
              pintar();
            }
          }
        },
        ...kids
      );
      if (PIEZAS[k]) CK.tip(e, k, PIEZAS[k][3] + '. Clic para elegir esta pieza.');
      return e;
    };
    const barra = (color, pct) =>
      h(
        'div',
        { style: Object.assign({ height: '14px', margin: '4px 0', position: 'relative' }, borde('bar_track')) },
        h('div', {
          style: { position: 'absolute', left: '3px', top: '3px', bottom: '3px', width: 'calc(' + pct + '% - 6px)', background: color }
        })
      );
    maqueta.append(
      caja(
        'frame',
        { position: 'absolute', left: '14px', top: '14px', width: '270px', color: '#f5ead0' },
        h(
          'div',
          { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
          caja('plate', { width: '52px', height: '52px', flex: 'none' }),
          h(
            'div',
            { style: { flex: 1 } },
            h('div', { style: { fontSize: '16px' } }, 'LANCENT  ·  NIV. 3'),
            barra('#d64545', 78),
            barra('#e8b83a', 45)
          )
        )
      ),
      caja(
        'panel_dark',
        { position: 'absolute', right: '14px', top: '14px', width: '250px', color: '#f5ead0', fontSize: '13px', lineHeight: 1.35 },
        h('div', { style: { color: '#e8c36a', letterSpacing: '2px', fontSize: '11px', marginBottom: '4px' } }, 'OBJETIVO'),
        'Presentate ante el Rey en el Gran Salón del castillo',
        h(
          'div',
          { style: { marginTop: '6px', display: 'flex', gap: '6px' } },
          caja('pill_dark', { padding: '0 6px', fontSize: '11px' }, '12 monedas'),
          caja('pill_dark', { padding: '0 6px', fontSize: '11px' }, 'Día')
        )
      ),
      caja(
        'panel_brown',
        { position: 'absolute', right: '14px', top: '150px', width: '250px', color: '#f5ead0', fontSize: '13px' },
        h('div', { style: { marginBottom: '6px' } }, 'INVENTARIO'),
        h(
          'div',
          { style: { display: 'flex', gap: '6px' } },
          [1, 2, 3, 4].map(() => caja('plate', { width: '40px', height: '40px' }))
        )
      ),
      h(
        'div',
        {
          style: {
            position: 'absolute',
            left: '14px',
            top: '210px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-start'
          }
        },
        caja('plank_gold', { padding: '0 14px', color: '#3a2408', fontSize: '15px' }, 'JUGAR'),
        caja('plank', { padding: '0 14px', color: '#f5ead0', fontSize: '15px' }, 'OPCIONES'),
        url('plank_dark') ? caja('plank_dark', { padding: '0 10px', color: '#f5ead0', fontSize: '12px' }, 'VOLVER') : null,
        url('plank_red') ? caja('plank_red', { padding: '0 14px', color: '#fff', fontSize: '15px' }, 'SALIR') : null
      ),
      caja(
        'parchment',
        {
          position: 'absolute',
          left: '190px',
          right: '14px',
          bottom: '16px',
          maxWidth: '560px',
          color: '#3a2a18',
          fontSize: '15px',
          lineHeight: 1.35
        },
        h('div', { style: { fontSize: '12px', color: '#7a4a1c', marginBottom: '3px' } }, 'Baldo · Leñador'),
        'Buen día, viajero. Los lobos bajan de noche, así que no te alejes del camino.'
      ),
      h(
        'div',
        { style: { position: 'absolute', left: '14px', bottom: '16px', display: 'flex', gap: '6px' } },
        ['Z', 'X', 'C'].map(t => caja('plate', { width: '44px', height: '44px', color: '#f5ead0', fontSize: '11px' }, t))
      )
    );
  };
  const pintarLupa = () => {
    const a = CK.P.assets[st.id];
    if (!a || !CK.img[a.id]) {
      lupa.width = lupa.height = 1;
      return;
    }
    const c = CK.img[a.id],
      z = Math.max(2, Math.floor(Math.min(280 / c.width, 200 / c.height))),
      p = PIEZAS[clave(a)];
    lupa.width = c.width * z;
    lupa.height = c.height * z;
    lupa.style.width = lupa.width + 'px';
    const x = CK.ctx(lupa);
    x.imageSmoothingEnabled = false;
    for (let j = 0; j < lupa.height; j += 8)
      for (let i = 0; i < lupa.width; i += 8) {
        x.fillStyle = ((i + j) / 8) % 2 ? '#3a3a40' : '#2c2c31';
        x.fillRect(i, j, 8, 8);
      }
    x.drawImage(c, 0, 0, lupa.width, lupa.height);
    if (p && p[0]) {
      x.strokeStyle = '#58d0ff';
      x.setLineDash([4, 3]);
      [
        [p[1], 0, p[1], c.height],
        [c.width - p[1], 0, c.width - p[1], c.height],
        [0, p[0], c.width, p[0]],
        [0, c.height - p[0], c.width, c.height - p[0]]
      ].forEach(l => {
        x.beginPath();
        x.moveTo(l[0] * z + 0.5, l[1] * z + 0.5);
        x.lineTo(l[2] * z + 0.5, l[3] * z + 0.5);
        x.stroke();
      });
    }
  };
  const pintarDer = () => {
    CK.vaciar(der);
    const a = CK.P.assets[st.id];
    if (!a) {
      der.append(h('div.bloque', h('p.nota-txt', 'Elegí una pieza de la lista o hacé clic sobre ella en la maqueta.')));
      return;
    }
    const k = clave(a),
      p = PIEZAS[k];
    lupa = h('canvas', { style: { imageRendering: 'pixelated', display: 'block', margin: '0 auto', maxWidth: '100%' } });
    let color = CK.P.estilo.paleta[4] || '#a08a5c',
      fuerza = 60;
    der.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', k),
        h('p.nota-txt', (p ? p[3] + '. ' : '') + a.w + ' × ' + a.h + ' px.'),
        lupa,
        p && p[0]
          ? h(
              'p.nota-txt',
              'Las líneas celestes marcan el corte: lo de afuera son esquinas y bordes (' +
                p[1] +
                ' px a los lados, ' +
                p[0] +
                ' px arriba y abajo) y no se deforman; el centro se estira.'
            )
          : h('p.nota-txt', 'Esta pieza se estira entera.')
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Cambiarla'),
        h(
          'div.fila',
          CK.btn({ ico: 'pixel', txt: 'Editar a mano', desc: 'La abre en la sección Pixel art.', on: () => CK.ir('pixel', a.id) }),
          CK.btn({
            ico: 'imagen',
            txt: 'Reemplazar',
            desc: 'Usa otra imagen en su lugar. Se ajusta al tamaño de la pieza (' + a.w + ' × ' + a.h + ').',
            on: async () => {
              const [f] = await CK.elegirArchivos('image/*');
              if (!f) return;
              const img = await CK.cargarImagen(f),
                c = CK.lienzo(a.w, a.h),
                x = CK.ctx(c);
              x.imageSmoothingEnabled = false;
              x.drawImage(img, 0, 0, a.w, a.h);
              if (img.width !== a.w || img.height !== a.h)
                CK.aviso('La imagen medía ' + img.width + ' × ' + img.height + ': la ajusté a ' + a.w + ' × ' + a.h + '.', 'info', 5000);
              cambiarImg(a, 'Reemplazar pieza', c);
            }
          })
        ),
        h(
          'div.fila',
          { style: { marginTop: '6px' } },
          CK.btn({
            ico: 'paleta',
            txt: 'Pasar a mi paleta',
            desc: 'Lleva sus colores a la paleta de la guía de estilo, para que combine con el resto del juego.',
            on: () => cambiarImg(a, 'Paleta en pieza', CK.aLienzo(PIX.quantize(CK.asset.pix(a.id), CK.P.estilo.paleta)))
          }),
          CK.btn({
            ico: 'recargar',
            txt: 'Original',
            desc: 'Vuelve a la imagen que tenía el juego.',
            on: async () => {
              const c = await original(a);
              if (!c) {
                CK.aviso('No pude leer la original.', 'error');
                return;
              }
              cambiarImg(a, 'Volver a la original', c);
            }
          })
        )
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Teñir'),
        h(
          'p.nota-txt',
          'Cambia el tono conservando luces y sombras. Sirve para llevar madera, metal y pergamino a una misma familia de color.'
        ),
        CK.campo(
          'Color',
          (() => {
            const f = h('div.fila');
            CK.P.estilo.paleta.slice(0, 22).forEach(c =>
              f.append(
                h('button.muestra', {
                  type: 'button',
                  style: { background: c, width: '18px', height: '18px', border: '1px solid #000', borderRadius: '3px', padding: 0 },
                  onclick: () => {
                    color = c;
                    f.querySelectorAll('button').forEach(b => {
                      b.style.outline = b.style.background === f.lastColor ? '' : '';
                    });
                    CK.aviso('Color elegido: ' + c, 'info', 1200);
                  }
                })
              )
            );
            return f;
          })()
        ),
        CK.campo(
          'Cuánto',
          CK.rango(fuerza, { min: 10, max: 100 }, v => {
            fuerza = v;
          })
        ),
        h(
          'div.fila',
          CK.btn({
            ico: 'balde',
            txt: 'Teñir esta',
            on: () => cambiarImg(a, 'Teñir pieza', CK.aLienzo(tenir(CK.asset.pix(a.id), color, fuerza / 100)))
          }),
          CK.btn({
            ico: 'capas',
            txt: 'Teñir todas',
            desc: 'Aplica el mismo tono a todas las piezas de la interfaz.',
            on: () => {
              piezas().forEach(q => {
                const f = CK.hist.imagen('Teñir interfaz', q.id);
                CK.asset.poner(q.id, CK.aLienzo(tenir(CK.asset.pix(q.id), color, fuerza / 100)));
                f();
              });
              pintar();
            }
          })
        )
      )
    );
    pintarLupa();
  };
  const pintar = () => {
    if (!el || !CK.P) return;
    pintarIzq();
    pintarMaqueta();
    pintarDer();
  };
  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '250px 1fr 320px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    der = h('aside.panel');
    maqueta = h('div.maqueta-ui', {
      style: {
        position: 'relative',
        flex: 1,
        minHeight: '420px',
        overflow: 'hidden',
        borderRadius: '8px',
        border: '1px solid var(--linea)'
      }
    });
    const tira = h(
      'div.fila.junto',
      { style: { marginBottom: '10px' } },
      h('b', { style: { whiteSpace: 'nowrap' } }, 'Así se ve en el juego'),
      h('span.crece'),
      h('span.nota-txt', 'Fondo'),
      (() => {
        const e = CK.sel(
          st.fondo,
          [
            ['pasto', 'Pasto'],
            ['piedra', 'Piedra'],
            ['noche', 'Noche'],
            ['claro', 'Claro']
          ],
          v => {
            st.fondo = v;
            pintarMaqueta();
          }
        );
        e.style.cssText = 'width:120px;flex:none';
        return e;
      })()
    );
    centro = h('div', { style: { minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column' } }, tira, maqueta);
    el.append(izq, centro, der);
    CK.on('asset-img', id => {
      if (CK.seccionVisible('interfaz') && CK.P.assets[id] && CK.P.assets[id].rutaJuego && CK.P.assets[id].rutaJuego.indexOf(RUTA) === 0)
        pintar();
    });
  };
  const mostrar = async () => {
    if (!CK.P) return;
    if (!CK.P.assets[st.id]) st.id = (piezas()[0] || {}).id || null;
    await fuente();
    pintar();
  };
  CK.iconos.interfaz =
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><rect x="6" y="12" width="6" height="5" rx="1"/><path d="M15 13h3M15 16h3"/>';
  CK.registrar({
    id: 'interfaz',
    nombre: 'Interfaz del juego',
    corto: 'Interfaz',
    ico: 'interfaz',
    desc: 'Marcos, paneles y botones de CastleKnight: verlos aplicados, editarlos y llevarlos al juego.',
    crear,
    mostrar,
    alCambiarProyecto: () => {
      st.id = null;
    }
  });
})();
