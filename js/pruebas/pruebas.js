/* PRUEBAS DEL EDITOR: se abren con doble clic en pruebas.html (no hace falta instalar nada).
   Arman un proyecto de prueba en memoria (no se guarda ni en el navegador ni en disco), recorren todas las secciones
   y prueban lo más delicado: línea de tiempo, efectos, poses, transformar, contorno de FX, biblioteca, menús.
   Al terminar muestran la lista en verde / rojo y dejan el resumen en window.__resultado (lo usa la prueba automática). */
'use strict';
(function () {
  const lista = [],
    errores = [];
  const prueba = (nombre, fn) => lista.push({ nombre, fn });
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const ok = (cond, msg) => {
    if (!cond) throw new Error(msg || 'no se cumplió');
  };
  const igual = (a, b, msg) =>
    ok(JSON.stringify(a) === JSON.stringify(b), (msg || 'distinto') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
  window.addEventListener('error', e => errores.push(e.message));
  window.addEventListener('unhandledrejection', e => errores.push(String((e.reason && e.reason.message) || e.reason)));
  const opacos = id => {
    const im = CK.asset.pix(id);
    let n = 0;
    for (let i = 3; i < im.d.length; i += 4) if (im.d[i]) n++;
    return n;
  };
  const hoja = (n, col) => {
    const c = CK.lienzo(16 * n, 20),
      x = CK.ctx(c);
    for (let i = 0; i < n; i++) {
      x.fillStyle = col;
      x.fillRect(i * 16 + 4, 4 + i, 8, 12);
      x.fillStyle = '#000';
      x.fillRect(i * 16 + 5, 16, 2, 4);
      x.fillRect(i * 16 + 9, 16 - (i % 2), 2, 4);
    }
    return c;
  };
  // ventanas: las pruebas contestan solas lo que pregunte el editor
  let respuesta = null;
  const ventana0 = CK.ventana,
    pedir0 = CK.pedir;
  CK.pedir = (t, r, v) => Promise.resolve(respuesta !== null ? respuesta : v);
  // las pruebas cambian de sección todo el tiempo: sin la pregunta de "cambios sin aplicar" (una prueba la prende a propósito)
  const prendido0 = CK.aplicar && CK.aplicar.prendido;
  if (CK.aplicar) CK.aplicar.prendido = () => false;

  // ---------------------------------------------------------------- pruebas
  prueba('Proyecto de prueba en memoria', async () => {
    await CK.nuevo('__pruebas__');
    CK.asset.crear({ nombre: 'heroe camina', tipo: 'hoja', lienzo: hoja(4, '#c84'), cuadros: { fw: 16, fh: 20, fps: 6, bucle: true } });
    const r = CK.lienzo(20, 14),
      x = CK.ctx(r);
    x.fillStyle = '#888';
    x.fillRect(2, 2, 16, 10);
    CK.asset.crear({ nombre: 'roca', tipo: 'sprite', lienzo: r });
    CK.P.fx.fuego = Object.assign(CK.clone(CKFx.plantillas.fuego), { id: 'fuego' });
    ok(CK.P.assets.heroe_camina && CK.P.assets.roca, 'no se crearon los assets');
  });
  prueba('Todas las secciones abren', async () => {
    for (const id of CK.orden) {
      CK.ir(id);
      await esperar(60);
    }
    ok(!errores.length, errores.join(' / '));
  });
  prueba('Animar: duplicar, durar, mover y deshacer en la línea de tiempo', async () => {
    const M = CK._anim;
    CK.ir('anim', { asset: 'heroe_camina' });
    await esperar(150);
    ok(document.querySelectorAll('.tl-cuadro').length === 4, 'la línea de tiempo no muestra 4 cuadros');
    M.st.selC = new Set([1]);
    M.ops.duplicar();
    igual(CK.asset.nCuadros(CK.P.assets.heroe_camina), 5, 'duplicar');
    M.st.selC = new Set([0]);
    M.ops.duracion(333);
    igual(CK.P.assets.heroe_camina.cuadros.dur[0], 333, 'duración');
    M.st.selC = new Set([4]);
    M.ops.mover(0);
    igual(CK.P.assets.heroe_camina.cuadros.dur.slice(0, 2), [0, 333], 'mover');
    CK.hist.deshacer();
    igual(CK.P.assets.heroe_camina.cuadros.dur[0], 333, 'deshacer mover');
    CK.hist.deshacer();
    CK.hist.deshacer();
    igual(CK.asset.nCuadros(CK.P.assets.heroe_camina), 4, 'deshacer todo');
  });
  prueba('Animar: eventos por cuadro viajan con el cuadro y salen en la exportación', async () => {
    const M = CK._anim,
      A = () => CK.P.assets.heroe_camina;
    CK.ir('anim', { asset: 'heroe_camina' });
    await esperar(120);
    M.editarHoja('Eventos', f => {
      f[1].ev = [{ t: 'golpe' }, { t: 'sonido', n: 'sword_swing1', v: 0.5 }];
    });
    igual(
      A().cuadros.ev[1].map(e => e.t),
      ['golpe', 'sonido'],
      'no se guardaron'
    );
    await esperar(50);
    ok(document.querySelector('.tl-cuadro[data-i="1"] .tl-ev'), 'la línea de tiempo no muestra el evento');
    M.st.selC = new Set([1]);
    M.ops.mover(4);
    ok(
      !A().cuadros.ev[1] && A().cuadros.ev[3] && A().cuadros.ev[3][0].t === 'golpe',
      'el evento no se movió con el cuadro: ' + JSON.stringify(A().cuadros.ev)
    );
    const pk = CK.juego.paquete();
    ok(pk.datos.eventos && Object.values(pk.datos.eventos)[0][3][0].t === 'golpe', 'no sale en la exportación');
    CK.hist.deshacer();
    CK.hist.deshacer();
    ok(!A().cuadros.ev, 'deshacer no los sacó');
  });
  prueba('Animar: efectos encima y "Guardar con los efectos"', async () => {
    const M = CK._anim;
    CK.P.assets.heroe_camina.fxPrueba = [{ tipo: 'fx', id: 'fuego', x: 8, y: 14, escala: 1, detras: false, desde: 0, repetir: true }];
    CK.ir('anim', { asset: 'heroe_camina' });
    await esperar(300);
    respuesta = 'heroe_con_fuego';
    await M.hornearConFx();
    respuesta = null;
    const a = Object.values(CK.P.assets).find(x => x.nombre === 'heroe_con_fuego');
    ok(a && CK.asset.nCuadros(a) === 4 && a.cuadros.fw > 16, 'no armó la hoja con el efecto');
  });
  prueba('Animar: leer nombres de sprites (acción, dirección, cuadro)', async () => {
    const L = CK._anim.leerNombre,
      r = n => {
        const x = L(n);
        return [x.acc, x.dir, x.num];
      };
    igual(r('panadero_walk_sur_03.png'), ['caminar', 'abajo', 3]);
    igual(r('idle/norte/2.png'), ['quieto', 'arriba', 2]);
    igual(r('herrero-ataque-este-1.png'), ['atacar', 'derecha', 1]);
    igual(r('heroRunLeft07.png'), ['correr', 'izquierda', 7]);
    igual(r('raro.png'), [null, null, null]);
  });
  prueba('Pixel: transformar (girar y escalar) y deshacer', async () => {
    const M = CK._pixel;
    CK.ir('pixel', 'roca');
    await esperar(150);
    const antes = opacos('roca');
    M.ponerHerr('transformar');
    await esperar(50);
    ok(M.tr, 'no empezó la transformación');
    M.tr.ang = Math.PI / 6;
    M.tr.sx = M.tr.sy = 1.2;
    M.aplicarTr();
    M.terminarTr();
    M.soltarFlot();
    ok(opacos('roca') !== antes, 'la imagen no cambió');
    CK.hist.deshacer();
    igual(opacos('roca'), antes, 'deshacer');
    M.ponerHerr('lapiz');
  });
  prueba('Efectos: el contorno se dibuja con su color', async () => {
    const f = Object.assign(CK.clone(CKFx.plantillas.humo), { contorno: { grosor: 2, color: '#ff00ff' } }),
      s = CKFx.crear(f, { semilla: 3 });
    for (let i = 0; i < 60; i++) s.paso(1 / 60);
    const c = CK.lienzo(120, 120),
      x = c.getContext('2d');
    s.dibujar(x, 60, 90, null);
    const d = x.getImageData(0, 0, 120, 120).data;
    let m = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200) m++;
    ok(m > 20, 'casi no hay píxeles del color del contorno (' + m + ')');
  });
  prueba('Biblioteca: categorías y búsqueda', async () => {
    CK.ir('biblioteca');
    await esperar(150);
    ok(document.querySelectorAll('.bib-tarjeta').length >= 4, 'faltan tarjetas');
    const b = document.querySelector('input[placeholder^="Buscar por nombre"]');
    b.value = 'roca';
    b.dispatchEvent(new Event('input'));
    await esperar(50);
    igual(document.querySelectorAll('.bib-tarjeta').length, 1, 'búsqueda');
    b.value = '';
    b.dispatchEvent(new Event('input'));
  });
  prueba('Menú de clic derecho: abre y se cierra con Esc', async () => {
    CK.menuAsset('roca', { clientX: 200, clientY: 200 });
    await esperar(30);
    ok(document.querySelector('.menu-ctx'), 'no abrió');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await esperar(30);
    ok(!document.querySelector('.menu-ctx'), 'no se cerró');
  });
  prueba('GIF y JSON con la duración de cada cuadro', async () => {
    const fr = [
        { w: 2, h: 2, d: new Uint8ClampedArray(16).fill(255) },
        { w: 2, h: 2, d: new Uint8ClampedArray(16).fill(255) }
      ],
      g = CKGif(fr, { fps: 10, delays: [500, 100] });
    let hall = [];
    for (let i = 0; i < g.length - 5; i++) if (g[i] === 0x21 && g[i + 1] === 0xf9) hall.push(g[i + 4] | (g[i + 5] << 8));
    igual(hall, [50, 10], 'demoras del GIF');
    const a = CK.P.assets.heroe_camina;
    a.cuadros.dur = [400, 0, 0, 0];
    const j = CK.animDatos(a);
    igual(
      Object.values(j.frames).map(f => f.duration),
      [400, 167, 167, 167],
      'JSON'
    );
    delete a.cuadros.dur;
  });
  prueba('Marcar para animar: lo no pintado queda quieto', async () => {
    const im = PIX.make(10, 12);
    for (let y = 0; y < 12; y++) {
      PIX.set(im, 1, y, 120, 120, 120, 255);
      if (y < 5) for (let x = 2; x < 9; x++) PIX.set(im, x, y, 200, 40, 40, 255);
    }
    const m = new Uint8Array(120);
    for (let y = 0; y < 5; y++) for (let x = 2; x < 9; x++) m[y * 10 + x] = 1;
    const z = CK.marcaAnim.guardar(m, 10, 12);
    igual(CK.marcaAnim.leer({ mascara: z }, 10, 12).join(''), m.join(''), 'la zona no se guarda bien');
    const fr = PIX.animate(im, 'flotar', { fuerza: 2, mascara: m }),
      oy = fr[0].h - 12;
    let mastil = 0,
      tela = 0;
    fr.forEach(f => {
      for (let y = 0; y < 12; y++)
        for (let x = 0; x < 10; x++) {
          const a = f.d[((y + oy) * f.w + x) * 4 + 3] > 0,
            b = im.d[(y * 10 + x) * 4 + 3] > 0;
          if (a !== b) x < 2 ? mastil++ : tela++;
        }
    });
    ok(!mastil, 'se movió lo que no estaba pintado');
    ok(tela > 0, 'no se movió lo pintado');
  });
  prueba('Tiles: girar, mover, duplicar, borrar y lo pintado se acomoda', async () => {
    const T = CK.P.estilo.tile,
      c = CK.lienzo(T * 3, T),
      x = CK.ctx(c);
    ['#c33', '#3c3', '#33c'].forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(i * T, 0, T, T);
    });
    const a = CK.asset.crear({ nombre: 'ts prueba', tipo: 'tileset', lienzo: c, tileset: { tile: T, forma: 'libre', n: 3 } });
    const m = CK.mapa.crear('mapa tiles', T * 4, T * 2),
      cp = CK.mapa.nuevaCapa('tiles', 'Tiles');
    cp.tileset = a.id;
    m.capas.push(cp);
    const X = CK.mapa.TXF;
    cp.datos = [1, 2, 3 | X.rot, 0, 0, 0, 0, 0].join(',');
    const leer = () =>
      CK.P.mapas[m.id].capas
        .find(k => k.id === cp.id)
        .datos.split(',')
        .flatMap(t => {
          const [v, n] = t.split('x');
          return Array(+(n || 1)).fill(+v);
        });
    CK.tiles.ops.mover(a.id, [2], -1);
    igual(leer().slice(0, 3), [1, 3, 2 | X.rot], 'mover');
    CK.tiles.ops.duplicar(a.id, [0]);
    ok(CK.tiles.cuenta(CK.P.assets[a.id]) === 4, 'duplicar no sumó');
    CK.tiles.ops.borrar(a.id, [0]);
    igual(leer().slice(0, 3), [0, 2, 1 | X.rot], 'borrar');
    ok(CK.tiles.ops.repetidas(a.id) === 0, 'la copia del rojo no debería repetirse (ya no está el original)');
    CK.hist.deshacer();
    CK.hist.deshacer();
    CK.hist.deshacer();
    igual(leer().slice(0, 3), [1, 2, 3 | X.rot], 'deshacer no volvió');
    igual(CK.mapa.xfGirar(CK.mapa.xfGirar(0)), X.fx | X.fy, 'girar 180° = espejo doble');
  });
  prueba('Secciones: volver atrás y ventana aparte en una mitad', async () => {
    CK.ir('pixel');
    await esperar(60);
    CK.ir('fx');
    await esperar(60);
    CK.volver();
    await esperar(60);
    ok(CK.seccion_actual === 'pixel', 'volver no regresó a Pixel (' + CK.seccion_actual + ')');
    CK.flotar('fx');
    await esperar(120);
    ok(CK.flotantes.has('fx') && document.querySelector('.vsec'), 'no se abrió la ventana');
    document.querySelectorAll('.vsec .vsec-barra .btn')[2].click();
    await esperar(120);
    ok(document.getElementById('contenido').style.marginRight === '50vw', 'no quedó en la mitad derecha');
    CK.ir('mapa');
    await esperar(80);
    ok(CK.seccionVisible('fx') && CK.seccionVisible('mapa'), 'no se ven las dos secciones a la vez');
    CK.pegarSeccion('fx');
    await esperar(120);
    ok(
      !CK.flotantes.size && !document.querySelector('.vsec') && !document.getElementById('contenido').style.marginRight,
      'no volvió a pegarse'
    );
  });
  // ---------------------------------------------------------------- interfaz
  prueba('Interfaz: modo simple esconde lo avanzado, tamaño y cursores', async () => {
    CK.ir('pixel');
    await esperar(80);
    CK.temaUI.poner({ simple: true });
    const av = document.querySelector('[data-seccion=pixel] .herr-btn.avanzado');
    ok(av && getComputedStyle(av).display === 'none', 'en modo simple se ve una herramienta avanzada');
    CK.temaUI.poner({ simple: false, tam: 1.25 });
    ok(getComputedStyle(av).display !== 'none', 'en modo completo no volvió');
    igual(document.documentElement.style.zoom, '1.25', 'tamaño');
    CK.temaUI.poner({ tam: 1, cursores: true });
    ok(/var\(--cur-lapiz\)/.test(CK.cur('crosshair', 'lapiz')), 'cursor del lápiz');
    igual(CK.cur('nwse-resize'), 'nwse-resize', 'los cursores de estirar quedan como siempre');
  });
  prueba('Secciones hermanas: Convertir dentro de la pestaña Texturas', async () => {
    CK.ir('convertir');
    await esperar(60);
    ok(document.querySelector('.riel-btn.activo').dataset.id === 'texturas', 'la pestaña Texturas no quedó marcada');
    ok(document.querySelector('.riel-sub.ver button.activo').dataset.id === 'convertir', 'el botoncito de Convertir no está marcado');
    CK.ir('mapa');
    await esperar(40);
    document.querySelector('.riel-btn[data-id=texturas]').click();
    await esperar(60);
    igual(CK.seccion_actual, 'convertir', 'la pestaña no recordó la hermana');
  });
  prueba('Buscador (Ctrl + K): encuentra assets, secciones y recetas', async () => {
    ok(
      CK.buscador.buscar('roca').some(r => r.tipo === 'Asset'),
      'no encontró el asset'
    );
    ok(
      CK.buscador.buscar('efect').some(r => r.tipo === 'Sección'),
      'no encontró la sección'
    );
    ok(
      CK.buscador.buscar('bandera').some(r => r.tipo === '¿Cómo hago…?'),
      'no encontró la receta'
    );
    CK.buscador.abrir();
    await esperar(40);
    ok(document.querySelector('.busc-caja'), 'no abrió');
    CK.buscador.cerrar();
    ok(!document.querySelector('.busc-caja'), 'no cerró');
  });
  prueba('Historial: volver a cualquier paso con un clic', async () => {
    const a = CK.P.assets.roca,
      n0 = a.nombre,
      base = CK.hist.pos;
    for (let i = 1; i <= 3; i++) {
      const f = CK.hist.datos('Nombre ' + i, 'assets', 'roca');
      a.nombre = 'r' + i;
      f();
    }
    CK.irAlPaso(base + 1);
    igual(CK.P.assets.roca.nombre, 'r1', 'ir al paso 1');
    CK.irAlPaso(base + 3);
    igual(CK.P.assets.roca.nombre, 'r3', 'adelantarse');
    CK.irAlPaso(base);
    igual(CK.P.assets.roca.nombre, n0, 'volver al principio');
  });
  prueba('Atajos (?): muestra los de la sección donde estás', async () => {
    CK.ir('pixel');
    await esperar(60);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    await esperar(60);
    const t = document.querySelector('.atajos-lista h3');
    ok(t && /Pixel/.test(t.textContent), 'no empieza por la sección');
    ok(document.querySelectorAll('.atajos-lista tr').length > 15, 'pocos atajos');
    document.querySelector('.ven-fondo .ventana').cerrar(null);
  });
  // ---------------------------------------------------------------- aprender
  prueba('Guía: recorrido de la sección y recetas "¿Cómo hago…?"', async () => {
    CK.ir('mapa');
    await esperar(80);
    CK.guia.recorrido('mapa', true);
    await esperar(60);
    ok(document.querySelector('.guia-globo'), 'no apareció el recorrido');
    CK.guia.cerrar();
    ok(!document.querySelector('.guia-globo'), 'no se cerró');
    ok(CK.guia.recetas().length >= 20, 'pocas recetas');
    CK.guia.abrirReceta('mapa_marca');
    await esperar(40);
    ok(document.querySelectorAll('ol.receta li').length === 3, 'la receta no tiene sus pasos');
    document.querySelector('.ven-fondo .ventana').cerrar(null);
  });
  prueba('Pantallas vacías que enseñan (Animar sin nada elegido)', async () => {
    const M = CK._anim,
      b0 = M.st.base;
    M.st.base = null;
    CK.ir('anim');
    M.tabs.ir('generar');
    await esperar(80);
    const v = document.querySelector('[data-seccion=anim] .vacio-sobre');
    ok(v && v.style.display !== 'none', 'no se ve la explicación');
    M.st.base = b0;
  });
  // ---------------------------------------------------------------- efectos
  prueba('FX: lo principal mueve varios valores juntos, Variar y deshacer', async () => {
    CK.ir('fx', 'fuego');
    await esperar(120);
    const e = () => CK.P.fx.fuego,
      t0 = e().capas[0].tasa,
      tam0 = JSON.stringify(e().capas[0].tam);
    const r = document.querySelectorAll('.fx-simple .fx-macro input');
    r[0].value = 200;
    r[0].dispatchEvent(new Event('input'));
    r[0].dispatchEvent(new Event('change'));
    await esperar(30);
    ok(Math.abs(e().capas[0].tasa - t0 * 2) < 0.01, 'la intensidad no duplicó las partículas');
    igual(JSON.stringify(e().capas[0].tam), tam0, 'la intensidad tocó el tamaño');
    ok(!('base' in CK.juego.paquete().datos.fx.fuego), 'los datos del control salen en la exportación');
    CK.hist.deshacer();
    ok(Math.abs(e().capas[0].tasa - t0) < 0.01, 'deshacer');
    ok(!e().macro, 'deshacer dejó los controles tocados');
    document.querySelector('.fx-simple .btn').click();
    await esperar(30);
    ok(document.querySelector('.fx-probadas'), 'Variar no guardó la versión anterior');
    CK.hist.deshacer();
  });
  prueba('Elegir con dibujos (forma y figura de las partículas)', async () => {
    CK.ir('fx', 'fuego');
    await esperar(80);
    const bs = document.querySelectorAll('.con-dibujos .con-dib');
    ok(bs.length >= 15, 'faltan opciones con dibujo');
    const fig0 = CK.P.fx.fuego.capas[0].figura,
      otro = [...document.querySelectorAll('.con-dibujos')][1].querySelector('.con-dib:not(.activo)');
    otro.click();
    await esperar(40);
    ok(CK.P.fx.fuego.capas[0].figura !== fig0, 'no cambió la figura');
    CK.hist.deshacer();
    igual(CK.P.fx.fuego.capas[0].figura, fig0, 'deshacer');
  });
  // ---------------------------------------------------------------- no perder trabajo
  prueba('Copias automáticas: hacer una y volver a ella', async () => {
    const a = CK.P.assets.roca,
      n0 = a.nombre;
    await CK.copias.hacer({ nota: 'prueba' });
    a.nombre = 'roca_cambiada';
    CK.tocar();
    const l = await CK.copias.lista();
    ok(l.length && l[0].nota === 'prueba', 'no quedó la copia');
    await CK.copias.volver(l[0].n);
    igual(CK.P.assets.roca.nombre, n0, 'no volvió');
    ok(CK.img.roca && CK.img.roca.width === 20, 'la imagen no volvió');
  });
  prueba('Deshacer liviano y firme: solo el rectángulo que cambió, y el objeto sigue siendo el mismo', async () => {
    const a = CK.lienzo(64, 64),
      b = CK.copiaLienzo(a);
    CK.ctx(b).fillRect(10, 20, 3, 2);
    const d = CK.difLienzo(a, b);
    ok(
      d && d.w === 3 && d.h === 2 && d.x === 10 && d.y === 20,
      'el rectángulo no es el justo: ' + JSON.stringify(d && { x: d.x, y: d.y, w: d.w, h: d.h })
    );
    const m = Object.values(CK.P.mapas)[0],
      capa = m.capas[0],
      f = CK.hist.datos('Prueba', 'mapas', m.id);
    m.nombre = 'otro nombre';
    f();
    CK.hist.deshacer();
    ok(CK.P.mapas[m.id] === m && m.capas[0] === capa, 'deshacer reemplazó el mapa por otro objeto');
    ok(m.nombre !== 'otro nombre', 'no deshizo');
  });
  prueba('Revisar antes de exportar: qué cambió desde la última vez', async () => {
    const pk = CK.juego.paquete();
    CK.P.ultimaExportacion = { t: Date.now(), firmas: CK.juego.firmas(pk) };
    igual(CK.juego.cambios(CK.juego.paquete()).cambiados.length, 0, 'sin cambios');
    CK.P.npcs.prueba_npc = { id: 'prueba_npc', nombre: 'Prueba', temas: [] };
    const c = CK.juego.cambios(CK.juego.paquete());
    delete CK.P.npcs.prueba_npc;
    ok(
      c.nuevos.some(k => k === 'npc:prueba_npc'),
      'no vio el NPC nuevo'
    );
    delete CK.P.ultimaExportacion;
  });
  // ---------------------------------------------------------------- rendimiento y tiles
  prueba('Mapa: redibujar solo lo que cambió da lo mismo que redibujar todo', async () => {
    const T = CK.P.estilo.tile,
      ts = CK.asset.crear({
        nombre: 'ts bordes prueba',
        tipo: 'tileset',
        lienzo: CK.aLienzo(PIX.wang16(PIX.make(T, T).d.fill(200) && PIX.make(T, T), null, T, { irregular: 0 })),
        tileset: { tile: T, forma: 'wang16', variantes: 0 }
      });
    const m = CK.mapa.crear('mapa parcial', T * 12, T * 10);
    m.capas[0].tileset = ts.id;
    CK.ir('mapa', m.id);
    CK.mapa.abrir(m.id);
    await esperar(80);
    const c = m.capas[0],
      r = CK.mapa.datosCapa(c),
      v = CK._vistas.find(x => x.c.closest('[data-seccion=mapa]')),
      x = v.c.getContext('2d');
    for (let k = 0; k < 5; k++) {
      r.arr[(3 + k) * r.gw + 4] = 1;
      r.zona = { i0: 3, j0: 2 + k, i1: 4, j1: 3 + k };
      x.save();
      v.o.pintar(x, v);
      x.restore();
    }
    const parcial = CK.copiaLienzo(r.lienzo);
    CK.mapa.invalidar(c.id);
    x.save();
    v.o.pintar(x, v);
    x.restore();
    const A = CK.ctx(parcial).getImageData(0, 0, parcial.width, parcial.height).data,
      B = CK.ctx(CK.mapa.datosCapa(c).lienzo).getImageData(0, 0, parcial.width, parcial.height).data;
    let dif = 0;
    for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) dif++;
    igual(dif, 0, 'píxeles distintos');
  });
  prueba('Bordes automáticos: adivinar las 16 piezas y armar desde RPG Maker', async () => {
    const T = 16,
      terr = PIX.make(T, T);
    for (let i = 0; i < T * T; i++) {
      terr.d[i * 4] = 140;
      terr.d[i * 4 + 3] = 255;
    }
    const ps = PIX.slice(PIX.wang16(terr, null, T, { irregular: 0, borde: 0 }), T, T),
      orden = [3, 0, 7, 12, 1, 9, 15, 4, 2, 11, 6, 13, 5, 8, 14, 10];
    const asig = CK.tiles.adivinar16(orden.map(i => ps[i]));
    let bien = 0;
    for (let i = 0; i < 15; i++) if (asig[i] >= 0 && orden[asig[i]] === i) bien++;
    igual(bien, 15, 'adivinadas');
    const rpg = CK.lienzo(32, 48),
      x = CK.ctx(rpg);
    for (let f = 0; f < 6; f++)
      for (let c = 0; c < 4; c++) {
        x.fillStyle = 'hsl(' + (f * 4 + c) * 15 + ',70%,50%)';
        x.fillRect(c * 8, f * 8, 8, 8);
      }
    const src = CK.aPix(rpg),
      out = CK.tiles.desdeRPGMaker(src, 16, 0, 0),
      col = (im, X, Y) => im.d.slice((Y * im.w + X) * 4, (Y * im.w + X) * 4 + 3).join();
    igual(col(out, 2, 2), col(src, 10, 26), 'pieza llena: cuarto interior');
    igual(col(out, 3 * 16 + 2, 3 * 16 + 2), '0,0,0', 'pieza vacía');
    igual(col(out, ((14 * 16) % 64) + 2, Math.floor(14 / 4) * 16 + 2), col(src, 26, 42), 'esquina exterior (solo arriba a la izquierda)');
  });
  prueba('Probar: arma la dirección con el mapa y sin caché', async () => {
    ok(!CK.secciones.jugar, 'la sección Jugar tendría que haberse ido');
    const u = CK.juego.direccionPrueba();
    ok(/ck_t=\d+/.test(u), 'falta la marca de tiempo');
    ok(/index\.html/.test(u), 'dirección rara: ' + u);
  });
  // ---------------------------------------------------------------- cada sección hace lo suyo
  prueba('NPC, Misiones y Notas: crear uno de cada', async () => {
    respuesta = 'Herrera de prueba';
    const n0 = Object.keys(CK.P.npcs).length;
    CK.ir('npc');
    await esperar(60);
    document.querySelector('[data-seccion=npc] .btn.pri').click();
    await esperar(80);
    igual(Object.keys(CK.P.npcs).length, n0 + 1, 'NPC');
    respuesta = 'Buscar la espada';
    const m0 = CK.P.misiones.length;
    CK.ir('misiones');
    await esperar(60);
    document.querySelector('[data-seccion=misiones] .btn.pri').click();
    await esperar(80);
    igual(CK.P.misiones.length, m0 + 1, 'misión');
    respuesta = null;
    CK.ir('notas');
    await esperar(60);
    const t = document.querySelector('[data-seccion=notas] textarea, [data-seccion=notas] input.in');
    t.value = 'Revisar la puerta';
    t.dispatchEvent(new Event('input'));
    const k0 = CK.P.notas.length;
    [...document.querySelectorAll('[data-seccion=notas] .btn')].find(b => /Agregar nota/.test(b.textContent)).click();
    await esperar(40);
    igual(CK.P.notas.length, k0 + 1, 'nota');
  });
  prueba('Estilo, Revisor, Interfaz, Portfolio y Convertir se dibujan', async () => {
    CK.ir('estilo');
    await esperar(60);
    ok(document.querySelectorAll('[data-seccion=estilo] .muestra').length >= CK.P.estilo.paleta.length, 'estilo: falta la paleta');
    ok(Array.isArray(CK.revisar()), 'revisor');
    CK.ir('revisor');
    await esperar(60);
    ok(document.querySelector('[data-seccion=revisor] h1'), 'revisor: sin título');
    CK.ir('interfaz');
    await esperar(80);
    ok(document.querySelector('[data-seccion=interfaz] canvas, [data-seccion=interfaz] .maqueta-ui'), 'interfaz: sin vista');
    CK.ir('portfolio');
    await esperar(80);
    ok(document.querySelector('[data-seccion=portfolio] canvas'), 'portfolio: sin lámina');
    CK.ir('convertir', 'roca');
    await esperar(200);
    ok(CK.convertir.st.fuente === 'roca', 'convertir: no tomó la referencia');
  });
  prueba('Proyecto de ejemplo: se arma completo', async () => {
    await CK.guia.proyectoEjemplo();
    await esperar(200);
    ok(
      Object.keys(CK.P.assets).length >= 8 && Object.keys(CK.P.mapas).length === 1 && CK.P.fx.fuego,
      'faltan cosas: ' + Object.keys(CK.P.assets).join(',')
    );
    const m = Object.values(CK.P.mapas)[0];
    ok(
      m.capas[1].objetos.some(o => o.marca),
      'falta la marca para animar'
    );
    igual(CK.seccion_actual, 'mapa', 'no abrió el mapa');
  });
  prueba('Luces: tipos, suavizado, escalones y exportar', async () => {
    const L = CK.luces,
      alfa = (o, dx, dy) => L.muestra(o, dx, dy)[0];
    const foco = { forma: 'foco', radio: 60, apertura: 40, dir: 0, suave: 30 };
    ok(alfa(foco, 30, 0) > 0.2 && alfa(foco, -30, 0) < 0.05, 'el foco tiene que alumbrar adelante y no atrás');
    const ani = { forma: 'anillo', radio: 40, grosor: 30 };
    ok(alfa(ani, 34, 0) > alfa(ani, 0, 0) + 0.3, 'el anillo tiene que ser más fuerte en el borde que en el centro');
    const duro = { forma: 'punto', radio: 40, suave: 2 },
      blando = { forma: 'punto', radio: 40, suave: 100 };
    ok(alfa(duro, 30, 0) > alfa(blando, 30, 0), 'el suavizado no cambia el borde');
    const esc = { forma: 'punto', radio: 40, escalones: 3, suave: 60 },
      vals = new Set();
    for (let d = 0; d < 40; d++) vals.add(alfa(esc, d, 0).toFixed(3));
    ok(vals.size <= 4, 'escalones: ' + vals.size + ' valores');
    const tira = { forma: 'linea', radio: 10, ancho: 60 };
    ok(alfa(tira, 25, 0) > 0.5 && alfa(tira, 0, 25) < 0.05, 'la tira sin dirección tiene que quedar acostada');
    // en el mapa: preset, deshacer, exportar
    const m = CK.mapa.actual(),
      c = m.capas.find(k => k.tipo === 'objetos'),
      o = { id: 'luz_prueba', tipo: 'luz', x: 50, y: 50, radio: 48, color: '#ffc46b', fuerza: 0.55, parpadeo: 1 };
    c.objetos.push(o);
    const f = CK.hist.datos('Tipo', 'mapas', m.id);
    L.aplicar(o, L.PRESETS.find(p => p.nombre === 'Linterna del héroe').p);
    f();
    igual([o.forma, o.sigue, o.mira], ['foco', 'heroe', true], 'preset');
    const ex = CK.juego.datosNuevo(m, new Set()).luces.find(l => l.x === 50 && l.y === 50);
    igual([ex.forma, ex.apertura, ex.sigue], ['foco', 45, 'heroe'], 'exportar');
    CK.hist.deshacer();
    ok(!CK.mapa.buscarObj('luz_prueba').forma, 'deshacer');
    const g = await L.guardar(o, 'Luz de prueba');
    ok(g && CK.P.luces[g.id], 'guardar luz');
  });
  prueba('Luces: el juego dibuja con el mismo código', async () => {
    if (location.protocol === 'file:') return; // abriendo el archivo directo el navegador no deja leer otro archivo
    const txt = await (await fetch('juego/editor_loader.js?t=' + Date.now())).text(),
      a = txt.indexOf('/*<luz-nucleo>*/'),
      b = txt.indexOf('/*</luz-nucleo>*/');
    ok(a > 0 && b > a, 'el cargador del juego no tiene las luces nuevas');
    const nuc = txt.slice(a, b);
    ok(
      nuc.includes('var LUZ') && nuc.replace(/\s+/g, '').includes(LUZ.muestra.toString().replace(/\s+/g, '')),
      'el núcleo de luces del juego es distinto al del editor'
    );
  });
  prueba('Mapa: poner de la biblioteca en un punto', async () => {
    CK.ir('mapa');
    await esperar(60);
    const m = CK.mapa.actual(),
      c = m.capas.find(k => k.tipo === 'objetos'),
      pt = { id: 'pt_prueba', tipo: 'punto', clase: 'efecto', nombre: '', x: 80, y: 60, props: {} };
    c.objetos.push(pt);
    CK.mapa.ponerDeBib({ tipo: 'fx', id: 'fuego' }, pt);
    igual(pt.props.fx, 'fuego', 'efecto');
    const n0 = c.objetos.length;
    CK.mapa.ponerDeBib({ tipo: 'asset', id: 'cofre' }, pt);
    igual(c.objetos.length, n0 + 1, 'asset');
    const nuevo = c.objetos[c.objetos.length - 1];
    igual([nuevo.asset, nuevo.x, nuevo.y], ['cofre', 80, 60], 'asset en el lugar');
    CK.mapa.ponerDeBib({ tipo: 'luz', p: CK.luces.PRESETS[0].p }, pt);
    const luz = c.objetos[c.objetos.length - 1];
    igual([luz.tipo, luz.forma, luz.x], ['luz', 'punto', 80], 'luz en el lugar');
    CK.hist.deshacer();
    ok(!c.objetos.some(x => x.id === luz.id), 'deshacer');
  });
  prueba('Biblioteca: Modificar, guardar como nuevo y descartar', async () => {
    const conf = CK.confirmar;
    CK.confirmar = async () => true;
    respuesta = 'cofre rojo';
    try {
      CK.edicion.empezar('assets', 'cofre');
      await esperar(80);
      igual(CK.seccion_actual, 'pixel', 'no abrió Pixel art');
      ok(document.querySelector('.edicion-barra'), 'falta la barra de edición');
      const x = CK.ctx(CK.img.cofre);
      x.fillStyle = '#ff0000';
      x.fillRect(0, 0, 2, 2);
      ok(CK.edicion.cambio(), 'no ve el cambio');
      await CK.edicion.comoNuevo();
      const n = Object.values(CK.P.assets).find(a => a.nombre === 'cofre rojo');
      ok(n, 'no creó el nuevo');
      igual([...CK.ctx(CK.img[n.id]).getImageData(0, 0, 1, 1).data], [255, 0, 0, 255], 'el nuevo no tiene el cambio');
      igual(CK.ctx(CK.img.cofre).getImageData(0, 0, 1, 1).data[3], 0, 'el original cambió');
      ok(!document.querySelector('.edicion-barra'), 'la barra quedó');
      CK.edicion.empezar('fx', 'fuego');
      await esperar(80);
      const d0 = CK.P.fx.fuego.dur;
      CK.P.fx.fuego.dur = 9;
      await CK.edicion.descartar();
      igual(CK.P.fx.fuego.dur, d0, 'descartar');
    } finally {
      CK.confirmar = conf;
      respuesta = null;
    }
  });
  prueba('Sugerencias: tamaños y vista previa en el mapa', async () => {
    const t = CK.sugerencias.tipos(),
      per = t.find(x => x.id === 'personaje'),
      tile = t.find(x => x.id === 'tile');
    igual(per.h, CK.P.estilo.altoHeroe || 30, 'alto del personaje');
    igual([tile.w, tile.h], [CK.P.estilo.tile, CK.P.estilo.tile], 'tile');
    const cv = CK.lienzo(200, 120);
    CK.sugerencias.escena(cv, { asset: 'arbol', esc: 2 });
    const d = CK.ctx(cv).getImageData(0, 0, 200, 120).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    ok(n > 200 * 120 * 0.9, 'la vista previa quedó vacía');
    CK.ir('pixel', 'arbol');
    await esperar(80);
    ok(
      [...document.querySelectorAll('[data-seccion=pixel] .pila-cab span, [data-seccion=pixel] .pest button')].some(
        e => e.textContent.trim() === 'Prueba'
      ),
      'falta la pestaña Prueba'
    );
  });
  prueba('FX: tocar el contorno no cierra el Ajuste fino', async () => {
    CK.temaUI.poner({ simple: true });
    try {
      CK.ir('fx', 'fuego');
      await esperar(120);
      const cab = [...document.querySelectorAll('[data-seccion=fx] .mo-cab')].find(b => b.textContent.includes('Ajuste fino'));
      cab.click();
      const chk = [...document.querySelectorAll('[data-seccion=fx] .chk')].find(c => c.textContent.includes('llevan contorno'));
      chk.querySelector('input').click();
      await esperar(80);
      ok(
        [...document.querySelectorAll('[data-seccion=fx] .mas-opciones')].some(m => m.classList.contains('abierto')),
        'se cerró el Ajuste fino'
      );
    } finally {
      CK.temaUI.poner({ simple: false });
    }
  });
  prueba('Mapa: el transform sigue al objeto girado', async () => {
    CK.ir('mapa');
    await esperar(60);
    const MP = CK.mapa,
      o = MP.objetosDe(MP.actual()).find(q => q.asset === 'cofre');
    Object.assign(o, { rot: 90, sx: 1, sy: 1 });
    MP.elegir([o.id]);
    MP.herr('seleccionar');
    const b = MP.cajaDe(o),
      // el asa derecha (e), girada 90°, queda abajo del pie
      ex = o.x + b.h / 2,
      ey = o.y + b.w / 2,
      v = MP.vista(),
      ev = (x, y) => ({ x, y, sx: x * v.z + v.tx, sy: y * v.z + v.ty, boton: 0 });
    const x0 = o.x,
      y0 = o.y;
    // el borde opuesto queda quieto: ancho 1,5 y el pie se corre un cuarto del ancho (hacia abajo, por el giro)
    MP.herramienta.bajar(ev(ex, ey));
    MP.herramienta.mover(ev(ex, o.y + b.w));
    MP.herramienta.subir(ev(ex, o.y + b.w));
    igual([o.sx, o.sy, o.rot], [1.5, 1, 90], 'escalar con el asa girada');
    ok(o.x === x0 && Math.abs(o.y - (y0 + b.w / 4)) <= 1, 'el borde opuesto se movió: ' + [o.x, o.y, x0, y0]);
    CK.hist.deshacer();
    igual([o.x, o.y, o.sx], [x0, y0, 1], 'deshacer');
    // con Ctrl escala desde el centro
    MP.herramienta.bajar(ev(ex, ey));
    MP.herramienta.mover(Object.assign(ev(ex, o.y + b.w), { ctrl: true }));
    MP.herramienta.subir(ev(ex, o.y + b.w));
    igual([o.sx, o.x, o.y], [2, x0, y0], 'con Ctrl, desde el centro');
    CK.hist.deshacer();
    Object.assign(o, { rot: 0, sx: 1, sy: 1 });
  });
  prueba('Mapa: colisiones ancladas al objeto', async () => {
    const MP = CK.mapa,
      m = MP.actual(),
      o = MP.objetosDe(m).find(q => q.asset === 'roca'),
      k = { id: 'k_prueba', x: o.x - 6, y: o.y - 6, w: 12, h: 6 };
    MP.anclarCol(k, o);
    m.colisiones = (m.colisiones || []).concat(k);
    o.x += 40;
    MP.sincronizarCols(m);
    igual([k.x, k.y, k.w], [o.x - 6, o.y - 6, 12], 'no siguió al objeto');
    o.sx = 2;
    o.flipX = true;
    MP.sincronizarCols(m);
    igual([k.x, k.w], [o.x - 12, 24], 'espejo y escala');
    const exp = CK.juego.datosNuevo ? null : null;
    MP.desanclarCol(k);
    o.x += 10;
    MP.sincronizarCols(m);
    igual(k.x, o.x - 10 - 12, 'desanclada tendría que quedarse');
    // borrar el objeto borra sus colisiones ancladas
    MP.anclarCol(k, o);
    MP.elegir([o.id]);
    MP.borrarSel();
    ok(!(m.colisiones || []).some(q => q.id === 'k_prueba'), 'la colisión anclada quedó');
    CK.hist.deshacer();
    ok(
      m.colisiones.some(q => q.id === 'k_prueba' && q.ancla === o.id),
      'deshacer no la devolvió anclada'
    );
    Object.assign(o, { sx: 1, flipX: false });
  });
  prueba('Mapa: asas de la luz en el lienzo', async () => {
    const MP = CK.mapa,
      m = MP.actual(),
      c = m.capas.find(q => q.tipo === 'objetos'),
      v = MP.vista(),
      ev = (x, y) => ({ x, y, sx: x * v.z + v.tx, sy: y * v.z + v.ty, boton: 0 });
    c.objetos.push({
      id: 'luz_asas',
      tipo: 'luz',
      x: 200,
      y: 120,
      radio: 60,
      forma: 'foco',
      dir: 0,
      apertura: 40,
      color: '#fff',
      fuerza: 0.6
    });
    MP.S.ver.luces = true;
    MP.herr('seleccionar');
    MP.elegir(['luz_asas']);
    MP.herramienta.bajar(ev(260, 120));
    MP.herramienta.mover(ev(200, 200));
    MP.herramienta.subir(ev(200, 200));
    const o = MP.buscarObj('luz_asas');
    igual([o.dir, o.radio], [90, 80], 'la punta tendría que apuntar y alargar');
    CK.hist.deshacer();
    igual(MP.buscarObj('luz_asas').dir, 0, 'deshacer');
  });
  prueba('Atajos: tocar se queda, mantener vuelve a la anterior', async () => {
    CK.ir('mapa');
    CK.mapa.herr('seleccionar');
    const tecla = (tipo, key, extra) => document.dispatchEvent(new KeyboardEvent(tipo, Object.assign({ key, bubbles: true }, extra || {})));
    tecla('keydown', 'b');
    tecla('keyup', 'b');
    igual(CK.mapa.S.herr, 'pincel', 'un toque');
    CK.mapa.herr('seleccionar');
    tecla('keydown', 'b');
    tecla('keydown', 'b', { repeat: true });
    await esperar(320);
    tecla('keyup', 'b');
    igual(CK.mapa.S.herr, 'seleccionar', 'mantener y soltar');
  });
  prueba('Animar: guardar como copia deja la original igual', async () => {
    const a = Object.values(CK.P.assets).find(x => x.cuadros && CK.asset.nCuadros(x) > 1),
      f0 = CK.edicion.foto('assets', a.id),
      fps0 = a.cuadros.fps,
      v0 = CK.ventana;
    a.cuadros.fps = fps0 + 5;
    CK.ventana = async () => 'copia';
    respuesta = a.nombre + ' rápida';
    try {
      const id = await CK.edicion.guardarAsset(a.id, f0);
      ok(id && id !== a.id, 'no devolvió la copia');
      igual([CK.P.assets[a.id].cuadros.fps, CK.P.assets[id].cuadros.fps], [fps0, fps0 + 5], 'fps');
    } finally {
      CK.ventana = v0;
      respuesta = null;
    }
    ok(/px/.test(CK.asset.info(a)), 'falta la info del asset');
  });
  prueba('Girar y escalar sin deformar el pixel art', async () => {
    // un dibujo de 3 colores con una línea diagonal de 1 píxel
    const im = PIX.make(16, 16),
      pon = (x, y, c) => im.d.set(c, (y * 16 + x) * 4);
    for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) pon(x, y, [40, 90, 40, 255]);
    for (let i = 3; i < 13; i++) pon(i, i, [230, 200, 60, 255]);
    const colores = new Set();
    for (let i = 0; i < im.d.length; i += 4) if (im.d[i + 3]) colores.add(im.d.slice(i, i + 3).join());
    const r = PIX.transformar(im, (35 * Math.PI) / 180, 1.5, 1.5, 8, 16);
    let nuevos = 0,
      pintados = 0;
    for (let i = 0; i < r.im.d.length; i += 4)
      if (r.im.d[i + 3]) {
        pintados++;
        if (!colores.has(r.im.d.slice(i, i + 3).join())) nuevos++;
      }
    igual(nuevos, 0, 'inventó colores');
    ok(Math.abs(pintados - 120 * 2.25) < 120 * 2.25 * 0.15, 'cambió mucho el área: ' + pintados);
    // giro recto y escala entera: exacto
    const r90 = PIX.transformar(im, Math.PI / 2, 2, 2, 8, 8);
    igual([r90.im.w, r90.im.h], [32, 32], 'tamaño a 90°');
    igual([...r90.im.d.slice((3 * 2 * 32 + (31 - 3 * 2)) * 4, (3 * 2 * 32 + (31 - 3 * 2)) * 4 + 3)], [230, 200, 60], '90° exacto');
    // en el mapa y al exportar: el árbol girado va horneado con su punto de apoyo
    const m = CK.mapa.actual(),
      o = CK.mapa.objetosDe(m).find(q => q.asset === 'arbol');
    o.rot = 30;
    const pk = CK.juego.paquete(),
      it = pk.datos.mapas[m.id].items.find(i => i[0].startsWith('ed_arbol_t'));
    ok(it && it[5] && it[5].ox > 0 && it[5].oy > 0 && pk.imagenes[it[0]], 'no se horneó el objeto girado');
    o.rot = 0;
  });
  prueba('Pixel: el trazo no devuelve píxeles ya pintados (píxel perfecto en cruces)', async () => {
    const M = CK._pixel;
    CK.asset.crear({ nombre: 'lienzo_pp', tipo: 'sprite', lienzo: CK.lienzo(16, 16) });
    CK.ir('pixel', 'lienzo_pp');
    await esperar(80);
    M.ponerHerr('lapiz');
    Object.assign(M.S, { perfecto: true, tam: 1, c1: '#ff0000', espH: false, espV: false, soloPaleta: false });
    const ev = (x, y, o) => Object.assign({ x: x + 0.5, y: y + 0.5, boton: 0 }, o || {});
    M.herramienta.bajar(ev(4, 1));
    for (let y = 2; y <= 8; y++) M.herramienta.mover(ev(4, y));
    M.herramienta.mover(ev(1, 5));
    [
      [2, 5],
      [3, 5],
      [4, 5],
      [4, 6]
    ].forEach(([x, y]) => M.herramienta.mover(ev(x, y)));
    M.herramienta.subir(ev(4, 6));
    const px = (x, y) => CK.ctx(CK.img.lienzo_pp).getImageData(x, y, 1, 1).data[3];
    ok(px(4, 5) === 255, 'el cruce (4,5) volvió a transparente');
    for (let y = 1; y <= 8; y++) ok(px(4, y) === 255, 'la línea vertical quedó cortada en y=' + y);
    // Mayús: recta desde el último punto, se estira y se pinta al soltar (sin dobles)
    M.herramienta.bajar(ev(4, 6, { shift: true }));
    M.herramienta.mover(ev(9, 8, { shift: true }));
    M.herramienta.mover(ev(12, 9, { shift: true }));
    ok(M.trazo && M.trazo.linea && M.trazo.linea.b.x === 12, 'no hay vista previa de la recta');
    ok(px(12, 9) === 0, 'la recta se pintó antes de soltar');
    M.herramienta.subir(ev(12, 9));
    const pts = [];
    M.bres(4, 6, 12, 9, (x, y) => pts.push([x, y]));
    ok(
      pts.every(([x, y]) => px(x, y) === 255),
      'la recta no quedó completa'
    );
    igual(M.S.ultimo, { x: 12, y: 9 }, 'el último punto');
    igual(M.ajustarLinea({ x: 0, y: 0 }, { x: 10, y: 4 }, true), { x: 9, y: 3 }, 'Ctrl: pendiente 3:1');
    igual(M.ajustarLinea({ x: 0, y: 0 }, { x: -5, y: 6 }, true), { x: -6, y: 6 }, 'Ctrl: diagonal');
    // vaciar el lienzo y deshacer
    M.vaciarLienzo();
    igual(opacos('lienzo_pp'), 0, 'vaciar');
    CK.hist.deshacer();
    ok(opacos('lienzo_pp') > 10, 'deshacer vaciar');
  });
  prueba('Pixel: transformar rápido al arrastrar y el resultado final al soltar', async () => {
    const M = CK._pixel;
    CK.ir('pixel', 'roca');
    await esperar(60);
    M.ponerHerr('transformar');
    await esperar(30);
    ok(M.tr, 'no empezó');
    M.tr.ang = Math.PI / 2;
    M.aplicarTr(true);
    const rapido = CK.aPix(M.flot.c);
    M.aplicarTr();
    const limpio = CK.aPix(M.flot.c);
    igual([rapido.w, rapido.h], [limpio.w, limpio.h], 'tamaño a 90°');
    ok(
      rapido.d.every((v, i) => v === limpio.d[i]),
      'a 90° el rápido y el limpio deberían ser iguales'
    );
    M.tr.ang = Math.PI / 6;
    M.aplicarTrLuego();
    M.terminarTr();
    const fijo = CK.aPix(M.flot.c).d.slice();
    await esperar(300);
    ok(
      CK.aPix(M.flot.c).d.every((v, i) => v === fijo[i]),
      'quedó una vista rápida pendiente que cambió después de aplicar'
    );
    M.soltarFlot();
    CK.hist.deshacer();
    M.ponerHerr('lapiz');
  });
  prueba('Pixel: girar mantiene el contorno entero y se transforma desde las asas de la selección', async () => {
    const M = CK._pixel,
      c = CK.lienzo(48, 48),
      x = CK.ctx(c);
    x.fillStyle = '#000';
    x.fillRect(12, 6, 20, 30);
    x.fillStyle = '#2e8b22';
    x.fillRect(13, 7, 18, 28);
    CK.asset.crear({ nombre: 'casita_giro', tipo: 'sprite', lienzo: c });
    CK.ir('pixel', 'casita_giro');
    await esperar(60);
    M.ponerHerr('selRect');
    M.ponerSel(
      (() => {
        const m = new Uint8Array(48 * 48);
        for (let yy = 4; yy < 40; yy++) m.fill(1, yy * 48 + 10, yy * 48 + 35);
        return m;
      })()
    );
    ok(M.cajaSel() && M.cajaSel().w === 25, 'no hay caja de la selección');
    // agarrar el asa azul (girar) con la herramienta de selección, sin pasar por Transformar
    const v = M.vista,
      mj = M.manijasCaja(v, M.cajaSel()),
      ev = (sx, sy) => ({ sx, sy, x: (sx - v.tx) / v.z, y: (sy - v.ty) / v.z, boton: 0 });
    M.herramienta.bajar(ev(mj.rot.x, mj.rot.y));
    ok(M.tr && M.trazo && M.trazo.modo === 'rotar', 'el asa de la selección no empezó a girar');
    M.trazo = null;
    M.tr.ang = (35 * Math.PI) / 180;
    M.aplicarTr();
    const im = CK.aPix(M.flot.c),
      W = im.w,
      H = im.h,
      a = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : im.d[(yy * W + xx) * 4 + 3]);
    let borde = 0,
      malos = 0;
    for (let yy = 0; yy < H; yy++)
      for (let xx = 0; xx < W; xx++) {
        if (!a(xx, yy)) continue;
        if (!a(xx - 1, yy) || !a(xx + 1, yy) || !a(xx, yy - 1) || !a(xx, yy + 1)) {
          borde++;
          const i = (yy * W + xx) * 4;
          if (im.d[i] + im.d[i + 1] + im.d[i + 2] > 0) malos++;
        }
      }
    ok(borde > 40 && malos === 0, 'el contorno tiene huecos: ' + malos + ' de ' + borde + ' píxeles del borde no son negros');
    M.terminarTr();
    M.soltarFlot();
    CK.hist.deshacer();
    M.ponerHerr('lapiz');
  });
  prueba('Cambios sin aplicar: al cambiar de pestaña pregunta, Descartar vuelve atrás y Aplicar guarda', async () => {
    CK.ir('mapa');
    await esperar(60);
    CK.aplicar.prendido = () => true;
    const guardar0 = CK.guardar;
    let guardados = 0;
    CK.guardar = async () => {
      guardados++;
      CK._aplicado = JSON.stringify(CK.P);
      CK._sucio = false;
      return true;
    };
    try {
      CK.ir('mapa');
      await esperar(60);
      CK._aplicado = JSON.stringify(CK.P);
      CK._sucio = false;
      CK._imgSucias = new Set();
      const MP = CK.mapa,
        o = MP.objetosDe(MP.actual())[0],
        x0 = o.x;
      const f = MP.fin('Mover');
      o.x = x0 + 37;
      f();
      ok(CK._sucio, 'el cambio no quedó pendiente');
      const boton = async txt => {
        for (let i = 0; i < 30 && !document.querySelector('.ven-pie'); i++) await esperar(30);
        const b = [...document.querySelectorAll('.ven-pie button')].find(e => e.textContent.trim() === txt);
        ok(b, 'no apareció la pregunta (' + txt + ')');
        b.click();
        await esperar(150);
      };
      CK.ir('fx');
      await esperar(40);
      ok(
        CK.seccion_actual === 'mapa',
        'cambió de pestaña sin preguntar (' + [!!(CK.edicion && CK.edicion.actual), CK.flotantes.has('fx'), CK._sucio] + ')'
      );
      await boton('Seguir editando');
      ok(CK.seccion_actual === 'mapa' && CK._sucio, 'Seguir editando no se quedó');
      CK.ir('fx');
      await boton('Descartar');
      ok(CK.seccion_actual === 'fx', 'después de Descartar no cambió de pestaña');
      const o2 = MP.objetosDe(CK.P.mapas[MP.actual().id])[0];
      ok(o2.x === x0 && !CK._sucio, 'Descartar no volvió atrás: ' + o2.x + ' / ' + x0);
      CK.ir('mapa');
      await esperar(60);
      const o3 = MP.objetosDe(MP.actual())[0],
        f3 = MP.fin('Mover');
      o3.x = x0 + 5;
      f3();
      CK.ir('fx');
      await boton('Aplicar cambios');
      ok(CK.seccion_actual === 'fx' && guardados === 1 && !CK._sucio, 'Aplicar no guardó');
      ok(JSON.parse(CK._aplicado).mapas[MP.actual().id], 'lo aplicado no quedó como base');
    } finally {
      CK.guardar = guardar0;
      CK.aplicar.prendido = () => false;
    }
  });
  prueba('Sin errores en la consola', async () => {
    ok(!errores.length, errores.join(' / '));
  });

  // ---------------------------------------------------------------- correr y mostrar
  const correr = async () => {
    CK.guardar = async () => true;
    CK.fs.dir = () => null; // nada se guarda: ni navegador ni disco
    const caja = CK.h(
      'div#pruebas',
      {
        style: {
          position: 'fixed',
          right: '12px',
          bottom: '36px',
          width: '420px',
          maxHeight: '70vh',
          overflow: 'auto',
          zIndex: 900,
          background: 'var(--panel2)',
          border: '1px solid var(--linea2)',
          borderRadius: '10px',
          padding: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,.5)',
          font: '13px var(--fuente)'
        }
      },
      CK.h('b', 'Pruebas del editor…')
    );
    document.body.append(caja);
    const res = [];
    for (const t of lista) {
      const fila = CK.h('div', { style: { padding: '3px 0' } }, '… ' + t.nombre);
      caja.append(fila);
      try {
        await t.fn();
        res.push({ nombre: t.nombre, ok: true });
        fila.textContent = '✔ ' + t.nombre;
        fila.style.color = 'var(--verde)';
      } catch (e) {
        res.push({ nombre: t.nombre, ok: false, error: e.message });
        fila.textContent = '✘ ' + t.nombre + ' — ' + e.message;
        fila.style.color = 'var(--rojo)';
        console.error('Prueba fallida:', t.nombre, e);
      }
      await esperar(20);
    }
    const mal = res.filter(r => !r.ok).length;
    caja.firstChild.textContent = mal ? mal + ' prueba(s) fallaron de ' + res.length : 'Todo bien: ' + res.length + ' pruebas';
    caja.firstChild.style.color = mal ? 'var(--rojo)' : 'var(--verde)';
    window.__resultado = { total: res.length, fallas: mal, res };
  };
  window.addEventListener('load', () => setTimeout(correr, 800));
})();
