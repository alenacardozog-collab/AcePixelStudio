/* MAPA (interfaz): columna de herramientas, tira de opciones, y panel con Capas, Propiedades, Assets y Mapa. */
'use strict';
(function () {
  const capasPlegadas = new Set();
  const h = CK.h,
    MP = CK.mapa,
    S = MP.S;
  let el, tablero, lienzo, vista, panel, tabs, herrCol, tiraOpc, selMapa;
  const M = () => MP.actual();

  const HERR = [
    {
      id: 'seleccionar',
      ico: 'seleccionar',
      tip: 'Seleccionar y mover',
      desc: 'Clic para elegir un objeto, arrastrá para moverlo. Las asas blancas lo escalan y la azul lo rota. Arrastrá en vacío para elegir varios. Ctrl + arrastrar lo duplica.',
      tecla: 'V',
      est: 'Clic: elegir · Arrastrar: mover · Mayús + clic: sumar · Alt + clic: uno solo del grupo'
    },
    {
      id: 'colocar',
      ico: 'prefab',
      tip: 'Colocar objetos',
      desc: 'Pone en el mapa el asset o prearmado elegido en la pestaña Assets. Cada clic coloca uno.',
      tecla: 'P',
      est: 'Clic: colocar · Clic derecho: terminar'
    },
    '-',
    {
      id: 'pincel',
      ico: 'pincel',
      tip: 'Pintar suelo',
      desc: 'Pinta en la capa activa. En una capa de Terreno los bordes y esquinas se eligen solos; en una de Tiles pone las piezas elegidas.',
      tecla: 'B',
      est: 'Arrastrar: pintar · Clic derecho: borrar · Mayús + arrastrar: rectángulo (capas de Tiles)'
    },
    {
      id: 'borrador',
      ico: 'borrador',
      tip: 'Borrar suelo',
      desc: 'Quita lo pintado en la capa activa.',
      tecla: 'E',
      est: 'Arrastrar: borrar'
    },
    {
      id: 'balde',
      ico: 'balde',
      tip: 'Rellenar',
      desc: 'Rellena toda una zona cerrada de la capa activa.',
      tecla: 'G',
      est: 'Clic: rellenar · Clic derecho: vaciar'
    },
    '-',
    {
      id: 'zona',
      ico: 'caminar',
      tip: 'Zonas caminables',
      desc: 'Pintá por dónde se puede caminar y por dónde no. Verde: caminable. Rojo: bloqueado. Azul: solo NPC. Dorado: solo el jugador.',
      tecla: 'W',
      est: 'Arrastrar: pintar zona · Clic derecho: borrar · Mayús + arrastrar: rectángulo'
    },
    {
      id: 'balde-zona',
      ico: 'bloquear',
      tip: 'Rellenar zona',
      desc: 'Rellena de una vez un área cerrada con el tipo de zona elegido.',
      tecla: 'X',
      est: 'Clic: rellenar zona · Clic derecho: vaciar'
    },
    {
      id: 'colision',
      ico: 'colision',
      tip: 'Colisiones',
      desc: 'Dibujá rectángulos sólidos. Clic en uno para moverlo o ajustarlo por las asas.',
      tecla: 'C',
      est: 'Arrastrar en vacío: nueva colisión · Clic: elegir · Clic derecho: borrar'
    },
    '-',
    {
      id: 'luz',
      ico: 'luz',
      tip: 'Luz',
      desc: 'Coloca un punto de luz: antorchas, ventanas, magia. Después ajustás color, radio y parpadeo en Propiedades.',
      tecla: 'L',
      est: 'Clic: colocar una luz'
    },
    {
      id: 'punto',
      ico: 'punto',
      tip: 'Punto',
      desc: 'Marca un lugar con significado: aparición del héroe, puerta, NPC, enemigo o disparador.',
      tecla: 'O',
      est: 'Clic: colocar un punto'
    },
    {
      id: 'marca',
      ico: 'claqueta',
      tip: 'Marcar para animar',
      desc: 'Clic sobre un objeto para marcarlo como "a animar" y escribir cómo querés que se mueva.',
      tecla: 'M',
      est: 'Clic sobre un objeto: dejar la nota de animación'
    },
    {
      id: 'nota',
      ico: 'nota',
      tip: 'Nota',
      desc: 'Deja un comentario clavado en el mapa ("este techo se ve chato"). Aparece en la lista de Notas.',
      tecla: 'N',
      est: 'Clic: dejar una nota en ese lugar'
    },
    '-',
    {
      id: 'caminar',
      ico: 'persona',
      tip: 'Caminar por el mapa',
      desc: 'Pone un héroe de prueba para recorrer el mapa con las flechas: ves al instante qué queda delante o detrás y dónde choca.',
      tecla: 'J',
      est: 'Clic: poner al héroe · Flechas o WASD: caminar · Esc: salir'
    }
  ];

  // ---------------------------------------------------------------- estructura
  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '52px 1fr 318px';
    herrCol = CK.herramientas(HERR, S.herr, id => MP.herr(id));
    lienzo = h('canvas.lienzo');
    tiraOpc = h('div.sobre');
    tablero = h('div.tablero', lienzo, tiraOpc);
    panel = h('aside.panel');
    el.append(herrCol, tablero, panel);
    vista = CK.vista(lienzo, {
      pintar: (x, v) => {
        if (M()) MP.pintar(x, v);
      },
      herramienta: MP.herramienta,
      zoom: 2
    });
    MP.ponerVista(vista);
    tablero.append(
      h(
        'div.sobre.abajo.der',
        CK.tiraZoom(vista, () => M() && vista.encuadrar(M().w, M().h))
      )
    );
    lienzo.addEventListener('dragover', e => {
      if ([...e.dataTransfer.types].includes('text/ck-asset')) e.preventDefault();
    });
    lienzo.addEventListener('drop', e => {
      const id = e.dataTransfer.getData('text/ck-asset');
      if (!id || !M()) return;
      e.preventDefault();
      const r = lienzo.getBoundingClientRect(),
        w = vista.aMundo(e.clientX - r.left, e.clientY - r.top);
      S.asset = id;
      S.prefab = null;
      MP.herr('colocar');
      MP.herramienta.pasar({ x: w.x, y: w.y });
      MP.herramienta.bajar({ x: w.x, y: w.y, boton: 0 });
      MP.herr('seleccionar');
    });
    CK.soltarEn(tablero, async fs => {
      const as = await CK.importarImagenes('sprite', fs);
      if (as.length) {
        S.asset = as[0].id;
        S.prefab = null;
        MP.herr('colocar');
        tabs.ir('assets');
      }
    });
    tabs = CK.pestanas(
      [
        { id: 'capas', txt: 'Capas', ico: 'capas', desc: 'Orden de dibujo, visibilidad y jerarquía de objetos.', pintar: pintarCapas },
        {
          id: 'prop',
          txt: 'Propiedades',
          ico: 'ajustes',
          desc: 'Posición, escala, colisión y datos de lo seleccionado.',
          pintar: pintarProp
        },
        { id: 'assets', txt: 'Assets', ico: 'assets', desc: 'Lo que podés colocar en el mapa.', pintar: pintarAssets },
        { id: 'mapa', txt: 'Mapa', ico: 'mapa', desc: 'Tamaño, fondo, luz ambiente y acciones del mapa.', pintar: pintarMapa }
      ],
      'capas',
      { despegable: true, apilable: true, apilado: true, id: 'mapa', nombre: 'Mapa' }
    );
    panel.append(tabs);
    CK.on('mapa-herr', () => {
      herrCol.elegir(S.herr);
      pintarOpc();
      const t = HERR.find(x => x.id === S.herr);
      if (t && CK.seccionVisible('mapa')) {
        document.getElementById('estado-herr').textContent = 'Mapa · ' + t.tip;
        CK.estado(t.est);
      }
    });
    const refPanel = CK.debounce(() => {
      if (el.isConnected && el.style.display !== 'none') tabs.refrescar();
    }, 40);
    CK.on('mapa-capas', () => {
      if (tabs.actual() === 'capas' || tabs.suelta('capas')) refPanel();
    });
    CK.on('mapa-tiles', () => tabs.refrescar());
    CK.on('mapa-sel', () => {
      if ((S.sel.length || S.selCol || S.selNota) && S.herr !== 'colocar') {
        if (tabs.actual() !== 'prop' && tabs.actual() !== 'capas') tabs.ir('prop');
        else refPanel();
      } else if (S.herr !== 'colocar') refPanel();
    });
    CK.on(
      'mapa-prop',
      CK.debounce(() => {
        if (
          (tabs.actual() === 'prop' || tabs.suelta('prop')) &&
          !panel.contains(document.activeElement) &&
          !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.de-pest'))
        )
          tabs.refrescar();
      }, 120)
    );
    CK.on('mapa-abierto', () => {
      pintarOpc();
      tabs.refrescar();
    });
    CK.on('mapas', () => {
      if (el.isConnected) {
        pintarOpc();
      }
    });
    CK.on('prefabs', () => {
      if (tabs.actual() === 'assets' || tabs.suelta('assets')) refPanel();
    });
    pintarOpc();
  };
  const mostrar = arg => {
    if (!CK.P) return;
    const ids = Object.keys(CK.P.mapas);
    if (arg && CK.P.mapas[arg]) MP.abrir(arg);
    else if (!M() && ids.length) MP.abrir(CK.P.ui.mapa && CK.P.mapas[CK.P.ui.mapa] ? CK.P.ui.mapa : ids[0]);
    pintarVacio();
    pintarOpc();
    tabs.refrescar();
    vista.medir();
    MP.revisarBucle();
  };
  let vacio = null;
  const pintarVacio = () => {
    if (vacio) {
      vacio.remove();
      vacio = null;
    }
    if (M()) return;
    vacio = h(
      'div',
      { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', background: 'var(--hueco)', zIndex: 4 } },
      CK.vacio(
        'mapa',
        'Todavía no hay mapas',
        'Creá uno desde cero o traé los que ya tiene CastleKnight para ajustarlos.',
        h(
          'div.fila',
          CK.btn({ ico: 'mas', txt: 'Mapa nuevo', cls: 'pri', on: nuevoMapa }),
          CK.btn({ ico: 'importar', txt: 'Traer del juego', on: () => CK.juego.ventanaImportar().then(() => mostrar()) })
        )
      )
    );
    tablero.append(vacio);
  };
  const nuevoMapa = async () => {
    const d = { nombre: 'Mapa nuevo', tw: 40, th: 30 },
      T = CK.P.estilo.tile;
    const ok = await CK.ventana({
      titulo: 'Mapa nuevo',
      cuerpo: h(
        'div',
        CK.campo(
          'Nombre',
          CK.txt(
            d.nombre,
            v => {
              d.nombre = v;
            },
            { vivo: true }
          )
        ),
        CK.campo(
          'Ancho (tiles)',
          CK.num(d.tw, { min: 4, max: 400 }, v => {
            d.tw = v;
          })
        ),
        CK.campo(
          'Alto (tiles)',
          CK.num(d.th, { min: 4, max: 400 }, v => {
            d.th = v;
          })
        ),
        h('p.nota-txt', 'Cada tile mide ' + T + ' px (se cambia en Guía de estilo). 40 × 30 tiles = ' + 40 * T + ' × ' + 30 * T + ' px.')
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Crear mapa', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    const m = MP.crear(d.nombre.trim() || 'Mapa', d.tw * T, d.th * T);
    MP.abrir(m.id);
    pintarVacio();
  };

  // ---------------------------------------------------------------- tira de opciones sobre el lienzo
  const interruptor = (ico, tip, desc, get, set, tecla) => {
    const b = CK.btn({
      ico,
      tip,
      desc,
      tecla,
      cls: 'chico plano' + (get() ? ' activo' : ''),
      on: () => {
        set(!get());
        b.classList.toggle('activo', get());
        MP.pedir();
        MP.revisarBucle();
      }
    });
    return b;
  };
  const pintarOpc = () => {
    if (!tiraOpc) return;
    CK.vaciar(tiraOpc);
    if (!CK.P) return;
    const m = M();
    selMapa = CK.sel(
      m ? m.id : '',
      Object.values(CK.P.mapas).map(x => [x.id, x.nombre]),
      v => {
        MP.abrir(v);
      }
    );
    selMapa.style.width = '170px';
    CK.tip(selMapa, 'Mapa abierto', 'Cambiá de mapa. Cada uno guarda sus capas, objetos y zonas.');
    tiraOpc.append(
      h(
        'div.tira',
        selMapa,
        CK.btn({ ico: 'mas', tip: 'Mapa nuevo', desc: 'Crea un mapa vacío.', cls: 'chico plano', on: nuevoMapa }),
        CK.btn({
          ico: 'importar',
          tip: 'Traer del juego',
          desc: 'Importa mapas y assets de CastleKnight.',
          cls: 'chico plano',
          on: () => CK.juego.ventanaImportar().then(() => mostrar())
        })
      )
    );
    if (!m) return;
    tiraOpc.append(
      h(
        'div.tira',
        interruptor(
          'grilla',
          'Grilla',
          'Muestra la cuadrícula de tiles.',
          () => S.grilla,
          v => {
            S.grilla = v;
          },
          'Ctrl + ’'
        ),
        interruptor(
          'iman',
          'Ajustar a la grilla',
          'Al mover o colocar, los objetos se pegan a medio tile. Apagalo para ubicarlos libres, sin cuadrícula.',
          () => S.iman,
          v => {
            S.iman = v;
          }
        ),
        h('span.sep'),
        interruptor(
          'colision',
          'Ver colisiones',
          'Muestra los rectángulos sólidos (rojo: sueltos; dorado: de un objeto).',
          () => S.ver.cols,
          v => {
            S.ver.cols = v;
          }
        ),
        interruptor(
          'caminar',
          'Ver zonas',
          'Muestra las zonas caminables y bloqueadas pintadas.',
          () => S.ver.zonas,
          v => {
            S.ver.zonas = v;
          }
        ),
        interruptor(
          'luz',
          'Ver luces',
          'Muestra las luces y la luz ambiente como se verían en el juego.',
          () => S.ver.luces,
          v => {
            S.ver.luces = v;
          }
        ),
        interruptor(
          'nota',
          'Ver notas y marcas',
          'Muestra las notas y las marcas de animación.',
          () => S.ver.notas,
          v => {
            S.ver.notas = v;
            S.ver.marcas = v;
          }
        ),
        interruptor(
          'play',
          'Animar',
          'Reproduce las animaciones de los objetos dentro del editor.',
          () => S.animar,
          v => {
            S.animar = v;
          }
        )
      )
    );
    const hh = S.herr;
    if (['pincel', 'borrador', 'zona'].includes(hh)) {
      const r = CK.rango(S.pincel, { min: 1, max: 9 }, v => {
        S.pincel = v;
      });
      r.style.width = '130px';
      const t = h('div.tira', h('span.txt', 'Tamaño'), r);
      CK.tip(t, 'Tamaño del pincel', 'Cuántas celdas pinta de una vez.', '[ y ]');
      tiraOpc.append(t);
    }
    if (hh === 'zona' || hh === 'balde-zona')
      tiraOpc.append(
        h(
          'div.tira',
          Object.keys(MP.ZONAS).map(k => {
            const z = MP.ZONAS[k],
              b = CK.btn({
                txt: z.nombre,
                cls: 'chico' + (S.zonaValor === +k ? ' activo' : ''),
                desc: {
                  1: 'Por acá pueden caminar todos.',
                  2: 'Nadie puede pasar.',
                  3: 'Solo los NPC (el jugador choca).',
                  4: 'Solo el jugador (los NPC no entran).'
                }[k],
                on: () => {
                  S.zonaValor = +k;
                  pintarOpc();
                }
              });
            b.prepend(
              h('span', { style: { width: '10px', height: '10px', borderRadius: '2px', background: z.color, display: 'inline-block' } })
            );
            return b;
          })
        )
      );
    if (hh === 'punto')
      tiraOpc.append(
        h(
          'div.tira',
          h('span.txt', 'Tipo'),
          CK.sel(
            S.puntoClase || 'aparicion',
            Object.keys(MP.PUNTOS).map(k => [k, MP.PUNTOS[k][0]]),
            v => {
              S.puntoClase = v;
            }
          )
        )
      );
    if (hh === 'caminar')
      tiraOpc.append(
        h(
          'div.tira',
          h('span.txt', 'Héroe'),
          CK.btn({
            txt: S.caminar && S.caminar.asset ? CK.P.assets[S.caminar.asset].nombre : 'Muñeco de prueba',
            cls: 'chico',
            desc: 'Elegí la hoja de un personaje para caminar con él.',
            on: async () => {
              const id = await CK.elegirAsset('Personaje para caminar', ['personaje', 'hoja', 'sprite']);
              if (id) {
                S.caminar = S.caminar || { x: M().w / 2, y: M().h / 2, capa: S.capa };
                S.caminar.asset = id;
                pintarOpc();
                MP.revisarBucle();
              }
            }
          })
        )
      );
    if (hh === 'colocar')
      tiraOpc.append(
        h(
          'div.tira',
          h(
            'span.txt',
            S.prefab && CK.P.prefabs[S.prefab]
              ? 'Prearmado: ' + CK.P.prefabs[S.prefab].nombre
              : S.asset && CK.P.assets[S.asset]
                ? 'Colocando: ' + CK.P.assets[S.asset].nombre
                : 'Elegí qué colocar en la pestaña Assets'
          )
        )
      );
  };

  // ---------------------------------------------------------------- pestaña Capas
  const ICO_CAPA = { terreno: 'terreno', tiles: 'grilla', objetos: 'assets' };
  let arrastrada = null;
  const pintarCapas = c => {
    const m = M();
    if (!m) {
      c.append(h('div.bloque', h('p.ayuda-txt', 'Abrí o creá un mapa para ver sus capas.')));
      return;
    }
    const lista = CK.capasUI({
      items: () => m.capas,
      id: cp => cp.id,
      nombre: cp => cp.nombre,
      carpeta: cp => cp.carpeta || null,
      ponerCarpeta: (cp, n) => {
        if (n) cp.carpeta = n;
        else delete cp.carpeta;
      },
      visible: cp => cp.visible,
      ponerVisible: (cp, v) => {
        cp.visible = v;
      },
      activo: () => S.capa,
      elegir: (cp, callado) => {
        S.capa = cp.id;
        if (!callado) tabs.refrescar();
      },
      cambio: (nombre, fn) => {
        const f = MP.fin(nombre);
        fn();
        f();
        MP.pedir();
        tabs.refrescar();
      },
      plegadas: capasPlegadas,
      doble: async cp => {
        const n = await CK.pedir('Nombre de la capa', 'Nombre', cp.nombre);
        if (n) {
          const f = MP.fin('Renombrar capa');
          cp.nombre = n;
          f();
          tabs.refrescar();
        }
      },
      fila: cp => [
        CK.btn({
          ico: cp.visible ? 'ojo' : 'ojoNo',
          tip: cp.visible ? 'Ocultar capa' : 'Mostrar capa',
          desc: 'Una capa oculta no se ve en el editor ni se exporta.',
          cls: cp.visible ? 'encendido' : '',
          on: e => {
            e.stopPropagation();
            const f = MP.fin('Ver capa');
            cp.visible = !cp.visible;
            f();
            MP.pedir();
            tabs.refrescar();
          }
        }),
        CK.btn({
          ico: cp.bloqueada ? 'candado' : 'candadoNo',
          tip: cp.bloqueada ? 'Desbloquear' : 'Bloquear',
          desc: 'Una capa bloqueada no se puede tocar por accidente.',
          cls: cp.bloqueada ? 'encendido' : '',
          on: e => {
            e.stopPropagation();
            const f = MP.fin('Bloquear capa');
            cp.bloqueada = !cp.bloqueada;
            f();
            tabs.refrescar();
          }
        }),
        h('span', { html: CK.ico(ICO_CAPA[cp.tipo], 16) }),
        h('span.nombre', cp.nombre),
        h('span.sub', cp.tipo === 'objetos' ? cp.objetos.length + ' obj.' : cp.tipo === 'terreno' ? 'bordes auto' : 'piezas')
      ]
    });
    const mover = dir => {
      const i = m.capas.findIndex(x => x.id === S.capa),
        j = i + dir;
      if (i < 0 || j < 0 || j >= m.capas.length) return;
      const f = MP.fin('Ordenar capas');
      [m.capas[i], m.capas[j]] = [m.capas[j], m.capas[i]];
      CK.capasAgrupar(m.capas, x => x.carpeta || null);
      f();
      MP.pedir();
      tabs.refrescar();
    };
    const agregar = tipo => {
      const f = MP.fin('Nueva capa'),
        cp = MP.nuevaCapa(tipo),
        i = m.capas.findIndex(x => x.id === S.capa);
      m.capas.splice(i < 0 ? m.capas.length : i + 1, 0, cp);
      f();
      S.capa = cp.id;
      tabs.refrescar();
    };
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Capas (arriba = adelante · se arrastran · carpetas con clic derecho)'),
        lista,
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'terreno',
            tip: 'Nueva capa de Terreno',
            desc: 'Suelo con bordes y esquinas automáticos (pasto, camino de piedra, tierra). Pintás la mancha y las transiciones salen solas.',
            cls: 'chico',
            on: () => agregar('terreno')
          }),
          CK.btn({
            ico: 'grilla',
            tip: 'Nueva capa de Tiles',
            desc: 'Piezas sueltas elegidas a mano de un tileset o textura.',
            cls: 'chico',
            on: () => agregar('tiles')
          }),
          CK.btn({
            ico: 'assets',
            tip: 'Nueva capa de Objetos',
            desc: 'Sprites sueltos: casas, árboles, NPC, luces. Se ordenan solos por profundidad.',
            cls: 'chico',
            on: () => agregar('objetos')
          }),
          CK.btn({
            ico: 'carpeta',
            tip: 'Carpeta nueva',
            desc: 'Mete la capa elegida en una carpeta nueva. Después podés arrastrar otras capas adentro.',
            cls: 'chico',
            on: () => lista.nuevaCarpeta()
          }),
          h('span.crece'),
          CK.btn({ ico: 'subir', tip: 'Traer adelante', desc: 'Sube la capa: se dibuja por encima.', cls: 'chico', on: () => mover(1) }),
          CK.btn({ ico: 'bajar', tip: 'Enviar atrás', desc: 'Baja la capa: se dibuja por debajo.', cls: 'chico', on: () => mover(-1) }),
          CK.btn({
            ico: 'basura',
            tip: 'Borrar capa',
            desc: 'Elimina la capa activa con todo su contenido.',
            cls: 'chico peligro',
            on: async () => {
              const cp = MP.capaAct();
              if (!cp) return;
              if (await CK.confirmar('Borrar capa', 'Se borra "' + cp.nombre + '" con todo lo que tiene. Se puede deshacer.', 'Borrar')) {
                const f = MP.fin('Borrar capa');
                m.capas = m.capas.filter(x => x.id !== cp.id);
                f();
                S.capa = (m.capas[m.capas.length - 1] || {}).id;
                MP.invalidar();
                tabs.refrescar();
              }
            }
          })
        )
      )
    );
    const cp = MP.capaAct();
    if (!cp) return;
    const op = CK.rango(Math.round(cp.opacidad * 100), { min: 0, max: 100 }, (v, fin) => {
      cp.opacidad = v / 100;
      MP.pedir();
      if (fin) CK.tocar();
    });
    if (cp.tipo === 'objetos') {
      c.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Capa "' + cp.nombre + '"'),
          CK.campo('Opacidad', op),
          CK.campo(
            'Profundidad',
            CK.sel(
              cp.orden,
              [
                ['y', 'Automática (por posición)'],
                ['lista', 'Manual (orden de la lista)']
              ],
              v => {
                const f = MP.fin('Orden de capa');
                cp.orden = v;
                f();
                MP.pedir();
              }
            ),
            'Automática: lo que está más abajo en el mapa tapa a lo que está más arriba, como en el juego. Manual: se dibujan en el orden de la lista.'
          )
        )
      );
      c.append(h('div.bloque', h('h3.bloque-tit', 'Objetos de la capa'), listaObjetos(cp)));
    } else {
      const a = CK.P.assets[cp.tileset];
      const elegirTs = async () => {
        const id = await CK.elegirAsset(
          cp.tipo === 'terreno' ? 'Tileset de transiciones para esta capa' : 'Tileset o textura para esta capa',
          cp.tipo === 'terreno' ? ['tileset'] : ['tileset', 'textura'],
          h(
            'p.nota-txt',
            cp.tipo === 'terreno'
              ? 'Los tilesets de transición se crean en la sección Texturas (16 piezas de bordes y esquinas).'
              : 'Cualquier imagen sirve: se corta en piezas del tamaño del tile.'
          )
        );
        if (id) {
          const f = MP.fin('Elegir tileset');
          cp.tileset = id;
          f();
          S.tileSel = [0];
          MP.invalidar(cp.id);
          tabs.refrescar();
        }
      };
      const b = h(
        'div.bloque',
        h('h3.bloque-tit', 'Capa "' + cp.nombre + '"'),
        CK.campo('Opacidad', op),
        CK.campo(
          'Tileset',
          CK.btn({ txt: a ? a.nombre : 'Elegir…', ico: 'texturas', desc: 'El juego de piezas con el que pinta esta capa.', on: elegirTs })
        )
      );
      if (cp.tipo === 'terreno')
        b.append(
          h(
            'p.nota-txt',
            a
              ? 'Con el pincel (B) pintás la mancha de este terreno; los bordes orgánicos se arman solos.'
              : 'Elegí un tileset de transiciones para empezar a pintar.'
          ),
          h(
            'div.fila',
            { style: { marginTop: '8px' } },
            CK.btn({
              txt: 'Cubrir todo',
              cls: 'chico',
              desc: 'Llena el mapa entero con este terreno.',
              on: () => {
                const f = MP.fin('Cubrir todo'),
                  r = MP.datosCapa(cp);
                r.arr.fill(1);
                r.sucio = true;
                MP.guardarCapa(cp);
                f();
                MP.pedir();
              }
            }),
            CK.btn({
              txt: 'Vaciar',
              cls: 'chico',
              desc: 'Quita todo lo pintado en esta capa.',
              on: () => {
                const f = MP.fin('Vaciar capa'),
                  r = MP.datosCapa(cp);
                r.arr.fill(0);
                r.sucio = true;
                MP.guardarCapa(cp);
                f();
                MP.pedir();
              }
            })
          )
        );
      else if (!a)
        b.append(
          h(
            'div.fila',
            { style: { marginTop: '8px' } },
            CK.btn({
              ico: 'importar',
              txt: 'Importar tileset',
              cls: 'chico pri',
              desc: 'Traé una hoja de tiles (PNG) y cortala en piezas.',
              on: async () => {
                const id = await CK.tiles.importar();
                if (!id) return;
                const f = MP.fin('Elegir tileset');
                cp.tileset = id;
                f();
                S.tileSel = [0];
                S.sello = null;
                MP.invalidar(cp.id);
                tabs.refrescar();
              }
            })
          )
        );
      else if (a)
        b.append(
          h('span.mini-rot', 'Piezas · clic: una · arrastrar: un bloque (sello) · Mayús + clic: sumar varias al azar'),
          selectorTiles(cp, a)
        );
      c.append(b);
    }
  };
  let zoomSel = 0; // 0 = automático
  const selectorTiles = (cp, a) => {
    const T = (a.tileset && a.tileset.tile) || M().tile,
      cols = Math.max(1, Math.floor(a.w / T)),
      filas = Math.max(1, Math.floor(a.h / T)),
      k = zoomSel || Math.max(1, Math.min(4, Math.floor(280 / (cols * T)))),
      X = CK.mapa.TXF;
    const cv = CK.lienzo(cols * T * k, filas * T * k);
    cv.style.cursor = CK.cur('pointer');
    cv.style.touchAction = 'none';
    let arr = null,
      sobre = -1;
    const celda = e => {
      const r = cv.getBoundingClientRect(),
        c = CK.clamp(Math.floor(((e.clientX - r.left) / r.width) * cols), 0, cols - 1),
        f = CK.clamp(Math.floor(((e.clientY - r.top) / r.height) * filas), 0, filas - 1);
      return { c, f, i: f * cols + c };
    };
    const pintar = () => {
      const x = CK.ctx(cv);
      CK.cuadros(x, cv.width, cv.height, 8);
      x.imageSmoothingEnabled = false;
      x.drawImage(CK.img[a.id], 0, 0, cols * T, filas * T, 0, 0, cv.width, cv.height);
      x.strokeStyle = 'rgba(0,0,0,.35)';
      x.lineWidth = 1;
      for (let i = 1; i < cols; i++) {
        x.beginPath();
        x.moveTo(i * T * k + 0.5, 0);
        x.lineTo(i * T * k + 0.5, cv.height);
        x.stroke();
      }
      for (let j = 1; j < filas; j++) {
        x.beginPath();
        x.moveTo(0, j * T * k + 0.5);
        x.lineTo(cv.width, j * T * k + 0.5);
        x.stroke();
      }
      x.strokeStyle = '#e8b83a';
      x.lineWidth = 2;
      if (S.sello) {
        const c0 = S.sello.c0 % cols,
          f0 = Math.floor(S.sello.c0 / cols);
        x.strokeRect(c0 * T * k + 1, f0 * T * k + 1, S.sello.w * T * k - 2, S.sello.h * T * k - 2);
      } else S.tileSel.forEach(i => x.strokeRect((i % cols) * T * k + 1, Math.floor(i / cols) * T * k + 1, T * k - 2, T * k - 2));
      if (arr) {
        const c0 = Math.min(arr.a.c, arr.b.c),
          f0 = Math.min(arr.a.f, arr.b.f);
        x.strokeStyle = '#fff';
        x.setLineDash([4, 3]);
        x.strokeRect(
          c0 * T * k + 0.5,
          f0 * T * k + 0.5,
          (Math.abs(arr.a.c - arr.b.c) + 1) * T * k - 1,
          (Math.abs(arr.a.f - arr.b.f) + 1) * T * k - 1
        );
        x.setLineDash([]);
      }
      pintarMuestra();
    };
    // elegir: clic = una pieza · arrastrar = un bloque de piezas (sello) · Mayús + clic = sumar piezas que se alternan al azar
    cv.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      cv.setPointerCapture(e.pointerId);
      const q = celda(e);
      if (e.shiftKey) {
        S.sello = null;
        S.tileSel = S.tileSel.includes(q.i) ? S.tileSel.filter(z => z !== q.i) : S.tileSel.concat(q.i);
        if (!S.tileSel.length) S.tileSel = [q.i];
        pintar();
        return;
      }
      arr = { a: q, b: q };
      pintar();
    });
    cv.addEventListener('pointermove', e => {
      const q = celda(e);
      if (q.i !== sobre) {
        sobre = q.i;
        cv.title = 'Pieza ' + (q.i + 1) + ' (columna ' + (q.c + 1) + ', fila ' + (q.f + 1) + ')';
      }
      if (!arr) return;
      if (q.i !== arr.b.i) {
        arr.b = q;
        pintar();
      }
    });
    cv.addEventListener('pointerup', () => {
      if (!arr) return;
      const c0 = Math.min(arr.a.c, arr.b.c),
        f0 = Math.min(arr.a.f, arr.b.f),
        w = Math.abs(arr.a.c - arr.b.c) + 1,
        hh = Math.abs(arr.a.f - arr.b.f) + 1;
      arr = null;
      if (w * hh > 1) {
        const celdas = [];
        for (let f = 0; f < hh; f++) for (let c = 0; c < w; c++) celdas.push((f0 + f) * cols + c0 + c);
        S.sello = { w, h: hh, celdas, c0: f0 * cols + c0 };
        S.tileSel = [celdas[0]];
      } else {
        S.sello = null;
        S.tileSel = [f0 * cols + c0];
      }
      pintar();
      pintarXf();
      if (S.herr !== 'pincel' && S.herr !== 'balde') MP.herr('pincel');
    });
    // muestra de lo que se va a pintar, con giro y espejo
    const muestra = CK.lienzo(64, 64);
    muestra.className = 'tiles-muestra';
    const pintarMuestra = () => {
      const sl = CK.mapa.selloActual(),
        w = sl ? sl.w : 1,
        hh = sl ? sl.h : 1,
        z = Math.max(1, Math.floor(64 / (Math.max(w, hh) * T))),
        x = CK.ctx(muestra);
      x.clearRect(0, 0, 64, 64);
      CK.cuadros(x, 64, 64, 8);
      x.imageSmoothingEnabled = false;
      const ox = Math.floor((64 - w * T * z) / 2),
        oy = Math.floor((64 - hh * T * z) / 2),
        img = CK.img[a.id];
      const una = (v, dx, dy) => {
        const p = (v & X.idx) - 1;
        x.save();
        x.translate(dx + (T * z) / 2, dy + (T * z) / 2);
        if (v & X.rot) x.rotate(Math.PI / 2);
        x.scale(v & X.fx ? -1 : 1, v & X.fy ? -1 : 1);
        x.drawImage(img, (p % cols) * T, Math.floor(p / cols) * T, T, T, (-T * z) / 2, (-T * z) / 2, T * z, T * z);
        x.restore();
      };
      if (sl) for (let r = 0; r < hh; r++) for (let q = 0; q < w; q++) una(sl.celdas[r * w + q], ox + q * T * z, oy + r * T * z);
      else una((S.tileSel[0] + 1) | (S.tileXf & ~X.idx), ox, oy);
    };
    const bXf = {};
    const pintarXf = () => {
      bXf.rot.classList.toggle('activo', !!(S.tileXf & X.rot));
      bXf.fx.classList.toggle('activo', !!(S.tileXf & X.fx));
      bXf.fy.classList.toggle('activo', !!(S.tileXf & X.fy));
      pintarMuestra();
      MP.pedir();
    };
    const xf = fn => () => {
      S.tileXf = fn(S.tileXf);
      pintarXf();
    };
    bXf.rot = CK.btn({
      ico: 'rotar',
      tip: 'Girar 90°',
      desc: 'Gira lo que vas a pintar (una pieza o el bloque entero).',
      tecla: 'R',
      cls: 'chico plano',
      on: xf(CK.mapa.xfGirar)
    });
    bXf.fx = CK.btn({
      ico: 'espejo',
      tip: 'Espejo horizontal',
      desc: 'Da vuelta lo que vas a pintar de izquierda a derecha.',
      tecla: 'F',
      cls: 'chico plano',
      on: xf(f => CK.mapa.xfEspejo(f, 'h'))
    });
    bXf.fy = CK.btn({
      ico: 'espejo',
      tip: 'Espejo vertical',
      desc: 'Da vuelta lo que vas a pintar de arriba a abajo.',
      tecla: 'Mayús + F',
      cls: 'chico plano',
      on: xf(f => CK.mapa.xfEspejo(f, 'v'))
    });
    bXf.fy.firstChild.style.transform = 'rotate(90deg)';
    const bNormal = CK.btn({
      txt: 'Normal',
      cls: 'chico plano',
      desc: 'Sin giro ni espejo.',
      on: () => {
        S.tileXf = 0;
        pintarXf();
      }
    });
    const zoomB = d =>
      CK.btn({
        ico: d > 0 ? 'lupaMas' : 'lupaMenos',
        tip: d > 0 ? 'Agrandar piezas' : 'Achicar piezas',
        cls: 'chico plano',
        on: () => {
          zoomSel = CK.clamp((zoomSel || k) + d, 1, 8);
          tabs.refrescar();
        }
      });
    const tira = h(
      'div.tiles-tira',
      muestra,
      h(
        'div.tiles-tira-btns',
        h('div.fila.junto', bXf.rot, bXf.fx, bXf.fy, bNormal),
        h('div.fila.junto', zoomB(-1), zoomB(1), h('span.nota-txt', 'Alt + clic en el mapa: tomar pieza'))
      )
    );
    pintar();
    pintarXf();
    return h(
      'div',
      tira,
      h('div.tiles-sel', cv),
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        CK.btn({
          ico: 'importar',
          txt: 'Importar tileset',
          cls: 'chico',
          desc: 'Traé una hoja de tiles (PNG) y cortala en piezas: tamaño, margen y separación. Queda puesta en esta capa.',
          on: async () => {
            const id = await CK.tiles.importar();
            if (!id) return;
            const f = MP.fin('Elegir tileset');
            cp.tileset = id;
            f();
            S.tileSel = [0];
            S.sello = null;
            MP.invalidar(cp.id);
            tabs.refrescar();
          }
        }),
        CK.btn({
          ico: 'texturas',
          txt: 'Editar piezas',
          cls: 'chico',
          desc: 'Abre el tileset en Texturas → Tileset: girar, espejar, duplicar, ordenar y borrar piezas (lo pintado se acomoda solo).',
          on: () => CK.ir('texturas', { tileset: a.id })
        })
      )
    );
  };
  const nombreObj = o =>
    o.nombre ||
    (o.tipo === 'luz' ? 'Luz' : o.tipo === 'punto' ? MP.PUNTOS[o.clase][0] : (CK.P.assets[o.asset] || {}).nombre || o.clave || 'Objeto');
  const listaObjetos = cp => {
    const l = h('div.lista', { style: { maxHeight: '320px', overflowY: 'auto' } });
    if (!cp.objetos.length) {
      l.append(h('p.nota-txt', 'Vacía. Elegí algo en la pestaña Assets y hacé clic en el mapa para colocarlo.'));
      return l;
    }
    const fila = (o, hijo) => {
      const a = CK.P.assets[o.asset];
      return h(
        'div.item' + (hijo ? '.hijo' : '') + (S.sel.includes(o.id) ? '.activo' : ''),
        {
          onclick: e => {
            MP.elegir(e.shiftKey ? S.sel.concat(o.id) : [o.id]);
            vista.centrarEn(o.x, o.y - 10);
          }
        },
        o.tipo
          ? h('span', { html: CK.ico(o.tipo === 'luz' ? 'luz' : 'punto', 16) })
          : CK.mini(CK.img[o.asset], 20, a && CK.asset.cuadro(a, 0)),
        h('span.nombre', nombreObj(o)),
        o.marca ? h('span.etq.' + (o.marca.estado === 'hecha' ? 'verde' : 'oro'), 'anim') : null,
        o.col ? h('span.etq', 'col') : null,
        CK.btn({
          ico: o.oculto ? 'ojoNo' : 'ojo',
          tip: o.oculto ? 'Mostrar' : 'Ocultar',
          cls: o.oculto ? '' : 'encendido',
          on: e => {
            e.stopPropagation();
            const f = MP.fin('Ver objeto');
            o.oculto = !o.oculto;
            f();
            MP.pedir();
            tabs.refrescar();
          }
        }),
        CK.btn({
          ico: o.bloqueado ? 'candado' : 'candadoNo',
          tip: o.bloqueado ? 'Desbloquear' : 'Bloquear',
          cls: o.bloqueado ? 'encendido' : '',
          on: e => {
            e.stopPropagation();
            const f = MP.fin('Bloquear objeto');
            o.bloqueado = !o.bloqueado;
            f();
            tabs.refrescar();
          }
        })
      );
    };
    const grupos = {};
    cp.objetos.forEach(o => {
      if (o.grupo) (grupos[o.grupo] = grupos[o.grupo] || []).push(o);
    });
    const vistos = new Set();
    let n = 0;
    cp.objetos
      .slice()
      .reverse()
      .forEach(o => {
        if (n > 400) return;
        if (o.grupo && grupos[o.grupo].length > 1) {
          if (vistos.has(o.grupo)) return;
          vistos.add(o.grupo);
          const g = (cp.grupos || []).find(x => x.id === o.grupo) || { id: o.grupo, nombre: 'Grupo' },
            ids = grupos[o.grupo].map(x => x.id),
            abierto = !g.cerrado;
          l.append(
            h(
              'div.item' + (ids.every(i => S.sel.includes(i)) ? '.activo' : ''),
              {
                onclick: () => MP.elegir(ids),
                ondblclick: async () => {
                  const nn = await CK.pedir('Nombre del grupo', 'Nombre', g.nombre);
                  if (nn) {
                    g.nombre = nn;
                    if (!(cp.grupos || []).includes(g)) (cp.grupos = cp.grupos || []).push(g);
                    CK.tocar();
                    tabs.refrescar();
                  }
                }
              },
              CK.btn({
                ico: abierto ? 'flechaAb' : 'flechaD',
                tip: abierto ? 'Plegar grupo' : 'Desplegar grupo',
                on: e => {
                  e.stopPropagation();
                  g.cerrado = abierto;
                  if (!(cp.grupos || []).includes(g)) (cp.grupos = cp.grupos || []).push(g);
                  tabs.refrescar();
                }
              }),
              h('span', { html: CK.ico('grupo', 16) }),
              h('span.nombre', g.nombre),
              h('span.sub', ids.length + ' piezas')
            )
          );
          if (abierto)
            grupos[o.grupo].forEach(x => {
              l.append(fila(x, true));
              n++;
            });
        } else {
          l.append(fila(o));
          n++;
        }
      });
    if (cp.objetos.length > 400) l.append(h('p.nota-txt', 'Se muestran los primeros 400. Elegí los demás haciendo clic en el mapa.'));
    return l;
  };

  // ---------------------------------------------------------------- pestaña Propiedades
  const numP = (rot, get, set, o = {}) =>
    h(
      'label',
      h('span.mini-rot', rot),
      CK.num(get(), Object.assign({ step: 1 }, o), v => {
        set(v);
      })
    );
  const pintarProp = c => {
    const m = M();
    if (!m) return;
    if (S.selCol) {
      const k = m.colisiones.find(x => x.id === S.selCol);
      if (k) {
        const ed = campo =>
          numP(
            { x: 'X', y: 'Y', w: 'Ancho', h: 'Alto' }[campo],
            () => k[campo],
            v => {
              const f = MP.fin('Ajustar colisión');
              k[campo] = v;
              f();
              MP.pedir();
            },
            campo === 'w' || campo === 'h' ? { min: 1 } : {}
          );
        c.append(
          h(
            'div.bloque',
            h('h3.bloque-tit', { html: CK.ico('colision', 16) }, 'Colisión'),
            h('div.duo', ed('x'), ed('y'), ed('w'), ed('h')),
            h(
              'div.fila',
              { style: { marginTop: '10px' } },
              CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'peligro', tecla: 'Supr', on: MP.borrarSel })
            )
          )
        );
        return;
      }
    }
    if (S.selNota) {
      const n = (m.notas || []).find(x => x.id === S.selNota);
      if (n) {
        c.append(
          h(
            'div.bloque',
            h('h3.bloque-tit', { html: CK.ico('nota', 16) }, 'Nota'),
            CK.h(
              'label.campo.ancho',
              h('span.campo-rot', 'Texto'),
              CK.txt(
                n.texto,
                v => {
                  const f = MP.fin('Editar nota');
                  n.texto = v;
                  f();
                  CK.emit('notas');
                  MP.pedir();
                },
                { multi: true, filas: 4 }
              )
            ),
            CK.campo(
              'Tema',
              CK.sel(n.clase, ['Arte', 'Animación', 'NPC', 'Enemigo', 'Mecánica', 'Historia', 'Otro'], v => {
                n.clase = v;
                CK.tocar();
                CK.emit('notas');
              })
            ),
            CK.chk(n.hecho, 'Resuelta', v => {
              const f = MP.fin('Nota resuelta');
              n.hecho = v;
              f();
              CK.emit('notas');
              MP.pedir();
            }),
            h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'peligro', on: MP.borrarSel }))
          )
        );
        return;
      }
    }
    const objs = S.sel.map(MP.buscarObj).filter(Boolean);
    if (!objs.length) {
      c.append(
        CK.vacio(
          'seleccionar',
          'Nada seleccionado',
          'Con la herramienta Seleccionar (V), hacé clic en un objeto, una colisión o una nota para ver y cambiar sus datos acá.'
        )
      );
      return;
    }
    const o = objs[0],
      uno = objs.length === 1,
      a = CK.P.assets[o.asset];
    const set = (nombre, fn) => {
      MP.cambiar(nombre, fn);
    };
    const cab = h(
      'div.fila.junto',
      o.tipo
        ? h('span', { html: CK.ico(o.tipo === 'luz' ? 'luz' : 'punto', 28) })
        : CK.mini(CK.img[o.asset], 40, a && CK.asset.cuadro(a, 0)),
      h(
        'div.crece',
        h('b', uno ? nombreObj(o) : objs.length + ' objetos'),
        h('div.nota-txt', uno ? (o.tipo ? '' : a ? a.w + '×' + a.h + ' px' : 'sin imagen') : 'Los cambios se aplican a todos')
      )
    );
    const b = h('div.bloque', cab);
    if (uno)
      b.append(
        CK.campo(
          'Nombre',
          CK.txt(
            o.nombre || '',
            v =>
              set('Nombre', x => {
                x.nombre = v;
              }),
            { ph: nombreObj(o) }
          )
        )
      );
    b.append(
      h(
        'div.duo',
        { style: { marginTop: '6px' } },
        numP(
          'X',
          () => o.x,
          v =>
            set('Mover', x => {
              x.x += v - o.x;
            })
        ),
        numP(
          'Y (base)',
          () => o.y,
          v => {
            const d = v - o.y;
            set('Mover', x => {
              x.y += d;
            });
          }
        )
      )
    );
    c.append(b);
    if (o.tipo === 'luz') {
      c.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Luz'),
          CK.campo(
            'Color',
            CK.color(o.color, v => {
              objs.forEach(x => {
                x.color = v;
              });
              MP.pedir();
              CK.tocar();
            })
          ),
          CK.campo(
            'Radio',
            CK.rango(o.radio, { min: 8, max: 300 }, (v, f) => {
              objs.forEach(x => {
                x.radio = v;
              });
              MP.pedir();
              if (f) CK.tocar();
            })
          ),
          CK.campo(
            'Intensidad',
            CK.rango(Math.round(o.fuerza * 100), { min: 5, max: 100 }, (v, f) => {
              objs.forEach(x => {
                x.fuerza = v / 100;
              });
              MP.pedir();
              if (f) CK.tocar();
            })
          ),
          CK.campo(
            'Parpadeo',
            CK.rango(o.parpadeo || 0, { min: 0, max: 4 }, (v, f) => {
              objs.forEach(x => {
                x.parpadeo = v;
              });
              MP.revisarBucle();
              MP.pedir();
              if (f) CK.tocar();
            }),
            '0 = luz fija. Más alto = titila como una llama.'
          )
        )
      );
    } else if (o.tipo === 'punto') {
      const pb = h(
        'div.bloque',
        h('h3.bloque-tit', 'Punto'),
        CK.campo(
          'Tipo',
          CK.sel(
            o.clase,
            Object.keys(MP.PUNTOS).map(k => [k, MP.PUNTOS[k][0]]),
            v => {
              set('Tipo de punto', x => {
                x.clase = v;
              });
              tabs.refrescar();
            }
          )
        )
      );
      const pp = o.props || {},
        sp = (nombre, k) => v => {
          set(nombre, x => {
            x.props = x.props || {};
            x.props[k] = v;
          });
          MP.revisarBucle();
        };
      if (o.clase === 'npc') {
        const sa = CK.P.assets[pp.sprite];
        pb.append(
          CK.campo(
            'Ficha',
            CK.sel(
              pp.npc || '',
              [['', '(sin ficha: no conversa)']].concat(Object.values(CK.P.npcs).map(n => [n.id, n.nombre])),
              sp('NPC', 'npc')
            ),
            'La ficha de diálogos de este NPC. Se crean en la sección NPC.'
          ),
          CK.campo(
            'Aspecto',
            CK.sel(
              pp.aspecto || 'npc1',
              Object.keys(CK.ASPECTOS).map(k => [k, CK.ASPECTOS[k]]),
              sp('Aspecto', 'aspecto')
            ),
            'Uno de los personajes que el juego ya trae animados.'
          ),
          CK.campo(
            'Sprite propio',
            h(
              'div.fila',
              CK.btn({
                txt: sa ? sa.nombre : 'Usar el aspecto',
                ico: 'imagen',
                cls: 'chico',
                desc: 'Usa un asset tuyo (quieto o animado) en vez de un personaje del juego.',
                on: async () => {
                  const id = await CK.elegirAsset('Sprite del NPC', ['sprite', 'hoja', 'personaje']);
                  if (id) {
                    sp('Sprite', 'sprite')(id);
                    tabs.refrescar();
                  }
                }
              }),
              sa
                ? CK.btn({
                    ico: 'cerrar',
                    tip: 'Volver al aspecto del juego',
                    cls: 'chico',
                    on: () => {
                      sp('Sprite', 'sprite')('');
                      tabs.refrescar();
                    }
                  })
                : null
            )
          ),
          h(
            'div.duo',
            numP('Escala (0 = normal)', () => +pp.escala || 0, sp('Escala', 'escala'), { min: 0, step: 0.1 }),
            CK.chk(!!pp.flip, 'Mira a la izquierda', sp('Voltear', 'flip'))
          )
        );
      }
      if (o.clase === 'puerta') {
        const dm = CK.P.mapas[pp.destino],
          pts = dm
            ? MP.objetosDe(dm, true)
                .filter(q => q.tipo === 'punto' && q.nombre)
                .map(q => q.nombre)
            : [];
        pb.append(
          CK.campo(
            'Lleva a',
            CK.sel(
              pp.destino || '',
              [
                ['', '(elegir)'],
                ['_aldea', '↩ Volver a la aldea']
              ].concat(
                Object.values(CK.P.mapas)
                  .filter(x => !x.origen && x.id !== M().id)
                  .map(x => [x.id, x.nombre])
              ),
              v => {
                sp('Destino', 'destino')(v);
                tabs.refrescar();
              }
            ),
            'A dónde va el héroe al pisar esta puerta: otro mapa tuyo o de vuelta a la aldea.'
          )
        );
        if (dm)
          pb.append(
            CK.campo(
              'Llega al punto',
              CK.sel(pp.llegada || '', [['', '(aparición del mapa)']].concat([...new Set(pts)]), sp('Llegada', 'llegada')),
              'Un punto con nombre del mapa de destino. Ponelo un paso afuera de la puerta de vuelta para que no rebote.'
            )
          );
      }
      if (o.clase === 'enemigo') {
        pb.append(
          CK.campo(
            'Enemigo',
            CK.sel(
              pp.tipo || 'orc',
              Object.keys(CK.ENEMIGOS).map(k => [k, CK.ENEMIGOS[k]]),
              sp('Enemigo', 'tipo')
            )
          ),
          CK.campo(
            'Radio de ronda',
            CK.num(pp.radio || 40, { min: 0, max: 400 }, sp('Radio', 'radio')),
            'Sin ruta dibujada, el enemigo deambula dentro de este radio.'
          ),
          CK.chk(!!pp.noche, 'Solo aparece de noche', sp('Noche', 'noche')),
          h(
            'div.fila',
            { style: { marginTop: '6px' } },
            CK.btn({
              ico: 'lapiz',
              txt: S.herr === 'ruta' ? 'Terminar ruta' : 'Dibujar ruta',
              cls: 'chico' + (S.herr === 'ruta' ? ' pri' : ''),
              desc: 'Cada clic en el mapa agrega un punto de patrulla. El enemigo los recorre en orden y vuelve al inicio. Clic derecho quita el último.',
              on: () => {
                MP.herr(S.herr === 'ruta' ? 'seleccionar' : 'ruta');
                CK.estado('Clic: agregar punto de patrulla · Clic derecho: quitar el último · Esc: terminar');
                tabs.refrescar();
              }
            }),
            (o.ruta || []).length
              ? CK.btn({
                  ico: 'basura',
                  txt: 'Borrar ruta',
                  cls: 'chico',
                  on: () => {
                    set('Borrar ruta', x => {
                      x.ruta = [];
                    });
                    tabs.refrescar();
                  }
                })
              : null
          ),
          h(
            'p.nota-txt',
            (o.ruta || []).length ? 'Patrulla por ' + (o.ruta.length + 1) + ' puntos.' : 'Sin ruta: deambula cerca de su punto.'
          )
        );
      }
      if (o.clase === 'efecto')
        pb.append(
          CK.campo(
            'Efecto',
            CK.sel(pp.fx || '', [['', '(elegir)']].concat(Object.values(CK.P.fx).map(f => [f.id, f.nombre])), sp('Efecto', 'fx')),
            'Un efecto de la sección FX que queda encendido en este lugar (fogata, humo, portal…).'
          )
        );
      if (o.clase === 'puerta' || o.clase === 'disparador')
        pb.append(
          h(
            'div.duo',
            numP(
              'Ancho del área',
              () => o.w || 0,
              v =>
                set('Área', x => {
                  x.w = v;
                }),
              { min: 0 }
            ),
            numP(
              'Alto del área',
              () => o.h || 0,
              v =>
                set('Área', x => {
                  x.h = v;
                }),
              { min: 0 }
            )
          )
        );
      c.append(pb);
    } else {
      c.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Tamaño y giro'),
          h(
            'div.trio',
            numP(
              'Escala X',
              () => o.sx,
              v =>
                set('Escalar', x => {
                  x.sx = v;
                }),
              { step: 0.25, min: 0.1 }
            ),
            numP(
              'Escala Y',
              () => o.sy,
              v =>
                set('Escalar', x => {
                  x.sy = v;
                }),
              { step: 0.25, min: 0.1 }
            ),
            numP(
              'Rotación °',
              () => o.rot || 0,
              v =>
                set('Rotar', x => {
                  x.rot = v;
                }),
              { step: 15 }
            )
          ),
          o.sx % 1 || o.sy % 1
            ? h(
                'p.nota-txt',
                { style: { color: 'var(--oro)' } },
                'Escala no entera: los píxeles se van a ver desparejos. Mejor ×1, ×2 o ×3.'
              )
            : null,
          h(
            'div.fila',
            { style: { marginTop: '8px' } },
            CK.btn({
              ico: 'voltearH',
              tip: 'Voltear horizontal',
              desc: 'Espeja el objeto de izquierda a derecha.',
              tecla: 'H',
              cls: o.flipX ? 'activo' : '',
              on: () => {
                set('Voltear', x => {
                  x.flipX = !x.flipX;
                });
                tabs.refrescar();
              }
            }),
            CK.btn({
              ico: 'voltearV',
              tip: 'Voltear vertical',
              desc: 'Espeja el objeto de arriba a abajo.',
              cls: o.flipY ? 'activo' : '',
              on: () => {
                set('Voltear', x => {
                  x.flipY = !x.flipY;
                });
                tabs.refrescar();
              }
            }),
            CK.btn({
              txt: '×1',
              cls: 'chico',
              tip: 'Tamaño real',
              desc: 'Vuelve la escala a 1 y la rotación a 0.',
              on: () => {
                set('Tamaño real', x => {
                  x.sx = 1;
                  x.sy = 1;
                  x.rot = 0;
                });
                tabs.refrescar();
              }
            })
          ),
          CK.campo(
            'Opacidad',
            CK.rango(Math.round((o.alpha === undefined ? 1 : o.alpha) * 100), { min: 0, max: 100 }, (v, f) => {
              objs.forEach(x => {
                x.alpha = v / 100;
              });
              MP.pedir();
              if (f) CK.tocar();
            })
          ),
          CK.campo(
            'Sombra',
            CK.rango(Math.round((o.sombra || 0) * 100), { min: 0, max: 150, step: 5 }, (v, f) => {
              objs.forEach(x => {
                if (v) x.sombra = v / 100;
                else delete x.sombra;
              });
              MP.pedir();
              if (f) CK.tocar();
            }),
            'Sombra de contacto bajo el objeto, para que se asiente en el suelo. 0 = sin sombra; 100 = del ancho del dibujo. Al exportar queda pintada en el suelo.'
          )
        )
      );
      const cp = MP.capaDe(o.id);
      c.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'Profundidad'),
          CK.campo(
            'Capa',
            CK.sel(
              cp.id,
              m.capas.filter(x => x.tipo === 'objetos').map(x => [x.id, x.nombre]),
              v => {
                const f = MP.fin('Cambiar de capa'),
                  dest = m.capas.find(x => x.id === v);
                objs.forEach(x => {
                  const de = MP.capaDe(x.id);
                  de.objetos = de.objetos.filter(q => q.id !== x.id);
                  dest.objetos.push(x);
                });
                f();
                MP.pedir();
                tabs.refrescar();
              }
            )
          ),
          CK.campo(
            'Adelantar',
            CK.num(o.z || 0, { step: 1 }, v =>
              set('Profundidad', x => {
                x.z = v;
              })
            ),
            'Suma o resta a la profundidad automática. Positivo: se dibuja más adelante de lo que le toca por su posición. Útil para techos o cosas colgadas.'
          ),
          h(
            'div.fila',
            CK.btn({
              ico: 'subir',
              txt: 'Adelante',
              cls: 'chico',
              tecla: ']',
              desc: 'Lo dibuja por encima de sus vecinos.',
              on: () => {
                MP.reordenar(1);
                tabs.refrescar();
              }
            }),
            CK.btn({
              ico: 'bajar',
              txt: 'Atrás',
              cls: 'chico',
              tecla: '[',
              desc: 'Lo dibuja por debajo de sus vecinos.',
              on: () => {
                MP.reordenar(-1);
                tabs.refrescar();
              }
            })
          )
        )
      );
      const cb = h('div.bloque', h('h3.bloque-tit', 'Colisión del objeto'));
      if (o.col)
        cb.append(
          h(
            'div.duo',
            numP(
              'X desde el centro',
              () => o.col.x,
              v =>
                set('Colisión', x => {
                  if (x.col) x.col.x = v;
                })
            ),
            numP(
              'Y desde la base',
              () => o.col.y,
              v =>
                set('Colisión', x => {
                  if (x.col) x.col.y = v;
                })
            ),
            numP(
              'Ancho',
              () => o.col.w,
              v =>
                set('Colisión', x => {
                  if (x.col) x.col.w = v;
                }),
              { min: 1 }
            ),
            numP(
              'Alto',
              () => o.col.h,
              v =>
                set('Colisión', x => {
                  if (x.col) x.col.h = v;
                }),
              { min: 1 }
            )
          )
        );
      else cb.append(h('p.nota-txt', 'Sin colisión: los personajes lo atraviesan.'));
      cb.append(
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'varita',
            txt: 'Automática',
            cls: 'chico',
            desc: 'Calcula la colisión a partir de los pies del dibujo (la parte baja), para que se pueda pasar por detrás.',
            on: () => {
              MP.colAuto();
              tabs.refrescar();
            }
          }),
          o.col
            ? CK.btn({
                ico: 'cerrar',
                txt: 'Quitar',
                cls: 'chico',
                on: () => {
                  set('Quitar colisión', x => {
                    delete x.col;
                  });
                  tabs.refrescar();
                }
              })
            : null,
          uno && o.col && a
            ? CK.btn({
                txt: 'Usar siempre en este asset',
                cls: 'chico',
                desc: 'Guarda esta colisión en el asset: cada vez que lo coloques ya viene con ella.',
                on: () => {
                  a.col = CK.clone(o.col);
                  CK.tocar();
                  CK.aviso('Listo: "' + a.nombre + '" ya viene con esta colisión.');
                }
              })
            : null
        )
      );
      c.append(cb);
      if (uno) {
        const mb = h('div.bloque', h('h3.bloque-tit', 'Animación'));
        if (a && a.cuadros)
          mb.append(
            h(
              'p.nota-txt',
              'Este asset ya es una animación de ' + CK.asset.nCuadros(a) + ' cuadros a ' + (a.cuadros.fps || 6) + ' por segundo.'
            )
          );
        if (o.marca)
          mb.append(
            h(
              'div.problema.' + (o.marca.estado === 'hecha' ? 'leve' : 'medio'),
              { html: CK.ico('claqueta', 18) },
              h(
                'div',
                h('div.pt', o.marca.estado === 'hecha' ? 'Animación hecha' : 'Pendiente de animar'),
                h('div.pd', o.marca.nota || '(sin nota)')
              )
            )
          );
        mb.append(
          h(
            'div.fila',
            CK.btn({
              ico: 'claqueta',
              txt: o.marca ? 'Editar marca' : 'Marcar para animar',
              cls: 'chico',
              desc: 'Deja escrito cómo querés que se anime este objeto.',
              on: () => MP.marcar(o.id).then(() => tabs.refrescar())
            }),
            a
              ? CK.btn({
                  ico: 'anim',
                  txt: 'Animar ahora',
                  cls: 'chico',
                  desc: 'Abre este asset en la sección Animaciones para generarle movimiento.',
                  on: () => CK.ir('anim', { asset: a.id, objeto: o.id, mapa: m.id })
                })
              : null,
            a
              ? CK.btn({
                  ico: 'pixel',
                  txt: 'Editar píxeles',
                  cls: 'chico',
                  desc: 'Abre el asset en el editor de pixel art.',
                  on: () => CK.ir('pixel', a.id)
                })
              : null
          )
        );
        c.append(mb);
      }
    }
    if ((uno && !o.tipo) || (uno && o.tipo === 'punto')) {
      const pr = (o.props = o.props || {}),
        pb = h('div.bloque', h('h3.bloque-tit', 'Datos propios'));
      Object.keys(pr)
        .filter(k => !['npc', 'destino', 'llegada', 'tipo', 'radio', 'aspecto', 'sprite', 'escala', 'flip', 'noche', 'fx'].includes(k))
        .forEach(k =>
          pb.append(
            h(
              'div.fila.junto',
              { style: { marginBottom: '4px' } },
              h('span.campo-rot', { style: { width: '90px' } }, k),
              CK.txt(String(pr[k]), v => {
                set('Dato', x => {
                  x.props[k] = v;
                });
              }),
              CK.btn({
                ico: 'cerrar',
                tip: 'Quitar dato',
                cls: 'chico plano',
                on: () => {
                  set('Quitar dato', x => {
                    delete x.props[k];
                  });
                  tabs.refrescar();
                }
              })
            )
          )
        );
      pb.append(
        CK.btn({
          ico: 'mas',
          txt: 'Agregar dato',
          cls: 'chico',
          desc: 'Un dato libre que el juego puede leer: "vida = 30", "texto = Cerrado", "premio = llave".',
          on: async () => {
            const k = await CK.pedir('Dato nuevo', 'Nombre del dato (por ejemplo: vida)', '');
            if (k) {
              set('Dato', x => {
                x.props = x.props || {};
                x.props[CK.slug(k)] = '';
              });
              tabs.refrescar();
            }
          }
        })
      );
      c.append(pb);
    }
    c.append(
      h(
        'div.bloque',
        h(
          'div.fila',
          CK.btn({ ico: 'duplicar', txt: 'Duplicar', cls: 'chico', tecla: 'Ctrl + D', on: () => MP.duplicar() }),
          objs.length > 1
            ? CK.btn({
                ico: 'grupo',
                txt: 'Agrupar',
                cls: 'chico',
                tecla: 'Ctrl + G',
                desc: 'Los une para que se muevan juntos (una casa con su techo y su sombra).',
                on: MP.agrupar
              })
            : null,
          objs.some(x => x.grupo) ? CK.btn({ txt: 'Desagrupar', cls: 'chico', tecla: 'Ctrl + Mayús + G', on: MP.desagrupar }) : null,
          CK.btn({
            ico: 'prefab',
            txt: 'Guardar prearmado',
            cls: 'chico',
            desc: 'Guarda lo seleccionado con todo configurado (colisión, capa, luz, marca) para volver a colocarlo con un clic.',
            on: MP.guardarPrefab
          }),
          CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'chico peligro', tecla: 'Supr', on: MP.borrarSel })
        )
      )
    );
  };

  // ---------------------------------------------------------------- pestaña Assets
  const pintarAssets = c => {
    const g = CK.galeria({
      tipos: ['sprite', 'hoja', 'personaje', 'fx', 'ui'],
      arrastrar: true,
      actual: () => (S.prefab ? null : S.asset),
      pista: 'Clic para elegirlo y después clic en el mapa para colocarlo. También se puede arrastrar al mapa.',
      alElegir: id => {
        S.asset = id;
        S.prefab = null;
        MP.herr('colocar');
      },
      vacio: 'Sin assets todavía. Importá imágenes, traelas del juego o creá en Convertir / Pixel art.'
    });
    c.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Objetos',
          CK.btn({
            ico: 'importar',
            txt: 'Importar',
            cls: 'chico',
            desc: 'Trae imágenes PNG de tu compu como assets.',
            on: () => CK.importarImagenes('sprite')
          })
        ),
        g
      )
    );
    const pf = Object.values(CK.P.prefabs),
      lp = h('div.lista');
    pf.forEach(p =>
      lp.append(
        h(
          'div.item' + (S.prefab === p.id ? '.activo' : ''),
          {
            onclick: () => {
              S.prefab = p.id;
              MP.herr('colocar');
              tabs.refrescar();
            }
          },
          CK.mini(CK.img[(p.objetos.find(o => !o.tipo) || {}).asset], 24),
          h('span.nombre', p.nombre),
          h('span.sub', p.objetos.length + ' pieza' + (p.objetos.length > 1 ? 's' : '')),
          CK.btn({
            ico: 'basura',
            tip: 'Borrar prearmado',
            on: async e => {
              e.stopPropagation();
              if (await CK.confirmar('Borrar prearmado', 'Los que ya colocaste en mapas no se borran.', 'Borrar')) {
                delete CK.P.prefabs[p.id];
                CK.tocar();
                tabs.refrescar();
              }
            }
          })
        )
      )
    );
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Prearmados'),
        pf.length
          ? lp
          : h(
              'p.nota-txt',
              'Armá un objeto una vez (con su colisión, su luz, su marca), seleccionalo y usá "Guardar prearmado". Después lo colocás con un clic las veces que quieras.'
            )
      )
    );
  };

  // ---------------------------------------------------------------- pestaña Mapa
  const pintarMapa = c => {
    const m = M();
    if (!m) return;
    const T = m.tile;
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Mapa'),
        CK.campo(
          'Nombre',
          CK.txt(m.nombre, v => {
            const f = MP.fin('Renombrar mapa');
            m.nombre = v || m.nombre;
            f();
            pintarOpc();
          })
        ),
        h(
          'div.duo',
          numP(
            'Ancho (tiles)',
            () => Math.round(m.w / T),
            v => MP.redimensionar(v * T, m.h),
            { min: 2, max: 500 }
          ),
          numP(
            'Alto (tiles)',
            () => Math.round(m.h / T),
            v => MP.redimensionar(m.w, v * T),
            { min: 2, max: 500 }
          )
        ),
        h('p.nota-txt', m.w + ' × ' + m.h + ' px · tile de ' + T + ' px'),
        m.origen
          ? h(
              'p.nota-txt',
              m.origen.tipo === 'interior'
                ? 'Sala del juego (' +
                    m.origen.clave +
                    '), traída como referencia: los cambios no vuelven al código de ' +
                    m.origen.archivo +
                    '.'
                : 'Viene del juego: ' + m.origen.archivo + ' (' + m.origen.clave + '). Al exportar podés actualizar ese archivo.'
            )
          : null,
        m.origen
          ? CK.btn({
              ico: 'duplicar',
              txt: 'Hacer una copia editable',
              cls: 'chico',
              desc: 'Crea un mapa propio igual a este. Ese sí podés cambiarlo entero (suelo, muebles, puertas) y llega al juego como mapa nuevo.',
              on: () => {
                const c = CK.juego.copiaPropia(m);
                MP.abrir(c.id);
                pintarOpc();
                tabs.refrescar();
                CK.aviso('Copia creada: ' + c.nombre);
              }
            })
          : null
      )
    );
    if (!m.origen) {
      const en = (m.entrada = m.entrada || { x: 0, y: 0, r: 14 }),
        son = (m.sonido = m.sonido || []),
        cm = (nombre, fn) => {
          const f = MP.fin(nombre);
          fn();
          f();
        };
      if (!CK.audioJuego && CK.fs.dir('juego')) CK.leerAudioJuego().then(() => tabs.refrescar());
      const audio = CK.audioJuego || { musica: [], ambiente: [] };
      const lm = [['', 'La que suene (aldea)']].concat(
        (audio.musica.length ? audio.musica : Object.keys(CK.MUSICAS).filter(Boolean)).map(k => [k, CK.MUSICAS[k] || k])
      );
      const la = [['', '(ninguno)']].concat(
        (audio.ambiente.length ? audio.ambiente : ['amb_forest', 'amb_courtyard']).map(k => [k, k.replace(/^amb_/, '')])
      );
      c.append(
        h(
          'div.bloque',
          h('h3.bloque-tit', 'En el juego'),
          CK.campo(
            'Título al entrar',
            CK.txt(
              m.titulo || '',
              v =>
                cm('Título', () => {
                  m.titulo = v;
                }),
              { ph: m.nombre }
            ),
            'El cartel que aparece cuando el héroe entra al mapa.'
          ),
          CK.campo(
            'Suelo (pasos)',
            CK.sel(
              m.superficie || 'grass',
              [
                ['grass', 'Pasto'],
                ['dirt', 'Tierra'],
                ['stone', 'Piedra'],
                ['wood', 'Madera']
              ],
              v =>
                cm('Suelo', () => {
                  m.superficie = v;
                })
            ),
            'Cambia el sonido de los pasos.'
          ),
          h(
            'div.fila.junto',
            CK.campo(
              'Música',
              CK.sel(m.musica || '', lm, v => {
                cm('Música', () => {
                  m.musica = v;
                });
                tabs.refrescar();
              })
            ),
            m.musica
              ? CK.btn({
                  ico: 'sonido',
                  tip: 'Escuchar',
                  desc: 'Reproduce la música elegida (necesita la carpeta del juego conectada).',
                  cls: 'chico',
                  on: () => CK.sonar(CK.rutaMusica(m.musica))
                })
              : null
          ),
          h(
            'div.fila.junto',
            CK.campo(
              'Sonido ambiente',
              CK.sel((son[0] || [])[0] || '', la, v => {
                cm('Ambiente', () => {
                  m.sonido = v ? [[v, (son[0] || [])[1] || 0.4]] : [];
                });
                tabs.refrescar();
              })
            ),
            (son[0] || [])[0]
              ? CK.btn({
                  ico: 'sonido',
                  tip: 'Escuchar',
                  cls: 'chico',
                  on: () => CK.sonar('assets/audio/sfx/' + son[0][0] + '.mp3', son[0][1])
                })
              : null
          ),
          (son[0] || [])[0]
            ? CK.campo(
                'Volumen del ambiente',
                CK.rango(Math.round(((son[0] || [])[1] || 0.4) * 100), { min: 5, max: 100 }, (v, f) => {
                  son[0][1] = v / 100;
                  if (f) CK.tocar();
                })
              )
            : null,
          h('h3.bloque-tit', { style: { marginTop: '10px' } }, 'Entrada desde la aldea'),
          h(
            'p.nota-txt',
            'El lugar de la aldea que lleva a este mapa. Con 0, 0 no tiene entrada: se llega por una puerta de otro mapa, con F7 o con Probar.'
          ),
          h(
            'div.trio',
            numP(
              'X en la aldea',
              () => en.x || 0,
              v =>
                cm('Entrada', () => {
                  en.x = v;
                }),
              { min: 0 }
            ),
            numP(
              'Y en la aldea',
              () => en.y || 0,
              v =>
                cm('Entrada', () => {
                  en.y = v;
                }),
              { min: 0 }
            ),
            numP(
              'Radio',
              () => en.r || 14,
              v =>
                cm('Entrada', () => {
                  en.r = v;
                }),
              { min: 6, max: 80 }
            )
          )
        )
      );
    }
    const fa = CK.P.assets[m.fondo];
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Fondo'),
        CK.campo(
          'Color base',
          CK.color(m.colorFondo || '#3f6b35', v => {
            m.colorFondo = v;
            MP.pedir();
            CK.tocar();
          }),
          'Lo que se ve donde no hay nada pintado.'
        ),
        CK.campo(
          'Imagen',
          h(
            'div.fila',
            CK.btn({
              txt: fa ? fa.nombre : 'Sin imagen',
              ico: 'imagen',
              cls: 'chico',
              desc: 'Una imagen del mapa entero dibujada debajo de todo. Los mapas que vienen del juego traen su suelo pintado acá.',
              on: async () => {
                const id = await CK.elegirAsset('Imagen de fondo', ['fondo', 'textura', 'ref']);
                if (id) {
                  const f = MP.fin('Fondo');
                  m.fondo = id;
                  f();
                  MP.pedir();
                  tabs.refrescar();
                }
              }
            }),
            fa
              ? CK.btn({
                  ico: 'cerrar',
                  tip: 'Quitar imagen de fondo',
                  cls: 'chico',
                  on: () => {
                    const f = MP.fin('Quitar fondo');
                    m.fondo = null;
                    f();
                    MP.pedir();
                    tabs.refrescar();
                  }
                })
              : null
          )
        ),
        CK.chk(S.ver.fondo, 'Mostrar la imagen de fondo', v => {
          S.ver.fondo = v;
          MP.pedir();
        })
      )
    );
    const amb = (m.ambiente = m.ambiente || { color: '#20264a', fuerza: 0 });
    const pre = (txt, color, fuerza) =>
      CK.btn({
        txt,
        cls: 'chico',
        on: () => {
          const f = MP.fin('Luz ambiente');
          amb.color = color;
          amb.fuerza = fuerza;
          f();
          S.ver.luces = true;
          MP.pedir();
          tabs.refrescar();
          pintarOpc();
        }
      });
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Luz ambiente'),
        h(
          'div.fila',
          pre('Día', '#ffffff', 0),
          pre('Atardecer', '#ffb070', 0.35),
          pre('Noche', '#2a3270', 0.62),
          pre('Interior', '#6a5540', 0.4)
        ),
        CK.campo(
          'Tono',
          CK.color(amb.color, v => {
            amb.color = v;
            MP.pedir();
            CK.tocar();
          })
        ),
        CK.campo(
          'Oscuridad',
          CK.rango(Math.round(amb.fuerza * 100), { min: 0, max: 90 }, (v, f) => {
            amb.fuerza = v / 100;
            MP.pedir();
            if (f) CK.tocar();
          })
        ),
        h('p.nota-txt', 'Las luces que coloques (L) iluminan sobre este tono. Activá "Ver luces" en la tira de arriba.')
      )
    );
    const zc = m.zonas ? m.zonas.celda : T / 2;
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Zonas caminables'),
        CK.campo(
          'Detalle',
          CK.sel(
            String(zc),
            [
              [String(T), 'Grueso (1 tile)'],
              [String(T / 2), 'Medio (½ tile)'],
              [String(T / 4), 'Fino (¼ tile)']
            ],
            async v => {
              if (
                m.zonas &&
                m.zonas.datos &&
                !(await CK.confirmar('Cambiar el detalle', 'Las zonas ya pintadas en este mapa se borran.', 'Cambiar'))
              ) {
                tabs.refrescar();
                return;
              }
              const f = MP.fin('Detalle de zonas');
              const cel = +v;
              m.zonas = { celda: cel, w: Math.ceil(m.w / cel), h: Math.ceil(m.h / cel), datos: '' };
              f();
              MP.invalidar();
            }
          ),
          'Tamaño de cada celda al pintar por dónde se camina.'
        ),
        CK.btn({
          txt: 'Borrar todas las zonas',
          cls: 'chico',
          on: () => {
            const f = MP.fin('Borrar zonas');
            delete m.zonas;
            f();
            MP.invalidar();
          }
        })
      )
    );
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Acciones'),
        h(
          'div.fila',
          CK.btn({
            ico: 'imagen',
            txt: 'Guardar imagen',
            cls: 'chico',
            desc: 'Descarga un PNG del mapa completo, como se ve.',
            on: async () => CK.descargar(await CK.aBlob(MP.foto(m, { luces: S.ver.luces })), m.id + '.png')
          }),
          CK.btn({
            ico: 'duplicar',
            txt: 'Duplicar mapa',
            cls: 'chico',
            on: () => {
              const n = CK.clone(m);
              n.id = m.id + '_copia_' + Date.now().toString(36).slice(-3);
              n.nombre = m.nombre + ' (copia)';
              delete n.origen;
              CK.P.mapas[n.id] = n;
              CK.tocar();
              CK.emit('mapas');
              MP.abrir(n.id);
            }
          }),
          CK.btn({
            ico: 'basura',
            txt: 'Borrar mapa',
            cls: 'chico peligro',
            on: async () => {
              if (await CK.confirmar('Borrar mapa', 'Se borra "' + m.nombre + '" del proyecto. El juego no se toca.', 'Borrar')) {
                const f = CK.hist.datos('Borrar mapa', 'mapas', m.id);
                delete CK.P.mapas[m.id];
                f();
                S.id = null;
                CK.emit('mapas');
                mostrar();
              }
            }
          })
        )
      )
    );
  };

  // ---------------------------------------------------------------- atajos
  const tecla = (e, k, ctrl) => {
    if (!M()) return false;
    if (S.caminar && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) return true;
    if (k === 'escape') {
      if (S.caminar || S.herr !== 'seleccionar') MP.herr('seleccionar');
      else MP.elegir([]);
      return true;
    }
    if (ctrl && k === 'd') {
      MP.duplicar();
      return true;
    }
    if (ctrl && k === 'g') {
      if (e.shiftKey) MP.desagrupar();
      else MP.agrupar();
      return true;
    }
    if (ctrl && k === 'a') {
      const cp = MP.capaAct();
      if (cp && cp.tipo === 'objetos') MP.elegir(cp.objetos.map(o => o.id));
      return true;
    }
    if (ctrl) return false;
    if (k === 'delete' || k === 'backspace') {
      MP.borrarSel();
      return true;
    }
    const t = HERR.find(x => x.tecla && x.tecla.toLowerCase() === k);
    if (t) {
      MP.herr(t.id);
      return true;
    }
    const cpT = MP.capaAct();
    if (cpT && cpT.tipo === 'tiles' && (k === 'r' || k === 'f')) {
      S.tileXf = k === 'r' ? CK.mapa.xfGirar(S.tileXf) : CK.mapa.xfEspejo(S.tileXf, e.shiftKey ? 'v' : 'h');
      tabs.refrescar();
      MP.pedir();
      return true;
    }
    if (k === 'h' && S.sel.length) {
      MP.cambiar('Voltear', o => {
        o.flipX = !o.flipX;
      });
      return true;
    }
    if (k === '[' || k === ']') {
      if (['pincel', 'borrador', 'zona'].includes(S.herr)) {
        S.pincel = CK.clamp(S.pincel + (k === ']' ? 1 : -1), 1, 9);
        pintarOpc();
      } else MP.reordenar(k === ']' ? 1 : -1);
      return true;
    }
    if (k === '0') {
      vista.encuadrar(M().w, M().h);
      return true;
    }
    if (k === '+' || k === '=') {
      vista.zoomEn(1);
      return true;
    }
    if (k === '-') {
      vista.zoomEn(-1);
      return true;
    }
    if (k.startsWith('arrow') && S.sel.length) {
      const d = e.shiftKey ? M().tile : 1,
        dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0,
        dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0;
      MP.cambiar('Mover', o => {
        o.x += dx;
        o.y += dy;
      });
      return true;
    }
    return false;
  };

  CK.registrar({
    id: 'mapa',
    nombre: 'Mapa',
    ico: 'mapa',
    desc: 'Armá los mapas: suelo con bordes automáticos, objetos por capas, zonas caminables, colisiones, luces y notas.',
    crear,
    mostrar,
    tecla,
    alCambiarProyecto: () => {
      S.id = null;
      S.sel = [];
      if (el) {
        pintarVacio();
        pintarOpc();
      }
    }
  });
})();
