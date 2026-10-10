/* ANIMAR · efectos superpuestos para probar con la animación, y hornearlos juntos. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  // ---------------------------------------------------------------- efectos superpuestos (solo para probar)
  An.fxLista = () => {
    const a = An.hojaA();
    if (a) return (a.fxPrueba = a.fxPrueba || []);
    return An.st.fxGen;
  };
  const recurso = id => {
    const a = CK.P.assets[id];
    return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null;
  };
  const defFx = e => (e.tipo === 'plantilla' ? CKFx.plantillas[e.id] : e.tipo === 'fx' ? CK.P.fx[e.id] : null);
  An.nombreFx = e =>
    e.tipo === 'hoja'
      ? (CK.P.assets[e.id] || {}).nombre || e.id
      : ((defFx(e) || {}).nombre || e.id) + (e.tipo === 'plantilla' ? ' (plantilla)' : '');
  const vivosFx = new Map(); // entrada -> { sim, t }
  const vivoDe = e => {
    let v = vivosFx.get(e);
    const d = defFx(e),
      firma = JSON.stringify(d || e.id);
    if (!v || v.firma !== firma) {
      v = {
        firma,
        sim: d ? CKFx.crear(CK.clone(Object.assign({}, d, { bucle: !!d.bucle })), { semilla: 7 }) : null,
        t: 0,
        corre: !!(d && d.bucle)
      };
      vivosFx.set(e, v);
    }
    return v;
  };
  An.reiniciarFx = () => vivosFx.clear();
  An.pasoFx = (dt, i, cambio) => {
    if (!An.st.verFx) return;
    const l = An.fxLista();
    if (!l.length) return;
    l.forEach(e => {
      if (e.oculto) return;
      const v = vivoDe(e),
        d = defFx(e),
        arranca = cambio && i === (e.desde || 0);
      if (e.tipo === 'hoja') {
        if (arranca && e.repetir !== false) v.t = 0;
        if (An.rep.play) v.t += dt;
        return;
      }
      if (!v.sim) return;
      if (d && d.bucle) {
        if (An.rep.play) v.sim.paso(dt);
        return;
      }
      if (arranca) {
        v.sim.reiniciar();
        v.corre = true;
      }
      if (v.corre && An.rep.play) {
        v.sim.paso(dt);
        if (v.sim.fin) {
          v.corre = false;
          if (e.repetir === false) return;
        }
      }
    });
  };
  An.fxActivos = () => An.st.verFx && An.fxLista().some(e => !e.oculto);
  An.dibujarFx = (x, detras) => {
    if (!An.st.verFx) return;
    An.fxLista().forEach((e, k) => {
      if (e.oculto || !!e.detras !== detras) return;
      const v = vivoDe(e),
        esc = e.escala || 1;
      x.save();
      x.translate(e.x || 0, e.y || 0);
      x.scale(esc, esc);
      if (e.tipo === 'hoja') {
        const a = CK.P.assets[e.id];
        if (a && CK.img[a.id]) {
          const n = CK.asset.nCuadros(a),
            fps = (a.cuadros || {}).fps || 8;
          let j = Math.floor(v.t * fps);
          if (a.cuadros && a.cuadros.bucle === false && !e.repetir) j = Math.min(n - 1, j);
          const g = CK.asset.cuadro(a, j % n),
            an = (a.cuadros || {}).ancla || { x: g.w / 2, y: g.h / 2 };
          x.drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, -an.x, -an.y, g.w, g.h);
        }
      } else if (v.sim && (v.corre || (defFx(e) || {}).bucle)) v.sim.dibujar(x, 0, 0, recurso);
      x.restore();
      if (k === An.st.fxSel && An.st.moverFx) {
        x.save();
        const z = An.vista.z;
        x.lineWidth = 1 / z;
        x.strokeStyle = '#000';
        x.beginPath();
        x.arc(e.x || 0, e.y || 0, 5 / z, 0, 7);
        x.stroke();
        x.strokeStyle = '#58d0ff';
        x.beginPath();
        x.arc(e.x || 0, e.y || 0, 4 / z, 0, 7);
        x.moveTo((e.x || 0) - 9 / z, e.y || 0);
        x.lineTo((e.x || 0) + 9 / z, e.y || 0);
        x.moveTo(e.x || 0, (e.y || 0) - 9 / z);
        x.lineTo(e.x || 0, (e.y || 0) + 9 / z);
        x.stroke();
        x.restore();
      }
    });
  };
  An.cambiarFx = (nombre, fn) => {
    const a = An.hojaA();
    if (a) {
      const f = CK.hist.datos(nombre, 'assets', a.id);
      fn(An.fxLista());
      f();
    } else fn(An.fxLista());
    An.reiniciarFx();
    if (An.vista) An.vista.pedir();
  };
  An.agregarFx = async () => {
    const ops = [];
    Object.values(CK.P.fx).forEach(f => ops.push({ tipo: 'fx', id: f.id, n: f.nombre, sub: 'del proyecto' }));
    Object.values(CK.P.assets)
      .filter(a => a.tipo === 'fx' && a.cuadros)
      .forEach(a => ops.push({ tipo: 'hoja', id: a.id, n: a.nombre, sub: 'hoja de efecto' }));
    Object.keys(CKFx.plantillas).forEach(k => ops.push({ tipo: 'plantilla', id: k, n: CKFx.plantillas[k].nombre, sub: 'plantilla' }));
    let elegido = null;
    const l = h('div.lista', { style: { maxHeight: '380px', overflow: 'auto' } });
    ops.forEach(o => {
      const it = h(
        'div.item',
        {
          onclick: () => {
            elegido = o;
            l.querySelectorAll('.item').forEach(q => q.classList.remove('activo'));
            it.classList.add('activo');
          },
          ondblclick: () => l.closest('.ventana').cerrar(o)
        },
        h('span', { html: CK.ico(o.tipo === 'hoja' ? 'hoja' : 'fx', 16) }),
        h('span.nombre', o.n),
        h('span.sub', o.sub)
      );
      l.append(it);
    });
    const r = await CK.ventana({
      titulo: 'Probar un efecto con la animación',
      ancho: 480,
      cuerpo: h(
        'div',
        h(
          'p.nota-txt',
          'Se dibuja encima (o detrás) de la animación solo para ver cómo quedan juntos. No cambia la hoja hasta que uses "Guardar con los efectos".'
        ),
        l
      ),
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Agregar', cls: 'pri', valor: () => elegido }
      ]
    });
    if (!r) return;
    const fr = An.cuadrosCache()[0],
      w = fr ? fr.width : 32,
      hh = fr ? fr.height : 32;
    An.cambiarFx('Agregar efecto', l2 => {
      l2.push({ tipo: r.tipo, id: r.id, x: Math.round(w / 2), y: Math.round(hh * 0.6), escala: 1, detras: false, desde: 0, repetir: true });
      An.st.fxSel = l2.length - 1;
    });
    An.st.verFx = true;
    An.tabs.refrescar();
  };
  /** Hornea la animación con sus efectos en una hoja nueva. */
  An.hornearConFx = async () => {
    const { fr, ms } = An.secuencia();
    if (!fr.length) return;
    const l = An.fxLista().filter(e => !e.oculto);
    if (!l.length) {
      CK.aviso('Agregá primero un efecto.', 'info');
      return;
    }
    const fw = fr[0].width,
      fh = fr[0].height,
      M = Math.max(fw, fh) * 2,
      W = fw + M * 2,
      H = fh + M * 2,
      guarda = { t: An.rep.t, play: An.rep.play, i: An.rep.i },
      out = [];
    An.reiniciarFx();
    An.rep.play = true;
    let previo = -1;
    for (let i = 0; i < fr.length; i++) {
      An.pasoFx(0, i, i !== previo);
      previo = i;
      const c = CK.lienzo(W, H),
        x = CK.ctx(c);
      x.translate(M, M);
      An.dibujarFx(x, true);
      x.drawImage(fr[i], 0, 0);
      An.dibujarFx(x, false);
      out.push(CK.aPix(c));
      const pasos = Math.max(1, Math.round(ms[i] / (1000 / 60)));
      for (let p = 0; p < pasos; p++) An.pasoFx(1 / 60, i, false);
    }
    Object.assign(An.rep, guarda);
    An.reiniciarFx();
    let x0 = W,
      y0 = H,
      x1 = 0,
      y1 = 0;
    out.forEach(im => {
      const b = PIX.bbox(im, 40);
      if (!b) return;
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h);
    });
    x0 = Math.min(x0, M);
    y0 = Math.min(y0, M);
    x1 = Math.max(x1, M + fw);
    y1 = Math.max(y1, M + fh);
    const frs = out.map(im => {
      let r = PIX.crop(im, x0, y0, x1 - x0, y1 - y0);
      r = { w: r.w, h: r.h, d: new Uint8ClampedArray(r.d) };
      for (let q = 3; q < r.d.length; q += 4) r.d[q] = r.d[q] >= 70 ? 255 : 0;
      return CK.P.estilo.paleta.length ? PIX.quantize(r, CK.P.estilo.paleta) : r;
    });
    const base = An.hojaA() || CK.P.assets[An.st.base],
      nombre = await CK.pedir('Guardar con los efectos', 'Nombre de la animación nueva', ((base || {}).nombre || 'animacion') + '_fx');
    if (!nombre) return;
    const a = CK.asset.crear({
      nombre,
      tipo: 'hoja',
      lienzo: CK.aLienzo(PIX.pack(frs, frs.length)),
      origen: 'animación con efectos',
      cuadros: Object.assign(
        { fw: x1 - x0, fh: y1 - y0, fps: An.fpsAct(), bucle: true, ancla: { x: M - x0, y: M - y0 } },
        ms.some(v => Math.abs(v - An.baseMs()) > 0.5) ? { dur: ms.map(v => (Math.abs(v - An.baseMs()) > 0.5 ? Math.round(v) : 0)) } : {}
      )
    });
    CK.aviso('Guardada "' + a.nombre + '" (' + frs.length + ' cuadros de ' + (x1 - x0) + ' × ' + (y1 - y0) + ').');
    An.st.hoja = a.id;
    An.tabs.ir('hoja');
    An.pintarIzq();
  };
})();
