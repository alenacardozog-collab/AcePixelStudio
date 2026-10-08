/* COMÚN: piezas que comparten varias secciones: vista con zoom y desplazamiento, galería de assets, muestras de color, importar imágenes. */
'use strict';

CK.registrar = def => { CK.secciones[def.id] = def; CK.orden.push(def.id); };

/** Lienzo con zoom (rueda) y desplazamiento (barra espaciadora o botón del medio + arrastrar).
    o = { pintar(ctx, vista), herramienta: { bajar, mover, subir, pasar, salir }, fondo } — las coordenadas que recibe la herramienta son del mundo. */
CK.Vista = class {
  constructor(canvas, o = {}) {
    this.c = canvas; this.o = o; this.z = o.zoom || 2; this.tx = 20; this.ty = 20; this.dpr = 1; this._pend = false; this.espacio = false; this.m = { x: 0, y: 0 };
    this.NIVELES = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
    new ResizeObserver(() => this.medir()).observe(canvas);
    canvas.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) { this.tx -= e.deltaY; } else this.zoomEn(e.deltaY < 0 ? 1 : -1, e.offsetX, e.offsetY); this.pedir(); }, { passive: false });
    canvas.addEventListener('pointerdown', e => this._bajar(e));
    canvas.addEventListener('pointermove', e => this._mover(e));
    canvas.addEventListener('pointerup', e => this._subir(e));
    canvas.addEventListener('pointercancel', e => this._subir(e));
    canvas.addEventListener('pointerleave', () => { if (this.o.herramienta && this.o.herramienta.salir) this.o.herramienta.salir(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.medir();
  }
  medir() { const r = this.c.getBoundingClientRect(); this.dpr = window.devicePixelRatio || 1; const w = Math.max(1, Math.round(r.width * this.dpr)), h = Math.max(1, Math.round(r.height * this.dpr)); if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; } this.w = r.width; this.h = r.height; this.pedir(); }
  aMundo(sx, sy) { return { x: (sx - this.tx) / this.z, y: (sy - this.ty) / this.z }; }
  aPantalla(wx, wy) { return { x: wx * this.z + this.tx, y: wy * this.z + this.ty }; }
  zoomEn(dir, sx, sy) {
    const i = this.NIVELES.findIndex(n => n >= this.z - 1e-6), j = CK.clamp((i < 0 ? this.NIVELES.length - 1 : i) + dir, 0, this.NIVELES.length - 1), nz = this.NIVELES[j];
    if (sx === undefined) { sx = this.w / 2; sy = this.h / 2; }
    const w = this.aMundo(sx, sy); this.z = nz; this.tx = Math.round(sx - w.x * nz); this.ty = Math.round(sy - w.y * nz);
    if (this.o.alZoom) this.o.alZoom(nz); this.pedir();
  }
  encuadrar(w, h, margen = 30) {
    if (!this.w || !this.h) { this._enc = [w, h, margen]; return; }
    let z = Math.min((this.w - margen * 2) / w, (this.h - margen * 2) / h), best = this.NIVELES[0];
    for (const n of this.NIVELES) if (n <= z) best = n;
    this.z = best; this.tx = Math.round((this.w - w * best) / 2); this.ty = Math.round((this.h - h * best) / 2); if (this.o.alZoom) this.o.alZoom(best); this.pedir();
  }
  centrarEn(x, y) { this.tx = Math.round(this.w / 2 - x * this.z); this.ty = Math.round(this.h / 2 - y * this.z); this.pedir(); }
  pedir() { if (this._pend) return; this._pend = true; requestAnimationFrame(() => { this._pend = false; if (!this.c.isConnected || !this.w) return; if (this._enc) { const e = this._enc; this._enc = null; this.encuadrar(...e); } const x = this.c.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.imageSmoothingEnabled = false; x.clearRect(0, 0, this.w, this.h); if (this.o.pintar) this.o.pintar(x, this); }); }
  /** Aplica la transformación del mundo (llamar dentro de pintar, entre save y restore). */
  mundo(x) { x.translate(this.tx, this.ty); x.scale(this.z, this.z); }
  _ev(e) { const r = this.c.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, w = this.aMundo(sx, sy); return { x: w.x, y: w.y, sx, sy, boton: e.button, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, e }; }
  _bajar(e) {
    this.c.setPointerCapture(e.pointerId); const m = this._ev(e);
    if (e.button === 1 || this.espacio || (this.o.manoSiempre && this.o.manoSiempre())) { this._pan = { sx: m.sx, sy: m.sy, tx: this.tx, ty: this.ty }; this.c.style.cursor = 'grabbing'; return; }
    this._abajo = true; if (this.o.herramienta && this.o.herramienta.bajar) this.o.herramienta.bajar(m);
  }
  _mover(e) {
    const m = this._ev(e); this.m = m;
    if (this._pan) { this.tx = this._pan.tx + (m.sx - this._pan.sx); this.ty = this._pan.ty + (m.sy - this._pan.sy); this.pedir(); return; }
    const t = this.o.herramienta; if (!t) return;
    if (this._abajo) { if (t.mover) t.mover(m); } else if (t.pasar) t.pasar(m);
  }
  _subir(e) {
    if (this._pan) { this._pan = null; this.c.style.cursor = ''; return; }
    if (!this._abajo) return; this._abajo = false; const m = this._ev(e); if (this.o.herramienta && this.o.herramienta.subir) this.o.herramienta.subir(m);
  }
  /** Grilla de fondo en coordenadas del mundo. */
  grilla(x, paso, w, h, color = 'rgba(255,255,255,.09)') {
    if (paso * this.z < 5) return; x.save(); x.strokeStyle = color; x.lineWidth = 1; x.beginPath();
    for (let gx = 0; gx <= w; gx += paso) { const p = Math.round(gx * this.z + this.tx) + .5; x.moveTo(p, this.ty); x.lineTo(p, this.ty + h * this.z); }
    for (let gy = 0; gy <= h; gy += paso) { const p = Math.round(gy * this.z + this.ty) + .5; x.moveTo(this.tx, p); x.lineTo(this.tx + w * this.z, p); }
    x.stroke(); x.restore();
  }
};
// barra espaciadora = mano, en cualquier vista
window.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { CK._espacio = true; (CK._vistas || []).forEach(v => { v.espacio = true; v.c.style.cursor = 'grab'; }); e.preventDefault(); } });
window.addEventListener('keyup', e => { if (e.code === 'Space') { CK._espacio = false; (CK._vistas || []).forEach(v => { v.espacio = false; v.c.style.cursor = ''; }); } });
CK.vista = (canvas, o) => { const v = new CK.Vista(canvas, o); (CK._vistas = CK._vistas || []).push(v); return v; };

