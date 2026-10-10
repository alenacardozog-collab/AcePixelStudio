/* ANIMAR · personaje en 4 direcciones, prueba de caminata e importar sprites a las poses. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  // ---------------------------------------------------------------- personaje en 4 direcciones
  const DIRS = [
    ['abajo', 'Abajo (de frente)'],
    ['izquierda', 'Izquierda'],
    ['derecha', 'Derecha'],
    ['arriba', 'Arriba (de espaldas)']
  ];
  const ACC = { quieto: 'Quieto', caminar: 'Caminar', correr: 'Correr', atacar: 'Atacar', herido: 'Herido', morir: 'Morir' };
  An.prueba = undefined;
  An.pj = { x: 0, y: 0, dir: 'abajo', acc: 'quieto', t: 0, teclas: {}, Z: 3 };
  An.cacheFr = {};
  const Pz = () => CK.P.poses[An.st.pose];
  const framesDe = (id, espejo) => {
    const a = CK.P.assets[id];
    if (!a || !CK.img[id]) return [];
    const k = id + '|' + (a.modificado || 0) + '|' + JSON.stringify(a.cuadros || 0) + (espejo ? 'e' : '');
    if (An.cacheFr[k]) return An.cacheFr[k];
    const n = CK.asset.nCuadros(a),
      ord = (a.cuadros && a.cuadros.orden) || [...Array(n).keys()];
    return (An.cacheFr[k] = ord.map(i => {
      const g = CK.asset.cuadro(a, i),
        c = CK.lienzo(g.w, g.h),
        x = CK.ctx(c);
      if (espejo) {
        x.translate(g.w, 0);
        x.scale(-1, 1);
      }
      x.drawImage(CK.img[id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
      return c;
    }));
  };
  /** Cuadros y velocidad de una acción en una dirección (resuelve "izquierda = derecha espejada" y cae a Quieto si falta). */
  const poseDe = (p, acc, dir) => {
    const fila = p.acciones[acc] || {},
      base = p.acciones.quieto || {};
    let id = fila[dir],
      esp = false;
    if (!id && p.espejar && (dir === 'izquierda' || dir === 'derecha')) {
      const otro = dir === 'izquierda' ? 'derecha' : 'izquierda';
      if (fila[otro]) {
        id = fila[otro];
        esp = true;
      }
    }
    if (!id && acc !== 'quieto') return poseDe(p, 'quieto', dir);
    if (!id) {
      id = base.abajo || Object.values(base)[0];
    }
    const a = CK.P.assets[id];
    return { fr: framesDe(id, esp), fps: (a && a.cuadros && a.cuadros.fps) || 8, falta: !fila[dir] && !esp };
  };
  CK.posesProblemas = p => {
    const out = [],
      tam = new Set();
    Object.keys(p.acciones).forEach(acc => {
      const f = p.acciones[acc],
        faltan = DIRS.map(d => d[0]).filter(
          d => !f[d] && !(p.espejar && (d === 'izquierda' || d === 'derecha') && (f.izquierda || f.derecha))
        );
      if (faltan.length && faltan.length < 4) out.push((ACC[acc] || acc) + ': falta ' + faltan.join(', ') + '.');
      const ns = new Set();
      Object.values(f).forEach(id => {
        const a = CK.P.assets[id];
        if (!a) return;
        const c = a.cuadros || { fw: a.w, fh: a.h };
        tam.add(c.fw + '×' + c.fh);
        ns.add(CK.asset.nCuadros(a));
      });
      if (ns.size > 1) out.push((ACC[acc] || acc) + ': las direcciones tienen distinta cantidad de cuadros (' + [...ns].join(', ') + ').');
    });
    if (tam.size > 1)
      out.push('Los cuadros no miden todos lo mismo (' + [...tam].join(', ') + '): el personaje va a cambiar de tamaño entre poses.');
    return out;
  };
  const cambioPose = (nombre, fn) => {
    const f = CK.hist.datos(nombre, 'poses', An.st.pose);
    fn(Pz());
    f();
    An.tabs.refrescar();
  };
  const hojaPoses = p => {
    const filas = [];
    let fw = 1,
      fh = 1,
      cols = 1;
    Object.keys(p.acciones).forEach(acc =>
      DIRS.forEach(d => {
        const q = poseDe(p, acc, d[0]);
        if (!q.fr.length) return;
        filas.push({ n: acc + '_' + d[0], fr: q.fr });
        cols = Math.max(cols, q.fr.length);
        fw = Math.max(fw, q.fr[0].width);
        fh = Math.max(fh, q.fr[0].height);
      })
    );
    const c = CK.lienzo(fw * cols, fh * Math.max(1, filas.length)),
      x = CK.ctx(c);
    filas.forEach((f, j) => f.fr.forEach((g, i) => x.drawImage(g, i * fw + Math.floor((fw - g.width) / 2), j * fh + fh - g.height)));
    return { c, fw, fh, filas: filas.map((f, j) => ({ nombre: f.n, fila: j, cuadros: f.fr.length })) };
  };

  // ---- importar sprites sueltos y repartirlos solos en las poses
  const SIN_ACC = {
    quieto: ['idle', 'quieto', 'parado', 'stand', 'standing', 'respira', 'respirar', 'breath', 'breathing', 'reposo', 'espera'],
    caminar: ['walk', 'walking', 'caminar', 'camina', 'caminando', 'andar', 'anda', 'move', 'moving'],
    correr: ['run', 'running', 'correr', 'corre', 'corriendo', 'sprint'],
    atacar: ['attack', 'atk', 'atacar', 'ataque', 'ataca', 'slash', 'swing', 'strike', 'punch', 'cast'],
    herido: ['hurt', 'damage', 'dmg', 'herido', 'dano', 'daño', 'hit', 'golpeado'],
    morir: ['death', 'die', 'dead', 'dying', 'morir', 'muerte', 'muere', 'ko']
  };
  const SIN_DIR = {
    abajo: ['sur', 'south', 'down', 'abajo', 'front', 'frente', 'bottom', 's', 'd'],
    arriba: ['norte', 'north', 'up', 'arriba', 'back', 'espalda', 'atras', 'top', 'n', 'u'],
    derecha: ['este', 'east', 'right', 'derecha', 'der', 'e', 'r'],
    izquierda: ['oeste', 'west', 'left', 'izquierda', 'izq', 'o', 'w', 'l']
  };
  const FPS_ACC = { quieto: 5, caminar: 8, correr: 10, atacar: 10, herido: 8, morir: 8 };
  An.leerNombre = ruta => {
    const sin = ruta
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    const tk = sin
      .split(/[\/\\_\-.\s]+/)
      .flatMap(t => t.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/))
      .filter(Boolean);
    let acc = null,
      dir = null,
      num = null;
    tk.forEach(t => {
      if (!acc)
        Object.keys(SIN_ACC).forEach(k => {
          if (!acc && SIN_ACC[k].includes(t)) acc = k;
        });
    });
    tk.forEach(t => {
      if (!dir && t.length > 1)
        Object.keys(SIN_DIR).forEach(k => {
          if (!dir && SIN_DIR[k].includes(t)) dir = k;
        });
    });
    if (!dir)
      tk.forEach(t => {
        if (!dir && t.length === 1)
          Object.keys(SIN_DIR).forEach(k => {
            if (!dir && SIN_DIR[k].includes(t)) dir = k;
          });
      });
    for (let i = tk.length - 1; i >= 0; i--)
      if (/^\d+$/.test(tk[i])) {
        num = +tk[i];
        break;
      }
    return { acc, dir, num, tk };
  };
  const elegirCarpeta = () =>
    new Promise(res => {
      const i = h('input', { type: 'file', multiple: true, style: { display: 'none' } });
      i.webkitdirectory = true;
      i.addEventListener('change', () => {
        res([...i.files].filter(f => /\.(png|gif|webp)$/i.test(f.name)));
        i.remove();
      });
      document.body.append(i);
      i.click();
    });
  An.importarPoses = async archivos => {
    let fs = archivos;
    if (!fs) {
      const como = await CK.ventana({
        titulo: 'Sprites a poses',
        ancho: 520,
        cuerpo: h(
          'div',
          h('p', 'Elegí los PNG de un personaje (o la carpeta entera). Por el nombre de cada archivo se reconoce:'),
          h(
            'ul.nota-txt',
            h('li', 'la acción: idle / quieto, walk / caminar, run / correr, attack / atacar, hurt / herido, death / morir'),
            h('li', 'la dirección: sur / down / frente, norte / up / espalda, este / right, oeste / left'),
            h('li', 'el número de cuadro: el último número del nombre')
          ),
          h(
            'p.nota-txt',
            'Ejemplos: panadero_walk_sur_03.png · idle/norte/2.png · herrero-ataque-este-1.png. Una tira (varios cuadros en fila) también vale. Antes de crear nada te muestro lo que entendí para que lo corrijas.'
          )
        ),
        botones: [
          { txt: 'Cancelar', valor: null },
          { txt: 'Elegir carpeta', valor: 'carpeta' },
          { txt: 'Elegir archivos', cls: 'pri', valor: 'archivos' }
        ]
      });
      if (!como) return;
      fs = como === 'carpeta' ? await elegirCarpeta() : await CK.elegirArchivos('image/png,image/gif,image/webp', true);
    }
    if (!fs || !fs.length) return;
    // leer y agrupar
    const filas = new Map(),
      reconocidos = [];
    let i0 = 0;
    for (const f of fs) {
      const ruta = f.webkitRelativePath || f.name,
        r = An.leerNombre(ruta);
      let im;
      try {
        im = CK.aPix(await CK.cargarImagen(f));
      } catch (e) {
        continue;
      }
      const ims = r.num === null && im.w > im.h * 1.5 && im.w % im.h === 0 ? PIX.slice(im, im.h, im.h) : [im];
      const k = (r.acc || '?') + '|' + (r.dir || '?') + (r.acc && r.dir ? '' : '|' + ruta);
      if (!filas.has(k))
        filas.set(k, {
          acc: r.acc || 'quieto',
          dir: r.dir || 'abajo',
          duda: !r.acc || !r.dir,
          incluir: !!(r.acc || r.dir),
          cuadros: [],
          nombre: ruta
        });
      if (r.acc || r.dir) reconocidos.push(ruta);
      ims.forEach((q, j) => filas.get(k).cuadros.push({ im: q, n: r.num === null ? 1e6 + i0++ : r.num + j * 0.001, ruta }));
    }
    const lista = [...filas.values()];
    if (!lista.length) {
      CK.aviso('No encontré imágenes que pueda leer.', 'info');
      return;
    }
    lista.forEach(g => g.cuadros.sort((a, b) => a.n - b.n || a.ruta.localeCompare(b.ruta, undefined, { numeric: true })));
    // nombre del personaje: lo que se repite al principio de los nombres
    const pref = (() => {
      const ns = (reconocidos.length ? reconocidos : fs.map(f => f.webkitRelativePath || f.name)).map(r =>
        r
          .toLowerCase()
          .split(/[\/\\]/)
          .pop()
      );
      let p = ns[0] || '';
      ns.forEach(n => {
        while (p && n.indexOf(p) !== 0) p = p.slice(0, -1);
      });
      p = p.replace(/[_\-\s.\d]+$/, '');
      const t = p.split(/[_\-\s.]+/).filter(x => !Object.values(SIN_ACC).flat().includes(x) && !Object.values(SIN_DIR).flat().includes(x));
      return t.join('_') || (fs[0].webkitRelativePath || '').split('/')[0] || 'personaje';
    })();
    const d = { destino: An.st.pose && CK.P.poses[An.st.pose] ? An.st.pose : '__nuevo', nombre: pref, pies: true, espejar: true };
    const tabla = h('div', { style: { maxHeight: '360px', overflow: 'auto', display: 'grid', gap: '4px' } });
    const pintarTabla = () => {
      CK.vaciar(tabla);
      lista.forEach(g => {
        tabla.append(
          h(
            'div.pose-imp' + (g.duda ? '.duda' : ''),
            { style: { opacity: g.incluir ? 1 : 0.45 } },
            h('input', {
              type: 'checkbox',
              checked: g.incluir,
              onchange: e => {
                g.incluir = e.target.checked;
                pintarTabla();
              }
            }),
            CK.mini(CK.aLienzo(g.cuadros[0].im), 36),
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div.nombre', g.cuadros.length + ' cuadro' + (g.cuadros.length > 1 ? 's' : '') + (g.duda ? ' · no lo reconocí' : '')),
              h(
                'div.sub',
                g.duda
                  ? g.nombre
                  : g.cuadros
                      .map(c => c.ruta.split(/[\/\\]/).pop())
                      .slice(0, 3)
                      .join(', ') + (g.cuadros.length > 3 ? '…' : '')
              )
            ),
            CK.sel(
              g.acc,
              Object.keys(ACC).map(k => [k, ACC[k]]),
              v => {
                g.acc = v;
                g.duda = false;
                pintarTabla();
              }
            ),
            CK.sel(
              g.dir,
              DIRS.map(([k, t]) => [k, t.replace(/ \(.*\)/, '')]),
              v => {
                g.dir = v;
                g.duda = false;
                pintarTabla();
              }
            )
          )
        );
      });
    };
    pintarTabla();
    const ok = await CK.ventana({
      titulo: 'Sprites a poses: revisá lo que entendí',
      ancho: 680,
      cuerpo: h(
        'div',
        h(
          'p.nota-txt',
          lista.length +
            ' grupo(s) de ' +
            fs.length +
            ' archivo(s). Corregí acción o dirección donde haga falta (las dudosas están marcadas).'
        ),
        tabla,
        h(
          'div.duo',
          { style: { marginTop: '10px' } },
          CK.campo(
            'Personaje',
            CK.sel(d.destino, [['__nuevo', 'Nuevo personaje']].concat(Object.values(CK.P.poses).map(p => [p.id, p.nombre])), v => {
              d.destino = v;
            })
          ),
          CK.campo(
            'Nombre (si es nuevo)',
            CK.txt(
              d.nombre,
              v => {
                d.nombre = v;
              },
              { vivo: true }
            )
          )
        ),
        CK.chk(d.pies, 'Alinear todos los cuadros por los pies (mismo tamaño en todas las poses)', v => {
          d.pies = v;
        }),
        CK.chk(d.espejar, 'Si falta izquierda o derecha, usar la otra espejada', v => {
          d.espejar = v;
        })
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Crear poses', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    const usar = lista.filter(g => g.incluir);
    if (!usar.length) return;
    // juntar grupos con la misma acción y dirección
    const juntos = new Map();
    usar.forEach(g => {
      const k = g.acc + '|' + g.dir;
      if (!juntos.has(k)) juntos.set(k, { acc: g.acc, dir: g.dir, ims: [] });
      juntos.get(k).ims.push(...g.cuadros.map(c => c.im));
    });
    // mismo tamaño de cuadro para todo el personaje
    let W = 1,
      H = 1;
    juntos.forEach(g =>
      g.ims.forEach(im => {
        const b = d.pies ? PIX.bbox(im, 40) : null;
        W = Math.max(W, b ? b.w : im.w);
        H = Math.max(H, b ? b.h : im.h);
      })
    );
    if (d.pies) {
      W += 2;
      H += 1;
    }
    let p;
    const antesPose = d.destino !== '__nuevo' ? JSON.stringify(CK.P.poses[d.destino]) : null,
      creados = [];
    if (d.destino === '__nuevo') {
      const nombre = (d.nombre || 'personaje').trim();
      let id = CK.slug(nombre),
        n = 2;
      while (CK.P.poses[id]) id = CK.slug(nombre) + '_' + n++;
      p = CK.P.poses[id] = { id, nombre, espejar: d.espejar, acciones: { quieto: {}, caminar: {} } };
    } else {
      p = CK.P.poses[d.destino];
      if (d.espejar) p.espejar = true;
    }
    juntos.forEach(g => {
      const frs = g.ims.map(im => {
        const o = PIX.make(W, H);
        if (d.pies) {
          const b = PIX.bbox(im, 40);
          if (b) {
            const parte = PIX.crop(im, b.x, b.y, b.w, b.h);
            PIX.blit(o, parte, Math.round((W - b.w) / 2), H - b.h, false);
          }
        } else PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false);
        return o;
      });
      const a = CK.asset.crear({
        nombre: p.nombre + '_' + g.acc + '_' + g.dir,
        tipo: 'hoja',
        lienzo: CK.aLienzo(PIX.pack(frs, frs.length)),
        origen: 'sprites importados a poses',
        cuadros: { fw: W, fh: H, fps: FPS_ACC[g.acc] || 8, bucle: !['atacar', 'herido', 'morir'].includes(g.acc) }
      });
      if (p.carpeta) a.carpeta = p.carpeta;
      else a.carpeta = 'personajes/' + CK.slug(p.nombre);
      creados.push(a.id);
      p.acciones[g.acc] = p.acciones[g.acc] || {};
      p.acciones[g.acc][g.dir] = a.id;
    });
    const pid = p.id,
      despues = JSON.stringify(p);
    CK.hist.push({
      nombre: 'Sprites a poses',
      deshacer: () => {
        creados.forEach(id => CK.asset.borrar(id));
        if (antesPose) CK.P.poses[pid] = JSON.parse(antesPose);
        else delete CK.P.poses[pid];
        CK.emit('assets');
      },
      rehacer: () => {
        CK.aviso('Para rehacer, volvé a importar los sprites.', 'info');
      }
    });
    CK.tocar();
    An.st.pose = pid;
    An.tabs.ir('poses');
    An.pintarIzq();
    CK.aviso('Listo: ' + juntos.size + ' animación(es) en "' + p.nombre + '" (cuadros de ' + W + ' × ' + H + ').', 'ok', 5000);
  };

  An.pPoses = c => {
    An.st.modo = 'poses';
    const lista = Object.values(CK.P.poses);
    if (!CK.P.poses[An.st.pose]) An.st.pose = (lista[0] || {}).id || null;
    const p = Pz();
    const nuevo = async () => {
      const nombre = await CK.pedir('Personaje nuevo', 'Nombre (héroe, guardia, aldeana…)', '');
      if (!nombre) return;
      let id = CK.slug(nombre),
        n = 2;
      while (CK.P.poses[id]) id = CK.slug(nombre) + '_' + n++;
      CK.P.poses[id] = { id, nombre, espejar: true, acciones: { quieto: {}, caminar: {} } };
      CK.tocar();
      An.st.pose = id;
      An.tabs.refrescar();
    };
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Personaje', CK.btn({ ico: 'mas', txt: 'Nuevo', cls: 'chico' + (lista.length ? '' : ' pri'), on: nuevo })),
        lista.length
          ? CK.sel(
              An.st.pose,
              lista.map(q => [q.id, q.nombre]),
              v => {
                An.st.pose = v;
                An.tabs.refrescar();
              }
            )
          : h(
              'p.nota-txt',
              'Juntá acá las animaciones de un personaje en sus cuatro direcciones para verlas andar juntas y encontrar la que desentona.'
            ),
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'importar',
            txt: 'Importar sprites a las poses',
            cls: 'chico' + (lista.length ? '' : ' pri'),
            desc: 'Elegí los PNG (o la carpeta) de un personaje: por el nombre se reparten solos en su acción, dirección y número de cuadro. También podés soltarlos acá.',
            on: () => An.importarPoses()
          })
        )
      )
    );
    CK.soltarEn(c, fs => An.importarPoses(fs));
    if (!p) {
      An.pintarPrueba();
      return;
    }
    const bl = h(
      'div.bloque',
      h('h3.bloque-tit', 'Poses'),
      CK.chk(
        p.espejar,
        'Izquierda y derecha se espejan',
        v =>
          cambioPose('Espejar', q => {
            q.espejar = v;
          }),
        'Si dibujaste solo un lado, el otro se arma dándolo vuelta.'
      )
    );
    Object.keys(p.acciones).forEach(acc => {
      const g = h(
        'div.poses-fila',
        h(
          'div.fila.junto',
          h('b.crece', ACC[acc] || acc),
          CK.btn({
            ico: 'play',
            tip: 'Ver esta acción',
            cls: 'chico plano' + (An.pj.fijo === acc ? ' activo' : ''),
            desc: 'Muestra esta acción en la prueba (clic otra vez para volver a moverte libre).',
            on: () => {
              An.pj.fijo = An.pj.fijo === acc ? null : acc;
              An.tabs.refrescar();
            }
          }),
          acc !== 'quieto'
            ? CK.btn({
                ico: 'cerrar',
                tip: 'Quitar acción',
                cls: 'chico plano',
                on: () =>
                  cambioPose('Quitar acción', q => {
                    delete q.acciones[acc];
                  })
              })
            : null
        ),
        h('div.poses-dirs')
      );
      DIRS.forEach(([d, rot]) => {
        const id = p.acciones[acc][d],
          q = poseDe(p, acc, d),
          esp = !id && p.espejar && (d === 'izquierda' || d === 'derecha') && q.fr.length && !q.falta;
        const elegir = async () => {
          const nid = await CK.elegirAsset((ACC[acc] || acc) + ' · ' + rot, ['hoja', 'personaje', 'sprite']);
          if (nid)
            cambioPose('Asignar pose', z => {
              z.acciones[acc][d] = nid;
            });
        };
        const b = h(
          'button.pose-celda' + (id ? '.puesta' : esp ? '.espejo' : ''),
          {
            type: 'button',
            onclick: elegir,
            oncontextmenu: e =>
              CK.menu(e, [
                { titulo: (ACC[acc] || acc) + ' · ' + rot },
                { txt: id ? 'Cambiar…' : 'Elegir animación…', ico: 'imagen', on: elegir },
                id
                  ? {
                      txt: 'Abrir en la línea de tiempo',
                      ico: 'anim',
                      on: () => {
                        An.st.hoja = id;
                        An.st.selC = new Set();
                        An.tabs.ir('hoja');
                      }
                    }
                  : null,
                id ? { txt: 'Editar en Pixel art', ico: 'pixel', on: () => CK.ir('pixel', id) } : null,
                { txt: 'Importar sprites a las poses…', ico: 'importar', on: () => An.importarPoses() },
                id ? '-' : null,
                id
                  ? {
                      txt: 'Quitar',
                      ico: 'cerrar',
                      peligro: true,
                      on: () =>
                        cambioPose('Quitar pose', z => {
                          delete z.acciones[acc][d];
                        })
                    }
                  : null
              ])
          },
          (id || esp) && q.fr[0] ? CK.mini(q.fr[0], 44) : h('span', { html: CK.ico('mas', 18) }),
          h('span', d)
        );
        CK.tip(
          b,
          rot,
          id
            ? CK.P.assets[id].nombre + ' · ' + q.fr.length + ' cuadros. Clic: cambiar · Clic derecho: opciones.'
            : esp
              ? 'Espejada del otro lado. Clic para poner una propia.'
              : 'Clic para elegir la animación de esta dirección.'
        );
        g.lastChild.append(b);
      });
      bl.append(g);
    });
    const libres = Object.keys(ACC).filter(k => !p.acciones[k]);
    bl.append(
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        libres.map(k =>
          CK.btn({
            ico: 'mas',
            txt: ACC[k],
            cls: 'chico',
            on: () =>
              cambioPose('Agregar acción', q => {
                q.acciones[k] = {};
              })
          })
        )
      )
    );
    c.append(bl);
    const pr = CK.posesProblemas(p);
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Revisión'),
        pr.length
          ? pr.map(t => h('div.problema.medio', { html: CK.ico('alerta', 16) }, h('div', h('div.pd', t))))
          : h(
              'div.problema.leve',
              { html: CK.ico('ok', 16) },
              h('div', h('div.pd', 'Mismo tamaño y misma cantidad de cuadros en todas las direcciones.'))
            )
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Sacar'),
        h(
          'div.fila',
          CK.btn({
            ico: 'hoja',
            txt: 'Hoja completa',
            cls: 'chico',
            desc: 'Arma una sola hoja con una fila por acción y dirección, y la guarda como asset junto con un JSON que dice qué hay en cada fila.',
            on: () => {
              const r = hojaPoses(p);
              const a = CK.asset.crear({
                nombre: p.nombre + '_hoja',
                tipo: 'personaje',
                lienzo: r.c,
                origen: 'poses de ' + p.nombre,
                cuadros: { fw: r.fw, fh: r.fh, fps: 8, bucle: true },
                extra: { filas: r.filas }
              });
              CK.descargar(
                new Blob([JSON.stringify({ cuadro: [r.fw, r.fh], filas: r.filas }, null, 1)], { type: 'application/json' }),
                a.id + '.json'
              );
              CK.aviso('Hoja guardada como "' + a.nombre + '" (' + r.filas.length + ' filas).');
              An.pintarIzq();
            }
          }),
          CK.btn({
            ico: 'basura',
            txt: 'Borrar personaje',
            cls: 'chico peligro',
            on: async () => {
              if (
                await CK.confirmar(
                  'Borrar personaje',
                  'Se borra el conjunto de poses de "' + p.nombre + '". Las animaciones quedan en el proyecto.',
                  'Borrar'
                )
              ) {
                const f = CK.hist.datos('Borrar personaje', 'poses', p.id);
                delete CK.P.poses[p.id];
                f();
                An.st.pose = null;
                An.tabs.refrescar();
              }
            }
          })
        ),
        h(
          'p.nota-txt',
          'Probalo en el centro: flechas o WASD para caminar, rueda del mouse para acercar. Las poses nuevas se dibujan en Pixel art o se traen de PixelLab; acá se ordenan y se controlan.'
        )
      )
    );
    An.pintarPrueba();
  };
  let rafP = 0,
    tPrev = 0;
  An.pintarPrueba = () => {
    if (!An.prueba) return;
    const enPoses = An.st.modo === 'poses';
    An.prueba.style.display = enPoses ? '' : 'none';
    An.vistaCv.parentElement.style.display = enPoses ? 'none' : '';
    An.lineaEl.style.display = enPoses ? 'none' : '';
    CK.caf(rafP);
    if (!enPoses) {
      if (An.vista) {
        An.vista.medir();
      }
      return;
    }
    tPrev = performance.now();
    const paso = now => {
      if (An.st.modo !== 'poses' || !CK.seccionVisible('anim')) return;
      rafP = CK.raf(paso);
      const dt = Math.max(0, Math.min(0.05, (now - tPrev) / 1000));
      tPrev = now;
      const W = An.prueba.width,
        H = An.prueba.height,
        x = CK.ctx(An.prueba),
        p = Pz(),
        Z = An.pj.Z;
      x.imageSmoothingEnabled = false;
      for (let j = 0; j < H; j += 48)
        for (let i = 0; i < W; i += 48) {
          x.fillStyle = ((i + j) / 48) % 2 ? '#4f8140' : '#4a7a3b';
          x.fillRect(i, j, 48, 48);
        }
      if (!p) return;
      const k = An.pj.teclas,
        dx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0),
        dy = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0),
        mueve = dx || dy;
      if (mueve) {
        An.pj.dir = Math.abs(dx) >= Math.abs(dy) && dx ? (dx < 0 ? 'izquierda' : 'derecha') : dy < 0 ? 'arriba' : 'abajo';
        const v = (70 * dt) / Math.hypot(dx, dy);
        An.pj.x = Math.max(30, Math.min(W - 30, An.pj.x + dx * v * Z));
        An.pj.y = Math.max(60, Math.min(H - 60, An.pj.y + dy * v * Z));
      }
      const acc = An.pj.fijo || (mueve ? 'caminar' : 'quieto');
      if (acc !== An.pj.acc) {
        An.pj.acc = acc;
        An.pj.t = 0;
      }
      An.pj.t += dt;
      // los cuatro lados arriba, para comparar
      DIRS.forEach(([d], i) => {
        const q = poseDe(p, An.pj.fijo || 'caminar', d);
        if (!q.fr.length) return;
        const f = q.fr[Math.floor(An.pj.t * q.fps) % q.fr.length],
          cx = W / 2 + (i - 1.5) * 92;
        x.fillStyle = 'rgba(0,0,0,.28)';
        x.fillRect(cx - 40, 8, 80, 84);
        x.drawImage(f, Math.round(cx - f.width), 88 - f.height * 2, f.width * 2, f.height * 2);
        x.fillStyle = '#fff';
        x.font = '10px sans-serif';
        x.textAlign = 'center';
        x.fillText(d, cx, 20);
      });
      const q = poseDe(p, acc, An.pj.dir);
      if (!q.fr.length) return;
      const f = q.fr[Math.floor(An.pj.t * q.fps) % q.fr.length];
      x.fillStyle = 'rgba(0,0,0,.25)';
      x.beginPath();
      x.ellipse(An.pj.x, An.pj.y, 9 * Z, 3 * Z, 0, 0, 7);
      x.fill();
      x.drawImage(
        f,
        Math.round(An.pj.x - (f.width * Z) / 2),
        Math.round(An.pj.y - f.height * Z + f.height * Z * 0.14),
        f.width * Z,
        f.height * Z
      );
      x.fillStyle = 'rgba(0,0,0,.5)';
      x.fillRect(W - 58, H - 22, 52, 16);
      x.fillStyle = '#fff';
      x.font = '11px sans-serif';
      x.textAlign = 'center';
      x.fillText('×' + Z, W - 32, H - 10);
    };
    rafP = CK.raf(paso);
  };
  window.addEventListener('keydown', e => {
    if ((CK.foco || CK.seccion_actual) !== 'anim' || An.st.modo !== 'poses' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || ''))
      return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) {
      An.pj.teclas[k] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    delete An.pj.teclas[k];
  });
})();
