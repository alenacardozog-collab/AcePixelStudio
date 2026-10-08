/* ANIMACIONES: genera movimiento a partir de un asset quieto (ondear, mecer, flotar, titilar…), ordena y alinea hojas de
   sprites, y exporta PNG + datos + GIF. La lista de pendientes sale de las marcas "a animar" que dejaste en los mapas. */
'use strict';
(function () {
  const h = CK.h; let el, izq, der, centro, tabs, cajaRep, tiraCuadros, infoEl;
  const st = { base: null, tipo: 'ondear', params: {}, usarPaleta: true, fps: 8, frames: [], hoja: null, origen: null, fondo: 'cuadros', modo: 'generar' };
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
  const cuadrosVista = () => {
    if (st.modo === 'generar') return st.frames.map(CK.aLienzo);
    const a = CK.P.assets[st.hoja]; if (!a || !a.cuadros) return []; const n = CK.asset.nCuadros(a), ord = a.cuadros.orden || [...Array(n).keys()], l = ord.map(i => { const g = CK.asset.cuadro(a, i), c = CK.lienzo(g.w, g.h); CK.ctx(c).drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h); return c; });
    return a.cuadros.vaiven && l.length > 2 ? l.concat(l.slice(1, -1).reverse()) : l;
  };
  let cache = [], cacheKey = '';
  const cuadrosCache = () => { const a = CK.P.assets[st.hoja], k = st.modo + '|' + (st.modo === 'generar' ? st.frames.length + ':' + st._v : (a ? a.id + ':' + (a.modificado || 0) + ':' + JSON.stringify(a.cuadros) : '')); if (k !== cacheKey) { cacheKey = k; cache = cuadrosVista(); } return cache; };
  const fpsAct = () => st.modo === 'generar' ? st.fps : ((CK.P.assets[st.hoja] || {}).cuadros || {}).fps || 8;

  const pintarCentro = () => {
    st._v = (st._v || 0) + 1; if (!tiraCuadros) return; CK.vaciar(tiraCuadros); const fr = cuadrosCache();
    fr.forEach((c, i) => tiraCuadros.append(h('div.cuadro', h('span.nro', String(i + 1)), CK.mini(c, 64))));
    if (!fr.length) tiraCuadros.append(h('span.ayuda-txt', { style: { padding: '14px' } }, st.modo === 'generar' ? 'Elegí un asset base a la derecha para generar la animación.' : 'Elegí una animación de la lista de la izquierda.'));
    const a = st.modo === 'generar' ? CK.P.assets[st.base] : CK.P.assets[st.hoja];
    infoEl.textContent = fr.length ? (a ? a.nombre + ' · ' : '') + fr.length + ' cuadros de ' + fr[0].width + ' × ' + fr[0].height + ' px a ' + fpsAct() + ' por segundo (' + (fr.length / fpsAct()).toFixed(2) + ' s)' : '';
  };

  // ---------------------------------------------------------------- guardar / importar / exportar
  const guardarGenerada = async () => {
    if (!st.frames.length) return; const b = CK.P.assets[st.base], def = PIX.ANIMS[st.tipo], nombre = await CK.pedir('Guardar animación', 'Nombre', b.nombre + '_' + st.tipo); if (!nombre) return;
    const fw = Math.max(...st.frames.map(f => f.w)), fh = Math.max(...st.frames.map(f => f.h));
    const a = CK.asset.crear({ nombre, tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(st.frames, st.frames.length)), origen: 'animación "' + def.nombre + '" de ' + b.nombre, cuadros: { fw, fh, fps: st.fps, bucle: !['aparecer', 'golpe', 'humo', 'sacudir'].includes(st.tipo), oy: PIX.animBase(st.tipo, st.params) }, extra: { base: b.id, col: b.col ? CK.clone(b.col) : undefined, receta: { tipo: st.tipo, params: CK.clone(st.params) } } });
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
  const importarSueltos = async () => {
    const fs = (await CK.elegirArchivos('image/png,image/gif,image/webp', true)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); if (fs.length < 2) { if (fs.length) CK.aviso('Elegí dos o más imágenes (un cuadro por archivo).', 'info'); return; }
    const frs = []; for (const f of fs) frs.push(CK.aPix(await CK.cargarImagen(f))); const fw = Math.max(...frs.map(f => f.w)), fh = Math.max(...frs.map(f => f.h));
    const a = CK.asset.crear({ nombre: fs[0].name.replace(/[_\- ]?\d*\.[a-z0-9]+$/i, '') || 'animacion', tipo: 'hoja', lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), origen: 'cuadros sueltos', cuadros: { fw, fh, fps: 8, bucle: true } }); st.hoja = a.id; tabs.ir('hoja'); pintarIzq(); CK.aviso('Armada la hoja con ' + frs.length + ' cuadros');
  };
  /** Datos de la hoja en formato atlas (lo leen Phaser, Godot y Unity con sus importadores de JSON). */
  CK.animDatos = a => { const n = CK.asset.nCuadros(a), frames = {}, ms = Math.round(1000 / (a.cuadros.fps || 8)); for (let i = 0; i < n; i++) { const g = CK.asset.cuadro(a, i); frames[a.id + '_' + String(i).padStart(2, '0')] = { frame: { x: g.x, y: g.y, w: g.w, h: g.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: g.w, h: g.h }, sourceSize: { w: g.w, h: g.h }, duration: ms }; } return { frames, meta: { app: 'Taller CastleKnight', image: a.id + '.png', format: 'RGBA8888', size: { w: a.w, h: a.h }, scale: '1', frameTags: [{ name: a.id, from: 0, to: n - 1, direction: a.cuadros.vaiven ? 'pingpong' : 'forward' }], fps: a.cuadros.fps || 8, repeat: a.cuadros.bucle === false ? 0 : -1 } }; };
  const exportar = async (que, escala) => {
    const a = CK.P.assets[st.hoja]; if (!a || !a.cuadros) return;
    if (que === 'png') { const im = PIX.resizeNearest(CK.asset.pix(a.id), a.w * escala, a.h * escala); CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (escala > 1 ? '_x' + escala : '') + '.png'); }
    else if (que === 'json') CK.descargar(new Blob([JSON.stringify(CK.animDatos(a), null, 1)], { type: 'application/json' }), a.id + '.json');
    else if (que === 'gif') { const frs = cuadrosVista().map(CK.aPix); CK.descargar(new Blob([CKGif(frs, { fps: a.cuadros.fps || 8, escala, bucle: a.cuadros.bucle !== false })], { type: 'image/gif' }), a.id + (escala > 1 ? '_x' + escala : '') + '.gif'); }
  };

  // ---------------------------------------------------------------- paneles
  const pintarIzq = () => {
    if (!izq) return; CK.vaciar(izq);
    const pend = pendientes(), lp = h('div.lista');
    pend.forEach(({ mapa, o }) => { const a = CK.P.assets[o.asset], hecha = o.marca.estado === 'hecha'; lp.append(h('div.item' + (st.origen && st.origen.objeto === o.id ? '.activo' : ''), { style: { alignItems: 'flex-start' }, onclick: () => { st.base = o.asset; st.origen = { objeto: o.id, mapa: mapa.id }; if (PIX.ANIMS[o.marca.tipoAnim]) { st.tipo = o.marca.tipoAnim; st.params = {}; } tabs.ir('generar'); pintarIzq(); } }, CK.mini(CK.img[o.asset], 28, a && CK.asset.cuadro(a, 0)), h('div.crece', h('div.nombre', (o.nombre || (a || {}).nombre || 'Objeto') + ' '), h('div.sub', { style: { whiteSpace: 'normal' } }, o.marca.nota || '(sin nota)'), h('div.sub', mapa.nombre)), h('span.etq.' + (hecha ? 'verde' : 'oro'), hecha ? 'hecha' : 'pendiente'))); });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Pendientes de animar (' + pend.filter(p => p.o.marca.estado !== 'hecha').length + ')'), pend.length ? lp : h('p.nota-txt', 'Acá aparecen los objetos que marques con la herramienta "Marcar para animar" (M) en un mapa, con la nota de cómo los querés.')));
    const g = CK.galeria({ tipos: ['hoja', 'personaje', 'fx'], actual: () => st.modo === 'hoja' ? st.hoja : null, alElegir: id => { if (!CK.P.assets[id].cuadros) { CK.aviso('Ese asset todavía no tiene cuadros. Abrilo en Pixel art → "Convertir en animación", o usalo como base para generar.', 'info', 5000); st.base = id; tabs.ir('generar'); return; } st.hoja = id; tabs.ir('hoja'); }, alDoble: id => CK.ir('pixel', id), pista: 'Clic: verla y ajustarla. Doble clic: editar sus cuadros.', vacio: 'Todavía no hay animaciones.' });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Animaciones del proyecto'), g, h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'hoja', txt: 'Importar tira', cls: 'chico', desc: 'Una sola imagen con todos los cuadros en fila (como las que exporta PixelLab o Aseprite).', on: importarTira }), CK.btn({ ico: 'importar', txt: 'Cuadros sueltos', cls: 'chico', desc: 'Varios archivos, uno por cuadro. Se ordenan por nombre y se arman en una hoja.', on: importarSueltos }))));
  };
  const pGenerar = c => {
    st.modo = 'generar'; const b = CK.P.assets[st.base], def = PIX.ANIMS[st.tipo];
    c.append(h('div.bloque', h('h3.bloque-tit', 'Qué animar'), h('div.fila.junto', b ? CK.mini(CK.img[b.id], 48, CK.asset.cuadro(b, 0)) : h('span', { html: CK.ico('imagen', 30) }), h('div.crece', h('b', b ? b.nombre : 'Sin elegir'), b ? h('div.nota-txt', b.w + ' × ' + b.h + ' px') : null), CK.btn({ txt: b ? 'Cambiar' : 'Elegir', cls: b ? 'chico' : 'chico pri', desc: 'El dibujo quieto del que sale la animación.', on: async () => { const id = await CK.elegirAsset('Asset para animar', ['sprite', 'hoja', 'personaje', 'ui', 'fx']); if (id) { st.base = id; st.origen = null; tabs.refrescar(); pintarIzq(); } } })),
      st.origen ? h('p.nota-txt', { style: { color: 'var(--oro)' } }, 'Viene de una marca del mapa: al guardar, se coloca sola en ese objeto.') : null));
    const ops = Object.keys(PIX.ANIMS).map(k => [k, PIX.ANIMS[k].nombre]);
    const bl = h('div.bloque', h('h3.bloque-tit', 'Movimiento'), CK.campo('Tipo', CK.sel(st.tipo, ops, v => { st.tipo = v; st.params = {}; tabs.refrescar(); })), h('p.nota-txt', def.desc));
    Object.keys(def.params).forEach(k => { const p = def.params[k], val = st.params[k] === undefined ? p[0] : st.params[k], rot = { cuadros: 'Cuadros', fuerza: 'Fuerza (px)', ondas: 'Ondas', fijo: 'Lado fijo', ancho: 'Ancho del brillo' }[k] || k; if (Array.isArray(p[1])) bl.append(CK.campo(rot, CK.sel(val, p[1], v => { st.params[k] = v; generar(); }))); else bl.append(CK.campo(rot, CK.rango(val, { min: p[1], max: p[2], step: p[0] % 1 ? 0.5 : 1 }, v => { st.params[k] = v; generar(); }))); });
    bl.append(CK.campo('Velocidad', CK.rango(st.fps, { min: 2, max: 24 }, v => { st.fps = v; pintarCentro(); }), 'Cuadros por segundo. Ambiente tranquilo: 4 a 6. Acción: 10 a 12.'), CK.chk(st.usarPaleta, 'Usar solo colores de la paleta', v => { st.usarPaleta = v; generar(); }, 'Los brillos y sombras de la animación toman tonos vecinos de tu paleta, sin inventar colores.'));
    c.append(bl, h('div.bloque', CK.btn({ ico: 'guardar', txt: st.origen ? 'Guardar y poner en el mapa' : 'Guardar animación', cls: 'pri', desc: 'Guarda los cuadros como una hoja de sprites del proyecto.', on: guardarGenerada }), h('p.nota-txt', { style: { marginTop: '8px' } }, 'Estas animaciones mueven y recolorean los píxeles del dibujo original. Sirven para ambiente, objetos y efectos. Para poses nuevas de un personaje (caminar, atacar) hace falta dibujar cada cuadro: usá Pixel art o una base de PixelLab, y acá la alineás y exportás.')));
    generar();
  };
  const pHoja = c => {
    st.modo = 'hoja'; const a = CK.P.assets[st.hoja];
    if (!a || !a.cuadros) { c.append(CK.vacio('anim', 'Elegí una animación', 'En la lista de la izquierda, o importá una tira de cuadros.')); pintarCentro(); return; }
    const k = a.cuadros, n = CK.asset.nCuadros(a), re = () => { CK.tocar(); a.modificado = Date.now(); pintarCentro(); };
    c.append(h('div.bloque', h('h3.bloque-tit', a.nombre), h('div.duo', h('label', h('span.mini-rot', 'Ancho del cuadro'), CK.num(k.fw, { min: 1, max: a.w }, v => { k.fw = v; re(); })), h('label', h('span.mini-rot', 'Alto del cuadro'), CK.num(k.fh, { min: 1, max: a.h }, v => { k.fh = v; re(); }))),
      a.w % k.fw || a.h % k.fh ? h('p.nota-txt', { style: { color: 'var(--rojo)' } }, 'La hoja (' + a.w + ' × ' + a.h + ') no se divide justo en cuadros de ese tamaño.') : h('p.nota-txt', n + ' cuadros'),
      CK.campo('Velocidad', CK.rango(k.fps || 8, { min: 1, max: 24 }, v => { k.fps = v; re(); }), 'Cuadros por segundo.'),
      CK.chk(k.bucle !== false, 'Se repite en loop', v => { k.bucle = v; re(); }), CK.chk(!!k.vaiven, 'Ida y vuelta', v => { k.vaiven = v; re(); }, 'Al llegar al último cuadro vuelve hacia atrás en vez de saltar al primero. Queda más suave en banderas y plantas.')));
    const jit = PIX.frameJitter(PIX.slice(CK.asset.pix(a.id), k.fw, k.fh));
    const aplicar = (nombre, fn) => { const fin = CK.hist.imagen(nombre, a.id), frs = fn(PIX.slice(CK.asset.pix(a.id), k.fw, k.fh)); CK.asset.poner(a.id, CK.aLienzo(PIX.pack(frs, frs.length))); fin(); tabs.refrescar(); };
    c.append(h('div.bloque', h('h3.bloque-tit', 'Arreglar la hoja'), jit > 1 ? h('div.problema.medio', { html: CK.ico('alerta', 18) }, h('div', h('div.pt', 'El dibujo se corre ' + jit + ' px entre cuadros'), h('div.pd', 'Por eso el personaje "salta". Alinealo por los pies.'))) : h('p.nota-txt', 'Los cuadros están alineados.'),
      h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'centrar', txt: 'Alinear por los pies', cls: 'chico', desc: 'Corre cada cuadro para que la base del dibujo quede siempre en el mismo lugar. Es lo que evita que el personaje salte.', on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'pies')) }), CK.btn({ txt: 'Alinear por el centro', cls: 'chico', desc: 'Centra cada cuadro. Mejor para efectos y objetos que giran.', on: () => aplicar('Alinear cuadros', f => PIX.alignFrames(f, 'centro')) }),
        CK.btn({ ico: 'bucle', txt: 'Invertir orden', cls: 'chico', on: () => aplicar('Invertir cuadros', f => f.reverse()) }), CK.btn({ ico: 'paleta', txt: 'Llevar a la paleta', cls: 'chico', desc: 'Pasa todos los cuadros a la paleta del proyecto.', on: () => aplicar('Paleta', f => f.map(x => PIX.quantize(x, CK.P.estilo.paleta))) }), CK.btn({ ico: 'limpiar', txt: 'Limpiar', cls: 'chico', desc: 'Bordes duros y sin píxeles sueltos en todos los cuadros.', on: () => aplicar('Limpiar', f => f.map(x => PIX.cleanup(PIX.hardenAlpha(x, 110)))) })),
      h('div.fila', { style: { marginTop: '6px' } }, CK.btn({ ico: 'voltearH', txt: 'Crear versión espejada', cls: 'chico', desc: 'Crea otra animación igual pero mirando al otro lado (para izquierda / derecha).', on: () => { const frs = PIX.slice(CK.asset.pix(a.id), k.fw, k.fh).map(PIX.flipH), nu = CK.asset.crear({ nombre: a.nombre + '_espejo', tipo: a.tipo, lienzo: CK.aLienzo(PIX.pack(frs, frs.length)), cuadros: CK.clone(k), origen: 'espejo de ' + a.nombre }); st.hoja = nu.id; tabs.refrescar(); pintarIzq(); } }), CK.btn({ ico: 'pixel', txt: 'Editar cuadros', cls: 'chico', desc: 'Abre la hoja en Pixel art, con papel cebolla, para retocar cuadro a cuadro.', on: () => CK.ir('pixel', a.id) }))));
    const esc = { v: 4 };
    c.append(h('div.bloque', h('h3.bloque-tit', 'Exportar'), h('p.nota-txt', 'Al usar "Exportar al juego" esta hoja va sola con el resto. Estos botones son para llevarla a otro lado.'),
      CK.campo('Ampliar', CK.sel('4', [['1', '×1 (tamaño real, para el juego)'], ['2', '×2'], ['4', '×4 (para mostrar)'], ['8', '×8']], v => { esc.v = +v; }), 'Las ampliaciones no emborronan los píxeles.'),
      h('div.fila', CK.btn({ ico: 'hoja', txt: 'Hoja PNG', cls: 'chico', desc: 'La tira de cuadros como imagen.', on: () => exportar('png', esc.v) }), CK.btn({ ico: 'texto', txt: 'Datos JSON', cls: 'chico', desc: 'Posición y duración de cada cuadro, en el formato de atlas que leen Phaser, Godot y Unity.', on: () => exportar('json') }), CK.btn({ ico: 'play', txt: 'GIF', cls: 'chico', desc: 'La animación en loop, para revisar o para el portfolio.', on: () => exportar('gif', esc.v) })),
      h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'basura', txt: 'Borrar animación', cls: 'chico peligro', on: async () => { if (await CK.confirmar('Borrar animación', 'Se borra "' + a.nombre + '" del proyecto. Los objetos de mapas que la usen quedan sin imagen.', 'Borrar')) { CK.asset.borrar(a.id); st.hoja = null; tabs.refrescar(); pintarIzq(); } } }))));
    pintarCentro();
  };

  // ---------------------------------------------------------------- personaje en 4 direcciones
  const DIRS = [['abajo', 'Abajo (de frente)'], ['izquierda', 'Izquierda'], ['derecha', 'Derecha'], ['arriba', 'Arriba (de espaldas)']];
  const ACC = { quieto: 'Quieto', caminar: 'Caminar', atacar: 'Atacar', herido: 'Herido', morir: 'Morir' };
  let prueba, pj = { x: 0, y: 0, dir: 'abajo', acc: 'quieto', t: 0, teclas: {} }, cacheFr = {};
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
  const pPoses = c => {
    st.modo = 'poses'; const lista = Object.values(CK.P.poses); if (!CK.P.poses[st.pose]) st.pose = (lista[0] || {}).id || null; const p = Pz();
    const nuevo = async () => { const nombre = await CK.pedir('Personaje nuevo', 'Nombre (héroe, guardia, aldeana…)', ''); if (!nombre) return; let id = CK.slug(nombre), n = 2; while (CK.P.poses[id]) id = CK.slug(nombre) + '_' + (n++); CK.P.poses[id] = { id, nombre, espejar: true, acciones: { quieto: {}, caminar: {} } }; CK.tocar(); st.pose = id; tabs.refrescar(); };
    c.append(h('div.bloque', h('h3.bloque-tit', 'Personaje', CK.btn({ ico: 'mas', txt: 'Nuevo', cls: 'chico' + (lista.length ? '' : ' pri'), on: nuevo })),
      lista.length ? CK.sel(st.pose, lista.map(q => [q.id, q.nombre]), v => { st.pose = v; tabs.refrescar(); }) : h('p.nota-txt', 'Juntá acá las animaciones de un personaje en sus cuatro direcciones para verlas andar juntas y encontrar la que desentona.')));
    if (!p) { pintarPrueba(); return; }
    const bl = h('div.bloque', h('h3.bloque-tit', 'Poses'), CK.chk(p.espejar, 'Izquierda y derecha se espejan', v => cambioPose('Espejar', q => { q.espejar = v; }), 'Si dibujaste solo un lado, el otro se arma dándolo vuelta.'));
    Object.keys(p.acciones).forEach(acc => {
      const g = h('div.poses-fila', h('div.fila.junto', h('b.crece', ACC[acc] || acc), CK.btn({ ico: 'play', tip: 'Ver esta acción', cls: 'chico plano' + (pj.fijo === acc ? ' activo' : ''), desc: 'Muestra esta acción en la prueba (clic otra vez para volver a moverte libre).', on: () => { pj.fijo = pj.fijo === acc ? null : acc; tabs.refrescar(); } }), acc !== 'quieto' ? CK.btn({ ico: 'cerrar', tip: 'Quitar acción', cls: 'chico plano', on: () => cambioPose('Quitar acción', q => { delete q.acciones[acc]; }) }) : null), h('div.poses-dirs'));
      DIRS.forEach(([d, rot]) => { const id = p.acciones[acc][d], q = poseDe(p, acc, d), esp = !id && p.espejar && (d === 'izquierda' || d === 'derecha') && q.fr.length && !q.falta;
        const b = h('button.pose-celda' + (id ? '.puesta' : esp ? '.espejo' : ''), { type: 'button', onclick: async () => { const nid = await CK.elegirAsset((ACC[acc] || acc) + ' · ' + rot, ['hoja', 'personaje', 'sprite']); if (nid) cambioPose('Asignar pose', z => { z.acciones[acc][d] = nid; }); }, oncontextmenu: e => { e.preventDefault(); if (id) cambioPose('Quitar pose', z => { delete z.acciones[acc][d]; }); } }, (id || esp) && q.fr[0] ? CK.mini(q.fr[0], 44) : h('span', { html: CK.ico('mas', 18) }), h('span', d));
        CK.tip(b, rot, id ? CK.P.assets[id].nombre + ' · ' + q.fr.length + ' cuadros. Clic: cambiar · Clic derecho: quitar.' : esp ? 'Espejada del otro lado. Clic para poner una propia.' : 'Clic para elegir la animación de esta dirección.'); g.lastChild.append(b); });
      bl.append(g);
    });
    const libres = Object.keys(ACC).filter(k => !p.acciones[k]);
    bl.append(h('div.fila', { style: { marginTop: '8px' } }, libres.map(k => CK.btn({ ico: 'mas', txt: ACC[k], cls: 'chico', on: () => cambioPose('Agregar acción', q => { q.acciones[k] = {}; }) }))));
    c.append(bl);
    const pr = CK.posesProblemas(p);
    c.append(h('div.bloque', h('h3.bloque-tit', 'Revisión'), pr.length ? pr.map(t => h('div.problema.medio', { html: CK.ico('alerta', 16) }, h('div', h('div.pd', t)))) : h('div.problema.leve', { html: CK.ico('ok', 16) }, h('div', h('div.pd', 'Mismo tamaño y misma cantidad de cuadros en todas las direcciones.')))),
      h('div.bloque', h('h3.bloque-tit', 'Sacar'), h('div.fila', CK.btn({ ico: 'hoja', txt: 'Hoja completa', cls: 'chico', desc: 'Arma una sola hoja con una fila por acción y dirección, y la guarda como asset junto con un JSON que dice qué hay en cada fila.', on: () => { const r = hojaPoses(p); const a = CK.asset.crear({ nombre: p.nombre + '_hoja', tipo: 'personaje', lienzo: r.c, origen: 'poses de ' + p.nombre, cuadros: { fw: r.fw, fh: r.fh, fps: 8, bucle: true }, extra: { filas: r.filas } }); CK.descargar(new Blob([JSON.stringify({ cuadro: [r.fw, r.fh], filas: r.filas }, null, 1)], { type: 'application/json' }), a.id + '.json'); CK.aviso('Hoja guardada como "' + a.nombre + '" (' + r.filas.length + ' filas).'); pintarIzq(); } }),
        CK.btn({ ico: 'basura', txt: 'Borrar personaje', cls: 'chico peligro', on: async () => { if (await CK.confirmar('Borrar personaje', 'Se borra el conjunto de poses de "' + p.nombre + '". Las animaciones quedan en el proyecto.', 'Borrar')) { const f = CK.hist.datos('Borrar personaje', 'poses', p.id); delete CK.P.poses[p.id]; f(); st.pose = null; tabs.refrescar(); } } })),
        h('p.nota-txt', 'Probalo en el centro: flechas o WASD para caminar. Las poses nuevas se dibujan en Pixel art o se traen de PixelLab; acá se ordenan y se controlan.')));
    pintarPrueba();
  };
  let rafP = 0, tPrev = 0;
  const pintarPrueba = () => {
    if (!prueba) return; const enPoses = st.modo === 'poses'; prueba.style.display = enPoses ? '' : 'none'; if (cajaRep.firstChild) cajaRep.firstChild.style.display = enPoses ? 'none' : ''; const sobre = cajaRep.querySelector('.sobre'); if (sobre) sobre.style.display = enPoses ? 'none' : '';
    cancelAnimationFrame(rafP); if (!enPoses) return; tPrev = performance.now();
    const paso = now => {
      if (st.modo !== 'poses' || CK.seccion_actual !== 'anim') return; rafP = requestAnimationFrame(paso); const dt = Math.max(0, Math.min(0.05, (now - tPrev) / 1000)); tPrev = now;
      const W = prueba.width, H = prueba.height, x = CK.ctx(prueba), p = Pz(), Z = 3; x.imageSmoothingEnabled = false;
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
    };
    rafP = requestAnimationFrame(paso);
  };
  window.addEventListener('keydown', e => { if (CK.seccion_actual !== 'anim' || st.modo !== 'poses' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) { pj.teclas[k] = true; e.preventDefault(); } });
  window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; delete pj.teclas[k]; });

  const crear = raiz => {
    el = raiz; el.style.gridTemplateColumns = '292px 1fr 318px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } }); der = h('aside.panel');
    cajaRep = h('div', { style: { display: 'grid', placeItems: 'center', minHeight: 0, overflow: 'hidden', position: 'relative' } });
    const fondos = { cuadros: null, oscuro: '#1b1d21', pasto: '#4c7a3a', piedra: '#6b6258' };
    const rep = CK.reproductor(cuadrosCache, fpsAct, { tam: 380, siempre: true, fondo: (x, t) => { const f = fondos[st.fondo]; if (f) { x.fillStyle = f; x.fillRect(0, 0, t, t); } } });
    rep.style.borderRadius = '10px'; rep.style.border = '1px solid var(--linea)'; rep.style.maxWidth = 'calc(100% - 24px)'; rep.style.height = 'auto';
    let enPausa = false; const bPlay = CK.btn({ ico: 'pausa', tip: 'Pausar / reproducir', tecla: 'Espacio', cls: 'chico plano', on: () => { enPausa = rep.pausar(); bPlay.innerHTML = CK.ico(enPausa ? 'play' : 'pausa'); } });
    cajaRep.append(rep, h('div.sobre', h('div.tira', bPlay, h('span.sep'), h('span.txt', 'Fondo'), ...Object.keys(fondos).map(k => { const b = CK.btn({ txt: { cuadros: 'Vacío', oscuro: 'Oscuro', pasto: 'Pasto', piedra: 'Piedra' }[k], cls: 'chico plano' + (st.fondo === k ? ' activo' : ''), desc: 'Color detrás de la animación, para ver cómo se lee sobre el suelo del juego.', on: () => { st.fondo = k; b.parentElement.querySelectorAll('.btn').forEach(q => q.classList.remove('activo')); b.classList.add('activo'); } }); return b; }))));
    tiraCuadros = h('div.cuadros'); infoEl = h('div.ayuda-txt', { style: { padding: '6px 12px', background: 'var(--panel)', borderTop: '1px solid var(--linea)' } });
    centro = h('div', { style: { display: 'grid', gridTemplateRows: '1fr auto auto', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } }, cajaRep, infoEl, tiraCuadros);
    prueba = h('canvas', { width: 620, height: 440, style: { display: 'none', borderRadius: '10px', border: '1px solid var(--linea)', maxWidth: 'calc(100% - 24px)', imageRendering: 'pixelated' } }); cajaRep.append(prueba); pj.x = 310; pj.y = 300;
    tabs = CK.pestanas([{ id: 'generar', txt: 'Generar', ico: 'varita', desc: 'Crear movimiento a partir de un dibujo quieto.', pintar: c => { pGenerar(c); pintarPrueba(); } }, { id: 'hoja', txt: 'Hoja', ico: 'hoja', desc: 'Ajustar, alinear y exportar una animación guardada.', pintar: c => { pHoja(c); pintarPrueba(); } }, { id: 'poses', txt: 'Personaje', ico: 'persona', desc: 'Las animaciones de un personaje en sus cuatro direcciones, con prueba de caminata.', pintar: pPoses }], 'generar');
    der.append(tabs); el.append(izq, centro, der);
    CK.on('notas', () => { if (CK.seccion_actual === 'anim') pintarIzq(); });
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && arg.asset && CK.P.assets[arg.asset]) { const a = CK.P.assets[arg.asset]; if (a.cuadros && !arg.objeto) { st.hoja = a.id; tabs.ir('hoja'); } else { st.base = a.id; st.origen = arg.objeto ? { objeto: arg.objeto, mapa: arg.mapa } : null; const o = arg.objeto && CK.mapa.buscarObj(arg.objeto); if (o && o.marca && PIX.ANIMS[o.marca.tipoAnim]) { st.tipo = o.marca.tipoAnim; st.params = {}; } tabs.ir('generar'); } }
    else if (arg && arg.pose) { st.pose = arg.pose; tabs.ir('poses'); }
    else { if (st.base && !CK.P.assets[st.base]) st.base = null; if (st.hoja && !CK.P.assets[st.hoja]) st.hoja = null; tabs.refrescar(); }
    pintarIzq();
  };
  CK.registrar({ id: 'anim', nombre: 'Animaciones', corto: 'Animar', ico: 'anim', desc: 'Generá movimiento desde un dibujo quieto, alineá hojas de sprites y exportá PNG, datos y GIF.', crear, mostrar, alCambiarProyecto: () => { st.base = st.hoja = st.origen = st.pose = null; st.frames = []; cacheFr = {}; } });
})();
