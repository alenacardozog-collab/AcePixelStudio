/* PROYECTO: modelo de datos, assets, deshacer/rehacer, guardado (navegador + carpeta en disco), versiones.
   En disco un proyecto es:  trabajo/<nombre>/proyecto.json  +  trabajo/<nombre>/assets/<id>.png
   Es el mismo formato que leen y escriben los comandos de herramientas/ck.js (los que usa Claude). */
'use strict';

CK.P = null;            // proyecto abierto (datos puros, se guarda como JSON)
CK.img = {};            // id de asset -> canvas
CK._sucio = false;      // hay cambios sin guardar
CK._imgSucias = new Set();

CK.proyectoVacio = nombre => ({
  formato: 'ck-editor', version: 1, nombre, creado: Date.now(), modificado: Date.now(),
  juego: { url: '../prueba/index.html', carpetaAssets: 'assets/editor', archivoDatos: 'js/maps/data/editor_data.js' },
  estilo: {
    tile: 16, personaje: [100, 100], escalaVista: 3, perspectiva: 'Top-down 3/4', luz: 'arriba-izquierda',
    contorno: 'color', colorContorno: '#1b1420', maxColores: 24, bloquearPaleta: false, notas: '',
    paleta: ['#1b1420', '#3b2a3a', '#5a4630', '#7d6846', '#a08a5c', '#c9b47a', '#e9dfc4', '#2f4a2c', '#4c7a3a', '#74a84a', '#a6cf5e', '#3a4a66', '#5d7a9a', '#8fb3c9', '#7d2a30', '#b8483c', '#e0803c', '#f2c14e', '#6b6258', '#93897a', '#bdb4a3', '#f5f1e6']
  },
  assets: {}, mapas: {}, prefabs: {}, fx: {}, npcs: {}, misiones: [], poses: {}, notas: [], pixel: {}, ui: { seccion: 'inicio' }
});

// ---------------------------------------------------------------- assets
CK.asset = {
  /** Crea un asset a partir de un lienzo. o = { nombre, tipo, lienzo, cuadros?: {fw, fh, fps, bucle}, etiquetas, origen } */
  crear(o) {
    let base = CK.slug(o.nombre || o.tipo || 'asset'), id = base, n = 2;
    while (CK.P.assets[id]) id = base + '_' + (n++);
    const a = { id, nombre: o.nombre || id, tipo: o.tipo || 'sprite', w: o.lienzo.width, h: o.lienzo.height, etiquetas: o.etiquetas || [], origen: o.origen || '', creado: Date.now() };
    if (o.cuadros) a.cuadros = o.cuadros;
    if (o.tileset) a.tileset = o.tileset;
    if (o.extra) Object.assign(a, o.extra);
    CK.P.assets[id] = a; CK.img[id] = o.lienzo; CK._imgSucias.add(id); CK.tocar(); CK.emit('assets');
    return a;
  },
  /** Reemplaza la imagen de un asset. */
  poner(id, lienzo, callar) {
    const a = CK.P.assets[id]; if (!a) return;
    CK.img[id] = lienzo; a.w = lienzo.width; a.h = lienzo.height; a.modificado = Date.now();
    CK._imgSucias.add(id); CK.tocar(); if (!callar) CK.emit('assets', id); CK.emit('asset-img', id);
  },
  borrar(id) { delete CK.P.assets[id]; delete CK.img[id]; CK._borradas = (CK._borradas || []).concat(id); CK.tocar(); CK.emit('assets'); },
  lista(tipo) { const l = Object.values(CK.P.assets); return (tipo ? l.filter(a => (Array.isArray(tipo) ? tipo.includes(a.tipo) : a.tipo === tipo)) : l.filter(a => a.tipo !== 'capa')).sort((a, b) => a.nombre.localeCompare(b.nombre)); },
  /** Rectángulo del cuadro i de una hoja (o la imagen entera). */
  cuadro(a, i = 0) {
    if (!a) return { x: 0, y: 0, w: 1, h: 1 };
    if (!a.cuadros) return { x: 0, y: 0, w: a.w, h: a.h };
    const cols = Math.max(1, Math.floor(a.w / a.cuadros.fw)), n = CK.asset.nCuadros(a); i = ((i % n) + n) % n;
    return { x: (i % cols) * a.cuadros.fw, y: Math.floor(i / cols) * a.cuadros.fh, w: a.cuadros.fw, h: a.cuadros.fh };
  },
  nCuadros(a) { return a && a.cuadros ? Math.max(1, Math.floor(a.w / a.cuadros.fw) * Math.floor(a.h / a.cuadros.fh)) : 1; },
  pix(id) { return CK.aPix(CK.img[id]); },
  TIPOS: { sprite: 'Objeto', personaje: 'Personaje', textura: 'Textura', tileset: 'Tileset', hoja: 'Animación', fx: 'Efecto', fondo: 'Fondo de mapa', ui: 'Interfaz', ref: 'Referencia' }
};
CK.tocar = () => { if (!CK.P) return; CK._sucio = true; CK.P.modificado = Date.now(); CK.emit('sucio', true); };

