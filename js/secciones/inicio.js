/* INICIO: bienvenida, proyectos y el recorrido sugerido. */
'use strict';
(function () {
  const h = CK.h; let el;
  const pintar = async () => {
    if (!el) return; const col = h('div.col'); CK.vaciar(el).append(col);
    if (!CK.P) {
      const lista = await CK.proyectos(), nombre = h('input.in', { type: 'text', value: 'CastleKnight', style: { maxWidth: '260px' } });
      const crear = async () => { const n = nombre.value.trim(); if (!n) return; await CK.nuevo(n); pintar(); };
      nombre.addEventListener('keydown', e => { if (e.key === 'Enter') crear(); });
      col.append(h('h1', 'Taller CastleKnight'), h('p.bajada', 'Un solo lugar para armar mapas, convertir referencias en assets, retocar píxeles, animar, crear efectos y escribir los diálogos de los NPC, todo con la misma guía de estilo.'),
        h('div.caja', h('h2', { style: { marginTop: 0 } }, 'Empezar un proyecto'), h('div.fila', nombre, CK.btn({ ico: 'mas', txt: 'Crear proyecto', cls: 'pri', on: crear }), CK.btn({ ico: 'exportar', txt: 'Abrir archivo .ckproj', on: async () => { const [f] = await CK.elegirArchivos('.ckproj,application/json'); if (f) try { await CK.desempaquetar(f); } catch (e) { CK.aviso(e.message, 'error'); } } })),
          h('p.nota-txt', 'El proyecto guarda la guía de estilo, los assets, los mapas y todo lo demás. Sirve para CastleKnight y para cualquier otro juego.')));
      if (lista.length) col.append(h('h2', 'Seguir con uno guardado'), h('div.lista', lista.map(p => h('div.item', { onclick: () => CK.abrir(p.slug) }, h('span', { html: CK.ico('carpeta', 18) }), h('span.nombre', p.nombre || p.slug), h('span.sub', CK.fecha(p.modificado)), p.disco ? h('span.etq.verde', 'en carpeta') : h('span.etq', 'navegador')))));
      if (!CK.fs.dir('editor')) col.append(h('h2', 'Carpeta del editor'), h('div.caja', h('p.ayuda-txt', CK.fs.disponible ? 'Conectá la carpeta D:\\Editor para que los proyectos se guarden como archivos (y para que Claude pueda trabajar sobre ellos). Si ya la conectaste antes, el navegador solo pide confirmar el permiso.' : 'Este navegador no permite abrir carpetas. Abrí el editor con Chrome o Edge para guardar en disco; mientras tanto todo se guarda dentro del navegador.'), CK.fs.disponible ? h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'carpeta', txt: CK.fs.pendiente('editor') ? 'Reconectar carpeta del editor' : 'Conectar carpeta del editor', on: async () => { await CK.conectarCarpeta('editor'); pintar(); } })) : null));
      return;
    }
    const P = CK.P, A = Object.values(P.assets), Ms = Object.values(P.mapas), pend = P.notas.filter(n => !n.hecho).length + Ms.reduce((s, m) => s + (m.notas || []).filter(n => !n.hecho).length, 0);
    const pasos = [
      { t: 'Conectar las carpetas', d: 'La del editor (D:\\Editor) para guardar en archivos, y la del juego (D:\\prueba) para importar y exportar.', ok: !!CK.fs.dir('editor') && !!CK.fs.dir('juego'), b: !CK.fs.dir('editor') ? ['Conectar editor', () => CK.conectarCarpeta('editor').then(pintar)] : !CK.fs.dir('juego') ? ['Conectar juego', () => CK.conectarCarpeta('juego').then(pintar)] : null },
      { t: 'Fijar la guía de estilo', d: 'Tamaño de tile, paleta, contorno y dirección de la luz. Todas las secciones respetan lo que definas ahí.', ok: !!P.estilo.definida, b: ['Abrir guía de estilo', () => CK.ir('estilo')] },
      { t: 'Traer lo que ya tiene el juego', d: 'Mapas con sus objetos y colisiones, y las carpetas de imágenes actuales.', ok: A.some(a => a.rutaJuego), b: ['Importar del juego', () => CK.juego.ventanaImportar().then(pintar)] },
      { t: 'Armar el suelo', d: 'En Texturas: subís una referencia de piedra o pasto y sale el juego de piezas con bordes orgánicos.', ok: A.some(a => a.tipo === 'tileset' && !a.rutaJuego), b: ['Ir a Texturas', () => CK.ir('texturas')] },
      { t: 'Montar una pantalla de prueba', d: 'Un mapa chico con suelo, un par de objetos y un personaje. Si se ve como un solo juego, producís el resto.', ok: Ms.some(m => !m.origen), b: ['Ir a Mapa', () => CK.ir('mapa')] },
      { t: 'Pasar el revisor', d: 'Lista lo que desentona: colores fuera de paleta, tamaños distintos, objetos sin colisión.', ok: !!P.ui.revisado, b: ['Abrir revisor', () => CK.ir('revisor')] }
    ];
    col.append(h('h1', P.nombre), h('p.bajada', 'Última vez guardado: ' + CK.fecha(P.modificado) + (CK.fs.dir('editor') ? ' · en ' + CK.rutaProyecto() : ' · solo en el navegador')));
    col.append(h('div.cajas', { style: { marginBottom: '6px' } }, [['assets', 'Assets', A.length, 'pixel'], ['mapa', 'Mapas', Ms.length, 'mapa'], ['anim', 'Animaciones', A.filter(a => a.cuadros).length, 'anim'], ['fx', 'Efectos', Object.keys(P.fx).length, 'fx'], ['npc', 'NPC', Object.keys(P.npcs).length, 'npc'], ['notas', 'Notas pendientes', pend, 'notas']].map(([ico, rot, n, ir]) => { const c = h('div.caja', { style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }, onclick: () => CK.ir(ir) }, h('span', { html: CK.ico(ico, 26), style: { color: 'var(--oro)' } }), h('div', h('div', { style: { fontSize: '22px', fontWeight: 700, lineHeight: 1.1 } }, String(n)), h('div.ayuda-txt', rot))); return c; })));
    col.append(h('h2', 'Recorrido sugerido'), ...pasos.map((p, i) => h('div.paso' + (p.ok ? '.hecho' : ''), h('div.n', { html: p.ok ? CK.ico('ok', 18) : String(i + 1) }), h('div', h('b', p.t), h('span.d', p.d)), p.b && !p.ok ? CK.btn({ txt: p.b[0], on: p.b[1] }) : p.b ? CK.btn({ txt: p.b[0], cls: 'plano', on: p.b[1] }) : h('span'))));
    col.append(h('h2', 'Para trabajar con Claude'), h('div.caja', h('p.ayuda-txt', 'Todo lo que hacés acá queda en archivos dentro de ' + (CK.fs.dir('editor') ? CK.rutaProyecto() : 'trabajo/<proyecto>') + ': proyecto.json y una imagen PNG por asset. Claude lee y modifica esos mismos archivos, y usa las mismas funciones del editor desde la carpeta herramientas/ (paleta, limpieza, transiciones, animaciones, revisor).'), h('p.ayuda-txt', { style: { marginTop: '6px' } }, 'Dejale pedidos en Notas o con las marcas de animación del mapa. Cuando termine, usá Proyecto → "Recargar de la carpeta" para ver sus cambios.')));
  };
  CK.registrar({ id: 'inicio', nombre: 'Inicio', ico: 'inicio', desc: 'Proyecto abierto, resumen y recorrido sugerido.', crear: e => { el = h('div.pagina'); e.append(el); ['proyecto', 'carpetas', 'assets', 'mapas'].forEach(ev => CK.on(ev, CK.debounce(() => { if (CK.seccion_actual === 'inicio') pintar(); }, 150))); }, mostrar: pintar });
})();
