/* FX: efectos editables por capas (partículas, luces, destellos, sacudida) con vista previa en vivo.
   Se guardan como datos (el juego los reproduce con js/core/fxsim.js) o se "hornean" a una hoja de sprites para cualquier motor. */
'use strict';
(function () {
  const h = CK.h;
  let el,
    izq,
    der,
    cv,
    lineaT,
    sim = null,
    vivo = false,
    espera = 0;
  const st = { id: null, capa: 0, fondo: 'oscuro', mapaFondo: null, pixelado: true, pausa: false, escala: 3, modo: 'pivot', k: 3 };
  const FPS = 30;
  let arrFx = null; // capa que se está arrastrando en la línea de tiempo
  const BW = 240,
    BH = 160;
  const FX = () => CK.P && CK.P.fx[st.id];
  const TIPOS = {
    emisor: ['Partículas', 'particulas'],
    luz: ['Luz', 'luz'],
    destello: ['Destello', 'rayo'],
    sacudida: ['Sacudida', 'mover']
  };
  const reiniciar = () => {
    const f = FX();
    sim = f ? CKFx.crear(f, { semilla: 7 }) : null;
    espera = 0;
  };
  const recurso = id => {
    const a = CK.P.assets[id];
    return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null;
  };
  const origen = f =>
    f.vista
      ? { x: f.vista.x, y: f.vista.y }
      : {
          x: f.mov && f.mov.vx > 0 ? Math.round(BW * 0.14) : f.mov && f.mov.vx < 0 ? Math.round(BW * 0.86) : Math.round(BW / 2),
          y: f.mov && f.mov.vy < 0 ? Math.round(BH * 0.85) : Math.round(BH * 0.58)
        };

  // ---------------------------------------------------------------- reproducción: pausar, seguir y recorrer cuadro por cuadro
  /** Lleva el efecto a un momento exacto. Como la simulación siempre da lo mismo, se rehace desde el principio hasta ahí. */
  const irA = t => {
    const f = FX();
    if (!f) return;
    t = Math.max(0, Math.min(f.dur, t));
    sim = CKFx.crear(f, { semilla: 7 });
    espera = 0;
    const dt = 1 / 60;
    if (f.bucle) for (let i = 0; i < Math.ceil(f.dur * 60); i++) sim.paso(dt);
    let n = Math.round(t * 60);
    if (f.bucle) {
      sim.t = 0;
    }
    for (let i = 0; i < n; i++) sim.paso(dt);
    if (f.bucle || t < f.dur) sim.t = t;
    st.t = t;
  };
  const ponerPausa = v => {
    st.pausa = v;
    document.querySelectorAll('.fx-play').forEach(b => {
      b.innerHTML = CK.ico(st.pausa ? 'play' : 'pausa');
      b.classList.toggle('activo', st.pausa);
    });
  };
  const paso = n => {
    const f = FX();
    if (!f || !sim) return;
    ponerPausa(true);
    const total = Math.max(1, Math.round(f.dur * FPS));
    let c = Math.round((sim.t % (f.dur + 0.0001)) * FPS) + n;
    if (f.bucle) c = ((c % total) + total) % total;
    else c = Math.max(0, Math.min(total, c));
    irA(c / FPS);
  };

  // ---------------------------------------------------------------- dibujo
  let baja = null,
    capaFx = null,
    fondoMapa = null,
    fondoDe = null;
  const cuadro = dt => {
    const f = FX();
    if (!cv || !f || !sim) return;
    baja = baja || CK.lienzo(BW, BH);
    capaFx = capaFx || CK.lienzo(BW, BH);
    if (!st.pausa) {
      if (sim.fin) {
        espera += dt;
        if (espera > 0.7) reiniciar();
      } else sim.paso(dt);
    }
    const x = CK.ctx(baja),
      o = origen(f);
    if (st.fondo === 'mapa' && st.mapaFondo && CK.P.mapas[st.mapaFondo]) {
      if (fondoDe !== st.mapaFondo) {
        fondoMapa = CK.mapa.foto(CK.P.mapas[st.mapaFondo]);
        fondoDe = st.mapaFondo;
      }
      x.fillStyle = '#17191c';
      x.fillRect(0, 0, BW, BH);
      x.drawImage(
        fondoMapa,
        Math.max(0, Math.round(fondoMapa.width / 2 - BW / 2)),
        Math.max(0, Math.round(fondoMapa.height / 2 - BH / 2)),
        BW,
        BH,
        0,
        0,
        BW,
        BH
      );
    } else {
      x.fillStyle = { oscuro: '#1b1d21', noche: '#161a30', pasto: '#4c7a3a', piedra: '#6b6258', claro: '#c9c2b0' }[st.fondo] || '#1b1d21';
      x.fillRect(0, 0, BW, BH);
    }
    const y = CK.ctx(capaFx);
    y.clearRect(0, 0, BW, BH);
    sim.dibujar(y, o.x, o.y, recurso, 'particulas');
    if (st.pixelado && !((FX() || {}).capas || []).some(c => c.suavizado || c.figura === 'brillo' || c.figura === 'humo')) {
      const d = y.getImageData(0, 0, BW, BH),
        pal = CK.P.estilo.paleta;
      let im = { w: BW, h: BH, d: d.data };
      for (let i = 3; i < im.d.length; i += 4) im.d[i] = im.d[i] >= 70 ? 255 : 0;
      if (pal.length) im = PIX.quantize(im, pal);
      y.putImageData(new ImageData(new Uint8ClampedArray(im.d), BW, BH), 0, 0);
    }
    x.drawImage(capaFx, sim.sacudida.x * 0, 0);
    sim.dibujar(x, o.x, o.y, recurso, 'luces');
    const r = cv.parentElement.getBoundingClientRect(),
      k = Math.max(1, Math.floor(Math.min((r.width - 20) / BW, (r.height - 20) / BH)));
    if (cv.width !== BW * k) {
      cv.width = BW * k;
      cv.height = BH * k;
      cv.style.width = BW * k + 'px';
      cv.style.height = BH * k + 'px';
    }
    const z = CK.ctx(cv);
    z.imageSmoothingEnabled = false;
    z.drawImage(baja, 0, 0, BW * k, BH * k);
    st.k = k;
    guias(z, f, o, k);
    if (lineaT) {
      const m = lineaT.querySelector('.aguja');
      if (m) m.style.left = Math.min(100, (sim.t / f.dur) * 100) + '%';
      const tt = lineaT.querySelector('.fx-tiempo');
      if (tt) {
        const txt =
          Math.min(f.dur, sim.t).toFixed(2) +
          ' s  ·  cuadro ' +
          (Math.min(Math.round(f.dur * FPS), Math.round(sim.t * FPS)) + 1) +
          ' de ' +
          (Math.round(f.dur * FPS) + 1);
        if (tt.textContent !== txt) tt.textContent = txt;
      }
    }
  };
  /** Guías sobre la vista: pivot, flecha de viaje del efecto y dirección de la capa de partículas elegida. */
  const flecha = (z, x0, y0, x1, y1, color) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    z.strokeStyle = '#000';
    z.lineWidth = 4;
    z.beginPath();
    z.moveTo(x0, y0);
    z.lineTo(x1, y1);
    z.stroke();
    z.strokeStyle = color;
    z.fillStyle = color;
    z.lineWidth = 2;
    z.beginPath();
    z.moveTo(x0, y0);
    z.lineTo(x1, y1);
    z.stroke();
    z.beginPath();
    z.moveTo(x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4);
    z.lineTo(x1 - Math.cos(a - 0.5) * 11, y1 - Math.sin(a - 0.5) * 11);
    z.lineTo(x1 - Math.cos(a + 0.5) * 11, y1 - Math.sin(a + 0.5) * 11);
    z.closePath();
    z.fill();
    z.strokeStyle = '#000';
    z.lineWidth = 1;
    z.stroke();
  };
  const guias = (z, f, o, k) => {
    if (st.sinGuias) return;
    const px = (o.x + 0.5) * k,
      py = (o.y + 0.5) * k,
      c = f.capas[st.capa],
      act = st.modo;
    z.save();
    z.lineWidth = 1;
    // pivot
    z.strokeStyle = '#000';
    z.beginPath();
    z.arc(px, py, act === 'pivot' ? 8 : 5, 0, 7);
    z.stroke();
    z.strokeStyle = act === 'pivot' ? '#e8b83a' : 'rgba(255,255,255,.7)';
    z.beginPath();
    z.arc(px, py, act === 'pivot' ? 7 : 4, 0, 7);
    z.moveTo(px - 12, py + 0.5);
    z.lineTo(px + 12, py + 0.5);
    z.moveTo(px + 0.5, py - 12);
    z.lineTo(px + 0.5, py + 12);
    z.stroke();
    // viaje del efecto
    const mv = f.mov || {};
    if ((mv.vx || mv.vy) && (act === 'viaje' || act === 'pivot'))
      flecha(z, px, py, px + ((mv.vx || 0) / 4) * k, py + ((mv.vy || 0) / 4) * k, act === 'viaje' ? '#58d0ff' : 'rgba(88,208,255,.55)');
    else if (act === 'viaje') {
      z.fillStyle = '#58d0ff';
      z.font = '12px "Segoe UI", sans-serif';
      z.fillText('Arrastrá desde el pivot para darle dirección y velocidad', 10, 18);
    }
    // capa elegida
    if (c && (c.tipo === 'emisor' || c.tipo === 'luz') && (act === 'capa' || act === 'angulo')) {
      const ex = px + (c.x || 0) * k,
        ey = py + (c.y || 0) * k;
      z.strokeStyle = '#000';
      z.strokeRect(ex - 5.5, ey - 5.5, 11, 11);
      z.strokeStyle = act === 'capa' ? '#e8b83a' : '#fff';
      z.strokeRect(ex - 4.5, ey - 4.5, 9, 9);
      if (c.tipo === 'emisor' && !c.radial) {
        const a = ((c.angulo || 0) * Math.PI) / 180,
          L = 46,
          ap = ((c.apertura || 0) * Math.PI) / 360;
        if (ap > 0.02 && ap < 3.1) {
          z.fillStyle = 'rgba(242,154,208,.16)';
          z.beginPath();
          z.moveTo(ex, ey);
          z.arc(ex, ey, L, a - ap, a + ap);
          z.closePath();
          z.fill();
        }
        flecha(z, ex, ey, ex + Math.cos(a) * L, ey + Math.sin(a) * L, act === 'angulo' ? '#f29ad0' : 'rgba(242,154,208,.6)');
      }
    }
    z.restore();
  };
  /** Arrastres sobre la vista según el modo elegido. */
  const alArrastrar = e0 => {
    const f = FX();
    if (!f || e0.button !== 0) return;
    const k = st.k,
      r = cv.getBoundingClientRect(),
      B = e => ({ x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }),
      c = f.capas[st.capa],
      modo = st.modo,
      nombre = { pivot: 'Mover pivot', capa: 'Mover capa', viaje: 'Dirección del efecto', angulo: 'Dirección de las partículas' }[modo];
    if ((modo === 'capa' || modo === 'angulo') && !(c && (c.tipo === 'emisor' || (modo === 'capa' && c.tipo === 'luz')))) {
      CK.aviso(
        modo === 'capa'
          ? 'Elegí en la línea de tiempo una capa de Partículas o de Luz para moverla.'
          : 'Elegí en la línea de tiempo una capa de Partículas para darle dirección.',
        'info',
        3500
      );
      return;
    }
    cv.setPointerCapture(e0.pointerId);
    const aplicar = e => {
      const b = B(e),
        o = origen(f);
      if (modo === 'pivot')
        ed(
          nombre,
          x => {
            x.vista = { x: Math.round(CK.clamp(b.x, 4, BW - 4)), y: Math.round(CK.clamp(b.y, 4, BH - 4)) };
          },
          false
        );
      else if (modo === 'capa')
        ed(
          nombre,
          () => {
            c.x = Math.round(b.x - o.x);
            c.y = Math.round(b.y - o.y);
          },
          false
        );
      else if (modo === 'viaje')
        ed(
          nombre,
          x => {
            const dx = b.x - o.x,
              dy = b.y - o.y;
            x.mov = Math.hypot(dx, dy) < 4 ? { vx: 0, vy: 0 } : { vx: Math.round((dx * 4) / 5) * 5, vy: Math.round((dy * 4) / 5) * 5 };
          },
          false
        );
      else
        ed(
          nombre,
          () => {
            const ex = o.x + (c.x || 0),
              ey = o.y + (c.y || 0);
            let a = Math.round((Math.atan2(b.y - ey, b.x - ex) * 180) / Math.PI);
            if (e.shiftKey) a = Math.round(a / 15) * 15;
            c.angulo = a;
            c.radial = false;
          },
          false
        );
    };
    aplicar(e0);
    const mv = e => aplicar(e),
      up = () => {
        cv.removeEventListener('pointermove', mv);
        cv.removeEventListener('pointerup', up);
        tocar(nombre, true);
        if (modo === 'viaje') reiniciar();
        pintarDer();
      };
    cv.addEventListener('pointermove', mv);
    cv.addEventListener('pointerup', up);
  };
  const lazo = t => {
    if (!vivo) return;
    const dt = Math.min(0.05, (t - (lazo.u || t)) / 1000);
    lazo.u = t;
    if (CK.seccionVisible('fx')) cuadro(dt || 0.016);
    CK.raf(lazo);
  };

  // ---------------------------------------------------------------- edición con deshacer
  let antes = null;
  const tocar = (nombre, final) => {
    if (antes === null) return;
    if (final !== false) {
      const a = antes,
        d = JSON.stringify(FX()),
        id = st.id;
      antes = null;
      if (a !== d)
        CK.hist.push({
          nombre,
          deshacer: () => {
            CK.P.fx[id] = JSON.parse(a);
            CK.emit('datos', 'fx', id);
          },
          rehacer: () => {
            CK.P.fx[id] = JSON.parse(d);
            CK.emit('datos', 'fx', id);
          }
        });
    }
    CK.tocar();
  };
  const ed = (nombre, fn, final) => {
    if (antes === null) antes = JSON.stringify(FX());
    fn(FX());
    if (sim) sim.e = FX();
    tocar(nombre, final);
  };
  const rg = (rot, get, set, min, max, step, ayuda) =>
    CK.campo(
      rot,
      CK.rango(get(), { min, max, step: step || 1 }, (v, fin) => ed(rot, () => set(v), fin)),
      ayuda
    );
  /** Selector de curva de suavizado con su dibujito. */
  const curvaSel = (rot, get, set, ayuda) => {
    const cv = h('canvas', {
        width: 54,
        height: 26,
        style: { flex: 'none', background: 'var(--hueco)', borderRadius: '4px', border: '1px solid var(--linea)' }
      }),
      dib = () => {
        const x = CK.ctx(cv),
          f = CKFx.CURVAS[get() || 'lineal'] || CKFx.CURVAS.lineal;
        x.clearRect(0, 0, 54, 26);
        x.strokeStyle = '#e8b83a';
        x.lineWidth = 1.5;
        x.beginPath();
        for (let i = 0; i <= 48; i++) {
          const k = i / 48,
            y = 22 - Math.max(-0.15, Math.min(1.15, f(k))) * 18;
          if (i) x.lineTo(3 + i, y);
          else x.moveTo(3, y);
        }
        x.stroke();
      };
    const sel = CK.sel(
      get() || 'lineal',
      Object.keys(CKFx.NOMBRES_CURVA).map(k => [k, CKFx.NOMBRES_CURVA[k]]),
      v => {
        ed(rot, () => set(v));
        dib();
      }
    );
    dib();
    return CK.campo(rot, h('div.fila.junto', { style: { gap: '6px' } }, sel, cv), ayuda);
  };
  const par = (rot, arr, min, max, step, ayuda, n1 = 'mín', n2 = 'máx') =>
    h(
      'div',
      { style: { margin: '6px 0' } },
      CK.tip(h('span.campo-rot', rot), rot, ayuda),
      h(
        'div.duo',
        h(
          'label',
          h('span.mini-rot', n1),
          CK.rango(arr()[0], { min, max, step: step || 1 }, (v, fin) =>
            ed(
              rot,
              () => {
                arr()[0] = v;
              },
              fin
            )
          )
        ),
        h(
          'label',
          h('span.mini-rot', n2),
          CK.rango(arr()[1], { min, max, step: step || 1 }, (v, fin) =>
            ed(
              rot,
              () => {
                arr()[1] = v;
              },
              fin
            )
          )
        )
      )
    );

  const nuevoFx = plantilla => {
    const base = plantilla
      ? CK.clone(CKFx.plantillas[plantilla])
      : {
          nombre: 'Efecto nuevo',
          dur: 1,
          bucle: true,
          capas: [
            Object.assign({ tipo: 'emisor', nombre: 'Partículas', inicio: 0 }, CK.clone(CKFx.DEF), {
              colores: [CK.P.estilo.paleta[CK.P.estilo.paleta.length - 1] || '#ffffff']
            })
          ]
        };
    let id = CK.slug(base.nombre),
      n = 2;
    while (CK.P.fx[id]) id = CK.slug(base.nombre) + '_' + n++;
    base.id = id;
    base.capas.forEach(c => {
      if (c.tipo === 'emisor')
        Object.keys(CKFx.DEF).forEach(k => {
          if (c[k] === undefined) c[k] = CK.clone(CKFx.DEF[k]);
        });
    });
    CK.P.fx[id] = base;
    CK.tocar();
    st.id = id;
    st.capa = 0;
    reiniciar();
    pintarTodo();
  };
  const aPaleta = () =>
    ed('Llevar a la paleta', f => {
      const P = PIX.palRGB(CK.P.estilo.paleta);
      if (!P.length) return;
      const cerca = hx => {
        const c = PIX.hex2rgb(hx);
        return CK.P.estilo.paleta[PIX.nearestIdx(P, c[0], c[1], c[2])];
      };
      f.capas.forEach(c => {
        if (c.colores) c.colores = c.colores.map(cerca);
      });
    });
  /** Hornea el efecto cuadro a cuadro. Devuelve { frames (pix), fw, fh, fps }. */
  const hornear = (f, fps = 12) => {
    const s = CKFx.crear(CK.clone(Object.assign({}, f, { bucle: false })), { semilla: 7 }),
      W = 320,
      H = 240,
      ox = W / 2 - (f.mov ? ((f.mov.vx || 0) * f.dur) / 2 : 0),
      oy = H * 0.6 - (f.mov ? ((f.mov.vy || 0) * f.dur) / 2 : 0),
      c = CK.lienzo(W, H),
      x = CK.ctx(c),
      crudos = [],
      dt = 1 / 60,
      total = Math.ceil((f.dur + 0.9) * 60),
      cada = Math.round(60 / fps);
    if (f.bucle) for (let i = 0; i < Math.ceil(f.dur * 60); i++) s.paso(dt); // pre-rodaje: el loop arranca ya "lleno"
    const sb = f.bucle ? CKFx.crear(CK.clone(f), { semilla: 7 }) : s;
    if (f.bucle) for (let i = 0; i < Math.ceil(f.dur * 120); i++) sb.paso(dt);
    const usar = f.bucle ? sb : s,
      pasos = f.bucle ? Math.ceil(f.dur * 60) : total;
    for (let i = 0; i < pasos; i++) {
      if (i % cada === 0) {
        x.clearRect(0, 0, W, H);
        usar.dibujar(x, Math.round(ox), Math.round(oy), recurso, 'particulas');
        let im = CK.aPix(c);
        im = { w: W, h: H, d: new Uint8ClampedArray(im.d) };
        for (let q = 3; q < im.d.length; q += 4) im.d[q] = im.d[q] >= 70 ? 255 : 0;
        if (CK.P.estilo.paleta.length) im = PIX.quantize(im, CK.P.estilo.paleta);
        crudos.push(im);
      }
      usar.paso(dt);
      if (!f.bucle && usar.fin) break;
    }
    while (crudos.length > 1 && !PIX.bbox(crudos[crudos.length - 1])) crudos.pop();
    let x0 = W,
      y0 = H,
      x1 = 0,
      y1 = 0;
    crudos.forEach(im => {
      const b = PIX.bbox(im);
      if (!b) return;
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h);
    });
    if (x1 <= x0) {
      x0 = 0;
      y0 = 0;
      x1 = 8;
      y1 = 8;
    }
    return {
      frames: crudos.map(im => PIX.crop(im, x0, y0, x1 - x0, y1 - y0)),
      fw: x1 - x0,
      fh: y1 - y0,
      fps,
      ancla: { x: Math.round(ox) - x0, y: Math.round(oy) - y0 }
    };
  };
  CK.fxHornear = hornear;

  // ---------------------------------------------------------------- paneles
  const pintarIzq = () => {
    if (!izq) return;
    CK.vaciar(izq);
    const l = h('div.lista');
    Object.values(CK.P.fx).forEach(f =>
      l.append(
        h(
          'div.item' + (f.id === st.id ? '.activo' : ''),
          {
            onclick: () => {
              st.id = f.id;
              st.capa = 0;
              reiniciar();
              pintarTodo();
            }
          },
          h('span', { html: CK.ico('fx', 16) }),
          h('span.nombre', f.nombre),
          h('span.sub', f.dur + ' s' + (f.bucle ? ' · loop' : '')),
          CK.btn({
            ico: 'basura',
            tip: 'Eliminar efecto',
            desc: 'Borra este efecto del proyecto (pregunta antes).',
            cls: 'chico plano',
            on: async e => {
              e.stopPropagation();
              if (
                !(await CK.confirmar(
                  'Eliminar efecto',
                  'Se elimina "' + f.nombre + '". Los puntos de Efecto del mapa que lo usen quedan vacíos. Se puede deshacer con Ctrl + Z.',
                  'Eliminar'
                ))
              )
                return;
              const a = JSON.stringify(f),
                id = f.id;
              delete CK.P.fx[id];
              CK.hist.push({
                nombre: 'Eliminar efecto',
                deshacer: () => {
                  CK.P.fx[id] = JSON.parse(a);
                  CK.emit('datos', 'fx', id);
                },
                rehacer: () => {
                  delete CK.P.fx[id];
                  CK.emit('datos', 'fx', id);
                }
              });
              CK.tocar();
              if (st.id === id) st.id = Object.keys(CK.P.fx)[0] || null;
              st.capa = 0;
              reiniciar();
              pintarTodo();
            }
          })
        )
      )
    );
    izq.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Efectos del proyecto',
          CK.btn({
            ico: 'mas',
            txt: 'Vacío',
            cls: 'chico',
            desc: 'Crea un efecto con un solo emisor de partículas para armarlo desde cero.',
            on: () => nuevoFx()
          })
        ),
        Object.keys(CK.P.fx).length ? l : h('p.nota-txt', 'Todavía no hay efectos. Empezá por una plantilla y cambiale lo que quieras.')
      )
    );
    const lp = h('div.lista');
    Object.keys(CKFx.plantillas).forEach(k => {
      const p = CKFx.plantillas[k],
        b = h(
          'div.item',
          { onclick: () => nuevoFx(k) },
          h('span', { html: CK.ico(p.mov ? 'rayo' : /fuego|explos/.test(k) ? 'fuego' : 'particulas', 16) }),
          h('span.nombre', p.nombre),
          h('span.sub', p.capas.length + ' capas')
        );
      CK.tip(b, 'Plantilla: ' + p.nombre, 'Clic para crear un efecto nuevo a partir de esta plantilla. Después lo editás libremente.');
      lp.append(b);
    });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Plantillas'), lp));
  };
  const pintarLinea = () => {
    if (!lineaT) return;
    CK.vaciar(lineaT);
    const f = FX();
    if (!f) return;
    const filas = h('div', { style: { position: 'relative' } });
    f.capas.forEach((c, i) => {
      const a = c.inicio || 0,
        b = c.fin === undefined || c.fin === null ? f.dur : c.fin,
        seg = h('div.pista-seg', {
          style: {
            left: (a / f.dur) * 100 + '%',
            width: Math.max(1.5, ((b - a) / f.dur) * 100) + '%',
            background: c.oculta
              ? 'var(--linea2)'
              : { emisor: 'var(--oro)', luz: '#ffb04a', destello: '#f5f1e6', sacudida: 'var(--violeta)' }[c.tipo]
          }
        }),
        barra = h('div.pista-barra', seg);
      CK.tip(
        seg,
        c.nombre + ': ' + a.toFixed(2) + ' s a ' + b.toFixed(2) + ' s',
        'Arrastrá el medio para moverla en el tiempo, o el borde derecho para acortarla o alargarla.'
      );
      seg.addEventListener('pointerdown', e => {
        e.stopPropagation();
        seg.setPointerCapture(e.pointerId);
        st.capa = i;
        const r = barra.getBoundingClientRect(),
          sr = seg.getBoundingClientRect(),
          borde = e.clientX > sr.right - 8,
          x0 = e.clientX,
          a0 = a,
          b0 = b;
        antes = JSON.stringify(FX());
        const mv = ev => {
          const d = ((ev.clientX - x0) / r.width) * f.dur;
          ed(
            'Tiempos',
            () => {
              if (borde) c.fin = +CK.clamp(b0 + d, a0 + 0.02, f.dur).toFixed(2);
              else {
                const na = CK.clamp(a0 + d, 0, f.dur - (b0 - a0));
                c.inicio = +na.toFixed(2);
                c.fin = +(na + (b0 - a0)).toFixed(2);
              }
            },
            false
          );
          const na = c.inicio || 0,
            nb = c.fin === undefined ? f.dur : c.fin;
          seg.style.left = (na / f.dur) * 100 + '%';
          seg.style.width = Math.max(1.5, ((nb - na) / f.dur) * 100) + '%';
        };
        const up = () => {
          seg.removeEventListener('pointermove', mv);
          seg.removeEventListener('pointerup', up);
          tocar('Tiempos', true);
          pintarTodo();
        };
        seg.addEventListener('pointermove', mv);
        seg.addEventListener('pointerup', up);
      });
      const fila = h(
        'div.pista' + (i === st.capa ? '.activo' : ''),
        {
          onclick: () => {
            st.capa = i;
            pintarTodo();
          },
          ondragover: e => {
            if (arrFx === null || arrFx === i) return;
            e.preventDefault();
            const r = fila.getBoundingClientRect();
            fila.style.boxShadow = e.clientY < r.top + r.height / 2 ? 'inset 0 2px 0 var(--oro)' : 'inset 0 -2px 0 var(--oro)';
          },
          ondragleave: () => {
            fila.style.boxShadow = '';
          },
          ondrop: e => {
            if (arrFx === null || arrFx === i) return;
            e.preventDefault();
            const r = fila.getBoundingClientRect(),
              antesDe = e.clientY < r.top + r.height / 2,
              de = arrFx;
            arrFx = null;
            ed('Ordenar capas', fx => {
              const q = fx.capas.splice(de, 1)[0];
              let a2 = i - (de < i ? 1 : 0) + (antesDe ? 0 : 1);
              fx.capas.splice(a2, 0, q);
              st.capa = a2;
            });
            pintarTodo();
          }
        },
        h(
          'span.nombre',
          {
            draggable: 'true',
            ondragstart: e => {
              arrFx = i;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', 'capa-fx');
            },
            ondragend: () => {
              arrFx = null;
            },
            title: 'Arrastrá para cambiar el orden de las capas',
            style: { display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'grab' },
            html: CK.ico(TIPOS[c.tipo][1], 14)
          },
          h('span', c.nombre || TIPOS[c.tipo][0])
        ),
        barra,
        CK.btn({
          ico: c.oculta ? 'ojoNo' : 'ojo',
          tip: c.oculta ? 'Mostrar capa' : 'Ocultar capa',
          cls: 'chico plano',
          on: e => {
            e.stopPropagation();
            ed('Ver capa', () => {
              c.oculta = !c.oculta;
            });
            pintarLinea();
          }
        })
      );
      filas.append(fila);
    });
    filas.append(
      h('div.aguja', {
        style: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '0%',
          width: '1px',
          background: '#fff',
          marginLeft: '126px',
          pointerEvents: 'none'
        }
      })
    );
    const ag = filas.querySelector('.aguja');
    ag.style.marginLeft = '0';
    const cont = h('div', { style: { position: 'relative', marginLeft: '126px', marginRight: '32px', height: 0 } }, ag);
    ag.style.height = f.capas.length * 28 + 'px';
    const agregar = tipo =>
      ed('Agregar capa', fx => {
        const c =
          tipo === 'emisor'
            ? Object.assign({ tipo, nombre: 'Partículas ' + (fx.capas.length + 1), inicio: 0 }, CK.clone(CKFx.DEF))
            : tipo === 'luz'
              ? { tipo, nombre: 'Luz', inicio: 0, color: '#ffcc66', radio: [30, 30], fuerza: 0.5, parpadeo: 0 }
              : tipo === 'destello'
                ? { tipo, nombre: 'Destello', inicio: 0, fin: 0.1, color: '#ffffff', fuerza: 0.5 }
                : { tipo, nombre: 'Sacudida', inicio: 0, fin: 0.2, fuerza: 2 };
        fx.capas.push(c);
        st.capa = fx.capas.length - 1;
      });
    const regla = h('div.fx-regla', {
      style: {
        position: 'relative',
        marginLeft: '126px',
        marginRight: '32px',
        height: '18px',
        cursor: 'ew-resize',
        touchAction: 'none',
        background: 'var(--hueco)',
        borderRadius: '4px',
        marginBottom: '2px',
        overflow: 'hidden'
      }
    });
    const nMarcas = Math.min(40, Math.max(2, Math.round(f.dur * 10)));
    for (let i = 0; i <= nMarcas; i++)
      regla.append(
        h('span', {
          style: {
            position: 'absolute',
            left: (i / nMarcas) * 100 + '%',
            top: i % 5 ? '11px' : '5px',
            bottom: 0,
            width: '1px',
            background: 'var(--tenue)'
          }
        }),
        i % 5 === 0 && i < nMarcas
          ? h(
              'span',
              {
                style: {
                  position: 'absolute',
                  left: 'calc(' + (i / nMarcas) * 100 + '% + 3px)',
                  top: '1px',
                  fontSize: '9px',
                  color: 'var(--tenue)',
                  pointerEvents: 'none'
                }
              },
              ((i / nMarcas) * f.dur).toFixed(1)
            )
          : null
      );
    CK.tip(
      regla,
      'Recorrer el efecto',
      'Hacé clic o arrastrá sobre esta regla para ver cualquier momento del efecto. Queda en pausa donde lo sueltes.'
    );
    regla.addEventListener('pointerdown', e => {
      regla.setPointerCapture(e.pointerId);
      ponerPausa(true);
      const ir = ev => {
        const r = regla.getBoundingClientRect();
        irA(Math.round(CK.clamp((ev.clientX - r.left) / r.width, 0, 1) * f.dur * FPS) / FPS);
      };
      ir(e);
      const up = () => {
        regla.removeEventListener('pointermove', ir);
        regla.removeEventListener('pointerup', up);
      };
      regla.addEventListener('pointermove', ir);
      regla.addEventListener('pointerup', up);
    });
    const bPlay = CK.btn({
      ico: st.pausa ? 'play' : 'pausa',
      tip: 'Parar / seguir',
      desc: 'Detiene el efecto donde está o lo deja seguir.',
      tecla: 'Espacio',
      cls: 'chico' + (st.pausa ? ' activo' : ''),
      on: () => ponerPausa(!st.pausa)
    });
    bPlay.classList.add('fx-play');
    lineaT.append(
      h(
        'div.fila.junto',
        { style: { marginBottom: '6px', gap: '4px' } },
        CK.btn({
          ico: 'anterior',
          tip: 'Al principio',
          desc: 'Vuelve al primer cuadro y queda en pausa.',
          cls: 'chico plano',
          on: () => {
            ponerPausa(true);
            irA(0);
          }
        }),
        CK.btn({ ico: 'flechaD', tip: 'Cuadro anterior', tecla: ',', cls: 'chico plano', on: () => paso(-1) }),
        bPlay,
        CK.btn({ ico: 'flechaD', tip: 'Cuadro siguiente', tecla: '.', cls: 'chico plano', on: () => paso(1) }),
        CK.btn({
          ico: 'recargar',
          tip: 'Reiniciar y reproducir',
          tecla: 'R',
          cls: 'chico plano',
          on: () => {
            reiniciar();
            ponerPausa(false);
          }
        }),
        h(
          'span.fx-tiempo',
          { style: { fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: 'var(--suave)', marginLeft: '8px', minWidth: '170px' } },
          ''
        )
      )
    );
    lineaT.querySelector('.btn[data-tip], .btn') &&
      (() => {
        const bs = lineaT.querySelectorAll('.fila .btn');
        if (bs[1]) bs[1].firstChild.style.transform = 'scaleX(-1)';
      })();
    lineaT.append(
      h(
        'div.fila',
        { style: { marginBottom: '6px' } },
        h('b', 'Línea de tiempo'),
        h('span.nota-txt', 'cada barra es una capa: cuándo entra y cuándo sale'),
        h('span.crece'),
        ...Object.keys(TIPOS).map(t =>
          CK.btn({
            ico: TIPOS[t][1],
            txt: TIPOS[t][0],
            cls: 'chico',
            desc: {
              emisor: 'Agrega un emisor de partículas: fuego, chispas, humo, polvo, magia.',
              luz: 'Agrega un resplandor que ilumina alrededor.',
              destello: 'Un fogonazo que cubre la pantalla un instante: impactos, explosiones.',
              sacudida: 'Hace temblar la cámara: golpes fuertes.'
            }[t],
            on: () => {
              agregar(t);
              pintarTodo();
            }
          })
        )
      ),
      regla,
      cont,
      filas
    );
  };
  const pintarDer = () => {
    if (!der) return;
    CK.vaciar(der);
    const f = FX();
    if (!f) {
      der.append(
        CK.vacio(
          'fx',
          'Ningún efecto abierto',
          'Elegí una plantilla de la izquierda (fuego, golpe, curación, bola de fuego…) y ajustala a tu gusto.'
        )
      );
      return;
    }
    der.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Efecto'),
        CK.campo(
          'Nombre',
          CK.txt(f.nombre, v => {
            ed('Nombre', x => {
              x.nombre = v || x.nombre;
            });
            pintarIzq();
          })
        ),
        rg(
          'Duración (s)',
          () => f.dur,
          v => {
            f.dur = v;
          },
          0.1,
          6,
          0.05,
          'Cuánto dura una pasada del efecto.'
        ),
        CK.chk(
          f.bucle,
          'Se repite (ambiente)',
          v => {
            ed('Loop', x => {
              x.bucle = v;
            });
            reiniciar();
          },
          'Encendido: fuego, lluvia, auras. Apagado: golpes, explosiones, hechizos que ocurren una vez.'
        ),
        h(
          'div.duo',
          h(
            'label',
            h('span.mini-rot', 'Se mueve → (px/s)'),
            CK.num((f.mov || {}).vx || 0, { step: 10 }, v => {
              ed('Movimiento', x => {
                x.mov = x.mov || {};
                x.mov.vx = v;
              });
              reiniciar();
            })
          ),
          h(
            'label',
            h('span.mini-rot', 'Se mueve ↓ (px/s)'),
            CK.num((f.mov || {}).vy || 0, { step: 10 }, v => {
              ed('Movimiento', x => {
                x.mov = x.mov || {};
                x.mov.vy = v;
              });
              reiniciar();
            })
          )
        ),
        h('p.nota-txt', 'Con movimiento, el efecto viaja como un proyectil (bola de fuego, flecha mágica) y deja su estela.'),
        (() => {
          if (!CK.audioJuego && CK.fs.dir('juego')) CK.leerAudioJuego().then(pintarDer);
          const l = (CK.audioJuego || {}).sfx || [];
          return h(
            'div.fila.junto',
            CK.campo(
              'Sonido',
              CK.sel(f.sonido || '', [['', '(sin sonido)']].concat(l.includes(f.sonido) || !f.sonido ? l : [f.sonido].concat(l)), v => {
                ed('Sonido', x => {
                  x.sonido = v;
                });
                pintarDer();
              }),
              l.length
                ? 'Un sonido del juego (assets/audio/sfx) que suena cuando arranca el efecto.'
                : 'Conectá la carpeta del juego para elegir entre sus sonidos.'
            ),
            f.sonido
              ? CK.btn({
                  ico: 'sonido',
                  tip: 'Escuchar',
                  cls: 'chico',
                  on: () => CK.sonar('assets/audio/sfx/' + f.sonido + '.mp3', f.volumen === undefined ? 0.7 : f.volumen)
                })
              : null
          );
        })(),
        f.sonido
          ? rg(
              'Volumen',
              () => (f.volumen === undefined ? 0.7 : f.volumen),
              v => {
                f.volumen = v;
              },
              0.05,
              1,
              0.05
            )
          : null,
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'paleta',
            txt: 'Colores a la paleta',
            cls: 'chico',
            desc: 'Cambia todos los colores del efecto por los más cercanos de la paleta del proyecto.',
            on: () => {
              aPaleta();
              pintarDer();
            }
          }),
          CK.btn({
            ico: 'duplicar',
            txt: 'Duplicar',
            cls: 'chico',
            on: () => {
              const n = CK.clone(f);
              n.id = f.id + '_copia_' + Date.now().toString(36).slice(-3);
              n.nombre = f.nombre + ' (copia)';
              CK.P.fx[n.id] = n;
              CK.tocar();
              st.id = n.id;
              reiniciar();
              pintarTodo();
            }
          }),
          CK.btn({
            ico: 'basura',
            txt: 'Borrar',
            cls: 'chico peligro',
            on: async () => {
              if (await CK.confirmar('Borrar efecto', 'Se borra "' + f.nombre + '".', 'Borrar')) {
                const fin = CK.hist.datos('Borrar efecto', 'fx', f.id);
                delete CK.P.fx[f.id];
                fin();
                st.id = Object.keys(CK.P.fx)[0] || null;
                reiniciar();
                pintarTodo();
              }
            }
          })
        )
      )
    );
    // contorno de las partículas (todo el efecto)
    const oc = f.contorno,
      ocOn = !!(oc && oc.grosor > 0);
    der.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Contorno'),
        CK.chk(
          ocOn,
          'Las partículas llevan contorno',
          v => {
            ed('Contorno', x => {
              if (v)
                x.contorno = Object.assign(
                  { grosor: 1, color: CK.P.estilo.colorContorno || '#1b1420', forma: 'redondo' },
                  x.contorno || {},
                  { grosor: (x.contorno && x.contorno.grosor) || 1 }
                );
              else delete x.contorno;
            });
            pintarDer();
          },
          'Un borde alrededor de la forma de las partículas, como el contorno de los sprites. Se ve igual en el juego.'
        ),
        ocOn
          ? h(
              'div',
              rg(
                'Grosor (px)',
                () => f.contorno.grosor,
                v => {
                  f.contorno.grosor = v;
                },
                1,
                8,
                1,
                'Cuántos píxeles de borde.'
              ),
              CK.campo(
                'Color',
                h(
                  'div.fila.junto',
                  CK.color(f.contorno.color, v =>
                    ed(
                      'Color del contorno',
                      x => {
                        x.contorno.color = v;
                      },
                      false
                    )
                  ),
                  CK.muestras(() => CK.P.estilo.paleta.slice(0, 12), {
                    chicas: true,
                    actual: () => f.contorno.color,
                    alElegir: hex => {
                      ed('Color del contorno', x => {
                        x.contorno.color = hex;
                      });
                      pintarDer();
                    }
                  })
                )
              ),
              CK.campo(
                'Esquinas',
                CK.sel(
                  f.contorno.forma || 'redondo',
                  [
                    ['redondo', 'Redondeadas'],
                    ['cuadrado', 'Cuadradas']
                  ],
                  v =>
                    ed('Forma del contorno', x => {
                      x.contorno.forma = v;
                    })
                ),
                'Redondeadas: el borde sigue la forma suave. Cuadradas: más duro, tipo pixel art clásico.'
              ),
              rg(
                'Opacidad',
                () => (f.contorno.alfa === undefined ? 1 : f.contorno.alfa),
                v => {
                  f.contorno.alfa = v;
                },
                0.1,
                1,
                0.05
              ),
              h('p.nota-txt', 'Cada capa de partículas puede usar este contorno, uno propio o ninguno (más abajo, en la capa).')
            )
          : null
      )
    );
    const c = f.capas[st.capa];
    if (!c) return;
    const cab = h(
      'div.bloque',
      h(
        'h3.bloque-tit',
        { html: CK.ico(TIPOS[c.tipo][1], 16) },
        'Capa: ' + TIPOS[c.tipo][0],
        CK.btn({
          ico: 'duplicar',
          tip: 'Duplicar capa',
          cls: 'chico',
          on: () => {
            ed('Duplicar capa', x => {
              x.capas.splice(st.capa + 1, 0, CK.clone(c));
              st.capa++;
            });
            pintarTodo();
          }
        }),
        CK.btn({
          ico: 'basura',
          tip: 'Borrar capa',
          cls: 'chico peligro',
          on: () => {
            ed('Borrar capa', x => {
              x.capas.splice(st.capa, 1);
              st.capa = Math.max(0, st.capa - 1);
            });
            pintarTodo();
          }
        })
      ),
      CK.campo(
        'Nombre',
        CK.txt(c.nombre || '', v => {
          ed('Nombre de capa', () => {
            c.nombre = v;
          });
          pintarLinea();
        })
      ),
      h(
        'div.duo',
        h(
          'label',
          h('span.mini-rot', 'Entra (s)'),
          CK.num(c.inicio || 0, { min: 0, max: f.dur, step: 0.05 }, v => {
            ed('Tiempos', () => {
              c.inicio = v;
            });
            pintarLinea();
          })
        ),
        h(
          'label',
          h('span.mini-rot', 'Sale (s)'),
          CK.num(c.fin === undefined || c.fin === null ? f.dur : c.fin, { min: 0, max: f.dur, step: 0.05 }, v => {
            ed('Tiempos', () => {
              c.fin = v;
            });
            pintarLinea();
          })
        )
      )
    );
    der.append(cab);
    if (c.tipo === 'emisor') {
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'De dónde salen'),
          CK.campo(
            'Forma',
            CK.sel(
              c.forma,
              [
                ['punto', 'Un punto'],
                ['linea', 'Una línea'],
                ['circulo', 'Un círculo'],
                ['anillo', 'Un anillo'],
                ['area', 'Un área']
              ],
              v => {
                ed('Forma', () => {
                  c.forma = v;
                });
                pintarDer();
              }
            ),
            'La zona donde nacen las partículas.'
          ),
          c.forma !== 'punto'
            ? rg(
                'Ancho',
                () => c.ancho,
                v => {
                  c.ancho = v;
                },
                0,
                240,
                1
              )
            : null,
          ['circulo', 'anillo', 'area'].includes(c.forma)
            ? rg(
                'Alto',
                () => c.alto,
                v => {
                  c.alto = v;
                },
                0,
                160,
                1,
                'En círculo y anillo, un alto menor al ancho da un óvalo acostado (visto desde arriba).'
              )
            : null,
          h(
            'div.duo',
            h(
              'label',
              h('span.mini-rot', 'Corrida →'),
              CK.num(c.x || 0, {}, v =>
                ed('Posición', () => {
                  c.x = v;
                })
              )
            ),
            h(
              'label',
              h('span.mini-rot', 'Corrida ↓'),
              CK.num(c.y || 0, {}, v =>
                ed('Posición', () => {
                  c.y = v;
                })
              )
            )
          ),
          rg(
            'Por segundo',
            () => c.tasa,
            v => {
              c.tasa = v;
            },
            0,
            200,
            1,
            'Cuántas partículas nacen por segundo mientras la capa está activa.'
          ),
          rg(
            'De golpe',
            () => c.rafaga || 0,
            v => {
              c.rafaga = v;
            },
            0,
            80,
            1,
            'Partículas que salen todas juntas al empezar. Para golpes y explosiones.'
          )
        )
      );
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Cómo se mueven'),
          par('Vida (s)', () => c.vida, 0.05, 5, 0.05, 'Cuánto dura cada partícula. Se elige al azar entre los dos valores.'),
          par('Velocidad', () => c.vel, 0, 300, 1, 'Rapidez inicial, al azar entre los dos valores.'),
          rg(
            'Dirección °',
            () => c.angulo,
            v => {
              c.angulo = v;
            },
            -180,
            180,
            5,
            '0 = derecha, −90 = arriba, 90 = abajo, 180 = izquierda.'
          ),
          rg(
            'Abanico °',
            () => c.apertura,
            v => {
              c.apertura = v;
            },
            0,
            360,
            5,
            'Cuánto se abren alrededor de la dirección. 360 = para todos lados.'
          ),
          rg(
            'Gravedad ↓',
            () => c.gravY,
            v => {
              c.gravY = v;
            },
            -400,
            400,
            10,
            'Positiva: caen. Negativa: flotan hacia arriba.'
          ),
          rg(
            'Viento →',
            () => c.gravX,
            v => {
              c.gravX = v;
            },
            -300,
            300,
            10
          ),
          rg(
            'Freno',
            () => c.freno || 0,
            v => {
              c.freno = v;
            },
            0,
            10,
            0.5,
            'Cuánto se frenan con el tiempo. Alto: salen rápido y quedan flotando.'
          ),
          rg(
            'Vaivén',
            () => c.onda || 0,
            v => {
              c.onda = v;
            },
            0,
            40,
            1,
            'Se mecen de lado a lado: humo, nieve, chispas que suben.'
          )
        )
      );
      const cols = CK.muestras(() => c.colores, {
        alElegir: (hex, e, i) => {
          if (c.colores.length > 1) {
            ed('Quitar color', () => {
              c.colores.splice(i, 1);
            });
            cols.refrescar();
          }
        },
        pista: 'Clic para quitarlo. Las partículas pasan por estos colores, de izquierda a derecha, a lo largo de su vida.'
      });
      const palE = CK.muestras(() => CK.P.estilo.paleta, {
        chicas: true,
        alElegir: hex => {
          ed('Agregar color', () => {
            c.colores.push(hex);
          });
          cols.refrescar();
        },
        pista: 'Clic para agregarlo al final.'
      });
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Cómo se ven'),
          CK.campo(
            'Figura',
            h(
              'div.fila.junto',
              CK.sel(
                c.figura,
                [
                  ['pixel', 'Cuadrado'],
                  ['circulo', 'Círculo'],
                  ['rombo', 'Rombo'],
                  ['anillo', 'Anillo (aro)'],
                  ['chispa', 'Chispa (raya corta)'],
                  ['linea', 'Línea (raya larga)'],
                  ['cruz', 'Cruz'],
                  ['estrella', 'Estrella'],
                  ['gota', 'Gota'],
                  ['brillo', 'Brillo difuso'],
                  ['humo', 'Nube suave'],
                  ['asset', 'Un asset…']
                ],
                async v => {
                  if (v === 'asset') {
                    const id = await CK.elegirAsset('Dibujo de la partícula', ['sprite', 'hoja', 'fx', 'ui']);
                    if (!id) {
                      pintarDer();
                      return;
                    }
                    ed('Figura', () => {
                      c.figura = 'asset';
                      c.asset = id;
                    });
                  } else
                    ed('Figura', () => {
                      c.figura = v;
                    });
                  pintarDer();
                }
              ),
              c.figura === 'asset' && CK.P.assets[c.asset] ? CK.mini(CK.img[c.asset], 24) : null
            )
          ),
          c.figura === 'asset'
            ? CK.chk(!!c.animar, 'Recorrer sus cuadros a lo largo de la vida', v =>
                ed('Animar', () => {
                  c.animar = v;
                })
              )
            : null,
          par('Tamaño (px)', () => c.tam, 1, 24, 1, 'Tamaño al nacer y al morir.', 'al nacer', 'al morir'),
          par('Opacidad', () => c.alfa, 0, 1, 0.05, 'Opacidad al nacer y al morir.', 'al nacer', 'al morir'),
          h('span.campo-rot', 'Colores a lo largo de su vida'),
          h('div', { style: { margin: '4px 0 8px' } }, cols),
          h('span.mini-rot', 'Agregar de la paleta'),
          palE,
          CK.campo(
            'Mezcla',
            CK.sel(
              c.mezcla,
              [
                ['normal', 'Normal'],
                ['luz', 'Luz (suma brillo)']
              ],
              v =>
                ed('Mezcla', () => {
                  c.mezcla = v;
                })
            ),
            'Luz: las partículas se suman y brillan donde se juntan. Para fuego y magia.'
          ),
          rg(
            'Giro',
            () => c.giro || 0,
            v => {
              c.giro = v;
            },
            -12,
            12,
            0.5,
            'Solo para partículas que son un asset.'
          )
        )
      );
      const cc = c.contorno,
        modo = cc === false ? 'no' : cc && typeof cc === 'object' ? 'propio' : 'efecto';
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Contorno de esta capa'),
          CK.campo(
            'Usa',
            CK.sel(
              modo,
              [
                ['efecto', ocOn ? 'El del efecto (' + f.contorno.grosor + ' px)' : 'El del efecto (ahora sin contorno)'],
                ['no', 'Sin contorno'],
                ['propio', 'Uno propio']
              ],
              v => {
                ed('Contorno de capa', () => {
                  if (v === 'efecto') delete c.contorno;
                  else if (v === 'no') c.contorno = false;
                  else
                    c.contorno = Object.assign({
                      grosor: 1,
                      color: (f.contorno && f.contorno.color) || CK.P.estilo.colorContorno || '#1b1420',
                      forma: 'redondo'
                    });
                });
                pintarDer();
              }
            ),
            'Por ejemplo: llamas con contorno y chispas sin contorno.'
          ),
          modo === 'propio'
            ? h(
                'div',
                rg(
                  'Grosor (px)',
                  () => c.contorno.grosor,
                  v => {
                    c.contorno.grosor = v;
                  },
                  1,
                  8,
                  1
                ),
                CK.campo(
                  'Color',
                  CK.color(c.contorno.color, v =>
                    ed(
                      'Color del contorno',
                      () => {
                        c.contorno.color = v;
                      },
                      false
                    )
                  )
                ),
                CK.campo(
                  'Esquinas',
                  CK.sel(
                    c.contorno.forma || 'redondo',
                    [
                      ['redondo', 'Redondeadas'],
                      ['cuadrado', 'Cuadradas']
                    ],
                    v =>
                      ed('Forma del contorno', () => {
                        c.contorno.forma = v;
                      })
                  )
                )
              )
            : null
        )
      );
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Suavizado y curvas'),
          CK.chk(
            !!c.suavizado,
            'Bordes suaves (sin pixelar)',
            v => {
              ed('Suavizado', () => {
                c.suavizado = v;
              });
            },
            'Encendido: las partículas se dibujan con bordes suaves y se mueven sin saltar de píxel en píxel. Queda más fluido, tipo efecto moderno. Apagado: pixel art duro.'
          ),
          CK.chk(
            !!c.colorSuave,
            'Colores que se funden',
            v => {
              ed('Color suave', () => {
                c.colorSuave = v;
              });
            },
            'Encendido: pasa de un color al siguiente mezclándolos. Apagado: salta de un color a otro, como en pixel art.'
          ),
          curvaSel(
            'Curva del tamaño',
            () => c.curvaTam,
            v => {
              c.curvaTam = v;
            },
            'Cómo pasa del tamaño "al nacer" al tamaño "al morir". "Frena al final" hace que crezca rápido y se asiente; "Sube y vuelve" lo hace inflarse y desinflarse.'
          ),
          curvaSel(
            'Curva de la opacidad',
            () => c.curvaAlfa,
            v => {
              c.curvaAlfa = v;
            },
            'Cómo se desvanece. "Cambia casi al final" lo mantiene visible y lo apaga de golpe; "Sube y vuelve" lo hace aparecer y desaparecer.'
          ),
          curvaSel(
            'Curva del color',
            () => c.curvaColor,
            v => {
              c.curvaColor = v;
            },
            'A qué ritmo recorre la lista de colores.'
          ),
          rg(
            'Aparece de a poco',
            () => c.aparece || 0,
            v => {
              c.aparece = v;
            },
            0,
            0.6,
            0.05,
            'Parte de su vida en la que va apareciendo desde transparente. Evita que las partículas "salten" a la vista: 0.15 o 0.2 ya se nota.'
          ),
          rg(
            'Estela',
            () => c.estela || 0,
            v => {
              c.estela = v;
            },
            0,
            10,
            1,
            'Cada partícula deja un rastro que se apaga detrás: cometas, magia, chispas rápidas.'
          ),
          rg(
            'Estirar con la velocidad',
            () => c.estirar || 0,
            v => {
              c.estirar = v;
            },
            0,
            3,
            0.25,
            'Las rayas (y los círculos con bordes suaves) se alargan cuanto más rápido van. Da sensación de velocidad.'
          ),
          rg(
            'Tamaños distintos',
            () => c.tamAzar || 0,
            v => {
              c.tamAzar = v;
            },
            0,
            0.9,
            0.05,
            'Cuánto varía el tamaño de una partícula a otra. Con 0 son todas iguales.'
          )
        )
      );
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Movimiento avanzado'),
          CK.chk(
            !!c.radial,
            'Salen hacia afuera',
            v => {
              ed('Radial', () => {
                c.radial = v;
              });
            },
            'En vez de ir todas en la Dirección, cada una se aleja del centro del emisor. Con forma Círculo o Anillo da ondas, explosiones y tajos.'
          ),
          CK.campo(
            'Ritmo de salida',
            CK.sel(
              c.ritmo || 'constante',
              [
                ['constante', 'Parejo'],
                ['crece', 'De menos a más'],
                ['decrece', 'De más a menos'],
                ['pico', 'Sube y baja'],
                ['pulso', 'A pulsos']
              ],
              v =>
                ed('Ritmo', () => {
                  c.ritmo = v;
                })
            ),
            'Cómo cambia la cantidad de partículas mientras la capa está activa.'
          ),
          rg(
            'Turbulencia',
            () => c.turbulencia || 0,
            v => {
              c.turbulencia = v;
            },
            0,
            80,
            1,
            'Empujones al azar: humo que se retuerce, llamas inquietas, rayos.'
          ),
          rg(
            'Órbita (°/s)',
            () => c.orbita || 0,
            v => {
              c.orbita = v;
            },
            -720,
            720,
            10,
            'Las partículas giran alrededor del centro del emisor. Positivo: sentido horario. Para portales, remolinos y auras.'
          ),
          rg(
            'Atracción al centro',
            () => c.atraccion || 0,
            v => {
              c.atraccion = v;
            },
            -200,
            200,
            5,
            'Positiva: las chupa hacia el centro. Negativa: las empuja hacia afuera.'
          ),
          rg(
            'Rebote',
            () => c.rebote || 0,
            v => {
              c.rebote = v;
            },
            0,
            0.9,
            0.05,
            'Con más de 0, las partículas rebotan contra un piso. Para escombros, monedas y esquirlas.'
          ),
          (c.rebote || 0) > 0
            ? rg(
                'Altura del piso (px)',
                () => (c.suelo === undefined ? 40 : c.suelo),
                v => {
                  c.suelo = v;
                },
                0,
                120,
                1,
                'A cuántos píxeles por debajo del emisor está el piso donde rebotan.'
              )
            : null
        )
      );
    } else if (c.tipo === 'luz') {
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Luz'),
          curvaSel(
            'Curva',
            () => c.curva,
            v => {
              c.curva = v;
            },
            'Cómo cambia el radio (y el apagado) entre que entra y sale.'
          ),
          CK.campo(
            'Color',
            CK.color(c.color, v =>
              ed(
                'Color',
                () => {
                  c.color = v;
                },
                false
              )
            )
          ),
          par('Radio (px)', () => c.radio, 2, 200, 1, 'Radio al entrar y al salir.', 'al entrar', 'al salir'),
          rg(
            'Intensidad',
            () => c.fuerza,
            v => {
              c.fuerza = v;
            },
            0.05,
            1,
            0.05
          ),
          rg(
            'Parpadeo',
            () => c.parpadeo || 0,
            v => {
              c.parpadeo = v;
            },
            0,
            5,
            0.5
          ),
          CK.chk(!!c.apagar, 'Se apaga de a poco', v =>
            ed('Apagar', () => {
              c.apagar = v;
            })
          ),
          h(
            'div.duo',
            h(
              'label',
              h('span.mini-rot', 'Corrida →'),
              CK.num(c.x || 0, {}, v =>
                ed('Posición', () => {
                  c.x = v;
                })
              )
            ),
            h(
              'label',
              h('span.mini-rot', 'Corrida ↓'),
              CK.num(c.y || 0, {}, v =>
                ed('Posición', () => {
                  c.y = v;
                })
              )
            )
          )
        )
      );
    } else if (c.tipo === 'destello')
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Destello'),
          CK.campo(
            'Color',
            CK.color(c.color, v =>
              ed(
                'Color',
                () => {
                  c.color = v;
                },
                false
              )
            )
          ),
          rg(
            'Intensidad',
            () => c.fuerza,
            v => {
              c.fuerza = v;
            },
            0.05,
            1,
            0.05
          ),
          h('p.nota-txt', 'Cubre toda la pantalla y se desvanece entre "Entra" y "Sale". Usalo corto (0,05 a 0,15 s).')
        )
      );
    else
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Sacudida'),
          rg(
            'Fuerza (px)',
            () => c.fuerza,
            v => {
              c.fuerza = v;
            },
            1,
            10,
            1
          ),
          h('p.nota-txt', 'Mueve la cámara al azar y se calma hacia el final. Con 2 o 3 píxeles alcanza para un golpe.')
        )
      );
  };
  const pintarTodo = () => {
    pintarIzq();
    pintarLinea();
    pintarDer();
    if (sim && FX()) sim.e = FX();
  };

  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '250px 1fr 330px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    der = h('aside.panel');
    cv = h('canvas', { style: { imageRendering: 'pixelated', borderRadius: '8px', border: '1px solid var(--linea)' } });
    lineaT = h('div', {
      style: {
        padding: '10px 12px',
        background: 'var(--panel)',
        borderTop: '1px solid var(--linea)',
        maxHeight: '250px',
        overflowY: 'auto'
      }
    });
    const bPausa = CK.btn({ ico: 'pausa', tip: 'Parar / seguir', tecla: 'Espacio', cls: 'chico plano', on: () => ponerPausa(!st.pausa) });
    bPausa.classList.add('fx-play');
    const fondoSel = CK.sel(
      st.fondo,
      [
        ['oscuro', 'Fondo oscuro'],
        ['noche', 'Noche'],
        ['pasto', 'Pasto'],
        ['piedra', 'Piedra'],
        ['claro', 'Claro'],
        ['mapa', 'Un mapa…']
      ],
      async v => {
        st.fondo = v;
        if (v === 'mapa') {
          const ms = Object.values(CK.P.mapas);
          if (!ms.length) {
            CK.aviso('Todavía no hay mapas en el proyecto.', 'info');
            st.fondo = 'oscuro';
            fondoSel.value = 'oscuro';
            return;
          }
          st.mapaFondo = ms.find(m => m.id === (CK.P.ui.mapa || '')) ? CK.P.ui.mapa : ms[0].id;
          fondoDe = null;
        }
      }
    );
    fondoSel.style.width = '130px';
    const centro = h(
      'div',
      { style: { display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } },
      h(
        'div',
        { style: { position: 'relative', display: 'grid', placeItems: 'center', minHeight: 0, overflow: 'hidden' } },
        cv,
        h(
          'div.sobre',
          h(
            'div.tira',
            bPausa,
            CK.btn({
              ico: 'recargar',
              tip: 'Reiniciar',
              desc: 'Vuelve a empezar el efecto desde cero.',
              tecla: 'R',
              cls: 'chico plano',
              on: reiniciar
            }),
            h('span.sep'),
            fondoSel,
            (() => {
              const b = CK.btn({
                ico: 'pixel',
                tip: 'Pixelado y en paleta',
                desc: 'Muestra las partículas con bordes duros y solo con colores de la paleta, como se verían dentro del juego. Las luces siguen suaves.',
                cls: 'chico plano activo',
                on: () => {
                  st.pixelado = !st.pixelado;
                  b.classList.toggle('activo', st.pixelado);
                }
              });
              return b;
            })()
          ),
          h(
            'div.tira',
            CK.btn({
              ico: 'hoja',
              txt: 'Hornear a hoja',
              cls: 'chico',
              desc: 'Convierte el efecto en una hoja de sprites (cuadros fijos). Sirve en cualquier motor y se puede colocar en el mapa como un objeto animado. Las luces no se hornean.',
              on: hornearYGuardar
            }),
            CK.btn({
              ico: 'play',
              txt: 'GIF',
              cls: 'chico',
              desc: 'Descarga el efecto como GIF para revisarlo o mostrarlo.',
              on: () => {
                const f = FX();
                if (!f) return;
                const r = hornear(f, 15);
                CK.descargar(new Blob([CKGif(r.frames, { fps: 15, escala: 3 })], { type: 'image/gif' }), f.id + '.gif');
              }
            })
          )
        )
      ),
      lineaT
    );
    el.append(izq, centro, der);
    // modos del mouse sobre la vista
    const MODOS = [
      [
        'pivot',
        'centrar',
        'Pivot',
        'Arrastrá en la vista para mover el pivot: el punto de origen del efecto, el que queda donde lo ponés en el mapa. Es solo dónde se muestra acá; no cambia el efecto.'
      ],
      [
        'capa',
        'mover',
        'Mover capa',
        'Arrastrá para correr la capa elegida (partículas o luz) respecto del pivot. Así separás, por ejemplo, el humo de la llama.'
      ],
      [
        'viaje',
        'rayo',
        'Dirección del efecto',
        'Arrastrá desde el pivot: la flecha celeste marca hacia dónde viaja todo el efecto y qué tan rápido (más larga, más rápido). Soltar encima del pivot lo deja quieto.'
      ],
      [
        'angulo',
        'flechaD',
        'Dirección de las partículas',
        'Arrastrá para apuntar hacia dónde salen las partículas de la capa elegida. Con Mayús salta de a 15°.'
      ]
    ];
    const tiraModos = h('div.tira'),
      pintarModos = () => {
        CK.vaciar(tiraModos);
        tiraModos.append(
          h('span.txt', 'El mouse'),
          ...MODOS.map(([id, ico, tip, desc]) =>
            CK.btn({
              ico,
              tip,
              desc,
              cls: 'chico plano' + (st.modo === id ? ' activo' : ''),
              on: () => {
                st.modo = id;
                pintarModos();
              }
            })
          ),
          h('span.sep'),
          CK.btn({
            ico: 'recargar',
            tip: 'Pivot al centro',
            desc: 'Vuelve a poner el pivot en su lugar automático.',
            cls: 'chico plano',
            on: () => {
              if (FX() && FX().vista)
                ed('Pivot al centro', x => {
                  delete x.vista;
                });
            }
          }),
          CK.btn({
            ico: st.sinGuias ? 'ojoNo' : 'ojo',
            tip: 'Ver guías',
            desc: 'Muestra u oculta el pivot y las flechas sobre la vista.',
            cls: 'chico plano' + (st.sinGuias ? '' : ' activo'),
            on: () => {
              st.sinGuias = !st.sinGuias;
              pintarModos();
            }
          })
        );
      };
    pintarModos();
    cv.parentElement.append(h('div.sobre.abajo', tiraModos));
    cv.style.cursor = CK.cur('crosshair');
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', alArrastrar);
    CK.on('datos', g => {
      if (g === 'fx') {
        if (!FX()) st.id = Object.keys(CK.P.fx)[0] || null;
        reiniciar();
        if (CK.seccionVisible('fx')) pintarTodo();
      }
    });
  };
  const hornearYGuardar = async () => {
    const f = FX();
    if (!f) return;
    const r = hornear(f, 12);
    if (!r.frames.length) {
      CK.aviso('El efecto no dibuja partículas (¿solo tiene luces?).', 'info');
      return;
    }
    const ya = Object.values(CK.P.assets).find(a => a.fxDe === f.id),
      lienzo = CK.aLienzo(PIX.pack(r.frames, r.frames.length)),
      cuadros = { fw: r.fw, fh: r.fh, fps: r.fps, bucle: !!f.bucle, ancla: r.ancla };
    if (ya) {
      const fin = CK.hist.imagen('Hornear efecto', ya.id);
      CK.asset.poner(ya.id, lienzo);
      ya.cuadros = cuadros;
      fin();
      CK.aviso('Hoja actualizada: ' + ya.nombre + ' (' + r.frames.length + ' cuadros)');
    } else {
      const a = CK.asset.crear({ nombre: 'fx_' + f.id, tipo: 'fx', lienzo, cuadros, origen: 'efecto ' + f.nombre, extra: { fxDe: f.id } });
      CK.aviso(
        'Hoja creada: ' +
          a.nombre +
          ' (' +
          r.frames.length +
          ' cuadros de ' +
          r.fw +
          ' × ' +
          r.fh +
          '). Está en Animaciones y en Assets del mapa.',
        'ok',
        5500
      );
    }
  };
  /** Completa lo que le falte a un efecto que no nació acá (importado, escrito a mano o por Claude). */
  const completar = () =>
    Object.values(CK.P.fx).forEach(f => {
      f.capas = f.capas || [];
      if (!f.dur) f.dur = 1;
      f.capas.forEach(c => {
        if (c.tipo === 'emisor')
          Object.keys(CKFx.DEF).forEach(k => {
            if (c[k] === undefined) c[k] = CK.clone(CKFx.DEF[k]);
          });
        if (c.tipo === 'luz') {
          if (!Array.isArray(c.radio)) c.radio = [c.radio || 30, c.radio || 30];
          if (c.fuerza === undefined) c.fuerza = 0.5;
          if (!c.color) c.color = '#ffc46b';
        }
      });
    });
  const mostrar = arg => {
    if (!CK.P) return;
    completar();
    if (arg && CK.P.fx[arg]) {
      st.id = arg;
      st.capa = 0;
    }
    if (!FX()) st.id = Object.keys(CK.P.fx)[0] || null;
    reiniciar();
    pintarTodo();
    if (!vivo) {
      vivo = true;
      lazo.u = 0;
      CK.raf(lazo);
    }
  };
  const tecla = (e, k) => {
    if (k === 'r') {
      reiniciar();
      ponerPausa(false);
      return true;
    }
    if (k === ' ') {
      ponerPausa(!st.pausa);
      return true;
    }
    if (k === ',' || k === '.') {
      paso(k === '.' ? 1 : -1);
      return true;
    }
    return false;
  };
  CK.registrar({
    id: 'fx',
    nombre: 'Efectos',
    corto: 'FX',
    ico: 'fx',
    desc: 'Poderes, fuego, golpes, luces y clima: partículas editables con vista previa, exportables como datos o como hoja de sprites.',
    crear,
    mostrar,
    tecla,
    ocultar: () => {
      vivo = false;
    },
    alCambiarProyecto: () => {
      st.id = null;
      sim = null;
    }
  });
})();
