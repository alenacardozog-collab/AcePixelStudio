/* ANIMACIONES DEL JUEGO: trae al proyecto las hojas de sprites que el juego tiene embebidas (GAME_ASSETS_BASE64,
   MAP_ASSETS_BASE64, EDITOR_PRUEBA, EDITOR_PRACTICA…), para retocarlas cuadro a cuadro en Pixel art, y las devuelve:
   reemplaza la imagen en el mismo archivo .js del juego (y en su PNG, si existe), con respaldo en trabajo/<proyecto>/respaldo/.
   No ejecuta código del juego: solo busca las imágenes y las definiciones load.spritesheet(...) en el texto. */
'use strict';
CK.animJuego = {
  lista: null,          // [{ id, nombre, clave, archivo, archivos, dato, hash, fw, fh, ruta, tipo }]
  _minis: {},
  RX_IMG: /(?:\.([A-Za-z0-9_$]+)|\[\s*['"]([^'"]+)['"]\s*\]|['"]([^'"]+)['"])\s*[:=]\s*(?:\{\s*"datos"\s*:\s*)?['"](data:image\/png;base64,[A-Za-z0-9+/=]+)['"]/g,

  /** Firma corta de un texto largo (FNV-1a), para saber si una imagen cambió. */
  hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + s.length; },

  /** Todas las imágenes embebidas de un texto: [{ clave, dato, fw?, fh? }]. */
  extraer(txt) {
    const out = []; let m; this.RX_IMG.lastIndex = 0;
    while ((m = this.RX_IMG.exec(txt))) {
      const e = { clave: m[1] || m[2] || m[3], dato: m[4] };
      const cola = txt.slice(this.RX_IMG.lastIndex, this.RX_IMG.lastIndex + 80), t = /^\s*,\s*"fw"\s*:\s*(\d+)\s*,\s*"fh"\s*:\s*(\d+)/.exec(cola);
      if (t) { e.fw = +t[1]; e.fh = +t[2]; }
      out.push(e);
    }
    return out;
  },
  /** Definiciones load.spritesheet('clave', ..., { frameWidth, frameHeight }) de un texto. */
  hojasDe(txt) {
    const out = [], rx = /load\.spritesheet\(\s*['"]([^'"]+)['"]\s*,([\s\S]{0,500}?)\}\s*\)/g; let m;
    while ((m = rx.exec(txt))) {
      const cuerpo = m[2], fw = /frameWidth\s*:\s*(\d+)/.exec(cuerpo), fh = /frameHeight\s*:\s*(\d+)/.exec(cuerpo); if (!fw || !fh) continue;
      let ruta = (/getAsset\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/.exec(cuerpo) || [])[1];
      if (!ruta) { const v = (/^\s*([A-Za-z_$][\w$]*)\s*,/.exec(cuerpo) || [])[1]; if (v) ruta = (new RegExp('(?:const|let|var)\\s+' + v + '\\s*=\\s*getAsset\\(\\s*[\'"][^\'"]+[\'"]\\s*,\\s*[\'"]([^\'"]+)[\'"]').exec(txt) || [])[1]; }
      out.push({ clave: m[1], fw: +fw[1], fh: +fh[1], ruta });
    }
    return out;
  },

  /** Lee el juego y arma la lista de animaciones (y de imágenes sueltas). */
  async leer() {
    const d = await CK.juego.dir(); if (!d) return null;
    CK._ocupado = true; CK.estado('Leyendo las animaciones del juego…');
    try {
      const rutas = await CK.fs.recorrer(d, 'js', /\.js$/i), imgs = new Map(), porDato = new Map(), defs = [];
      for (const r of rutas) {
        const txt = await CK.fs.texto(d, r); if (!txt) continue;
        if (txt.includes('load.spritesheet')) defs.push(...this.hojasDe(txt));
        if (!txt.includes('data:image/png;base64')) continue;
        this.extraer(txt).forEach(e => {
          if (!imgs.has(e.clave)) imgs.set(e.clave, Object.assign({ archivo: r }, e));
          const lst = porDato.get(e.dato) || []; if (!lst.includes(r)) lst.push(r); porDato.set(e.dato, lst);
        });
      }
      try { const hm = await CK.juego.hojas(); Object.keys(hm || {}).forEach(k => defs.push({ clave: k, fw: hm[k].fw, fh: hm[k].fh, ruta: hm[k].file })); } catch (e) { }
      const buscar = (clave, ruta) => imgs.get(clave) || (ruta && (imgs.get(ruta) || imgs.get(ruta.split('/').pop().replace(/\.[^/.]+$/, ''))));
      const lista = [], usados = new Set();
      defs.forEach(df => {
        const e = buscar(df.clave, df.ruta); if (!e || usados.has(df.clave)) return; usados.add(df.clave); usados.add(e.dato);
        lista.push({ id: 'j_' + df.clave, nombre: df.clave, clave: e.clave, archivo: e.archivo, archivos: porDato.get(e.dato) || [e.archivo], dato: e.dato, hash: this.hash(e.dato), fw: df.fw, fh: df.fh, ruta: df.ruta, tipo: 'hoja' });
      });
      imgs.forEach(e => {
        if (usados.has(e.dato)) return; usados.add(e.dato);
        lista.push({ id: 'j_' + e.clave, nombre: e.clave, clave: e.clave, archivo: e.archivo, archivos: porDato.get(e.dato) || [e.archivo], dato: e.dato, hash: this.hash(e.dato), fw: e.fw || 0, fh: e.fh || 0, ruta: null, tipo: e.fw ? 'hoja' : 'imagen' });
      });
      lista.sort((a, b) => (a.tipo === 'hoja' ? 0 : 1) - (b.tipo === 'hoja' ? 0 : 1) || a.nombre.localeCompare(b.nombre));
      this.lista = lista; this._minis = {};
      CK.estado('Encontradas ' + lista.filter(x => x.tipo === 'hoja').length + ' animaciones y ' + lista.filter(x => x.tipo !== 'hoja').length + ' imágenes sueltas en el juego');
      return lista;
    } finally { CK._ocupado = false; }
  },
  async lienzo(e) { if (!this._minis[e.id]) this._minis[e.id] = CK.cargarImagen(e.dato); return this._minis[e.id]; },
  /** Asset del proyecto que ya vino de esta imagen del juego. */
  traida(e) { return Object.values(CK.P.assets).find(a => a.juego && a.juego.clave === e.clave && a.juego.archivo === e.archivo); },
  modificada(a) { return !!(a && a.juego && (a.modificado || 0) > (a.juego.sincronizado || 0) + 5); },

  /** Trae una animación del juego como hoja del proyecto y la abre en Pixel art. */
  async traer(e, abrir = true) {
    const ya = this.traida(e); if (ya) { if (abrir) CK.ir('pixel', ya.id); return ya; }
    const c = await this.lienzo(e); let fw = e.fw || c.width, fh = e.fh || c.height;
    if (!e.fw && c.width > c.height && c.width % c.height === 0) { fw = fh = c.height; } // tira horizontal sin datos: cuadros cuadrados
    if (c.width % fw || c.height % fh) { CK.aviso('El tamaño de cuadro (' + fw + '×' + fh + ') no divide la imagen; se trae como imagen entera.', 'info', 5000); fw = c.width; fh = c.height; }
    const a = CK.asset.crear({ nombre: e.nombre, tipo: fw === c.width && fh === c.height ? 'sprite' : 'hoja', lienzo: CK.copiaLienzo(c), origen: 'juego: ' + e.archivo, cuadros: fw === c.width && fh === c.height ? null : { fw, fh, fps: 8, bucle: true } });
    a.juego = { clave: e.clave, archivo: e.archivo, archivos: e.archivos, ruta: e.ruta || null, hash: e.hash, w: c.width, h: c.height, fw, fh, traido: Date.now() };
    a.juego.sincronizado = a.modificado || Date.now(); CK.tocar(); CK.emit('assets');
    CK.aviso('Traída "' + e.nombre + '" (' + CK.asset.nCuadros(a) + ' cuadros). Editala y después usá "Devolver al juego".', 'ok', 4500);
    if (abrir) CK.ir('pixel', a.id);
    return a;
  },

  /** Devuelve la hoja editada al juego: reemplaza la imagen embebida (y el PNG) con respaldo. */
  async devolver(id) {
    const a = CK.P.assets[id], j = a && a.juego; if (!j) return CK.aviso('Este asset no vino del juego.', 'info');
    const d = await CK.juego.dir(); if (!d) return false;
    const c = CK.img[id]; if (!c) return CK.aviso('No encuentro la imagen del asset.', 'error');
    if (c.width !== j.w || c.height !== j.h) {
      if (!await CK.confirmar('Cambió el tamaño', 'La hoja era de ' + j.w + '×' + j.h + ' y ahora es de ' + c.width + '×' + c.height + '. El juego corta los cuadros de ' + j.fw + '×' + j.fh + ': si agregaste o quitaste cuadros, puede que la animación del juego no los use. ¿Devolver igual?', 'Devolver')) return false;
    }
    const nuevo = c.toDataURL('image/png'), archivos = (j.archivos && j.archivos.length ? j.archivos : [j.archivo]);
    const textos = {}; let viejo = null;
    for (const r of archivos) { const t = await CK.fs.texto(d, r); if (t) textos[r] = t; }
    const principal = textos[j.archivo]; if (!principal) return CK.aviso('No pude leer ' + j.archivo + ' del juego.', 'error', 5000);
    const e = this.extraer(principal).find(x => x.clave === j.clave); if (!e) return CK.aviso('No encontré "' + j.clave + '" en ' + j.archivo + '. ¿Se renombró en el juego?', 'error', 6000);
    viejo = e.dato;
    if (viejo === nuevo) { j.sincronizado = a.modificado || Date.now(); CK.tocar(); return CK.aviso('El juego ya tiene esta misma imagen.', 'info'); }
    if (this.hash(viejo) !== j.hash && !await CK.confirmar('La imagen del juego cambió', '"' + j.clave + '" cambió en el juego desde que la trajiste. Si la devolvés, se pierde ese cambio (queda en el respaldo). ¿Seguir?', 'Reemplazar')) return false;
    const de = CK.fs.dir('editor'), sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    if (!de && !await CK.confirmar('Sin respaldo', 'La carpeta del editor no está conectada, así que no puedo guardar una copia del archivo original. ¿Devolver igual?', 'Devolver sin respaldo')) return false;
    CK._ocupado = true; CK.estado('Devolviendo "' + a.nombre + '" al juego…');
    try {
      let lugares = 0;
      for (const r of Object.keys(textos)) {
        const t = textos[r], n = t.split(viejo).length - 1; if (!n) continue;
        if (de) await CK.fs.escribir(de, CK.rutaProyecto() + '/respaldo/' + r.split('/').pop().replace(/\.js$/, '') + '_' + sello + '.js', t);
        await CK.fs.escribir(d, r, t.split(viejo).join(nuevo)); lugares += n;
      }
      // el PNG de la carpeta assets (lo usa el juego si se abre con servidor), si existe
      let png = false;
      if (j.ruta) {
        try { const f = await CK.fs.leer(d, j.ruta); if (de) await CK.fs.escribir(de, CK.rutaProyecto() + '/respaldo/' + j.ruta.split('/').pop().replace(/\.png$/i, '') + '_' + sello + '.png', f); await CK.fs.escribir(d, j.ruta, await CK.aBlob(c)); png = true; } catch (err) { /* no hay PNG suelto: alcanza con el embebido */ }
      }
      j.hash = this.hash(nuevo); j.w = c.width; j.h = c.height; j.sincronizado = a.modificado || Date.now(); j.devuelto = Date.now(); CK.tocar();
      if (this.lista) { const it = this.lista.find(x => x.clave === j.clave && x.archivo === j.archivo); if (it) { it.dato = nuevo; it.hash = j.hash; delete this._minis[it.id]; } }
      CK.aviso('Listo: "' + a.nombre + '" reemplazada en el juego (' + lugares + (lugares === 1 ? ' lugar' : ' lugares') + (png ? ' + PNG' : '') + ').' + (de ? ' Respaldo en ' + CK.rutaProyecto() + '/respaldo.' : ''), 'ok', 6500);
      CK.emit('assets');
      return true;
    } catch (err) { console.error(err); CK.aviso('No se pudo escribir en el juego: ' + err.message, 'error', 6000); return false; }
    finally { CK._ocupado = false; CK.estado('Listo'); }
  },

  // ---------------------------------------------------------------- interfaz (pestaña "Del juego" de Animaciones)
  _ui: { buscar: '', sueltas: false, cuantas: 60 },
  pintar(c, verHoja) {
    const h = CK.h, U = this._ui, yo = this;
    const repintar = () => { CK.vaciar(c); yo.pintar(c, verHoja); };
    // traídas al proyecto
    const traidas = Object.values(CK.P.assets).filter(a => a.juego).sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (traidas.length) {
      const lt = h('div.lista');
      traidas.forEach(a => {
        const mod = yo.modificada(a);
        lt.append(h('div.item', CK.mini(CK.img[a.id], 36, CK.asset.cuadro(a, 0)),
          h('div.crece', h('div.nombre', a.nombre), h('div.sub', CK.asset.nCuadros(a) + ' cuadros · ' + a.juego.archivo)),
          h('span.etq.' + (mod ? 'oro' : 'verde'), mod ? 'editada' : 'igual'),
          CK.btn({ ico: 'pixel', tip: 'Editar cuadros', desc: 'Abre la hoja en Pixel art: elegís el cuadro abajo, lo retocás y se actualiza solo en la animación.', cls: 'chico plano', on: () => CK.ir('pixel', a.id) }),
          CK.btn({ ico: 'play', tip: 'Ver la animación', cls: 'chico plano', on: () => verHoja(a.id) }),
          CK.btn({ ico: 'exportar', tip: 'Devolver al juego', desc: 'Reemplaza la imagen en el archivo del juego (y su PNG), con respaldo del original.', cls: 'chico' + (mod ? ' pri' : ''), on: async () => { if (await yo.devolver(a.id)) repintar(); } })));
      });
      c.append(CK.seccion('Traídas al proyecto', lt, h('p.nota-txt', 'Cada cuadro que retoques en Pixel art queda en la hoja al instante. "Devolver" la escribe de vuelta en el juego; el archivo original queda en la carpeta respaldo del proyecto.')));
    }
    // del juego
    const cab = h('div.fila',
      CK.btn({ ico: 'recargar', txt: yo.lista ? 'Volver a leer' : 'Leer del juego', cls: yo.lista ? 'chico' : 'pri', desc: 'Busca todas las hojas de sprites que el juego tiene embebidas. Necesita la carpeta del juego conectada.', on: async () => { await yo.leer(); repintar(); } }));
    if (!yo.lista) {
      c.append(CK.seccion('Animaciones del juego', cab, h('p.nota-txt', 'Traé cualquier animación del juego (héroes, enemigos, NPC, fuego, puertas, la casa…), retocá sus píxeles cuadro a cuadro con el editor de Pixel art y devolvela: se reemplaza sola en el juego.')));
      return;
    }
    const q = U.buscar.toLowerCase(), vis = yo.lista.filter(e => (U.sueltas || e.tipo === 'hoja') && (!q || e.nombre.toLowerCase().includes(q) || e.archivo.toLowerCase().includes(q)));
    const busc = CK.txt(U.buscar, v => { U.buscar = v; U.cuantas = 60; repintar(); }, { ph: 'Buscar (soldier, orc, door, casa…)' });
    const lista = h('div.lista');
    vis.slice(0, U.cuantas).forEach(e => {
      const caja = CK.lienzo(40, 40), ya = yo.traida(e);
      yo.lienzo(e).then(cv => { const m = CK.mini(cv, 40, e.fw ? { x: 0, y: 0, w: Math.min(e.fw, cv.width), h: Math.min(e.fh, cv.height) } : null); CK.ctx(caja).drawImage(m, 0, 0); const n = e.fw ? Math.floor(cv.width / e.fw) * Math.floor(cv.height / e.fh) : 1; sub.textContent = (e.tipo === 'hoja' ? n + ' cuadros de ' + e.fw + '×' + e.fh : cv.width + '×' + cv.height + ' px') + ' · ' + e.archivo; }).catch(() => { sub.textContent = 'no se pudo leer · ' + e.archivo; });
      const sub = h('div.sub', '…');
      lista.append(h('div.item', caja, h('div.crece', h('div.nombre', e.nombre), sub),
        ya ? h('span.etq.verde', 'en el proyecto') : null,
        CK.btn({ ico: ya ? 'pixel' : 'importar', tip: ya ? 'Editar sus cuadros' : 'Traer y editar', cls: 'chico' + (ya ? ' plano' : ' pri'), desc: ya ? 'Ya está en el proyecto: abre sus cuadros en Pixel art.' : 'La copia al proyecto como hoja de cuadros y la abre en Pixel art.', on: async () => { await yo.traer(e); } })));
    });
    c.append(CK.seccion('Animaciones del juego', cab,
      h('div.fila', { style: { marginTop: '6px' } }, busc),
      CK.chk(U.sueltas, 'Mostrar también imágenes sueltas', v => { U.sueltas = v; repintar(); }, 'Imágenes del juego que no son hojas de animación (fondos, objetos, piezas de interfaz).'),
      h('p.nota-txt', vis.length + ' resultado' + (vis.length === 1 ? '' : 's') + '.'), lista,
      vis.length > U.cuantas ? CK.btn({ txt: 'Mostrar más', cls: 'chico', on: () => { U.cuantas += 60; repintar(); } }) : null));
  }
};