// ---------------------------------------------------------------- deshacer / rehacer
CK.hist = {
  pila: [], pos: 0, max: 80,
  /** Registra un cambio ya hecho. d = { nombre, deshacer(), rehacer() } */
  push(d) { this.pila.length = this.pos; this.pila.push(d); if (this.pila.length > this.max) this.pila.shift(); this.pos = this.pila.length; CK.tocar(); CK.emit('hist'); },
  deshacer() { if (!this.pos) return CK.aviso('No hay nada para deshacer', 'info', 1500); const d = this.pila[--this.pos]; d.deshacer(); CK.tocar(); CK.emit('hist'); CK.emit('cambio'); CK.estado('Deshecho: ' + d.nombre); },
  rehacer() { if (this.pos >= this.pila.length) return CK.aviso('No hay nada para rehacer', 'info', 1500); const d = this.pila[this.pos++]; d.rehacer(); CK.tocar(); CK.emit('hist'); CK.emit('cambio'); CK.estado('Rehecho: ' + d.nombre); },
  limpiar() { this.pila = []; this.pos = 0; CK.emit('hist'); },
  /** Envuelve un cambio sobre una parte del proyecto (clave de primer nivel + id): toma el antes y, al llamar fin(), el después. */
  datos(nombre, grupo, id) {
    const antes = JSON.stringify(CK.P[grupo][id]);
    return () => {
      const despues = JSON.stringify(CK.P[grupo][id]); if (antes === despues) return false;
      const poner = s => { if (s === undefined) delete CK.P[grupo][id]; else CK.P[grupo][id] = JSON.parse(s); CK.emit('datos', grupo, id); };
      this.push({ nombre, deshacer: () => poner(antes), rehacer: () => poner(despues) }); return true;
    };
  },
  /** Igual pero para la imagen de un asset. */
  imagen(nombre, id) {
    const antes = CK.copiaLienzo(CK.img[id]);
    return () => { const despues = CK.copiaLienzo(CK.img[id]); this.push({ nombre, deshacer: () => CK.asset.poner(id, CK.copiaLienzo(antes)), rehacer: () => CK.asset.poner(id, CK.copiaLienzo(despues)) }); };
  }
};

