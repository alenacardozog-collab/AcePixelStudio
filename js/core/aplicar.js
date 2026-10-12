/* APLICAR O DESCARTAR CAMBIOS
   Lo que se hace en una sección queda "pendiente" hasta que se aplica. Al cambiar de pestaña con cambios pendientes
   se pregunta: Aplicar (se guarda), Descartar (todo vuelve a como estaba la última vez que se aplicó) o Seguir editando.
   Si se cierra el editor sin aplicar, no se guarda nada: al volver a abrir está como la última vez que se aplicó.
   Mientras esto está prendido no hay autoguardado (sí las copias de respaldo en versiones/, que no tocan el proyecto).
   Se apaga desde el botón de Interfaz → "Preguntar antes de aplicar cambios". */
'use strict';
(function () {
  const h = CK.h;
  const A = (CK.aplicar = {});
  /** ¿Está prendido? (de entrada, sí) */
  A.prendido = () => !(CK.temaUI && CK.temaUI.cfg && CK.temaUI.cfg().preguntar === false);
  A.pendiente = () => !!(CK.P && CK._sucio);

  /** Vuelve todo a lo último aplicado: datos del proyecto e imágenes. */
  A.descartar = async () => {
    if (!CK.P || !CK._aplicado) return false;
    const P0 = JSON.parse(CK._aplicado),
      slug = CK.slug(P0.nombre),
      sucias = new Set(CK._imgSucias || []),
      actuales = Object.assign({}, CK.img),
      dir = CK.fs && CK.fs.dir('editor');
    // si había una edición desde la Biblioteca abierta, se cierra (su barra queda sin sentido)
    try {
      if (CK.edicion && CK.edicion.actual && CK.edicion.terminar) CK.edicion.terminar();
    } catch (e) {}
    const leer = async id => {
      // una imagen que no se tocó desde que se aplicó se reusa tal cual; las tocadas vuelven de lo guardado
      if (!sucias.has(id) && actuales[id]) return actuales[id];
      try {
        const b = await CK.db.get('imagenes', slug + '/' + id);
        if (b) return CK.cargarImagen(b);
      } catch (e) {}
      if (dir)
        try {
          return await CK.cargarImagen(await CK.fs.leer(dir, 'trabajo/' + slug + '/assets/' + id + '.png'));
        } catch (e) {}
      return actuales[id] || null;
    };
    CK._ocupado = true;
    try {
      await CK._poner(P0, leer);
    } finally {
      CK._ocupado = false;
    }
    CK._aplicado = JSON.stringify(CK.P, null, 1);
    CK.estado('Cambios descartados: quedó como la última vez que se aplicó.');
    return true;
  };
  A.aplicar = async () => CK.guardar({ silencio: true });

  /** Pregunta qué hacer con los cambios pendientes. Devuelve 'aplicar', 'descartar' o 'seguir'. */
  A.preguntar = async (que = 'Cambiar de pestaña') => {
    const donde = (CK.secciones[CK.seccion_actual] || {}).nombre || 'esta sección';
    const r = await CK.ventana({
      titulo: 'Hay cambios sin aplicar',
      ancho: 480,
      cuerpo: h(
        'div',
        h('p', 'Hiciste cambios en ' + donde + ' que todavía no están aplicados.'),
        h(
          'p.nota-txt',
          'Aplicar los guarda en el proyecto. Descartar vuelve todo a como estaba la última vez que aplicaste. ' +
            'Si cerrás el editor sin aplicar, no se guardan.'
        )
      ),
      botones: [
        { txt: 'Seguir editando', valor: 'seguir' },
        { txt: 'Descartar', cls: 'peligro', valor: 'descartar' },
        { txt: 'Aplicar cambios', cls: 'pri', valor: 'aplicar' }
      ]
    });
    if (r === 'aplicar') {
      const ok = await A.aplicar();
      if (ok) CK.aviso('Cambios aplicados.', 'ok', 2200);
      return ok ? 'aplicar' : 'seguir';
    }
    if (r === 'descartar') {
      await A.descartar();
      CK.aviso('Cambios descartados.', 'info', 2200);
      return 'descartar';
    }
    return 'seguir';
  };

  /** Lo usa CK.ir: true = se puede cambiar de pestaña ya; si hay que preguntar, pregunta y después cambia. */
  let preguntando = false;
  A.preguntando = () => preguntando;
  A.antesDeIr = (id, arg, o) => {
    const act = CK.seccion_actual;
    if (!A.prendido() || o.forzar || !act || act === id) return true;
    if (preguntando) return false; // ya hay una pregunta abierta: se espera la respuesta
    const sec = CK.secciones[act];
    try {
      if (sec && sec.antesDePreguntar) sec.antesDePreguntar();
    } catch (e) {}
    if (!A.pendiente()) return true;
    if (!act || act === id || act === 'inicio' || CK.flotantes.has(id)) return true;
    if (CK.edicion && CK.edicion.actual) return true; // la edición desde la Biblioteca tiene su propia barra
    preguntando = true;
    A.preguntar().then(r => {
      preguntando = false;
      if (r !== 'seguir') CK.ir(id, arg, Object.assign({}, o, { forzar: true }));
    });
    return false;
  };

  // al cerrar la pestaña o el navegador con cambios pendientes: el navegador pregunta, y no se guarda nada
  window.addEventListener('beforeunload', e => {
    if (A.prendido() && A.pendiente()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  // indicador en la barra de estado
  if (CK.on)
    CK.on('sucio', v => {
      if (!A.prendido()) return;
      const el = document.getElementById('estado-der');
      if (v && el && !el.textContent) CK.estadoDer('Cambios sin aplicar');
    });
})();
