#!/usr/bin/env node
/* CK: las mismas funciones del Taller, como comandos sobre los archivos del proyecto.
   Las usa Claude (y cualquiera con Node) para trabajar muchos assets de una vez. No necesita instalar nada.

   Uso:  node herramientas/ck.js <comando> <carpeta-del-proyecto> [opciones]
         (la carpeta del proyecto es  trabajo/<nombre>  y adentro tiene proyecto.json y assets/)

   Después de usar estos comandos, en el editor: Proyecto → "Recargar de la carpeta". */
'use strict';
const fs = require('fs'), path = require('path');
const PIX = require('../js/core/pix.js'), GIF = require('../js/core/gif.js'), DIAL = require('../js/core/dialogo.js'), png = require('./png.js');

// ---------------------------------------------------------------- proyecto en disco
function abrir(dir) {
  const ruta = path.join(dir, 'proyecto.json'); if (!fs.existsSync(ruta)) throw new Error('No encuentro ' + ruta);
  const P = JSON.parse(fs.readFileSync(ruta, 'utf8')), cache = {}, sucias = new Set();
  const pr = {
    P, dir,
    img(id) { if (!cache[id]) cache[id] = png.leer(path.join(dir, 'assets', id + '.png')); return cache[id]; },
    poner(id, im) { cache[id] = im; sucias.add(id); const a = P.assets[id]; a.w = im.w; a.h = im.h; a.modificado = Date.now(); },
    crear(o) { let base = slug(o.nombre), id = base, n = 2; while (P.assets[id]) id = base + '_' + (n++); const a = Object.assign({ id, nombre: o.nombre, tipo: o.tipo || 'sprite', w: o.im.w, h: o.im.h, etiquetas: [], origen: o.origen || 'herramientas', creado: Date.now() }, o.extra || {}); P.assets[id] = a; cache[id] = o.im; sucias.add(id); return a; },
    guardar() { fs.mkdirSync(path.join(dir, 'assets'), { recursive: true }); sucias.forEach(id => png.escribir(path.join(dir, 'assets', id + '.png'), cache[id])); P.modificado = Date.now(); fs.writeFileSync(ruta, JSON.stringify(P, null, 1)); return sucias.size; },
    assets(filtro) { return Object.values(P.assets).filter(a => a.tipo !== 'capa' && a.tipo !== 'ref' && (!filtro || filtro(a))); },
    cuadro(a, i) { if (!a.cuadros) return { x: 0, y: 0, w: a.w, h: a.h }; const cols = Math.max(1, Math.floor(a.w / a.cuadros.fw)); return { x: (i % cols) * a.cuadros.fw, y: Math.floor(i / cols) * a.cuadros.fh, w: a.cuadros.fw, h: a.cuadros.fh }; },
    nCuadros(a) { return a.cuadros ? Math.max(1, Math.floor(a.w / a.cuadros.fw) * Math.floor(a.h / a.cuadros.fh)) : 1; },
    objetos(m) { const out = []; (m.capas || []).forEach(c => { if (c.tipo === 'objetos') c.objetos.forEach(o => { if (!o.tipo) out.push(o); }); }); return out; }
  };
  return pr;
}
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sin_nombre';
function opciones(args) { const o = { _: [] }; for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2), v = args[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = isNaN(+v) || v === '' ? v : +v; i++; } } else o._.push(a); } return o; }
const elegidos = (pr, o) => { if (o.asset) { const ids = String(o.asset).split(','); ids.forEach(id => { if (!pr.P.assets[id]) throw new Error('No existe el asset "' + id + '"'); }); return ids.map(id => pr.P.assets[id]); } if (o.todos) return pr.assets(a => a.tipo !== 'fondo' && (!o.tipo || a.tipo === o.tipo)); if (o.tipo) return pr.assets(a => a.tipo === o.tipo); throw new Error('Indicá --asset id[,id…], --tipo <tipo> o --todos'); };

