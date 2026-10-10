/* BIBLIOTECA: todo lo que se va haciendo en el proyecto, ordenado: sprites, animaciones, personajes, efectos, mapas y tiles,
   con carpetas, búsqueda, etiquetas, vista previa animada y clic derecho para las acciones rápidas. */
'use strict';
(function () {
  const h = CK.h;
  let el,
    izq,
    centro,
    grid,
    der,
    buscarEl,
    rafVista = 0;
  const st = { cat: 'todo', carpeta: null, q: '', orden: 'nombre', tam: 'chico', sel: null, multi: new Set(), ultimo: null };
  const CATS = [
    ['todo', 'Todo', 'assets'],
    ['sprites', 'Sprites', 'imagen'],
    ['anim', 'Animaciones', 'anim'],
    ['personajes', 'Personajes', 'persona'],
    ['fx', 'Efectos (FX)', 'fx'],
    ['mapas', 'Mapas', 'mapa'],
    ['tiles', 'Tiles y texturas', 'mosaico']
  ];
  const clave = it => it.grupo + ':' + it.id;

  // ---------------------------------------------------------------- qué hay en el proyecto
  const catAsset = a =>
    a.tipo === 'fx'
      ? 'fx'
      : a.tipo === 'tileset' || a.tipo === 'textura'
        ? 'tiles'
        : a.cuadros && CK.asset.nCuadros(a) > 1
          ? 'anim'
          : 'sprites';
  const fxMini = (f, tam) => {
    const c = CK.lienzo(tam, tam);
    try {
      const s = CKFx.crear(CK.clone(f), { semilla: 7 }),
        x = CK.ctx(c);
      for (let i = 0; i < Math.ceil(Math.min(f.dur, 1.2) * 0.6 * 60); i++) s.paso(1 / 60);
      x.fillStyle = '#1b1d21';
      x.fillRect(0, 0, tam, tam);
      x.save();
      x.scale(tam / 96, tam / 96);
      s.dibujar(x, 48 - (f.mov ? (f.mov.vx || 0) * 0.3 : 0), 60, id => {
        const a = CK.P.assets[id];
        return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null;
      });
      x.restore();
    } catch (e) {}
    return c;
  };
  const fotosMapa = {};
  const mapaMini = m => {
    const k = m.id + ':' + (m.modificado || 0) + ':' + JSON.stringify((m.capas || []).length);
    if (!fotosMapa[k]) {
      try {
        fotosMapa[k] = CK.mapa.foto(m);
      } catch (e) {
        fotosMapa[k] = CK.lienzo(8, 8);
      }
    }
    return fotosMapa[k];
  };
  const items = () => {
    if (!CK.P) return [];
    const out = [];
    Object.values(CK.P.assets).forEach(a => {
      if (a.tipo === 'capa') return;
      const n = CK.asset.nCuadros(a);
      out.push({
        grupo: 'assets',
        id: a.id,
        nombre: a.nombre,
        cat: catAsset(a),
        carpeta: a.carpeta || '',
        etiquetas: a.etiquetas || [],
        fecha: a.modificado || a.creado || 0,
        peso: a.w * a.h,
        meta:
          (CK.asset.TIPOS[a.tipo] || a.tipo) +
          ' · ' +
          (a.cuadros ? a.cuadros.fw + '×' + a.cuadros.fh + (n > 1 ? ' · ' + n + ' cuadros' : '') : a.w + '×' + a.h),
        img: () => CK.img[a.id],
        cuadro: i => CK.asset.cuadro(a, i),
        n,
        fps: (a.cuadros || {}).fps || 8
      });
    });
    Object.values(CK.P.fx).forEach(f =>
      out.push({
        grupo: 'fx',
        id: f.id,
        nombre: f.nombre || f.id,
        cat: 'fx',
        carpeta: f.carpeta || '',
        etiquetas: f.etiquetas || [],
        fecha: f.modificado || 0,
        peso: (f.capas || []).length,
        meta: 'Efecto · ' + f.dur + ' s' + (f.bucle ? ' · loop' : '') + ' · ' + (f.capas || []).length + ' capas',
        fx: f
      })
    );
    Object.values(CK.P.mapas).forEach(m =>
      out.push({
        grupo: 'mapas',
        id: m.id,
        nombre: m.nombre || m.id,
        cat: 'mapas',
        carpeta: m.carpeta || '',
        etiquetas: m.etiquetas || [],
        fecha: m.modificado || 0,
        peso: (m.w || 0) * (m.h || 0),
        meta: 'Mapa' + (m.w ? ' · ' + m.w + '×' + m.h + ' tiles' : ''),
        mapa: m
      })
    );
    Object.values(CK.P.poses || {}).forEach(p => {
      const ids = [];
      Object.values(p.acciones || {}).forEach(f =>
        Object.values(f).forEach(id => {
          if (CK.P.assets[id]) ids.push(id);
        })
      );
      const a0 = CK.P.assets[(p.acciones.quieto || {}).abajo] || CK.P.assets[ids[0]];
      out.push({
        grupo: 'poses',
        id: p.id,
        nombre: p.nombre,
        cat: 'personajes',
        carpeta: p.carpeta || '',
        etiquetas: [],
        fecha: 0,
        peso: ids.length,
        meta: 'Personaje · ' + Object.keys(p.acciones || {}).length + ' acciones · ' + ids.length + ' animaciones',
        img: a0 ? () => CK.img[a0.id] : null,
        cuadro: a0 ? i => CK.asset.cuadro(a0, i) : null,
        n: a0 ? CK.asset.nCuadros(a0) : 1,
        fps: a0 && a0.cuadros ? a0.cuadros.fps || 8 : 8
      });
    });
    return out;
  };
  const filtrados = () => {
    const q = st.q.toLowerCase().trim();
    let l = items().filter(
      it =>
        (st.cat === 'todo' || it.cat === st.cat) &&
        (st.carpeta === null || it.carpeta === st.carpeta || (st.carpeta && it.carpeta.indexOf(st.carpeta + '/') === 0))
    );
    if (q)
      l = l.filter(it =>
        (it.nombre + ' ' + it.id + ' ' + it.carpeta + ' ' + it.etiquetas.join(' ') + ' ' + it.meta).toLowerCase().includes(q)
      );
    const f = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }),
      reciente: (a, b) => b.fecha - a.fecha,
      tamano: (a, b) => b.peso - a.peso
    }[st.orden];
    return l.sort(f);
  };

  // ---------------------------------------------------------------- miniaturas
  const mini = (it, tam, i) => {
    if (it.fx) return fxMini(it.fx, tam);
    if (it.mapa) return CK.mini(mapaMini(it.mapa), tam);
    const c = it.img && it.img();
    return c ? CK.mini(c, tam, it.cuadro ? it.cuadro(i || 0) : null) : CK.lienzo(tam, tam);
  };
  // la tarjeta bajo el mouse se anima (animaciones y efectos)
  let animada = null;
  const animarTarjeta = (t, it) => {
    animada = {
      t,
      it,
      t0: performance.now(),
      sim: it.fx ? CKFx.crear(CK.clone(Object.assign({}, it.fx, { bucle: true })), { semilla: 7 }) : null,
      u: performance.now()
    };
    const lienzo = t.querySelector('canvas'),
      tam = lienzo.width;
    const paso = now => {
      if (!animada || animada.t !== t || !t.isConnected) return;
      CK.raf(paso);
      const x = CK.ctx(lienzo);
      if (it.fx) {
        const dt = Math.min(0.05, (now - animada.u) / 1000);
        animada.u = now;
        animada.sim.paso(dt);
        x.fillStyle = '#1b1d21';
        x.fillRect(0, 0, tam, tam);
        x.save();
        x.scale(tam / 96, tam / 96);
        animada.sim.dibujar(x, 48, 60, id => {
          const a = CK.P.assets[id];
          return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: k => CK.asset.cuadro(a, k) } : null;
        });
        x.restore();
        return;
      }
      if (!(it.n > 1)) return;
      const i = Math.floor(((now - animada.t0) / 1000) * it.fps) % it.n;
      if (i === animada.i) return;
      animada.i = i;
      x.clearRect(0, 0, tam, tam);
      x.drawImage(mini(it, tam, i), 0, 0);
    };
    CK.raf(paso);
  };

  // ---------------------------------------------------------------- acciones
  const abrir = it => {
    if (it.grupo === 'assets') {
      const a = CK.P.assets[it.id];
      if (a.cuadros && CK.asset.nCuadros(a) > 1) CK.ir('anim', { asset: it.id });
      else CK.ir('pixel', it.id);
    } else if (it.grupo === 'fx') CK.ir('fx', it.id);
    else if (it.grupo === 'mapas') CK.ir('mapa', it.id);
    else if (it.grupo === 'poses') CK.ir('anim', { pose: it.id });
  };
  const renombrar = async it => {
    if (it.grupo === 'assets') return CK.asset.renombrar(it.id);
    const o = CK.P[it.grupo][it.id],
      n = await CK.pedir('Renombrar', 'Nombre', o.nombre || it.id);
    if (!n) return;
    const f = CK.hist.datos('Renombrar', it.grupo, it.id);
    o.nombre = n;
    f();
    CK.emit('assets');
  };
  const duplicar = it => {
    if (it.grupo === 'assets') {
      const n = CK.asset.duplicar(it.id);
      if (n) {
        st.sel = 'assets:' + n.id;
        CK.aviso('Copia creada: ' + n.nombre);
      }
      return;
    }
    const o = CK.clone(CK.P[it.grupo][it.id]);
    let id = it.id + '_copia',
      k = 2;
    while (CK.P[it.grupo][id]) id = it.id + '_copia' + k++;
    o.id = id;
    o.nombre = (o.nombre || it.id) + ' copia';
    CK.P[it.grupo][id] = o;
    CK.hist.push({
      nombre: 'Duplicar',
      deshacer: () => {
        delete CK.P[it.grupo][id];
        CK.emit('assets');
      },
      rehacer: () => {
        CK.P[it.grupo][id] = CK.clone(o);
        CK.emit('assets');
      }
    });
    st.sel = it.grupo + ':' + id;
    CK.emit('assets');
  };
  const borrar = async lista => {
    if (lista.length === 1 && lista[0].grupo === 'assets') {
      if (await CK.asset.preguntarBorrar(lista[0].id)) {
        st.sel = null;
        st.multi.clear();
      }
      return;
    }
    if (
      !(await CK.confirmar(
        'Borrar ' + lista.length + ' elemento(s)',
        lista
          .map(it => it.nombre)
          .slice(0, 8)
          .join(', ') +
          (lista.length > 8 ? '…' : '') +
          '. Se puede deshacer con Ctrl + Z.',
        'Borrar'
      ))
    )
      return;
    const guard = lista.map(it => ({
      it,
      dato: CK.clone(CK.P[it.grupo][it.id]),
      img: it.grupo === 'assets' ? CK.copiaLienzo(CK.img[it.id]) : null
    }));
    const quitar = () =>
      guard.forEach(g => {
        if (g.it.grupo === 'assets') CK.asset.borrar(g.it.id);
        else delete CK.P[g.it.grupo][g.it.id];
      });
    quitar();
    CK.hist.push({
      nombre: 'Borrar de la biblioteca',
      deshacer: () => {
        guard.forEach(g => {
          CK.P[g.it.grupo][g.it.id] = CK.clone(g.dato);
          if (g.img) {
            CK.img[g.it.id] = CK.copiaLienzo(g.img);
            CK._imgSucias.add(g.it.id);
            CK._borradas = (CK._borradas || []).filter(x => x !== g.it.id);
          }
        });
        CK.emit('assets');
      },
      rehacer: () => {
        quitar();
        CK.emit('assets');
      }
    });
    st.sel = null;
    st.multi.clear();
    CK.emit('assets');
  };
  const seleccion = () => {
    const todos = items(),
      ks = st.multi.size ? [...st.multi] : st.sel ? [st.sel] : [];
    return ks.map(k => todos.find(it => clave(it) === k)).filter(Boolean);
  };
  const menuDe = (it, e) => {
    const sel = seleccion();
    if (!sel.some(s => clave(s) === clave(it))) {
      st.sel = clave(it);
      st.multi.clear();
      pintarGrid();
      pintarDer();
    }
    const varios = seleccion();
    if (varios.length > 1)
      return CK.menu(e, [
        { titulo: varios.length + ' elementos' },
        { txt: 'Mover a carpeta…', ico: 'carpeta', on: () => moverCarpeta(varios) },
        varios.every(v => v.grupo === 'assets')
          ? { txt: 'Descargar PNG', ico: 'importar', on: () => varios.forEach(v => CK.asset.bajar(v.id)) }
          : null,
        '-',
        { txt: 'Borrar ' + varios.length, ico: 'basura', peligro: true, on: () => borrar(varios) }
      ]);
    if (it.grupo === 'assets') return CK.menuAsset(it.id, e, [{ txt: 'Abrir', ico: 'ok', tecla: 'Doble clic', on: () => abrir(it) }]);
    CK.menu(e, [
      { titulo: it.nombre },
      { txt: 'Abrir', ico: 'ok', tecla: 'Doble clic', on: () => abrir(it) },
      '-',
      { txt: 'Renombrar…', ico: 'texto', on: () => renombrar(it) },
      it.grupo !== 'poses' ? { txt: 'Duplicar', ico: 'duplicar', on: () => duplicar(it) } : null,
      { txt: 'Mover a carpeta…', ico: 'carpeta', on: () => moverCarpeta([it]) },
      it.grupo === 'mapas'
        ? {
            txt: 'Guardar imagen del mapa',
            ico: 'importar',
            on: async () => CK.descargar(await CK.aBlob(CK.mapa.foto(it.mapa)), it.id + '.png')
          }
        : null,
      '-',
      { txt: 'Borrar', ico: 'basura', peligro: true, on: () => borrar([it]) }
    ]);
  };
  const moverCarpeta = async lista => {
    const grupos = {};
    lista.forEach(it => {
      (grupos[it.grupo] = grupos[it.grupo] || []).push(it.id);
    });
    const gs = Object.keys(grupos);
    if (gs.length === 1) return CK.asset.aCarpeta(grupos[gs[0]], gs[0]);
    for (const g of gs) await CK.asset.aCarpeta(grupos[g], g);
  };
  const importar = async archivos => {
    const fs = archivos || (await CK.elegirArchivos('image/png,image/gif,image/jpeg,image/webp', true));
    if (!fs.length) return;
    const tipo = { tiles: 'textura', fx: 'fx', personajes: 'personaje' }[st.cat] || 'sprite',
      nuevos = await CK.importarImagenes(tipo, fs);
    nuevos.forEach(a => {
      if (st.carpeta) a.carpeta = st.carpeta;
      // una tira de cuadros cuadrados se reconoce sola en Animaciones
      if (st.cat === 'anim' && a.w > a.h && a.w % a.h === 0) {
        a.cuadros = { fw: a.h, fh: a.h, fps: 8, bucle: true };
        a.tipo = 'hoja';
      }
    });
    if (nuevos.length) {
      st.sel = 'assets:' + nuevos[0].id;
      CK.emit('assets');
    }
  };

  // ---------------------------------------------------------------- paneles
  const pintarIzq = () => {
    if (!izq) return;
    CK.vaciar(izq);
    const todos = items(),
      l = h('div.lista');
    CATS.forEach(([id, nom, ico]) => {
      const n = id === 'todo' ? todos.length : todos.filter(it => it.cat === id).length;
      const b = h(
        'div.item' + (st.cat === id ? '.activo' : ''),
        {
          onclick: () => {
            st.cat = id;
            st.carpeta = null;
            pintarTodo();
          }
        },
        h('span', { html: CK.ico(ico, 16) }),
        h('span.nombre', nom),
        h('span.sub', String(n))
      );
      l.append(b);
    });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Categorías'), l));
    const enCat = todos.filter(it => st.cat === 'todo' || it.cat === st.cat),
      cs = {};
    enCat.forEach(it => {
      if (!it.carpeta) return;
      const partes = it.carpeta.split('/');
      partes.forEach((p, i) => {
        const k = partes.slice(0, i + 1).join('/');
        cs[k] = (cs[k] || 0) + 1;
      });
    });
    const lc = h('div.lista'),
      sin = enCat.filter(it => !it.carpeta).length;
    lc.append(
      h(
        'div.item' + (st.carpeta === null ? '.activo' : ''),
        {
          onclick: () => {
            st.carpeta = null;
            pintarTodo();
          }
        },
        h('span', { html: CK.ico('carpeta', 15) }),
        h('span.nombre', 'Todas'),
        h('span.sub', String(enCat.length))
      )
    );
    Object.keys(cs)
      .sort()
      .forEach(k => {
        const prof = k.split('/').length - 1;
        const it = h(
          'div.item' + (st.carpeta === k ? '.activo' : ''),
          {
            style: { paddingLeft: 8 + prof * 14 + 'px' },
            onclick: () => {
              st.carpeta = k;
              pintarTodo();
            },
            oncontextmenu: e =>
              CK.menu(e, [
                { titulo: k },
                { txt: 'Renombrar carpeta…', ico: 'texto', on: () => renombrarCarpeta(k) },
                { txt: 'Quitar carpeta (sus cosas quedan sueltas)', ico: 'cerrar', on: () => renombrarCarpeta(k, '') }
              ])
          },
          h('span', { html: CK.ico('carpeta', 15) }),
          h('span.nombre', k.split('/').pop()),
          h('span.sub', String(cs[k]))
        );
        lc.append(it);
      });
    if (sin && Object.keys(cs).length)
      lc.append(
        h(
          'div.item' + (st.carpeta === '' ? '.activo' : ''),
          {
            onclick: () => {
              st.carpeta = '';
              pintarTodo();
            }
          },
          h('span', { html: CK.ico('menos', 15) }),
          h('span.nombre', 'Sin carpeta'),
          h('span.sub', String(sin))
        )
      );
    izq.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Carpetas'),
        lc,
        h(
          'p.nota-txt',
          { style: { marginTop: '6px' } },
          'Clic derecho sobre algo → "Mover a carpeta…". Con "/" se hacen subcarpetas: personajes/aldea.'
        )
      )
    );
    izq.append(
      h(
        'div.bloque',
        CK.btn({
          ico: 'importar',
          txt: 'Importar imágenes',
          cls: 'pri',
          desc: 'Trae PNG/GIF/JPG al proyecto, en la categoría y carpeta que estás viendo. También podés soltarlas sobre la biblioteca.',
          on: () => importar()
        })
      )
    );
  };
  const renombrarCarpeta = async (vieja, nueva) => {
    if (nueva === undefined) {
      nueva = await CK.pedir('Renombrar carpeta', 'Nombre (con "/" para subcarpetas)', vieja);
      if (nueva === null) return;
    }
    nueva = (nueva || '').trim().replace(/^\/+|\/+$/g, '');
    const cambios = [];
    ['assets', 'fx', 'mapas', 'poses'].forEach(g =>
      Object.values(CK.P[g] || {}).forEach(o => {
        if (o.carpeta === vieja || (o.carpeta || '').indexOf(vieja + '/') === 0)
          cambios.push([g, o.id, o.carpeta, nueva ? nueva + o.carpeta.slice(vieja.length) : '']);
      })
    );
    const poner = i =>
      cambios.forEach(c => {
        const o = CK.P[c[0]][c[1]];
        if (!o) return;
        if (c[i]) o.carpeta = c[i];
        else delete o.carpeta;
      });
    poner(3);
    CK.hist.push({
      nombre: 'Renombrar carpeta',
      deshacer: () => {
        poner(2);
        CK.emit('assets');
      },
      rehacer: () => {
        poner(3);
        CK.emit('assets');
      }
    });
    st.carpeta = nueva || null;
    CK.emit('assets');
  };
  const pintarGrid = () => {
    if (!grid) return;
    CK.vaciar(grid);
    const l = filtrados(),
      tam = st.tam === 'grande' ? 96 : 56;
    grid.classList.toggle('grande', st.tam === 'grande');
    if (!l.length) {
      grid.append(
        h(
          'div.nota-txt',
          { style: { gridColumn: '1 / -1', padding: '20px' } },
          st.q
            ? 'Nada coincide con "' + st.q + '".'
            : 'No hay nada acá todavía. Lo que hagas en las otras secciones (dibujos, animaciones, efectos, mapas) aparece solo.'
        )
      );
      return;
    }
    l.forEach((it, idx) => {
      const k = clave(it),
        t = h(
          'button.bib-tarjeta' + (st.sel === k || st.multi.has(k) ? '.activo' : ''),
          {
            type: 'button',
            draggable: it.grupo === 'assets' ? 'true' : null,
            onclick: e => {
              if (e.ctrlKey || e.metaKey) {
                if (st.multi.size === 0 && st.sel) st.multi.add(st.sel);
                st.multi.has(k) ? st.multi.delete(k) : st.multi.add(k);
                st.sel = k;
              } else if (e.shiftKey && st.ultimo !== null) {
                const a = Math.min(st.ultimo, idx),
                  b = Math.max(st.ultimo, idx);
                st.multi = new Set(l.slice(a, b + 1).map(clave));
                st.sel = k;
              } else {
                st.multi.clear();
                st.sel = k;
                st.ultimo = idx;
              }
              pintarGrid();
              pintarDer();
            },
            ondblclick: () => abrir(it),
            oncontextmenu: e => menuDe(it, e),
            ondragstart: e => e.dataTransfer.setData('text/ck-asset', it.id),
            onpointerenter: () => {
              if ((it.n > 1 || it.fx) && !animada) animarTarjeta(t, it);
            },
            onpointerleave: () => {
              if (animada && animada.t === t) {
                animada = null;
                const c = t.querySelector('canvas');
                CK.ctx(c).clearRect(0, 0, c.width, c.height);
                CK.ctx(c).drawImage(mini(it, tam), 0, 0);
              }
            }
          },
          mini(it, tam),
          h('span.tn', it.nombre),
          h(
            'span.bib-meta',
            it.carpeta && st.carpeta === null ? it.carpeta : CATS.find(c => c[0] === it.cat)[1].replace(/ \(FX\)| y texturas/, '')
          ),
          it.n > 1 ? h('span.marca-t', String(it.n)) : null
        );
      CK.tip(t, it.nombre, it.meta + (it.carpeta ? ' · carpeta ' + it.carpeta : '') + '. Doble clic: abrir. Clic derecho: opciones.');
      grid.append(t);
    });
  };
  const pintarDer = () => {
    if (!der) return;
    CK.vaciar(der);
    CK.caf(rafVista);
    const sel = seleccion();
    if (sel.length > 1) {
      der.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', sel.length + ' elementos'),
          h('p.nota-txt', sel.map(s => s.nombre).join(', ')),
          h(
            'div.fila',
            { style: { marginTop: '8px' } },
            CK.btn({ ico: 'carpeta', txt: 'Mover a carpeta', cls: 'chico', on: () => moverCarpeta(sel) }),
            CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'chico peligro', on: () => borrar(sel) })
          )
        )
      );
      return;
    }
    const it = sel[0];
    if (!it) {
      der.append(
        CK.vacio(
          'assets',
          'Biblioteca del proyecto',
          'Elegí algo para verlo en grande. Doble clic lo abre en su sección; clic derecho muestra las acciones rápidas.'
        )
      );
      return;
    }
    // vista previa grande (animada)
    const T = 268,
      cv = CK.lienzo(T, T);
    cv.className = 'repro';
    cv.style.width = cv.style.height = T + 'px';
    const sim = it.fx ? CKFx.crear(CK.clone(Object.assign({}, it.fx, { bucle: true })), { semilla: 7 }) : null;
    let u = performance.now();
    const t0 = u;
    const dib = now => {
      if (!cv.isConnected) return;
      rafVista = CK.raf(dib);
      const x = CK.ctx(cv);
      if (sim) {
        sim.paso(Math.min(0.05, (now - u) / 1000));
        u = now;
        x.fillStyle = '#1b1d21';
        x.fillRect(0, 0, T, T);
        x.save();
        x.scale(2, 2);
        sim.dibujar(x, T / 4, T / 2.6, id => {
          const a = CK.P.assets[id];
          return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: k => CK.asset.cuadro(a, k) } : null;
        });
        x.restore();
        return;
      }
      CK.cuadros(x, T, T, 8);
      const i = it.n > 1 ? Math.floor(((now - t0) / 1000) * it.fps) % it.n : 0;
      x.drawImage(mini(it, T, i), 0, 0);
    };
    rafVista = CK.raf(dib);
    der.append(h('div.bloque', h('div', { style: { display: 'grid', placeItems: 'center' } }, cv)));
    const o = CK.P[it.grupo][it.id];
    const datos = h(
      'div.bloque',
      h('h3.bloque-tit', it.nombre),
      h('p.nota-txt', it.meta),
      CK.campo(
        'Nombre',
        CK.txt(it.nombre, v => {
          if (!v || v === o.nombre) return;
          const f = CK.hist.datos('Renombrar', it.grupo, it.id);
          o.nombre = v;
          f();
          CK.emit('assets');
        })
      ),
      h(
        'div.fila.junto',
        CK.campo(
          'Carpeta',
          h(
            'div.fila.junto',
            h('span.nota-txt.crece', it.carpeta || '(ninguna)'),
            CK.btn({ ico: 'carpeta', txt: 'Cambiar', cls: 'chico', on: () => moverCarpeta([it]) })
          )
        )
      ),
      it.grupo === 'assets'
        ? CK.campo(
            'Etiquetas',
            CK.txt((o.etiquetas || []).join(', '), v => {
              const f = CK.hist.datos('Etiquetas', 'assets', it.id);
              o.etiquetas = v
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);
              f();
              CK.emit('assets');
            }),
            'Palabras para encontrarlo con la búsqueda, separadas por coma.'
          )
        : null
    );
    if (it.grupo === 'assets') {
      const a = o;
      let usos = 0,
        mapas = new Set();
      Object.values(CK.P.mapas).forEach(m =>
        CK.mapa.objetosDe(m).forEach(ob => {
          if (ob.asset === a.id) {
            usos++;
            mapas.add(m.nombre);
          }
        })
      );
      datos.append(
        CK.campo(
          'Categoría',
          CK.sel(
            a.tipo,
            Object.keys(CK.asset.TIPOS).map(k => [k, CK.asset.TIPOS[k]]),
            v => {
              const f = CK.hist.datos('Categoría', 'assets', a.id);
              a.tipo = v;
              f();
              CK.emit('assets');
            }
          )
        ),
        h(
          'p.nota-txt',
          (a.origen ? 'Origen: ' + a.origen + '. ' : '') +
            (a.creado ? 'Creado ' + CK.fecha(a.creado) + '. ' : '') +
            (a.modificado ? 'Cambiado ' + CK.fecha(a.modificado) + '.' : '')
        ),
        h('p.nota-txt', usos ? 'Se usa ' + usos + ' vez/veces en: ' + [...mapas].join(', ') + '.' : 'No se usa en ningún mapa.')
      );
    }
    der.append(
      datos,
      h(
        'div.bloque',
        h(
          'div.fila',
          CK.btn({ ico: 'ok', txt: 'Abrir', cls: 'chico pri', on: () => abrir(it) }),
          it.grupo !== 'poses' ? CK.btn({ ico: 'duplicar', txt: 'Duplicar', cls: 'chico', on: () => duplicar(it) }) : null,
          it.grupo === 'assets' ? CK.btn({ ico: 'importar', txt: 'PNG', cls: 'chico', on: () => CK.asset.bajar(it.id) }) : null,
          CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'chico peligro', on: () => borrar([it]) })
        )
      )
    );
  };
  const pintarTodo = () => {
    pintarIzq();
    pintarGrid();
    pintarDer();
  };

  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '230px 1fr 300px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    der = h('aside.panel');
    buscarEl = h('input.in', {
      type: 'search',
      placeholder: 'Buscar por nombre, carpeta o etiqueta…',
      style: { maxWidth: '320px' },
      oninput: e => {
        st.q = e.target.value;
        pintarGrid();
      }
    });
    grid = h('div.bib-grid', {
      oncontextmenu: e => {
        if (e.target === grid)
          CK.menu(e, [
            { txt: 'Importar imágenes…', ico: 'importar', on: () => importar() },
            {
              txt: 'Seleccionar todo',
              ico: 'seleccionar',
              tecla: 'Ctrl + A',
              on: () => {
                st.multi = new Set(filtrados().map(clave));
                pintarGrid();
                pintarDer();
              }
            }
          ]);
      }
    });
    const angosto = (e, w) => {
      e.style.width = w + 'px';
      e.style.flex = 'none';
      return e;
    };
    const barra = h(
      'div.fila',
      {
        style: { padding: '10px 12px', borderBottom: '1px solid var(--linea)', background: 'var(--panel)', gap: '8px', flexWrap: 'nowrap' }
      },
      buscarEl,
      h('span.crece'),
      h('span.nota-txt', 'Ordenar'),
      angosto(
        CK.sel(
          st.orden,
          [
            ['nombre', 'Por nombre'],
            ['reciente', 'Más recientes'],
            ['tamano', 'Más grandes']
          ],
          v => {
            st.orden = v;
            pintarGrid();
          }
        ),
        150
      ),
      angosto(
        CK.sel(
          st.tam,
          [
            ['chico', 'Miniaturas chicas'],
            ['grande', 'Miniaturas grandes']
          ],
          v => {
            st.tam = v;
            pintarGrid();
          }
        ),
        170
      )
    );
    centro = h(
      'div',
      { style: { display: 'grid', gridTemplateRows: 'auto 1fr', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } },
      barra,
      h('div', { style: { overflow: 'auto', minHeight: 0 } }, grid)
    );
    el.append(izq, centro, der);
    CK.soltarEn(centro, fs => importar(fs));
    const re = () => {
      if (CK.seccionVisible('biblioteca')) pintarTodo();
    };
    CK.on('assets', re);
    CK.on('datos', re);
    CK.on('proyecto', () => {
      st.sel = null;
      st.multi.clear();
      re();
    });
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && arg.asset && CK.P.assets[arg.asset]) {
      const a = CK.P.assets[arg.asset];
      st.cat = catAsset(a);
      st.carpeta = null;
      st.sel = 'assets:' + a.id;
      st.multi.clear();
    }
    pintarTodo();
    if (buscarEl) buscarEl.value = st.q;
    const s = grid && grid.querySelector('.bib-tarjeta.activo');
    if (s) s.scrollIntoView({ block: 'nearest' });
  };
  const tecla = (e, k, ctrl) => {
    if (ctrl && k === 'a') {
      st.multi = new Set(filtrados().map(clave));
      pintarGrid();
      pintarDer();
      return true;
    }
    if (k === 'delete') {
      const s = seleccion();
      if (s.length) borrar(s);
      return true;
    }
    if (k === 'f2') {
      const s = seleccion();
      if (s.length === 1) renombrar(s[0]);
      return true;
    }
    if (k === 'enter') {
      const s = seleccion();
      if (s.length === 1) abrir(s[0]);
      return true;
    }
    if (ctrl && k === 'f') {
      buscarEl.focus();
      return true;
    }
    return false;
  };
  CK.registrar({
    id: 'biblioteca',
    nombre: 'Biblioteca',
    corto: 'Biblio',
    ico: 'assets',
    desc: 'Todo el proyecto ordenado: sprites, animaciones, personajes, efectos, mapas y tiles, con carpetas y búsqueda.',
    crear,
    mostrar,
    tecla,
    alCambiarProyecto: () => {
      st.sel = null;
      st.multi.clear();
      st.carpeta = null;
    }
  });
})();
