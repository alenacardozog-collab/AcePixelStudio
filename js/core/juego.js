/* JUEGO: puente con la carpeta de CastleKnight. Importa sus mapas y assets, y exporta los resultados
   en el formato que el juego ya lee:  items [sprite, x, baseY, espejado, animación?]  y  cols [x, y, ancho, alto]. */
'use strict';
CK.juego = {
  _indice: null,
  NOMBRES: { ruins: 'Aldea en ruinas', road: 'Camino al castillo', garden: 'Jardín real', walls: 'Adarve', training: 'Patio de armas' },

  async dir(avisar = true) { const d = CK.fs.dir('juego'); if (!d && avisar) CK.aviso('Conectá primero la carpeta del juego (arriba a la derecha).', 'info', 4500); return d; },
  /** Índice de todos los PNG del juego: nombre sin extensión -> [rutas]. */
  async indice(forzar) {
    if (this._indice && !forzar) return this._indice;
    const d = await this.dir(); if (!d) return null;
    const rutas = await CK.fs.recorrer(d, 'assets', /\.png$/i), idx = {};
    rutas.forEach(r => { const n = r.split('/').pop().replace(/\.png$/i, ''); (idx[n] = idx[n] || []).push(r); });
    this._indice = { rutas, idx }; return this._indice;
  },
  _eval(texto) { const w = {}; try { new Function('window', texto)(w); } catch (e) { console.warn('No pude leer datos del juego', e); } return w; },
  async hojas() {
    const d = await this.dir(false); if (!d) return {}; const t = await CK.fs.texto(d, 'js/config/world_constants.js'); if (!t) return {};
    try { return new Function('window', t + '\n;return (typeof MAP_SHEETS !== "undefined") ? MAP_SHEETS : {};')({}) || {}; } catch (e) { return {}; }
  },
  /** Mapas que el juego guarda como datos (los que se pueden traer y devolver). */
  async mapas() {
    const d = await this.dir(); if (!d) return [];
    const out = [], tr = await CK.fs.texto(d, 'js/maps/data/ruins_map.js'), tc = await CK.fs.texto(d, 'js/maps/data/castle_maps.js');
    if (tr) { const w = this._eval(tr); if (w.RUINS_MAP) out.push({ clave: 'ruins', archivo: 'js/maps/data/ruins_map.js', ancla: 'window.RUINS_MAP', datos: w.RUINS_MAP, fondo: 'assets/ruins/ground.png', carpetas: ['assets/ruins'], prefijo: 'ru_' }); }
    if (tc) { const w = this._eval(tc); Object.keys((w.CASTLE_MAPS && w.CASTLE_MAPS.maps) || {}).forEach(k => out.push({ clave: k, archivo: 'js/maps/data/castle_maps.js', ancla: 'window.CASTLE_MAPS.maps.' + k, datos: w.CASTLE_MAPS.maps[k], fondo: 'assets/castle/ground_' + k + '.png', carpetas: ['assets/castle', 'assets/map'], prefijo: 'cs_' })); }
    out.forEach(m => { m.nombre = this.NOMBRES[m.clave] || m.clave; });
    return out;
  },
  async _png(ruta) { const d = await this.dir(false); try { return await CK.cargarImagen(await CK.fs.leer(d, ruta)); } catch (e) { return null; } },
  _buscar(idx, clave, carpetas) {
    const cands = [clave, clave.replace(/^(cs_|ru_|int_)/, '')];
    for (const c of cands) { const rs = idx.idx[c]; if (!rs) continue; for (const carp of carpetas) { const r = rs.find(x => x.startsWith(carp + '/')); if (r) return r; } return rs[0]; }
    return null;
  },
  /** Trae un mapa del juego al proyecto: fondo pintado, objetos y colisiones. */
  async importarMapa(def) {
    const idx = await this.indice(); if (!idx) return null;
    CK._ocupado = true; CK.estado('Importando ' + def.nombre + '…');
    try {
      const hojas = await this.hojas(), M = def.datos, porClave = {}, faltan = new Set();
      const traer = async (clave, anim) => {
        if (porClave[clave] !== undefined) return porClave[clave];
        const ya = Object.values(CK.P.assets).find(a => a.claveJuego === clave); if (ya) return (porClave[clave] = ya.id);
        const hk = hojas[clave] ? clave : hojas[def.prefijo + clave] ? def.prefijo + clave : null; let ruta = hk ? hojas[hk].file : this._buscar(idx, clave, def.carpetas);
        const c = ruta ? await this._png(ruta) : null;
        if (!c) { faltan.add(clave); return (porClave[clave] = null); }
        const o = { nombre: clave.replace(/^(cs_|ru_)/, ''), tipo: hk ? 'hoja' : 'sprite', lienzo: c, origen: 'juego: ' + ruta, extra: { claveJuego: clave, rutaJuego: ruta, texJuego: hk || (def.prefijo === 'ru_' ? 'ru_' + clave : clave), animJuego: hk ? (anim || Object.keys(hojas[hk].anims || {})[0] || '') : '' }, etiquetas: [def.clave] };
        if (hk) { const an = hojas[hk].anims || {}, a0 = an[anim] || Object.values(an)[0] || {}; o.cuadros = { fw: hojas[hk].fw, fh: hojas[hk].fh, fps: a0.fps || 6, bucle: true, vaiven: !!a0.yoyo, orden: a0.frames || null }; }
        return (porClave[clave] = CK.asset.crear(o).id);
      };
      const fondoC = await this._png(def.fondo), id = CK.slug(def.clave);
      let fondoId = null;
      if (fondoC) { const ya = Object.values(CK.P.assets).find(a => a.rutaJuego === def.fondo); fondoId = ya ? ya.id : CK.asset.crear({ nombre: 'suelo_' + def.clave, tipo: 'fondo', lienzo: fondoC, origen: 'juego: ' + def.fondo, extra: { rutaJuego: def.fondo }, etiquetas: [def.clave] }).id; }
      const objs = [];
      for (const [k, x, y, f, anim] of (M.items || [])) { const aid = await traer(k, anim); objs.push({ id: CK.uid('o'), asset: aid, clave: k, x, y, flipX: !!f, sx: 1, sy: 1, rot: 0, anim: anim || null }); }
      const mapa = CK.mapa.nuevoDatos(def.nombre, M.w, M.h, id);
      mapa.fondo = fondoId; mapa.origen = { tipo: 'juego', archivo: def.archivo, ancla: def.ancla, clave: def.clave };
      mapa.capas = [{ id: CK.uid('c'), nombre: 'Objetos', tipo: 'objetos', visible: true, bloqueada: false, opacidad: 1, orden: 'y', objetos: objs, grupos: [] }];
      mapa.colisiones = (M.cols || []).map(([x, y, w, h]) => ({ id: CK.uid('k'), x, y, w, h }));
      CK.P.mapas[mapa.id] = mapa; CK.tocar(); CK.emit('mapas');
      CK.aviso('Importado "' + def.nombre + '": ' + objs.length + ' objetos, ' + mapa.colisiones.length + ' colisiones' + (faltan.size ? '. Sin imagen: ' + [...faltan].slice(0, 4).join(', ') : ''), faltan.size ? 'info' : 'ok', 5000);
      return mapa;
    } finally { CK._ocupado = false; CK.estado('Listo'); }
  },
  /** Trae una carpeta de imágenes del juego como assets sueltos. */
  async importarCarpeta(carpeta, tipo) {
    const idx = await this.indice(); if (!idx) return 0; let n = 0; CK._ocupado = true;
    const hojas = await this.hojas(), porArchivo = {}; Object.keys(hojas).forEach(k => { porArchivo[hojas[k].file] = Object.assign({ clave: k }, hojas[k]); });
    try {
      for (const r of idx.rutas.filter(x => x.startsWith(carpeta + '/') && x.slice(carpeta.length + 1).indexOf('/') < 0)) {
        if (Object.values(CK.P.assets).some(a => a.rutaJuego === r)) continue;
        const c = await this._png(r); if (!c) continue; const nombre = r.split('/').pop().replace(/\.png$/i, '');
        let t = tipo, extra = { rutaJuego: r }, ts = null;
        if (/^tileset/i.test(nombre) && c.width === c.height && c.width % 4 === 0) { t = 'tileset'; ts = { tile: c.width / 4, forma: 'wang16' }; }
        else if (/^(floor|wall|ground)/i.test(nombre)) t = /^ground/i.test(nombre) ? 'fondo' : 'textura';
        let cuadros = null; const hj = porArchivo[r];
        if (hj) { const a0 = Object.values(hj.anims || {})[0] || {}; cuadros = { fw: hj.fw, fh: hj.fh, fps: a0.fps || 6, bucle: true, vaiven: !!a0.yoyo, orden: a0.frames || null }; extra.claveJuego = hj.clave; extra.texJuego = hj.clave; extra.animJuego = Object.keys(hj.anims || {})[0] || ''; t = 'hoja'; }
        else if (/_anim$|_frames$/i.test(nombre) && c.width > c.height && c.width % c.height === 0) { cuadros = { fw: c.height, fh: c.height, fps: 6, bucle: true }; t = 'hoja'; }
        CK.asset.crear({ nombre, tipo: t, lienzo: c, origen: 'juego: ' + r, extra, tileset: ts, cuadros, etiquetas: [carpeta.split('/').pop()] }); n++;
        if (n % 12 === 0) CK.estado('Importando ' + carpeta + '… ' + n);
      }
    } finally { CK._ocupado = false; CK.estado('Listo'); }
    return n;
  },
  async ventanaImportar() {
    const d = await this.dir(); if (!d) return;
    const mapas = await this.mapas(), idx = await this.indice(true), cuerpo = CK.h('div');
    const cuenta = {}; idx.rutas.forEach(r => { const c = r.split('/').slice(0, -1).join('/'); cuenta[c] = (cuenta[c] || 0) + 1; });
    const lm = CK.h('div.lista');
    mapas.forEach(m => { const ya = CK.P.mapas[CK.slug(m.clave)]; lm.append(CK.h('div.item', CK.h('span', { html: CK.ico('mapa', 16) }), CK.h('span.nombre', m.nombre), CK.h('span.sub', m.datos.w + '×' + m.datos.h + ' · ' + (m.datos.items || []).length + ' objetos'), ya ? CK.h('span.etq.verde', 'ya importado') : CK.btn({ txt: 'Traer', cls: 'chico pri', on: async (e, b) => { b.disabled = true; b.textContent = 'Trayendo…'; await this.importarMapa(m); b.replaceWith(CK.h('span.etq.verde', 'listo')); } }))); });
    const lc = CK.h('div.lista');
    Object.keys(cuenta).filter(c => /^assets\/(ruins|castle|map|interiors|npc|UI\/icons|UI\/theme)$/.test(c)).sort().forEach(c => lc.append(CK.h('div.item', CK.h('span', { html: CK.ico('carpeta', 16) }), CK.h('span.nombre', c), CK.h('span.sub', cuenta[c] + ' imágenes'), CK.btn({ txt: 'Traer', cls: 'chico', on: async (e, b) => { b.disabled = true; b.textContent = 'Trayendo…'; const n = await this.importarCarpeta(c, /UI/.test(c) ? 'ui' : 'sprite'); b.replaceWith(CK.h('span.etq.verde', n + ' nuevas')); } }))));
    cuerpo.append(CK.seccion('Mapas del juego', mapas.length ? lm : CK.h('p.ayuda-txt', 'No encontré js/maps/data/ en esa carpeta. ¿Es la carpeta de CastleKnight?'), CK.h('p.nota-txt', 'Se traen con su suelo pintado, sus objetos y sus colisiones.')), this._salas || null,
      CK.seccion('Carpetas de imágenes', lc, CK.h('p.nota-txt', 'Sirve para tener los assets actuales a mano: revisarlos, llevarlos a la paleta o usarlos en mapas nuevos.')));
    await CK.ventana({ titulo: 'Importar desde CastleKnight', ancho: 560, cuerpo });
    CK.emit('mapas');
  },

  // ---------------------------------------------------------------- exportar
  _reemplazar(texto, ancla, campo, nuevo) {
    const a = texto.indexOf(ancla); if (a < 0) return null;
    const re = new RegExp('\\b' + campo + '\\s*:\\s*\\['), m = re.exec(texto.slice(a)); if (!m) return null;
    const ini = a + m.index + m[0].length - 1; let p = ini, prof = 0, enStr = false;
    for (; p < texto.length; p++) { const ch = texto[p]; if (ch === '"') enStr = !enStr; if (enStr) continue; if (ch === '[') prof++; else if (ch === ']') { prof--; if (!prof) break; } }
    return texto.slice(0, ini) + nuevo + texto.slice(p + 1);
  },
  /** Datos de un mapa en el formato del juego. */
  datosMapa(m) {
    const items = [], nuevos = new Set();
    CK.mapa.objetosDe(m).forEach(o => {
      if (o.oculto || o.tipo) return; const a = CK.P.assets[o.asset]; if (!a && !o.clave) return;
      const clave = o.clave || (a.claveJuego || 'ed_' + a.id); if (!o.clave && !(a && a.claveJuego)) nuevos.add(a.id);
      const it = [clave, Math.round(o.x), Math.round(o.y), o.flipX ? 1 : 0]; if (o.anim) it.push(o.anim); items.push(it);
    });
    const cols = (m.colisiones || []).map(k => [Math.round(k.x), Math.round(k.y), Math.round(k.w), Math.round(k.h)]);
    CK.mapa.objetosDe(m).forEach(o => { if (o.col && !o.oculto) { const r = CK.mapa.colDe(o); if (r) cols.push([Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)]); } });
    if (m.zonas && m.zonas.datos) { const g = PIX.unrle(m.zonas.datos, m.zonas.w * m.zonas.h); PIX.gridRects(g, m.zonas.w, m.zonas.h, v => v === 2, m.zonas.celda).forEach(r => cols.push(r)); }
    return { items, cols, nuevos: [...nuevos] };
  },
  textoItems: items => '[\n' + items.map(i => '    ' + JSON.stringify(i)).join(',\n') + '\n  ]',
  textoCols: cols => { const l = []; for (let i = 0; i < cols.length; i += 8) l.push('    ' + cols.slice(i, i + 8).map(c => JSON.stringify(c)).join(', ')); return '[\n' + l.join(',\n') + '\n  ]'; },
  /** Todo lo que el juego necesita de este proyecto, como un solo objeto (se escribe en editor_data.js). */
  datosCompletos() {
    const P = CK.P, base = P.juego.carpetaAssets, D = { hecho: 'Taller CastleKnight', guardado: Date.now(), tile: P.estilo.tile, paleta: P.estilo.paleta, assets: {}, mapas: {}, npcs: {}, fx: P.fx, prefabs: P.prefabs };
    Object.values(P.assets).forEach(a => { if (a.tipo === 'ref' || a.tipo === 'capa') return; const e = { archivo: a.rutaJuego || base + '/' + a.id + '.png', w: a.w, h: a.h, tipo: a.tipo }; if (a.cuadros) e.cuadros = a.cuadros; if (a.tileset) e.tileset = a.tileset; if (a.claveJuego) e.clave = a.claveJuego; D.assets[a.id] = e; });
    Object.values(P.mapas).forEach(m => {
      const d = this.datosMapa(m), puntos = [], luces = [], anim = [];
      CK.mapa.objetosDe(m, true).forEach(o => { if (o.tipo === 'punto') puntos.push({ nombre: o.nombre, clase: o.clase, x: o.x, y: o.y, props: o.props || {} }); if (o.tipo === 'luz') luces.push({ x: o.x, y: o.y, radio: o.radio, color: o.color, fuerza: o.fuerza, parpadeo: o.parpadeo }); if (o.marca && o.marca.nota) anim.push({ objeto: o.nombre || o.clave || o.asset, x: o.x, y: o.y, nota: o.marca.nota, estado: o.marca.estado }); });
      D.mapas[m.id] = { nombre: m.nombre, w: m.w, h: m.h, tile: m.tile, suelo: m.origen ? null : base + '/' + m.id + '_suelo.png', sueloJuego: m.fondo && P.assets[m.fondo] ? P.assets[m.fondo].rutaJuego || null : null, items: d.items, cols: d.cols, zonas: m.zonas || null, puntos, luces, ambiente: m.ambiente || null, origen: m.origen || null };
    });
    Object.values(P.npcs).forEach(n => { D.npcs[n.id] = { nombre: n.nombre, oficio: n.oficio, escape: n.escape, saludo: n.saludo, temas: n.temas, sugerencias: n.sugerencias }; });
    return D;
  },
  async ventanaExportar() {
    if (!CK.P) return;
    const d = CK.fs.dir('juego'), cuerpo = CK.h('div'), mapas = Object.values(CK.P.mapas), sel = { assets: true, datos: true };
    const delJuego = mapas.filter(m => m.origen), propios = mapas.filter(m => !m.origen);
    delJuego.forEach(m => { sel['m_' + m.id] = false; });
    if (!d) cuerpo.append(CK.h('div.problema.medio', { html: CK.ico('alerta', 18) }, CK.h('div', CK.h('div.pt', 'La carpeta del juego no está conectada'), CK.h('div.pd', 'Sin ella no puedo escribir en CastleKnight. Conectala, o descargá el archivo de datos para copiarlo a mano.')), CK.btn({ txt: 'Conectar', cls: 'chico pri', on: async () => { await CK.conectarCarpeta('juego'); cuerpo.closest('.ventana').cerrar(null); this.ventanaExportar(); } })));
    cuerpo.append(CK.seccion('Qué exportar',
      CK.chk(true, 'Imágenes nuevas o cambiadas → ' + CK.P.juego.carpetaAssets + '/', v => { sel.assets = v; }, 'Copia cada asset del proyecto como PNG. No toca los archivos originales del juego.'),
      CK.chk(true, 'Datos del proyecto → ' + CK.P.juego.archivoDatos, v => { sel.datos = v; }, 'Mapas nuevos (con su suelo pintado), zonas caminables, luces, puntos, NPC con sus diálogos y efectos, en un solo archivo.'),
      propios.length ? CK.h('p.nota-txt', propios.length + ' mapa(s) nuevo(s) van con su suelo ya dibujado: ' + propios.map(m => m.nombre).join(', ') + '.') : null));
    if (delJuego.length) cuerpo.append(CK.seccion('Mapas que ya existen en el juego', CK.h('p.ayuda-txt', 'Reescribe solo las listas de objetos y colisiones en el archivo del juego. Antes guarda una copia del archivo en la carpeta del editor.'),
      delJuego.map(m => { const dd = this.datosMapa(m); return CK.chk(false, m.nombre + ' → ' + m.origen.archivo + (dd.nuevos.length ? '  (' + dd.nuevos.length + ' assets nuevos)' : ''), v => { sel['m_' + m.id] = v; }, dd.nuevos.length ? 'Este mapa usa assets que el juego todavía no carga (' + dd.nuevos.slice(0, 3).join(', ') + '). Se exportan igual, pero el juego necesita un pequeño cargador para mostrarlos.' : 'Todos sus objetos usan arte que el juego ya tiene.'); })));
    const ok = await CK.ventana({ titulo: 'Exportar al juego', ancho: 560, cuerpo, botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Descargar datos', ico: 'importar', valor: 'bajar' }, { txt: 'Exportar', ico: 'exportar', cls: 'pri', valor: true }] });
    if (!ok) return;
    if (ok === 'bajar') { CK.descargar(new Blob([this.textoDatos()], { type: 'text/javascript' }), 'editor_data.js'); return; }
    if (!d) { CK.aviso('Falta conectar la carpeta del juego.', 'error'); return; }
    await this.exportar(sel);
  },
  textoDatos() { return '/* Generado por el Taller CastleKnight (D:\\Editor). No editar a mano: se reescribe en cada exportación. */\nwindow.EDITOR_DATA = ' + JSON.stringify(this.datosCompletos(), null, 1) + ';\n'; },
  async exportar(sel) {
    const d = await this.dir(); if (!d) return; CK._ocupado = true; let n = 0, mapasEscritos = 0;
    try {
      const base = CK.P.juego.carpetaAssets, exp = CK.P.exportado = CK.P.exportado || {};
      if (sel.assets) for (const a of Object.values(CK.P.assets)) {
        if (a.tipo === 'ref' || a.tipo === 'capa') continue; const marca = a.modificado || a.creado || 1;
        if (a.rutaJuego && !a.modificado) continue;          // viene del juego y no cambió
        if (exp[a.id] === marca) continue;
        await CK.fs.escribir(d, base + '/' + a.id + '.png', await CK.aBlob(CK.img[a.id])); exp[a.id] = marca; n++;
      }
      if (sel.datos) {
        for (const m of Object.values(CK.P.mapas)) if (!m.origen) { await CK.fs.escribir(d, base + '/' + m.id + '_suelo.png', await CK.aBlob(CK.mapa.hornearSuelo(m))); }
        await CK.fs.escribir(d, CK.P.juego.archivoDatos, this.textoDatos());
      }
      for (const m of Object.values(CK.P.mapas)) {
        if (!m.origen || !sel['m_' + m.id]) continue;
        const txt = await CK.fs.texto(d, m.origen.archivo); if (!txt) { CK.aviso('No encontré ' + m.origen.archivo, 'error'); continue; }
        const de = CK.fs.dir('editor'); if (de) await CK.fs.escribir(de, CK.rutaProyecto() + '/respaldo/' + m.origen.archivo.split('/').pop().replace('.js', '') + '_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.js', txt);
        const dd = this.datosMapa(m); let nuevo = this._reemplazar(txt, m.origen.ancla, 'items', this.textoItems(dd.items)); if (nuevo) nuevo = this._reemplazar(nuevo, m.origen.ancla, 'cols', this.textoCols(dd.cols));
        if (!nuevo) { CK.aviso('No pude ubicar las listas de "' + m.nombre + '" en ' + m.origen.archivo + '. No lo toqué.', 'error', 6000); continue; }
        await CK.fs.escribir(d, m.origen.archivo, nuevo); mapasEscritos++;
      }
      CK.tocar();
      CK.aviso('Exportado: ' + n + ' imágenes' + (sel.datos ? ', datos del proyecto' : '') + (mapasEscritos ? ', ' + mapasEscritos + ' mapa(s) del juego actualizados' : ''), 'ok', 5000);
    } catch (e) { console.error(e); CK.aviso('Error al exportar: ' + e.message, 'error', 7000); } finally { CK._ocupado = false; }
  },
  /** Abre el juego. Si hay un mapa abierto, le pasa la zona y la posición (el juego las usa cuando tenga el enganche). */
  probar() {
    if (!CK.P) return; let url = CK.P.juego.url || '../prueba/index.html'; const q = [];
    const m = CK.mapa && CK.mapa.actual && CK.mapa.actual(); if (m && CK.seccion_actual === 'mapa') { q.push('ck_zona=' + encodeURIComponent(m.origen ? m.origen.clave : m.id)); const c = CK.mapa.centroVista(); if (c) q.push('ck_x=' + Math.round(c.x), 'ck_y=' + Math.round(c.y)); }
    q.push('ck_t=' + Date.now()); url += (url.includes('?') ? '&' : '?') + q.join('&');
    const w = window.open(url, 'castleknight_prueba'); if (!w) CK.aviso('El navegador bloqueó la pestaña nueva. Permití las ventanas emergentes para este archivo.', 'error', 6000); else CK.estado('Juego abierto en otra pestaña: ' + CK.P.juego.url);
  }
};
