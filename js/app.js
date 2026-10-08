/* APP: barra superior, riel de secciones, atajos generales y arranque. */
'use strict';
(function () {
  const h = CK.h;
  const GRUPOS = [['inicio', 'estilo'], ['mapa'], ['convertir', 'texturas', 'pixel'], ['anim', 'fx'], ['npc', 'misiones', 'interfaz'], ['revisor', 'notas', 'portfolio']];
  let actual = null;

  // ------------------------------------------------------------ secciones
  CK.ir = (id, arg) => {
    const s = CK.secciones[id]; if (!s) return;
    if (!CK.P && id !== 'inicio') { CK.aviso('Primero creá o abrí un proyecto.', 'info'); id = 'inicio'; }
    const sec = CK.secciones[id], cont = document.getElementById('contenido');
    if (actual && actual !== sec && actual.ocultar) actual.ocultar();
    if (!sec.el) { sec.el = h('div.area', { 'data-seccion': id }); cont.append(sec.el); sec.crear(sec.el); try { CK.espacio.preparar(sec); } catch (e) { console.error(e); } }
    [...cont.children].forEach(c => { c.style.display = c === sec.el ? '' : 'none'; });
    actual = sec; CK.seccion_actual = id; if (CK.P && id !== 'inicio') CK.P.ui.seccion = id;
    document.querySelectorAll('.riel-btn').forEach(b => b.classList.toggle('activo', b.dataset.id === id));
    document.getElementById('estado-herr').textContent = sec.nombre; CK.estado(sec.desc);
    if (sec.mostrar) sec.mostrar(arg);
  };
  const riel = () => {
    const r = CK.vaciar(document.getElementById('riel'));
    GRUPOS.forEach((g, gi) => {
      if (gi) r.append(h('div.riel-sep'));
      g.forEach(id => { const s = CK.secciones[id]; if (!s) return; const b = h('button.riel-btn', { type: 'button', 'data-id': id, html: CK.ico(s.ico, 24), onclick: () => CK.ir(id) }, h('span', s.corto || s.nombre)); CK.tip(b, s.nombre, s.desc, s.atajo, 'der'); r.append(b); });
    });
  };

  // ------------------------------------------------------------ barra superior
  const ESCUDO = '<svg class="marca-escudo" viewBox="0 0 26 26"><path d="M13 2l9 3v8c0 5.500-3.800 9.500-9 11-5.200-1.500-9-5.500-9-11V5z" fill="#e8b83a"/><path d="M13 2v22c5.200-1.500 9-5.500 9-11V5z" fill="#c8962a"/><path d="M9 9h3v3H9zM14 9h3v3h-3zM9 14h3v3H9zM14 14h3v3h-3z" fill="#1d1a10"/></svg>'.replace(/\.500/g, '.5').replace(/\.800/g, '.8').replace(/\.200/g, '.2');
  let chipProy, chipEd, chipJu, cuentaRev, cuentaNot, bDes, bRe;
  const barra = () => {
    const b = CK.vaciar(document.getElementById('barra'));
    chipProy = h('div.proy', { onclick: menuProyecto }, h('span.punto'), h('b', 'Sin proyecto'), h('span', { html: CK.ico('flechaAb', 14) }));
    CK.tip(chipProy, 'Proyecto', 'Clic para cambiar el nombre, abrir otro proyecto, crear uno nuevo, descargar una copia o volver a una versión anterior. El punto dorado indica cambios sin guardar.');
    bDes = CK.btn({ ico: 'deshacer', tip: 'Deshacer', desc: 'Vuelve atrás el último cambio.', tecla: 'Ctrl + Z', cls: 'plano', on: () => CK.hist.deshacer() });
    bRe = CK.btn({ ico: 'rehacer', tip: 'Rehacer', desc: 'Repite el cambio que deshiciste.', tecla: 'Ctrl + Y', cls: 'plano', on: () => CK.hist.rehacer() });
    chipEd = h('span.chip', { onclick: () => conectar('editor') }); chipJu = h('span.chip', { onclick: () => conectar('juego') });
    cuentaRev = h('span.cuenta.cero', '0'); cuentaNot = h('span.cuenta.cero', '0');
    const bRev = CK.btn({ ico: 'revisor', txt: 'Revisor', desc: 'Lista lo que desentona o falta: assets fuera de paleta, tamaños distintos, objetos sin colisión, zonas sin salida.', cls: 'plano', on: () => CK.ir('revisor') }); bRev.append(cuentaRev);
    const bNot = CK.btn({ ico: 'notas', txt: 'Notas', desc: 'Pendientes y comentarios que dejaste en el proyecto. Claude los lee y marca lo resuelto.', cls: 'plano', on: () => CK.ir('notas') }); bNot.append(cuentaNot);
    const bInd = CK.btn({ ico: 'info', tip: 'Indicadores', desc: 'Muestra u oculta estos carteles que explican cada herramienta al detenerte sobre ella.', cls: 'plano activo', on: (e, el) => { CK.verIndicadores = !CK.verIndicadores; el.classList.toggle('activo', CK.verIndicadores); CK.aviso(CK.verIndicadores ? 'Indicadores activados' : 'Indicadores ocultos', 'info', 1600); } });
    b.append(
      h('div.marca', { html: ESCUDO }, h('span', 'Taller')), chipProy,
      CK.btn({ ico: 'guardar', txt: 'Guardar', desc: 'Guarda el proyecto para seguir después. Además se guarda solo cada minuto.', tecla: 'Ctrl + S', on: () => CK.guardar() }),
      CK.btn({ ico: 'version', tip: 'Guardar versión', desc: 'Guarda una copia numerada del proyecto para poder volver a este punto si un cambio no te convence.', cls: 'plano', on: guardarVersion }),
      h('div.barra-sep'), bDes, bRe, h('div.barra-sep'),
      CK.btn({ ico: 'exportar', txt: 'Exportar al juego', desc: 'Copia a la carpeta del juego los assets y mapas listos, en el formato que el juego lee.', on: () => CK.juego.ventanaExportar() }),
      CK.btn({ ico: 'probar', txt: 'Probar', desc: 'Abre CastleKnight en otra pestaña para ver los cambios funcionando.', tecla: 'F5', cls: 'pri', on: () => CK.juego.probar() }),
      h('div.barra-esp'), h('div.carpetas', chipEd, chipJu), h('div.barra-sep'), bRev, bNot,
      CK.btn({ ico: 'ventanas', txt: 'Espacio', desc: 'Acomodá el espacio de trabajo: qué paneles se ven, cuáles van sueltos como ventanas, y el botón para restablecer todo.', tecla: 'Ctrl + Mayús + 0: restablecer', cls: 'plano', on: () => CK.espacio.ventana() }), bInd,
      CK.btn({ ico: 'teclado', tip: 'Atajos de teclado', desc: 'Lista de todas las teclas rápidas.', tecla: '?', cls: 'plano', on: atajos }));
    pintarBarra();
  };
  const pintarBarra = () => {
    if (!chipProy) return;
    chipProy.querySelector('b').textContent = CK.P ? CK.P.nombre : 'Sin proyecto'; chipProy.classList.toggle('sucio', !!CK._sucio);
    const chip = (el, tipo, rot) => {
      const d = CK.fs.dir(tipo), pend = CK.fs.pendiente(tipo);
      el.className = 'chip ' + (d ? 'ok' : 'falta'); el.innerHTML = CK.ico(d ? 'carpeta' : 'enlace', 14) + '<span>' + rot + (d ? ': ' + d.name : pend ? ': reconectar' : ': conectar') + '</span>';
      CK.tip(el, 'Carpeta ' + rot.toLowerCase(), d ? 'Conectada a "' + d.name + '". Clic para elegir otra.' : pend ? 'El navegador pide permiso de nuevo en cada sesión. Clic para volver a conectar.' : tipo === 'editor' ? 'Elegí la carpeta del editor (D:\\Editor). Ahí se guardan los proyectos en archivos, para respaldo y para que Claude pueda trabajar sobre ellos.' : 'Elegí la carpeta de CastleKnight (D:\\prueba) para importar sus mapas y assets y exportarle los resultados.');
    };
    chip(chipEd, 'editor', 'Editor'); chip(chipJu, 'juego', 'Juego');
    bDes.disabled = !CK.hist.pos; bRe.disabled = CK.hist.pos >= CK.hist.pila.length;
    let np = 0; try { np = CK.P ? (CK.todasLasNotas ? CK.todasLasNotas().filter(x => !x.n.hecho).length : CK.P.notas.filter(n => !n.hecho).length) : 0; } catch (e) { } cuentaNot.textContent = np; cuentaNot.classList.toggle('cero', !np);
  };
  CK.pintarCuentaRevisor = n => { if (cuentaRev) { cuentaRev.textContent = n; cuentaRev.classList.toggle('cero', !n); } };
  ['sucio', 'proyecto', 'carpetas', 'hist', 'notas', 'guardado'].forEach(ev => CK.on(ev, pintarBarra));

  const conectar = async tipo => {
    if (CK.fs.pendiente(tipo)) { await CK.fs.recordar(true); if (CK.fs.dir(tipo)) { CK.aviso('Carpeta reconectada'); CK.emit('carpetas'); return; } }
    await CK.fs.conectar(tipo);
  };
  CK.conectarCarpeta = conectar;
  const guardarVersion = async () => { if (!CK.P) return; const nota = await CK.pedir('Guardar versión', 'Nota corta (opcional)', ''); if (nota === null) return; CK.guardar({ version: true, nota, silencio: true }); };

  const menuProyecto = async () => {
    const lista = await CK.proyectos(), cuerpo = h('div');
    const cerrar = () => cuerpo.closest('.ventana').cerrar(null);
    if (CK.P) cuerpo.append(CK.seccion('Proyecto abierto',
      CK.campo('Nombre', CK.txt(CK.P.nombre, v => { if (v.trim()) { CK.P.nombre = v.trim(); Object.keys(CK.img).forEach(id => CK._imgSucias.add(id)); CK.tocar(); pintarBarra(); } })),
      h('div.fila', { style: { marginTop: '8px' } },
        CK.btn({ ico: 'importar', txt: 'Descargar copia', desc: 'Baja todo el proyecto en un solo archivo .ckproj, con sus imágenes adentro.', on: () => CK.descargar(CK.empaquetar(), CK.slug(CK.P.nombre) + '.ckproj') }),
        CK.btn({ ico: 'version', txt: 'Versiones', desc: 'Volver a una copia numerada anterior.', on: () => { cerrar(); verVersiones(); } }),
        CK.btn({ ico: 'recargar', txt: 'Recargar de la carpeta', desc: 'Vuelve a leer los archivos del disco. Usalo después de que Claude trabaje sobre el proyecto.', on: async () => { cerrar(); await CK.abrir(CK.slug(CK.P.nombre), 'disco'); } }))));
    const otros = h('div.lista');
    lista.forEach(p => otros.append(h('div.item' + (CK.P && CK.slug(CK.P.nombre) === p.slug ? '.activo' : ''), { onclick: async () => { cerrar(); if (CK._sucio) await CK.guardar({ silencio: true }); await CK.abrir(p.slug); } },
      h('span', { html: CK.ico('carpeta', 16) }), h('span.nombre', p.nombre || p.slug), h('span.sub', CK.fecha(p.modificado)), p.disco ? h('span.etq.verde', 'en carpeta') : h('span.etq', 'navegador'))));
    cuerpo.append(CK.seccion('Abrir otro', lista.length ? otros : h('p.ayuda-txt', 'Todavía no hay proyectos guardados.'),
      h('div.fila', { style: { marginTop: '10px' } },
        CK.btn({ ico: 'mas', txt: 'Proyecto nuevo', cls: 'pri', on: async () => { cerrar(); const n = await CK.pedir('Proyecto nuevo', 'Nombre del proyecto', 'CastleKnight'); if (n) { if (CK._sucio) await CK.guardar({ silencio: true }); await CK.nuevo(n); CK.ir('inicio'); } } }),
        CK.btn({ ico: 'exportar', txt: 'Abrir archivo .ckproj', on: async () => { cerrar(); const [f] = await CK.elegirArchivos('.ckproj,application/json'); if (f) try { await CK.desempaquetar(f); CK.aviso('Proyecto abierto desde archivo'); } catch (e) { CK.aviso(e.message, 'error'); } } }))));
    CK.ventana({ titulo: 'Proyectos', ancho: 540, cuerpo });
  };
  CK.menuProyecto = menuProyecto;
  const verVersiones = async () => {
    const vs = await CK.versiones(), cuerpo = h('div');
    if (!vs.length) cuerpo.append(h('p', 'Todavía no guardaste versiones. Usá el botón del reloj en la barra para guardar una antes de un cambio grande.'));
    vs.forEach(v => cuerpo.append(h('div.item', h('span', { html: CK.ico('version', 16) }), h('span.nombre', v.nombre), CK.btn({ txt: 'Volver a esta', cls: 'chico', on: async () => { if (await CK.confirmar('Volver a esta versión', 'Los mapas, NPC, efectos y notas vuelven a como estaban en esa versión. Las imágenes quedan como están hoy. Antes se guarda una versión del estado actual.', 'Volver')) { await CK.guardar({ version: true, nota: 'antes de volver', silencio: true }); await CK.volverA(await v.leer()); cuerpo.closest('.ventana').cerrar(null); CK.aviso('Proyecto restaurado'); } } }))));
    CK.ventana({ titulo: 'Versiones guardadas', ancho: 500, cuerpo });
  };
  const atajos = () => {
    const filas = [['General', [['Ctrl + S', 'Guardar'], ['Ctrl + Z / Ctrl + Y', 'Deshacer / Rehacer'], ['F5', 'Probar en el juego'], ['Espacio + arrastrar', 'Mover la vista'], ['Rueda', 'Acercar o alejar'], ['0', 'Ver todo'], ['Ctrl + Mayús + 0', 'Restablecer el espacio de trabajo'], ['?', 'Esta lista']]],
    ['Mapa', [['V', 'Seleccionar y mover'], ['B', 'Pintar'], ['E', 'Borrar'], ['G', 'Rellenar'], ['T', 'Terreno con bordes'], ['W / X', 'Zona caminable / bloqueada'], ['C', 'Colisión'], ['L', 'Luz'], ['N', 'Nota'], ['M', 'Marcar para animar'], ['Supr', 'Borrar lo seleccionado'], ['Ctrl + D', 'Duplicar'], ['Ctrl + G', 'Agrupar'], ['H', 'Voltear'], ['Flechas', 'Mover 1 píxel (Mayús: 1 tile)'], ['[ y ]', 'Enviar atrás / traer adelante']]],
    ['Pixel art', [['B', 'Lápiz'], ['E', 'Borrador'], ['G', 'Balde'], ['I', 'Cuentagotas (o Alt + clic)'], ['L', 'Línea'], ['R', 'Rectángulo'], ['O', 'Elipse'], ['S', 'Selección'], ['W', 'Varita'], ['X', 'Intercambiar colores'], ['[ y ]', 'Tamaño de la punta'], [', y .', 'Cuadro anterior / siguiente']]]];
    CK.ventana({ titulo: 'Atajos de teclado', ancho: 560, cuerpo: h('div', filas.map(([t, l]) => h('div', h('h3.bloque-tit', { style: { marginTop: '10px' } }, t), h('table.tabla', l.map(([k, d]) => h('tr', h('td', { style: { width: '190px' } }, h('kbd', k)), h('td', d))))))) });
  };

  // ------------------------------------------------------------ teclado general
  document.addEventListener('keydown', e => {
    if (document.querySelector('.ven-fondo')) return;
    const enCampo = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === 's') { e.preventDefault(); CK.guardar(); return; }
    if (e.key === 'F5') { e.preventDefault(); CK.juego.probar(); return; }
    if (enCampo) return;
    if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); CK.hist.deshacer(); return; }
    if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); CK.hist.rehacer(); return; }
    if (e.key === '?') { atajos(); return; }
    if (actual && actual.tecla && actual.tecla(e, k, ctrl)) e.preventDefault();
  });

  // ------------------------------------------------------------ arranque
  window.addEventListener('DOMContentLoaded', async () => {
    riel(); barra();
    await CK.fs.recordar(false);
    // siempre se arranca en Inicio: el proyecto se elige ahí y vuelve a la sección donde se lo dejó
    CK.ir('inicio');
    CK.on('proyecto', () => { Object.values(CK.secciones).forEach(s => { if (s.alCambiarProyecto) s.alCambiarProyecto(); }); const donde = CK.P && CK.P.ui.seccion; if (CK.seccion_actual === 'inicio' && donde && donde !== 'inicio' && CK.secciones[donde]) CK.ir(donde); else if (actual && actual.mostrar) actual.mostrar(); });
    CK.lista = true; CK.emit('lista');
  });
})();
