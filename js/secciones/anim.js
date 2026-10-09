/* ANIMACIONES: genera movimiento a partir de un asset quieto (ondear, mecer, flotar, titilar…), ordena y alinea hojas de
   sprites, y exporta PNG + datos + GIF. La lista de pendientes sale de las marcas "a animar" que dejaste en los mapas.
   La vista tiene zoom (rueda) y desplazamiento (barra espaciadora, botón del medio o arrastrar). Abajo, la línea de tiempo:
   cada cuadro se puede reordenar arrastrando, alargar (duración propia), duplicar, borrar, y tiene menú con clic derecho.
   Se le pueden superponer efectos (FX del proyecto, plantillas u hojas de efecto) para ver cómo quedan juntos. */
'use strict';
(function () {
  const h = CK.h; let el, izq, der, centro, tabs, cajaRep, lineaEl, vistaCv, vista, sobreVista;
  const st = { base: null, tipo: 'ondear', params: {}, usarPaleta: true, fps: 8, frames: [], hoja: null, origen: null, fondo: 'cuadros', modo: 'generar',
    cebolla: false, grilla: true, verFx: true, fxSel: 0, moverFx: false, tamCuadro: 64, selC: new Set(), ancla: 0, fxGen: [] };
  const rep = { t: 0, play: true, u: 0, i: -1 };
  const pal = () => st.usarPaleta ? CK.P.estilo.paleta : [];

  /** Marcas "a animar" de todos los mapas. */
  const pendientes = () => { const out = []; Object.values(CK.P.mapas).forEach(m => CK.mapa.objetosDe(m).forEach(o => { if (o.marca) out.push({ mapa: m, o }); })); return out.sort((a, b) => (a.o.marca.estado === 'hecha') - (b.o.marca.estado === 'hecha')); };
  CK.animPendientes = pendientes;

  const pixBase = () => { const a = CK.P.assets[st.base]; if (!a || !CK.img[st.base]) return null; const f = CK.asset.cuadro(a, 0), im = CK.asset.pix(st.base); return a.cuadros ? PIX.crop(im, f.x, f.y, f.w, f.h) : im; };
  const generar = CK.debounce(() => {
    const im = pixBase(); if (!im) { st.frames = []; pintarCentro(); return; }
    try { st.frames = PIX.animate(im, st.tipo, Object.assign({}, st.params, { paleta: pal() })); } catch (e) { console.error(e); st.frames = []; CK.aviso(e.message, 'error'); }
    pintarCentro();
  }, 40);
  const hojaA = () => st.modo === 'hoja' ? CK.P.assets[st.hoja] : null;
  const cuadrosVista = () => {
    if (st.modo === 'generar') return st.frames.map(CK.aLienzo);
    const a = CK.P.assets[st.hoja]; if (!a || !a.cuadros) return []; const n = CK.asset.nCuadros(a), ord = a.cuadros.orden || [...Array(n).keys()], l = ord.map(i => { const g = CK.asset.cuadro(a, i), c = CK.lienzo(g.w, g.h); CK.ctx(c).drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); return c; });
    return a.cuadros.vaiven && l.length > 2 ? l.concat(l.slice(1, -1).reverse()) : l;
  };
  let cache = [], cacheKey = '';
  const cuadrosCache = () => { const a = CK.P.assets[st.hoja], k = st.modo + '|' + (st.modo === 'generar' ? st.frames.length + ':' + st._v : (a ? a.id + ':' + (a.modificado || 0) + ':' + JSON.stringify(a.cuadros) : '')); if (k !== cacheKey) { cacheKey = k; cache = cuadrosVista(); } return cache; };
  const fpsAct = () => st.modo === 'generar' ? st.fps : ((CK.P.assets[st.hoja] || {}).cuadros || {}).fps || 8;
  const baseMs = () => 1000 / Math.max(1, fpsAct());
  /** Cuadros a mostrar y cuánto dura cada uno (ms). */
  const secuencia = () => {
    const fr = st.modo === 'poses' ? [] : cuadrosCache(), a = hojaA(); let ms;
    if (a && a.cuadros) { const n = CK.asset.nCuadros(a), ord = a.cuadros.orden || [...Array(n).keys()], d = a.cuadros.dur || []; ms = ord.map(i => d[i] || baseMs()); if (a.cuadros.vaiven && ms.length > 2) ms = ms.concat(ms.slice(1, -1).reverse()); }
    else ms = fr.map(() => baseMs());
    return { fr, ms };
  };
  /** Cuadro de la hoja (en su orden guardado) que se ve en la posición i de la reproducción. */
  const fisico = i => { const a = hojaA(); if (!a || !a.cuadros) return i; const n = CK.asset.nCuadros(a), ord = a.cuadros.orden || [...Array(n).keys()]; if (i >= ord.length) i = 2 * ord.length - 2 - i; return ord[Math.max(0, Math.min(ord.length - 1, i))]; };
  const inicioDe = (ms, i) => { let s = 0; for (let k = 0; k < i; k++) s += ms[k]; return s / 1000; };

  // ---------------------------------------------------------------- efectos superpuestos (solo para probar)
  const fxLista = () => { const a = hojaA(); if (a) return (a.fxPrueba = a.fxPrueba || []); return st.fxGen; };
  const recurso = id => { const a = CK.P.assets[id]; return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null; };
  const defFx = e => e.tipo === 'plantilla' ? CKFx.plantillas[e.id] : e.tipo === 'fx' ? CK.P.fx[e.id] : null;
  const nombreFx = e => e.tipo === 'hoja' ? ((CK.P.assets[e.id] || {}).nombre || e.id) : ((defFx(e) || {}).nombre || e.id) + (e.tipo === 'plantilla' ? ' (plantilla)' : '');
  const vivosFx = new Map();      // entrada -> { sim, t }
  const vivoDe = e => { let v = vivosFx.get(e); const d = defFx(e), firma = JSON.stringify(d || e.id); if (!v || v.firma !== firma) { v = { firma, sim: d ? CKFx.crear(CK.clone(Object.assign({}, d, { bucle: !!d.bucle })), { semilla: 7 }) : null, t: 0, corre: !!(d && d.bucle) }; vivosFx.set(e, v); } return v; };
  const reiniciarFx = () => vivosFx.clear();
  const pasoFx = (dt, i, cambio) => {
    if (!st.verFx) return; const l = fxLista(); if (!l.length) return;
    l.forEach(e => {
      if (e.oculto) return; const v = vivoDe(e), d = defFx(e), arranca = cambio && i === (e.desde || 0);
      if (e.tipo === 'hoja') { if (arranca && e.repetir !== false) v.t = 0; if (rep.play) v.t += dt; return; }
      if (!v.sim) return;
      if (d && d.bucle) { if (rep.play) v.sim.paso(dt); return; }
      if (arranca) { v.sim.reiniciar(); v.corre = true; }
      if (v.corre && rep.play) { v.sim.paso(dt); if (v.sim.fin) { v.corre = false; if (e.repetir === false) return; } }
    });
  };
  const fxActivos = () => st.verFx && fxLista().some(e => !e.oculto);
  const dibujarFx = (x, detras) => {
    if (!st.verFx) return;
    fxLista().forEach((e, k) => {
      if (e.oculto || !!e.detras !== detras) return; const v = vivoDe(e), esc = e.escala || 1;
      x.save(); x.translate(e.x || 0, e.y || 0); x.scale(esc, esc);
      if (e.tipo === 'hoja') { const a = CK.P.assets[e.id]; if (a && CK.img[a.id]) { const n = CK.asset.nCuadros(a), fps = (a.cuadros || {}).fps || 8; let j = Math.floor(v.t * fps); if (a.cuadros && a.cuadros.bucle === false && !e.repetir) j = Math.min(n - 1, j); const g = CK.asset.cuadro(a, j % n), an = (a.cuadros || {}).ancla || { x: g.w / 2, y: g.h / 2 }; x.drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, -an.x, -an.y, g.w, g.h); } }
      else if (v.sim && (v.corre || (defFx(e) || {}).bucle)) v.sim.dibujar(x, 0, 0, recurso);
      x.restore();
      if (k === st.fxSel && st.moverFx) { x.save(); const z = vista.z; x.lineWidth = 1 / z; x.strokeStyle = '#000'; x.beginPath(); x.arc(e.x || 0, e.y || 0, 5 / z, 0, 7); x.stroke(); x.strokeStyle = '#58d0ff'; x.beginPath(); x.arc(e.x || 0, e.y || 0, 4 / z, 0, 7); x.moveTo((e.x || 0) - 9 / z, e.y || 0); x.lineTo((e.x || 0) + 9 / z, e.y || 0); x.moveTo(e.x || 0, (e.y || 0) - 9 / z); x.lineTo(e.x || 0, (e.y || 0) + 9 / z); x.stroke(); x.restore(); }
    });
  };
  const cambiarFx = (nombre, fn) => { const a = hojaA(); if (a) { const f = CK.hist.datos(nombre, 'assets', a.id); fn(fxLista()); f(); } else fn(fxLista()); reiniciarFx(); if (vista) vista.pedir(); };
  const agregarFx = async () => {
    const ops = []; Object.values(CK.P.fx).forEach(f => ops.push({ tipo: 'fx', id: f.id, n: f.nombre, sub: 'del proyecto' })); Object.values(CK.P.assets).filter(a => a.tipo === 'fx' && a.cuadros).forEach(a => ops.push({ tipo: 'hoja', id: a.id, n: a.nombre, sub: 'hoja de efecto' })); Object.keys(CKFx.plantillas).forEach(k => ops.push({ tipo: 'plantilla', id: k, n: CKFx.plantillas[k].nombre, sub: 'plantilla' }));
    let elegido = null; const l = h('div.lista', { style: { maxHeight: '380px', overflow: 'auto' } });
    ops.forEach(o => { const it = h('div.item', { onclick: () => { elegido = o; l.querySelectorAll('.item').forEach(q => q.classList.remove('activo')); it.classList.add('activo'); }, ondblclick: () => l.closest('.ventana').cerrar(o) }, h('span', { html: CK.ico(o.tipo === 'hoja' ? 'hoja' : 'fx', 16) }), h('span.nombre', o.n), h('span.sub', o.sub)); l.append(it); });
    const r = await CK.ventana({ titulo: 'Probar un efecto con la animación', ancho: 480, cuerpo: h('div', h('p.nota-txt', 'Se dibuja encima (o detrás) de la animación solo para ver cómo quedan juntos. No cambia la hoja hasta que uses "Guardar con los efectos".'), l), botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Agregar', cls: 'pri', valor: () => elegido }] });
    if (!r) return; const fr = cuadrosCache()[0], w = fr ? fr.width : 32, hh = fr ? fr.height : 32;
    cambiarFx('Agregar efecto', l2 => { l2.push({ tipo: r.tipo, id: r.id, x: Math.round(w / 2), y: Math.round(hh * 0.6), escala: 1, detras: false, desde: 0, repetir: true }); st.fxSel = l2.length - 1; });
    st.verFx = true; tabs.refrescar();
  };
  /** Hornea la animación con sus efectos en una hoja nueva. */
  const hornearConFx = async () => {
    const { fr, ms } = secuencia(); if (!fr.length) return; const l = fxLista().filter(e => !e.oculto); if (!l.length) { CK.aviso('Agregá primero un efecto.', 'info'); return; }
    const fw = fr[0].width, fh = fr[0].height, M = Math.max(fw, fh) * 2, W = fw + M * 2, H = fh + M * 2, guarda = { t: rep.t, play: rep.play, i: rep.i }, out = [];
    reiniciarFx(); rep.play = true; let previo = -1;
    for (let i = 0; i < fr.length; i++) {
      pasoFx(0, i, i !== previo); previo = i;
      const c = CK.lienzo(W, H), x = CK.ctx(c); x.translate(M, M); dibujarFx(x, true); x.drawImage(fr[i], 0, 0); dibujarFx(x, false); out.push(CK.aPix(c));
      const pasos = Math.max(1, Math.round(ms[i] / (1000 / 60))); for (let p = 0; p < pasos; p++) pasoFx(1 / 60, i, false);
    }
    Object.assign(rep, guarda); reiniciarFx();
    let x0 = W, y0 = H, x1 = 0, y1 = 0; out.forEach(im => { const b = PIX.bbox(im, 40); if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    x0 = Math.min(x0, M); y0 = Math.min(y0, M); x1 = Math.max(x1, M + fw); y1 = Math.max(y1, M + fh);
    const frs = out.map(im => { let r = PIX.crop(im, x0, y0, x1 - x0, y1 - y0); r = { w: r.w, h: r.h, d: new Uint8ClampedArray(r.d) }; for (let q = 3; q < r.d.length; q += 4) r.d[q] = r.d[q] >= 70 ? 255 : 0; return CK.P.estilo.paleta.length ? PIX.quantize(r, CK.P.estilo.paleta) : r; });
    const base = hojaA() || CK.P.assets[st.base], nombre = await CK.pedir('Guardar con los efectos', 'Nombre de la animación nueva', ((base || {}).nombre || 'animacion') + '_fx'); if (!nombre) return;
    const a = CK.asset.crear({ nombre, tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), origen: 'animación con efectos', cuadros: Object.assign({ fw: x1 - x0, fh: y1 - y0, fps: fpsAct(), bucle: true, ancla: { x: M - x0, y: M - y0 } }, ms.some(v => Math.abs(v - baseMs()) > 0.5) ? { dur: ms.map(v => Math.abs(v - baseMs()) > 0.5 ? Math.round(v) : 0) } : {}) });
    CK.aviso('Guardada "' + a.nombre + '" (' + frs.length + ' cuadros de ' + (x1 - x0) + ' × ' + (y1 - y0) + ').'); st.hoja = a.id; tabs.ir('hoja'); pintarIzq();
  };

  // ---------------------------------------------------------------- vista con zoom
  const fondos = { cuadros: null, oscuro: '#1b1d21', pasto: '#4c7a3a', piedra: '#6b6258' };
  const encuadre = () => { const fr = cuadrosCache()[0]; if (fr && vista) vista.encuadrar(fr.width, fr.height, 70); };
  const pintarVista = (x, v) => {
    const f = fondos[st.fondo]; if (f) { x.fillStyle = f; x.fillRect(0, 0, v.w, v.h); } else CK.cuadros(x, v.w, v.h, 10, '#2b2e33', '#26292d');
    const { fr } = secuencia(); if (!fr.length) return; const i = Math.max(0, Math.min(rep.i, fr.length - 1)), c = fr[i];
    x.save(); v.mundo(x); x.imageSmoothingEnabled = false;
    if (!f) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, c.width, c.height); }
    if (st.cebolla && fr.length > 1 && !rep.play) [[-1, 0.3, '#ff6b6b'], [1, 0.22, '#58d0ff']].forEach(([d, al]) => { const j = i + d; if (j < 0 || j >= fr.length) return; x.globalAlpha = al; x.drawImage(fr[j], 0, 0); x.globalAlpha = 1; });
    dibujarFx(x, true); x.drawImage(c, 0, 0); dibujarFx(x, false);
    x.restore();
    if (st.grilla && v.z >= 8) v.grilla(x, 1, c.width, c.height, 'rgba(255,255,255,.07)');
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(Math.round(v.tx) - .5, Math.round(v.ty) - .5, c.width * v.z + 1, c.height * v.z + 1);
  };
  const herramientaVista = {
    bajar(m) { if (st.moverFx && fxLista()[st.fxSel] && m.boton === 0) { const e = fxLista()[st.fxSel]; this._fx = { e, antes: hojaA() ? JSON.stringify(hojaA().fxPrueba) : null }; e.x = Math.round(m.x); e.y = Math.round(m.y); vista.pedir(); return; } this._pan = { sx: m.sx, sy: m.sy, tx: vista.tx, ty: vista.ty }; vistaCv.style.cursor = 'grabbing'; },
    mover(m) { if (this._fx) { this._fx.e.x = Math.round(m.x); this._fx.e.y = Math.round(m.y); vista.pedir(); return; } if (this._pan) { vista.tx = this._pan.tx + m.sx - this._pan.sx; vista.ty = this._pan.ty + m.sy - this._pan.sy; vista.pedir(); } },
    subir() { if (this._fx) { const a = hojaA(); if (a && this._fx.antes !== JSON.stringify(a.fxPrueba)) { const antes = this._fx.antes, despues = JSON.stringify(a.fxPrueba), id = a.id; CK.hist.push({ nombre: 'Mover efecto', deshacer: () => { CK.P.assets[id].fxPrueba = JSON.parse(antes); reiniciarFx(); }, rehacer: () => { CK.P.assets[id].fxPrueba = JSON.parse(despues); reiniciarFx(); } }); } this._fx = null; if (tabs) tabs.refrescar(); return; } this._pan = null; vistaCv.style.cursor = ''; },
    pasar() { if (!CK._espacio) vistaCv.style.cursor = st.moverFx ? 'crosshair' : 'grab'; }
  };
  const menuVista = e => {
    const { fr } = secuencia(), a = hojaA(), i = fisico(rep.i);
    CK.menu(e, [
      { txt: rep.play ? 'Pausar' : 'Reproducir', ico: rep.play ? 'pausa' : 'play', tecla: 'Espacio', on: () => ponerPlay(!rep.play) },
      { txt: 'Ver todo', ico: 'centrar', tecla: '0', on: encuadre }, { txt: 'Acercar', ico: 'lupaMas', tecla: '+', on: () => vista.zoomEn(1) }, { txt: 'Alejar', ico: 'lupaMenos', tecla: '-', on: () => vista.zoomEn(-1) },
      { txt: 'Zoom', ico: 'lupa', sub: [1, 2, 4, 8, 16, 32].map(z => ({ txt: z * 100 + '%', activo: vista.z === z, on: () => { const c = fr[0]; vista.z = z; if (c) { vista.tx = Math.round(vista.w / 2 - c.width * z / 2); vista.ty = Math.round(vista.h / 2 - c.height * z / 2); } if (vista.o.alZoom) vista.o.alZoom(z); vista.pedir(); } })) },
      '-',
      { txt: 'Fondo', ico: 'imagen', sub: Object.keys(fondos).map(k => ({ txt: { cuadros: 'Vacío', oscuro: 'Oscuro', pasto: 'Pasto', piedra: 'Piedra' }[k], activo: st.fondo === k, on: () => { st.fondo = k; pintarSobre(); vista.pedir(); } })) },
      { txt: 'Papel cebolla (en pausa)', ico: 'cebolla', activo: st.cebolla, on: () => { st.cebolla = !st.cebolla; pintarSobre(); vista.pedir(); } },
      { txt: 'Grilla de píxeles', ico: 'grilla', activo: st.grilla, on: () => { st.grilla = !st.grilla; pintarSobre(); vista.pedir(); } },
      { txt: 'Ver efectos', ico: 'fx', activo: st.verFx, off: !fxLista().length, on: () => { st.verFx = !st.verFx; pintarSobre(); vista.pedir(); } },
      { txt: 'Agregar un efecto…', ico: 'mas', on: agregarFx },
      a ? '-' : null,
      a ? { txt: 'Editar este cuadro en Pixel art', ico: 'pixel', on: () => editarEnPixel(i) } : null,
      fr.length ? { txt: 'Descargar este cuadro (PNG)', ico: 'importar', on: async () => CK.descargar(await CK.aBlob(fr[Math.min(rep.i, fr.length - 1)]), ((a || {}).id || 'cuadro') + '_' + (i + 1) + '.png') } : null
    ]);
  };
  let bPlay = null;
  const ponerPlay = v => { rep.play = v; const { ms } = secuencia(), total = ms.reduce((s, q) => s + q, 0) / 1000; if (v && rep.t >= total - 0.001) rep.t = 0; if (bPlay) bPlay.innerHTML = CK.ico(v ? 'pausa' : 'play'); pintarCabezal(); if (vista) vista.pedir(); };
  const irA = i => { const { ms } = secuencia(); if (!ms.length) return; i = Math.max(0, Math.min(ms.length - 1, i)); rep.t = inicioDe(ms, i) + 0.0001; rep.i = i; ponerPlay(false); reiniciarFx(); pintarCabezal(); vista.pedir(); };
  const pintarSobre = () => {
    if (!sobreVista) return; CK.vaciar(sobreVista);
    bPlay = CK.btn({ ico: rep.play ? 'pausa' : 'play', tip: 'Reproducir / pausar', tecla: 'Espacio', cls: 'chico plano', on: () => ponerPlay(!rep.play) });
    const t = (ico, tip, desc, get, set) => CK.btn({ ico, tip, desc, cls: 'chico plano' + (get() ? ' activo' : ''), on: () => { set(!get()); pintarSobre(); vista.pedir(); } });
    sobreVista.append(h('div.tira', bPlay, h('span.sep'), h('span.txt', 'Fondo'), ...Object.keys(fondos).map(k => CK.btn({ txt: { cuadros: 'Vacío', oscuro: 'Oscuro', pasto: 'Pasto', piedra: 'Piedra' }[k], cls: 'chico plano' + (st.fondo === k ? ' activo' : ''), desc: 'Color detrás de la animación, para ver cómo se lee sobre el suelo del juego.', on: () => { st.fondo = k; pintarSobre(); vista.pedir(); } })), h('span.sep'),
      t('cebolla', 'Papel cebolla', 'En pausa muestra el cuadro anterior y el siguiente en transparencia.', () => st.cebolla, v => { st.cebolla = v; }),
      t('grilla', 'Grilla de píxeles', 'Con zoom alto marca cada píxel.', () => st.grilla, v => { st.grilla = v; }),
      t('fx', 'Ver efectos', 'Muestra u oculta los efectos que agregaste para probar.', () => st.verFx, v => { st.verFx = v; })));
  };
  // reproducción continua
  let raf = 0;
  const bucle = now => {
    raf = requestAnimationFrame(bucle);
    if (CK.seccion_actual !== 'anim' || st.modo === 'poses' || !vista) { rep.u = now; return; }
    const dt = Math.min(0.1, Math.max(0, (now - (rep.u || now)) / 1000)); rep.u = now;
    const { fr, ms } = secuencia(); if (!fr.length) return;
    const total = ms.reduce((s, v) => s + v, 0) / 1000, a = hojaA(), enBucle = !(a && a.cuadros && a.cuadros.bucle === false);
    if (rep.play) { rep.t += dt; if (rep.t >= total) { if (enBucle) rep.t %= total; else { rep.t = total - 0.0001; ponerPlay(false); } } }
    let acc = 0, i = 0; for (; i < ms.length; i++) { acc += ms[i] / 1000; if (rep.t < acc) break; } i = Math.min(i, fr.length - 1);
    const cambio = i !== rep.i; rep.i = i; pasoFx(dt, i, cambio);
    if (cambio || (fxActivos() && rep.play)) vista.pedir();
    if (cambio) marcarActual(); moverAguja(total);
  };

  // ---------------------------------------------------------------- línea de tiempo
  let pista = null, aguja = null, regla = null, portaCuadros = null;
  /** Abre la hoja como lista de cuadros + duraciones; fn los cambia; queda todo en un solo paso de deshacer. */
  const editarHoja = (nombre, fn) => {
    const a = hojaA(); if (!a || !a.cuadros) return; const k = a.cuadros, n = CK.asset.nCuadros(a), id = a.id;
    const antesImg = CK.copiaLienzo(CK.img[id]), antesC = JSON.stringify(a.cuadros);
    let frs = PIX.slice(CK.asset.pix(id), k.fw, k.fh).slice(0, n), dur = (k.dur || []).slice(0, n); while (dur.length < frs.length) dur.push(0);
    if (k.orden) { frs = k.orden.map(i => frs[i]); dur = k.orden.map(i => dur[i] || 0); }
    const r = fn(frs, dur); if (r === false || !frs.length) return;
    k.dur = dur.some(Boolean) ? dur.map(v => v || 0) : undefined; if (!k.dur) delete k.dur; delete k.orden;
    CK.asset.poner(id, CK.aLienzo(PIX.pack(frs, frs.length)));
    const despuesImg = CK.copiaLienzo(CK.img[id]), despuesC = JSON.stringify(a.cuadros);
    const poner = (img, c) => { const x = CK.P.assets[id]; if (!x) return; x.cuadros = JSON.parse(c); CK.asset.poner(id, CK.copiaLienzo(img)); };
    CK.hist.push({ nombre, deshacer: () => poner(antesImg, antesC), rehacer: () => poner(despuesImg, despuesC) });
    st.selC = new Set([...st.selC].filter(i => i < frs.length)); cacheKey = ''; pintarCentro(); if (tabs) tabs.refrescar();
  };
  const selOrden = () => [...st.selC].sort((a, b) => a - b);
  const conSel = i => { if (i !== undefined && !st.selC.has(i)) { st.selC = new Set([i]); st.ancla = i; } return selOrden(); };
  const ops = {
    duplicar: () => { const s = selOrden(); if (!s.length) return; editarHoja('Duplicar cuadros', (f, d) => { const ult = s[s.length - 1], cop = s.map(i => PIX.clone(f[i])), cd = s.map(i => d[i]); f.splice(ult + 1, 0, ...cop); d.splice(ult + 1, 0, ...cd); st.selC = new Set(cop.map((_, k) => ult + 1 + k)); }); },
    borrar: () => { const s = selOrden(), n = CK.asset.nCuadros(hojaA()); if (!s.length) return; if (s.length >= n) { CK.aviso('Tiene que quedar al menos un cuadro.', 'info'); return; } editarHoja('Borrar cuadros', (f, d) => { s.slice().reverse().forEach(i => { f.splice(i, 1); d.splice(i, 1); }); st.selC = new Set([Math.min(s[0], f.length - 1)]); }); },
    vacio: despues => { const s = selOrden(), at = s.length ? (despues ? s[s.length - 1] + 1 : s[0]) : CK.asset.nCuadros(hojaA()); editarHoja('Cuadro vacío', (f, d) => { f.splice(at, 0, PIX.make(f[0].w, f[0].h)); d.splice(at, 0, 0); st.selC = new Set([at]); }); },
    mover: hasta => { const s = selOrden(); if (!s.length) return; editarHoja('Ordenar cuadros', (f, d) => { const sf = s.map(i => f[i]), sd = s.map(i => d[i]); s.slice().reverse().forEach(i => { f.splice(i, 1); d.splice(i, 1); }); let at = hasta - s.filter(i => i < hasta).length; at = Math.max(0, Math.min(f.length, at)); f.splice(at, 0, ...sf); d.splice(at, 0, ...sd); st.selC = new Set(sf.map((_, k) => at + k)); }); },
    invertir: () => { const s = selOrden(); if (s.length < 2) return; editarHoja('Invertir cuadros', (f, d) => { const sf = s.map(i => f[i]).reverse(), sd = s.map(i => d[i]).reverse(); s.forEach((i, k) => { f[i] = sf[k]; d[i] = sd[k]; }); }); },
    espejar: () => { const s = selOrden(); if (!s.length) return; editarHoja('Espejar cuadros', f => { s.forEach(i => { f[i] = PIX.flipH(f[i]); }); }); },
    duracion: ms => { const s = selOrden(); if (!s.length) return; editarHoja('Duración del cuadro', (f, d) => { s.forEach(i => { d[i] = ms && Math.abs(ms - baseMs()) > 0.5 ? Math.round(ms) : 0; }); }); },
    copiar: () => { const a = hojaA(), s = selOrden(); if (!a || !s.length) return; const frs = PIX.slice(CK.asset.pix(a.id), a.cuadros.fw, a.cuadros.fh); portaCuadros = s.map(i => ({ im: PIX.clone(frs[i]), d: (a.cuadros.dur || [])[i] || 0 })); CK.estado(s.length + ' cuadro(s) copiado(s). Ctrl + V los pega después del elegido.'); },
    pegar: () => { if (!portaCuadros) return; const s = selOrden(), at = s.length ? s[s.length - 1] + 1 : CK.asset.nCuadros(hojaA()); editarHoja('Pegar cuadros', (f, d) => { const W = f[0].w, H = f[0].h, nu = portaCuadros.map(p => { if (p.im.w === W && p.im.h === H) return PIX.clone(p.im); const o = PIX.make(W, H); PIX.blit(o, p.im, Math.round((W - p.im.w) / 2), H - p.im.h, false); return o; }); f.splice(at, 0, ...nu); d.splice(at, 0, ...portaCuadros.map(p => p.d)); st.selC = new Set(nu.map((_, k) => at + k)); }); },
    insertarArchivos: async (archivos, at) => {
      const fs = (archivos || await CK.elegirArchivos('image/png,image/gif,image/webp', true)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); if (!fs.length) return; const a = hojaA(); if (!a) return;
      const ims = []; for (const f of fs) { try { const im = CK.aPix(await CK.cargarImagen(f)); if (im.h === a.cuadros.fh && im.w > im.h && im.w % a.cuadros.fw === 0) PIX.slice(im, a.cuadros.fw, a.cuadros.fh).forEach(q => ims.push(q)); else ims.push(im); } catch (e) { CK.aviso('No pude leer ' + f.name, 'error'); } }
      if (!ims.length) return; if (at === undefined) { const s = selOrden(); at = s.length ? s[s.length - 1] + 1 : CK.asset.nCuadros(a); }
      editarHoja('Agregar cuadros', (f, d) => { const W = f[0].w, H = f[0].h, nu = ims.map(im => { if (im.w === W && im.h === H) return im; const o = PIX.make(W, H); PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false); return o; }); f.splice(at, 0, ...nu); d.splice(at, 0, ...nu.map(() => 0)); st.selC = new Set(nu.map((_, k) => at + k)); });
      if (ims.some(im => im.w > a.cuadros.fw || im.h > a.cuadros.fh)) CK.aviso('Alguna imagen era más grande que el cuadro (' + a.cuadros.fw + ' × ' + a.cuadros.fh + '): quedó recortada. Agrandá el cuadro en Pixel art → Tamaño del lienzo.', 'info', 6000);
    },
    reemplazar: async i => { const [f] = await CK.elegirArchivos('image/png,image/gif,image/webp'); if (!f) return; const im = CK.aPix(await CK.cargarImagen(f)); editarHoja('Reemplazar cuadro', fr => { const W = fr[0].w, H = fr[0].h, o = PIX.make(W, H); PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false); fr[i] = o; }); }
  };
  const editarEnPixel = i => { const a = hojaA(); if (!a) return; if (a.cuadros.orden) editarHoja('Fijar orden', () => { }); CK.ir('pixel', a.id); if (CK.pixel && CK.pixel.irCuadro) CK.pixel.irCuadro(i); };
  const menuCuadro = (e, i) => {
    const s = conSel(i), a = hojaA(), dur = ((a.cuadros.dur || [])[i]) || 0, base = baseMs(), varios = s.length > 1;
    pintarPista();
    CK.menu(e, [
      { titulo: varios ? s.length + ' cuadros' : 'Cuadro ' + (i + 1) },
      { txt: 'Editar en Pixel art', ico: 'pixel', tecla: 'Doble clic', off: varios, on: () => editarEnPixel(i) },
      '-',
      { txt: 'Duplicar', ico: 'duplicar', tecla: 'Ctrl + D', on: ops.duplicar },
      { txt: 'Copiar', ico: 'duplicar', tecla: 'Ctrl + C', on: ops.copiar }, { txt: 'Pegar después', ico: 'duplicar', tecla: 'Ctrl + V', off: !portaCuadros, on: ops.pegar },
      { txt: 'Insertar', ico: 'mas', sub: [{ txt: 'Cuadro vacío antes', on: () => ops.vacio(false) }, { txt: 'Cuadro vacío después', on: () => ops.vacio(true) }, { txt: 'Imágenes desde archivo…', on: () => ops.insertarArchivos(null, s[s.length - 1] + 1) }] },
      { txt: 'Reemplazar con imagen…', ico: 'importar', off: varios, on: () => ops.reemplazar(i) },
      '-',
      { txt: 'Duración', ico: 'tiempo', sub: [1, 2, 3, 4, 6].map(k => ({ txt: '×' + k + ' (' + Math.round(base * k) + ' ms)', activo: !varios && Math.abs((dur || base) - base * k) < 1, on: () => ops.duracion(base * k) })).concat(['-', { txt: 'Personalizada…', on: async () => { const v = await CK.pedir('Duración del cuadro', 'Milisegundos (a ' + fpsAct() + ' cuadros/s cada uno dura ' + Math.round(base) + ' ms)', String(Math.round(dur || base))); const n = parseFloat(v); if (n > 0) ops.duracion(n); } }]) },
      { txt: 'Mover', ico: 'mover', sub: [{ txt: 'Al principio', on: () => ops.mover(0) }, { txt: 'Un lugar antes', tecla: 'Alt + ←', on: () => ops.mover(Math.max(0, s[0] - 1)) }, { txt: 'Un lugar después', tecla: 'Alt + →', on: () => ops.mover(s[s.length - 1] + 2) }, { txt: 'Al final', on: () => ops.mover(CK.asset.nCuadros(a)) }] },
      varios ? { txt: 'Invertir el orden', ico: 'bucle', on: ops.invertir } : null,
      { txt: 'Espejar', ico: 'voltearH', on: ops.espejar },
      { txt: 'Descargar PNG', ico: 'importar', on: async () => { const frs = PIX.slice(CK.asset.pix(a.id), a.cuadros.fw, a.cuadros.fh); for (const k of s) CK.descargar(await CK.aBlob(CK.aLienzo(frs[k])), a.id + '_' + (k + 1) + '.png'); } },
      '-',
      { txt: varios ? 'Borrar ' + s.length + ' cuadros' : 'Borrar cuadro', ico: 'basura', tecla: 'Supr', peligro: true, on: ops.borrar }
    ]);
  };
  const marcarActual = () => { if (!pista) return; const f = fisico(rep.i); pista.querySelectorAll('.tl-cuadro').forEach(c => c.classList.toggle('actual', +c.dataset.i === f)); };
  const moverAguja = total => { if (!aguja || !pista) return; const { ms } = secuencia(), a = hojaA(); if (!ms.length) return; const n = a && a.cuadros ? CK.asset.nCuadros(a) : ms.length; let t = rep.t; if (a && a.cuadros && a.cuadros.vaiven && ms.length > n) { const ida = inicioDe(ms, n); if (t > ida) { const vuelta = t - ida, idx = rep.i; const fi = fisico(idx), cel = pista.querySelector('.tl-cuadro[data-i="' + fi + '"]'); if (cel) { aguja.style.left = (cel.offsetLeft + cel.offsetWidth / 2) + 'px'; } return; } }
    let acc = 0, x = 0; const celdas = pista.querySelectorAll('.tl-cuadro'); for (let i = 0; i < celdas.length; i++) { const d = ms[i] / 1000; if (t < acc + d || i === celdas.length - 1) { x = celdas[i].offsetLeft + celdas[i].offsetWidth * Math.min(1, (t - acc) / d); break; } acc += d; } aguja.style.left = x + 'px'; };
  const pintarCabezal = () => { marcarActual(); };
  const pintarPista = () => { if (!pista) return; pista.querySelectorAll('.tl-cuadro').forEach(c => c.classList.toggle('sel', st.selC.has(+c.dataset.i))); };
  const pintarLinea = () => {
    if (!lineaEl) return; CK.vaciar(lineaEl); pista = aguja = regla = null;
    const { fr, ms } = secuencia(), a = hojaA();
    const info = h('span.nota-txt', fr.length ? fr.length + ' cuadros · ' + (ms.reduce((s, v) => s + v, 0) / 1000).toFixed(2) + ' s' + (a && a.cuadros.vaiven ? ' (ida y vuelta)' : '') : '');
    const pasoB = d => () => irA(rep.i + d);
    const barra = h('div.tl-barra', CK.btn({ ico: 'anterior', tip: 'Al principio', tecla: 'Inicio', cls: 'chico plano', on: () => irA(0) }), (() => { const b = CK.btn({ ico: 'flechaD', tip: 'Cuadro anterior', tecla: ',', cls: 'chico plano', on: pasoB(-1) }); b.firstChild.style.transform = 'scaleX(-1)'; return b; })(),
      CK.btn({ ico: rep.play ? 'pausa' : 'play', tip: 'Reproducir / pausar', tecla: 'Espacio', cls: 'chico', on: (e, b) => { ponerPlay(!rep.play); b.innerHTML = CK.ico(rep.play ? 'pausa' : 'play'); } }), CK.btn({ ico: 'flechaD', tip: 'Cuadro siguiente', tecla: '.', cls: 'chico plano', on: pasoB(1) }), CK.btn({ ico: 'siguiente', tip: 'Al final', tecla: 'Fin', cls: 'chico plano', on: () => irA(fr.length - 1) }), h('span.sep'));
    if (a && a.cuadros) {
      const k = a.cuadros, fps = CK.num(k.fps || 8, { min: 1, max: 60 }, v => { const f = CK.hist.datos('Velocidad', 'assets', a.id); k.fps = v; f(); cacheKey = ''; pintarCentro(); }); fps.style.width = '56px';
      barra.append(h('span.txt', 'cuadros/s'), fps, CK.btn({ ico: 'bucle', tip: 'Se repite en loop', cls: 'chico plano' + (k.bucle !== false ? ' activo' : ''), on: () => { const f = CK.hist.datos('Loop', 'assets', a.id); k.bucle = k.bucle === false; f(); pintarCentro(); } }),
        CK.btn({ txt: 'Ida y vuelta', cls: 'chico plano' + (k.vaiven ? ' activo' : ''), desc: 'Al llegar al último cuadro vuelve hacia atrás.', on: () => { const f = CK.hist.datos('Ida y vuelta', 'assets', a.id); k.vaiven = !k.vaiven; f(); cacheKey = ''; pintarCentro(); } }), h('span.sep'),
        CK.btn({ ico: 'mas', tip: 'Cuadro vacío', desc: 'Agrega un cuadro vacío después del elegido.', cls: 'chico plano', on: () => ops.vacio(true) }), CK.btn({ ico: 'duplicar', tip: 'Duplicar', tecla: 'Ctrl + D', cls: 'chico plano', on: ops.duplicar }), CK.btn({ ico: 'importar', tip: 'Agregar imágenes', desc: 'Suma cuadros desde archivos PNG (uno por archivo, o tiras del mismo alto). También podés soltarlos sobre la línea de tiempo.', cls: 'chico plano', on: () => ops.insertarArchivos() }), CK.btn({ ico: 'basura', tip: 'Borrar', tecla: 'Supr', cls: 'chico plano', on: ops.borrar }), h('span.sep'));
      const tam = CK.rango(st.tamCuadro, { min: 36, max: 140, step: 4 }, v => { st.tamCuadro = v; pintarLinea(); }); tam.style.width = '90px'; const tt = h('div.fila.junto', h('span.txt', { html: CK.ico('lupa', 14) }), tam); CK.tip(tt, 'Tamaño de los cuadros', 'Agranda o achica las miniaturas de la línea de tiempo.');
      barra.append(tt);
    }
    barra.append(h('span.crece'), info);
    lineaEl.append(barra);
    if (!fr.length) { lineaEl.append(h('div.ayuda-txt', { style: { padding: '12px' } }, st.modo === 'generar' ? 'Elegí un asset base a la derecha para generar la animación.' : 'Elegí una animación de la lista de la izquierda.')); return; }
    // regla + pista
    const n = a && a.cuadros ? CK.asset.nCuadros(a) : fr.length, base = baseMs(), T = st.tamCuadro, msF = a && a.cuadros ? [...Array(n).keys()].map(i => ((a.cuadros.dur || [])[i]) || base) : ms.slice(0, n);
    const anchoDe = i => Math.max(T * 0.6, Math.round(T * msF[i] / base));
    pista = h('div.tl-pista'); regla = h('div.tl-regla'); aguja = h('div.tl-aguja');
    const frsFis = a && a.cuadros ? [...Array(n).keys()].map(i => { const g = CK.asset.cuadro(a, i), c = CK.lienzo(g.w, g.h); CK.ctx(c).drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); return c; }) : fr;
    let acc = 0;
    frsFis.forEach((c, i) => {
      const w = anchoDe(i), d = ((a && a.cuadros && a.cuadros.dur) || [])[i];
      const cel = h('div.tl-cuadro' + (st.selC.has(i) ? '.sel' : ''), { 'data-i': i, style: { width: w + 'px' } }, h('span.nro', String(i + 1)), CK.mini(c, Math.min(T - 8, 160)), d ? h('span.tl-dur', Math.round(d) + ' ms') : null, a ? h('span.tl-borde') : null);
      cel.querySelector('canvas').style.width = cel.querySelector('canvas').style.height = Math.min(T - 8, 160) + 'px';
      if (a) {
        cel.addEventListener('pointerdown', e => alApretar(e, i, cel)); cel.addEventListener('dblclick', () => editarEnPixel(i)); cel.addEventListener('contextmenu', e => menuCuadro(e, i));
        CK.tip(cel, 'Cuadro ' + (i + 1), (d ? 'Dura ' + Math.round(d) + ' ms. ' : '') + 'Clic: elegir · Arrastrar: reordenar · Borde derecho: alargar · Doble clic: dibujar · Clic derecho: opciones.');
      } else cel.addEventListener('click', () => irA(i));
      pista.append(cel);
      const marca = h('span.tl-marca', { style: { left: acc + 'px' } }, (inicioDe(msF, i)).toFixed(2) + 's'); regla.append(marca); acc += w + 4;
    });
    pista.append(aguja);
    regla.style.width = acc + 'px';
    regla.addEventListener('pointerdown', e => { regla.setPointerCapture(e.pointerId); const ir = ev => { const r = pista.getBoundingClientRect(), x = ev.clientX - r.left + pista.scrollLeft; const celdas = [...pista.querySelectorAll('.tl-cuadro')]; let k = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth); if (k < 0) k = celdas.length - 1; irA(k); }; ir(e); const up = () => { regla.removeEventListener('pointermove', ir); regla.removeEventListener('pointerup', up); }; regla.addEventListener('pointermove', ir); regla.addEventListener('pointerup', up); });
    const caja = h('div.tl-caja', regla, pista);
    if (a) { caja.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); caja.classList.add('soltando'); } }); caja.addEventListener('dragleave', () => caja.classList.remove('soltando')); caja.addEventListener('drop', e => { caja.classList.remove('soltando'); const fs = [...e.dataTransfer.files].filter(f => /^image\//.test(f.type)); if (!fs.length) return; e.preventDefault(); const r = pista.getBoundingClientRect(), x = e.clientX - r.left + pista.scrollLeft, celdas = [...pista.querySelectorAll('.tl-cuadro')]; let at = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth / 2); if (at < 0) at = celdas.length; ops.insertarArchivos(fs, at); }); caja.addEventListener('contextmenu', e => { if (e.target.closest('.tl-cuadro')) return; CK.menu(e, [{ txt: 'Cuadro vacío al final', ico: 'mas', on: () => { st.selC = new Set([n - 1]); ops.vacio(true); } }, { txt: 'Agregar imágenes…', ico: 'importar', on: () => ops.insertarArchivos(null, n) }, { txt: 'Pegar al final', ico: 'duplicar', off: !portaCuadros, on: () => { st.selC = new Set([n - 1]); ops.pegar(); } }]); }); }
    lineaEl.append(caja);
    marcarActual(); setTimeout(() => moverAguja(), 0);
  };
  /** Clic, arrastre para reordenar y borde para alargar un cuadro. */
  const alApretar = (e, i, cel) => {
    if (e.button !== 0) return; const a = hojaA(); if (!a) return;
    const r = cel.getBoundingClientRect(), enBorde = e.clientX > r.right - 7, x0 = e.clientX;
    if (e.ctrlKey || e.metaKey) { st.selC.has(i) ? st.selC.delete(i) : st.selC.add(i); st.ancla = i; pintarPista(); return; }
    if (e.shiftKey) { const lo = Math.min(st.ancla, i), hi = Math.max(st.ancla, i); st.selC = new Set([...Array(hi - lo + 1).keys()].map(k => lo + k)); pintarPista(); return; }
    if (!st.selC.has(i)) { st.selC = new Set([i]); st.ancla = i; }
    pintarPista(); cel.setPointerCapture(e.pointerId);
    const base = baseMs(), dur0 = ((a.cuadros.dur || [])[i]) || base, w0 = cel.offsetWidth; let modo = enBorde ? 'durar' : null, marca = null, destino = null, nuevoMs = dur0;
    const mv = ev => {
      const dx = ev.clientX - x0;
      if (modo === 'durar') { nuevoMs = Math.max(base * 0.25, dur0 * (w0 + dx) / w0); if (!ev.shiftKey) nuevoMs = Math.max(1, Math.round(nuevoMs / base)) * base; cel.style.width = Math.max(st.tamCuadro * 0.6, Math.round(st.tamCuadro * nuevoMs / base)) + 'px'; CK.estado('Duración: ' + Math.round(nuevoMs) + ' ms (×' + (nuevoMs / base).toFixed(2).replace(/\.?0+$/, '') + '). Mayús: sin redondear.'); return; }
      if (!modo && Math.abs(dx) > 5) { modo = 'mover'; marca = h('div.tl-insertar'); pista.append(marca); document.body.style.cursor = 'grabbing'; }
      if (modo === 'mover') { const pr = pista.getBoundingClientRect(), x = ev.clientX - pr.left + pista.scrollLeft, celdas = [...pista.querySelectorAll('.tl-cuadro')]; let at = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth / 2); if (at < 0) at = celdas.length; destino = at; const ref = celdas[at] || celdas[celdas.length - 1]; marca.style.left = (at < celdas.length ? ref.offsetLeft - 3 : ref.offsetLeft + ref.offsetWidth + 1) + 'px'; }
    };
    const up = () => { cel.removeEventListener('pointermove', mv); cel.removeEventListener('pointerup', up); document.body.style.cursor = ''; if (marca) marca.remove();
      if (modo === 'durar') { if (Math.abs(nuevoMs - dur0) > 0.5) { st.selC = new Set([i]); ops.duracion(nuevoMs); } else pintarLinea(); return; }
      if (modo === 'mover') { if (destino !== null) ops.mover(destino); return; }
      st.selC = new Set([i]); st.ancla = i; pintarPista(); irA([...Array(CK.asset.nCuadros(a)).keys()].indexOf(i)); };
    cel.addEventListener('pointermove', mv); cel.addEventListener('pointerup', up);
  };

  const pintarCentro = () => { st._v = (st._v || 0) + 1; if (!lineaEl) return; cacheKey = ''; pintarLinea(); if (vista) { vista.pedir(); encuadreLuego(); } };

  // ---------------------------------------------------------------- guardar / importar / exportar
  const guardarGenerada = async () => {
    if (!st.frames.length) return; const b = CK.P.assets[st.base], def = PIX.ANIMS[st.tipo], nombre = await CK.pedir('Guardar animación', 'Nombre', b.nombre + '_' + st.tipo); if (!nombre) return;
    const fw = Math.max(...st.frames.map(f => f.w)), fh = Math.max(...st.frames.map(f => f.h));
    const a = CK.asset.crear({ nombre, tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(st.frames, st.frames.length)), origen: 'animación "' + def.nombre + '" de ' + b.nombre, cuadros: { fw, fh, fps: st.fps, bucle: !['aparecer', 'golpe', 'humo', 'sacudir'].includes(st.tipo), oy: PIX.animBase(st.tipo, st.params) }, extra: { base: b.id, col: b.col ? CK.clone(b.col) : undefined, receta: { tipo: st.tipo, params: CK.clone(st.params) } } });
    if (st.fxGen.length) a.fxPrueba = CK.clone(st.fxGen);
    if (st.origen && CK.P.mapas[st.origen.mapa]) {
      const m = CK.P.mapas[st.origen.mapa]; let hecho = 0, iguales = 0;
      const fin = CK.hist.datos('Usar animación en el mapa', 'mapas', m.id);
      CK.mapa.objetosDe(m).forEach(o => { if (o.id === st.origen.objeto) { o.asset = a.id; delete o.clave; delete o.anim; if (o.marca) o.marca.estado = 'hecha'; hecho++; } else if (o.asset === b.id) iguales++; });
      fin(); CK.emit('notas');
      if (hecho && iguales && await CK.confirmar('¿Animar también los iguales?', 'En "' + m.nombre + '" hay ' + iguales + ' objeto(s) más con el mismo dibujo (' + b.nombre + '). ¿Les pongo la misma animación?', 'Sí, a todos')) { const f2 = CK.hist.datos('Animar iguales', 'mapas', m.id); CK.mapa.objetosDe(m).forEach(o => { if (o.asset === b.id) { o.asset = a.id; delete o.clave; delete o.anim; if (o.marca) o.marca.estado = 'hecha'; } }); f2(); }
      CK.aviso('Animación guardada y puesta en el mapa "' + m.nombre + '".', 'ok', 4500); st.origen = null;
    } else CK.aviso('Animación guardada: ' + a.nombre);
    st.hoja = a.id; tabs.ir('hoja'); pintarIzq();
  };
  const importarTira = async () => {
    const [f] = await CK.elegirArchivos('image/png,image/gif,image/webp'); if (!f) return; const c = await CK.cargarImagen(f), d = { fw: c.height <= c.width ? c.height : c.width, fh: c.height, fps: 8 };
    const ok = await CK.ventana({ titulo: 'Importar tira de cuadros', cuerpo: h('div', h('p', 'La imagen mide ' + c.width + ' × ' + c.height + ' px. Indicá el tamaño de cada cuadro.'), CK.campo('Ancho del cuadro', CK.num(d.fw, { min: 1, max: c.width }, v => { d.fw = v; })), CK.campo('Alto del cuadro', CK.num(d.fh, { min: 1, max: c.height }, v => { d.fh = v; })), CK.campo('Cuadros por segundo', CK.num(d.fps, { min: 1, max: 30 }, v => { d.fps = v; }))), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Importar', cls: 'pri', valor: true }] });
    if (!ok) return; const a = CK.asset.crear({ nombre: f.name.replace(/\.[a-z0-9]+$/i, ''), tipo: 'hoja', lienzo: c, origen: 'importado: ' + f.name, cuadros: { fw: d.fw, fh: d.fh, fps: d.fps, bucle: true } }); st.hoja = a.id; tabs.ir('hoja'); pintarIzq();
  };
  const importarSueltos = async (archivos) => {
    const fs = (archivos || await CK.elegirArchivos('image/png,image/gif,image/webp', true)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); if (fs.length < 2) { if (fs.length) CK.aviso('Elegí dos o más imágenes (un cuadro por archivo).', 'info'); return; }
    const frs = []; for (const f of fs) frs.push(CK.aPix(await CK.cargarImagen(f))); const fw = Math.max(...frs.map(f => f.w)), fh = Math.max(...frs.map(f => f.h));
    const a = CK.asset.crear({ nombre: fs[0].name.replace(/[_\- ]?\d*\.[a-z0-9]+$/i, '') || 'animacion', tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), origen: 'cuadros sueltos', cuadros: { fw, fh, fps: 8, bucle: true } }); st.hoja = a.id; tabs.ir('hoja'); pintarIzq(); CK.aviso('Armada la hoja con ' + frs.length + ' cuadros');
  };
  /** Datos de la hoja en formato atlas (lo leen Phaser, Godot y Unity con sus importadores de JSON). */
  CK.animDatos = a => { const n = CK.asset.nCuadros(a), frames = {}, ms = Math.round(1000 / (a.cuadros.fps || 8)), dur = a.cuadros.dur || []; for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i); frames[a.id + '_' + String(i).padStart(2, '0')] = { frame: { x: g.x, y: g.y, w: g.w, h: g.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: g.w, h: g.h }, sourceSize: { w: g.w, h: g.h }, duration: Math.round(dur[i] || ms) }; } return { frames, meta: { app: 'Taller CastleKnight', image: a.id + '.png', format: 'RGBA8888', size: { w: a.w, h: a.h }, scale: '1', frameTags: [{ name: a.id, from: 0, to: n - 1, direction: a.cuadros.vaiven ? 'pingpong' : 'forward' }], fps: a.cuadros.fps || 8, repeat: a.cuadros.bucle === false ? 0 : -1 } }; };
  const exportar = async (que, escala) => {
    const a = CK.P.assets[st.hoja]; if (!a || !a.cuadros) return;
    if (que === 'png') { const im = PIX.resizeNearest(CK.asset.pix(a.id), a.w * escala, a.h * escala); CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (escala > 1 ? '_x' + escala : '') + '.png'); }
    else if (que === 'json') CK.descargar(new Blob([JSON.stringify(CK.animDatos(a), null, 1)], { type: 'application/json' }), a.id + '.json');
    else if (que === 'gif') { const { ms } = secuencia(), frs = cuadrosVista().map(CK.aPix); CK.descargar(new Blob([CKGif(frs, { fps: a.cuadros.fps || 8, escala, bucle: a.cuadros.bucle !== false, delays: ms })], { type: 'image/gif' }), a.id + (escala > 1 ? '_x' + escala : '') + '.gif'); }
  };

  // ---------------------------------------------------------------- paneles
  const pintarIzq = () => {
    if (!izq) return; CK.vaciar(izq);
    const pend = pendientes(), lp = h('div.lista');
    pend.forEach(({ mapa, o }) => { const a = CK.P.assets[o.asset], hecha = o.marca.estado === 'hecha'; lp.append(h('div.item' + (st.origen && st.origen.objeto === o.id ? '.activo' : ''), { style: { alignItems: 'flex-start' }, onclick: () => { st.base = o.asset; st.origen = { objeto: o.id, mapa: mapa.id }; if (PIX.ANIMS[o.marca.tipoAnim]) { st.tipo = o.marca.tipoAnim; st.params = {}; } tabs.ir('generar'); pintarIzq(); } }, CK.mini(CK.img[o.asset], 28, a && CK.asset.cuadro(a, 0)), h('div.crece', h('div.nombre', (o.nombre || (a || {}).nombre || 'Objeto') + ' '), h('div.sub', { style: { whiteSpace: 'normal' } }, o.marca.nota || '(sin nota)'), h('div.sub', mapa.nombre)), h('span.etq.' + (hecha ? 'verde' : 'oro'), hecha ? 'hecha' : 'pendiente'))); });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Pendientes de animar (' + pend.filter(p => p.o.marca.estado !== 'hecha').length + ')'), pend.length ? lp : h('p.nota-txt', 'Acá aparecen los objetos que marques con la herramienta "Marcar para animar" (M) en un mapa, con la nota de cómo los querés.')));
    const g = CK.galeria({ tipos: ['hoja', 'personaje', 'fx'], actual: () => st.modo === 'hoja' ? st.hoja : null, alElegir: id => { if (!CK.P.assets[id].cuadros) { CK.aviso('Ese asset todavía no tiene cuadros. Abrilo en Pixel art → "Convertir en animación", o usalo como base para generar.', 'info', 5000); st.base = id; tabs.ir('generar'); return; } st.hoja = id; st.selC = new Set(); tabs.ir('hoja'); }, alDoble: id => CK.ir('pixel', id), pista: 'Clic: verla y ajustarla. Doble clic: editar sus cuadros.', vacio: 'Todavía no hay animaciones.' });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Animaciones del proyecto'), g, h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'hoja', txt: 'Importar tira', cls: 'chico', desc: 'Una sola imagen con todos los cuadros en fila (como las que exporta PixelLab o Aseprite).', on: importarTira }), CK.btn({ ico: 'importar', txt: 'Cuadros sueltos', cls: 'chico', desc: 'Varios archivos, uno por cuadro. Se ordenan por nombre y se arman en una hoja.', on: () => importarSueltos() }), CK.btn({ ico: 'persona', txt: 'Sprites a poses', cls: 'chico', desc: 'Varios archivos de un personaje (walk_sur_1.png, idle_norte_2.png…): se reconocen la acción, la dirección y el número de cuadro, y se arman solas sus poses.', on: () => importarPoses() }))));
  };
  /** Bloque de efectos para probar, en el panel derecho. */
  const bloqueFx = () => {
    const l = fxLista(), b = h('div.bloque', h('h3.bloque-tit', 'Probar con efectos', CK.btn({ ico: 'mas', txt: 'Agregar', cls: 'chico', desc: 'Superpone un efecto (del proyecto, una plantilla o una hoja de efecto) para ver cómo queda con la animación.', on: agregarFx })));
    if (!l.length) { b.append(h('p.nota-txt', 'Sumá un efecto (chispas al golpear, polvo al caminar, aura, fuego…) y ubicalo sobre el personaje. Se ve en la vista y en el GIF de prueba; con "Guardar con los efectos" queda todo en una hoja nueva.')); return b; }
    const lista = h('div.lista');
    l.forEach((e, k) => lista.append(h('div.item' + (k === st.fxSel ? '.activo' : ''), { onclick: () => { st.fxSel = k; tabs.refrescar(); }, oncontextmenu: ev => { st.fxSel = k; CK.menu(ev, [{ titulo: nombreFx(e) }, { txt: e.oculto ? 'Mostrar' : 'Ocultar', ico: e.oculto ? 'ojo' : 'ojoNo', on: () => cambiarFx('Ver efecto', () => { e.oculto = !e.oculto; }) }, { txt: e.detras ? 'Poner delante' : 'Poner detrás', ico: e.detras ? 'subir' : 'bajar', on: () => cambiarFx('Orden del efecto', () => { e.detras = !e.detras; }) }, { txt: 'Duplicar', ico: 'duplicar', on: () => cambiarFx('Duplicar efecto', q => { q.splice(k + 1, 0, CK.clone(e)); }) }, e.tipo === 'fx' ? { txt: 'Editar el efecto', ico: 'fx', on: () => CK.ir('fx', e.id) } : null, '-', { txt: 'Quitar', ico: 'basura', peligro: true, on: () => cambiarFx('Quitar efecto', q => { q.splice(k, 1); st.fxSel = 0; }) }]); setTimeout(() => tabs.refrescar(), 0); } },
      h('span', { html: CK.ico(e.tipo === 'hoja' ? 'hoja' : 'fx', 15) }), h('span.nombre', nombreFx(e)), h('span.sub', e.detras ? 'detrás' : 'delante'),
      CK.btn({ ico: e.oculto ? 'ojoNo' : 'ojo', tip: e.oculto ? 'Mostrar' : 'Ocultar', cls: 'chico plano', on: ev => { ev.stopPropagation(); cambiarFx('Ver efecto', () => { e.oculto = !e.oculto; }); tabs.refrescar(); } }))));
    b.append(lista);
    const e = l[st.fxSel]; if (e) {
      const n = Math.max(1, cuadrosCache().length);
      b.append(h('div.duo', { style: { marginTop: '8px' } }, h('label', h('span.mini-rot', 'Posición →'), CK.num(e.x || 0, { step: 1 }, v => cambiarFx('Posición del efecto', () => { e.x = v; }))), h('label', h('span.mini-rot', 'Posición ↓'), CK.num(e.y || 0, { step: 1 }, v => cambiarFx('Posición del efecto', () => { e.y = v; })))),
        CK.btn({ ico: 'mover', txt: st.moverFx ? 'Listo' : 'Ubicar con el mouse', cls: 'chico' + (st.moverFx ? ' activo' : ''), desc: 'Encendido: hacé clic o arrastrá sobre la vista para poner el efecto ahí.', on: () => { st.moverFx = !st.moverFx; tabs.refrescar(); vista.pedir(); } }),
        CK.campo('Tamaño', CK.rango(e.escala || 1, { min: 0.25, max: 4, step: 0.25 }, (v, fin) => { e.escala = v; if (fin) cambiarFx('Tamaño del efecto', () => { }); vista.pedir(); })),
        CK.campo('Empieza en el cuadro', CK.sel(String(e.desde || 0), [...Array(n).keys()].map(i => [String(i), String(i + 1)]), v => cambiarFx('Cuándo empieza', () => { e.desde = +v; })), 'Para efectos de una sola vez (golpe, polvo): salen cuando la animación llega a ese cuadro.'),
        CK.chk(e.repetir !== false, 'Repetir en cada vuelta', v => cambiarFx('Repetir efecto', () => { e.repetir = v; })),
        CK.chk(!!e.detras, 'Detrás del personaje', v => cambiarFx('Orden del efecto', () => { e.detras = v; })));
    }
    b.append(h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'guardar', txt: 'Guardar con los efectos', cls: 'chico', desc: 'Arma una animación nueva con los efectos dibujados en cada cuadro (en la paleta del proyecto). La original queda igual.', on: hornearConFx })));
    return b;
  };
  const pGenerar = c => {
    st.modo = 'generar'; const b = CK.P.assets[st.base], def = PIX.ANIMS[st.tipo];
    c.append(h('div.bloque', h('h3.bloque-tit', 'Qué animar'), h('div.fila.junto', b ? CK.mini(CK.img[b.id], 48, CK.asset.cuadro(b, 0)) : h('span', { html: CK.ico('imagen', 30) }), h('div.crece', h('b', b ? b.nombre : 'Sin elegir'), b ? h('div.nota-txt', b.w + ' × ' + b.h + ' px') : null), CK.btn({ txt: b ? 'Cambiar' : 'Elegir', cls: b ? 'chico' : 'chico pri', desc: 'El dibujo quieto del que sale la animación.', on: async () => { const id = await CK.elegirAsset('Asset para animar', ['sprite', 'hoja', 'personaje', 'ui', 'fx']); if (id) { st.base = id; st.origen = null; tabs.refrescar(); pintarIzq(); } } })),
      st.origen ? h('p.nota-txt', { style: { color: 'var(--oro)' } }, 'Viene de una marca del mapa: al guardar, se coloca sola en ese objeto.') : null));
    const opsA = Object.keys(PIX.ANIMS).map(k => [k, PIX.ANIMS[k].nombre]);
    const bl = h('div.bloque', h('h3.bloque-tit', 'Movimiento'), CK.campo('Tipo', CK.sel(st.tipo, opsA, v => { st.tipo = v; st.params = {}; tabs.refrescar(); })), h('p.nota-txt', def.desc));
    Object.keys(def.params).forEach(k => { const p = def.params[k], val = st.params[k] === undefined ? p[0] : st.params[k], rot = { cuadros: 'Cuadros', fuerza: 'Fuerza (px)', ondas: 'Ondas', fijo: 'Lado fijo', ancho: 'Ancho del brillo' }[k] || k; if (Array.isArray(p[1])) bl.append(CK.campo(rot, CK.sel(val, p[1], v => { st.params[k] = v; generar(); }))); else bl.append(CK.campo(rot, CK.rango(val, { min: p[1], max: p[2], step: p[0] % 1 ? 0.5 : 1 }, v => { st.params[k] = v; generar(); }))); });
    bl.append(CK.campo('Velocidad', CK.rango(st.fps, { min: 2, max: 24 }, v => { st.fps = v; pintarCentro(); }), 'Cuadros por segundo. Ambiente tranquilo: 4 a 6. Acción: 10 a 12.'), CK.chk(st.usarPaleta, 'Usar solo colores de la paleta', v => { st.usarPaleta = v; generar(); }, 'Los brillos y sombras de la animación toman tonos vecinos de tu paleta, sin inventar colores.'));
    c.append(bl, h('div.bloque', CK.btn({ ico: 'guardar', txt: st.origen ? 'Guardar y poner en el mapa' : 'Guardar animación', cls: 'pri', desc: 'Guarda los cuadros como una hoja de sprites del proyecto.', on: guardarGenerada }), h('p.nota-txt', { style: { marginTop: '8px' } }, 'Estas animaciones mueven y recolorean los píxeles del dibujo original. Sirven para ambiente, objetos y efectos. Para poses nuevas de un personaje (caminar, atacar) hace falta dibujar cada cuadro: usá Pixel art o una base de PixelLab, y acá la alineás y exportás.')), bloqueFx());
    generar();
  };
  const pHoja = c => {
    st.modo = 'hoja'; const a = CK.P.assets[st.hoja];
    if (!a || !a.cuadros) { c.append(CK.vacio('anim', 'Elegí una animación', 'En la lista de la izquierda, o importá una tira de cuadros.')); pintarCentro(); return; }
    const k = a.cuadros, n = CK.asset.nCuadros(a), re = () => { CK.tocar(); a.modificado = Date.now(); pintarCentro(); };
    c.append(h('div.bloque', h('h3.bloque-tit', a.nombre), h('div.duo', h('label', h('span.mini-rot', 'Ancho del cuadro'), CK.num(k.fw, { min: 1, max: a.w }, v => { k.fw = v; re(); })), h('label', h('span.mini-rot', 'Alto del cuadro'), CK.num(k.fh, { min: 1, max: a.h }, v => { k.fh = v; re(); }))),
      a.w % k.fw || a.h % k.fh ? h('p.nota-txt', { style: { color: 'var(--rojo)' } }, 'La hoja (' + a.w + ' × ' + a.h + ') no se divide justo en cuadros de ese tamaño.') : h('p.nota-txt', n + ' cuadros'),
      CK.campo('Velocidad', CK.rango(k.fps || 8, { min: 1, max: 24 }, v => { k.fps = v; re(); }), 'Cuadros por segundo. Cada cuadro puede durar más: arrastrá su borde derecho en la línea de tiempo.'),
      CK.chk(k.bucle !== false, 'Se repite en loop', v => { k.bucle = v; re(); }), CK.chk(!!k.vaiven, 'Ida y vuelta', v => { k.vaiven = v; re(); }, 'Al llegar al último cuadro vuelve hacia atrás en vez de saltar al primero. Queda más suave en banderas y plantas.'),
      k.dur ? h('div.fila', { style: { marginTop: '4px' } }, h('span.nota-txt.crece', 'Hay cuadros con duración propia.'), CK.btn({ txt: 'Igualar duraciones', cls: 'chico', on: () => editarHoja('Igualar duraciones', (f, d) => { d.fill(0); }) })) : null));
    const jit = PIX.frameJitter(PIX.slice(CK.asset.pix(a.id), k.fw, k.fh));
    const aplicar = (nombre, fn) => editarHoja(nombre, (f, d) => { const r = fn(f.map(PIX.clone)); f.splice(0, f.length, ...r); while (d.length > f.length) d.pop(); while (d.length < f.length) d.push(0); });
    c.append(h('div.bloque', h('h3.bloque-tit', 'Arreglar la hoja'), jit > 1 ? h('div.problema.medio', { html: CK.ico('alerta', 18) }, h('div', h('div.pt', 'El dibujo se corre ' + jit + ' px entre cuadros'), h('div.pd', 'Por eso el personaje "salta". Alinealo por los pies.'))) : h('p.nota-txt', 'Los cuadros están alineados.'),
      h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'centrar', txt: 'Alinear por los pies', cls: 'chico', desc: 'Corre cada cuadro para que la base del dibujo quede siempre en el mismo lugar. Es lo que evita que el personaje salte.', on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'pies')) }), CK.btn({ txt: 'Alinear por el centro', cls: 'chico', desc: 'Centra cada cuadro. Mejor para efectos y objetos que giran.', on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'centro')) }),
        CK.btn({ ico: 'bucle', txt: 'Invertir orden', cls: 'chico', on: () => editarHoja('Invertir cuadros', (f, d) => { f.reverse(); d.reverse(); }) }), CK.btn({ ico: 'paleta', txt: 'Llevar a la paleta', cls: 'chico', desc: 'Pasa todos los cuadros a la paleta del proyecto.', on: () => aplicar('Paleta', f => f.map(x => PIX.quantize(x, CK.P.estilo.paleta))) }), CK.btn({ ico: 'limpiar', txt: 'Limpiar', cls: 'chico', desc: 'Bordes duros y sin píxeles sueltos en todos los cuadros.', on: () => aplicar('Limpiar', f => f.map(x => PIX.cleanup(PIX.hardenAlpha(x, 110)))) })),
      h('div.fila', { style: { marginTop: '6px' } }, CK.btn({ ico: 'voltearH', txt: 'Crear versión espejada', cls: 'chico', desc: 'Crea otra animación igual pero mirando al otro lado (para izquierda / derecha).', on: () => { const frs = PIX.slice(CK.asset.pix(a.id), k.fw, k.fh).map(PIX.flipH), nu = CK.asset.crear({ nombre: a.nombre + '_espejo', tipo: a.tipo, lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), cuadros: CK.clone(k), origen: 'espejo de ' + a.nombre }); st.hoja = nu.id; tabs.refrescar(); pintarIzq(); } }), CK.btn({ ico: 'pixel', txt: 'Editar cuadros', cls: 'chico', desc: 'Abre la hoja en Pixel art, con papel cebolla, para retocar cuadro a cuadro.', on: () => editarEnPixel(fisico(rep.i)) }), a.juego ? CK.btn({ ico: 'exportar', txt: 'Devolver al juego', cls: 'chico' + (CK.animJuego.modificada(a) ? ' pri' : ''), desc: 'Esta hoja vino del juego: la reemplaza en su archivo (' + a.juego.archivo + ') con respaldo del original.', on: async () => { if (await CK.animJuego.devolver(a.id)) tabs.refrescar(); } }) : null)));
    c.append(bloqueFx());
    const esc = { v: 4 };
    c.append(h('div.bloque', h('h3.bloque-tit', 'Exportar'), h('p.nota-txt', 'Al usar "Exportar al juego" esta hoja va sola con el resto (con las duraciones de cada cuadro). Estos botones son para llevarla a otro lado.'),
      CK.campo('Ampliar', CK.sel('4', [['1', '×1 (tamaño real, para el juego)'], ['2', '×2'], ['4', '×4 (para mostrar)'], ['8', '×8']], v => { esc.v = +v; }), 'Las ampliaciones no emborronan los píxeles.'),
      h('div.fila', CK.btn({ ico: 'hoja', txt: 'Hoja PNG', cls: 'chico', desc: 'La tira de cuadros como imagen.', on: () => exportar('png', esc.v) }), CK.btn({ ico: 'texto', txt: 'Datos JSON', cls: 'chico', desc: 'Posición y duración de cada cuadro, en el formato de atlas que leen Phaser, Godot y Unity.', on: () => exportar('json') }), CK.btn({ ico: 'play', txt: 'GIF', cls: 'chico', desc: 'La animación en loop (con la duración de cada cuadro), para revisar o para el portfolio.', on: () => exportar('gif', esc.v) })),
      h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'basura', txt: 'Borrar animación', cls: 'chico peligro', on: async () => { if (await CK.asset.preguntarBorrar(a.id)) { st.hoja = null; tabs.refrescar(); pintarIzq(); } } }))));
    pintarCentro();
  };

  // ---------------------------------------------------------------- personaje en 4 direcciones
  const DIRS = [['abajo', 'Abajo (de frente)'], ['izquierda', 'Izquierda'], ['derecha', 'Derecha'], ['arriba', 'Arriba (de espaldas)']];
  const ACC = { quieto: 'Quieto', caminar: 'Caminar', correr: 'Correr', atacar: 'Atacar', herido: 'Herido', morir: 'Morir' };
  let prueba, pj = { x: 0, y: 0, dir: 'abajo', acc: 'quieto', t: 0, teclas: {}, Z: 3 }, cacheFr = {};
  const Pz = () => CK.P.poses[st.pose];
  const framesDe = (id, espejo) => {
    const a = CK.P.assets[id]; if (!a || !CK.img[id]) return []; const k = id + '|' + (a.modificado || 0) + '|' + JSON.stringify(a.cuadros || 0) + (espejo ? 'e' : ''); if (cacheFr[k]) return cacheFr[k];
    const n = CK.asset.nCuadros(a), ord = (a.cuadros && a.cuadros.orden) || [...Array(n).keys()];
    return (cacheFr[k] = ord.map(i => { const g = CK.asset.cuadro(a, i), c = CK.lienzo(g.w, g.h), x = CK.ctx(c); if (espejo) { x.translate(g.w, 0); x.scale(-1, 1); } x.drawImage(CK.img[id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); return c; }));
  };
  /** Cuadros y velocidad de una acción en una dirección (resuelve "izquierda = derecha espejada" y cae a Quieto si falta). */
  const poseDe = (p, acc, dir) => {
    const fila = (p.acciones[acc] || {}), base = p.acciones.quieto || {}; let id = fila[dir], esp = false;
    if (!id && p.espejar && (dir === 'izquierda' || dir === 'derecha')) { const otro = dir === 'izquierda' ? 'derecha' : 'izquierda'; if (fila[otro]) { id = fila[otro]; esp = true; } }
    if (!id && acc !== 'quieto') return poseDe(p, 'quieto', dir);
    if (!id) { id = base.abajo || Object.values(base)[0]; }
    const a = CK.P.assets[id]; return { fr: framesDe(id, esp), fps: (a && a.cuadros && a.cuadros.fps) || 8, falta: !fila[dir] && !esp };
  };
  CK.posesProblemas = p => {
    const out = [], tam = new Set(); Object.keys(p.acciones).forEach(acc => { const f = p.acciones[acc], faltan = DIRS.map(d => d[0]).filter(d => !f[d] && !(p.espejar && (d === 'izquierda' || d === 'derecha') && (f.izquierda || f.derecha)));
      if (faltan.length && faltan.length < 4) out.push((ACC[acc] || acc) + ': falta ' + faltan.join(', ') + '.'); const ns = new Set();
      Object.values(f).forEach(id => { const a = CK.P.assets[id]; if (!a) return; const c = a.cuadros || { fw: a.w, fh: a.h }; tam.add(c.fw + '×' + c.fh); ns.add(CK.asset.nCuadros(a)); });
      if (ns.size > 1) out.push((ACC[acc] || acc) + ': las direcciones tienen distinta cantidad de cuadros (' + [...ns].join(', ') + ').'); });
    if (tam.size > 1) out.push('Los cuadros no miden todos lo mismo (' + [...tam].join(', ') + '): el personaje va a cambiar de tamaño entre poses.');
    return out;
  };
  const cambioPose = (nombre, fn) => { const f = CK.hist.datos(nombre, 'poses', st.pose); fn(Pz()); f(); tabs.refrescar(); };
  const hojaPoses = p => {
    const filas = []; let fw = 1, fh = 1, cols = 1; Object.keys(p.acciones).forEach(acc => DIRS.forEach(d => { const q = poseDe(p, acc, d[0]); if (!q.fr.length) return; filas.push({ n: acc + '_' + d[0], fr: q.fr }); cols = Math.max(cols, q.fr.length); fw = Math.max(fw, q.fr[0].width); fh = Math.max(fh, q.fr[0].height); }));
    const c = CK.lienzo(fw * cols, fh * Math.max(1, filas.length)), x = CK.ctx(c); filas.forEach((f, j) => f.fr.forEach((g, i) => x.drawImage(g, i * fw + Math.floor((fw - g.width) / 2), j * fh + fh - g.height)));
    return { c, fw, fh, filas: filas.map((f, j) => ({ nombre: f.n, fila: j, cuadros: f.fr.length })) };
  };

  // ---- importar sprites sueltos y repartirlos solos en las poses
  const SIN_ACC = { quieto: ['idle', 'quieto', 'parado', 'stand', 'standing', 'respira', 'respirar', 'breath', 'breathing', 'reposo', 'espera'], caminar: ['walk', 'walking', 'caminar', 'camina', 'caminando', 'andar', 'anda', 'move', 'moving'], correr: ['run', 'running', 'correr', 'corre', 'corriendo', 'sprint'], atacar: ['attack', 'atk', 'atacar', 'ataque', 'ataca', 'slash', 'swing', 'strike', 'punch', 'cast'], herido: ['hurt', 'damage', 'dmg', 'herido', 'dano', 'daño', 'hit', 'golpeado'], morir: ['death', 'die', 'dead', 'dying', 'morir', 'muerte', 'muere', 'ko'] };
  const SIN_DIR = { abajo: ['sur', 'south', 'down', 'abajo', 'front', 'frente', 'bottom', 's', 'd'], arriba: ['norte', 'north', 'up', 'arriba', 'back', 'espalda', 'atras', 'top', 'n', 'u'], derecha: ['este', 'east', 'right', 'derecha', 'der', 'e', 'r'], izquierda: ['oeste', 'west', 'left', 'izquierda', 'izq', 'o', 'w', 'l'] };
  const FPS_ACC = { quieto: 5, caminar: 8, correr: 10, atacar: 10, herido: 8, morir: 8 };
  const leerNombre = ruta => {
    const sin = ruta.toLowerCase().replace(/\.[a-z0-9]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    const tk = sin.split(/[\/\\_\-.\s]+/).flatMap(t => t.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/)).filter(Boolean);
    let acc = null, dir = null, num = null;
    tk.forEach(t => { if (!acc) Object.keys(SIN_ACC).forEach(k => { if (!acc && SIN_ACC[k].includes(t)) acc = k; }); });
    tk.forEach(t => { if (!dir && t.length > 1) Object.keys(SIN_DIR).forEach(k => { if (!dir && SIN_DIR[k].includes(t)) dir = k; }); });
    if (!dir) tk.forEach(t => { if (!dir && t.length === 1) Object.keys(SIN_DIR).forEach(k => { if (!dir && SIN_DIR[k].includes(t)) dir = k; }); });
    for (let i = tk.length - 1; i >= 0; i--) if (/^\d+$/.test(tk[i])) { num = +tk[i]; break; }
    return { acc, dir, num, tk };
  };
  const elegirCarpeta = () => new Promise(res => { const i = h('input', { type: 'file', multiple: true, style: { display: 'none' } }); i.webkitdirectory = true; i.addEventListener('change', () => { res([...i.files].filter(f => /\.(png|gif|webp)$/i.test(f.name))); i.remove(); }); document.body.append(i); i.click(); });
  const importarPoses = async (archivos) => {
    let fs = archivos;
    if (!fs) { const como = await CK.ventana({ titulo: 'Sprites a poses', ancho: 520, cuerpo: h('div', h('p', 'Elegí los PNG de un personaje (o la carpeta entera). Por el nombre de cada archivo se reconoce:'), h('ul.nota-txt', h('li', 'la acción: idle / quieto, walk / caminar, run / correr, attack / atacar, hurt / herido, death / morir'), h('li', 'la dirección: sur / down / frente, norte / up / espalda, este / right, oeste / left'), h('li', 'el número de cuadro: el último número del nombre')), h('p.nota-txt', 'Ejemplos: panadero_walk_sur_03.png · idle/norte/2.png · herrero-ataque-este-1.png. Una tira (varios cuadros en fila) también vale. Antes de crear nada te muestro lo que entendí para que lo corrijas.')), botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Elegir carpeta', valor: 'carpeta' }, { txt: 'Elegir archivos', cls: 'pri', valor: 'archivos' }] });
      if (!como) return; fs = como === 'carpeta' ? await elegirCarpeta() : await CK.elegirArchivos('image/png,image/gif,image/webp', true); }
    if (!fs || !fs.length) return;
    // leer y agrupar
    const filas = new Map(), reconocidos = []; let i0 = 0;
    for (const f of fs) {
      const ruta = f.webkitRelativePath || f.name, r = leerNombre(ruta); let im; try { im = CK.aPix(await CK.cargarImagen(f)); } catch (e) { continue; }
      const ims = r.num === null && im.w > im.h * 1.5 && im.w % im.h === 0 ? PIX.slice(im, im.h, im.h) : [im];
      const k = (r.acc || '?') + '|' + (r.dir || '?') + (r.acc && r.dir ? '' : '|' + ruta);
      if (!filas.has(k)) filas.set(k, { acc: r.acc || 'quieto', dir: r.dir || 'abajo', duda: !r.acc || !r.dir, incluir: !!(r.acc || r.dir), cuadros: [], nombre: ruta });
      if (r.acc || r.dir) reconocidos.push(ruta);
      ims.forEach((q, j) => filas.get(k).cuadros.push({ im: q, n: r.num === null ? 1e6 + (i0++) : r.num + j * 0.001, ruta }));
    }
    const lista = [...filas.values()]; if (!lista.length) { CK.aviso('No encontré imágenes que pueda leer.', 'info'); return; }
    lista.forEach(g => g.cuadros.sort((a, b) => a.n - b.n || a.ruta.localeCompare(b.ruta, undefined, { numeric: true })));
    // nombre del personaje: lo que se repite al principio de los nombres
    const pref = (() => { const ns = (reconocidos.length ? reconocidos : fs.map(f => f.webkitRelativePath || f.name)).map(r => r.toLowerCase().split(/[\/\\]/).pop()); let p = ns[0] || ''; ns.forEach(n => { while (p && n.indexOf(p) !== 0) p = p.slice(0, -1); }); p = p.replace(/[_\-\s.\d]+$/, ''); const t = p.split(/[_\-\s.]+/).filter(x => !Object.values(SIN_ACC).flat().includes(x) && !Object.values(SIN_DIR).flat().includes(x)); return t.join('_') || ((fs[0].webkitRelativePath || '').split('/')[0]) || 'personaje'; })();
    const d = { destino: st.pose && CK.P.poses[st.pose] ? st.pose : '__nuevo', nombre: pref, pies: true, espejar: true };
    const tabla = h('div', { style: { maxHeight: '360px', overflow: 'auto', display: 'grid', gap: '4px' } });
    const pintarTabla = () => { CK.vaciar(tabla); lista.forEach(g => { tabla.append(h('div.pose-imp' + (g.duda ? '.duda' : ''), { style: { opacity: g.incluir ? 1 : 0.45 } }, h('input', { type: 'checkbox', checked: g.incluir, onchange: e => { g.incluir = e.target.checked; pintarTabla(); } }), CK.mini(CK.aLienzo(g.cuadros[0].im), 36), h('div', { style: { minWidth: 0 } }, h('div.nombre', g.cuadros.length + ' cuadro' + (g.cuadros.length > 1 ? 's' : '') + (g.duda ? ' · no lo reconocí' : '')), h('div.sub', g.duda ? g.nombre : g.cuadros.map(c => c.ruta.split(/[\/\\]/).pop()).slice(0, 3).join(', ') + (g.cuadros.length > 3 ? '…' : ''))), CK.sel(g.acc, Object.keys(ACC).map(k => [k, ACC[k]]), v => { g.acc = v; g.duda = false; pintarTabla(); }), CK.sel(g.dir, DIRS.map(([k, t]) => [k, t.replace(/ \(.*\)/, '')]), v => { g.dir = v; g.duda = false; pintarTabla(); }))); }); };
    pintarTabla();
    const ok = await CK.ventana({ titulo: 'Sprites a poses: revisá lo que entendí', ancho: 680, cuerpo: h('div', h('p.nota-txt', lista.length + ' grupo(s) de ' + fs.length + ' archivo(s). Corregí acción o dirección donde haga falta (las dudosas están marcadas).'), tabla,
      h('div.duo', { style: { marginTop: '10px' } }, CK.campo('Personaje', CK.sel(d.destino, [['__nuevo', 'Nuevo personaje']].concat(Object.values(CK.P.poses).map(p => [p.id, p.nombre])), v => { d.destino = v; })), CK.campo('Nombre (si es nuevo)', CK.txt(d.nombre, v => { d.nombre = v; }, { vivo: true }))),
      CK.chk(d.pies, 'Alinear todos los cuadros por los pies (mismo tamaño en todas las poses)', v => { d.pies = v; }), CK.chk(d.espejar, 'Si falta izquierda o derecha, usar la otra espejada', v => { d.espejar = v; })), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Crear poses', cls: 'pri', valor: true }] });
    if (!ok) return;
    const usar = lista.filter(g => g.incluir); if (!usar.length) return;
    // juntar grupos con la misma acción y dirección
    const juntos = new Map(); usar.forEach(g => { const k = g.acc + '|' + g.dir; if (!juntos.has(k)) juntos.set(k, { acc: g.acc, dir: g.dir, ims: [] }); juntos.get(k).ims.push(...g.cuadros.map(c => c.im)); });
    // mismo tamaño de cuadro para todo el personaje
    let W = 1, H = 1; juntos.forEach(g => g.ims.forEach(im => { const b = d.pies ? PIX.bbox(im, 40) : null; W = Math.max(W, b ? b.w : im.w); H = Math.max(H, b ? b.h : im.h); }));
    if (d.pies) { W += 2; H += 1; }
    let p; const antesPose = d.destino !== '__nuevo' ? JSON.stringify(CK.P.poses[d.destino]) : null, creados = [];
    if (d.destino === '__nuevo') { const nombre = (d.nombre || 'personaje').trim(); let id = CK.slug(nombre), n = 2; while (CK.P.poses[id]) id = CK.slug(nombre) + '_' + (n++); p = CK.P.poses[id] = { id, nombre, espejar: d.espejar, acciones: { quieto: {}, caminar: {} } }; }
    else { p = CK.P.poses[d.destino]; if (d.espejar) p.espejar = true; }
    juntos.forEach(g => {
      const frs = g.ims.map(im => { const o = PIX.make(W, H); if (d.pies) { const b = PIX.bbox(im, 40); if (b) { const parte = PIX.crop(im, b.x, b.y, b.w, b.h); PIX.blit(o, parte, Math.round((W - b.w) / 2), H - b.h, false); } } else PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false); return o; });
      const a = CK.asset.crear({ nombre: p.nombre + '_' + g.acc + '_' + g.dir, tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), origen: 'sprites importados a poses', cuadros: { fw: W, fh: H, fps: FPS_ACC[g.acc] || 8, bucle: !['atacar', 'herido', 'morir'].includes(g.acc) } });
      if (p.carpeta) a.carpeta = p.carpeta; else a.carpeta = 'personajes/' + CK.slug(p.nombre);
      creados.push(a.id); p.acciones[g.acc] = p.acciones[g.acc] || {}; p.acciones[g.acc][g.dir] = a.id;
    });
    const pid = p.id, despues = JSON.stringify(p);
    CK.hist.push({ nombre: 'Sprites a poses', deshacer: () => { creados.forEach(id => CK.asset.borrar(id)); if (antesPose) CK.P.poses[pid] = JSON.parse(antesPose); else delete CK.P.poses[pid]; CK.emit('assets'); }, rehacer: () => { CK.aviso('Para rehacer, volvé a importar los sprites.', 'info'); } });
    CK.tocar(); st.pose = pid; tabs.ir('poses'); pintarIzq();
    CK.aviso('Listo: ' + juntos.size + ' animación(es) en "' + p.nombre + '" (cuadros de ' + W + ' × ' + H + ').', 'ok', 5000);
  };

  const pPoses = c => {
    st.modo = 'poses'; const lista = Object.values(CK.P.poses); if (!CK.P.poses[st.pose]) st.pose = (lista[0] || {}).id || null; const p = Pz();
    const nuevo = async () => { const nombre = await CK.pedir('Personaje nuevo', 'Nombre (héroe, guardia, aldeana…)', ''); if (!nombre) return; let id = CK.slug(nombre), n = 2; while (CK.P.poses[id]) id = CK.slug(nombre) + '_' + (n++); CK.P.poses[id] = { id, nombre, espejar: true, acciones: { quieto: {}, caminar: {} } }; CK.tocar(); st.pose = id; tabs.refrescar(); };
    c.append(h('div.bloque', h('h3.bloque-tit', 'Personaje', CK.btn({ ico: 'mas', txt: 'Nuevo', cls: 'chico' + (lista.length ? '' : ' pri'), on: nuevo })),
      lista.length ? CK.sel(st.pose, lista.map(q => [q.id, q.nombre]), v => { st.pose = v; tabs.refrescar(); }) : h('p.nota-txt', 'Juntá acá las animaciones de un personaje en sus cuatro direcciones para verlas andar juntas y encontrar la que desentona.'),
      h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'importar', txt: 'Importar sprites a las poses', cls: 'chico' + (lista.length ? '' : ' pri'), desc: 'Elegí los PNG (o la carpeta) de un personaje: por el nombre se reparten solos en su acción, dirección y número de cuadro. También podés soltarlos acá.', on: () => importarPoses() }))));
    CK.soltarEn(c, fs => importarPoses(fs));
    if (!p) { pintarPrueba(); return; }
    const bl = h('div.bloque', h('h3.bloque-tit', 'Poses'), CK.chk(p.espejar, 'Izquierda y derecha se espejan', v => cambioPose('Espejar', q => { q.espejar = v; }), 'Si dibujaste solo un lado, el otro se arma dándolo vuelta.'));
    Object.keys(p.acciones).forEach(acc => {
      const g = h('div.poses-fila', h('div.fila.junto', h('b.crece', ACC[acc] || acc), CK.btn({ ico: 'play', tip: 'Ver esta acción', cls: 'chico plano' + (pj.fijo === acc ? ' activo' : ''), desc: 'Muestra esta acción en la prueba (clic otra vez para volver a moverte libre).', on: () => { pj.fijo = pj.fijo === acc ? null : acc; tabs.refrescar(); } }), acc !== 'quieto' ? CK.btn({ ico: 'cerrar', tip: 'Quitar acción', cls: 'chico plano', on: () => cambioPose('Quitar acción', q => { delete q.acciones[acc]; }) }) : null), h('div.poses-dirs'));
      DIRS.forEach(([d, rot]) => { const id = p.acciones[acc][d], q = poseDe(p, acc, d), esp = !id && p.espejar && (d === 'izquierda' || d === 'derecha') && q.fr.length && !q.falta;
        const elegir = async () => { const nid = await CK.elegirAsset((ACC[acc] || acc) + ' · ' + rot, ['hoja', 'personaje', 'sprite']); if (nid) cambioPose('Asignar pose', z => { z.acciones[acc][d] = nid; }); };
        const b = h('button.pose-celda' + (id ? '.puesta' : esp ? '.espejo' : ''), { type: 'button', onclick: elegir, oncontextmenu: e => CK.menu(e, [{ titulo: (ACC[acc] || acc) + ' · ' + rot }, { txt: id ? 'Cambiar…' : 'Elegir animación…', ico: 'imagen', on: elegir }, id ? { txt: 'Abrir en la línea de tiempo', ico: 'anim', on: () => { st.hoja = id; st.selC = new Set(); tabs.ir('hoja'); } } : null, id ? { txt: 'Editar en Pixel art', ico: 'pixel', on: () => CK.ir('pixel', id) } : null, { txt: 'Importar sprites a las poses…', ico: 'importar', on: () => importarPoses() }, id ? '-' : null, id ? { txt: 'Quitar', ico: 'cerrar', peligro: true, on: () => cambioPose('Quitar pose', z => { delete z.acciones[acc][d]; }) } : null]) }, (id || esp) && q.fr[0] ? CK.mini(q.fr[0], 44) : h('span', { html: CK.ico('mas', 18) }), h('span', d));
        CK.tip(b, rot, id ? CK.P.assets[id].nombre + ' · ' + q.fr.length + ' cuadros. Clic: cambiar · Clic derecho: opciones.' : esp ? 'Espejada del otro lado. Clic para poner una propia.' : 'Clic para elegir la animación de esta dirección.'); g.lastChild.append(b); });
      bl.append(g);
    });
    const libres = Object.keys(ACC).filter(k => !p.acciones[k]);
    bl.append(h('div.fila', { style: { marginTop: '8px' } }, libres.map(k => CK.btn({ ico: 'mas', txt: ACC[k], cls: 'chico', on: () => cambioPose('Agregar acción', q => { q.acciones[k] = {}; }) }))));
    c.append(bl);
    const pr = CK.posesProblemas(p);
    c.append(h('div.bloque', h('h3.bloque-tit', 'Revisión'), pr.length ? pr.map(t => h('div.problema.medio', { html: CK.ico('alerta', 16) }, h('div', h('div.pd', t)))) : h('div.problema.leve', { html: CK.ico('ok', 16) }, h('div', h('div.pd', 'Mismo tamaño y misma cantidad de cuadros en todas las direcciones.')))),
      h('div.bloque', h('h3.bloque-tit', 'Sacar'), h('div.fila', CK.btn({ ico: 'hoja', txt: 'Hoja completa', cls: 'chico', desc: 'Arma una sola hoja con una fila por acción y dirección, y la guarda como asset junto con un JSON que dice qué hay en cada fila.', on: () => { const r = hojaPoses(p); const a = CK.asset.crear({ nombre: p.nombre + '_hoja', tipo: 'personaje', lienzo: r.c, origen: 'poses de ' + p.nombre, cuadros: { fw: r.fw, fh: r.fh, fps: 8, bucle: true }, extra: { filas: r.filas } }); CK.descargar(new Blob([JSON.stringify({ cuadro: [r.fw, r.fh], filas: r.filas }, null, 1)], { type: 'application/json' }), a.id + '.json'); CK.aviso('Hoja guardada como "' + a.nombre + '" (' + r.filas.length + ' filas).'); pintarIzq(); } }),
        CK.btn({ ico: 'basura', txt: 'Borrar personaje', cls: 'chico peligro', on: async () => { if (await CK.confirmar('Borrar personaje', 'Se borra el conjunto de poses de "' + p.nombre + '". Las animaciones quedan en el proyecto.', 'Borrar')) { const f = CK.hist.datos('Borrar personaje', 'poses', p.id); delete CK.P.poses[p.id]; f(); st.pose = null; tabs.refrescar(); } } })),
        h('p.nota-txt', 'Probalo en el centro: flechas o WASD para caminar, rueda del mouse para acercar. Las poses nuevas se dibujan en Pixel art o se traen de PixelLab; acá se ordenan y se controlan.')));
    pintarPrueba();
  };
  let rafP = 0, tPrev = 0;
  const pintarPrueba = () => {
    if (!prueba) return; const enPoses = st.modo === 'poses'; prueba.style.display = enPoses ? '' : 'none'; vistaCv.parentElement.style.display = enPoses ? 'none' : '';
    lineaEl.style.display = enPoses ? 'none' : '';
    cancelAnimationFrame(rafP); if (!enPoses) { if (vista) { vista.medir(); } return; } tPrev = performance.now();
    const paso = now => {
      if (st.modo !== 'poses' || CK.seccion_actual !== 'anim') return; rafP = requestAnimationFrame(paso); const dt = Math.max(0, Math.min(0.05, (now - tPrev) / 1000)); tPrev = now;
      const W = prueba.width, H = prueba.height, x = CK.ctx(prueba), p = Pz(), Z = pj.Z; x.imageSmoothingEnabled = false;
      for (let j = 0; j < H; j += 48) for (let i = 0; i < W; i += 48) { x.fillStyle = ((i + j) / 48) % 2 ? '#4f8140' : '#4a7a3b'; x.fillRect(i, j, 48, 48); }
      if (!p) return;
      const k = pj.teclas, dx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), dy = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0), mueve = dx || dy;
      if (mueve) { pj.dir = Math.abs(dx) >= Math.abs(dy) && dx ? (dx < 0 ? 'izquierda' : 'derecha') : dy < 0 ? 'arriba' : 'abajo'; const v = 70 * dt / Math.hypot(dx, dy); pj.x = Math.max(30, Math.min(W - 30, pj.x + dx * v * Z)); pj.y = Math.max(60, Math.min(H - 60, pj.y + dy * v * Z)); }
      const acc = pj.fijo || (mueve ? 'caminar' : 'quieto'); if (acc !== pj.acc) { pj.acc = acc; pj.t = 0; } pj.t += dt;
      // los cuatro lados arriba, para comparar
      DIRS.forEach(([d], i) => { const q = poseDe(p, pj.fijo || 'caminar', d); if (!q.fr.length) return; const f = q.fr[Math.floor(pj.t * q.fps) % q.fr.length], cx = W / 2 + (i - 1.5) * 92; x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(cx - 40, 8, 80, 84); x.drawImage(f, Math.round(cx - f.width), 88 - f.height * 2, f.width * 2, f.height * 2); x.fillStyle = '#fff'; x.font = '10px sans-serif'; x.textAlign = 'center'; x.fillText(d, cx, 20); });
      const q = poseDe(p, acc, pj.dir); if (!q.fr.length) return; const f = q.fr[Math.floor(pj.t * q.fps) % q.fr.length];
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(pj.x, pj.y, 9 * Z, 3 * Z, 0, 0, 7); x.fill();
      x.drawImage(f, Math.round(pj.x - f.width * Z / 2), Math.round(pj.y - f.height * Z + (f.height * Z * 0.14)), f.width * Z, f.height * Z);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(W - 58, H - 22, 52, 16); x.fillStyle = '#fff'; x.font = '11px sans-serif'; x.textAlign = 'center'; x.fillText('×' + Z, W - 32, H - 10);
    };
    rafP = requestAnimationFrame(paso);
  };
  window.addEventListener('keydown', e => { if (CK.seccion_actual !== 'anim' || st.modo !== 'poses' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) { pj.teclas[k] = true; e.preventDefault(); } });
  window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; delete pj.teclas[k]; });

  const crear = raiz => {
    el = raiz; el.style.gridTemplateColumns = '292px 1fr 318px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } }); der = h('aside.panel');
    vistaCv = h('canvas.lienzo'); sobreVista = h('div.sobre');
    const tablero = h('div.tablero', vistaCv, sobreVista);
    vista = CK.vista(vistaCv, { pintar: pintarVista, herramienta: herramientaVista, zoom: 4 });
    tablero.append(h('div.sobre.abajo.der', CK.tiraZoom(vista, encuadre)));
    vistaCv.addEventListener('contextmenu', menuVista);
    cajaRep = h('div', { style: { position: 'relative', display: 'grid', minHeight: 0, overflow: 'hidden' } }, tablero);
    lineaEl = h('div.tl', {});
    centro = h('div', { style: { display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } }, cajaRep, lineaEl);
    prueba = h('canvas', { width: 620, height: 440, style: { display: 'none', borderRadius: '10px', border: '1px solid var(--linea)', maxWidth: 'calc(100% - 24px)', imageRendering: 'pixelated', justifySelf: 'center', alignSelf: 'center' } }); cajaRep.append(prueba); pj.x = 310; pj.y = 300;
    prueba.addEventListener('wheel', e => { e.preventDefault(); pj.Z = Math.max(1, Math.min(8, pj.Z + (e.deltaY < 0 ? 1 : -1))); }, { passive: false });
    prueba.addEventListener('contextmenu', e => CK.menu(e, [{ titulo: 'Prueba del personaje' }, ...[1, 2, 3, 4, 6, 8].map(z => ({ txt: 'Zoom ×' + z, activo: pj.Z === z, on: () => { pj.Z = z; } })), '-', { txt: 'Importar sprites a las poses…', ico: 'importar', on: () => importarPoses() }]));
    tabs = CK.pestanas([{ id: 'generar', txt: 'Generar', ico: 'varita', desc: 'Crear movimiento a partir de un dibujo quieto.', pintar: c => { pGenerar(c); pintarPrueba(); encuadreLuego(); } }, { id: 'hoja', txt: 'Hoja', ico: 'hoja', desc: 'Ajustar, alinear, ordenar en la línea de tiempo y exportar una animación guardada.', pintar: c => { pHoja(c); pintarPrueba(); encuadreLuego(); } }, { id: 'poses', txt: 'Personaje', ico: 'persona', desc: 'Las animaciones de un personaje en sus cuatro direcciones, con prueba de caminata. Se pueden importar sprites sueltos y se reparten solos.', pintar: pPoses }, { id: 'juego', txt: 'Juego', ico: 'importar', desc: 'Traer animaciones del juego, retocar sus cuadros en Pixel art y devolverlas: se reemplazan solas en el juego.', pintar: c => CK.animJuego.pintar(c, id => { st.hoja = id; tabs.ir('hoja'); pintarIzq(); }) }], 'generar');
    der.append(tabs); el.append(izq, centro, der);
    pintarSobre();
    CK.on('notas', () => { if (CK.seccion_actual === 'anim') pintarIzq(); });
    CK.on('asset-img', id => { if (CK.seccion_actual === 'anim' && id === st.hoja) { cacheKey = ''; pintarLinea(); vista.pedir(); } });
    CK.on('datos', g => { if (CK.seccion_actual === 'anim' && g === 'assets') { cacheKey = ''; pintarLinea(); vista.pedir(); } });
    raf = requestAnimationFrame(bucle);
  };
  let ultimoEnc = '';
  const encuadreLuego = () => setTimeout(() => { const fr = cuadrosCache()[0], k = st.modo + ':' + (st.modo === 'hoja' ? st.hoja : st.base) + ':' + (fr ? fr.width + 'x' + fr.height : ''); if (k !== ultimoEnc && fr) { ultimoEnc = k; encuadre(); } }, 30);
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && arg.asset && CK.P.assets[arg.asset]) { const a = CK.P.assets[arg.asset]; if (a.cuadros && !arg.objeto && !arg.generar) { st.hoja = a.id; st.selC = new Set(); tabs.ir('hoja'); } else { st.base = a.id; st.origen = arg.objeto ? { objeto: arg.objeto, mapa: arg.mapa } : null; const o = arg.objeto && CK.mapa.buscarObj(arg.objeto); if (o && o.marca && PIX.ANIMS[o.marca.tipoAnim]) { st.tipo = o.marca.tipoAnim; st.params = {}; } tabs.ir('generar'); } }
    else if (arg && arg.pose) { st.pose = arg.pose; tabs.ir('poses'); }
    else { if (st.base && !CK.P.assets[st.base]) st.base = null; if (st.hoja && !CK.P.assets[st.hoja]) st.hoja = null; tabs.refrescar(); }
    pintarIzq(); if (vista) vista.medir();
  };
  const tecla = (e, k, ctrl) => {
    if (st.modo === 'poses') return false;
    if (k === ' ') { ponerPlay(!rep.play); pintarLinea(); return true; }
    if (k === ',' || k === '.') { irA(rep.i + (k === '.' ? 1 : -1)); return true; }
    if (k === 'home') { irA(0); return true; } if (k === 'end') { irA(secuencia().fr.length - 1); return true; }
    if (k === '0') { encuadre(); return true; } if (k === '+' || k === '=') { vista.zoomEn(1); return true; } if (k === '-') { vista.zoomEn(-1); return true; }
    if (st.modo !== 'hoja' || !hojaA()) return false;
    const n = CK.asset.nCuadros(hojaA());
    if (k === 'delete' || k === 'backspace') { ops.borrar(); return true; }
    if (ctrl && k === 'd') { ops.duplicar(); return true; } if (ctrl && k === 'c') { ops.copiar(); return true; } if (ctrl && k === 'v') { ops.pegar(); return true; }
    if (ctrl && k === 'a') { st.selC = new Set([...Array(n).keys()]); pintarPista(); return true; }
    if (k === 'arrowleft' || k === 'arrowright') { const d = k === 'arrowright' ? 1 : -1, s = selOrden(); if (e.altKey && s.length) { ops.mover(d > 0 ? s[s.length - 1] + 2 : Math.max(0, s[0] - 1)); return true; } const cur = s.length ? (d > 0 ? s[s.length - 1] : s[0]) : fisico(rep.i), j = Math.max(0, Math.min(n - 1, cur + d)); if (e.shiftKey) st.selC.add(j); else { st.selC = new Set([j]); st.ancla = j; } pintarPista(); irA(j); return true; }
    if (k === 'enter') { const s = selOrden(); if (s.length === 1) editarEnPixel(s[0]); return true; }
    return false;
  };
  CK.registrar({ id: 'anim', nombre: 'Animaciones', corto: 'Animar', ico: 'anim', desc: 'Generá movimiento desde un dibujo quieto, ordená los cuadros en la línea de tiempo, probalos con efectos y exportá PNG, datos y GIF.', crear, mostrar, tecla, alCambiarProyecto: () => { st.base = st.hoja = st.origen = st.pose = null; st.frames = []; st.fxGen = []; st.selC = new Set(); cacheFr = {}; reiniciarFx(); } });
})();