// ---------------------------------------------------------------- revisor (misma lógica que el editor, en texto)
function revisar(pr) {
  const P = pr.P, e = P.estilo, out = [], add = (nivel, donde, txt) => out.push({ nivel, donde, txt });
  pr.assets().forEach(a => {
    let im; try { im = pr.img(a.id); } catch (err) { add('grave', a.id, 'falta el archivo assets/' + a.id + '.png'); return; }
    const s = PIX.stats(im, e.paleta), fondo = a.tipo === 'fondo';
    if (!s.opacos) { add('medio', a.id, 'imagen vacía'); return; }
    if (s.escala > 1 && !fondo) add('grave', a.id, 'pixel art agrandado x' + s.escala);
    if (s.fueraDePaleta > 0.06 && e.definida) add(s.fueraDePaleta > 0.4 ? 'medio' : 'leve', a.id, Math.round(s.fueraDePaleta * 100) + '% fuera de la paleta');
    if (s.semitransparente > 0.04 && a.tipo !== 'fx' && !fondo) add('medio', a.id, 'bordes borrosos (' + Math.round(s.semitransparente * 100) + '% semitransparente)');
    if (s.colores > e.maxColores * 1.5 && !fondo && a.tipo !== 'tileset' && !(s.fueraDePaleta > 0.06)) add('leve', a.id, s.colores + ' colores (máximo ' + e.maxColores + ')');
    if (a.cuadros) { if (a.w % a.cuadros.fw || a.h % a.cuadros.fh) add('grave', a.id, 'la hoja ' + a.w + 'x' + a.h + ' no se divide en cuadros de ' + a.cuadros.fw + 'x' + a.cuadros.fh); else if (a.tipo !== 'fx' && !a.receta && pr.nCuadros(a) > 1) { const j = PIX.frameJitter(PIX.slice(im, a.cuadros.fw, a.cuadros.fh)); if (j > 2) add('leve', a.id, 'se corre ' + j + ' px entre cuadros'); } }
  });
  Object.values(P.mapas).forEach(m => {
    const objs = pr.objetos(m), sin = objs.filter(o => !P.assets[o.asset]); if (sin.length) add('grave', 'mapa ' + m.id, sin.length + ' objetos sin imagen: ' + [...new Set(sin.map(o => o.clave || o.asset))].slice(0, 6).join(', '));
    const raros = objs.filter(o => (o.sx % 1) || (o.sy % 1)); if (raros.length) add('medio', 'mapa ' + m.id, raros.length + ' objetos con escala no entera');
    m.capas.forEach(c => { if (c.tipo !== 'objetos' && !c.tileset) add('leve', 'mapa ' + m.id, 'capa "' + c.nombre + '" sin tileset'); });
    const pend = objs.filter(o => o.marca && o.marca.estado !== 'hecha'); if (pend.length) add('leve', 'mapa ' + m.id, pend.length + ' animaciones marcadas sin hacer');
  });
  Object.values(P.npcs).forEach(n => { const vac = (n.temas || []).filter(t => !(t.respuestas || []).length); if (!(n.temas || []).length) add('medio', 'npc ' + n.id, 'sin temas'); else if (vac.length) add('medio', 'npc ' + n.id, vac.length + ' temas sin respuestas: ' + vac.map(t => t.nombre).join(', ')); if (!(n.escape || []).length) add('medio', 'npc ' + n.id, 'sin frases de escape'); });
  return out;
}
function notas(pr) {
  const out = []; (pr.P.notas || []).forEach(n => out.push({ id: n.id, donde: 'general', n }));
  Object.values(pr.P.mapas).forEach(m => { (m.notas || []).forEach(n => out.push({ id: n.id, donde: 'mapa ' + m.id + ' (' + n.x + ',' + n.y + ')', n })); pr.objetos(m).forEach(o => { if (o.marca) out.push({ id: o.id, donde: 'mapa ' + m.id + ' · animar ' + (o.nombre || o.asset) + ' (' + o.x + ',' + o.y + ')', n: { texto: o.marca.nota + (o.marca.tipoAnim ? ' [' + o.marca.tipoAnim + ']' : ''), hecho: o.marca.estado === 'hecha', clase: 'Animación' }, marca: o.marca }); }); });
  return out;
}

