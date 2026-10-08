/* TEXTURAS: de una referencia (piedra, madera, pasto) a un tile repetible en tu paleta, con variantes para que no se note
   el patrón y el juego de 16 piezas de transición (bordes y esquinas orgánicos) para pintar suelos en el mapa. */
'use strict';
(function () {
  const h = CK.h; let el, panel, tabs, cv, pie, galeria, info;
  const st = { fuente: null, actual: null, res: null, vars: [], atlas: null, modo: 'textura',
    cfg: { tiles: 1, zona: 0, ox: 0, oy: 0, repetible: true, semilla: 7, usarPaleta: true, fuerza: 1, maxColores: 0, contraste: 0, brillo: 0, saturacion: 0, tono: 0 },
    vcfg: { n: 3, semilla: 3 }, tcfg: { base: '', irregular: 55, borde: 28, semilla: 5, variantes: 3 } };
  const T = () => CK.P.estilo.tile;

  // ---------------------------------------------------------------- cálculo
  const hacerTextura = () => {
    if (!st.fuente || !CK.img[st.fuente]) { st.res = null; return; }
    const c = st.cfg, src = CK.asset.pix(st.fuente), lado = T() * c.tiles;
    const z = c.zona > 0 ? Math.min(c.zona, src.w, src.h) : Math.min(src.w, src.h);
    let r = PIX.crop(src, CK.clamp(c.ox, 0, Math.max(0, src.w - z)), CK.clamp(c.oy, 0, Math.max(0, src.h - z)), z, z);
    r = z > lado ? PIX.downscale(r, lado, lado, 'dominante') : z < lado ? PIX.resizeNearest(r, lado, lado) : r;
    for (let i = 3; i < r.d.length; i += 4) r.d[i] = 255;
    if (c.contraste || c.brillo || c.saturacion || c.tono) r = PIX.adjust(r, c);
    if (c.maxColores > 1) r = PIX.reduceColors(r, c.maxColores);
    if (c.usarPaleta && CK.P.estilo.paleta.length) r = PIX.quantize(r, CK.P.estilo.paleta, { k: c.fuerza });
    if (c.repetible) r = PIX.seamless(r, c.semilla);
    if (c.usarPaleta && c.fuerza >= 1 && CK.P.estilo.paleta.length) r = PIX.quantize(r, CK.P.estilo.paleta);
    st.res = r;
  };
  const piezasDe = id => { const a = CK.P.assets[id]; if (!a) return []; const t = (a.tileset && a.tileset.tile) || T(); return PIX.slice(CK.asset.pix(id), t, t); };
  const hacerVariantes = () => { const p = st.actual && piezasDe(st.actual)[0]; st.vars = p ? PIX.variants(p, st.vcfg.n, st.vcfg.semilla) : []; };
  const hacerAtlas = () => {
    const a = CK.P.assets[st.actual]; if (!a) { st.atlas = null; return; } const c = st.tcfg, t = T(), terr = CK.asset.pix(st.actual), base = c.base && CK.img[c.base] ? CK.asset.pix(c.base) : null;
    const at = PIX.wang16(terr, base, t, { irregular: c.irregular / 100, borde: c.borde / 100, semilla: c.semilla });
    let vars = piezasDe(st.actual).slice(1, 1 + c.variantes); if (vars.length < c.variantes) vars = vars.concat(PIX.variants(piezasDe(st.actual)[0], c.variantes - vars.length, c.semilla + 11));
    if (vars.length) { const filas = Math.ceil(vars.length / 4), out = PIX.make(t * 4, t * (4 + filas)); PIX.blit(out, at, 0, 0, false); vars.forEach((v, i) => PIX.blit(out, v, (i % 4) * t, (4 + Math.floor(i / 4)) * t, false)); st.atlas = out; } else st.atlas = at;
  };
  /** Mapa de muestra con manchas para ver cómo quedan los bordes. */
  const muestra = (atlasC, nVar) => {
    const t = T(), gw = 15, gh = 10, m = new Uint8Array((gw + 1) * (gh + 1));
    for (let j = 0; j <= gh; j++) for (let i = 0; i <= gw; i++) { const d1 = ((i - 4.5) / 3.4) ** 2 + ((j - 4) / 2.6) ** 2, d2 = ((i - 11) / 2.6) ** 2 + ((j - 6.5) / 2.2) ** 2, cam = Math.abs(j - (2 + i * 0.35)) < 0.8 && i > 6; m[j * (gw + 1) + i] = d1 < 1 + PIX.noiseP(i * 8, j * 8, 8, 256, 3) * 0.5 - 0.2 || d2 < 1 || cam ? 1 : 0; }
    const c = CK.lienzo(gw * t, gh * t), x = CK.ctx(c);
    if (st.tcfg.base && CK.img[st.tcfg.base]) { const b = CK.img[st.tcfg.base]; for (let yy = 0; yy < c.height; yy += b.height) for (let xx = 0; xx < c.width; xx += b.width) x.drawImage(b, xx, yy); } else { x.fillStyle = CK.P.estilo.paleta[8] || '#4c7a3a'; x.fillRect(0, 0, c.width, c.height); }
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let p = PIX.wangIndex(m[j * (gw + 1) + i], m[j * (gw + 1) + i + 1], m[(j + 1) * (gw + 1) + i], m[(j + 1) * (gw + 1) + i + 1]); if (p === 15) continue; if (p === 0 && nVar) { const v = Math.floor((((i * 73856093) ^ (j * 19349663)) >>> 0) % (nVar + 1)); if (v) p = 15 + v; } x.drawImage(atlasC, (p % 4) * t, Math.floor(p / 4) * t, t, t, i * t, j * t, t, t); }
    return c;
  };

  // ---------------------------------------------------------------- vista
  const recalcular = CK.debounce(() => { try { if (st.modo === 'textura') hacerTextura(); else if (st.modo === 'variantes') hacerVariantes(); else hacerAtlas(); } catch (e) { console.error(e); CK.aviso(e.message, 'error'); } pintarVista(); }, 50);
  const pintarVista = () => {
    if (!cv) return; const caja = cv.parentElement.getBoundingClientRect(), W = Math.max(80, Math.floor(caja.width)), H = Math.max(80, Math.floor(caja.height)); cv.width = W; cv.height = H; const x = CK.ctx(cv); x.fillStyle = '#17191c'; x.fillRect(0, 0, W, H);
    const centrar = (c, max) => { let k = Math.min((W - 30) / c.width, (H - 30) / c.height); k = Math.max(1, Math.min(max || 8, Math.floor(k))); const w = c.width * k, hh = c.height * k; x.drawImage(c, Math.round((W - w) / 2), Math.round((H - hh) / 2), w, hh); return k; };
    let txt = '';
    if (st.modo === 'textura') { if (st.res) { const n = Math.max(3, Math.ceil(8 / st.cfg.tiles)); centrar(CK.aLienzo(PIX.mosaic(st.res, n, n)), 6); txt = 'Vista en mosaico: la textura repetida ' + n + ' × ' + n + '. Si se nota una costura o un patrón, cambiá la semilla o la zona. ' + st.res.w + ' × ' + st.res.h + ' px · ' + PIX.colors(st.res).length + ' colores'; } else txt = 'Subí una referencia de textura (foto o dibujo de piedra, madera, pasto, tierra…) o elegí una de la lista.'; }
    else if (st.modo === 'variantes') { const p = st.actual && piezasDe(st.actual)[0]; if (p) { const todas = [p].concat(st.vars), t = p.w, gw = 12, gh = 8, c = CK.lienzo(gw * t, gh * t), cx = CK.ctx(c), cs = todas.map(CK.aLienzo); for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) cx.drawImage(cs[Math.floor((((i * 73856093) ^ (j * 19349663)) >>> 0) % cs.length)], i * t, j * t); centrar(c, 6); txt = 'Así se ve el suelo alternando el original con ' + st.vars.length + ' variantes al azar.'; } else txt = 'Elegí una textura guardada (a la derecha) para generarle variantes.'; }
    else { if (st.atlas) { const ac = CK.aLienzo(st.atlas), m = muestra(ac, st.atlas.h > T() * 4 ? st.tcfg.variantes : 0); centrar(m, 5); const k = Math.max(1, Math.min(3, Math.floor(110 / ac.width))); x.fillStyle = 'rgba(16,17,20,.85)'; x.fillRect(8, 8, ac.width * k + 12, ac.height * k + 28); x.drawImage(ac, 14, 14, ac.width * k, ac.height * k); x.fillStyle = '#a3a8b0'; x.font = '11px "Segoe UI", sans-serif'; x.fillText('Las 16 piezas', 14, ac.height * k + 28); txt = 'Muestra de cómo se funde "' + CK.P.assets[st.actual].nombre + '" con ' + (st.tcfg.base && CK.P.assets[st.tcfg.base] ? '"' + CK.P.assets[st.tcfg.base].nombre + '"' : 'el suelo de abajo') + '. En el mapa lo pintás con el pincel y los bordes salen solos.'; } else txt = 'Elegí una textura guardada (a la derecha): es el terreno que va arriba, por ejemplo el camino de piedra.'; }
    info.textContent = txt; pintarPie();
  };
  const pintarPie = () => {
    CK.vaciar(pie); const a = CK.P.assets[st.actual];
    if (st.modo === 'textura') pie.append(CK.btn({ ico: 'guardar', txt: 'Guardar textura', cls: 'pri', desc: 'Guarda el tile repetible en el proyecto. Después podés generarle variantes y transiciones.', on: guardarTextura }), st.actual && a && a.tipo === 'textura' ? CK.btn({ txt: 'Actualizar "' + a.nombre + '"', desc: 'Reemplaza la textura elegida con este resultado.', on: () => { if (st.res) { CK.asset.poner(st.actual, CK.aLienzo(st.res)); CK.aviso('Textura actualizada'); } } }) : null, CK.btn({ ico: 'importar', txt: 'Descargar PNG', on: async () => st.res && CK.descargar(await CK.aBlob(CK.aLienzo(st.res)), 'textura.png') }));
    else if (st.modo === 'variantes') pie.append(CK.btn({ ico: 'guardar', txt: 'Agregar variantes a la textura', cls: 'pri', desc: 'Deja la textura con su original y las variantes juntas. En una capa de Tiles las elegís con Mayús + clic y se alternan solas.', on: guardarVariantes }));
    else pie.append(CK.btn({ ico: 'guardar', txt: 'Guardar tileset de transiciones', cls: 'pri', desc: 'Guarda las 16 piezas (más las variantes del centro). Se usa en una capa de Terreno del mapa.', on: guardarTileset }), CK.btn({ ico: 'importar', txt: 'Descargar PNG', on: async () => st.atlas && CK.descargar(await CK.aBlob(CK.aLienzo(st.atlas)), 'tileset.png') }));
    pie.querySelectorAll('.btn.pri').forEach(b => { b.disabled = st.modo === 'textura' ? !st.res : st.modo === 'variantes' ? !st.vars.length : !st.atlas; });
  };
  const guardarTextura = async () => { if (!st.res) return; const base = CK.P.assets[st.fuente], n = await CK.pedir('Guardar textura', 'Nombre (por ejemplo: camino_piedra)', (base ? base.nombre : 'textura').replace(/^ref_?/, '')); if (!n) return; const a = CK.asset.crear({ nombre: n, tipo: 'textura', lienzo: CK.aLienzo(st.res), origen: 'textura de ' + (base ? base.nombre : '?'), tileset: { tile: T(), forma: 'libre' } }); st.actual = a.id; galeria.refrescar(); CK.aviso('Textura guardada: ' + a.nombre); pintarPie(); };
  const guardarVariantes = () => { let p = piezasDe(st.actual); if (!p.length || !st.vars.length) return; const ya = (CK.P.assets[st.actual].tileset || {}).variantes || 0; if (ya && ya < p.length) p = p.slice(0, p.length - ya); const todas = p.concat(st.vars), t = p[0].w, out = PIX.make(t * todas.length, t); todas.forEach((v, i) => PIX.blit(out, v, i * t, 0, false)); const f = CK.hist.imagen('Variantes', st.actual); CK.asset.poner(st.actual, CK.aLienzo(out)); f(); CK.P.assets[st.actual].tileset = { tile: t, forma: 'libre', variantes: st.vars.length }; galeria.refrescar(); CK.aviso('Listo: "' + CK.P.assets[st.actual].nombre + '" ahora tiene ' + todas.length + ' piezas.'); };
  const guardarTileset = async () => { if (!st.atlas) return; const a0 = CK.P.assets[st.actual], b0 = CK.P.assets[st.tcfg.base], n = await CK.pedir('Guardar tileset', 'Nombre', 'ts_' + a0.nombre + (b0 ? '_sobre_' + b0.nombre : '')); if (!n) return; const a = CK.asset.crear({ nombre: n, tipo: 'tileset', lienzo: CK.aLienzo(st.atlas), origen: 'transiciones de ' + a0.nombre, tileset: { tile: T(), forma: 'wang16', variantes: st.atlas.h > T() * 4 ? st.tcfg.variantes : 0, terreno: a0.id, base: b0 ? b0.id : null } }); galeria.refrescar(); CK.aviso('Tileset guardado. En Mapa: capa de Terreno → Tileset → "' + a.nombre + '".', 'ok', 5000); };

  // ---------------------------------------------------------------- panel
  const pTextura = c => {
    const g = st.cfg, re = () => recalcular(), src = st.fuente && CK.img[st.fuente], lado = src ? Math.min(src.width, src.height) : 256;
    const refs = CK.galeria({ tipos: ['ref', 'textura', 'fondo'], actual: () => st.fuente, alElegir: id => { st.fuente = id; g.zona = 0; g.ox = 0; g.oy = 0; pintarPanel(); re(); }, sinBuscar: true, vacio: 'Sin referencias todavía.' });
    c.append(h('div.bloque', h('h3.bloque-tit', 'Referencia', CK.btn({ ico: 'importar', txt: 'Subir', cls: 'chico pri', desc: 'Subí una foto o dibujo de la textura: piedra, ladrillo, madera, pasto, tierra, agua.', on: async () => { const as = await CK.importarImagenes('ref'); if (as.length) { st.fuente = as[0].id; pintarPanel(); re(); } } })), h('div', { style: { maxHeight: '150px', overflowY: 'auto' } }, refs)));
    c.append(h('div.bloque', h('h3.bloque-tit', 'Qué parte tomar'),
      CK.campo('Tamaño', CK.sel(String(g.tiles), [['1', '1 tile (' + T() + ' px)'], ['2', '2 × 2 tiles'], ['3', '3 × 3 tiles'], ['4', '4 × 4 tiles']], v => { g.tiles = +v; re(); }), 'Cuánto mide la textura final. Una más grande se repite menos a la vista.'),
      CK.campo('Zona', CK.rango(g.zona || lado, { min: Math.min(8, lado), max: lado }, v => { g.zona = v; re(); }), 'Cuántos píxeles de la referencia se toman. Más chico = más "zoom" sobre el material.'),
      CK.campo('Mover →', CK.rango(g.ox, { min: 0, max: Math.max(0, (src ? src.width : 256) - 8) }, v => { g.ox = v; re(); }), 'Desplaza la zona hacia la derecha.'),
      CK.campo('Mover ↓', CK.rango(g.oy, { min: 0, max: Math.max(0, (src ? src.height : 256) - 8) }, v => { g.oy = v; re(); }), 'Desplaza la zona hacia abajo.')));
    c.append(h('div.bloque', h('h3.bloque-tit', 'Estilo'),
      CK.chk(g.usarPaleta, 'Llevar a la paleta del proyecto', v => { g.usarPaleta = v; re(); }, 'Usa solo los colores de tu paleta fija.'),
      CK.campo('Colores', CK.sel(String(g.maxColores), [['0', 'Sin límite'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['8', '8'], ['12', '12']], v => { g.maxColores = +v; re(); }), 'Los suelos se ven mejor con pocos colores (3 a 5): quedan tranquilos y no compiten con los personajes.'),
      CK.campo('Contraste', CK.rango(g.contraste, { min: -80, max: 80, step: 5 }, v => { g.contraste = v; re(); }), 'Bajalo para suelos calmos; subilo para piedra marcada.'),
      CK.campo('Brillo', CK.rango(g.brillo, { min: -80, max: 80, step: 5 }, v => { g.brillo = v; re(); })),
      CK.campo('Saturación', CK.rango(g.saturacion, { min: -100, max: 100, step: 5 }, v => { g.saturacion = v; re(); })),
      CK.campo('Tono', CK.rango(g.tono, { min: -180, max: 180, step: 5 }, v => { g.tono = v; re(); }), 'Gira el color: de piedra gris a piedra azulada, de pasto verde a otoñal.')));
    c.append(h('div.bloque', h('h3.bloque-tit', 'Repetición'),
      CK.chk(g.repetible, 'Hacerla repetible', v => { g.repetible = v; re(); }, 'Corrige los bordes para que al ponerla una al lado de otra no se note la unión.'),
      h('div.fila', CK.btn({ ico: 'dado', txt: 'Otra semilla', cls: 'chico', desc: 'Cambia cómo se mezclan los bordes. Probá hasta que la costura desaparezca.', on: () => { g.semilla = 1 + Math.floor(Math.random() * 999); re(); } }))));
  };
  const pVariantes = c => {
    const a = CK.P.assets[st.actual];
    c.append(h('div.bloque', h('h3.bloque-tit', 'Variantes'), h('p.ayuda-txt', a ? 'Textura: ' + a.nombre : 'Elegí una textura guardada en la lista de la derecha.'), h('p.nota-txt', 'Cada variante es la misma textura con pequeñas diferencias (una piedra corrida, una grieta en otro lado). Alternadas al azar, el suelo deja de verse repetido.'),
      CK.campo('Cantidad', CK.rango(st.vcfg.n, { min: 1, max: 7 }, v => { st.vcfg.n = v; recalcular(); })),
      h('div.fila', CK.btn({ ico: 'dado', txt: 'Otras', cls: 'chico', desc: 'Genera un juego distinto de variantes.', on: () => { st.vcfg.semilla = 1 + Math.floor(Math.random() * 999); recalcular(); } }))));
  };
  const pTrans = c => {
    const a = CK.P.assets[st.actual], g = st.tcfg, re = () => recalcular();
    c.append(h('div.bloque', h('h3.bloque-tit', 'Transiciones'), h('p.ayuda-txt', a ? 'Terreno de arriba: ' + a.nombre : 'Elegí en la lista de la derecha la textura que va arriba (el camino, la tierra, el agua).'),
      CK.campo('Sobre', CK.sel(g.base, [['', 'Transparente (cualquier suelo)']].concat(CK.asset.lista('textura').filter(x => x.id !== st.actual).map(x => [x.id, x.nombre])), v => { g.base = v; re(); }), 'Con "Transparente" el borde deja ver lo que haya debajo: la misma pieza sirve sobre pasto, tierra o piedra. Si elegís una textura, queda pegada a esa.'),
      CK.campo('Borde irregular', CK.rango(g.irregular, { min: 0, max: 100, step: 5 }, v => { g.irregular = v; re(); }), '0 = bordes rectos y curvas limpias. Más alto = borde orgánico, comido, como el del patio de armas.'),
      CK.campo('Orilla oscura', CK.rango(g.borde, { min: 0, max: 60, step: 2 }, v => { g.borde = v; re(); }), 'Oscurece el último píxel del terreno para marcar el desnivel. 0 = sin orilla.'),
      CK.campo('Variantes centro', CK.rango(g.variantes, { min: 0, max: 8 }, v => { g.variantes = v; re(); }), 'Versiones del tile lleno que se alternan solas para que el interior no se vea repetido.'),
      h('div.fila', CK.btn({ ico: 'dado', txt: 'Otra forma de borde', cls: 'chico', desc: 'Cambia el dibujo del borde irregular.', on: () => { g.semilla = 1 + Math.floor(Math.random() * 999); re(); } }))));
  };
  const pintarPanel = () => { if (tabs) tabs.refrescar(); };
  const crear = raiz => {
    el = raiz; el.style.gridTemplateColumns = '318px 1fr 250px';
    panel = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    tabs = CK.pestanas([{ id: 'textura', txt: 'Textura', ico: 'texturas', desc: 'De la referencia al tile repetible.', pintar: c => { st.modo = 'textura'; pTextura(c); recalcular(); } }, { id: 'variantes', txt: 'Variantes', ico: 'dado', desc: 'Versiones para que no se note el patrón.', pintar: c => { st.modo = 'variantes'; pVariantes(c); recalcular(); } }, { id: 'transiciones', txt: 'Bordes', ico: 'transicion', desc: 'Las 16 piezas de borde y esquina entre dos suelos.', pintar: c => { st.modo = 'transiciones'; pTrans(c); recalcular(); } }], 'textura');
    panel.append(tabs);
    cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block' } }); info = h('div.ayuda-txt', { style: { padding: '8px 12px', borderTop: '1px solid var(--linea)', background: 'var(--panel)' } }); pie = h('div.fila', { style: { padding: '10px 12px', borderTop: '1px solid var(--linea)', background: 'var(--panel)' } });
    const centro = h('div', { style: { display: 'grid', gridTemplateRows: '1fr auto auto', minWidth: 0, minHeight: 0 } }, h('div', { style: { minHeight: 0, overflow: 'hidden' } }, cv), info, pie);
    galeria = CK.galeria({ tipos: ['textura', 'tileset'], actual: () => st.actual, alElegir: id => { st.actual = id; if (CK.P.assets[id].tipo === 'tileset' && st.modo !== 'textura') { CK.aviso('Eso ya es un tileset de transiciones. Elegí una textura para generar otro.', 'info'); } tabs.refrescar(); }, alDoble: id => CK.ir('pixel', id), pista: 'Clic: usarla para variantes y bordes. Doble clic: editar sus píxeles.', vacio: 'Acá aparecen las texturas y tilesets que guardes.' });
    const der = h('aside.panel', h('div.bloque', h('h3.bloque-tit', 'Guardadas'), galeria, h('div.fila', { style: { marginTop: '10px' } },
      CK.btn({ ico: 'pixel', txt: 'Editar píxeles', cls: 'chico', desc: 'Abre la textura elegida en el editor de pixel art para retocarla a mano.', on: () => st.actual ? CK.ir('pixel', st.actual) : CK.aviso('Elegí una textura primero.', 'info') }),
      CK.btn({ ico: 'recargar', txt: 'Reajustar', cls: 'chico', desc: 'Usa la textura elegida como referencia para volver a pasarla por los ajustes (colores, contraste, tono).', on: () => { if (!st.actual) return; st.fuente = st.actual; st.cfg.zona = 0; st.cfg.ox = 0; st.cfg.oy = 0; st.cfg.tiles = Math.max(1, Math.round(CK.P.assets[st.actual].h / T())); tabs.ir('textura'); } }),
      CK.btn({ ico: 'basura', tip: 'Borrar la elegida', cls: 'chico peligro', on: async () => { if (st.actual && await CK.confirmar('Borrar', 'Se borra "' + CK.P.assets[st.actual].nombre + '" del proyecto. Las capas que la usen quedan vacías.', 'Borrar')) { CK.asset.borrar(st.actual); st.actual = null; tabs.refrescar(); } } }))));
    el.append(panel, centro, der);
    CK.soltarEn(el, async fs => { const as = await CK.importarImagenes('ref', fs); if (as.length) { st.fuente = as[0].id; tabs.ir('textura'); } });
    new ResizeObserver(CK.debounce(() => { if (el.style.display !== 'none') pintarVista(); }, 80)).observe(centro);
  };
  const mostrar = arg => { if (!CK.P) return; if (arg && CK.P.assets[arg]) { st.actual = arg; if (!st.fuente) st.fuente = arg; } [['fuente'], ['actual']].forEach(([k]) => { if (st[k] && !CK.P.assets[st[k]]) st[k] = null; }); tabs.refrescar(); galeria.refrescar(); };
  CK.texturas = { st };
  CK.registrar({ id: 'texturas', nombre: 'Texturas y suelos', corto: 'Texturas', ico: 'texturas', desc: 'Subí una referencia de piedra, madera o pasto y salí con el tile repetible, sus variantes y las piezas de borde.', crear, mostrar, alCambiarProyecto: () => { st.fuente = st.actual = null; st.res = null; st.atlas = null; st.vars = []; } });
})();
