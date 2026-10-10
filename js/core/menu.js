/* MENÚ CONTEXTUAL: el menú de opciones rápidas del clic derecho, para cualquier sección.
   CK.menu(evento, items)   items = [{ txt, ico, tecla, on(), off, peligro, activo, sub: [...] } | '-' | { titulo }]
   CK.menuAsset(id, evento, extra)  las acciones de siempre sobre un asset (abrir, animar, duplicar, renombrar, carpeta, bajar, borrar). */
'use strict';
(function () {
  const h = CK.h;
  let abierto = null,
    D = document, // documento donde se abrió (la ventana principal o una sección llevada a otra pantalla)
    W = window;
  const cerrar = () => {
    if (!abierto) return;
    abierto.forEach(m => m.remove());
    abierto = null;
    D.removeEventListener('pointerdown', fuera, true);
    D.removeEventListener('keydown', teclas, true);
    W.removeEventListener('blur', cerrar);
    W.removeEventListener('resize', cerrar);
  };
  const fuera = e => {
    if (abierto && !abierto.some(m => m.contains(e.target))) cerrar();
  };
  const teclas = e => {
    if (!abierto) return;
    const m = abierto[abierto.length - 1],
      ops = [...m.querySelectorAll('.menu-op:not(.off)')],
      i = ops.indexOf(D.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (abierto.length > 1) {
        abierto.pop().remove();
        const p = abierto[abierto.length - 1].querySelector('.menu-op.abre');
        if (p) p.focus();
      } else cerrar();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const n = ops.length;
      if (!n) return;
      ops[(i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n].focus();
      return;
    }
    if (e.key === 'ArrowRight' && i >= 0 && ops[i].classList.contains('tiene-sub')) {
      e.preventDefault();
      ops[i].dispatchEvent(new Event('abrir'));
      return;
    }
    if (e.key === 'ArrowLeft' && abierto.length > 1) {
      e.preventDefault();
      abierto.pop().remove();
      return;
    }
    if (e.key === 'Enter' && i >= 0) {
      e.preventDefault();
      e.stopPropagation();
      ops[i].click();
    }
  };
  /** Arma una caja de menú en (x, y). nivel = 0 para el principal. */
  const caja = (items, x, y, nivel) => {
    const m = h('div.menu-ctx', { role: 'menu', oncontextmenu: e => e.preventDefault() });
    items
      .filter(it => it !== null && it !== undefined && it !== false)
      .forEach((it, k, arr) => {
        if (it === '-') {
          if (k && arr[k - 1] !== '-' && k < arr.length - 1) m.append(h('div.menu-sep'));
          return;
        }
        if (it.titulo) {
          m.append(h('div.menu-tit', it.titulo));
          return;
        }
        const sub = it.sub && it.sub.filter(Boolean).length ? it.sub : null;
        const b = h(
          'button.menu-op' +
            (it.off ? '.off' : '') +
            (it.peligro ? '.peligro' : '') +
            (sub ? '.tiene-sub' : '') +
            (it.activo ? '.marcado' : ''),
          { type: 'button', role: 'menuitem', tabindex: '-1' },
          h('span.menu-ico', { html: it.ico ? CK.ico(it.ico, 15) : it.activo ? CK.ico('ok', 15) : '' }),
          h('span.menu-txt', it.txt),
          it.tecla ? h('span.menu-tecla', it.tecla) : null,
          sub ? h('span.menu-flecha', '›') : null
        );
        if (it.desc) b.title = it.desc;
        const abrirSub = () => {
          while (abierto.length > nivel + 1) abierto.pop().remove();
          m.querySelectorAll('.abre').forEach(q => q.classList.remove('abre'));
          if (!sub) return;
          b.classList.add('abre');
          const r = b.getBoundingClientRect();
          const s = caja(sub, r.right - 4, r.top - 4, nivel + 1);
          const r2 = s.getBoundingClientRect();
          if (r2.right > W.innerWidth - 4) s.style.left = Math.max(4, r.left - r2.width + 4) + 'px';
          const op = s.querySelector('.menu-op:not(.off)');
          if (op) op.focus();
        };
        b.addEventListener('pointerenter', () => {
          if (!it.off) {
            b.focus();
            abrirSub();
          }
        });
        b.addEventListener('abrir', abrirSub);
        b.addEventListener('click', e => {
          e.stopPropagation();
          if (it.off) return;
          if (sub) {
            abrirSub();
            return;
          }
          cerrar();
          if (it.on)
            setTimeout(() => {
              try {
                it.on();
              } catch (er) {
                console.error(er);
                CK.aviso(er.message, 'error');
              }
            }, 0);
        });
        m.append(b);
      });
    D.body.append(m);
    abierto.push(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(x, W.innerWidth - r.width - 4)) + 'px';
    m.style.top = Math.max(4, Math.min(y, W.innerHeight - r.height - 4)) + 'px';
    return m;
  };
  CK.menu = (e, items) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    cerrar();
    abierto = [];
    D = (e && e.target && e.target.ownerDocument && e.target.ownerDocument.body ? e.target.ownerDocument : null) || CK.doc();
    W = D.defaultView || window;
    const x = e ? (e.clientX !== undefined ? e.clientX : e.x) : W.innerWidth / 2,
      y = e ? (e.clientY !== undefined ? e.clientY : e.y) : W.innerHeight / 2;
    const m = caja(items, x, y, 0);
    setTimeout(() => {
      D.addEventListener('pointerdown', fuera, true);
      D.addEventListener('keydown', teclas, true);
      W.addEventListener('blur', cerrar);
      W.addEventListener('resize', cerrar);
    }, 0);
    const op = m.querySelector('.menu-op:not(.off)');
    if (op) op.focus({ preventScroll: true });
    return m;
  };
  CK.menuCerrar = cerrar;

  // ---------------------------------------------------------------- acciones de siempre sobre un asset
  const CATS = [
    ['sprite', 'Objeto'],
    ['personaje', 'Personaje'],
    ['hoja', 'Animación'],
    ['fx', 'Efecto'],
    ['tileset', 'Tileset'],
    ['textura', 'Textura'],
    ['fondo', 'Fondo de mapa'],
    ['ui', 'Interfaz'],
    ['ref', 'Referencia']
  ];
  CK.asset.duplicar = (id, nombre) => {
    const a = CK.P.assets[id];
    if (!a) return null;
    const n = CK.asset.crear({
      nombre: nombre || a.nombre + ' copia',
      tipo: a.tipo,
      lienzo: CK.copiaLienzo(CK.img[id]),
      cuadros: a.cuadros ? CK.clone(a.cuadros) : undefined,
      tileset: a.tileset ? CK.clone(a.tileset) : undefined,
      etiquetas: (a.etiquetas || []).slice(),
      origen: 'copia de ' + a.nombre
    });
    if (a.carpeta) n.carpeta = a.carpeta;
    return n;
  };
  CK.asset.renombrar = async id => {
    const a = CK.P.assets[id];
    if (!a) return;
    const n = await CK.pedir('Renombrar', 'Nombre', a.nombre);
    if (!n || n === a.nombre) return;
    const f = CK.hist.datos('Renombrar', 'assets', id);
    a.nombre = n;
    f();
    CK.emit('assets', id);
  };
  CK.asset.carpetas = () =>
    [
      ...new Set(
        Object.values(CK.P.assets)
          .map(a => a.carpeta)
          .concat(
            Object.values(CK.P.fx).map(f => f.carpeta),
            Object.values(CK.P.mapas).map(m => m.carpeta)
          )
          .filter(Boolean)
      )
    ].sort();
  CK.asset.aCarpeta = async (ids, grupo = 'assets') => {
    const ya = CK.asset.carpetas(),
      d = { v: '' };
    let input;
    const v = await CK.ventana({
      titulo: 'Mover a carpeta',
      cuerpo: h(
        'div',
        h('p.nota-txt', 'Las carpetas ordenan la Biblioteca. Dejalo vacío para sacarlo de su carpeta.'),
        CK.campo(
          'Carpeta',
          (input = CK.txt(
            '',
            x => {
              d.v = x;
            },
            { vivo: true, ph: 'personajes/aldea' }
          ))
        ),
        ya.length
          ? h(
              'div.fila',
              { style: { flexWrap: 'wrap', marginTop: '6px' } },
              ya.map(c =>
                CK.btn({
                  txt: c,
                  cls: 'chico',
                  on: () => {
                    input.value = c;
                    d.v = c;
                  }
                })
              )
            )
          : null
      ),
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Mover', cls: 'pri', valor: () => d.v }
      ]
    });
    if (v === null) return;
    const c = v
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    const antes = ids.map(id => (CK.P[grupo][id] || {}).carpeta);
    ids.forEach(id => {
      const o = CK.P[grupo][id];
      if (!o) return;
      if (c) o.carpeta = c;
      else delete o.carpeta;
    });
    CK.hist.push({
      nombre: 'Mover a carpeta',
      deshacer: () => {
        ids.forEach((id, i) => {
          const o = CK.P[grupo][id];
          if (!o) return;
          if (antes[i]) o.carpeta = antes[i];
          else delete o.carpeta;
        });
        CK.emit('assets');
      },
      rehacer: () => {
        ids.forEach(id => {
          const o = CK.P[grupo][id];
          if (!o) return;
          if (c) o.carpeta = c;
          else delete o.carpeta;
        });
        CK.emit('assets');
      }
    });
    CK.emit('assets');
  };
  CK.asset.etiquetar = async id => {
    const a = CK.P.assets[id];
    if (!a) return;
    const v = await CK.pedir('Etiquetas', 'Separadas por coma (sirven para buscar)', (a.etiquetas || []).join(', '));
    if (v === null) return;
    const f = CK.hist.datos('Etiquetas', 'assets', id);
    a.etiquetas = v
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    f();
    CK.emit('assets', id);
  };
  CK.asset.bajar = async (id, esc = 1) => {
    const a = CK.P.assets[id];
    if (!a) return;
    const im = PIX.resizeNearest(CK.asset.pix(id), a.w * esc, a.h * esc);
    CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (esc > 1 ? '_x' + esc : '') + '.png');
  };
  CK.asset.preguntarBorrar = async id => {
    const a = CK.P.assets[id];
    if (!a) return false;
    let usos = 0;
    Object.values(CK.P.mapas).forEach(m =>
      (CK.mapa && CK.mapa.objetosDe ? CK.mapa.objetosDe(m) : []).forEach(o => {
        if (o.asset === id) usos++;
      })
    );
    if (
      !(await CK.confirmar(
        'Borrar "' + a.nombre + '"',
        usos
          ? 'Lo usan ' + usos + ' objeto(s) de los mapas: quedarían sin imagen. Se puede deshacer con Ctrl + Z.'
          : 'Se borra del proyecto. Se puede deshacer con Ctrl + Z.',
        'Borrar'
      ))
    )
      return false;
    const dato = CK.clone(a),
      img = CK.copiaLienzo(CK.img[id]);
    CK.asset.borrar(id);
    CK.hist.push({
      nombre: 'Borrar asset',
      deshacer: () => {
        CK.P.assets[id] = CK.clone(dato);
        CK.img[id] = CK.copiaLienzo(img);
        CK._imgSucias.add(id);
        CK._borradas = (CK._borradas || []).filter(x => x !== id);
        CK.emit('assets');
      },
      rehacer: () => CK.asset.borrar(id)
    });
    return true;
  };
  CK.menuAsset = (id, e, extra) => {
    const a = CK.P && CK.P.assets[id];
    if (!a) return;
    const anim = !!a.cuadros;
    CK.menu(e, [
      { titulo: a.nombre },
      { txt: 'Editar en Pixel art', ico: 'pixel', on: () => CK.ir('pixel', id) },
      anim
        ? { txt: 'Abrir en Animar', ico: 'anim', on: () => CK.ir('anim', { asset: id }) }
        : { txt: 'Animar a partir de este dibujo', ico: 'anim', on: () => CK.ir('anim', { asset: id, generar: true }) },
      CK.secciones.biblioteca ? { txt: 'Ver en la Biblioteca', ico: 'assets', on: () => CK.ir('biblioteca', { asset: id }) } : null,
      ...(extra || []),
      '-',
      { txt: 'Renombrar…', ico: 'texto', on: () => CK.asset.renombrar(id) },
      {
        txt: 'Duplicar',
        ico: 'duplicar',
        on: () => {
          const n = CK.asset.duplicar(id);
          if (n) CK.aviso('Copia creada: ' + n.nombre);
        }
      },
      { txt: 'Mover a carpeta…', ico: 'carpeta', on: () => CK.asset.aCarpeta([id]) },
      { txt: 'Etiquetas…', ico: 'nota', on: () => CK.asset.etiquetar(id) },
      {
        txt: 'Categoría',
        ico: 'grupo',
        sub: CATS.map(([t, n]) => ({
          txt: n,
          activo: a.tipo === t,
          on: () => {
            const f = CK.hist.datos('Categoría', 'assets', id);
            a.tipo = t;
            f();
            CK.emit('assets', id);
          }
        }))
      },
      '-',
      {
        txt: 'Descargar PNG',
        ico: 'importar',
        sub: [1, 2, 4, 8].map(n => ({ txt: '×' + n + (n === 1 ? ' (tamaño real)' : ''), on: () => CK.asset.bajar(id, n) }))
      },
      '-',
      { txt: 'Borrar', ico: 'basura', peligro: true, on: () => CK.asset.preguntarBorrar(id) }
    ]);
  };
})();
