/* PIXEL ART: editor manual para arreglos y dibujo. Lápiz, borrador, balde, formas, selección, capas, cuadros con papel cebolla,
   paleta fija del proyecto y sombreado por tonos vecinos. Trabaja directo sobre la imagen del asset. */
'use strict';
(function () {
  const h = CK.h; let el, lienzo, vista, panel, tira, herrCol, cuadrosEl, tabs, rueda;
  const S = { id: null, herr: 'lapiz', c1: '#1b1420', c2: '#f5f1e6', tam: 1, perfecto: true, relleno: false, contiguo: true, espH: false, espV: false, soloPaleta: false, cebolla: false, grilla: true, sombra: 1 };
  let doc = null, sel = null, flot = null, trazo = null, previa = null, porta = null, vigia = null;
  const A = () => CK.P && CK.P.assets[S.id];
  const FR = () => CK.asset.cuadro(A(), doc ? doc.cuadro : 0);
  const capa = () => doc.capas[doc.activa];
  const pedir = () => vista && vista.pedir();

  const HERR = [
    { id: 'lapiz', ico: 'lapiz', tip: 'Lápiz', desc: 'Dibuja píxel a píxel con el color principal. Clic derecho usa el color secundario.', tecla: 'B', est: 'Arrastrar: dibujar · Clic derecho: color secundario · Mayús + clic: línea recta desde el último punto · Alt + clic: tomar color' },
    { id: 'borrador', ico: 'borrador', tip: 'Borrador', desc: 'Deja los píxeles transparentes.', tecla: 'E', est: 'Arrastrar: borrar' },
    { id: 'balde', ico: 'balde', tip: 'Balde', desc: 'Rellena una zona del mismo color. Con "Contiguo" apagado cambia ese color en todo el cuadro.', tecla: 'G', est: 'Clic: rellenar con el color principal · Clic derecho: con el secundario' },
    { id: 'gotero', ico: 'gotero', tip: 'Cuentagotas', desc: 'Toma un color del dibujo.', tecla: 'I', est: 'Clic: color principal · Clic derecho: color secundario' },
    { id: 'sombrear', ico: 'linterna', tip: 'Aclarar / oscurecer', desc: 'Pasa cada píxel al tono vecino de la paleta: clic izquierdo aclara, clic derecho oscurece. Sombrea sin salirte del estilo.', tecla: 'U', est: 'Arrastrar: aclarar · Clic derecho: oscurecer' },
    { id: 'reemplazar', ico: 'paleta', tip: 'Reemplazar color', desc: 'Clic sobre un color del dibujo y lo cambia por el color principal en todo el cuadro. Con Mayús, en todos los cuadros.', tecla: 'K', est: 'Clic sobre un color: cambiarlo por el principal · Mayús + clic: en toda la hoja' },
    '-',
    { id: 'linea', ico: 'linea', tip: 'Línea', desc: 'Línea recta entre dos puntos.', tecla: 'L', est: 'Arrastrar: trazar la línea · Mayús: horizontal, vertical o diagonal' },
    { id: 'rect', ico: 'rect', tip: 'Rectángulo', desc: 'Rectángulo vacío o lleno (según "Relleno").', tecla: 'R', est: 'Arrastrar: rectángulo · Mayús: cuadrado' },
    { id: 'elipse', ico: 'elipse', tip: 'Elipse', desc: 'Elipse vacía o llena (según "Relleno").', tecla: 'O', est: 'Arrastrar: elipse · Mayús: círculo' },
    '-',
    { id: 'selRect', ico: 'selRect', tip: 'Selección rectangular', desc: 'Marca un rectángulo. Lo que hagas después solo afecta ahí adentro.', tecla: 'S', est: 'Arrastrar: seleccionar · Arrastrar adentro: mover · Mayús: sumar · Esc: soltar' },
    { id: 'lazo', ico: 'lazo', tip: 'Lazo', desc: 'Selección a mano alzada.', tecla: 'Q', est: 'Arrastrar: rodear la zona' },
    { id: 'varita', ico: 'varita', tip: 'Varita', desc: 'Selecciona toda una zona del mismo color.', tecla: 'W', est: 'Clic: seleccionar ese color · Mayús: sumar' },
    { id: 'mover', ico: 'mover', tip: 'Mover', desc: 'Mueve la selección, o toda la capa si no hay nada seleccionado.', tecla: 'V', est: 'Arrastrar: mover · Flechas: de a 1 píxel' }
  ];

  // ---------------------------------------------------------------- documento
  const componer = () => {
    const a = A(); if (!a || !doc) return;
    if (doc.capas.length === 1) { CK.img[a.id] = doc.capas[0].c; a.w = doc.capas[0].c.width; a.h = doc.capas[0].c.height; }
    else { const c = CK.lienzo(doc.capas[0].c.width, doc.capas[0].c.height), x = CK.ctx(c); doc.capas.forEach(k => { if (!k.visible) return; x.globalAlpha = k.opacidad; x.drawImage(k.c, 0, 0); }); CK.img[a.id] = c; a.w = c.width; a.h = c.height; doc.capas.forEach(k => { if (k.asset) { CK.img[k.asset] = k.c; CK._imgSucias.add(k.asset); if (CK.P.assets[k.asset]) { CK.P.assets[k.asset].w = k.c.width; CK.P.assets[k.asset].h = k.c.height; } } }); }
    a.modificado = Date.now(); CK._imgSucias.add(a.id); guardarMeta(); CK.tocar(); CK.emit('asset-img', a.id); previa && previa(); pintarCuadros();
  };
  const guardarMeta = () => {
    const a = A(); if (!a) return;
    if (doc.capas.length === 1) { const viejo = CK.P.pixel[a.id]; if (viejo) (viejo.capas || []).forEach(k => { if (k.asset && CK.P.assets[k.asset]) { delete CK.P.assets[k.asset]; delete CK.img[k.asset]; (CK._borradas = CK._borradas || []).push(k.asset); } }); delete CK.P.pixel[a.id]; doc.capas[0].asset = null; return; }
    doc.capas.forEach((k, i) => { if (!k.asset) { k.asset = a.id + '__capa_' + k.id; CK.P.assets[k.asset] = { id: k.asset, nombre: a.nombre + ' / ' + k.nombre, tipo: 'capa', w: k.c.width, h: k.c.height, de: a.id }; CK.img[k.asset] = k.c; CK._imgSucias.add(k.asset); } });
    CK.P.pixel[a.id] = { activa: doc.activa, sincronizado: a.modificado, capas: doc.capas.map(k => ({ id: k.id, nombre: k.nombre, visible: k.visible, opacidad: k.opacidad, asset: k.asset })) };
  };
  const abrir = id => {
    const a = CK.P.assets[id]; if (!a) return; soltarFlot(); S.id = id; sel = null; flot = null;
    const meta = CK.P.pixel[id], ok = meta && meta.capas && meta.capas.every(k => CK.img[k.asset]) && (meta.sincronizado || 0) >= (a.modificado || 0) - 5 && meta.capas.every(k => CK.img[k.asset].width === a.w);
    if (meta && !ok) { (meta.capas || []).forEach(k => { delete CK.P.assets[k.asset]; delete CK.img[k.asset]; }); delete CK.P.pixel[id]; CK.aviso('La imagen cambió fuera del editor de píxeles: se abre aplanada en una sola capa.', 'info', 4500); }
    doc = { cuadro: 0, activa: ok ? CK.clamp(meta.activa || 0, 0, meta.capas.length - 1) : 0, capas: ok ? meta.capas.map(k => ({ id: k.id, nombre: k.nombre, visible: k.visible, opacidad: k.opacidad, asset: k.asset, c: CK.img[k.asset] })) : [{ id: 'c1', nombre: 'Capa 1', visible: true, opacidad: 1, asset: null, c: CK.img[id] }] };
    CK.P.ui.pixel = id; S.soloPaleta = !!CK.P.estilo.bloquearPaleta;
    const f = FR(); if (vista) vista.encuadrar(f.w, f.h, 40); pintarTodo();
  };
  /** Copia de todo el documento, para deshacer cambios de estructura (capas, cuadros, tamaño). */
  const foto = () => ({ cuadro: doc.cuadro, activa: doc.activa, cuadros: A().cuadros ? CK.clone(A().cuadros) : null, capas: doc.capas.map(k => ({ id: k.id, nombre: k.nombre, visible: k.visible, opacidad: k.opacidad, asset: k.asset, c: CK.copiaLienzo(k.c) })) });
  const restaurar = f => { const a = A(); doc.cuadro = f.cuadro; doc.activa = f.activa; doc.capas = f.capas.map(k => Object.assign({}, k, { c: CK.copiaLienzo(k.c) })); if (f.cuadros) a.cuadros = CK.clone(f.cuadros); else delete a.cuadros; sel = null; flot = null; componer(); pintarTodo(); };
  const estructura = (nombre, fn) => { const id = S.id, antes = foto(); fn(); componer(); const despues = foto(); CK.hist.push({ nombre, deshacer: () => { if (S.id !== id || !doc) abrir(id); restaurar(antes); }, rehacer: () => { if (S.id !== id || !doc) abrir(id); restaurar(despues); } }); pintarTodo(); };
  /** Deshacer de un cambio en los píxeles de la capa activa. */
  const cambioCapa = nombre => {
    const id = S.id, ci = doc.activa, antes = CK.copiaLienzo(capa().c);
    return () => { const despues = CK.copiaLienzo(doc.capas[ci].c); const poner = src => { if (S.id !== id || !doc) abrir(id); const k = doc.capas[ci]; if (!k) return; if (k.c.width !== src.width || k.c.height !== src.height) { k.c.width = src.width; k.c.height = src.height; } const x = CK.ctx(k.c); x.clearRect(0, 0, k.c.width, k.c.height); x.drawImage(src, 0, 0); componer(); pedir(); }; CK.hist.push({ nombre, deshacer: () => poner(antes), rehacer: () => poner(despues) }); componer(); };
  };

  // ---------------------------------------------------------------- primitivas
  const ctxCapa = () => { const x = CK.ctx(capa().c), f = FR(); x.save(); x.beginPath(); if (sel && !flot) { for (let y = 0; y < f.h; y++) { let x0 = -1; for (let i = 0; i <= f.w; i++) { const on = i < f.w && sel.m[y * f.w + i]; if (on && x0 < 0) x0 = i; else if (!on && x0 >= 0) { x.rect(f.x + x0, f.y + y, i - x0, 1); x0 = -1; } } } } else x.rect(f.x, f.y, f.w, f.h); x.clip(); x.translate(f.x, f.y); return x; };
  const colorOk = hex => { if (!S.soloPaleta || !CK.P.estilo.paleta.length) return hex; const P = PIX.palRGB(CK.P.estilo.paleta), c = PIX.hex2rgb(hex); return CK.P.estilo.paleta[PIX.nearestIdx(P, c[0], c[1], c[2])]; };
  const espejos = (x, y, fn) => { const f = FR(), pts = [[x, y]]; if (S.espH) pts.push([f.w - 1 - x, y]); if (S.espV) pts.push([x, f.h - 1 - y]); if (S.espH && S.espV) pts.push([f.w - 1 - x, f.h - 1 - y]); pts.forEach(p => fn(p[0], p[1])); };
  const sello = (x, px, py, color, tam) => { const o = Math.floor((tam - 1) / 2); espejos(px, py, (qx, qy) => { if (color) { x.fillStyle = color; x.fillRect(qx - o, qy - o, tam, tam); } else x.clearRect(qx - o, qy - o, tam, tam); }); };
  const bres = (x0, y0, x1, y1, fn) => { const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy; for (; ;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } };
  const formaPts = (tipo, a, b, lleno) => {
    const pts = [], x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    if (tipo === 'linea') bres(a.x, a.y, b.x, b.y, (x, y) => pts.push([x, y]));
    else if (tipo === 'rect') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (lleno || x === x0 || x === x1 || y === y0 || y === y1) pts.push([x, y]); }
    else { const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, cx = x0 + rx, cy = y0 + ry, dentro = (x, y) => rx < 0.5 || ry < 0.5 ? true : ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!dentro(x, y)) continue; if (lleno || !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1) || x === x0 || x === x1 || y === y0 || y === y1) pts.push([x, y]); } }
    return pts;
  };
  const leer = () => { const f = FR(); return CK.ctx(capa().c).getImageData(f.x, f.y, f.w, f.h); };
  const escribir = d => { const f = FR(); CK.ctx(capa().c).putImageData(d, f.x, f.y); };
  const colorEn = (px, py, todas) => { const f = FR(); if (px < 0 || py < 0 || px >= f.w || py >= f.h) return null; const d = CK.ctx(todas ? CK.img[S.id] : capa().c).getImageData(f.x + px, f.y + py, 1, 1).data; return d[3] < 8 ? null : PIX.rgb2hex(d[0], d[1], d[2]); };
  const inundar = (d, w, hh, px, py, tolerar) => { const m = new Uint8Array(w * hh), i0 = (py * w + px) * 4, t = [d[i0], d[i1(i0)], d[i0 + 2], d[i0 + 3]]; function i1(i) { return i + 1; } const igual = p => { const i = p * 4; return d[i + 3] < 8 && t[3] < 8 ? true : d[i] === t[0] && d[i + 1] === t[1] && d[i + 2] === t[2] && Math.abs(d[i + 3] - t[3]) < 8; }; if (tolerar === 'global') { for (let p = 0; p < w * hh; p++) if (igual(p)) m[p] = 1; return m; } const st = [py * w + px]; while (st.length) { const p = st.pop(); if (m[p] || !igual(p)) continue; m[p] = 1; const x = p % w, y = (p / w) | 0; if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < hh - 1) st.push(p + w); } return m; };
  const cajaMascara = (m, w, hh) => { let x0 = w, y0 = hh, x1 = -1, y1 = -1; for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
  const ponerSel = (m, sumar) => { const f = FR(); if (sumar && sel) for (let i = 0; i < m.length; i++) m[i] = m[i] || sel.m[i]; const b = cajaMascara(m, f.w, f.h); sel = b ? { m, b } : null; pintarTira(); pedir(); };

  // ---------------------------------------------------------------- selección flotante
  const levantar = () => {
    if (flot) return; const f = FR(), d = leer(), fin = cambioCapa('Mover');
    const m = sel ? sel.m : (() => { const mm = new Uint8Array(f.w * f.h); for (let p = 0; p < mm.length; p++) mm[p] = d.data[p * 4 + 3] > 0 ? 1 : 0; return mm; })();
    const c = CK.lienzo(f.w, f.h), cd = new ImageData(f.w, f.h);
    for (let p = 0; p < m.length; p++) if (m[p]) { for (let k = 0; k < 4; k++) { cd.data[p * 4 + k] = d.data[p * 4 + k]; d.data[p * 4 + k] = 0; } }
    CK.ctx(c).putImageData(cd, 0, 0); escribir(d); flot = { c, x: 0, y: 0, m: m.slice(), fin, todo: !sel };
  };
  const soltarFlot = () => {
    if (!flot || !doc) return; const f = FR(), x = CK.ctx(capa().c); x.save(); x.beginPath(); x.rect(f.x, f.y, f.w, f.h); x.clip(); x.drawImage(flot.c, f.x + flot.x, f.y + flot.y); x.restore();
    if (!flot.todo) { const m = new Uint8Array(f.w * f.h); for (let y = 0; y < f.h; y++) for (let xx = 0; xx < f.w; xx++) { const sx = xx - flot.x, sy = y - flot.y; if (sx >= 0 && sy >= 0 && sx < flot.c.width && sy < flot.c.height && flot.m[sy * flot.c.width + sx]) m[y * f.w + xx] = 1; } const b = cajaMascara(m, f.w, f.h); sel = b ? { m, b } : null; } else sel = null;
    const fin = flot.fin; flot = null; fin(); pedir();
  };
  const transformarSel = (nombre, fn) => {
    const f = FR(); if (!flot) { if (!sel) { const m = new Uint8Array(f.w * f.h).fill(1); sel = { m, b: { x: 0, y: 0, w: f.w, h: f.h } }; } levantar(); }
    const b = cajaMascara(flot.m, flot.c.width, flot.c.height); if (!b) return;
    const parte = PIX.crop(CK.aPix(flot.c), b.x, b.y, b.w, b.h), mp = PIX.make(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (flot.m[(b.y + y) * flot.c.width + b.x + x]) mp.d[(y * b.w + x) * 4 + 3] = 255;
    const r = fn(parte), rm = fn(mp), nc = CK.lienzo(Math.max(flot.c.width, b.x + r.w), Math.max(flot.c.height, b.y + r.h)), nm = new Uint8Array(nc.width * nc.height);
    CK.ctx(nc).putImageData(new ImageData(new Uint8ClampedArray(r.d), r.w, r.h), b.x, b.y); for (let y = 0; y < rm.h; y++) for (let x = 0; x < rm.w; x++) if (rm.d[(y * rm.w + x) * 4 + 3]) nm[(b.y + y) * nc.width + b.x + x] = 1;
    flot.c = nc; flot.m = nm; flot.todo = false; pedir();
  };
  let portaSel = null;
  const copiar = cortar => { const f = FR(); if (flot) { portaSel = { c: CK.copiaLienzo(flot.c), m: flot.m.slice() }; return; } if (!sel) { CK.aviso('Primero seleccioná algo (S, Q o W).', 'info'); return; } const d = leer(), c = CK.lienzo(f.w, f.h), cd = new ImageData(f.w, f.h); for (let p = 0; p < sel.m.length; p++) if (sel.m[p]) for (let k = 0; k < 4; k++) cd.data[p * 4 + k] = d.data[p * 4 + k]; CK.ctx(c).putImageData(cd, 0, 0); portaSel = { c, m: sel.m.slice() }; if (cortar) borrarSel(); CK.estado(cortar ? 'Cortado' : 'Copiado'); };
  const pegar = () => { if (!portaSel) return; soltarFlot(); flot = { c: CK.copiaLienzo(portaSel.c), x: 0, y: 0, m: portaSel.m.slice(), fin: cambioCapa('Pegar'), todo: false }; S.herr = 'mover'; herrCol.elegir('mover'); pintarTira(); pedir(); CK.estado('Pegado: arrastralo a su lugar y hacé clic afuera o Enter para fijarlo.'); };
  const borrarSel = () => { if (flot) { const fin = flot.fin; flot = null; sel = null; fin(); pedir(); return; } if (!sel) return; const fin = cambioCapa('Borrar selección'), d = leer(); for (let p = 0; p < sel.m.length; p++) if (sel.m[p]) d.data[p * 4 + 3] = 0; escribir(d); fin(); pedir(); };

  // ---------------------------------------------------------------- herramientas
  const P = m => ({ x: Math.floor(m.x), y: Math.floor(m.y) });
  const dentroSel = p => { if (flot) { const sx = p.x - flot.x, sy = p.y - flot.y; return sx >= 0 && sy >= 0 && sx < flot.c.width && sy < flot.c.height && !!flot.m[sy * flot.c.width + sx]; } const f = FR(); return !!(sel && p.x >= 0 && p.y >= 0 && p.x < f.w && p.y < f.h && sel.m[p.y * f.w + p.x]); };
  const herramienta = {
    pasar(m) { const p = P(m), f = FR(); S.cursor = p; CK.estadoDer(p.x >= 0 && p.y >= 0 && p.x < f.w && p.y < f.h ? p.x + ', ' + p.y + (colorEn(p.x, p.y, true) ? '  ·  ' + colorEn(p.x, p.y, true).toUpperCase() : '') : ''); if (!CK._espacio) vista.c.style.cursor = (S.herr === 'mover' || (['selRect', 'lazo', 'varita'].includes(S.herr) && dentroSel(p))) ? 'move' : 'crosshair'; pedir(); },
    salir() { S.cursor = null; pedir(); },
    bajar(m) {
      if (!doc) return; const p = P(m), der = m.boton === 2, f = FR(), hh = S.herr, k = capa(); S.cursor = p;
      if (!k.visible && !['gotero', 'selRect', 'lazo', 'varita'].includes(hh)) { CK.aviso('La capa activa está oculta.', 'info'); return; }
      if (m.alt || hh === 'gotero') { const c = colorEn(p.x, p.y, true); if (c) { if (der) S.c2 = c; else S.c1 = c; pintarColor(); } return; }
      if (flot && !dentroSel(p) && hh !== 'mover') soltarFlot();
      if (hh === 'mover' || (['selRect', 'lazo', 'varita'].includes(hh) && dentroSel(p) && !m.shift)) { levantar(); trazo = { tipo: 'mover', p0: p, x0: flot.x, y0: flot.y }; return; }
      if (hh === 'lapiz' || hh === 'borrador' || hh === 'sombrear') {
        const color = hh === 'borrador' ? null : colorOk(der ? S.c2 : S.c1), fin = cambioCapa(hh === 'lapiz' ? 'Lápiz' : hh === 'borrador' ? 'Borrador' : 'Sombrear'), x = ctxCapa();
        trazo = { tipo: hh, color, fin, x, pts: [], antes: hh === 'sombrear' || S.perfecto ? leer() : null, hechos: new Set(), pasos: der ? -S.sombra : S.sombra };
        if (hh !== 'sombrear' && m.shift && S.ultimo) bres(S.ultimo.x, S.ultimo.y, p.x, p.y, (qx, qy) => sello(x, qx, qy, color, S.tam)); else puntoTrazo(p);
        S.ultimo = p; pedir(); return;
      }
      if (hh === 'balde') { if (p.x < 0 || p.y < 0 || p.x >= f.w || p.y >= f.h) return; const fin = cambioCapa('Balde'), d = leer(), msk = inundar(d.data, f.w, f.h, p.x, p.y, S.contiguo ? null : 'global'), c = PIX.hex2rgb(colorOk(der ? S.c2 : S.c1)); for (let q = 0; q < msk.length; q++) if (msk[q] && (!sel || sel.m[q])) { d.data[q * 4] = c[0]; d.data[q * 4 + 1] = c[1]; d.data[q * 4 + 2] = c[2]; d.data[q * 4 + 3] = 255; } escribir(d); fin(); pedir(); return; }
      if (hh === 'reemplazar') { const de = colorEn(p.x, p.y); if (!de) return; const a = A(), fin = cambioCapa('Reemplazar color'), cx = CK.ctx(k.c), r = m.shift ? { x: 0, y: 0, w: k.c.width, h: k.c.height } : f, d = cx.getImageData(r.x, r.y, r.w, r.h), im = PIX.replaceColor({ w: r.w, h: r.h, d: d.data }, de, colorOk(S.c1)); cx.putImageData(new ImageData(new Uint8ClampedArray(im.d), r.w, r.h), r.x, r.y); fin(); pedir(); CK.estado('Reemplazado ' + de + ' por ' + S.c1 + (m.shift && a.cuadros ? ' en toda la hoja' : '')); return; }
      if (['linea', 'rect', 'elipse'].includes(hh)) { trazo = { tipo: 'forma', forma: hh, a: p, b: p, color: colorOk(der ? S.c2 : S.c1) }; pedir(); return; }
      if (hh === 'selRect') { trazo = { tipo: 'selRect', a: p, b: p, sumar: m.shift }; return; }
      if (hh === 'lazo') { trazo = { tipo: 'lazo', pts: [p], sumar: m.shift }; return; }
      if (hh === 'varita') { if (p.x < 0 || p.y < 0 || p.x >= f.w || p.y >= f.h) { ponerSel(new Uint8Array(f.w * f.h)); return; } const d = leer(); ponerSel(inundar(d.data, f.w, f.h, p.x, p.y, S.contiguo ? null : 'global'), m.shift); return; }
    },
    mover(m) {
      const p = P(m), t = trazo; S.cursor = p; if (!t) return;
      if (t.tipo === 'mover') { flot.x = t.x0 + p.x - t.p0.x; flot.y = t.y0 + p.y - t.p0.y; pedir(); return; }
      if (['lapiz', 'borrador', 'sombrear'].includes(t.tipo)) { if (S.ultimo && (S.ultimo.x !== p.x || S.ultimo.y !== p.y)) { const pts = []; bres(S.ultimo.x, S.ultimo.y, p.x, p.y, (x, y) => pts.push({ x, y })); pts.slice(1).forEach(puntoTrazo); S.ultimo = p; pedir(); } return; }
      if (t.tipo === 'forma' || t.tipo === 'selRect') { let b = p; if (m.shift) { const dx = p.x - t.a.x, dy = p.y - t.a.y; if (t.forma === 'linea') { if (Math.abs(dx) > Math.abs(dy) * 2) b = { x: p.x, y: t.a.y }; else if (Math.abs(dy) > Math.abs(dx) * 2) b = { x: t.a.x, y: p.y }; else { const n = Math.max(Math.abs(dx), Math.abs(dy)); b = { x: t.a.x + Math.sign(dx) * n, y: t.a.y + Math.sign(dy) * n }; } } else if (t.tipo === 'forma') { const n = Math.max(Math.abs(dx), Math.abs(dy)); b = { x: t.a.x + Math.sign(dx || 1) * n, y: t.a.y + Math.sign(dy || 1) * n }; } } t.b = b; pedir(); return; }
      if (t.tipo === 'lazo') { const u = t.pts[t.pts.length - 1]; if (u.x !== p.x || u.y !== p.y) { t.pts.push(p); pedir(); } }
    },
    subir() {
      const t = trazo, f = FR(); trazo = null; if (!t) return;
      if (['lapiz', 'borrador', 'sombrear'].includes(t.tipo)) { t.x.restore(); t.fin(); pedir(); return; }
      if (t.tipo === 'forma') { const fin = cambioCapa({ linea: 'Línea', rect: 'Rectángulo', elipse: 'Elipse' }[t.forma]), x = ctxCapa(); formaPts(t.forma, t.a, t.b, S.relleno).forEach(([qx, qy]) => sello(x, qx, qy, t.color, t.forma === 'linea' || !S.relleno ? S.tam : 1)); x.restore(); fin(); pedir(); return; }
      if (t.tipo === 'selRect') { const x0 = CK.clamp(Math.min(t.a.x, t.b.x), 0, f.w - 1), x1 = CK.clamp(Math.max(t.a.x, t.b.x), 0, f.w - 1), y0 = CK.clamp(Math.min(t.a.y, t.b.y), 0, f.h - 1), y1 = CK.clamp(Math.max(t.a.y, t.b.y), 0, f.h - 1), m = new Uint8Array(f.w * f.h); if (t.a.x !== t.b.x || t.a.y !== t.b.y) for (let y = y0; y <= y1; y++) m.fill(1, y * f.w + x0, y * f.w + x1 + 1); ponerSel(m, t.sumar); return; }
      if (t.tipo === 'lazo') { const m = new Uint8Array(f.w * f.h), pts = t.pts; if (pts.length > 2) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { let dentro = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x + 0.5 < (b.x - a.x) * (y + 0.5 - a.y) / (b.y - a.y) + a.x + 0.5) dentro = !dentro; } if (dentro) m[y * f.w + x] = 1; } ponerSel(m, t.sumar); return; }
      pedir();
    }
  };
  const puntoTrazo = p => {
    const t = trazo, f = FR();
    if (t.tipo === 'sombrear') { const pal = CK.P.estilo.paleta, o = Math.floor((S.tam - 1) / 2), cx = CK.ctx(capa().c); espejos(p.x, p.y, (ex, ey) => { for (let dy = 0; dy < S.tam; dy++) for (let dx = 0; dx < S.tam; dx++) { const qx = ex - o + dx, qy = ey - o + dy; if (qx < 0 || qy < 0 || qx >= f.w || qy >= f.h) continue; const key = qy * f.w + qx; if (t.hechos.has(key) || (sel && !sel.m[key])) continue; t.hechos.add(key); const i = key * 4; if (t.antes.data[i + 3] < 8) continue; const uno = { w: 1, h: 1, d: new Uint8ClampedArray([t.antes.data[i], t.antes.data[i + 1], t.antes.data[i + 2], 255]) }, r = pal.length ? PIX.shiftTone(uno, pal, t.pasos) : PIX.adjust(uno, { brillo: t.pasos * 22 }); cx.fillStyle = PIX.rgb2hex(r.d[0], r.d[1], r.d[2]); cx.fillRect(f.x + qx, f.y + qy, 1, 1); } }); return; }
    sello(t.x, p.x, p.y, t.color, S.tam);
    if (S.perfecto && S.tam === 1 && t.antes) { t.pts.push(p); const n = t.pts.length; if (n >= 3) { const a = t.pts[n - 3], b = t.pts[n - 2], c = t.pts[n - 1]; if (Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1 && (b.x === a.x || b.y === a.y) && (b.x === c.x || b.y === c.y)) { espejos(b.x, b.y, (qx, qy) => { if (qx < 0 || qy < 0 || qx >= f.w || qy >= f.h) return; const i = (qy * f.w + qx) * 4, d = t.antes.data; t.x.clearRect(qx, qy, 1, 1); if (d[i + 3]) { t.x.fillStyle = `rgba(${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3] / 255})`; t.x.fillRect(qx, qy, 1, 1); } }); t.pts.splice(n - 2, 1); } } }
  };

  // ---------------------------------------------------------------- pintar el lienzo
  const pintar = (x, v) => {
    if (!doc || !A()) return; const f = FR(), a = A(), z = v.z;
    x.save(); x.translate(v.tx, v.ty); CK.cuadros(x, 0, 0); x.fillStyle = '#3a3d44'; x.fillRect(0, 0, f.w * z, f.h * z); x.fillStyle = '#33363c'; const q = Math.max(4, z * (z >= 8 ? 1 : 4)); for (let yy = 0; yy < f.h * z; yy += q) for (let xx = ((yy / q) % 2) * q; xx < f.w * z; xx += q * 2) x.fillRect(xx, yy, Math.min(q, f.w * z - xx), Math.min(q, f.h * z - yy)); x.restore();
    x.save(); v.mundo(x);
    if (S.cebolla && a.cuadros) { const n = CK.asset.nCuadros(a);[[-1, 0.28], [1, 0.16]].forEach(([d, al]) => { const i = doc.cuadro + d; if (i < 0 || i >= n) return; const g = CK.asset.cuadro(a, i); x.globalAlpha = al; x.drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); }); x.globalAlpha = 1; }
    doc.capas.forEach((k, i) => { if (!k.visible) return; x.globalAlpha = k.opacidad; x.drawImage(k.c, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); if (flot && i === doc.activa) x.drawImage(flot.c, flot.x, flot.y); });
    x.globalAlpha = 1;
    if (trazo && trazo.tipo === 'forma') { x.fillStyle = trazo.color; const t = trazo.forma === 'linea' || !S.relleno ? S.tam : 1, o = Math.floor((t - 1) / 2); formaPts(trazo.forma, trazo.a, trazo.b, S.relleno).forEach(([qx, qy]) => espejos(qx, qy, (ex, ey) => x.fillRect(ex - o, ey - o, t, t))); }
    x.restore();
    x.save(); x.lineWidth = 1;
    if (S.grilla && z >= 8) v.grilla(x, 1, f.w, f.h, 'rgba(255,255,255,.07)');
    const T = CK.P.estilo.tile; if (S.grilla && f.w > T && z * T >= 24) v.grilla(x, T, f.w, f.h, 'rgba(232,184,58,.35)');
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.strokeRect(v.tx - .5, v.ty - .5, f.w * z + 1, f.h * z + 1);
    x.strokeStyle = 'rgba(180,140,242,.8)'; x.setLineDash([5, 4]); if (S.espH) { x.beginPath(); x.moveTo(v.tx + f.w * z / 2, v.ty); x.lineTo(v.tx + f.w * z / 2, v.ty + f.h * z); x.stroke(); } if (S.espV) { x.beginPath(); x.moveTo(v.tx, v.ty + f.h * z / 2); x.lineTo(v.tx + f.w * z, v.ty + f.h * z / 2); x.stroke(); } x.setLineDash([]);
    // contorno de la selección
    const ms = flot ? { m: flot.m, w: flot.c.width, h: flot.c.height, ox: flot.x, oy: flot.y } : sel ? { m: sel.m, w: f.w, h: f.h, ox: 0, oy: 0 } : null;
    if (ms && !(flot && flot.todo)) { x.beginPath(); for (let y = 0; y < ms.h; y++) for (let i = 0; i < ms.w; i++) { if (!ms.m[y * ms.w + i]) continue; const px = v.tx + (i + ms.ox) * z, py = v.ty + (y + ms.oy) * z; if (y === 0 || !ms.m[(y - 1) * ms.w + i]) { x.moveTo(px, py + .5); x.lineTo(px + z, py + .5); } if (y === ms.h - 1 || !ms.m[(y + 1) * ms.w + i]) { x.moveTo(px, py + z - .5); x.lineTo(px + z, py + z - .5); } if (i === 0 || !ms.m[y * ms.w + i - 1]) { x.moveTo(px + .5, py); x.lineTo(px + .5, py + z); } if (i === ms.w - 1 || !ms.m[y * ms.w + i + 1]) { x.moveTo(px + z - .5, py); x.lineTo(px + z - .5, py + z); } } x.strokeStyle = '#111'; x.stroke(); x.setLineDash([4, 4]); x.strokeStyle = '#fff'; x.stroke(); x.setLineDash([]); }
    if (trazo && trazo.tipo === 'selRect') { const x0 = Math.min(trazo.a.x, trazo.b.x), y0 = Math.min(trazo.a.y, trazo.b.y), w = Math.abs(trazo.b.x - trazo.a.x) + 1, hh = Math.abs(trazo.b.y - trazo.a.y) + 1; x.setLineDash([4, 4]); x.strokeStyle = '#fff'; x.strokeRect(v.tx + x0 * z + .5, v.ty + y0 * z + .5, w * z - 1, hh * z - 1); x.setLineDash([]); }
    if (trazo && trazo.tipo === 'lazo') { x.beginPath(); trazo.pts.forEach((p, i) => { const px = v.tx + (p.x + .5) * z, py = v.ty + (p.y + .5) * z; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.strokeStyle = '#fff'; x.setLineDash([4, 4]); x.stroke(); x.setLineDash([]); }
    const c = S.cursor; if (c && !trazo && ['lapiz', 'borrador', 'sombrear', 'linea', 'rect', 'elipse'].includes(S.herr)) { const o = Math.floor((S.tam - 1) / 2); espejos(c.x, c.y, (ex, ey) => { x.strokeStyle = '#000'; x.strokeRect(v.tx + (ex - o) * z - .5, v.ty + (ey - o) * z - .5, S.tam * z + 1, S.tam * z + 1); x.strokeStyle = '#fff'; x.strokeRect(v.tx + (ex - o) * z + .5, v.ty + (ey - o) * z + .5, S.tam * z - 1, S.tam * z - 1); }); }
    x.restore();
  };

  // ---------------------------------------------------------------- acciones sobre la imagen
  const enCapa = (nombre, fn, todo) => { soltarFlot(); const fin = cambioCapa(nombre), k = capa(), cx = CK.ctx(k.c), r = todo ? { x: 0, y: 0, w: k.c.width, h: k.c.height } : FR(), d = cx.getImageData(r.x, r.y, r.w, r.h), res = fn({ w: r.w, h: r.h, d: d.data }); if (res.w !== r.w || res.h !== r.h) { const ajust = PIX.make(r.w, r.h); PIX.blit(ajust, res, Math.round((r.w - res.w) / 2), r.h - res.h, false); cx.putImageData(new ImageData(new Uint8ClampedArray(ajust.d), r.w, r.h), r.x, r.y); } else cx.putImageData(new ImageData(new Uint8ClampedArray(res.d), r.w, r.h), r.x, r.y); fin(); pedir(); };
  const tamanoLienzo = async () => {
    const a = A(), f = FR(), d = { w: f.w, h: f.h, ancla: 'abajo', escalar: false };
    const ok = await CK.ventana({ titulo: a.cuadros ? 'Tamaño de cada cuadro' : 'Tamaño del lienzo', cuerpo: h('div', CK.campo('Ancho', CK.num(d.w, { min: 1, max: 1024 }, v => { d.w = v; })), CK.campo('Alto', CK.num(d.h, { min: 1, max: 1024 }, v => { d.h = v; })), CK.campo('El dibujo queda', CK.sel(d.ancla, [['abajo', 'Abajo al centro (pies)'], ['centro', 'Al centro'], ['arriba-izq', 'Arriba a la izquierda']], v => { d.ancla = v; })), CK.chk(false, 'Agrandar o achicar el dibujo también (sin emborronar)', v => { d.escalar = v; }, 'Apagado: solo cambia el espacio alrededor. Encendido: estira los píxeles al nuevo tamaño.')), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Aplicar', cls: 'pri', valor: true }] });
    if (!ok) return;
    estructura('Tamaño del lienzo', () => { const n = CK.asset.nCuadros(a); doc.capas.forEach(k => { const src = CK.aPix(k.c), frs = []; for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i); let im = PIX.crop(src, g.x, g.y, g.w, g.h); if (d.escalar) im = PIX.resizeNearest(im, d.w, d.h); else { const o = PIX.make(d.w, d.h), dx = d.ancla === 'arriba-izq' ? 0 : Math.round((d.w - g.w) / 2), dy = d.ancla === 'abajo' ? d.h - g.h : d.ancla === 'centro' ? Math.round((d.h - g.h) / 2) : 0; PIX.blit(o, im, dx, dy, false); im = o; } frs.push(im); } k.c = CK.aLienzo(PIX.pack(frs, n)); }); if (a.cuadros) { a.cuadros.fw = d.w; a.cuadros.fh = d.h; } sel = null; });
    const g = FR(); vista.encuadrar(g.w, g.h, 40);
  };
  const editarAfuera = async () => {
    const dir = CK.fs.dir('editor'), a = A(); if (!dir) { CK.aviso('Conectá la carpeta del editor para poder abrir el archivo en Aseprite.', 'info', 5000); return; }
    soltarFlot(); await CK.guardar({ silencio: true }); const ruta = CK.rutaProyecto() + '/assets/' + a.id + '.png'; let ult = (await CK.fs.leer(dir, ruta)).lastModified; clearInterval(vigia);
    vigia = setInterval(async () => { try { if (S.id !== a.id) { clearInterval(vigia); return; } const fi = await CK.fs.leer(dir, ruta); if (fi.lastModified > ult + 50) { ult = fi.lastModified; const c = await CK.cargarImagen(fi); estructura('Cambios de Aseprite', () => { doc.capas = [{ id: 'c1', nombre: 'Capa 1', visible: true, opacidad: 1, asset: null, c }]; doc.activa = 0; }); ult = Date.now() + 2500; CK.aviso('Actualizado desde el archivo: ' + a.nombre); } } catch (e) { } }, 1500);
    CK.ventana({ titulo: 'Editar en Aseprite', ancho: 520, cuerpo: h('div', h('p', 'Abrí este archivo con Aseprite (o Pyxel Edit). Cada vez que guardes ahí, se actualiza solo acá mientras tengas este asset abierto.'), h('input.in', { readonly: true, value: 'D:\\Editor\\' + ruta.replace(/\//g, '\\'), onclick: e => e.target.select() }), h('p.nota-txt', 'Guardá como PNG sobre el mismo archivo. Si el asset tiene varias capas acá, al volver queda en una sola.')) });
  };

  // ---------------------------------------------------------------- cuadros de animación
  const frames = () => { const a = A(), n = CK.asset.nCuadros(a); return doc.capas.map(k => { const src = CK.aPix(k.c), l = []; for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i); l.push(PIX.crop(src, g.x, g.y, g.w, g.h)); } return l; }); };
  const ponerFrames = porCapa => { doc.capas.forEach((k, i) => { k.c = CK.aLienzo(PIX.pack(porCapa[i], porCapa[i].length)); }); };
  const opCuadros = (nombre, fn) => { soltarFlot(); const a = A(); if (!a.cuadros) return; estructura(nombre, () => { const fs = frames(); fn(fs); ponerFrames(fs); doc.cuadro = CK.clamp(doc.cuadro, 0, fs[0].length - 1); sel = null; }); };
  const pintarCuadros = () => {
    if (!cuadrosEl) return; CK.vaciar(cuadrosEl); const a = A(); if (!a) return;
    if (!a.cuadros) { cuadrosEl.append(h('span.ayuda-txt', { style: { alignSelf: 'center' } }, 'Imagen fija.'), CK.btn({ ico: 'anim', txt: 'Convertir en animación', cls: 'chico', desc: 'Divide la imagen en cuadros (o le agrega un segundo cuadro) para animarla cuadro a cuadro.', on: async () => { const d = { fw: a.w, fh: a.h }; const ok = await CK.ventana({ titulo: 'Convertir en animación', cuerpo: h('div', h('p', 'Si la imagen ya es una tira de poses, poné el tamaño de cada cuadro. Si es un solo dibujo, dejalo así: se crea como primer cuadro.'), CK.campo('Ancho del cuadro', CK.num(d.fw, { min: 1, max: a.w }, v => { d.fw = v; })), CK.campo('Alto del cuadro', CK.num(d.fh, { min: 1, max: a.h }, v => { d.fh = v; }))), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Convertir', cls: 'pri', valor: true }] }); if (!ok) return; estructura('Convertir en animación', () => { a.cuadros = { fw: d.fw, fh: d.fh, fps: 8, bucle: true }; if (a.tipo === 'sprite') a.tipo = 'hoja'; }); const g = FR(); vista.encuadrar(g.w, g.h, 40); } })); return; }
    const n = CK.asset.nCuadros(a), alto = 56;
    for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i), mini = CK.mini(CK.img[a.id], alto, g); cuadrosEl.append(h('div.cuadro' + (i === doc.cuadro ? '.activo' : ''), { onclick: () => irCuadro(i) }, h('span.nro', String(i + 1)), mini)); }
    cuadrosEl.append(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' } },
      h('div.fila.junto', CK.btn({ ico: 'mas', tip: 'Cuadro nuevo', desc: 'Agrega un cuadro vacío después del actual.', cls: 'chico', on: () => opCuadros('Cuadro nuevo', fs => { fs.forEach(l => l.splice(doc.cuadro + 1, 0, PIX.make(l[0].w, l[0].h))); doc.cuadro++; }) }), CK.btn({ ico: 'duplicar', tip: 'Duplicar cuadro', desc: 'Copia el cuadro actual: la forma más rápida de hacer la pose siguiente.', cls: 'chico', on: () => opCuadros('Duplicar cuadro', fs => { fs.forEach(l => l.splice(doc.cuadro + 1, 0, PIX.clone(l[doc.cuadro]))); doc.cuadro++; }) }), CK.btn({ ico: 'basura', tip: 'Borrar cuadro', cls: 'chico peligro', on: () => { if (n < 2) return; opCuadros('Borrar cuadro', fs => fs.forEach(l => l.splice(doc.cuadro, 1))); } }),
        CK.btn({ ico: 'anterior', tip: 'Mover antes', desc: 'Cambia el orden: este cuadro pasa un lugar antes.', cls: 'chico', on: () => { if (doc.cuadro > 0) opCuadros('Ordenar cuadros', fs => { fs.forEach(l => { const t = l[doc.cuadro]; l[doc.cuadro] = l[doc.cuadro - 1]; l[doc.cuadro - 1] = t; }); doc.cuadro--; }); } }), CK.btn({ ico: 'siguiente', tip: 'Mover después', cls: 'chico', on: () => { if (doc.cuadro < n - 1) opCuadros('Ordenar cuadros', fs => { fs.forEach(l => { const t = l[doc.cuadro]; l[doc.cuadro] = l[doc.cuadro + 1]; l[doc.cuadro + 1] = t; }); doc.cuadro++; }); } })),
      h('div.fila.junto', CK.btn({ ico: 'cebolla', tip: 'Papel cebolla', desc: 'Muestra en transparencia el cuadro anterior y el siguiente, para dibujar el movimiento.', cls: 'chico' + (S.cebolla ? ' activo' : ''), on: (e, b) => { S.cebolla = !S.cebolla; b.classList.toggle('activo', S.cebolla); pedir(); } }), h('span.nota-txt', 'cuadros/s'), (() => { const i = CK.num(a.cuadros.fps || 8, { min: 1, max: 30 }, v => { a.cuadros.fps = v; CK.tocar(); }); i.style.width = '54px'; i.style.height = '24px'; return i; })(), CK.btn({ ico: 'anim', txt: 'Más opciones', cls: 'chico', desc: 'Alinear cuadros, exportar GIF y hoja en la sección Animaciones.', on: () => CK.ir('anim', { asset: a.id }) }))));
  };
  const irCuadro = i => { soltarFlot(); sel = null; doc.cuadro = CK.clamp(i, 0, CK.asset.nCuadros(A()) - 1); pintarCuadros(); pedir(); };

  // ---------------------------------------------------------------- panel derecho
  const pintarColor = () => { if (rueda) rueda.poner(S.c1); const cab = el && el.querySelector('.par-color'); if (cab) { cab.querySelector('.c1').style.background = S.c1; cab.querySelector('.c2').style.background = S.c2; } const hx = el && el.querySelector('.hex-c1'); if (hx && document.activeElement !== hx) hx.value = S.c1; el && el.querySelectorAll('.pal-proy .muestra').forEach(b => b.classList.toggle('activo', b.dataset.tip.toLowerCase() === S.c1)); };
  const crearRueda = alCambiar => {
    const T = 168, R = T / 2, c = CK.lienzo(T, T), r1 = R - 2, r0 = R - 20, lado = Math.floor(r0 * 1.36), o = Math.round(R - lado / 2); let H = 0, Sa = 0, V = 0, modo = null; c.style.cursor = 'crosshair'; c.style.imageRendering = 'auto';
    const pintarR = () => {
      const x = c.getContext('2d'); x.clearRect(0, 0, T, T);
      for (let a = 0; a < 360; a += 1) { x.beginPath(); x.strokeStyle = 'hsl(' + a + ',100%,50%)'; x.lineWidth = r1 - r0; x.arc(R, R, (r1 + r0) / 2, (a - 1.2) * Math.PI / 180, (a + 1.2) * Math.PI / 180); x.stroke(); }
      const img = x.createImageData(lado, lado); for (let yy = 0; yy < lado; yy++) for (let xx = 0; xx < lado; xx++) { const rgb = PIX.hsv2rgb(H, xx / (lado - 1), 1 - yy / (lado - 1)), i = (yy * lado + xx) * 4; img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255; } x.putImageData(img, o, o);
      const ha = H * Math.PI / 180, hx = R + Math.cos(ha) * (r1 + r0) / 2, hy = R + Math.sin(ha) * (r1 + r0) / 2; x.lineWidth = 2; x.strokeStyle = '#fff'; x.beginPath(); x.arc(hx, hy, 6, 0, 7); x.stroke(); x.strokeStyle = '#000'; x.lineWidth = 1; x.beginPath(); x.arc(hx, hy, 7.5, 0, 7); x.stroke();
      const sx = o + Sa * (lado - 1), sy = o + (1 - V) * (lado - 1); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(sx, sy, 5, 0, 7); x.stroke(); x.strokeStyle = '#000'; x.lineWidth = 1; x.beginPath(); x.arc(sx, sy, 6.5, 0, 7); x.stroke();
    };
    const ev = e => { const r = c.getBoundingClientRect(), mx = (e.clientX - r.left) * T / r.width, my = (e.clientY - r.top) * T / r.height, d = Math.hypot(mx - R, my - R); if (!modo) modo = d > r0 - 2 ? 'h' : 'sv'; if (modo === 'h') H = (Math.atan2(my - R, mx - R) * 180 / Math.PI + 360) % 360; else { Sa = CK.clamp((mx - o) / (lado - 1), 0, 1); V = CK.clamp(1 - (my - o) / (lado - 1), 0, 1); } pintarR(); alCambiar(PIX.rgb2hex(...PIX.hsv2rgb(H, Sa, V))); };
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); modo = null; ev(e); }); c.addEventListener('pointermove', e => { if (e.buttons) ev(e); }); c.addEventListener('pointerup', () => { modo = null; });
    c.poner = hex => { const [hh, s, v] = PIX.rgb2hsv(...PIX.hex2rgb(hex)); if (s > 0.001 && v > 0.001) H = hh; Sa = s; V = v; pintarR(); };
    return c;
  };
  const pColor = c => {
    rueda = crearRueda(hex => { S.c1 = S.soloPaleta ? colorOk(hex) : hex; pintarColor(); });
    const par = h('div.par-color', h('button.c2', { type: 'button', style: { background: S.c2 }, onclick: () => { [S.c1, S.c2] = [S.c2, S.c1]; pintarColor(); } }), h('button.c1', { type: 'button', style: { background: S.c1 } }));
    CK.tip(par, 'Color principal y secundario', 'El de adelante se usa con el clic izquierdo; el de atrás con el derecho. Clic en el de atrás para intercambiarlos.', 'X');
    const hx = CK.txt(S.c1, v => { if (/^#?[0-9a-f]{6}$/i.test(v)) { S.c1 = '#' + v.replace('#', '').toLowerCase(); pintarColor(); } }); hx.classList.add('hex-c1'); hx.style.width = '86px';
    c.append(h('div.bloque', h('div', { style: { display: 'grid', placeItems: 'center' } }, rueda), h('div.fila', { style: { marginTop: '8px' } }, par, hx, CK.btn({ ico: 'mas', tip: 'Sumar a la paleta', desc: 'Agrega el color principal a la paleta del proyecto.', cls: 'chico', on: () => { if (!CK.P.estilo.paleta.includes(S.c1)) { CK.P.estilo.paleta.push(S.c1); CK.tocar(); tabs.refrescar(); } } })),
      CK.chk(S.soloPaleta, 'Dibujar solo con la paleta', v => { S.soloPaleta = v; if (v) { S.c1 = colorOk(S.c1); S.c2 = colorOk(S.c2); pintarColor(); } }, 'Cualquier color que elijas se cambia por el más cercano de la paleta del proyecto: imposible salirse del estilo.')));
    const mp = CK.muestras(() => CK.P.estilo.paleta, { actual: () => S.c1, alElegir: hex => { S.c1 = hex; pintarColor(); }, alDerecho: hex => { S.c2 = hex; pintarColor(); }, pista: 'Clic: color principal. Clic derecho: secundario.' }); mp.classList.add('pal-proy');
    c.append(h('div.bloque', h('h3.bloque-tit', 'Paleta del proyecto'), mp));
    const usados = PIX.colors(CK.asset.pix(S.id), 400).slice(0, 48).map(x => x.hex), fuera = usados.filter(u => !CK.P.estilo.paleta.includes(u));
    c.append(h('div.bloque', h('h3.bloque-tit', 'Colores de esta imagen (' + usados.length + (usados.length >= 48 ? '+' : '') + ')'), CK.muestras(usados, { chicas: true, actual: () => S.c1, alElegir: hex => { S.c1 = hex; pintarColor(); }, alDerecho: hex => { S.c2 = hex; pintarColor(); } }), fuera.length ? h('p.nota-txt', { style: { color: 'var(--oro)' } }, fuera.length + ' no están en la paleta del proyecto.') : null));
    pintarColor();
  };
  const pCapas = c => {
    const l = h('div.lista');
    doc.capas.slice().reverse().forEach((k, ri) => { const i = doc.capas.length - 1 - ri; l.append(h('div.item' + (i === doc.activa ? '.activo' : ''), { onclick: () => { soltarFlot(); doc.activa = i; tabs.refrescar(); }, ondblclick: async () => { const n = await CK.pedir('Nombre de la capa', 'Nombre', k.nombre); if (n) { k.nombre = n; guardarMeta(); CK.tocar(); tabs.refrescar(); } } }, CK.btn({ ico: k.visible ? 'ojo' : 'ojoNo', tip: k.visible ? 'Ocultar' : 'Mostrar', cls: k.visible ? 'encendido' : '', on: e => { e.stopPropagation(); k.visible = !k.visible; componer(); pedir(); tabs.refrescar(); } }), CK.mini(k.c, 24, FR()), h('span.nombre', k.nombre), h('span.sub', Math.round(k.opacidad * 100) + '%'))); });
    const k = capa();
    c.append(h('div.bloque', h('h3.bloque-tit', 'Capas (arriba = adelante)'), l, h('div.fila', { style: { marginTop: '8px' } },
      CK.btn({ ico: 'mas', tip: 'Capa nueva', desc: 'Agrega una capa transparente encima. Sirve para probar un detalle sin tocar lo de abajo.', cls: 'chico', on: () => estructura('Capa nueva', () => { const n = { id: 'c' + Date.now().toString(36), nombre: 'Capa ' + (doc.capas.length + 1), visible: true, opacidad: 1, asset: null, c: CK.lienzo(k.c.width, k.c.height) }; doc.capas.splice(doc.activa + 1, 0, n); doc.activa++; }) }),
      CK.btn({ ico: 'duplicar', tip: 'Duplicar capa', cls: 'chico', on: () => estructura('Duplicar capa', () => { doc.capas.splice(doc.activa + 1, 0, { id: 'c' + Date.now().toString(36), nombre: k.nombre + ' copia', visible: true, opacidad: k.opacidad, asset: null, c: CK.copiaLienzo(k.c) }); doc.activa++; }) }),
      CK.btn({ ico: 'subir', tip: 'Subir capa', cls: 'chico', on: () => { if (doc.activa < doc.capas.length - 1) estructura('Ordenar capas', () => { const i = doc.activa;[doc.capas[i], doc.capas[i + 1]] = [doc.capas[i + 1], doc.capas[i]]; doc.activa++; }); } }),
      CK.btn({ ico: 'bajar', tip: 'Bajar capa', cls: 'chico', on: () => { if (doc.activa > 0) estructura('Ordenar capas', () => { const i = doc.activa;[doc.capas[i], doc.capas[i - 1]] = [doc.capas[i - 1], doc.capas[i]]; doc.activa--; }); } }),
      CK.btn({ ico: 'capas', tip: 'Unir con la de abajo', desc: 'Funde la capa activa con la que tiene debajo.', cls: 'chico', on: () => { if (doc.activa > 0) estructura('Unir capas', () => { const ab = doc.capas[doc.activa - 1], x = CK.ctx(ab.c); x.globalAlpha = k.opacidad; x.drawImage(k.c, 0, 0); x.globalAlpha = 1; doc.capas.splice(doc.activa, 1); doc.activa--; }); } }),
      CK.btn({ ico: 'basura', tip: 'Borrar capa', cls: 'chico peligro', on: () => { if (doc.capas.length > 1) estructura('Borrar capa', () => { doc.capas.splice(doc.activa, 1); doc.activa = Math.max(0, doc.activa - 1); }); else CK.aviso('Tiene que quedar al menos una capa.', 'info'); } })),
      CK.campo('Opacidad', CK.rango(Math.round(k.opacidad * 100), { min: 0, max: 100 }, (v, f) => { k.opacidad = v / 100; pedir(); if (f) { componer(); tabs.refrescar(); } }))));
  };
  const pVista = c => {
    const a = A(), caja = h('div', { style: { display: 'grid', placeItems: 'center', gap: '8px' } }); let esc = 2;
    const fija = CK.lienzo(1, 1); fija.style.imageRendering = 'pixelated';
    previa = () => { if (!fija.isConnected) return; const f = FR(); fija.width = f.w * esc; fija.height = f.h * esc; const x = CK.ctx(fija); CK.cuadros(x, fija.width, fija.height, 8); x.drawImage(CK.img[S.id], f.x, f.y, f.w, f.h, 0, 0, fija.width, fija.height); };
    caja.append(fija); if (a.cuadros) { const rep = CK.reproductor(() => { const n = CK.asset.nCuadros(a), l = []; for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i), cc = CK.lienzo(g.w, g.h); CK.ctx(cc).drawImage(CK.img[S.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); l.push(cc); } return l; }, () => a.cuadros.fps || 8, { tam: 180 }); caja.append(h('span.nota-txt', 'Animación en loop'), rep); }
    c.append(h('div.bloque', h('h3.bloque-tit', 'Tamaño real', CK.sel('2', [['1', '×1'], ['2', '×2'], ['3', '×3'], ['4', '×4']], v => { esc = +v; previa(); })), caja));
    setTimeout(previa, 0);
  };

  // ---------------------------------------------------------------- tira de opciones
  const inter = (ico, tip, desc, get, set, tecla) => { const b = CK.btn({ ico, tip, desc, tecla, cls: 'chico plano' + (get() ? ' activo' : ''), on: () => { set(!get()); b.classList.toggle('activo', get()); pedir(); } }); return b; };
  const pintarTira = () => {
    if (!tira) return; CK.vaciar(tira); const a = A();
    tira.append(h('div.tira', CK.btn({ ico: 'imagen', txt: a ? a.nombre : 'Elegir asset', cls: 'chico', desc: 'El asset que estás editando. Clic para abrir otro.', on: async () => { const id = await CK.elegirAsset('Abrir en el editor de píxeles'); if (id) abrir(id); } }), CK.btn({ ico: 'mas', tip: 'Dibujo nuevo', desc: 'Crea un asset vacío para dibujar desde cero.', cls: 'chico plano', on: nuevo })));
    if (!a) return;
    const tam = CK.rango(S.tam, { min: 1, max: 8 }, v => { S.tam = v; pedir(); }); tam.style.width = '110px'; const tt = h('div.tira', h('span.txt', 'Punta'), tam); CK.tip(tt, 'Tamaño de la punta', 'Grosor del lápiz, el borrador y las formas, en píxeles.', '[ y ]');
    tira.append(tt, h('div.tira',
      inter('centrar', 'Píxel perfecto', 'Al dibujar a mano alzada quita los píxeles dobles de las esquinas: las líneas quedan limpias, de 1 píxel.', () => S.perfecto, v => { S.perfecto = v; }),
      inter('rectLleno', 'Relleno', 'Rectángulos y elipses salen llenos en vez de solo el borde.', () => S.relleno, v => { S.relleno = v; }),
      inter('enlace', 'Contiguo', 'Encendido: el balde y la varita toman solo la zona conectada. Apagado: toman ese color en todo el cuadro.', () => S.contiguo, v => { S.contiguo = v; }),
      h('span.sep'),
      inter('espejo', 'Espejo horizontal', 'Lo que dibujás de un lado se repite del otro. Ideal para personajes y objetos vistos de frente.', () => S.espH, v => { S.espH = v; }),
      inter('voltearV', 'Espejo vertical', 'Repite el dibujo arriba y abajo.', () => S.espV, v => { S.espV = v; }),
      inter('grilla', 'Grilla', 'Muestra la cuadrícula de píxeles (con zoom alto) y la de tiles.', () => S.grilla, v => { S.grilla = v; })));
    if (sel || flot) tira.append(h('div.tira', h('span.txt', 'Selección'),
      CK.btn({ ico: 'voltearH', tip: 'Voltear selección', cls: 'chico plano', on: () => transformarSel('Voltear', PIX.flipH) }), CK.btn({ ico: 'voltearV', tip: 'Voltear vertical', cls: 'chico plano', on: () => transformarSel('Voltear', PIX.flipV) }), CK.btn({ ico: 'rotar', tip: 'Rotar 90°', desc: 'Gira la selección un cuarto de vuelta sin deformar píxeles.', cls: 'chico plano', on: () => transformarSel('Rotar', PIX.rot90) }),
      CK.btn({ ico: 'duplicar', tip: 'Copiar', tecla: 'Ctrl + C', cls: 'chico plano', on: () => copiar() }), CK.btn({ ico: 'basura', tip: 'Borrar lo seleccionado', tecla: 'Supr', cls: 'chico plano', on: borrarSel }), CK.btn({ ico: 'cerrar', tip: 'Soltar la selección', tecla: 'Esc', cls: 'chico plano', on: () => { soltarFlot(); sel = null; pintarTira(); pedir(); } })));
    const pal = () => CK.P.estilo.paleta;
    tira.append(h('div.tira',
      CK.btn({ ico: 'paleta', tip: 'Llevar a la paleta', desc: 'Cambia cada color de la capa por el más cercano de la paleta del proyecto.', cls: 'chico plano', on: () => enCapa('Llevar a la paleta', im => PIX.quantize(im, pal()), true) }),
      CK.btn({ ico: 'limpiar', tip: 'Limpiar', desc: 'Quita píxeles sueltos y deja los bordes duros (sin semitransparencias).', cls: 'chico plano', on: () => enCapa('Limpiar', im => PIX.cleanup(PIX.hardenAlpha(im, 110))) }),
      CK.btn({ ico: 'contorno', tip: 'Agregar contorno', desc: 'Rodea la figura con 1 píxel de contorno según la guía de estilo (' + CK.P.estilo.contorno + '). Necesita 1 píxel libre alrededor.', cls: 'chico plano', on: () => enCapa('Contorno', im => { const e = CK.P.estilo; const r = e.contorno === 'color' && pal().length ? PIX.outlineSelf(PIX.crop(im, 1, 1, im.w - 2, im.h - 2), pal(), -2) : PIX.outline(im, e.contorno === 'ninguno' ? S.c1 : e.colorContorno, { agrandar: false }); return r; }) }),
      CK.btn({ ico: 'recortar', tip: 'Quitar contorno', desc: 'Saca 1 píxel de todo el borde de la figura.', cls: 'chico plano', on: () => enCapa('Quitar contorno', PIX.removeOutline) }),
      h('span.sep'),
      CK.btn({ ico: 'voltearH', tip: 'Voltear todo', desc: 'Espeja el cuadro completo.', cls: 'chico plano', on: () => enCapa('Voltear', PIX.flipH) }),
      CK.btn({ ico: 'tamano', tip: 'Tamaño del lienzo', desc: 'Cambia el ancho y alto del dibujo (o de cada cuadro).', cls: 'chico plano', on: tamanoLienzo }),
      CK.btn({ ico: 'exportar', tip: 'Editar en Aseprite', desc: 'Muestra el archivo PNG de este asset para abrirlo en Aseprite. Al guardar allá, se actualiza solo acá.', cls: 'chico plano', on: editarAfuera }),
      CK.btn({ ico: 'importar', tip: 'Descargar PNG', desc: 'Baja la imagen, a tamaño real o ampliada.', cls: 'chico plano', on: async () => { const e = await CK.ventana({ titulo: 'Descargar', cuerpo: h('p', 'Elegí la escala. Las ampliadas no se emborronan: sirven para mostrar en un portfolio.'), botones: [1, 2, 4, 8].map(n => ({ txt: '×' + n, valor: n, cls: n === 1 ? 'pri' : '' })) }); if (!e) return; const im = PIX.resizeNearest(CK.asset.pix(S.id), a.w * e, a.h * e); CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (e > 1 ? '_x' + e : '') + '.png'); } })));
  };
  const nuevo = async () => {
    const T = CK.P.estilo.tile, d = { nombre: 'dibujo', w: T * 2, h: T * 2, tipo: 'sprite' };
    const rap = (txt, w, hh) => CK.btn({ txt, cls: 'chico', on: () => { d.w = w; d.h = hh; iw.value = w; ih.value = hh; } }), iw = CK.num(d.w, { min: 1, max: 1024 }, v => { d.w = v; }), ih = CK.num(d.h, { min: 1, max: 1024 }, v => { d.h = v; });
    const ok = await CK.ventana({ titulo: 'Dibujo nuevo', cuerpo: h('div', CK.campo('Nombre', CK.txt(d.nombre, v => { d.nombre = v; }, { vivo: true })), CK.campo('Tipo', CK.sel(d.tipo, Object.keys(CK.asset.TIPOS).filter(k => !['ref', 'hoja'].includes(k)).map(k => [k, CK.asset.TIPOS[k]]), v => { d.tipo = v; })), CK.campo('Ancho', iw), CK.campo('Alto', ih), h('div.fila', h('span.nota-txt', 'Rápidos:'), rap('1 tile', T, T), rap('2 × 2 tiles', T * 2, T * 2), rap('Personaje', CK.P.estilo.personaje[0], CK.P.estilo.personaje[1]), rap('Ícono 16', 16, 16), rap('Ícono 32', 32, 32))), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Crear', cls: 'pri', valor: true }] });
    if (!ok) return; const a = CK.asset.crear({ nombre: d.nombre.trim() || 'dibujo', tipo: d.tipo, lienzo: CK.lienzo(d.w, d.h), origen: 'dibujado a mano' }); abrir(a.id);
  };
  const pintarTodo = () => { if (!el) return; pintarTira(); pintarCuadros(); if (tabs) tabs.refrescar(); pintarVacio(); pedir(); };
  let vacio = null;
  const pintarVacio = () => { if (vacio) { vacio.remove(); vacio = null; } if (A()) return; vacio = h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', background: 'var(--hueco)', zIndex: 4 } }, CK.vacio('pixel', 'Elegí qué dibujar', 'Abrí un asset del proyecto para retocarlo, o empezá un dibujo nuevo.', h('div.fila', CK.btn({ ico: 'imagen', txt: 'Abrir un asset', cls: 'pri', on: async () => { const id = await CK.elegirAsset('Abrir en el editor de píxeles'); if (id) abrir(id); } }), CK.btn({ ico: 'mas', txt: 'Dibujo nuevo', on: nuevo })))); lienzo.parentElement.append(vacio); };

  const crear = raiz => {
    el = raiz; el.style.gridTemplateColumns = '52px 1fr 292px'; el.style.gridTemplateRows = '1fr auto';
    herrCol = CK.herramientas(HERR, S.herr, id => ponerHerr(id)); herrCol.style.gridRow = '1 / 3';
    lienzo = h('canvas.lienzo'); tira = h('div.sobre');
    const tablero = h('div.tablero', lienzo, tira);
    cuadrosEl = h('div.cuadros');
    panel = h('aside.panel', { style: { gridRow: '1 / 3' } });
    el.append(herrCol, tablero, panel, cuadrosEl); herrCol.style.gridColumn = '1'; tablero.style.gridColumn = '2'; tablero.style.gridRow = '1'; panel.style.gridColumn = '3'; cuadrosEl.style.gridColumn = '2'; cuadrosEl.style.gridRow = '2';
    vista = CK.vista(lienzo, { pintar, herramienta, zoom: 8 });
    tablero.append(h('div.sobre.abajo.der', CK.tiraZoom(vista, () => { const f = FR(); vista.encuadrar(f.w, f.h, 40); })));
    tabs = CK.pestanas([{ id: 'color', txt: 'Color', ico: 'estilo', desc: 'Rueda de color, paleta del proyecto y colores de la imagen.', pintar: c => { if (A()) pColor(c); } }, { id: 'capas', txt: 'Capas', ico: 'capas', desc: 'Capas del dibujo con opacidad.', pintar: c => { if (A()) pCapas(c); } }, { id: 'vista', txt: 'Vista', ico: 'ojo', desc: 'El asset a tamaño real y su animación.', pintar: c => { if (A()) pVista(c); } }], 'color');
    panel.append(tabs);
    CK.soltarEn(tablero, async fs => { const as = await CK.importarImagenes('sprite', fs); if (as.length) abrir(as[0].id); });
    CK.on('estilo', () => { if (CK.seccion_actual === 'pixel' && tabs.actual() === 'color') tabs.refrescar(); });
  };
  const ponerHerr = id => { if (flot && !['mover', 'selRect', 'lazo', 'varita'].includes(id)) soltarFlot(); S.herr = id; herrCol.elegir(id); const t = HERR.find(x => x.id === id); document.getElementById('estado-herr').textContent = 'Pixel art · ' + t.tip; CK.estado(t.est); pedir(); };
  const mostrar = arg => {
    if (!CK.P) return; if (arg && CK.P.assets[arg]) abrir(arg); else if (S.id && CK.P.assets[S.id]) { if (!doc || CK.img[S.id] !== (doc.capas.length === 1 ? doc.capas[0].c : CK.img[S.id])) abrir(S.id); } else if (CK.P.ui.pixel && CK.P.assets[CK.P.ui.pixel]) abrir(CK.P.ui.pixel); else { S.id = null; doc = null; }
    pintarTodo(); vista.medir();
  };
  const tecla = (e, k, ctrl) => {
    if (!A()) return false;
    if (ctrl) { if (k === 'c') { copiar(); return true; } if (k === 'x') { copiar(true); return true; } if (k === 'v') { pegar(); return true; } if (k === 'a') { soltarFlot(); const f = FR(); ponerSel(new Uint8Array(f.w * f.h).fill(1)); return true; } if (k === 'd') { soltarFlot(); sel = null; pintarTira(); pedir(); return true; } return false; }
    if (k === 'escape') { soltarFlot(); sel = null; trazo = null; pintarTira(); pedir(); return true; }
    if (k === 'enter') { soltarFlot(); return true; }
    if (k === 'delete' || k === 'backspace') { borrarSel(); return true; }
    if (k === 'x') { [S.c1, S.c2] = [S.c2, S.c1]; pintarColor(); return true; }
    if (k === '[' || k === ']') { S.tam = CK.clamp(S.tam + (k === ']' ? 1 : -1), 1, 8); pintarTira(); return true; }
    if (k === ',' || k === '.') { irCuadro(doc.cuadro + (k === '.' ? 1 : -1)); return true; }
    if (k === '0') { const f = FR(); vista.encuadrar(f.w, f.h, 40); return true; } if (k === '+' || k === '=') { vista.zoomEn(1); return true; } if (k === '-') { vista.zoomEn(-1); return true; }
    if (k.startsWith('arrow') && (sel || flot)) { levantar(); const d = e.shiftKey ? 8 : 1; flot.x += k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0; flot.y += k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0; pedir(); return true; }
    const t = HERR.find(x => x.tecla && x.tecla.toLowerCase() === k); if (t) { ponerHerr(t.id); return true; }
    return false;
  };
  CK.pixel = { abrir, S, doc: () => doc, soltar: soltarFlot };
  CK.on('antes-guardar', () => { if (doc && flot) soltarFlot(); });
  CK.on('asset-img', id => { if (doc && id === S.id && CK.seccion_actual !== 'pixel') { doc = null; } });
  CK.registrar({ id: 'pixel', nombre: 'Pixel art', ico: 'pixel', desc: 'Dibujo y retoque a mano, píxel a píxel, con la paleta del proyecto.', crear, mostrar, tecla, ocultar: () => { soltarFlot(); clearInterval(vigia); }, alCambiarProyecto: () => { S.id = null; doc = null; sel = null; flot = null; } });
})();
