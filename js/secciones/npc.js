/* NPC Y DIÁLOGOS: una ficha por personaje y sus temas de conversación (palabras clave → respuestas en su rol).
   El jugador escribe libre; el juego detecta el tema con js/core/dialogo.js. Acá se escribe el pack y se prueba la charla. */
'use strict';
(function () {
  const h = CK.h;
  let el, izq, centro, der, charla, entrada, pistas;
  const st = { id: null, tema: null, estado: { vistos: {}, banderas: {} }, log: [] };
  const N = () => CK.P && CK.P.npcs[st.id];
  const lineas = t =>
    String(t || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  const fin = nombre => CK.hist.datos(nombre, 'npcs', st.id);
  const ed = (nombre, fn) => {
    const f = fin(nombre);
    fn(N());
    f();
  };
  const BASE = [
    ['quien', 'Quién es', ['nombre', 'llamas', 'quien sos', 'quien eres', 'presentate']],
    ['oficio', 'Su oficio', ['trabajo', 'oficio', 'haces', 'dedicas', 'vendes']],
    ['lugar', 'Este lugar', ['aldea', 'pueblo', 'lugar', 'aca', 'zona']],
    ['castillo', 'El castillo', ['castillo', 'fortaleza', 'muralla', 'rey', 'reina']],
    ['rumores', 'Rumores', ['rumor', 'rumores', 'novedades', 'noticias', 'chisme', 'pasa']],
    ['ayuda', 'Ayuda y misión', ['ayuda', 'ayudar', 'mision', 'tarea', 'necesitas', 'encargo']],
    ['peligro', 'Peligros', ['peligro', 'monstruo', 'enemigo', 'orco', 'esqueleto', 'ruinas']],
    ['camino', 'Cómo llegar', ['camino', 'donde', 'llegar', 'direccion', 'norte', 'sur']]
  ];

  const nuevo = async () => {
    const nombre = await CK.pedir('NPC nuevo', 'Nombre del personaje', '');
    if (!nombre) return;
    let id = CK.slug(nombre),
      n = 2;
    while (CK.P.npcs[id]) id = CK.slug(nombre) + '_' + n++;
    CK.P.npcs[id] = {
      id,
      nombre,
      oficio: '',
      caracter: '',
      sabe: '',
      oculta: '',
      retrato: null,
      saludo: [],
      despedida: [],
      escape: [],
      temas: []
    };
    CK.tocar();
    st.id = id;
    st.tema = null;
    reiniciar();
    pintarTodo();
  };
  const reiniciar = () => {
    st.estado = { vistos: {}, banderas: Object.assign({}, st.estado.banderas) };
    st.log = [];
    pintarCharla();
  };
  const decir = txt => {
    const n = N();
    if (!n || !txt.trim()) return;
    const r = CKDialogo.responder(n, txt, st.estado);
    st.log.push({ yo: true, t: txt }, { t: r.texto, r });
    pintarCharla();
  };
  /** Claves que aparecen en más de un tema (confunden al detector). */
  const repetidas = n => {
    const m = {};
    (n.temas || []).forEach(t =>
      (t.claves || []).forEach(c => {
        const k = CKDialogo.normalizar(c);
        if (k) (m[k] = m[k] || []).push(t.nombre);
      })
    );
    return Object.keys(m)
      .filter(k => m[k].length > 1)
      .map(k => ({ clave: k, temas: m[k] }));
  };
  CK.npcRepetidas = repetidas;

  const pintarIzq = () => {
    CK.vaciar(izq);
    const l = h('div.lista');
    Object.values(CK.P.npcs).forEach(n => {
      const sin = (n.temas || []).filter(t => !(t.respuestas || []).length).length;
      l.append(
        h(
          'div.item' + (n.id === st.id ? '.activo' : ''),
          {
            onclick: () => {
              st.id = n.id;
              st.tema = null;
              reiniciar();
              pintarTodo();
            }
          },
          n.retrato && CK.img[n.retrato]
            ? CK.mini(CK.img[n.retrato], 26, CK.asset.cuadro(CK.P.assets[n.retrato], 0))
            : h('span', { html: CK.ico('persona', 18) }),
          h('div.crece', h('div.nombre', n.nombre), h('div.sub', (n.oficio || 'sin oficio') + ' · ' + (n.temas || []).length + ' temas')),
          sin ? h('span.etq.oro', sin + ' vacíos') : null
        )
      );
    });
    izq.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Personajes', CK.btn({ ico: 'mas', txt: 'Nuevo', cls: 'chico pri', on: nuevo })),
        Object.keys(CK.P.npcs).length
          ? l
          : h(
              'p.nota-txt',
              'Creá la ficha de cada NPC que conversa. Unos 15 a 25 temas para los importantes y 5 a 8 para los secundarios alcanzan para que se sientan vivos.'
            )
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Traer y llevar'),
        h(
          'div.fila',
          CK.btn({
            ico: 'exportar',
            txt: 'Importar JSON',
            cls: 'chico',
            desc: 'Carga uno o varios NPC desde un archivo (por ejemplo, un pack de diálogos escrito por Claude).',
            on: async () => {
              const [f] = await CK.elegirArchivos('.json,application/json');
              if (!f) return;
              try {
                const j = JSON.parse(await f.text()),
                  ls = Array.isArray(j) ? j : j.npcs ? Object.values(j.npcs) : [j];
                ls.forEach(n => {
                  if (!n.nombre) return;
                  n.id = n.id || CK.slug(n.nombre);
                  (n.temas || []).forEach((t, i) => {
                    t.id = t.id || CK.slug(t.nombre || 'tema' + i);
                  });
                  CK.P.npcs[n.id] = Object.assign(
                    { oficio: '', caracter: '', sabe: '', oculta: '', saludo: [], despedida: [], escape: [], temas: [] },
                    n
                  );
                  st.id = n.id;
                });
                CK.tocar();
                pintarTodo();
                CK.aviso('Importados ' + ls.length + ' NPC');
              } catch (e) {
                CK.aviso('Ese archivo no es un pack de NPC válido.', 'error');
              }
            }
          }),
          CK.btn({
            ico: 'importar',
            txt: 'Exportar todos',
            cls: 'chico',
            desc: 'Baja todos los NPC con sus diálogos en un archivo JSON.',
            on: () => CK.descargar(new Blob([JSON.stringify({ npcs: CK.P.npcs }, null, 1)], { type: 'application/json' }), 'npcs.json')
          })
        ),
        h(
          'p.nota-txt',
          'Con "Exportar al juego" los diálogos van en editor_data.js. El detector de temas es el archivo js/core/dialogo.js, que el juego puede cargar tal cual.'
        )
      )
    );
  };
  const area = (rot, valor, alCambiar, ph, filas, ayuda) => {
    const c = h('label.campo.ancho', h('span.campo-rot', rot), CK.txt(valor, alCambiar, { multi: true, filas: filas || 3, ph }));
    if (ayuda) CK.tip(c, rot, ayuda);
    return c;
  };
  const pintarCentro = () => {
    CK.vaciar(centro);
    const n = N(),
      col = h('div.col', { style: { maxWidth: '760px' } });
    centro.append(col);
    if (!n) {
      col.append(
        CK.vacio(
          'npc',
          'Sin personaje elegido',
          'Creá un NPC o elegí uno de la lista. Cada uno tiene su ficha y sus temas de conversación.',
          CK.btn({ ico: 'mas', txt: 'NPC nuevo', cls: 'pri', on: nuevo })
        )
      );
      return;
    }
    col.append(
      h(
        'div.fila.junto',
        { style: { marginBottom: '14px', gap: '14px' } },
        (() => {
          const b = h(
            'button.tarjeta',
            {
              type: 'button',
              style: { width: '76px', flex: 'none' },
              onclick: async () => {
                const id = await CK.elegirAsset('Retrato o sprite del personaje', ['sprite', 'hoja', 'personaje', 'ui']);
                if (id) {
                  ed('Retrato', x => {
                    x.retrato = id;
                  });
                  pintarTodo();
                }
              }
            },
            n.retrato && CK.img[n.retrato]
              ? CK.mini(CK.img[n.retrato], 64, CK.asset.cuadro(CK.P.assets[n.retrato], 0))
              : h('span', {
                  html: CK.ico('persona', 40),
                  style: { color: 'var(--tenue)', height: '64px', display: 'grid', placeItems: 'center' }
                })
          );
          CK.tip(b, 'Retrato', 'Clic para elegir el sprite o retrato de este personaje.');
          return b;
        })(),
        h(
          'div.crece',
          h('h1', n.nombre),
          h(
            'p.ayuda-txt',
            (n.temas || []).length +
              ' temas · ' +
              (n.temas || []).reduce(
                (s, t) =>
                  s +
                  (t.respuestas || []).length +
                  (t.repetida || []).length +
                  (t.variantes || []).reduce((q, v) => q + (v.respuestas || []).length, 0),
                0
              ) +
              ' líneas de diálogo'
          )
        ),
        CK.btn({
          ico: 'importar',
          tip: 'Exportar este NPC',
          cls: 'plano',
          on: () => CK.descargar(new Blob([JSON.stringify(n, null, 1)], { type: 'application/json' }), n.id + '.json')
        }),
        CK.btn({
          ico: 'basura',
          tip: 'Borrar NPC',
          cls: 'plano peligro',
          on: async () => {
            if (await CK.confirmar('Borrar NPC', 'Se borra "' + n.nombre + '" con todos sus diálogos.', 'Borrar')) {
              const f = fin('Borrar NPC');
              delete CK.P.npcs[n.id];
              f();
              st.id = Object.keys(CK.P.npcs)[0] || null;
              pintarTodo();
            }
          }
        })
      )
    );
    col.append(
      h(
        'div.caja',
        h('h2', { style: { marginTop: 0 } }, 'Ficha'),
        h(
          'div.duo',
          CK.h(
            'label.campo.ancho',
            h('span.campo-rot', 'Nombre'),
            CK.txt(n.nombre, v => {
              ed('Nombre', x => {
                x.nombre = v || x.nombre;
              });
              pintarIzq();
            })
          ),
          CK.h(
            'label.campo.ancho',
            h('span.campo-rot', 'Oficio'),
            CK.txt(
              n.oficio,
              v => {
                ed('Oficio', x => {
                  x.oficio = v;
                });
                pintarIzq();
              },
              { ph: 'herrero, tabernera, guardia…' }
            )
          )
        ),
        area(
          'Carácter y forma de hablar',
          n.caracter,
          v =>
            ed('Carácter', x => {
              x.caracter = v;
            }),
          'Gruñón, de pocas palabras, orgulloso de su trabajo. Trata de "forastero".',
          2,
          'Cómo es y cómo habla. Con esto se escriben todas sus líneas en el mismo tono.'
        ),
        h(
          'div.duo',
          area(
            'Qué sabe',
            n.sabe,
            v =>
              ed('Qué sabe', x => {
                x.sabe = v;
              }),
            'Las armas del castillo, quién entra y sale de la forja…',
            2
          ),
          area(
            'Qué oculta',
            n.oculta,
            v =>
              ed('Qué oculta', x => {
                x.oculta = v;
              }),
            'Vio algo raro la noche del incendio.',
            2
          )
        ),
        h(
          'div.fila',
          { style: { marginTop: '6px' } },
          CK.btn({
            ico: 'notas',
            txt: 'Pedirle los diálogos a Claude',
            desc: 'Deja una nota pendiente para que Claude escriba los temas y respuestas de este personaje a partir de su ficha.',
            on: () => {
              CK.P.notas.push({
                id: CK.uid('n'),
                texto:
                  'Escribir el pack de diálogos de ' +
                  n.nombre +
                  (n.oficio ? ' (' + n.oficio + ')' : '') +
                  ' a partir de su ficha: temas, palabras clave, 3 o 4 respuestas por tema, repetidas y respuestas de escape en su rol.',
                clase: 'NPC',
                hecho: false,
                creada: Date.now(),
                ref: { npc: n.id }
              });
              CK.tocar();
              CK.emit('notas');
              CK.aviso('Nota agregada. Guardá el proyecto y avisale a Claude.');
            }
          })
        )
      )
    );
    col.append(
      h('h2', 'Frases generales'),
      h(
        'div.caja',
        h(
          'div.trio',
          area(
            'Saludos',
            (n.saludo || []).join('\n'),
            v =>
              ed('Saludos', x => {
                x.saludo = lineas(v);
              }),
            'Una por línea',
            4,
            'Cuando el jugador dice hola. Una frase por línea; van rotando.'
          ),
          area(
            'Despedidas',
            (n.despedida || []).join('\n'),
            v =>
              ed('Despedidas', x => {
                x.despedida = lineas(v);
              }),
            'Una por línea',
            4
          ),
          area(
            'Cuando no entiende',
            (n.escape || []).join('\n'),
            v =>
              ed('Escape', x => {
                x.escape = lineas(v);
              }),
            'Hmf. Tengo trabajo.\nEso preguntáselo a otro.',
            4,
            'Lo que dice cuando el jugador pregunta algo que no está en sus temas. Tiene que sonar a él, no a "no entiendo": conviene tener 4 o 5.'
          )
        )
      )
    );
    // temas
    const rep = repetidas(n),
      lt = h('div.lista');
    (n.temas || []).forEach(t => {
      const vacio = !(t.respuestas || []).length;
      lt.append(
        h(
          'div.item' + (t.id === st.tema ? '.activo' : ''),
          {
            onclick: () => {
              st.tema = st.tema === t.id ? null : t.id;
              pintarCentro();
            }
          },
          h('span', { html: CK.ico(st.tema === t.id ? 'flechaAb' : 'flechaD', 14) }),
          h('span.nombre', t.nombre),
          h('span.sub', (t.claves || []).slice(0, 4).join(', ')),
          vacio ? h('span.etq.oro', 'sin respuestas') : h('span.etq', (t.respuestas || []).length + ' resp.'),
          (t.variantes || []).length ? h('span.etq.azul', (t.variantes || []).length + ' cond.') : null
        )
      );
      if (t.id === st.tema) lt.append(editorTema(n, t));
    });
    col.append(
      h('h2', 'Temas de conversación'),
      rep.length
        ? h(
            'div.problema.medio',
            { html: CK.ico('alerta', 18) },
            h(
              'div',
              h('div.pt', 'Palabras clave repetidas en dos temas'),
              h(
                'div.pd',
                rep
                  .slice(0, 5)
                  .map(r => '"' + r.clave + '" (' + r.temas.join(' y ') + ')')
                  .join(' · ') + '. El detector elige uno solo: dejá cada palabra en un tema.'
              )
            )
          )
        : null,
      h(
        'div.caja',
        (n.temas || []).length ? lt : h('p.ayuda-txt', 'Sin temas todavía. Agregá los básicos y después los propios de este personaje.'),
        h(
          'div.fila',
          { style: { marginTop: '10px' } },
          CK.btn({
            ico: 'mas',
            txt: 'Tema nuevo',
            cls: 'pri',
            on: async () => {
              const nombre = await CK.pedir('Tema nuevo', 'De qué trata (por ejemplo: La forja)', '');
              if (!nombre) return;
              const id = CK.slug(nombre) + '_' + Date.now().toString(36).slice(-3);
              ed('Tema nuevo', x => {
                x.temas.push({
                  id,
                  nombre,
                  claves: [CKDialogo.normalizar(nombre).split(' ').pop()],
                  respuestas: [],
                  repetida: [],
                  variantes: [],
                  sugerir: true
                });
              });
              st.tema = id;
              pintarTodo();
            }
          }),
          CK.btn({
            ico: 'lista',
            txt: 'Agregar temas básicos',
            desc: 'Suma los temas que casi todo NPC necesita (quién es, su oficio, el lugar, rumores, ayuda…), con sus palabras clave ya puestas y las respuestas vacías para escribir.',
            on: () => {
              ed('Temas básicos', x => {
                BASE.forEach(([id, nombre, claves]) => {
                  if (!x.temas.some(t => t.id === id))
                    x.temas.push({ id, nombre, claves, respuestas: [], repetida: [], variantes: [], sugerir: true });
                });
              });
              pintarTodo();
            }
          })
        )
      )
    );
  };
  const editorTema = (n, t) => {
    const set = (nombre, fn) => ed(nombre, x => fn(x.temas.find(q => q.id === t.id)));
    const vars = h('div');
    (t.variantes || []).forEach((v, i) =>
      vars.append(
        h(
          'div',
          { style: { border: '1px solid var(--linea)', borderRadius: '8px', padding: '8px', margin: '6px 0' } },
          h(
            'div.fila.junto',
            h('span.campo-rot', 'Si'),
            CK.txt(
              v.si,
              val =>
                set('Condición', q => {
                  q.variantes[i].si = val.trim();
                }),
              { ph: 'noche   ·   mision:llave   ·   heroe:horos' }
            ),
            CK.btn({
              ico: 'basura',
              tip: 'Quitar condición',
              cls: 'chico plano',
              on: () => {
                set('Quitar condición', q => {
                  q.variantes.splice(i, 1);
                });
                pintarTodo();
              }
            })
          ),
          area(
            'Entonces responde',
            (v.respuestas || []).join('\n'),
            val =>
              set('Respuestas', q => {
                q.variantes[i].respuestas = lineas(val);
              }),
            'Una por línea',
            2
          )
        )
      )
    );
    return h(
      'div',
      {
        style: {
          margin: '4px 0 10px 20px',
          padding: '10px 12px',
          borderLeft: '2px solid var(--oro)',
          background: 'var(--hueco)',
          borderRadius: '0 8px 8px 0'
        }
      },
      h(
        'div.duo',
        CK.h(
          'label.campo.ancho',
          h('span.campo-rot', 'Nombre del tema'),
          CK.txt(t.nombre, v => {
            set('Nombre', q => {
              q.nombre = v || q.nombre;
            });
            pintarCentro();
          })
        ),
        h(
          'div',
          { style: { alignSelf: 'end' } },
          CK.chk(
            t.sugerir !== false,
            'Mostrar como pista al jugador',
            v =>
              set('Pista', q => {
                q.sugerir = v;
              }),
            'Debajo de la caja de texto el juego muestra dos o tres temas sugeridos, para orientar al jugador hacia lo que el personaje sí sabe.'
          )
        )
      ),
      (() => {
        const c = CK.h(
          'label.campo.ancho',
          h('span.campo-rot', 'Palabras clave (separadas por coma)'),
          CK.txt(
            (t.claves || []).join(', '),
            v => {
              set('Claves', q => {
                q.claves = v
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
              });
              pintarCentro();
            },
            { ph: 'forja, espada, arma, afilar, hoja de acero' }
          )
        );
        CK.tip(
          c,
          'Palabras clave',
          'Si el jugador escribe alguna, el NPC responde con este tema. No hacen falta plurales ni acentos, y tolera errores de tipeo. Podés poner frases de dos o tres palabras.'
        );
        return c;
      })(),
      area(
        'Respuestas (una por línea; van rotando)',
        (t.respuestas || []).join('\n'),
        v => {
          set('Respuestas', q => {
            q.respuestas = lineas(v);
          });
          pintarIzq();
        },
        'Tres o cuatro variantes, en su tono',
        4
      ),
      area(
        'Si le vuelven a preguntar lo mismo',
        (t.repetida || []).join('\n'),
        v =>
          set('Repetidas', q => {
            q.repetida = lineas(v);
          }),
        '¿Otra vez con eso? Ya te lo dije.',
        2,
        'Se usa cuando ya dio todas sus respuestas de este tema.'
      ),
      h(
        'div.fila',
        h('span.campo-rot', 'Respuestas según la situación'),
        CK.btn({
          ico: 'mas',
          txt: 'Agregar condición',
          cls: 'chico',
          desc: 'Una respuesta distinta si es de noche, si se completó una misión o según el héroe. El juego enciende esas condiciones con un nombre, por ejemplo: noche, mision:llave, heroe:horos.',
          on: () => {
            set('Condición', q => {
              q.variantes = q.variantes || [];
              q.variantes.push({ si: '', respuestas: [] });
            });
            pintarTodo();
          }
        })
      ),
      vars,
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        CK.btn({
          ico: 'basura',
          txt: 'Borrar tema',
          cls: 'chico peligro',
          on: () => {
            ed('Borrar tema', x => {
              x.temas = x.temas.filter(q => q.id !== t.id);
            });
            st.tema = null;
            pintarTodo();
          }
        })
      )
    );
  };
  const pintarCharla = () => {
    if (!charla) return;
    CK.vaciar(charla);
    const n = N();
    if (!n) {
      charla.append(h('span.nota-txt', 'Elegí un NPC para probar su conversación.'));
      CK.vaciar(pistas);
      return;
    }
    if (!st.log.length) charla.append(h('span.nota-txt', 'Escribí abajo como si fueras el jugador.'));
    st.log.forEach(m =>
      charla.append(
        h(
          'div.globo' + (m.yo ? '.yo' : ''),
          h('span.quien', m.yo ? 'Jugador' : n.nombre),
          m.t,
          m.r
            ? h(
                'span.por',
                m.r.modo === 'escape'
                  ? 'no reconoció ningún tema'
                  : m.r.modo === 'saludo'
                    ? 'saludo'
                    : m.r.modo === 'despedida'
                      ? 'despedida'
                      : 'tema: ' +
                        ((n.temas.find(t => t.id === m.r.tema) || {}).nombre || '?') +
                        ' · por "' +
                        m.r.por.join('", "') +
                        '"' +
                        (m.r.modo === 'repetida' ? ' · repetida' : '') +
                        (m.r.variante ? ' · condición ' + m.r.variante : '')
              )
            : null
        )
      )
    );
    charla.scrollTop = charla.scrollHeight;
    CK.vaciar(pistas);
    CKDialogo.sugerencias(n, st.estado, 3).forEach(s =>
      pistas.append(
        CK.btn({ txt: s, cls: 'chico', desc: 'Pista que vería el jugador. Clic para preguntar por este tema.', on: () => decir(s) })
      )
    );
  };
  const pintarDer = () => {
    CK.vaciar(der);
    const n = N();
    charla = h('div.charla');
    pistas = h('div.fila', { style: { margin: '8px 0' } });
    entrada = h('input.in', { type: 'text', placeholder: 'Escribile al NPC…' });
    entrada.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        decir(entrada.value);
        entrada.value = '';
      }
    });
    const cond = new Set();
    if (n) (n.temas || []).forEach(t => (t.variantes || []).forEach(v => v.si && cond.add(v.si)));
    der.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Probar la charla',
          CK.btn({
            ico: 'recargar',
            txt: 'Reiniciar',
            cls: 'chico',
            desc: 'Borra la conversación y lo que el NPC ya contó.',
            on: reiniciar
          })
        ),
        charla,
        pistas,
        h(
          'div.fila.junto',
          entrada,
          CK.btn({
            ico: 'chat',
            tip: 'Enviar',
            tecla: 'Enter',
            cls: 'pri',
            on: () => {
              decir(entrada.value);
              entrada.value = '';
              entrada.focus();
            }
          })
        ),
        h(
          'p.nota-txt',
          'Debajo de cada respuesta ves qué tema detectó y por qué palabra. Si cae seguido en "no reconoció", sumá esa palabra a las claves de un tema.'
        )
      ),
      cond.size
        ? h(
            'div.bloque',
            h('h3.bloque-tit', 'Situación'),
            [...cond].map(c =>
              CK.chk(
                !!st.estado.banderas[c],
                c,
                v => {
                  st.estado.banderas[c] = v;
                },
                'Enciende esta condición para probar las respuestas que dependen de ella.'
              )
            )
          )
        : null
    );
    pintarCharla();
  };
  const pintarTodo = () => {
    if (!el) return;
    pintarIzq();
    pintarCentro();
    pintarDer();
  };
  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '250px 1fr 340px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    centro = h('div.pagina', { style: { position: 'relative', padding: '22px 26px 60px' } });
    der = h('aside.panel');
    el.append(izq, h('div', { style: { position: 'relative', minWidth: 0, overflowY: 'auto' } }, centro), der);
    centro.style.position = 'static';
    CK.on('datos', g => {
      if (g === 'npcs' && CK.seccionVisible('npc')) {
        if (!N()) st.id = Object.keys(CK.P.npcs)[0] || null;
        pintarTodo();
      }
    });
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && CK.P.npcs[arg]) st.id = arg;
    if (!N()) st.id = Object.keys(CK.P.npcs)[0] || null;
    pintarTodo();
  };
  CK.iconos.lista =
    '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>';
  CK.registrar({
    id: 'npc',
    nombre: 'NPC y diálogos',
    corto: 'NPC',
    ico: 'npc',
    desc: 'Fichas de personajes y sus temas de conversación, con prueba de charla incluida.',
    crear,
    mostrar,
    alCambiarProyecto: () => {
      st.id = null;
      st.tema = null;
      st.log = [];
    }
  });
})();
