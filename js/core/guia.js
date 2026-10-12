/* GUÍA: para aprender a usar el editor sin manual.
   - Recorrido guiado: la primera vez que se entra a cada sección, 3 a 5 pasos cortos que resaltan cada zona.
     Se puede saltar y volver a ver (botón Interfaz → "Ver el recorrido de esta sección").
   - "¿Cómo hago…?": recetas cortas por tarea, con botones que llevan directo a la herramienta (también en Ctrl + K).
   - Proyecto de ejemplo: un mapa chico con suelo, objetos, una bandera animada, un fuego y una nota, para practicar. */
'use strict';
(function () {
  const h = CK.h;
  const G = (CK.guia = {});
  const CLAVE = 'ck_guia_vistos_v1';
  let vistos = {};
  try {
    vistos = JSON.parse(localStorage.getItem(CLAVE) || '{}');
  } catch (e) {}
  const guardarVistos = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(vistos));
    } catch (e) {}
  };
  // en las pruebas automáticas y en pruebas.html no aparece solo
  const automatico = () => !navigator.webdriver && !/pruebas\.html$/.test(location.pathname);

  // ---------------------------------------------------------------- recorridos
  // cada paso: [selector dentro de la sección (o '#barra', '#riel'…), título, texto]
  const S = '[data-seccion="%"] ';
  const PASOS = {
    inicio: [
      [
        '#riel',
        'Las secciones',
        'Cada pestaña es una parte del trabajo: mapas, dibujo, animación, efectos… Con clic derecho en una pestaña la abrís en una ventana aparte o en otra pantalla.'
      ],
      [
        '#barra .btn[data-tip="Probar"]',
        'Probar en el juego',
        'Exporta lo que hiciste y abre CastleKnight adentro del editor, en el mapa que estás editando.'
      ],
      [
        '#barra .btn[data-tip="Interfaz"]',
        'A tu gusto',
        'Modo simple (menos opciones a la vista), tamaño de la interfaz y cursores. También desde acá volvés a ver estos recorridos.'
      ],
      [
        '#barra .btn[data-tip="¿Cómo hago…?"]',
        '¿Cómo hago…?',
        'Recetas cortas para las tareas de siempre, con botones que te llevan directo. Y con Ctrl + K buscás cualquier cosa.'
      ]
    ],
    mapa: [
      [
        S + '.herr',
        'Herramientas',
        'Seleccionar, colocar objetos, pintar el suelo, zonas, colisiones, luces, puntos y notas. Cada una tiene su letra (pasá el mouse para verla).'
      ],
      [
        S + '.tablero',
        'El mapa',
        'Rueda para acercar, barra espaciadora + arrastrar para moverte. Clic derecho sobre las cosas para ver sus opciones.'
      ],
      [
        S + '.sobre .tira',
        'Arriba del mapa',
        'Elegí qué mapa editar, creá uno nuevo y prendé o apagá la grilla, las zonas, las luces y las notas.'
      ],
      [
        S + '.acople-caja',
        'Capas, propiedades y assets',
        'Las capas del mapa (arrastralas para ordenarlas), las propiedades de lo que elijas y los objetos para colocar.'
      ]
    ],
    pixel: [
      [
        S + '.herr',
        'Herramientas de dibujo',
        'Lápiz (B), goma (E), balde (G), cuentagotas (I), formas y selecciones. Transformar (T) gira y agranda lo seleccionado.'
      ],
      [S + '.tablero', 'El lienzo', 'Dibujá con clic, borrá con clic derecho. Rueda para acercar; la grilla aparece sola al acercarte.'],
      [
        S + '.acople-caja',
        'Color y capas',
        'La paleta del proyecto, los colores de la imagen y las capas (se pueden ordenar y agrupar en carpetas).'
      ],
      [
        S + '.cuadros',
        'Cuadros',
        'Si el dibujo es una animación, acá están sus cuadros. "Convertir en animación" agrega cuadros a un dibujo quieto.'
      ]
    ],
    anim: [
      [
        S + '.acople-caja',
        'Qué animar',
        'A la izquierda, lo pendiente de animar y las animaciones del proyecto. Podés importar tiras o sprites sueltos.'
      ],
      [
        S + '.tablero',
        'La vista',
        'Se reproduce en loop. Rueda para acercar, y los botones de arriba cambian el fondo, la grilla y el papel cebolla.'
      ],
      [
        S + '.tl-caja',
        'Línea de tiempo',
        'Arrastrá los cuadros para ordenarlos, estirá el borde derecho para que duren más. Clic derecho: duplicar, espejar y "Eventos del cuadro" (sonido, efecto o golpe).'
      ],
      [S + '.pest', 'Pestañas', 'Generar (movimiento automático), Hoja (la animación elegida), Personaje (poses) y Juego.']
    ],
    fx: [
      [S + '.acople-caja', 'Efectos y plantillas', 'Empezá por una plantilla (fuego, explosión, curación…) y cambiala a tu gusto.'],
      [S + '.tablero', 'Vista previa', 'El efecto se reproduce en vivo. Con "El mouse" podés moverlo o dispararlo con clic.'],
      [
        S + '.fx-simple',
        'Lo principal',
        'Intensidad, tamaño, velocidad, duración y color: cada control mueve varios valores juntos. "Variar" prueba versiones parecidas.'
      ],
      [
        S + '.pista',
        'Capas en el tiempo',
        'Cada barra es una capa del efecto: cuándo entra y cuándo sale. Se arrastran por el nombre para ordenarlas.'
      ]
    ],
    texturas: [
      [
        S + '.pest',
        'Pasos',
        'Textura (de una foto a un tile repetible), Variantes, Tileset (importar y ordenar piezas) y Bordes (las piezas de transición).'
      ],
      [S + 'canvas', 'Vista en mosaico', 'Muestra la textura repetida para que veas si se nota la costura.'],
      [
        '#riel .riel-sub',
        'Convertir',
        'Al lado de la pestaña está Convertir: pasa una referencia (foto o dibujo) a pixel art con tu paleta.'
      ]
    ],
    biblioteca: [
      [
        S,
        'Todo el proyecto',
        'Sprites, animaciones, efectos, mapas y tiles ordenados por categoría y carpeta. Buscá por nombre o etiqueta; doble clic abre.'
      ]
    ],
    npc: [[S, 'Personajes', 'Cada NPC tiene su dibujo, sus temas de conversación y lo que responde. El juego los usa tal cual.']],
    misiones: [[S, 'Misiones por pasos', 'Hablar, llegar a un lugar, vencer… El juego sigue los pasos y entrega la recompensa.']]
  };
  let activo = null;
  G.recorrido = (id, forzar) => {
    const pasos = (PASOS[id] || []).map(([sel, t, x]) => [sel.replace('%', id), t, x]);
    const D = CK.doc();
    const ok = pasos.filter(([sel]) => {
      const el = D.querySelector(sel) || document.querySelector(sel);
      return el && el.offsetParent !== null;
    });
    if (!ok.length) {
      if (forzar) CK.aviso('Esta sección todavía no tiene recorrido.', 'info');
      return;
    }
    vistos[id] = 1;
    guardarVistos();
    if (activo) activo.cerrar();
    let i = 0;
    const fondo = h('div.guia-fondo'),
      hueco = h('div.guia-hueco'),
      globo = h('div.guia-globo');
    const cerrar = () => {
      fondo.remove();
      hueco.remove();
      globo.remove();
      D.removeEventListener('keydown', tecla, true);
      window.removeEventListener('resize', pintar);
      activo = null;
    };
    const tecla = e => {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    const ir = d => {
      i += d;
      if (i >= ok.length) return cerrar();
      i = Math.max(0, i);
      pintar();
    };
    const pintar = () => {
      const [sel, t, x] = ok[i],
        el = D.querySelector(sel) || document.querySelector(sel);
      if (!el) return cerrar();
      const r = el.getBoundingClientRect(),
        W = D.defaultView.innerWidth,
        H = D.defaultView.innerHeight,
        m = 6;
      Object.assign(hueco.style, {
        left: r.left - m + 'px',
        top: r.top - m + 'px',
        width: r.width + m * 2 + 'px',
        height: r.height + m * 2 + 'px'
      });
      CK.vaciar(globo).append(
        h('div.guia-num', 'Paso ' + (i + 1) + ' de ' + ok.length),
        h('h3', t),
        h('p', x),
        h(
          'div.fila',
          CK.btn({ txt: 'Saltar', cls: 'chico plano', on: cerrar }),
          h('span.crece'),
          i ? CK.btn({ txt: 'Anterior', cls: 'chico', on: () => ir(-1) }) : null,
          CK.btn({ txt: i === ok.length - 1 ? 'Listo' : 'Siguiente', cls: 'chico pri', on: () => ir(1) })
        )
      );
      // el globo va donde haya lugar: abajo, arriba, a la derecha o a la izquierda del resaltado
      const gw = 320,
        gh = globo.offsetHeight || 170;
      let gx, gy;
      if (r.bottom + gh + 16 < H) {
        gx = r.left;
        gy = r.bottom + 14;
      } else if (r.top - gh - 16 > 0) {
        gx = r.left;
        gy = r.top - gh - 14;
      } else if (r.right + gw + 16 < W) {
        gx = r.right + 14;
        gy = r.top + 10;
      } else {
        gx = Math.max(10, r.left - gw - 14);
        gy = r.top + 10;
      }
      Object.assign(globo.style, { left: CK.clamp(gx, 10, W - gw - 10) + 'px', top: CK.clamp(gy, 10, H - gh - 10) + 'px' });
    };
    D.body.append(fondo, hueco, globo);
    fondo.addEventListener('mousedown', cerrar);
    D.addEventListener('keydown', tecla, true);
    window.addEventListener('resize', pintar);
    activo = { cerrar };
    pintar();
    setTimeout(pintar, 30);
  };
  G.alMostrar = id => {
    if (!automatico() || vistos[id] || !PASOS[id] || !CK.P) return;
    setTimeout(() => {
      if ((CK.foco || CK.seccion_actual) === id && !document.querySelector('.ven-fondo, .guia-fondo')) G.recorrido(id);
    }, 700);
  };
  G.reiniciar = () => {
    vistos = {};
    guardarVistos();
    CK.aviso('Listo: los recorridos vuelven a aparecer la primera vez que entres a cada sección.');
  };
  G.cerrar = () => activo && activo.cerrar();

  // ---------------------------------------------------------------- recetas "¿Cómo hago…?"
  const ir = (sec, arg) => () => CK.ir(sec, arg);
  const herrMapa = id => () => {
    CK.ir('mapa');
    setTimeout(() => CK.mapa && CK.mapa.herr && CK.mapa.herr(id), 50);
  };
  const herrPixel = id => () => {
    CK.ir('pixel');
    setTimeout(() => CK._pixel && CK._pixel.ponerHerr && CK._pixel.ponerHerr(id), 50);
  };
  const pestana = (sec, tab) => () => {
    CK.ir(sec);
    setTimeout(() => {
      const t = { anim: CK._anim && CK._anim.tabs, texturas: CK.texturas && CK.texturas.tabs }[sec];
      if (t && t.ir) t.ir(tab);
    }, 60);
  };
  const RECETAS = [
    {
      id: 'mapa_nuevo',
      sec: 'mapa',
      titulo: 'Hacer un mapa nuevo',
      pasos: [
        ['Abrí la sección Mapa.', ir('mapa')],
        ['Arriba del mapa, el botón + crea uno nuevo: le ponés nombre y tamaño en tiles.'],
        ['Para empezar desde lo que ya tiene el juego, usá "Traer del juego" (el botón de al lado).']
      ]
    },
    {
      id: 'mapa_suelo',
      sec: 'mapa',
      titulo: 'Pintar el suelo con bordes automáticos',
      pasos: [
        ['Primero hacé un tileset de bordes en Texturas → Bordes (o importá uno).', pestana('texturas', 'transiciones')],
        ['En el mapa, elegí la capa "Suelo" y su tileset en el panel Capas.', ir('mapa')],
        ['Con el pincel (B) pintás la mancha; los bordes y esquinas salen solos. Clic derecho borra.', herrMapa('pincel')]
      ]
    },
    {
      id: 'mapa_objetos',
      sec: 'mapa',
      titulo: 'Poner objetos en el mapa',
      pasos: [
        ['Elegí la herramienta Colocar (P).', herrMapa('colocar')],
        ['En el panel Assets, hacé clic en el objeto que querés.'],
        ['Hacé clic en el mapa para ponerlo. Con Seleccionar (V) lo movés, lo girás o lo agrandás.']
      ]
    },
    {
      id: 'mapa_zonas',
      sec: 'mapa',
      titulo: 'Marcar por dónde no se puede caminar',
      pasos: [
        ['Herramienta Zona (W): pintás lo caminable; con clic derecho, lo bloqueado.', herrMapa('zona')],
        ['Para paredes exactas usá Colisión (C) y dibujá rectángulos.', herrMapa('colision')],
        ['Probalo caminando (J) sin salir del editor.', herrMapa('caminar')]
      ]
    },
    {
      id: 'mapa_puerta',
      sec: 'mapa',
      titulo: 'Poner una puerta o el lugar donde aparece el héroe',
      pasos: [
        ['Herramienta Punto (O).', herrMapa('punto')],
        ['En Propiedades elegí qué es: aparición, puerta, NPC, enemigo, efecto o disparador.'],
        ['Una puerta lleva a otro mapa: elegilo en sus propiedades.']
      ]
    },
    {
      id: 'mapa_marca',
      sec: 'mapa',
      titulo: 'Marcar algo para animar',
      pasos: [
        ['Herramienta Marcar para animar (M) y clic sobre el objeto.', herrMapa('marca')],
        ['Pintá en gris los píxeles que se mueven y escribí cómo querés que se mueva.'],
        ['Después, en Animar, aparece en "Pendientes": lo no pintado queda quieto.', ir('anim')]
      ]
    },
    {
      id: 'probar',
      sec: 'mapa',
      titulo: 'Probar el mapa en el juego',
      pasos: [
        ['Conectá la carpeta del juego (arriba, "Juego: conectar") la primera vez.'],
        [
          'Apretá Probar (F5): exporta lo último y abre el juego en otra pestaña, en el mapa que estabas editando.',
          () => CK.juego.probar()
        ],
        ['Esa pestaña se puede arrastrar a otra pantalla. Cada vez que vuelvas a apretar Probar se recarga con lo nuevo.']
      ]
    },
    {
      id: 'mapa_luces',
      sec: 'mapa',
      titulo: 'Poner luces (antorchas, ventanas, focos, magia)',
      pasos: [
        ['Herramienta Luz (L) y clic donde va la luz.', herrMapa('luz')],
        [
          'En Propiedades elegí el tipo de la grilla (antorcha, ventana, foco, magia, lava…) y ajustá forma, alcance, suavizado y dirección.'
        ],
        [
          '"Guardar como luz mía" la deja en la Biblioteca para usarla en otros mapas. Para ver cómo queda de noche, la pestaña Mapa tiene luces ambiente listas.'
        ]
      ]
    },
    {
      id: 'mapa_de_biblioteca',
      sec: 'mapa',
      titulo: 'Poner en el mapa algo que ya hice',
      pasos: [
        ['Poné un punto (O) o una luz (L) donde lo querés.', herrMapa('punto')],
        ['Con el punto elegido, en Propiedades: "Poner algo de la biblioteca acá".'],
        ['Elegí una luz tuya, un personaje (NPC), un efecto, un objeto o un prearmado: queda justo en ese lugar.']
      ]
    },
    {
      id: 'bib_modificar',
      sec: 'biblioteca',
      titulo: 'Cambiar algo guardado (o hacer una variante)',
      pasos: [
        ['En la Biblioteca, pasá el mouse sobre lo que querés cambiar y tocá "Modificar".', ir('biblioteca')],
        ['Se abre en su sección (Pixel art, Animar, Texturas, FX o Mapa). Hacé los cambios.'],
        [
          'Abajo: "Guardar cambios" lo deja en el original; "Guardar como nuevo" crea otro y deja el original como estaba; "Descartar" vuelve atrás.'
        ]
      ]
    },
    {
      id: 'crear_tamano',
      sec: 'biblioteca',
      titulo: 'Crear un personaje u objeto del tamaño justo',
      pasos: [
        ['En la Biblioteca tocá "Crear nuevo" (o en Inicio, "Crear algo nuevo").', () => CK.sugerencias.crearNuevo()],
        ['Elegí qué vas a hacer: el tamaño sugerido aparece al lado del héroe, sobre tu mapa.'],
        ['Mientras dibujás, la pestaña "Prueba" de Pixel art lo sigue mostrando en el mapa a la escala del juego.']
      ]
    },
    {
      id: 'pixel_nuevo',
      sec: 'pixel',
      titulo: 'Dibujar un sprite nuevo',
      pasos: [
        ['Abrí Pixel art y usá el + junto al nombre del dibujo: te sugiere el tamaño según lo que vas a hacer.', ir('pixel')],
        ['Lápiz (B) para dibujar, goma (E), balde (G) y cuentagotas (I o Alt + clic).', herrPixel('lapiz')],
        ['"Dibujar solo con la paleta" en el panel Color te mantiene en los colores del proyecto.']
      ]
    },
    {
      id: 'pixel_transformar',
      sec: 'pixel',
      titulo: 'Girar o agrandar una parte del dibujo',
      pasos: [
        ['Seleccioná la parte con Selección (S) o Lazo (Q).', herrPixel('selRect')],
        ['Apretá T: aparecen las manijas. Esquinas agrandan, afuera gira (Mayús: de a 15°).', herrPixel('transformar')],
        ['Enter aplica, Esc cancela. Clic derecho tiene giros exactos y "Giro limpio".']
      ]
    },
    {
      id: 'anim_objeto',
      sec: 'anim',
      titulo: 'Animar un objeto quieto (bandera, árbol, antorcha)',
      pasos: [
        ['En Animar → Generar elegí el dibujo.', pestana('anim', 'generar')],
        ['Elegí el movimiento: ondear, mecer, flotar, titilar… y ajustá fuerza y cuadros.'],
        ['Si sólo una parte se mueve, "Pintar zona" y pintá esa parte. Después "Guardar".']
      ]
    },
    {
      id: 'anim_orden',
      sec: 'anim',
      titulo: 'Ordenar y ajustar los cuadros de una animación',
      pasos: [
        ['Abrí la animación en Animar → Hoja.', pestana('anim', 'hoja')],
        ['En la línea de tiempo arrastrá los cuadros para ordenarlos; estirá el borde derecho para que uno dure más.'],
        ['Clic derecho en un cuadro: duplicar, espejar, insertar o borrar. Todo se deshace con Ctrl + Z.']
      ]
    },
    {
      id: 'anim_eventos',
      sec: 'anim',
      titulo: 'Ponerle sonido o golpe a un cuadro',
      pasos: [
        ['Abrí la animación (por ejemplo, el ataque) en Animar → Hoja.', pestana('anim', 'hoja')],
        ['Clic derecho en el cuadro → "Eventos del cuadro".'],
        ['Agregá un sonido, un efecto, el golpe o un aviso. El juego lo respeta en ese cuadro exacto.']
      ]
    },
    {
      id: 'anim_poses',
      sec: 'anim',
      titulo: 'Cargar los sprites de un personaje en sus poses',
      pasos: [
        ['Animar → "Sprites a poses".', pestana('anim', 'poses')],
        ['Elegí los archivos o una carpeta: se reparten solos por el nombre (acción, dirección, cuadro).'],
        ['Revisá la tabla, corregí lo que haga falta y creá el personaje.']
      ]
    },
    {
      id: 'fx_nuevo',
      sec: 'fx',
      titulo: 'Crear una explosión, un fuego o una curación',
      pasos: [
        ['En FX elegí una plantilla parecida a lo que querés.', ir('fx')],
        ['Ajustá lo principal: intensidad, tamaño, velocidad, duración y color. "Variar" propone versiones parecidas.'],
        ['Para más control, abrí "Ajuste fino".']
      ]
    },
    {
      id: 'fx_contorno',
      sec: 'fx',
      titulo: 'Ponerle contorno a un efecto',
      pasos: [
        ['Abrí el efecto en FX.', ir('fx')],
        ['En el bloque Contorno, prendé "Las partículas llevan contorno" y elegí grosor y color.']
      ]
    },
    {
      id: 'fx_mapa',
      sec: 'mapa',
      titulo: 'Usar un efecto en el mapa',
      pasos: [
        ['Herramienta Punto (O) en el mapa.', herrMapa('punto')],
        ['En Propiedades elegí "Efecto (FX)" y cuál. Se ve en vivo en el editor y en el juego.']
      ]
    },
    {
      id: 'tex_foto',
      sec: 'texturas',
      titulo: 'Hacer un suelo repetible desde una foto',
      pasos: [
        ['Texturas → Textura → Subir la referencia.', pestana('texturas', 'textura')],
        ['Elegí qué parte tomar y cuántos colores; "Hacerla repetible" corrige la costura.'],
        ['Guardá la textura. Después, Variantes y Bordes para usarla en el mapa.']
      ]
    },
    {
      id: 'tex_importar',
      sec: 'texturas',
      titulo: 'Importar un tileset (por ejemplo, de itch.io)',
      pasos: [
        ['Texturas → Tileset → Importar.', pestana('texturas', 'tileset')],
        ['Indicá el tamaño del tile, el margen y la separación: la grilla dorada tiene que caer justo.'],
        ['Para que haga bordes solos, usá "Armar bordes automáticos" en esa misma pestaña.']
      ]
    },
    {
      id: 'tex_bordes',
      sec: 'texturas',
      titulo: 'Armar bordes automáticos con un tileset propio',
      pasos: [
        ['Texturas → Tileset, elegí el tileset y apretá "Armar bordes automáticos".', pestana('texturas', 'tileset')],
        ['Elegí el formato (16 piezas, 47 piezas o RPG Maker) o asigná cada pieza a mano.'],
        ['Se crea un tileset de bordes que se usa en una capa de Terreno del mapa.']
      ]
    },
    {
      id: 'exportar',
      sec: 'inicio',
      titulo: 'Exportar al juego',
      pasos: [
        ['Conectá la carpeta del juego (arriba, "Juego: conectar").'],
        [
          'Apretá "Exportar al juego": te muestra qué va a cambiar y si hay algo para revisar antes de escribir.',
          () => CK.juego.ventanaExportar()
        ]
      ]
    },
    {
      id: 'version',
      sec: 'inicio',
      titulo: 'Volver a como estaba el proyecto antes',
      pasos: [
        ['El editor guarda copias automáticas con fecha. Abrí el menú del proyecto (el nombre, arriba a la izquierda).'],
        ['Elegí "Copias y versiones" y la que quieras recuperar.', () => CK.copias && CK.copias.ventana()]
      ]
    },
    {
      id: 'pantalla',
      sec: 'inicio',
      titulo: 'Trabajar con dos secciones a la vez u otra pantalla',
      pasos: [
        ['Clic derecho en la pestaña de una sección → "Abrir en una ventana aparte" (o arrastrala hacia abajo).'],
        ['Encajala en una mitad con los botones de su barra, o "Llevar a otra pantalla" para el segundo monitor.']
      ]
    },
    {
      id: 'buscar',
      sec: 'inicio',
      titulo: 'Encontrar rápido cualquier cosa',
      pasos: [['Apretá Ctrl + K y escribí: el nombre de un asset, un mapa, una sección o lo que querés hacer.', () => CK.buscador.abrir()]]
    }
  ];
  G.recetas = () => RECETAS.map(r => Object.assign({ seccionNombre: (CK.secciones[r.sec] || {}).nombre || '' }, r));
  G.abrirReceta = id => {
    const r = RECETAS.find(x => x.id === id);
    if (!r) return;
    CK.ventana({
      titulo: r.titulo,
      ancho: 520,
      cuerpo: h(
        'ol.receta',
        r.pasos.map(([txt, fn]) =>
          h(
            'li',
            h('span', txt),
            fn
              ? CK.btn({
                  txt: 'Ir',
                  ico: 'flechaD',
                  cls: 'chico',
                  on: () => {
                    const v = document.querySelector('.ven-fondo .ventana');
                    if (v && v.cerrar) v.cerrar(null);
                    fn();
                  }
                })
              : null
          )
        )
      )
    });
  };
  /** Ventana "¿Cómo hago…?": primero las recetas de la sección donde estás. */
  G.ventana = () => {
    const aqui = CK.foco || CK.seccion_actual;
    const lista = h('div.lista');
    const pintar = f => {
      CK.vaciar(lista);
      const q = (f || '').toLowerCase();
      const rs = G.recetas()
        .filter(r => !q || (r.titulo + ' ' + r.seccionNombre).toLowerCase().includes(q))
        .sort((a, b) => (b.sec === aqui) - (a.sec === aqui));
      rs.forEach(r =>
        lista.append(
          h(
            'div.item',
            { onclick: () => G.abrirReceta(r.id) },
            h('span', { html: CK.ico('info', 16) }),
            h('span.nombre', r.titulo),
            h('span.etq' + (r.sec === aqui ? '.oro' : ''), r.seccionNombre)
          )
        )
      );
      if (!rs.length) lista.append(h('p.nota-txt', 'Nada coincide. Probá con otra palabra, o Ctrl + K para buscar en todo el editor.'));
    };
    pintar('');
    CK.ventana({
      titulo: '¿Cómo hago…?',
      ancho: 560,
      cuerpo: h(
        'div',
        h('input.in', {
          type: 'search',
          placeholder: 'Buscar: mapa, animar, sonido, efecto, tileset…',
          oninput: e => pintar(e.target.value)
        }),
        h('div', { style: { marginTop: '10px', maxHeight: '55vh', overflowY: 'auto' } }, lista),
        PASOS[aqui]
          ? h(
              'div.fila',
              { style: { marginTop: '10px' } },
              CK.btn({
                txt: 'Ver el recorrido de esta sección',
                ico: 'info',
                cls: 'chico',
                on: () => {
                  const v = document.querySelector('.ven-fondo .ventana');
                  if (v && v.cerrar) v.cerrar(null);
                  setTimeout(() => G.recorrido(aqui, true), 50);
                }
              })
            )
          : null
      )
    });
  };
  CK.iconos.ayuda =
    CK.iconos.ayuda ||
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>';

  // ---------------------------------------------------------------- proyecto de ejemplo
  /** Arma un proyecto chico para practicar: suelo con bordes, objetos, bandera animada (solo la tela), fuego y una nota. */
  G.proyectoEjemplo = async () => {
    await CK.nuevo('Ejemplo para practicar');
    const T = CK.P.estilo.tile,
      pal = CK.P.estilo.paleta;
    const lienzo = (w, hh, fn) => {
      const c = CK.lienzo(w, hh),
        x = CK.ctx(c);
      fn(x);
      return c;
    };
    const aPal = c => (pal.length ? CK.aLienzo(PIX.quantize(CK.aPix(c), pal)) : c);
    const ruido = (base, var1, semilla) =>
      lienzo(T, T, x => {
        const r = PIX.rng(semilla);
        for (let y = 0; y < T; y++)
          for (let i = 0; i < T; i++) {
            x.fillStyle = r() < 0.18 ? var1 : base;
            x.fillRect(i, y, 1, 1);
          }
      });
    const pasto = CK.asset.crear({
      nombre: 'pasto',
      tipo: 'textura',
      lienzo: aPal(ruido('#4c7a3a', '#5f9445', 3)),
      tileset: { tile: T, forma: 'libre' }
    });
    const tierra = CK.asset.crear({
      nombre: 'tierra',
      tipo: 'textura',
      lienzo: aPal(ruido('#8a6a44', '#a07c50', 5)),
      tileset: { tile: T, forma: 'libre' }
    });
    const ts = CK.asset.crear({
      nombre: 'ts_tierra_sobre_pasto',
      tipo: 'tileset',
      lienzo: CK.aLienzo(PIX.wang16(CK.asset.pix(tierra.id), CK.asset.pix(pasto.id), T, { irregular: 0.55, borde: 0.28, semilla: 5 })),
      tileset: { tile: T, forma: 'wang16', variantes: 0, terreno: tierra.id, base: pasto.id }
    });
    const arbol = CK.asset.crear({
      nombre: 'arbol',
      tipo: 'sprite',
      lienzo: aPal(
        lienzo(24, 32, x => {
          x.fillStyle = '#5a3a22';
          x.fillRect(10, 20, 4, 11);
          [
            ['#2f5a2a', 12, 12, 10],
            ['#3f7a34', 10, 10, 7],
            ['#5f9445', 9, 8, 3]
          ].forEach(([c, cx, cy, r]) => {
            x.fillStyle = c;
            x.beginPath();
            x.arc(cx, cy, r, 0, 7);
            x.fill();
          });
        })
      )
    });
    const roca = CK.asset.crear({
      nombre: 'roca',
      tipo: 'sprite',
      lienzo: aPal(
        lienzo(16, 12, x => {
          x.fillStyle = '#5c6066';
          x.beginPath();
          x.ellipse(8, 7, 7, 5, 0, 0, 7);
          x.fill();
          x.fillStyle = '#8a9099';
          x.fillRect(4, 4, 4, 2);
        })
      )
    });
    const cofre = CK.asset.crear({
      nombre: 'cofre',
      tipo: 'sprite',
      lienzo: aPal(
        lienzo(16, 14, x => {
          x.fillStyle = '#6a4423';
          x.fillRect(1, 3, 14, 10);
          x.fillStyle = '#e8b83a';
          x.fillRect(1, 6, 14, 1);
          x.fillRect(7, 6, 2, 3);
        })
      )
    });
    const banderaC = aPal(
      lienzo(18, 24, x => {
        x.fillStyle = '#777';
        x.fillRect(2, 0, 2, 24);
        x.fillStyle = '#c0392b';
        x.fillRect(4, 2, 12, 8);
        x.fillStyle = '#e8b83a';
        x.fillRect(8, 5, 4, 2);
      })
    );
    const bandera = CK.asset.crear({ nombre: 'bandera', tipo: 'sprite', lienzo: banderaC });
    // la bandera animada: solo la tela se mueve (zona marcada), el mástil queda quieto
    const imB = CK.aPix(banderaC),
      zona = new Uint8Array(imB.w * imB.h);
    for (let y = 2; y < 10; y++) for (let i = 4; i < 16; i++) zona[y * imB.w + i] = 1;
    const frs = PIX.animate(imB, 'ondear', { fuerza: 2, cuadros: 6, mascara: zona });
    const banderaAnim = CK.asset.crear({
      nombre: 'bandera_ondea',
      tipo: 'hoja',
      lienzo: CK.aLienzo(PIX.pack(frs, frs.length)),
      cuadros: {
        fw: Math.max(...frs.map(f => f.w)),
        fh: Math.max(...frs.map(f => f.h)),
        fps: 8,
        bucle: true,
        oy: PIX.animBase('ondear', { fuerza: 2 })
      }
    });
    CK.P.fx.fuego = Object.assign(CK.clone(CKFx.plantillas.fuego), { id: 'fuego', nombre: 'Fogata' });
    // el mapa
    const m = CK.mapa.crear('Claro del bosque', 20 * T, 14 * T);
    const suelo = m.capas.find(c => c.tipo === 'terreno'),
      gw = 21,
      gh = 15,
      g = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++) {
        const camino = Math.abs(j - 7 - Math.round(Math.sin(i / 3) * 1.5)) < 2,
          claro = (i - 13) ** 2 / 16 + (j - 6) ** 2 / 9 < 1;
        g[j * gw + i] = camino || claro ? 1 : 0;
      }
    suelo.tileset = ts.id;
    suelo.datos = PIX.rle(g);
    m.colorFondo = '#4c7a3a';
    const obj = m.capas.find(c => c.tipo === 'objetos');
    const poner = (a, x, y) => obj.objetos.push({ id: CK.uid('o'), asset: a.id, x, y, sx: 1, sy: 1, rot: 0, flipX: false });
    [
      [2, 2],
      [4, 11],
      [7, 3],
      [17, 11],
      [18, 2],
      [1, 7]
    ].forEach(([i, j]) => poner(arbol, i * T + 8, j * T + 16));
    poner(roca, 9 * T, 10 * T);
    poner(cofre, 14 * T, 5 * T);
    poner(banderaAnim, 12 * T, 4 * T);
    const sinAnimar = {
      id: CK.uid('o'),
      asset: bandera.id,
      x: 5 * T,
      y: 9 * T,
      sx: 1,
      sy: 1,
      rot: 0,
      flipX: false,
      marca: { nota: 'Que la tela ondee suave; el mástil queda quieto.', tipoAnim: 'ondear', estado: 'pendiente' }
    };
    obj.objetos.push(sinAnimar);
    obj.objetos.push({ id: CK.uid('o'), tipo: 'punto', clase: 'efecto', nombre: 'Fogata', x: 13 * T, y: 8 * T, props: { fx: 'fuego' } });
    obj.objetos.push({ id: CK.uid('o'), tipo: 'punto', clase: 'aparicion', nombre: 'Héroe', x: 2 * T, y: 7 * T, props: {} });
    m.notas.push({
      id: CK.uid('n'),
      x: 9 * T,
      y: 3 * T,
      texto: '¡Hola! Este es un mapa de ejemplo. Probá mover los árboles (V), pintar más camino (B) o tocar la fogata.',
      clase: 'Arte',
      hecho: false,
      creada: Date.now()
    });
    CK.P.notas.push({
      id: CK.uid('n'),
      texto: 'Proyecto de ejemplo: tocá todo sin miedo, cualquier cambio se deshace con Ctrl + Z.',
      clase: 'General',
      hecho: false,
      creada: Date.now()
    });
    CK.tocar();
    CK.emit('mapas');
    CK.emit('assets');
    CK.mapa.abrir(m.id);
    CK.ir('mapa', m.id);
    CK.aviso('Listo: un proyecto de ejemplo para practicar. Nada de esto toca tus otros proyectos.', 'ok', 5000);
    return m;
  };
})();