// ---------------------------------------------------------------- comandos
const C = {
  info: { ayuda: 'Resumen del proyecto', run(pr) { const P = pr.P, por = {}; Object.values(P.assets).forEach(a => { por[a.tipo] = (por[a.tipo] || 0) + 1; });
    console.log(P.nombre + '  ·  tile ' + P.estilo.tile + '  ·  paleta de ' + P.estilo.paleta.length + ' colores  ·  contorno ' + P.estilo.contorno + '  ·  luz ' + P.estilo.luz);
    console.log('assets: ' + Object.keys(por).map(k => por[k] + ' ' + k).join(', ')); Object.values(P.mapas).forEach(m => console.log('mapa ' + m.id + ': "' + m.nombre + '" ' + m.w + 'x' + m.h + ', ' + pr.objetos(m).length + ' objetos, ' + (m.colisiones || []).length + ' colisiones' + (m.origen ? ' (del juego: ' + m.origen.clave + ')' : '')));
    console.log('npc: ' + (Object.values(P.npcs).map(n => n.nombre + ' (' + (n.temas || []).length + ' temas)').join(', ') || '-')); console.log('fx: ' + Object.keys(P.fx).join(', ')); console.log('notas pendientes: ' + notas(pr).filter(x => !x.n.hecho).length); } },
  revisar: { ayuda: 'Lista lo que desentona (paleta, tamaños, bordes, hojas, mapas, NPC)', run(pr) { const ps = revisar(pr); if (!ps.length) return console.log('Sin problemas.'); ['grave', 'medio', 'leve'].forEach(n => ps.filter(p => p.nivel === n).forEach(p => console.log('[' + n + '] ' + p.donde + ': ' + p.txt))); console.log(ps.length + ' en total'); } },
  notas: { ayuda: 'Lista las notas y marcas. --resolver <id> [--respuesta "texto"] marca una como hecha', run(pr, o) {
    if (o.resolver) { const x = notas(pr).find(q => q.id === o.resolver); if (!x) throw new Error('No hay nota con id ' + o.resolver); if (x.marca) { x.marca.estado = 'hecha'; if (o.respuesta) x.marca.respuesta = String(o.respuesta); } else { x.n.hecho = true; if (o.respuesta) x.n.respuesta = String(o.respuesta); } pr.guardar(); return console.log('Resuelta: ' + x.n.texto); }
    notas(pr).forEach(x => { if (x.n.hecho && !o.todas) return; console.log((x.n.hecho ? '[x] ' : '[ ] ') + x.id + '  ' + x.donde + '  <' + (x.n.clase || 'Nota') + '>  ' + x.n.texto + (x.n.respuesta ? '\n      respuesta: ' + x.n.respuesta : '')); }); } },
  paleta: { ayuda: 'Muestra la paleta. --de <imagen.png|asset> [--n 24] la toma de una imagen. --sumar la agrega en vez de reemplazar', run(pr, o) { if (o.de) { const im = pr.P.assets[o.de] ? pr.img(o.de) : png.leer(String(o.de)), pal = PIX.extractPalette(im, o.n || 24); pr.P.estilo.paleta = o.sumar ? [...new Set(pr.P.estilo.paleta.concat(pal))] : pal; pr.P.estilo.definida = true; pr.guardar(); } console.log(pr.P.estilo.paleta.join(' ')); } },
  filtro: { ayuda: 'Pasa assets por el filtro de estilo. --asset id,id | --tipo t | --todos   y uno o más de:  --paleta [--fuerza 0-1]  --duros  --limpiar  --real  --colores N  --contorno color|negro|quitar',
    run(pr, o) { const pal = pr.P.estilo.paleta; let n = 0; elegidos(pr, o).forEach(a => { let im = pr.img(a.id); const antes = PIX.stats(im, pal);
      if (o.real) { const f = PIX.pixelScale(im); if (f > 1) { im = PIX.downscale(im, Math.round(im.w / f), Math.round(im.h / f), 'dominante'); if (a.cuadros) { a.cuadros.fw = Math.round(a.cuadros.fw / f); a.cuadros.fh = Math.round(a.cuadros.fh / f); } } }
      if (o.duros) im = PIX.hardenAlpha(im, 110); if (o.colores) im = PIX.reduceColors(im, o.colores); if (o.paleta) im = PIX.quantize(im, pal, { k: o.fuerza === undefined ? 1 : o.fuerza }); if (o.limpiar) im = PIX.cleanup(im);
      if (o.contorno === 'quitar') im = PIX.removeOutline(im); else if (o.contorno === 'negro') im = PIX.outline(im, '#000000', { agrandar: !a.cuadros }); else if (o.contorno === 'color') im = a.cuadros ? im : PIX.outlineSelf(im, pal, -2);
      pr.poner(a.id, im); const d = PIX.stats(im, pal); n++; console.log(a.id + ': ' + antes.w + 'x' + antes.h + ' ' + antes.colores + ' col ' + Math.round(antes.fueraDePaleta * 100) + '% fuera  ->  ' + d.w + 'x' + d.h + ' ' + d.colores + ' col ' + Math.round(d.fueraDePaleta * 100) + '% fuera'); });
      pr.guardar(); console.log(n + ' assets filtrados'); } },
  convertir: { ayuda: 'Referencia -> asset. convertir <proyecto> <imagen.png|asset> --nombre n [--tipo sprite] [--alto 32 | --ancho 32 | --factor 4 | --auto | --igual] [--contorno color|negro] [--sin-fondo no] [--colores N] [--fw --fh --fps (hoja)]',
    run(pr, o) { const src = o._[0]; if (!src) throw new Error('Falta la imagen'); const im = pr.P.assets[src] ? pr.img(src) : png.leer(String(src)), cfg = { quitarFondo: o['sin-fondo'] !== 'no', contorno: o.contorno || 'ninguno', maxColores: o.colores || 0 };
      if (o.alto) { cfg.modoTam = 'alto'; cfg.alto = o.alto; } else if (o.ancho) { cfg.modoTam = 'ancho'; cfg.ancho = o.ancho; } else if (o.factor) { cfg.modoTam = 'factor'; cfg.factor = o.factor; } else if (o.auto) cfg.modoTam = 'auto'; else if (o.igual) cfg.modoTam = 'igual'; else { cfg.modoTam = 'alto'; cfg.alto = pr.P.estilo.tile * 2; }
      const r = PIX.convert(im, cfg, pr.P.estilo.paleta), nombre = String(o.nombre || path.basename(String(src), '.png')), extra = {}; if (o.fw) extra.cuadros = { fw: o.fw, fh: o.fh || r.h, fps: o.fps || 8, bucle: true };
      const a = pr.crear({ nombre, tipo: o.tipo || (o.fw ? 'hoja' : 'sprite'), im: r, origen: 'convertido de ' + path.basename(String(src)), extra }); pr.guardar(); console.log('Creado ' + a.id + ' ' + r.w + 'x' + r.h + ', ' + PIX.colors(r).length + ' colores'); } },
  agregar: { ayuda: 'Suma una imagen tal cual. agregar <proyecto> <imagen.png> --nombre n [--tipo sprite|hoja|textura|fondo|ref…] [--fw --fh --fps]', run(pr, o) { const im = png.leer(String(o._[0])), extra = {}; if (o.fw) extra.cuadros = { fw: o.fw, fh: o.fh || im.h, fps: o.fps || 8, bucle: true }; const a = pr.crear({ nombre: String(o.nombre || path.basename(String(o._[0]), '.png')), tipo: o.tipo || (o.fw ? 'hoja' : 'sprite'), im, origen: 'agregado: ' + path.basename(String(o._[0])), extra }); pr.guardar(); console.log('Agregado ' + a.id + ' ' + im.w + 'x' + im.h); } },
  textura: { ayuda: 'Imagen -> tile repetible en la paleta. textura <proyecto> <imagen.png|asset> --nombre n [--tiles 1] [--zona px] [--ox --oy] [--colores 4] [--semilla 7] [--contraste --brillo --saturacion --tono]',
    run(pr, o) { const src = o._[0], im = pr.P.assets[src] ? pr.img(src) : png.leer(String(src)), T = pr.P.estilo.tile, lado = T * (o.tiles || 1), z = Math.min(o.zona || Math.min(im.w, im.h), im.w, im.h), pal = pr.P.estilo.paleta;
      let r = PIX.crop(im, Math.min(o.ox || 0, im.w - z), Math.min(o.oy || 0, im.h - z), z, z); r = z > lado ? PIX.downscale(r, lado, lado, 'dominante') : z < lado ? PIX.resizeNearest(r, lado, lado) : r; for (let i = 3; i < r.d.length; i += 4) r.d[i] = 255;
      if (o.contraste || o.brillo || o.saturacion || o.tono) r = PIX.adjust(r, o); if (o.colores) r = PIX.reduceColors(r, o.colores); if (pal.length) r = PIX.quantize(r, pal); r = PIX.seamless(r, o.semilla || 7); if (pal.length) r = PIX.quantize(r, pal);
      const a = pr.crear({ nombre: String(o.nombre || 'textura'), tipo: 'textura', im: r, origen: 'textura de ' + path.basename(String(src)), extra: { tileset: { tile: T, forma: 'libre' } } }); pr.guardar(); console.log('Textura ' + a.id + ' ' + r.w + 'x' + r.h + ', ' + PIX.colors(r).length + ' colores'); } },
  transiciones: { ayuda: 'Textura -> tileset de 16 piezas de borde. transiciones <proyecto> --terreno <asset> [--base <asset>] [--irregular 55] [--borde 28] [--variantes 3] [--semilla 5] [--nombre n]',
    run(pr, o) { const t = pr.P.assets[o.terreno]; if (!t) throw new Error('Falta --terreno <asset de textura>'); const T = pr.P.estilo.tile, terr = pr.img(t.id), base = o.base ? pr.img(String(o.base)) : null, nv = o.variantes === undefined ? 3 : o.variantes;
      const at = PIX.wang16(terr, base, T, { irregular: (o.irregular === undefined ? 55 : o.irregular) / 100, borde: (o.borde === undefined ? 28 : o.borde) / 100, semilla: o.semilla || 5 }), piezas = PIX.slice(terr, T, T); let vars = piezas.slice(1, 1 + nv); if (vars.length < nv) vars = vars.concat(PIX.variants(piezas[0], nv - vars.length, (o.semilla || 5) + 11));
      let out = at; if (vars.length) { out = PIX.make(T * 4, T * (4 + Math.ceil(vars.length / 4))); PIX.blit(out, at, 0, 0, false); vars.forEach((v, i) => PIX.blit(out, v, (i % 4) * T, (4 + Math.floor(i / 4)) * T, false)); }
      const a = pr.crear({ nombre: String(o.nombre || 'ts_' + t.id + (o.base ? '_sobre_' + o.base : '')), tipo: 'tileset', im: out, origen: 'transiciones de ' + t.id, extra: { tileset: { tile: T, forma: 'wang16', variantes: vars.length, terreno: t.id, base: o.base || null } } }); pr.guardar(); console.log('Tileset ' + a.id + ' ' + out.w + 'x' + out.h); } },
  animar: { ayuda: 'Genera una animación desde un asset quieto. animar <proyecto> --asset id --tipo ' + Object.keys(PIX.ANIMS).join('|') + ' [--cuadros --fuerza --ondas --fijo --ancho] [--fps 8] [--nombre n] [--objeto id --mapa id]',
    run(pr, o) { const a = pr.P.assets[o.asset]; if (!a) throw new Error('Falta --asset'); if (!PIX.ANIMS[o.tipo]) throw new Error('Tipos: ' + Object.keys(PIX.ANIMS).join(', ')); const f = pr.cuadro(a, 0), base = a.cuadros ? PIX.crop(pr.img(a.id), f.x, f.y, f.w, f.h) : pr.img(a.id), params = {}; Object.keys(PIX.ANIMS[o.tipo].params).forEach(k => { if (o[k] !== undefined) params[k] = o[k]; });
      const frs = PIX.animate(base, o.tipo, Object.assign({}, params, { paleta: pr.P.estilo.paleta })), fw = Math.max(...frs.map(x => x.w)), fh = Math.max(...frs.map(x => x.h));
      const n = pr.crear({ nombre: String(o.nombre || a.nombre + '_' + o.tipo), tipo: 'hoja', im: PIX.pack(frs, frs.length), origen: 'animación ' + o.tipo + ' de ' + a.id, extra: { base: a.id, col: a.col, receta: { tipo: o.tipo, params }, cuadros: { fw, fh, fps: o.fps || 8, bucle: !['aparecer', 'golpe', 'humo', 'sacudir'].includes(o.tipo), oy: PIX.animBase(o.tipo, params) } } });
      if (o.objeto && o.mapa) { const m = pr.P.mapas[o.mapa]; pr.objetos(m).forEach(ob => { if (ob.id === o.objeto || (o.iguales && ob.asset === a.id)) { ob.asset = n.id; delete ob.clave; delete ob.anim; if (ob.marca) ob.marca.estado = 'hecha'; } }); }
      pr.guardar(); console.log('Animación ' + n.id + ': ' + frs.length + ' cuadros de ' + fw + 'x' + fh); } },
  alinear: { ayuda: 'Alinea los cuadros de una hoja. alinear <proyecto> --asset id [--modo pies|centro]', run(pr, o) { const a = pr.P.assets[o.asset]; if (!a || !a.cuadros) throw new Error('--asset tiene que ser una hoja con cuadros'); const frs = PIX.slice(pr.img(a.id), a.cuadros.fw, a.cuadros.fh), antes = PIX.frameJitter(frs), r = PIX.alignFrames(frs, o.modo || 'pies'); pr.poner(a.id, PIX.pack(r, r.length)); pr.guardar(); console.log(a.id + ': se corría ' + antes + ' px, ahora ' + PIX.frameJitter(r)); } },
  gif: { ayuda: 'GIF de una hoja. gif <proyecto> --asset id --salida archivo.gif [--escala 4]', run(pr, o) { const a = pr.P.assets[o.asset]; if (!a || !a.cuadros) throw new Error('--asset tiene que ser una hoja con cuadros'); let frs = PIX.slice(pr.img(a.id), a.cuadros.fw, a.cuadros.fh); if (a.cuadros.orden) frs = a.cuadros.orden.map(i => frs[i]); if (a.cuadros.vaiven && frs.length > 2) frs = frs.concat(frs.slice(1, -1).reverse()); const sal = String(o.salida || a.id + '.gif'); fs.writeFileSync(sal, Buffer.from(GIF(frs, { fps: a.cuadros.fps || 8, escala: o.escala || 4 }))); console.log(sal + ' (' + frs.length + ' cuadros)'); } },
  lamina: { ayuda: 'Todos los assets lado a lado. lamina <proyecto> --salida lamina.png [--escala 2] [--ancho 1400] [--fondo #4c7a3a]', run(pr, o) { const esc = o.escala || 2, W = o.ancho || 1400, pad = 10, as = pr.assets(a => a.tipo !== 'fondo').sort((a, b) => a.nombre.localeCompare(b.nombre)), pos = []; let x = pad, y = pad, fila = 0;
    as.forEach(a => { const f = pr.cuadro(a, 0), w = f.w * esc, h = f.h * esc; if (x + w + pad > W && x > pad) { x = pad; y += fila + pad; fila = 0; } pos.push({ a, f, x, y }); x += w + pad; fila = Math.max(fila, h); });
    const out = PIX.make(W, y + fila + pad), bg = PIX.hex2rgb(String(o.fondo || pr.P.estilo.paleta[8] || '#4c7a3a')); for (let i = 0; i < out.d.length; i += 4) { out.d[i] = bg[0]; out.d[i + 1] = bg[1]; out.d[i + 2] = bg[2]; out.d[i + 3] = 255; }
    pos.forEach(p => { let im; try { im = pr.img(p.a.id); } catch (e) { return; } const c = PIX.crop(im, p.f.x, p.f.y, p.f.w, p.f.h); PIX.blit(out, PIX.resizeNearest(c, c.w * esc, c.h * esc), p.x, p.y, true); }); const sal = String(o.salida || 'lamina.png'); png.escribir(sal, out); console.log(sal + ' ' + out.w + 'x' + out.h + ' con ' + pos.length + ' assets'); } },
  npc: { ayuda: 'NPC. --lista | --importar archivo.json (uno, varios o {npcs}) | --probar <id> "texto"', run(pr, o) {
    if (o.importar) { const j = JSON.parse(fs.readFileSync(String(o.importar), 'utf8')), ls = Array.isArray(j) ? j : j.npcs ? Object.values(j.npcs) : [j]; ls.forEach(n => { n.id = n.id || slug(n.nombre); (n.temas || []).forEach((t, i) => { t.id = t.id || slug(t.nombre || 'tema' + i); t.claves = t.claves || []; t.respuestas = t.respuestas || []; t.repetida = t.repetida || []; t.variantes = t.variantes || []; if (t.sugerir === undefined) t.sugerir = true; }); pr.P.npcs[n.id] = Object.assign({ oficio: '', caracter: '', sabe: '', oculta: '', retrato: null, saludo: [], despedida: [], escape: [], temas: [] }, pr.P.npcs[n.id] || {}, n); console.log('NPC ' + n.id + ': ' + (n.temas || []).length + ' temas'); }); pr.guardar(); return; }
    if (o.probar) { const n = pr.P.npcs[o.probar]; if (!n) throw new Error('No existe el NPC ' + o.probar); const est = {}; o._.forEach(t => { const r = DIAL.responder(n, String(t), est); console.log('> ' + t + '\n  ' + r.texto + '   [' + r.modo + (r.tema ? ': ' + r.tema : '') + ']'); }); return; }
    Object.values(pr.P.npcs).forEach(n => console.log(n.id + '  ' + n.nombre + ' (' + (n.oficio || '-') + ')  ' + (n.temas || []).length + ' temas, ' + (n.temas || []).reduce((s, t) => s + (t.respuestas || []).length, 0) + ' respuestas\n   carácter: ' + (n.caracter || '-') + '\n   sabe: ' + (n.sabe || '-') + '\n   oculta: ' + (n.oculta || '-'))); } },
  estilo: { ayuda: 'Muestra la guía de estilo (o cambia un valor: --tile 16 --contorno color --luz arriba-izquierda --maxColores 24)', run(pr, o) { let cambio = false; ['tile', 'contorno', 'luz', 'maxColores', 'perspectiva', 'colorContorno'].forEach(k => { if (o[k] !== undefined) { pr.P.estilo[k] = o[k]; cambio = true; } }); if (cambio) pr.guardar(); const e = Object.assign({}, pr.P.estilo); e.paleta = e.paleta.join(' '); console.log(JSON.stringify(e, null, 1)); } }
};

