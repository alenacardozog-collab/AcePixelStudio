/* ANIMAR · vista con zoom, menú de la vista y reproducción continua. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  // ---------------------------------------------------------------- vista con zoom
  const fondos = { cuadros: null, oscuro: '#1b1d21', pasto: '#4c7a3a', piedra: '#6b6258' };
  An.encuadre = () => {
    const fr = An.cuadrosCache()[0];
    if (fr && An.vista) An.vista.encuadrar(fr.width, fr.height, 70);
  };
  An.pintarVista = (x, v) => {
    const f = fondos[An.st.fondo];
    if (f) {
      x.fillStyle = f;
      x.fillRect(0, 0, v.w, v.h);
    } else CK.cuadros(x, v.w, v.h, 10, '#2b2e33', '#26292d');
    const { fr } = An.secuencia();
    if (!fr.length) return;
    const i = Math.max(0, Math.min(An.rep.i, fr.length - 1)),
      c = fr[i];
    x.save();
    v.mundo(x);
    x.imageSmoothingEnabled = false;
    if (!f) {
      x.fillStyle = 'rgba(0,0,0,.18)';
      x.fillRect(0, 0, c.width, c.height);
    }
    if (An.st.cebolla && fr.length > 1 && !An.rep.play)
      [
        [-1, 0.3, '#ff6b6b'],
        [1, 0.22, '#58d0ff']
      ].forEach(([d, al]) => {
        const j = i + d;
        if (j < 0 || j >= fr.length) return;
        x.globalAlpha = al;
        x.drawImage(fr[j], 0, 0);
        x.globalAlpha = 1;
      });
    An.dibujarFx(x, true);
    x.drawImage(c, 0, 0);
    An.dibujarFx(x, false);
    x.restore();
    if (An.st.grilla && v.z >= 8) v.grilla(x, 1, c.width, c.height, 'rgba(255,255,255,.07)');
    x.strokeStyle = 'rgba(255,255,255,.35)';
    x.lineWidth = 1;
    x.strokeRect(Math.round(v.tx) - 0.5, Math.round(v.ty) - 0.5, c.width * v.z + 1, c.height * v.z + 1);
  };
  An.herramientaVista = {
    bajar(m) {
      if (An.st.moverFx && An.fxLista()[An.st.fxSel] && m.boton === 0) {
        const e = An.fxLista()[An.st.fxSel];
        this._fx = { e, antes: An.hojaA() ? JSON.stringify(An.hojaA().fxPrueba) : null };
        e.x = Math.round(m.x);
        e.y = Math.round(m.y);
        An.vista.pedir();
        return;
      }
      this._pan = { sx: m.sx, sy: m.sy, tx: An.vista.tx, ty: An.vista.ty };
      An.vistaCv.style.cursor = CK.cur('grabbing');
    },
    mover(m) {
      if (this._fx) {
        this._fx.e.x = Math.round(m.x);
        this._fx.e.y = Math.round(m.y);
        An.vista.pedir();
        return;
      }
      if (this._pan) {
        An.vista.tx = this._pan.tx + m.sx - this._pan.sx;
        An.vista.ty = this._pan.ty + m.sy - this._pan.sy;
        An.vista.pedir();
      }
    },
    subir() {
      if (this._fx) {
        const a = An.hojaA();
        if (a && this._fx.antes !== JSON.stringify(a.fxPrueba)) {
          const antes = this._fx.antes,
            despues = JSON.stringify(a.fxPrueba),
            id = a.id;
          CK.hist.push({
            nombre: 'Mover efecto',
            deshacer: () => {
              CK.P.assets[id].fxPrueba = JSON.parse(antes);
              An.reiniciarFx();
            },
            rehacer: () => {
              CK.P.assets[id].fxPrueba = JSON.parse(despues);
              An.reiniciarFx();
            }
          });
        }
        this._fx = null;
        if (An.tabs) An.tabs.refrescar();
        return;
      }
      this._pan = null;
      An.vistaCv.style.cursor = '';
    },
    pasar() {
      if (!CK._espacio) An.vistaCv.style.cursor = CK.cur(An.st.moverFx ? 'crosshair' : 'grab');
    }
  };
  An.menuVista = e => {
    const { fr } = An.secuencia(),
      a = An.hojaA(),
      i = An.fisico(An.rep.i);
    CK.menu(e, [
      {
        txt: An.rep.play ? 'Pausar' : 'Reproducir',
        ico: An.rep.play ? 'pausa' : 'play',
        tecla: 'Espacio',
        on: () => An.ponerPlay(!An.rep.play)
      },
      { txt: 'Ver todo', ico: 'centrar', tecla: '0', on: An.encuadre },
      { txt: 'Acercar', ico: 'lupaMas', tecla: '+', on: () => An.vista.zoomEn(1) },
      { txt: 'Alejar', ico: 'lupaMenos', tecla: '-', on: () => An.vista.zoomEn(-1) },
      {
        txt: 'Zoom',
        ico: 'lupa',
        sub: [1, 2, 4, 8, 16, 32].map(z => ({
          txt: z * 100 + '%',
          activo: An.vista.z === z,
          on: () => {
            const c = fr[0];
            An.vista.z = z;
            if (c) {
              An.vista.tx = Math.round(An.vista.w / 2 - (c.width * z) / 2);
              An.vista.ty = Math.round(An.vista.h / 2 - (c.height * z) / 2);
            }
            if (An.vista.o.alZoom) An.vista.o.alZoom(z);
            An.vista.pedir();
          }
        }))
      },
      '-',
      {
        txt: 'Fondo',
        ico: 'imagen',
        sub: Object.keys(fondos).map(k => ({
          txt: { cuadros: 'Vacío', oscuro: 'Oscuro', pasto: 'Pasto', piedra: 'Piedra' }[k],
          activo: An.st.fondo === k,
          on: () => {
            An.st.fondo = k;
            An.pintarSobre();
            An.vista.pedir();
          }
        }))
      },
      {
        txt: 'Papel cebolla (en pausa)',
        ico: 'cebolla',
        activo: An.st.cebolla,
        on: () => {
          An.st.cebolla = !An.st.cebolla;
          An.pintarSobre();
          An.vista.pedir();
        }
      },
      {
        txt: 'Grilla de píxeles',
        ico: 'grilla',
        activo: An.st.grilla,
        on: () => {
          An.st.grilla = !An.st.grilla;
          An.pintarSobre();
          An.vista.pedir();
        }
      },
      {
        txt: 'Ver efectos',
        ico: 'fx',
        activo: An.st.verFx,
        off: !An.fxLista().length,
        on: () => {
          An.st.verFx = !An.st.verFx;
          An.pintarSobre();
          An.vista.pedir();
        }
      },
      { txt: 'Agregar un efecto…', ico: 'mas', on: An.agregarFx },
      a ? '-' : null,
      a ? { txt: 'Editar este cuadro en Pixel art', ico: 'pixel', on: () => An.editarEnPixel(i) } : null,
      fr.length
        ? {
            txt: 'Descargar este cuadro (PNG)',
            ico: 'importar',
            on: async () =>
              CK.descargar(await CK.aBlob(fr[Math.min(An.rep.i, fr.length - 1)]), ((a || {}).id || 'cuadro') + '_' + (i + 1) + '.png')
          }
        : null
    ]);
  };
  let bPlay = null;
  An.ponerPlay = v => {
    An.rep.play = v;
    const { ms } = An.secuencia(),
      total = ms.reduce((s, q) => s + q, 0) / 1000;
    if (v && An.rep.t >= total - 0.001) An.rep.t = 0;
    if (bPlay) bPlay.innerHTML = CK.ico(v ? 'pausa' : 'play');
    An.pintarCabezal();
    if (An.vista) An.vista.pedir();
  };
  An.irA = i => {
    const { ms } = An.secuencia();
    if (!ms.length) return;
    i = Math.max(0, Math.min(ms.length - 1, i));
    An.rep.t = An.inicioDe(ms, i) + 0.0001;
    An.rep.i = i;
    An.ponerPlay(false);
    An.reiniciarFx();
    An.pintarCabezal();
    An.vista.pedir();
  };
  An.pintarSobre = () => {
    if (!An.sobreVista) return;
    CK.vaciar(An.sobreVista);
    bPlay = CK.btn({
      ico: An.rep.play ? 'pausa' : 'play',
      tip: 'Reproducir / pausar',
      tecla: 'Espacio',
      cls: 'chico plano',
      on: () => An.ponerPlay(!An.rep.play)
    });
    const t = (ico, tip, desc, get, set) =>
      CK.btn({
        ico,
        tip,
        desc,
        cls: 'chico plano' + (get() ? ' activo' : ''),
        on: () => {
          set(!get());
          An.pintarSobre();
          An.vista.pedir();
        }
      });
    An.sobreVista.append(
      h(
        'div.tira',
        bPlay,
        h('span.sep'),
        h('span.txt', 'Fondo'),
        ...Object.keys(fondos).map(k =>
          CK.btn({
            txt: { cuadros: 'Vacío', oscuro: 'Oscuro', pasto: 'Pasto', piedra: 'Piedra' }[k],
            cls: 'chico plano' + (An.st.fondo === k ? ' activo' : ''),
            desc: 'Color detrás de la animación, para ver cómo se lee sobre el suelo del juego.',
            on: () => {
              An.st.fondo = k;
              An.pintarSobre();
              An.vista.pedir();
            }
          })
        ),
        h('span.sep'),
        t(
          'cebolla',
          'Papel cebolla',
          'En pausa muestra el cuadro anterior y el siguiente en transparencia.',
          () => An.st.cebolla,
          v => {
            An.st.cebolla = v;
          }
        ),
        t(
          'grilla',
          'Grilla de píxeles',
          'Con zoom alto marca cada píxel.',
          () => An.st.grilla,
          v => {
            An.st.grilla = v;
          }
        ),
        t(
          'fx',
          'Ver efectos',
          'Muestra u oculta los efectos que agregaste para probar.',
          () => An.st.verFx,
          v => {
            An.st.verFx = v;
          }
        )
      )
    );
  };
  // reproducción continua
  An.raf = 0;
  An.bucle = now => {
    An.raf = CK.raf(An.bucle);
    if (!CK.seccionVisible('anim') || An.st.modo === 'poses' || !An.vista) {
      An.rep.u = now;
      return;
    }
    const dt = Math.min(0.1, Math.max(0, (now - (An.rep.u || now)) / 1000));
    An.rep.u = now;
    const { fr, ms } = An.secuencia();
    if (!fr.length) return;
    const total = ms.reduce((s, v) => s + v, 0) / 1000,
      a = An.hojaA(),
      enBucle = !(a && a.cuadros && a.cuadros.bucle === false);
    if (An.rep.play) {
      An.rep.t += dt;
      if (An.rep.t >= total) {
        if (enBucle) An.rep.t %= total;
        else {
          An.rep.t = total - 0.0001;
          An.ponerPlay(false);
        }
      }
    }
    let acc = 0,
      i = 0;
    for (; i < ms.length; i++) {
      acc += ms[i] / 1000;
      if (An.rep.t < acc) break;
    }
    i = Math.min(i, fr.length - 1);
    const cambio = i !== An.rep.i;
    An.rep.i = i;
    An.pasoFx(dt, i, cambio);
    if (cambio || (An.fxActivos() && An.rep.play)) An.vista.pedir();
    if (cambio) An.marcarActual();
    An.moverAguja(total);
  };
})();
