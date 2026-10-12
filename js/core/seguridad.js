/* SEGURIDAD: para no perder trabajo.
   - Copias automáticas: cada 10 minutos (si hubo cambios) guarda una copia con fecha del proyecto entero en el navegador
     (datos + las imágenes que cambiaron) y, si la carpeta del editor está conectada, también el .json en versiones/.
     Se guardan las últimas 12; "Copias automáticas" en el menú del proyecto deja volver a cualquiera.
   - Dos pestañas: avisa si el mismo proyecto está abierto en otra pestaña (una podría pisar lo que guardó la otra).
   - Recuperar: mientras se trabaja, guarda en silencio lo que todavía no se guardó; si el editor se cerró de golpe,
     al volver a abrir el proyecto ofrece recuperarlo.
   - Errores amables: si algo falla, un aviso claro y un registro (Interfaz → "Ver errores") para arreglarlo rápido. */
'use strict';
(function () {
  const h = CK.h;
  const SESION = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const slug = () => (CK.P ? CK.slug(CK.P.nombre) : null);
  const hora = t => new Date(t).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // ================================================================ copias automáticas
  const MAX = 12,
    CADA = 10 * 60 * 1000;
  const C = (CK.copias = {});
  let cambiadas = new Set(),
    hayCambios = false,
    ultima = 0;
  CK.on('asset-img', id => cambiadas.add(id));
  CK.on('sucio', v => {
    if (v) hayCambios = true;
  });
  const leerLista = async s => (await CK.db.get('ajustes', 'copias_' + s)) || [];
  const fechaArchivo = t => {
    const d = new Date(t),
      z = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + '-' + z(d.getMinutes());
  };
  /** Hace una copia ahora. o.nota = texto; o.todas = guardar todas las imágenes (la primera copia lo hace solo). */
  C.hacer = async (o = {}) => {
    if (!CK.P) return null;
    const s = slug(),
      lista = await leerLista(s),
      n = lista.length ? lista[lista.length - 1].n + 1 : 1,
      t = Date.now(),
      todas = o.todas || !lista.length,
      ids = todas ? Object.keys(CK.img) : [...cambiadas].filter(id => CK.img[id] && CK.P.assets[id]);
    for (const id of ids) await CK.db.set('imagenes', 'copia/' + s + '/' + n + '/' + id, await CK.aBlob(CK.img[id]));
    const json = JSON.stringify(CK.P);
    lista.push({ n, t, json, imgs: ids, nota: o.nota || '' });
    // si sobran, la más vieja se borra pero sus imágenes pasan a la siguiente (así cada copia se puede rearmar entera)
    while (lista.length > MAX) {
      const vieja = lista.shift(),
        sig = lista[0];
      for (const id of vieja.imgs) {
        const k = 'copia/' + s + '/' + vieja.n + '/' + id;
        if (!sig.imgs.includes(id)) {
          const b = await CK.db.get('imagenes', k);
          if (b) {
            await CK.db.set('imagenes', 'copia/' + s + '/' + sig.n + '/' + id, b);
            sig.imgs.push(id);
          }
        }
        await CK.db.del('imagenes', k);
      }
    }
    await CK.db.set('ajustes', 'copias_' + s, lista);
    cambiadas = new Set();
    hayCambios = false;
    ultima = t;
    // copia de los datos también en la carpeta (versiones/auto_…), quedan las últimas 20
    const dir = CK.fs.dir('editor');
    if (dir)
      try {
        const base = CK.rutaProyecto() + '/versiones';
        await CK.fs.escribir(dir, base + '/auto_' + fechaArchivo(t) + '.json', JSON.stringify(CK.P, null, 1));
        const autos = (await CK.fs.listar(dir, base))
          .filter(e => /^auto_/.test(e.nombre))
          .map(e => e.nombre)
          .sort();
        for (const v of autos.slice(0, Math.max(0, autos.length - 20))) await CK.fs.borrar(dir, base + '/' + v);
      } catch (e) {
        console.warn('[copias]', e);
      }
    CK.emit('copias');
    return { n, t };
  };
  C.lista = async () => (CK.P ? (await leerLista(slug())).slice().reverse() : []);
  /** Vuelve el proyecto a como estaba en la copia n (antes hace una copia de lo actual, por si acaso). */
  C.volver = async n => {
    const s = slug(),
      lista = await leerLista(s),
      k = lista.findIndex(c => c.n === n);
    if (k < 0) return false;
    await C.hacer({ nota: 'antes de volver a la copia de las ' + hora(lista[k].t) });
    const l2 = await leerLista(s),
      k2 = l2.findIndex(c => c.n === n),
      p = JSON.parse(l2[k2].json),
      actuales = Object.assign({}, CK.img);
    const buscar = async id => {
      for (let i = k2; i >= 0; i--)
        if (l2[i].imgs.includes(id)) {
          const b = await CK.db.get('imagenes', 'copia/' + s + '/' + l2[i].n + '/' + id);
          if (b) return CK.cargarImagen(b);
        }
      return actuales[id] ? CK.copiaLienzo(actuales[id]) : null;
    };
    await CK._poner(p, buscar);
    Object.keys(CK.img).forEach(id => CK._imgSucias.add(id));
    CK.tocar();
    await CK.guardar({ silencio: true, todo: true });
    CK.aviso('Listo: el proyecto volvió a como estaba el ' + hora(l2[k2].t) + '. Lo de recién quedó guardado como otra copia.', 'ok', 6000);
    return true;
  };
  C.ventana = async () => {
    if (!CK.P) return;
    const cuerpo = h('div');
    const pintar = async () => {
      CK.vaciar(cuerpo);
      const l = await C.lista();
      cuerpo.append(
        h(
          'p',
          'El editor guarda solo una copia de todo el proyecto cada 10 minutos mientras trabajás (las últimas ' +
            MAX +
            '). Elegí una para volver a como estaba en ese momento: antes se guarda lo de ahora, así que no se pierde nada.'
        ),
        h(
          'div.fila',
          { style: { margin: '8px 0 12px' } },
          CK.btn({
            ico: 'guardar',
            txt: 'Hacer una copia ahora',
            cls: 'chico',
            on: async () => {
              const nota = await CK.pedir('Copia ahora', 'Nota (opcional)', '');
              if (nota === null) return;
              await C.hacer({ nota });
              CK.aviso('Copia guardada');
              pintar();
            }
          })
        )
      );
      if (!l.length) cuerpo.append(h('p.nota-txt', 'Todavía no hay copias: la primera se hace sola en unos minutos.'));
      const lista = h('div.lista');
      l.forEach((c, i) =>
        lista.append(
          h(
            'div.item',
            h('span', { html: CK.ico('tiempo', 16) }),
            h('span.nombre', hora(c.t) + (c.nota ? ' · ' + c.nota : '')),
            h('span.sub', Object.keys(JSON.parse(c.json).assets || {}).length + ' assets'),
            i === 0 ? h('span.etq.verde', 'la más nueva') : null,
            CK.btn({
              txt: 'Volver a esta',
              cls: 'chico',
              on: async () => {
                if (
                  !(await CK.confirmar(
                    'Volver a esta copia',
                    'El proyecto va a quedar como estaba el ' + hora(c.t) + '. Lo de ahora se guarda antes como otra copia.',
                    'Volver'
                  ))
                )
                  return;
                const v = document.querySelector('.ven-fondo .ventana');
                if (v && v.cerrar) v.cerrar(null);
                await C.volver(c.n);
              }
            })
          )
        )
      );
      cuerpo.append(lista);
      if (CK.fs.dir('editor'))
        cuerpo.append(
          h(
            'p.nota-txt',
            { style: { marginTop: '10px' } },
            'Los datos de cada copia también quedan en la carpeta del proyecto, en versiones/auto_….json.'
          )
        );
    };
    await pintar();
    CK.ventana({ titulo: 'Copias automáticas', ancho: 560, cuerpo });
  };
  setInterval(() => {
    if (CK.P && hayCambios && Date.now() - ultima > CADA - 1000 && !CK._ocupado) C.hacer().catch(e => console.warn('[copias]', e));
  }, 60000);
  CK.on('proyecto', async () => {
    cambiadas = new Set();
    hayCambios = false;
    ultima = Date.now();
    // la primera vez que se abre un proyecto, una copia de base con todas las imágenes
    try {
      if (CK.P && !(await leerLista(slug())).length) setTimeout(() => C.hacer({ todas: true, nota: 'al abrir' }), 3000);
    } catch (e) {}
  });

  // ================================================================ dos pestañas con el mismo proyecto
  let canal = null;
  try {
    canal = new BroadcastChannel('ck_editor');
  } catch (e) {}
  let avisadoDoble = false;
  const avisarDoble = () => {
    if (avisadoDoble) return;
    avisadoDoble = true;
    CK.aviso(
      'Ojo: este proyecto está abierto en otra pestaña. Si guardás en las dos, una pisa lo que guardó la otra. Cerrá una de las dos.',
      'error',
      12000
    );
    CK.estado('Proyecto abierto en dos pestañas');
  };
  if (canal) {
    canal.onmessage = ev => {
      const d = ev.data || {};
      if (!CK.P || d.slug !== slug() || d.id === SESION) return;
      if (d.t === 'hola') {
        canal.postMessage({ t: 'aca-tambien', slug: d.slug, id: SESION });
        avisarDoble();
      } else if (d.t === 'aca-tambien') avisarDoble();
      else if (d.t === 'guardado')
        CK.aviso(
          'La otra pestaña guardó cambios en este proyecto. Si seguís acá, recargá antes (Proyecto → Recargar) para no pisarlos.',
          'info',
          9000
        );
    };
    CK.on('proyecto', () => {
      avisadoDoble = false;
      if (CK.P) canal.postMessage({ t: 'hola', slug: slug(), id: SESION });
    });
    CK.on('guardado', () => CK.P && canal.postMessage({ t: 'guardado', slug: slug(), id: SESION }));
  }

  // ================================================================ recuperar lo no guardado
  const R = (CK.recuperar = {});
  const guardarBorrador = CK.debounce(async () => {
    // con "Preguntar antes de aplicar cambios" prendido, lo no aplicado no se guarda en ningún lado
    if (!CK.P || !CK._sucio || (CK.aplicar && CK.aplicar.prendido())) return;
    try {
      const s = slug(),
        ids = [...(CK._imgSucias || [])].filter(id => CK.img[id]);
      for (const id of ids) await CK.db.set('imagenes', 'recuperar/' + s + '/' + id, await CK.aBlob(CK.img[id]));
      await CK.db.set('ajustes', 'recuperar_' + s, { t: Date.now(), sesion: SESION, json: JSON.stringify(CK.P), imgs: ids });
    } catch (e) {
      console.warn('[recuperar]', e);
    }
  }, 4000);
  CK.on('sucio', v => v && guardarBorrador());
  CK.on('guardado', async () => {
    try {
      if (CK.P) await CK.db.del('ajustes', 'recuperar_' + slug());
    } catch (e) {}
  });
  R.revisar = async () => {
    if (!CK.P) return;
    const s = slug(),
      b = await CK.db.get('ajustes', 'recuperar_' + s);
    if (!b || b.sesion === SESION) return;
    if (
      !(await CK.confirmar(
        'Recuperar cambios sin guardar',
        'El editor se cerró antes de guardar. Encontré cambios del ' + hora(b.t) + '. ¿Los recupero?',
        'Recuperar'
      ))
    ) {
      await CK.db.del('ajustes', 'recuperar_' + s);
      return;
    }
    const actuales = Object.assign({}, CK.img);
    await CK._poner(JSON.parse(b.json), async id => {
      if (b.imgs.includes(id)) {
        const blob = await CK.db.get('imagenes', 'recuperar/' + s + '/' + id);
        if (blob) return CK.cargarImagen(blob);
      }
      return actuales[id] ? CK.copiaLienzo(actuales[id]) : null;
    });
    b.imgs.forEach(id => CK._imgSucias.add(id));
    CK.tocar();
    await CK.guardar({ silencio: true });
    CK.aviso('Cambios recuperados.', 'ok');
  };
  let revisando = false;
  CK.on('proyecto', () => {
    if (revisando) return;
    revisando = true;
    setTimeout(() => R.revisar().finally(() => (revisando = false)), 600);
  });

  // ================================================================ errores amables
  const E = (CK.errores = {});
  const CLAVE = 'ck_errores_v1';
  let lista = [];
  try {
    lista = JSON.parse(localStorage.getItem(CLAVE) || '[]');
  } catch (e) {}
  let ultimoAviso = 0;
  const anotar = (msg, donde) => {
    if (!msg || /ResizeObserver loop|Script error\.?$/i.test(msg)) return;
    const r = { t: Date.now(), msg: String(msg).slice(0, 400), donde: donde || '', seccion: CK.foco || CK.seccion_actual || '' };
    lista.push(r);
    if (lista.length > 40) lista = lista.slice(-40);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch (e) {}
    escribirArchivo();
    if (Date.now() - ultimoAviso > 6000 && CK.aviso) {
      ultimoAviso = Date.now();
      CK.aviso('Algo falló (' + r.msg.slice(0, 90) + '). Quedó anotado: Interfaz → "Ver errores". Tu trabajo no se perdió.', 'error', 7000);
    }
  };
  const escribirArchivo = CK.debounce(async () => {
    const dir = CK.fs && CK.fs.dir('editor');
    if (!dir) return;
    try {
      await CK.fs.escribir(dir, 'trabajo/errores.txt', E.texto());
    } catch (e) {}
  }, 3000);
  E.texto = () =>
    '# Errores del editor (los últimos ' +
    lista.length +
    '). Se reescribe solo.\n' +
    lista
      .map(
        r =>
          '[' +
          new Date(r.t).toLocaleString('es-AR') +
          '] ' +
          (r.seccion ? '(' + r.seccion + ') ' : '') +
          r.msg +
          (r.donde ? '  @ ' + r.donde : '')
      )
      .join('\n') +
    '\n';
  E.lista = () => lista.slice();
  E.limpiar = () => {
    lista = [];
    try {
      localStorage.removeItem(CLAVE);
    } catch (e) {}
  };
  E.ventana = () => {
    const pre = h('pre.errores', lista.length ? E.texto() : 'No hubo errores. 🎉');
    CK.ventana({
      titulo: 'Errores anotados',
      ancho: 680,
      cuerpo: h(
        'div',
        h(
          'p',
          'Si algo no anduvo, esto ayuda a arreglarlo rápido: copialo y pasáselo a Claude. También queda en trabajo/errores.txt cuando la carpeta del editor está conectada.'
        ),
        pre
      ),
      botones: [
        { txt: 'Borrar la lista', valor: () => (E.limpiar(), null) },
        { txt: 'Copiar', valor: () => (navigator.clipboard && navigator.clipboard.writeText(E.texto()), CK.aviso('Copiado'), null) },
        { txt: 'Cerrar', cls: 'pri', valor: null }
      ]
    });
  };
  window.addEventListener('error', e => anotar(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', e => anotar(String((e.reason && e.reason.message) || e.reason || 'promesa sin resolver')));
})();