function main() {
  const [cmd, dir, ...resto] = process.argv.slice(2);
  if (!cmd || cmd === 'ayuda' || (!C[cmd] && cmd !== 'desempaquetar')) { console.log('Uso: node herramientas/ck.js <comando> <carpeta-del-proyecto> [opciones]\n'); Object.keys(C).forEach(k => console.log('  ' + k.padEnd(13) + C[k].ayuda)); console.log('  ' + 'desempaquetar'.padEnd(13) + 'desempaquetar <archivo.ckproj> [carpeta]: pasa un proyecto descargado del editor a carpeta con archivos'); process.exit(cmd && cmd !== 'ayuda' ? 1 : 0); }
  if (cmd === 'desempaquetar') { const j = JSON.parse(fs.readFileSync(dir, 'utf8')), imgs = j._imagenes || {}, sal = resto[0] || path.join('trabajo', slug(j.nombre)); delete j._imagenes; fs.mkdirSync(path.join(sal, 'assets'), { recursive: true }); Object.keys(imgs).forEach(id => fs.writeFileSync(path.join(sal, 'assets', id + '.png'), Buffer.from(imgs[id].split(',')[1], 'base64'))); fs.writeFileSync(path.join(sal, 'proyecto.json'), JSON.stringify(j, null, 1)); console.log('Proyecto "' + j.nombre + '" en ' + sal + ' (' + Object.keys(imgs).length + ' imágenes)'); return; }
  if (!dir) { console.error('Falta la carpeta del proyecto (por ejemplo: trabajo/castleknight)'); process.exit(1); }
  try { C[cmd].run(abrir(dir), opciones(resto)); } catch (e) { console.error('Error: ' + e.message); process.exit(1); }
}
if (require.main === module) main(); else module.exports = { abrir, revisar, notas, comandos: C };
