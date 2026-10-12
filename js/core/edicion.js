/* EDICIÓN DESDE LA BIBLIOTECA: "Modificar" abre una cosa guardada en su sección y muestra una barra arriba con
   Guardar cambios · Guardar como nuevo · Descartar. Antes de empezar se saca una foto de cómo estaba, así
   "como nuevo" y "descartar" dejan el original intacto (y se puede deshacer). */
'use strict';
(function () {
  const h = CK.h;
  const E = (CK.edicion = { actual: null });
  const NOMBRES = { assets: 'asset', fx: 'efecto', mapas: 'mapa', poses: 'personaje', npcs: 'personaje', luces: 'luz' };

  /** A qué secciones se puede ir a modificar cada cosa. */
  E.destinos = (grupo, id) => {
    if (grupo === 'fx') return [{ sec: 'fx', arg: id, txt: 'Efectos (FX)', ico: 'fx' }];
    if (grupo === 'mapas') return [{ sec: 'mapa', arg: id, txt: 'Mapa', ico: 'mapa' }];
    if (grupo === 'poses') return [{ sec: 'anim', arg: { pose: id }, txt: 'Animar (personaje)', ico: 'anim' }];
    if (grupo === 'npcs') return [{ sec: 'npc', arg: id, txt: 'NPC', ico: 'persona' }];
    if (grupo !== 'assets') return [];
    const a = CK.P.assets[id];
    if (!a) return [];
    const anim = a.cuadros && CK.asset.nCuadros(a) > 1,
      l = [];
    if (anim) l.push({ sec: 'anim', arg: { asset: id }, txt: 'Animar (cuadros y tiempos)', ico: 'anim' });
    if (a.tipo === 'textura' || a.tipo === 'tileset')
      l.push({ sec: 'texturas', arg: a.tipo === 'tileset' ? { tileset: id } : id, txt: 'Texturas y tiles', ico: 'mosaico' });
    l.push({ sec: 'pixel', arg: id, txt: anim ? 'Pixel art (retocar cuadros)' : 'Pixel art', ico: 'lapiz' });
    return l;
  };

  // ---------------------------------------------------------------- fotos (cómo estaba)
  const foto = (grupo, id) => {
    if (grupo !== 'assets') return { d: CK.clone(CK.P[grupo][id]) };
    return {
      a: CK.clone(CK.P.assets[id]),
      img: CK.copiaLienzo(CK.img[id]),
      pixel: CK.P.pixel[id] ? CK.clone(CK.P.pixel[id]) : null,
      capas: Object.values(CK.P.assets)
        .filter(c => c.de === id)
        .map(c => ({ id: c.id, a: CK.clone(c), img: CK.img[c.id] ? CK.copiaLienzo(CK.img[c.id]) : null }))
    };
  };
  const poner = (grupo, id, f) => {
    if (grupo !== 'assets') {
      if (CK.P[grupo][id]) CK.reconciliar(CK.P[grupo][id], CK.clone(f.d));
      else CK.P[grupo][id] = CK.clone(f.d);
      CK.emit('datos', grupo, id);
      CK.emit('assets');
      return;
    }
    const sucias = (CK._imgSucias = CK._imgSucias || new Set());
    // capas de Pixel art: las que no estaban se borran, las que estaban vuelven
    const ya = new Set(f.capas.map(c => c.id));
    Object.values(CK.P.assets)
      .filter(c => c.de === id && !ya.has(c.id))
      .forEach(c => {
        delete CK.P.assets[c.id];
        delete CK.img[c.id];
        (CK._borradas = CK._borradas || []).push(c.id);
      });
    f.capas.forEach(c => {
      CK.P.assets[c.id] = CK.clone(c.a);
      if (c.img) CK.img[c.id] = CK.copiaLienzo(c.img);
      sucias.add(c.id);
    });
    if (CK.P.assets[id]) CK.reconciliar(CK.P.assets[id], CK.clone(f.a));
    else CK.P.assets[id] = CK.clone(f.a);
    CK.img[id] = CK.copiaLienzo(f.img);
    sucias.add(id);
    if (f.pixel) CK.P.pixel[id] = CK.clone(f.pixel);
    else delete CK.P.pixel[id];
    CK.emit('asset-img', id);
    CK.emit('assets', id);
    if (CK.pixel && CK.pixel.S.id === id && CK.seccionVisible('pixel')) CK.pixel.abrir(id);
  };
  /** Vuelve a como estaba (con deshacer). */
  const restaurar = (grupo, id, original, nombre) => {
    const ahora = foto(grupo, id);
    poner(grupo, id, original);
    CK.hist.push({ nombre, deshacer: () => poner(grupo, id, ahora), rehacer: () => poner(grupo, id, original) });
  };
  const refrescarSeccion = () => {
    const a = E.actual;
    if (a && CK.seccionVisible(a.destino.sec)) CK.ir(a.destino.sec, a.destino.arg);
  };

  // ---------------------------------------------------------------- empezar y terminar
  E.empezar = (grupo, id, destino) => {
    const o = grupo === 'assets' ? CK.P.assets[id] : CK.P[grupo] && CK.P[grupo][id];
    if (!o) return;
    if (E.actual && !(E.actual.grupo === grupo && E.actual.id === id)) E.terminar();
    destino = destino || E.destinos(grupo, id)[0];
    if (!destino) return;
    const nuevo = !E.actual;
    if (nuevo) E.actual = { grupo, id, nombre: o.nombre || id, destino, desde: CK.seccion_actual };
    else E.actual.destino = destino;
    CK.ir(destino.sec, destino.arg);
    // la foto se saca ya abierto: algunas secciones completan valores al abrir y eso no cuenta como cambio
    if (nuevo) E.actual.foto = foto(grupo, id);
    pintarBarra();
  };
  /** ¿Cambió desde la foto f0? */
  const cambioDesde = (grupo, id, f0) => {
    const f = foto(grupo, id);
    if (grupo !== 'assets') return JSON.stringify(f.d) !== JSON.stringify(f0.d);
    return (
      JSON.stringify(Object.assign({}, f.a, { modificado: 0 })) !== JSON.stringify(Object.assign({}, f0.a, { modificado: 0 })) ||
      !!CK.difLienzo(f0.img, f.img) ||
      JSON.stringify(f.pixel) !== JSON.stringify(f0.pixel)
    );
  };
  E.cambio = () => {
    const a = E.actual;
    return !!a && cambioDesde(a.grupo, a.id, a.foto);
  };
  /** Copia de un asset con todo lo suyo (cuadros, eventos, marca, colisión). */
  const duplicarAsset = (id, nombre) => {
    const n = CK.asset.duplicar(id, nombre);
    if (!n) return null;
    const src = CK.P.assets[id];
    ['ev', 'marca', 'notas', 'sombra', 'col', 'extra', 'fxPrueba', 'receta', 'base'].forEach(k => {
      if (src[k] !== undefined && n[k] === undefined) n[k] = CK.clone(src[k]);
    });
    return n;
  };
  // para otras secciones (Animar usa lo mismo para "Guardar: sobrescribir o copia")
  E.foto = foto;
  E.restaurar = restaurar;
  E.cambioDesde = cambioDesde;
  E.duplicarAsset = duplicarAsset;
  /**
   * Guardar un asset que se estuvo editando, preguntando si sobrescribir o guardar como copia.
   * f0 = foto de cómo estaba al abrirlo. Devuelve el id que queda abierto (el mismo o la copia) o null.
   */
  E.guardarAsset = async (id, f0) => {
    const a = CK.P.assets[id];
    if (!a) return null;
    if (!f0 || !cambioDesde('assets', id, f0)) {
      await CK.guardar();
      CK.aviso('No había cambios sin guardar en «' + a.nombre + '». Proyecto guardado.', 'info');
      return id;
    }
    const r = await CK.ventana({
      titulo: 'Guardar «' + a.nombre + '»',
      cuerpo: h(
        'div',
        h('p', 'Cambiaste esta animación. ¿Cómo la querés guardar?'),
        h(
          'p.nota-txt',
          'Sobrescribir: los cambios quedan en la original (y en todos los mapas que la usan). Como copia: se crea una nueva con los cambios y la original queda como estaba.'
        )
      ),
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Guardar como copia', valor: 'copia' },
        { txt: 'Sobrescribir', cls: 'pri', valor: 'sobre' }
      ]
    });
    if (!r) return null;
    if (r === 'sobre') {
      await CK.guardar();
      CK.aviso('Guardado: «' + a.nombre + '».', 'ok');
      return id;
    }
    const nombre = await CK.pedir('Guardar como copia', 'Nombre de la copia', a.nombre + ' (copia)');
    if (!nombre) return null;
    const n = duplicarAsset(id, nombre);
    restaurar('assets', id, f0, 'Original sin cambios');
    CK.emit('assets');
    await CK.guardar();
    CK.aviso('Guardada la copia «' + nombre + '». La original quedó como estaba.', 'ok');
    return n.id;
  };
  E.terminar = () => {
    E.actual = null;
    pintarBarra();
  };
  const volver = (grupo, id) => {
    CK.ir('biblioteca');
    if (CK.biblioteca && CK.biblioteca.elegir) CK.biblioteca.elegir(grupo, id);
  };
  /** Guardar cambios: quedan en el original. */
  E.guardar = async () => {
    const a = E.actual;
    if (!a) return;
    E.terminar();
    await CK.guardar();
    CK.aviso('Cambios guardados en «' + (nombreDe(a.grupo, a.id) || a.nombre) + '».', 'ok');
    volver(a.grupo, a.id);
  };
  const nombreDe = (grupo, id) => {
    const o = CK.P[grupo] && CK.P[grupo][id];
    return o && (o.nombre || id);
  };
  /** Guardar como nuevo: lo de ahora pasa a ser una cosa nueva y el original vuelve a como estaba. */
  E.comoNuevo = async () => {
    const a = E.actual;
    if (!a) return;
    if (CK.pixel && CK.pixel.soltar) CK.pixel.soltar();
    const nombre = await CK.pedir('Guardar como nuevo', 'Nombre del nuevo ' + (NOMBRES[a.grupo] || 'elemento'), a.nombre + ' (nuevo)');
    if (!nombre) return;
    let nuevo;
    if (a.grupo === 'assets') {
      const n = duplicarAsset(a.id, nombre);
      if (!n) return;
      nuevo = n.id;
    } else {
      const o = CK.clone(CK.P[a.grupo][a.id]);
      let id = (CK.slug(nombre) || a.id + '_nuevo').slice(0, 40),
        k = 2;
      const base = id;
      while (CK.P[a.grupo][id]) id = base + '_' + k++;
      o.id = id;
      o.nombre = nombre;
      o.modificado = Date.now();
      CK.P[a.grupo][id] = o;
      CK.hist.push({
        nombre: 'Guardar como nuevo',
        deshacer: () => {
          delete CK.P[a.grupo][id];
          CK.emit('assets');
        },
        rehacer: () => {
          CK.P[a.grupo][id] = CK.clone(o);
          CK.emit('assets');
        }
      });
      nuevo = id;
    }
    restaurar(a.grupo, a.id, a.foto, 'Original sin cambios');
    E.terminar();
    CK.emit('assets');
    await CK.guardar();
    CK.aviso('Guardado como «' + nombre + '». El original quedó como estaba.', 'ok');
    volver(a.grupo, nuevo);
  };
  /** Descartar: vuelve a como estaba antes de "Modificar". */
  E.descartar = async () => {
    const a = E.actual;
    if (!a) return;
    if (
      E.cambio() &&
      !(await CK.confirmar('Descartar cambios', 'Vuelve «' + a.nombre + '» a como estaba antes de modificarlo.', 'Descartar'))
    )
      return;
    if (CK.pixel && CK.pixel.soltar) CK.pixel.soltar();
    if (E.cambio()) restaurar(a.grupo, a.id, a.foto, 'Descartar cambios');
    refrescarSeccion();
    E.terminar();
    volver(a.grupo, a.id);
  };

  // ---------------------------------------------------------------- la barra de arriba
  let barra = null;
  const pintarBarra = () => {
    const a = E.actual;
    if (!a) {
      if (barra) barra.remove();
      barra = null;
      document.body.classList.remove('editando-bib');
      return;
    }
    if (!barra) {
      barra = h('div.edicion-barra');
      document.body.append(barra);
    }
    document.body.classList.add('editando-bib');
    const dest = E.destinos(a.grupo, a.id);
    barra.replaceChildren(
      ...[
        h('span', { html: CK.ico('lapiz', 15) }),
        h('span.ed-txt', 'Modificando ', h('b', '«' + (nombreDe(a.grupo, a.id) || a.nombre) + '»'), ' de la Biblioteca'),
        dest.length > 1
          ? CK.sel(
              dest.indexOf(dest.find(d => d.sec === a.destino.sec)) + '',
              dest.map((d, i) => [i + '', 'en ' + d.txt]),
              v => E.empezar(a.grupo, a.id, dest[+v])
            )
          : null,
        CK.btn({ ico: 'guardar', txt: 'Guardar cambios', cls: 'chico pri', desc: 'Los cambios quedan en el original.', on: E.guardar }),
        CK.btn({
          ico: 'duplicar',
          txt: 'Guardar como nuevo',
          cls: 'chico',
          desc: 'Lo que hiciste se guarda como uno nuevo y el original queda como estaba.',
          on: E.comoNuevo
        }),
        CK.btn({ ico: 'cerrar', txt: 'Descartar', cls: 'chico', desc: 'Vuelve a como estaba antes de modificarlo.', on: E.descartar })
      ].filter(Boolean)
    );
  };
  CK.on('proyecto', () => E.terminar());
  CK.on('assets', () => {
    const a = E.actual;
    if (a && !(a.grupo === 'assets' ? CK.P.assets[a.id] : CK.P[a.grupo] && CK.P[a.grupo][a.id])) E.terminar();
  });
})();