/** Controles de zoom listos para poner sobre un tablero. */
CK.tiraZoom = (vista, encuadre) => {
  const txt = CK.h('span.txt', '');
  const pintar = () => { txt.textContent = Math.round(vista.z * 100) + '%'; };
  vista.o.alZoom = pintar; pintar();
  return CK.h('div.tira',
    CK.btn({ ico: 'lupaMenos', tip: 'Alejar', desc: 'Achica la vista. También con la rueda del mouse.', tecla: '-', cls: 'chico plano', on: () => vista.zoomEn(-1) }), txt,
    CK.btn({ ico: 'lupaMas', tip: 'Acercar', desc: 'Agranda la vista. También con la rueda del mouse.', tecla: '+', cls: 'chico plano', on: () => vista.zoomEn(1) }),
    CK.btn({ ico: 'centrar', tip: 'Ver todo', desc: 'Encuadra todo el contenido en pantalla.', tecla: '0', cls: 'chico plano', on: () => encuadre() }));
};

/** Galería de assets. o = { tipos, actual(), alElegir(id), alDoble(id), grande, vacio } */
CK.galeria = o => {
  let filtro = '';
  const grid = CK.h('div.galeria' + (o.grande ? '.grande' : '')), cont = CK.h('div.galeria-caja');
  const buscar = CK.h('input.in', { type: 'search', placeholder: 'Buscar…', oninput: e => { filtro = e.target.value.toLowerCase(); pintar(); } });
  const pintar = () => {
    CK.vaciar(grid); if (!CK.P) return;
    const tipos = typeof o.tipos === 'function' ? o.tipos() : o.tipos;
    const lista = CK.asset.lista(tipos).filter(a => !filtro || a.nombre.toLowerCase().includes(filtro) || a.id.includes(filtro) || (a.etiquetas || []).join(' ').includes(filtro));
    if (!lista.length) { grid.append(CK.h('div.nota-txt', { style: { gridColumn: '1 / -1' } }, o.vacio || (filtro ? 'Nada coincide con la búsqueda.' : 'Todavía no hay assets de este tipo.'))); return; }
    const act = o.actual ? o.actual() : null;
    lista.forEach(a => {
      const t = CK.h('button.tarjeta' + (a.id === act ? '.activo' : ''), { type: 'button', onclick: () => { if (o.alElegir) o.alElegir(a.id); pintar(); }, ondblclick: () => o.alDoble && o.alDoble(a.id), draggable: o.arrastrar ? 'true' : null, ondragstart: e => e.dataTransfer.setData('text/ck-asset', a.id) },
        CK.mini(CK.img[a.id], o.grande ? 80 : 48, CK.asset.cuadro(a, 0)), CK.h('span.tn', a.nombre), a.cuadros ? CK.h('span.marca-t', String(CK.asset.nCuadros(a))) : null);
      CK.tip(t, a.nombre, (CK.asset.TIPOS[a.tipo] || a.tipo) + ' · ' + (a.cuadros ? a.cuadros.fw + '×' + a.cuadros.fh + ' px, ' + CK.asset.nCuadros(a) + ' cuadros' : a.w + '×' + a.h + ' px') + (o.pista ? '. ' + o.pista : ''));
      grid.append(t);
    });
  };
  cont.append(o.sinBuscar ? null : CK.h('div', { style: { marginBottom: '6px' } }, buscar), grid);
  cont.refrescar = pintar; CK.on('assets', () => { if (cont.isConnected) pintar(); }); CK.on('proyecto', () => { if (cont.isConnected) pintar(); });
  pintar(); return cont;
};
/** Ventana para elegir un asset. Devuelve una promesa con el id (o null). */
CK.elegirAsset = (titulo, tipos, extra) => new Promise(res => {
  let elegido = null;
  const g = CK.galeria({ tipos, grande: true, actual: () => elegido, alElegir: id => { elegido = id; }, alDoble: id => cuerpo.closest('.ventana').cerrar(id) });
  const cuerpo = CK.h('div', g, extra || null);
  CK.ventana({ titulo, ancho: 640, cuerpo, botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Elegir', cls: 'pri', valor: () => elegido }] }).then(res);
});

/** Fila de muestras de color. o = { actual(), alElegir(hex, e), chicas } */
CK.muestras = (colores, o = {}) => {
  const cont = CK.h('div.muestras' + (o.chicas ? '.chicas' : ''));
  const pintar = () => {
    CK.vaciar(cont); const cs = typeof colores === 'function' ? colores() : colores, act = o.actual ? o.actual() : null;
    cs.forEach((hex, i) => { const b = CK.h('button.muestra' + (hex === act ? '.activo' : ''), { type: 'button', style: { background: hex }, onclick: e => { if (o.alElegir) o.alElegir(hex, e, i); pintar(); }, oncontextmenu: e => { e.preventDefault(); if (o.alDerecho) o.alDerecho(hex, e, i); pintar(); } }); CK.tip(b, hex.toUpperCase(), o.pista || 'Clic para usar este color.'); cont.append(b); });
    if (!cs.length) cont.append(CK.h('span.nota-txt', 'Sin colores todavía.'));
  };
  pintar(); cont.refrescar = pintar; return cont;
};

/** Trae imágenes del disco como assets. Detecta tilesets 4×4 por el nombre. */
CK.importarImagenes = async (tipo = 'sprite', archivos) => {
  const fs = archivos || await CK.elegirArchivos('image/png,image/gif,image/jpeg,image/webp', true), out = [];
  for (const f of fs) {
    try {
      const c = await CK.cargarImagen(f), nombre = f.name.replace(/\.[a-z0-9]+$/i, ''); let t = tipo, extra = {};
      if (/tileset/i.test(nombre) && c.width === c.height && c.width % 4 === 0) { t = 'tileset'; extra.tileset = { tile: c.width / 4, forma: 'wang16' }; }
      out.push(CK.asset.crear(Object.assign({ nombre, tipo: t, lienzo: c, origen: 'importado: ' + f.name }, extra)));
    } catch (e) { CK.aviso('No pude leer ' + f.name, 'error'); }
  }
  if (out.length) CK.aviso(out.length === 1 ? 'Importado: ' + out[0].nombre : 'Importadas ' + out.length + ' imágenes');
  return out;
};
/** Deja soltar archivos de imagen sobre un elemento. */
CK.soltarEn = (el, fn) => {
  el.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('soltando'); } });
  el.addEventListener('dragleave', () => el.classList.remove('soltando'));
  el.addEventListener('drop', e => { el.classList.remove('soltando'); const fs = [...e.dataTransfer.files].filter(f => /^image\//.test(f.type)); if (fs.length) { e.preventDefault(); fn(fs, e); } });
};
/** Pestañas simples: tabs = [{id, txt, ico, pintar(el)}]. */
CK.pestanas = (tabs, inicial) => {
  const cab = CK.h('div.pest'), cuerpo = CK.h('div.pest-cuerpo'), cont = CK.h('div.pest-caja', cab, cuerpo); let act = inicial || tabs[0].id;
  const pintar = () => { CK.vaciar(cab); tabs.forEach(t => { const b = CK.h('button' + (t.id === act ? '.activo' : ''), { type: 'button', html: t.ico ? CK.ico(t.ico, 16) : '', onclick: () => { act = t.id; pintar(); } }, CK.h('span', t.txt)); if (t.desc) CK.tip(b, t.txt, t.desc); cab.append(b); }); CK.vaciar(cuerpo); const t = tabs.find(x => x.id === act); if (t) t.pintar(cuerpo); };
  cont.refrescar = pintar; cont.ir = id => { act = id; pintar(); }; cont.actual = () => act; cont.visible = id => act === id; cont.suelta = () => false; pintar(); return cont;
};
/** Reproductor de cuadros en un lienzo chico. cuadros() devuelve [canvas…]; fps() los cuadros por segundo. */
CK.reproductor = (cuadros, fps, o = {}) => {
  const tam = o.tam || 160, c = CK.lienzo(tam, tam); c.style.width = c.style.height = tam + 'px'; c.className = 'repro';
  let i = 0, ult = 0, vivo = true, pausa = false;
  const paso = t => {
    if (!c.isConnected && ult) { vivo = false; return; }
    requestAnimationFrame(paso); if (c.offsetParent === null) return; const fr = cuadros(); if (!fr || !fr.length) { const x0 = CK.ctx(c); CK.cuadros(x0, tam, tam, 8); return; }
    if (!pausa && t - ult > 1000 / Math.max(1, fps())) { i = (i + 1) % fr.length; ult = t; } else if (ult && !o.siempre && pausa) return;
    const x = CK.ctx(c); CK.cuadros(x, tam, tam, 8); if (o.fondo) o.fondo(x, tam);
    const f = fr[i % fr.length]; let k = Math.min(tam / f.width, tam / f.height); if (k > 1) k = Math.floor(k); if (o.escala) k = Math.min(k, o.escala());
    x.drawImage(f, Math.round((tam - f.width * k) / 2), Math.round((tam - f.height * k) / 2), f.width * k, f.height * k);
  };
  requestAnimationFrame(t => { ult = t; paso(t); });
  c.pausar = v => { pausa = v === undefined ? !pausa : v; return pausa; }; c.ir = n => { i = n; };
  return c;
};

/** Comparador antes / después: una cortina que se arrastra sobre las dos imágenes puestas una encima de la otra.
    antes y despues son lienzos (pueden medir distinto: cada uno se ajusta al mismo recuadro). */
CK.comparar = (antes, despues, o = {}) => {
  const W = o.ancho || 640, H = o.alto || 420, c = CK.h('canvas.comparador', { width: W, height: H, style: { width: '100%', maxWidth: W + 'px', display: 'block', margin: '0 auto', borderRadius: '8px', border: '1px solid var(--linea)', cursor: 'ew-resize', touchAction: 'none' } }), x = CK.ctx(c);
  let corte = 0.5, fondo = o.fondo || null;
  const caja = im => { const k0 = Math.min((W - 24) / im.width, (H - 24) / im.height), k = k0 >= 1 ? Math.floor(k0) : k0; return { k, w: im.width * k, h: im.height * k, x: Math.round((W - im.width * k) / 2), y: Math.round((H - im.height * k) / 2) }; };
  const pintar = () => {
    x.imageSmoothingEnabled = false;
    if (fondo) { x.fillStyle = fondo; x.fillRect(0, 0, W, H); } else for (let j = 0; j < H; j += 12) for (let i = 0; i < W; i += 12) { x.fillStyle = ((i + j) / 12) % 2 ? '#34353b' : '#2a2b30'; x.fillRect(i, j, 12, 12); }
    const px = Math.round(W * corte), lado = (im, x0, x1) => { if (!im || x1 <= x0) return; const b = caja(im); x.save(); x.beginPath(); x.rect(x0, 0, x1 - x0, H); x.clip(); x.imageSmoothingEnabled = b.k < 1; x.drawImage(im, b.x, b.y, b.w, b.h); x.restore(); };
    lado(antes, 0, px); lado(despues, px, W);
    x.fillStyle = '#e8b83a'; x.fillRect(px - 1, 0, 2, H); x.beginPath(); x.arc(px, H / 2, 11, 0, 7); x.fill(); x.fillStyle = '#1d1a10'; x.beginPath(); x.moveTo(px - 7, H / 2); x.lineTo(px - 2, H / 2 - 5); x.lineTo(px - 2, H / 2 + 5); x.moveTo(px + 7, H / 2); x.lineTo(px + 2, H / 2 - 5); x.lineTo(px + 2, H / 2 + 5); x.fill();
    x.font = '600 11px "Segoe UI", sans-serif'; x.textBaseline = 'top'; const rot = (t, rx, al) => { const w = x.measureText(t).width + 12; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(al ? rx - w : rx, 8, w, 20); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(t, (al ? rx - w : rx) + 6, 13); };
    if (px > 70) rot(o.rotAntes || 'Antes', 8); if (px < W - 80) rot(o.rotDespues || 'Después', W - 8, true);
  };
  const mover = e => { const r = c.getBoundingClientRect(); corte = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); pintar(); };
  c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); mover(e); }); c.addEventListener('pointermove', e => { if (e.buttons) mover(e); });
  c.poner = (a, d) => { if (a) antes = a; if (d) despues = d; pintar(); }; c.fondo = f => { fondo = f; pintar(); }; c.corte = v => { corte = v; pintar(); };
  pintar(); return c;
};
/** Ventana con el comparador. botones extra opcionales; devuelve lo que devuelva el botón elegido. */
CK.ventanaComparar = (titulo, antes, despues, o = {}) => {
  const cmp = CK.comparar(antes, despues, o), fondos = [['', 'Cuadros'], ['#4c7a3a', 'Pasto'], ['#6b6258', 'Piedra'], ['#1b1d21', 'Oscuro'], ['#d9cfae', 'Claro']];
  const cuerpo = CK.h('div', cmp, CK.h('div.fila.junto', { style: { marginTop: '10px' } }, CK.h('span.nota-txt.crece', (o.nota ? o.nota + ' ' : '') + 'Arrastrá la línea dorada para comparar.'), CK.h('span.nota-txt', 'Fondo'), CK.sel('', fondos, v => cmp.fondo(v || null))));
  return CK.ventana({ titulo, ancho: (o.ancho || 640) + 60, cuerpo, botones: o.botones || [{ txt: 'Cerrar', valor: false }] });
};