// ---------------------------------------------------------------- base de datos del navegador
CK.db = {
  _p: null,
  abrir() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const r = indexedDB.open('ck_editor', 1);
      r.onupgradeneeded = () => { const d = r.result; ['proyectos', 'imagenes', 'manijas', 'ajustes'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return this._p;
  },
  async op(store, modo, fn) { const d = await this.abrir(); return new Promise((res, rej) => { const t = d.transaction(store, modo), r = fn(t.objectStore(store)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
  get(s, k) { return this.op(s, 'readonly', o => o.get(k)).catch(() => undefined); },
  set(s, k, v) { return this.op(s, 'readwrite', o => o.put(v, k)).catch(e => console.warn('db', e)); },
  del(s, k) { return this.op(s, 'readwrite', o => o.delete(k)).catch(() => { }); },
  keys(s) { return this.op(s, 'readonly', o => o.getAllKeys()).catch(() => []); }
};

// ---------------------------------------------------------------- carpetas en disco (File System Access)
CK.fs = {
  manijas: {}, disponible: typeof window.showDirectoryPicker === 'function',
  ROT: { editor: 'carpeta del editor', juego: 'carpeta del juego' },
  /** Pide elegir la carpeta (una sola vez; después se recuerda). */
  async conectar(tipo) {
    if (!this.disponible) { CK.aviso('Este navegador no deja abrir carpetas. Usá Chrome o Edge, o trabajá con Descargar / Abrir archivo.', 'error', 6000); return null; }
    try {
      const h = await window.showDirectoryPicker({ id: 'ck_' + tipo, mode: 'readwrite' });
      this.manijas[tipo] = h; await CK.db.set('manijas', tipo, h); CK.emit('carpetas'); CK.aviso('Conectada la ' + this.ROT[tipo] + ': ' + h.name);
      return h;
    } catch (e) { if (e.name !== 'AbortError') CK.aviso('No se pudo abrir la carpeta: ' + e.message, 'error'); return null; }
  },
  /** Recupera las carpetas recordadas. Con pedir = true vuelve a pedir permiso (necesita un clic del usuario). */
  async recordar(pedir) {
    for (const tipo of ['editor', 'juego']) {
      const h = this.manijas[tipo] || await CK.db.get('manijas', tipo); if (!h || !h.queryPermission) continue;
      let p = await h.queryPermission({ mode: 'readwrite' }).catch(() => 'denied');
      if (p !== 'granted' && pedir) p = await h.requestPermission({ mode: 'readwrite' }).catch(() => 'denied');
      this.manijas[tipo] = h; h._ok = p === 'granted';
    }
    CK.emit('carpetas');
  },
  dir(tipo) { const h = this.manijas[tipo]; return h && h._ok !== false ? h : null; },
  pendiente(tipo) { const h = this.manijas[tipo]; return !!(h && h._ok === false); },
  async sub(dir, ruta, crear) { let d = dir; for (const p of ruta.split('/').filter(Boolean)) d = await d.getDirectoryHandle(p, { create: !!crear }); return d; },
  async escribir(dir, ruta, contenido) {
    const partes = ruta.split('/').filter(Boolean), nombre = partes.pop(), d = await this.sub(dir, partes.join('/'), true);
    const f = await d.getFileHandle(nombre, { create: true }), w = await f.createWritable(); await w.write(contenido); await w.close();
  },
  async leer(dir, ruta) { const partes = ruta.split('/').filter(Boolean), nombre = partes.pop(); const d = await this.sub(dir, partes.join('/')); return (await d.getFileHandle(nombre)).getFile(); },
  async texto(dir, ruta) { try { return await (await this.leer(dir, ruta)).text(); } catch (e) { return null; } },
  async borrar(dir, ruta) { try { const partes = ruta.split('/').filter(Boolean), nombre = partes.pop(); const d = await this.sub(dir, partes.join('/')); await d.removeEntry(nombre); } catch (e) { } },
  async listar(dir, ruta = '') { const out = []; try { const d = ruta ? await this.sub(dir, ruta) : dir; for await (const [n, h] of d.entries()) out.push({ nombre: n, carpeta: h.kind === 'directory' }); } catch (e) { } return out; },
  /** Recorre una carpeta y devuelve todas las rutas de archivos que cumplen el filtro. */
  async recorrer(dir, ruta, filtro, max = 4000, omitir = /^(node_modules|\.git)$/) {
    const out = [], cola = [ruta || ''];
    while (cola.length && out.length < max) { const r = cola.shift(); for (const e of await this.listar(dir, r)) { const p = (r ? r + '/' : '') + e.nombre; if (e.carpeta) { if (!omitir.test(e.nombre)) cola.push(p); } else if (!filtro || filtro.test(e.nombre)) out.push(p); } }
    return out;
  }
};

// ---------------------------------------------------------------- guardar / abrir
CK.rutaProyecto = (nombre) => 'trabajo/' + CK.slug(nombre || CK.P.nombre);

/** Guarda en el navegador y, si la carpeta del editor está conectada, también en disco. o.version = guarda además una copia numerada. */
CK.guardar = async (o = {}) => {
  if (!CK.P) return;
  CK.emit('antes-guardar');
  const slug = CK.slug(CK.P.nombre), json = JSON.stringify(CK.P, null, 1), sucias = [...CK._imgSucias], borradas = CK._borradas || [];
  CK._imgSucias = new Set(); CK._borradas = []; CK._sucio = false;
  try {
    await CK.db.set('proyectos', slug, { nombre: CK.P.nombre, modificado: CK.P.modificado, json });
    for (const id of sucias) if (CK.img[id]) await CK.db.set('imagenes', slug + '/' + id, await CK.aBlob(CK.img[id]));
    for (const id of borradas) await CK.db.del('imagenes', slug + '/' + id);
    await CK.db.set('ajustes', 'ultimo', slug);
    const dir = CK.fs.dir('editor'); let enDisco = false;
    if (dir) {
      const base = CK.rutaProyecto(), todas = !(await CK.fs.texto(dir, base + '/proyecto.json'));
      const ids = todas || o.todo ? Object.keys(CK.P.assets) : sucias;
      for (const id of ids) if (CK.img[id]) await CK.fs.escribir(dir, base + '/assets/' + id + '.png', await CK.aBlob(CK.img[id]));
      for (const id of borradas) await CK.fs.borrar(dir, base + '/assets/' + id + '.png');
      await CK.fs.escribir(dir, base + '/proyecto.json', json);
      if (o.version) {
        const n = (await CK.fs.listar(dir, base + '/versiones')).filter(e => /^v\d+/.test(e.nombre)).length + 1;
        const nom = 'v' + String(n).padStart(3, '0') + (o.nota ? '_' + CK.slug(o.nota) : '') + '.json';
        await CK.fs.escribir(dir, base + '/versiones/' + nom, json); CK.aviso('Versión guardada: ' + nom);
      }
      enDisco = true;
    } else if (o.version) {
      const vs = (await CK.db.get('ajustes', 'versiones_' + slug)) || []; vs.push({ t: Date.now(), nota: o.nota || '', json }); if (vs.length > 12) vs.shift();
      await CK.db.set('ajustes', 'versiones_' + slug, vs); CK.aviso('Versión guardada en el navegador');
    }
    CK.emit('sucio', false); CK.emit('guardado', enDisco);
    if (!o.silencio) CK.aviso(enDisco ? 'Guardado en ' + CK.rutaProyecto() : 'Guardado en el navegador (conectá la carpeta del editor para guardar también en disco)');
    return true;
  } catch (e) {
    sucias.forEach(id => CK._imgSucias.add(id)); CK._sucio = true; console.error(e);
    CK.aviso('No se pudo guardar: ' + e.message, 'error', 6000); return false;
  }
};

CK._poner = async (P, cargarImg) => {
  const base = CK.proyectoVacio(P.nombre);
  CK.P = Object.assign(base, P); CK.P.estilo = Object.assign(base.estilo, P.estilo || {}); CK.P.juego = Object.assign(base.juego, P.juego || {});
  ['assets', 'mapas', 'prefabs', 'fx', 'npcs', 'pixel'].forEach(k => { CK.P[k] = CK.P[k] || {}; }); CK.P.notas = CK.P.notas || []; CK.P.misiones = CK.P.misiones || []; CK.P.poses = CK.P.poses || {}; CK.P.ui = CK.P.ui || {};
  CK.img = {}; CK._imgSucias = new Set(); CK._borradas = []; CK._sucio = false; CK.hist.limpiar();
  const faltan = [];
  for (const id of Object.keys(CK.P.assets)) {
    let c = null; try { c = await cargarImg(id); } catch (e) { }
    if (!c) { c = CK.lienzo(CK.P.assets[id].w || 16, CK.P.assets[id].h || 16); faltan.push(id); }
    CK.img[id] = c; CK.P.assets[id].w = c.width; CK.P.assets[id].h = c.height;
  }
  if (faltan.length) CK.aviso('Faltan ' + faltan.length + ' imágenes (' + faltan.slice(0, 3).join(', ') + '…). Aparecen vacías.', 'error', 6000);
  CK.emit('proyecto'); CK.emit('sucio', false);
};

/** Lista de proyectos conocidos (navegador + carpeta), el más reciente primero. */
CK.proyectos = async () => {
  const m = new Map();
  for (const k of await CK.db.keys('proyectos')) { const r = await CK.db.get('proyectos', k); if (r) m.set(k, { slug: k, nombre: r.nombre, modificado: r.modificado, nav: true }); }
  const dir = CK.fs.dir('editor');
  if (dir) for (const e of await CK.fs.listar(dir, 'trabajo')) {
    if (!e.carpeta) continue; const t = await CK.fs.texto(dir, 'trabajo/' + e.nombre + '/proyecto.json'); if (!t) continue;
    try { const j = JSON.parse(t), prev = m.get(e.nombre) || { slug: e.nombre }; m.set(e.nombre, Object.assign(prev, { nombre: j.nombre, disco: true, modDisco: j.modificado, modificado: Math.max(prev.modificado || 0, j.modificado || 0) })); } catch (err) { }
  }
  return [...m.values()].sort((a, b) => b.modificado - a.modificado);
};

/** Abre un proyecto por nombre de carpeta. Toma la copia más nueva entre el disco y el navegador (así ve los cambios que haga Claude en los archivos). */
CK.abrir = async (slug, forzar) => {
  const dir = CK.fs.dir('editor'), nav = await CK.db.get('proyectos', slug); let disco = null;
  if (dir) { const t = await CK.fs.texto(dir, 'trabajo/' + slug + '/proyecto.json'); if (t) try { disco = JSON.parse(t); } catch (e) { CK.aviso('proyecto.json está dañado: ' + e.message, 'error', 7000); } }
  const usarDisco = disco && (forzar === 'disco' || !nav || (disco.modificado || 0) >= (nav.modificado || 0));
  if (!usarDisco && !nav) { CK.aviso('No encontré ese proyecto', 'error'); return false; }
  if (usarDisco) {
    await CK._poner(disco, async id => CK.cargarImagen(await CK.fs.leer(dir, 'trabajo/' + slug + '/assets/' + id + '.png')));
    await CK.db.set('proyectos', slug, { nombre: CK.P.nombre, modificado: CK.P.modificado, json: JSON.stringify(CK.P) });
    for (const id of Object.keys(CK.img)) await CK.db.set('imagenes', slug + '/' + id, await CK.aBlob(CK.img[id]));
  } else {
    await CK._poner(JSON.parse(nav.json), async id => { const b = await CK.db.get('imagenes', slug + '/' + id); return b ? CK.cargarImagen(b) : null; });
    if (dir && !disco) Object.keys(CK.img).forEach(id => CK._imgSucias.add(id));
  }
  await CK.db.set('ajustes', 'ultimo', slug);
  CK.aviso('Abierto: ' + CK.P.nombre + (usarDisco ? ' (desde la carpeta)' : ''));
  return true;
};
CK.nuevo = async nombre => { await CK._poner(CK.proyectoVacio(nombre), async () => null); CK.tocar(); await CK.guardar({ silencio: true }); CK.aviso('Proyecto creado: ' + nombre); };

/** Todo el proyecto en un solo archivo (para llevarlo o respaldarlo). */
CK.empaquetar = () => { const p = CK.clone(CK.P); p._imagenes = {}; Object.keys(CK.img).forEach(id => { p._imagenes[id] = CK.img[id].toDataURL('image/png'); }); return new Blob([JSON.stringify(p)], { type: 'application/json' }); };
CK.desempaquetar = async file => {
  const p = JSON.parse(await file.text()); if (p.formato !== 'ck-editor') throw new Error('No es un proyecto del editor');
  const imgs = p._imagenes || {}; delete p._imagenes;
  await CK._poner(p, async id => imgs[id] ? CK.cargarImagen(imgs[id]) : null);
  Object.keys(CK.img).forEach(id => CK._imgSucias.add(id)); CK.tocar(); await CK.guardar({ silencio: true, todo: true });
};
CK.versiones = async () => {
  const dir = CK.fs.dir('editor'), slug = CK.slug(CK.P.nombre), out = [];
  if (dir) for (const e of (await CK.fs.listar(dir, CK.rutaProyecto() + '/versiones')).sort((a, b) => b.nombre.localeCompare(a.nombre))) out.push({ nombre: e.nombre, leer: () => CK.fs.texto(dir, CK.rutaProyecto() + '/versiones/' + e.nombre) });
  ((await CK.db.get('ajustes', 'versiones_' + slug)) || []).reverse().forEach(v => out.push({ nombre: CK.fecha(v.t) + (v.nota ? ' · ' + v.nota : '') + ' (navegador)', leer: async () => v.json }));
  return out;
};
/** Vuelve los datos (mapas, NPC, efectos…) a una versión guardada. Las imágenes quedan como están hoy. */
CK.volverA = async json => { const p = JSON.parse(json), imgs = CK.img; await CK._poner(p, async id => imgs[id] || null); CK.tocar(); CK.emit('proyecto'); };

// autoguardado
setInterval(() => { if (CK.P && CK._sucio && !CK._ocupado) CK.guardar({ silencio: true }).then(ok => ok && CK.estadoDer('Autoguardado ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))); }, 60000);
window.addEventListener('beforeunload', e => { if (CK.P && CK._sucio) { CK.guardar({ silencio: true }); e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden && CK.P && CK._sucio) CK.guardar({ silencio: true }); });

/** Elimina un proyecto guardado (del navegador y de la carpeta del editor). Pregunta antes y ofrece bajar una copia. */
CK.eliminarProyecto = async p => {
  const dir = CK.fs.dir('editor'), nombre = p.nombre || p.slug;
  if (p.disco && !dir) { CK.aviso('Este proyecto está guardado en la carpeta del editor. Conectala primero para poder eliminarlo.', 'info', 5000); return false; }
  const r = await CK.ventana({ titulo: 'Eliminar proyecto', ancho: 470, cuerpo: CK.h('div', CK.h('p', '¿Eliminar "' + nombre + '"?'), CK.h('p.ayuda-txt', 'Se borran su guía de estilo, assets, mapas, NPC, misiones, efectos y versiones guardadas' + (p.disco ? ', incluida su carpeta trabajo\\' + p.slug : '') + '. No se puede deshacer. Los archivos del juego no se tocan.')), botones: [{ txt: 'Cancelar', valor: false }, { txt: 'Bajar copia y eliminar', valor: 'copia' }, { txt: 'Eliminar', cls: 'peligro', valor: 'si' }] });
  if (!r) return false;
  if (r === 'copia') { try { const abierto = CK.P; if (!CK.P || CK.slug(CK.P.nombre) !== p.slug) await CK.abrir(p.slug, true); CK.descargar(CK.empaquetar(), p.slug + '.ckproj'); } catch (e) { CK.aviso('No pude armar la copia, así que no eliminé nada: ' + e.message, 'error', 6000); return false; } }
  if (CK.P && CK.slug(CK.P.nombre) === p.slug) { CK.P = null; CK.img = {}; CK._sucio = false; CK.hist.limpiar(); }
  await CK.db.del('proyectos', p.slug); for (const k of await CK.db.keys('imagenes')) if (String(k).indexOf(p.slug + '/') === 0) await CK.db.del('imagenes', k);
  await CK.db.del('ajustes', 'versiones_' + p.slug); if ((await CK.db.get('ajustes', 'ultimo')) === p.slug) await CK.db.del('ajustes', 'ultimo');
  if (dir && p.disco) { try { const t = await CK.fs.sub(dir, 'trabajo'); await t.removeEntry(p.slug, { recursive: true }); } catch (e) { CK.aviso('Lo saqué del navegador, pero no pude borrar la carpeta trabajo\\' + p.slug + ': ' + e.message, 'error', 7000); } }
  CK.emit('proyecto'); CK.emit('sucio', false); if (CK.ir) CK.ir('inicio'); CK.aviso('Proyecto eliminado: ' + nombre); return true;
};
