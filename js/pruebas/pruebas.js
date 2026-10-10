/* PRUEBAS DEL EDITOR: se abren con doble clic en pruebas.html (no hace falta instalar nada).
   Arman un proyecto de prueba en memoria (no se guarda ni en el navegador ni en disco), recorren todas las secciones
   y prueban lo más delicado: línea de tiempo, efectos, poses, transformar, contorno de FX, biblioteca, menús.
   Al terminar muestran la lista en verde / rojo y dejan el resumen en window.__resultado (lo usa la prueba automática). */
'use strict';
(function () {
  const lista = [], errores = [];
  const prueba = (nombre, fn) => lista.push({ nombre, fn });
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const ok = (cond, msg) => { if (!cond) throw new Error(msg || 'no se cumplió'); };
  const igual = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), (msg || 'distinto') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
  window.addEventListener('error', e => errores.push(e.message));
  window.addEventListener('unhandledrejection', e => errores.push(String(e.reason && e.reason.message || e.reason)));
  const opacos = id => { const im = CK.asset.pix(id); let n = 0; for (let i = 3; i < im.d.length; i += 4) if (im.d[i]) n++; return n; };
  const hoja = (n, col) => { const c = CK.lienzo(16 * n, 20), x = CK.ctx(c); for (let i = 0; i < n; i++) { x.fillStyle = col; x.fillRect(i * 16 + 4, 4 + i, 8, 12); x.fillStyle = '#000'; x.fillRect(i * 16 + 5, 16, 2, 4); x.fillRect(i * 16 + 9, 16 - (i % 2), 2, 4); } return c; };
  // ventanas: las pruebas contestan solas lo que pregunte el editor
  let respuesta = null; const ventana0 = CK.ventana, pedir0 = CK.pedir;
  CK.pedir = (t, r, v) => Promise.resolve(respuesta !== null ? respuesta : v);

  // ---------------------------------------------------------------- pruebas
  prueba('Proyecto de prueba en memoria', async () => {
    await CK.nuevo('__pruebas__');
    CK.asset.crear({ nombre: 'heroe camina', tipo: 'hoja', lienzo: hoja(4, '#c84'), cuadros: { fw: 16, fh: 20, fps: 6, bucle: true } });
    const r = CK.lienzo(20, 14), x = CK.ctx(r); x.fillStyle = '#888'; x.fillRect(2, 2, 16, 10); CK.asset.crear({ nombre: 'roca', tipo: 'sprite', lienzo: r });
    CK.P.fx.fuego = Object.assign(CK.clone(CKFx.plantillas.fuego), { id: 'fuego' });
    ok(CK.P.assets.heroe_camina && CK.P.assets.roca, 'no se crearon los assets');
  });
  prueba('Todas las secciones abren', async () => { for (const id of CK.orden) { CK.ir(id); await esperar(60); } ok(!errores.length, errores.join(' / ')); });
  prueba('Animar: duplicar, durar, mover y deshacer en la línea de tiempo', async () => {
    const M = CK._anim; CK.ir('anim', { asset: 'heroe_camina' }); await esperar(150);
    ok(document.querySelectorAll('.tl-cuadro').length === 4, 'la línea de tiempo no muestra 4 cuadros');
    M.st.selC = new Set([1]); M.ops.duplicar(); igual(CK.asset.nCuadros(CK.P.assets.heroe_camina), 5, 'duplicar');
    M.st.selC = new Set([0]); M.ops.duracion(333); igual(CK.P.assets.heroe_camina.cuadros.dur[0], 333, 'duración');
    M.st.selC = new Set([4]); M.ops.mover(0); igual(CK.P.assets.heroe_camina.cuadros.dur.slice(0, 2), [0, 333], 'mover');
    CK.hist.deshacer(); igual(CK.P.assets.heroe_camina.cuadros.dur[0], 333, 'deshacer mover');
    CK.hist.deshacer(); CK.hist.deshacer(); igual(CK.asset.nCuadros(CK.P.assets.heroe_camina), 4, 'deshacer todo');
  });
  prueba('Animar: efectos encima y "Guardar con los efectos"', async () => {
    const M = CK._anim; CK.P.assets.heroe_camina.fxPrueba = [{ tipo: 'fx', id: 'fuego', x: 8, y: 14, escala: 1, detras: false, desde: 0, repetir: true }];
    CK.ir('anim', { asset: 'heroe_camina' }); await esperar(300); respuesta = 'heroe_con_fuego'; await M.hornearConFx(); respuesta = null;
    const a = Object.values(CK.P.assets).find(x => x.nombre === 'heroe_con_fuego'); ok(a && CK.asset.nCuadros(a) === 4 && a.cuadros.fw > 16, 'no armó la hoja con el efecto');
  });
  prueba('Animar: leer nombres de sprites (acción, dirección, cuadro)', async () => {
    const L = CK._anim.leerNombre, r = n => { const x = L(n); return [x.acc, x.dir, x.num]; };
    igual(r('panadero_walk_sur_03.png'), ['caminar', 'abajo', 3]); igual(r('idle/norte/2.png'), ['quieto', 'arriba', 2]);
    igual(r('herrero-ataque-este-1.png'), ['atacar', 'derecha', 1]); igual(r('heroRunLeft07.png'), ['correr', 'izquierda', 7]);
    igual(r('raro.png'), [null, null, null]);
  });
  prueba('Pixel: transformar (girar y escalar) y deshacer', async () => {
    const M = CK._pixel; CK.ir('pixel', 'roca'); await esperar(150); const antes = opacos('roca');
    M.ponerHerr('transformar'); await esperar(50); ok(M.tr, 'no empezó la transformación');
    M.tr.ang = Math.PI / 6; M.tr.sx = M.tr.sy = 1.2; M.aplicarTr(); M.terminarTr(); M.soltarFlot();
    ok(opacos('roca') !== antes, 'la imagen no cambió'); CK.hist.deshacer(); igual(opacos('roca'), antes, 'deshacer');
    M.ponerHerr('lapiz');
  });
  prueba('Efectos: el contorno se dibuja con su color', async () => {
    const f = Object.assign(CK.clone(CKFx.plantillas.humo), { contorno: { grosor: 2, color: '#ff00ff' } }), s = CKFx.crear(f, { semilla: 3 }); for (let i = 0; i < 60; i++) s.paso(1 / 60);
    const c = CK.lienzo(120, 120), x = c.getContext('2d'); s.dibujar(x, 60, 90, null); const d = x.getImageData(0, 0, 120, 120).data; let m = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200) m++;
    ok(m > 20, 'casi no hay píxeles del color del contorno (' + m + ')');
  });
  prueba('Biblioteca: categorías y búsqueda', async () => {
    CK.ir('biblioteca'); await esperar(150); ok(document.querySelectorAll('.bib-tarjeta').length >= 4, 'faltan tarjetas');
    const b = document.querySelector('input[placeholder^="Buscar por nombre"]'); b.value = 'roca'; b.dispatchEvent(new Event('input')); await esperar(50);
    igual(document.querySelectorAll('.bib-tarjeta').length, 1, 'búsqueda'); b.value = ''; b.dispatchEvent(new Event('input'));
  });
  prueba('Menú de clic derecho: abre y se cierra con Esc', async () => {
    CK.menuAsset('roca', { clientX: 200, clientY: 200 }); await esperar(30); ok(document.querySelector('.menu-ctx'), 'no abrió');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await esperar(30); ok(!document.querySelector('.menu-ctx'), 'no se cerró');
  });
  prueba('GIF y JSON con la duración de cada cuadro', async () => {
    const fr = [{ w: 2, h: 2, d: new Uint8ClampedArray(16).fill(255) }, { w: 2, h: 2, d: new Uint8ClampedArray(16).fill(255) }], g = CKGif(fr, { fps: 10, delays: [500, 100] });
    let hall = []; for (let i = 0; i < g.length - 5; i++) if (g[i] === 0x21 && g[i + 1] === 0xF9) hall.push(g[i + 4] | (g[i + 5] << 8)); igual(hall, [50, 10], 'demoras del GIF');
    const a = CK.P.assets.heroe_camina; a.cuadros.dur = [400, 0, 0, 0]; const j = CK.animDatos(a); igual(Object.values(j.frames).map(f => f.duration), [400, 167, 167, 167], 'JSON'); delete a.cuadros.dur;
  });
  prueba('Marcar para animar: lo no pintado queda quieto', async () => {
    const im = PIX.make(10, 12); for (let y = 0; y < 12; y++) { PIX.set(im, 1, y, 120, 120, 120, 255); if (y < 5) for (let x = 2; x < 9; x++) PIX.set(im, x, y, 200, 40, 40, 255); }
    const m = new Uint8Array(120); for (let y = 0; y < 5; y++) for (let x = 2; x < 9; x++) m[y * 10 + x] = 1;
    const z = CK.marcaAnim.guardar(m, 10, 12); igual(CK.marcaAnim.leer({ mascara: z }, 10, 12).join(''), m.join(''), 'la zona no se guarda bien');
    const fr = PIX.animate(im, 'flotar', { fuerza: 2, mascara: m }), oy = fr[0].h - 12; let mastil = 0, tela = 0;
    fr.forEach(f => { for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) { const a = f.d[((y + oy) * f.w + x) * 4 + 3] > 0, b = im.d[(y * 10 + x) * 4 + 3] > 0; if (a !== b) x < 2 ? mastil++ : tela++; } });
    ok(!mastil, 'se movió lo que no estaba pintado'); ok(tela > 0, 'no se movió lo pintado');
  });
  prueba('Tiles: girar, mover, duplicar, borrar y lo pintado se acomoda', async () => {
    const T = CK.P.estilo.tile, c = CK.lienzo(T * 3, T), x = CK.ctx(c); ['#c33', '#3c3', '#33c'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * T, 0, T, T); });
    const a = CK.asset.crear({ nombre: 'ts prueba', tipo: 'tileset', lienzo: c, tileset: { tile: T, forma: 'libre', n: 3 } });
    const m = CK.mapa.crear('mapa tiles', T * 4, T * 2), cp = CK.mapa.nuevaCapa('tiles', 'Tiles'); cp.tileset = a.id; m.capas.push(cp);
    const X = CK.mapa.TXF; cp.datos = [1, 2, 3 | X.rot, 0, 0, 0, 0, 0].join(',');
    const leer = () => CK.P.mapas[m.id].capas.find(k => k.id === cp.id).datos.split(',').flatMap(t => { const [v, n] = t.split('x'); return Array(+(n || 1)).fill(+v); });
    CK.tiles.ops.mover(a.id, [2], -1); igual(leer().slice(0, 3), [1, 3, 2 | X.rot], 'mover');
    CK.tiles.ops.duplicar(a.id, [0]); ok(CK.tiles.cuenta(CK.P.assets[a.id]) === 4, 'duplicar no sumó');
    CK.tiles.ops.borrar(a.id, [0]); igual(leer().slice(0, 3), [0, 2, 1 | X.rot], 'borrar');
    ok(CK.tiles.ops.repetidas(a.id) === 0, 'la copia del rojo no debería repetirse (ya no está el original)');
    CK.hist.deshacer(); CK.hist.deshacer(); CK.hist.deshacer(); igual(leer().slice(0, 3), [1, 2, 3 | X.rot], 'deshacer no volvió');
    igual(CK.mapa.xfGirar(CK.mapa.xfGirar(0)), X.fx | X.fy, 'girar 180° = espejo doble');
  });
  prueba('Secciones: volver atrás y ventana aparte en una mitad', async () => {
    CK.ir('pixel'); await esperar(60); CK.ir('fx'); await esperar(60); CK.volver(); await esperar(60);
    ok(CK.seccion_actual === 'pixel', 'volver no regresó a Pixel (' + CK.seccion_actual + ')');
    CK.flotar('fx'); await esperar(120); ok(CK.flotantes.has('fx') && document.querySelector('.vsec'), 'no se abrió la ventana');
    document.querySelectorAll('.vsec .vsec-barra .btn')[2].click(); await esperar(120);
    ok(document.getElementById('contenido').style.marginRight === '50vw', 'no quedó en la mitad derecha');
    CK.ir('mapa'); await esperar(80); ok(CK.seccionVisible('fx') && CK.seccionVisible('mapa'), 'no se ven las dos secciones a la vez');
    CK.pegarSeccion('fx'); await esperar(120); ok(!CK.flotantes.size && !document.querySelector('.vsec') && !document.getElementById('contenido').style.marginRight, 'no volvió a pegarse');
  });
  prueba('Sin errores en la consola', async () => { ok(!errores.length, errores.join(' / ')); });

  // ---------------------------------------------------------------- correr y mostrar
  const correr = async () => {
    CK.guardar = async () => true; CK.fs.dir = () => null;                 // nada se guarda: ni navegador ni disco
    const caja = CK.h('div#pruebas', { style: { position: 'fixed', right: '12px', bottom: '36px', width: '420px', maxHeight: '70vh', overflow: 'auto', zIndex: 900, background: 'var(--panel2)', border: '1px solid var(--linea2)', borderRadius: '10px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,.5)', font: '13px var(--fuente)' } }, CK.h('b', 'Pruebas del editor…'));
    document.body.append(caja); const res = [];
    for (const t of lista) {
      const fila = CK.h('div', { style: { padding: '3px 0' } }, '… ' + t.nombre); caja.append(fila);
      try { await t.fn(); res.push({ nombre: t.nombre, ok: true }); fila.textContent = '✔ ' + t.nombre; fila.style.color = 'var(--verde)'; }
      catch (e) { res.push({ nombre: t.nombre, ok: false, error: e.message }); fila.textContent = '✘ ' + t.nombre + ' — ' + e.message; fila.style.color = 'var(--rojo)'; console.error('Prueba fallida:', t.nombre, e); }
      await esperar(20);
    }
    const mal = res.filter(r => !r.ok).length; caja.firstChild.textContent = mal ? mal + ' prueba(s) fallaron de ' + res.length : 'Todo bien: ' + res.length + ' pruebas';
    caja.firstChild.style.color = mal ? 'var(--rojo)' : 'var(--verde)'; window.__resultado = { total: res.length, fallas: mal, res };
  };
  window.addEventListener('load', () => setTimeout(correr, 800));
})();
