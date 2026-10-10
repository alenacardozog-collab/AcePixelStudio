/* MISIONES: encargos por pasos (hablar con alguien, preguntarle por un tema, llegar a un lugar, vencer enemigos, tener una bandera).
   El cargador del juego las sigue solo, las muestra bajo el objetivo y entrega la recompensa. */
'use strict';
(function () {
  const h = CK.h;
  let el, izq, centro, der;
  const st = { i: 0 };
  const L = () => CK.P.misiones,
    Mi = () => L()[st.i];
  const TIPOS = {
    hablar: ['Hablar con', 'chat', 'Se cumple al abrir la charla con ese NPC.'],
    tema: ['Preguntar por', 'npc', 'Se cumple cuando el NPC responde sobre ese tema.'],
    llegar: ['Llegar a', 'punto', 'Se cumple al pisar un punto con nombre de un mapa tuyo.'],
    derrotar: ['Vencer', 'rayo', 'Se cumple al vencer la cantidad pedida de ese enemigo.'],
    bandera: ['Esperar una bandera', 'estrella', 'Se cumple cuando otra misión o un NPC enciende esa bandera.']
  };
  /** Un cambio que se puede deshacer (guarda la lista entera). */
  const cambio = (nombre, fn) => {
    const antes = JSON.stringify(CK.P.misiones);
    fn();
    const despues = JSON.stringify(CK.P.misiones);
    if (antes === despues) return;
    const poner = s => {
      CK.P.misiones = JSON.parse(s);
      st.i = Math.min(st.i, Math.max(0, CK.P.misiones.length - 1));
      CK.tocar();
      if (CK.seccionVisible('misiones')) pintar();
    };
    CK.hist.push({ nombre, deshacer: () => poner(antes), rehacer: () => poner(despues) });
    CK.tocar();
  };
  const mapasPropios = () => Object.values(CK.P.mapas).filter(m => !m.origen);
  const puntosDe = id => {
    const m = CK.P.mapas[id];
    return m
      ? [
          ...new Set(
            CK.mapa
              .objetosDe(m, true)
              .filter(o => o.tipo === 'punto' && o.nombre)
              .map(o => o.nombre)
          )
        ]
      : [];
  };
  /** Banderas que existen: las que encienden las misiones y las que piden los diálogos. */
  const banderas = () => {
    const s = new Set();
    L().forEach(m => {
      s.add('mision:' + m.id);
      (m.pasos || []).forEach(p => p.bandera && s.add(p.bandera));
      if (m.recompensa && m.recompensa.bandera) s.add(m.recompensa.bandera);
    });
    Object.values(CK.P.npcs).forEach(n => (n.temas || []).forEach(t => (t.variantes || []).forEach(v => v.si && s.add(v.si))));
    return [...s];
  };
  CK.banderas = banderas;
  const textoAuto = p => {
    const n = CK.P.npcs[p.npc];
    if (p.tipo === 'hablar') return 'Hablá con ' + (n ? n.nombre : '…');
    if (p.tipo === 'tema') {
      const t = n && (n.temas || []).find(t => t.id === p.tema);
      return 'Preguntale a ' + (n ? n.nombre : '…') + (t ? ' por ' + t.nombre.toLowerCase() : '');
    }
    if (p.tipo === 'llegar') return 'Llegá a ' + (p.punto || '…') + (CK.P.mapas[p.mapa] ? ' (' + CK.P.mapas[p.mapa].nombre + ')' : '');
    if (p.tipo === 'derrotar')
      return 'Vencé ' + ((p.cantidad || 1) > 1 ? p.cantidad + ' × ' : 'a un ') + (CK.ENEMIGOS[p.enemigo] || 'enemigo').toLowerCase();
    return 'Esperá: ' + (p.bandera || '…');
  };
  /** Problemas de una misión (los usa también el Revisor). */
  const problemas = m => {
    const out = [];
    if (!(m.pasos || []).length) out.push('No tiene pasos.');
    (m.pasos || []).forEach((p, i) => {
      const n = i + 1,
        npc = CK.P.npcs[p.npc];
      if ((p.tipo === 'hablar' || p.tipo === 'tema') && !npc) out.push('Paso ' + n + ': falta elegir el NPC.');
      else if (p.tipo === 'hablar' || p.tipo === 'tema') {
        const esta = mapasPropios().some(mp =>
          CK.mapa.objetosDe(mp, true).some(o => o.tipo === 'punto' && o.clase === 'npc' && (o.props || {}).npc === p.npc)
        );
        if (!esta) out.push('Paso ' + n + ': ' + npc.nombre + ' no está puesto en ningún mapa tuyo.');
      }
      if (p.tipo === 'tema' && npc && p.tema && !(npc.temas || []).some(t => t.id === p.tema))
        out.push('Paso ' + n + ': ese tema ya no existe en la ficha de ' + npc.nombre + '.');
      if (p.tipo === 'llegar') {
        if (!CK.P.mapas[p.mapa]) out.push('Paso ' + n + ': falta elegir el mapa.');
        else if (!puntosDe(p.mapa).includes(p.punto)) out.push('Paso ' + n + ': el punto "' + (p.punto || '') + '" no existe en ese mapa.');
      }
      if (
        p.tipo === 'derrotar' &&
        p.enemigo &&
        !mapasPropios().some(mp =>
          CK.mapa.objetosDe(mp, true).some(o => o.clase === 'enemigo' && ((o.props || {}).tipo || 'orc') === p.enemigo)
        )
      )
        out.push(
          'Paso ' +
            n +
            ': no hay ningún "' +
            (CK.ENEMIGOS[p.enemigo] || p.enemigo) +
            '" en tus mapas (igual cuenta los del resto del juego).'
        );
      if (p.tipo === 'bandera' && !p.bandera) out.push('Paso ' + n + ': falta la bandera.');
    });
    if (m.requiere && !banderas().includes(m.requiere)) out.push('Empieza con la bandera "' + m.requiere + '", que nada enciende todavía.');
    return out;
  };
  CK.misionProblemas = problemas;
  CK.misionTexto = textoAuto;

  const nueva = async () => {
    const nombre = await CK.pedir('Misión nueva', 'Nombre de la misión', '');
    if (!nombre) return;
    let id = CK.slug(nombre),
      k = 2;
    while (L().some(m => m.id === id)) id = CK.slug(nombre) + '_' + k++;
    cambio('Misión nueva', () => {
      CK.P.misiones.push({ id, nombre, descripcion: '', requiere: '', pasos: [], recompensa: { monedas: 0, exp: 0, bandera: '' } });
    });
    st.i = L().length - 1;
    pintar();
  };
  const pintarIzq = () => {
    CK.vaciar(izq);
    const l = h('div.lista');
    L().forEach((m, i) => {
      const pr = problemas(m).length;
      l.append(
        h(
          'div.item' + (i === st.i ? '.activo' : ''),
          {
            onclick: () => {
              st.i = i;
              pintar();
            }
          },
          h('span', { html: CK.ico('mision', 18) }),
          h(
            'div.crece',
            h('div.nombre', m.nombre),
            h('div.sub', (m.pasos || []).length + ' pasos' + (m.requiere ? ' · después de ' + m.requiere.replace('mision:', '') : ''))
          ),
          pr ? h('span.etq.oro', String(pr)) : null
        )
      );
    });
    izq.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Misiones', CK.btn({ ico: 'mas', txt: 'Nueva', cls: 'chico pri', on: nueva })),
        L().length
          ? l
          : h(
              'p.nota-txt',
              'Una misión es una lista de pasos que el jugador cumple en orden. El juego las muestra bajo el objetivo y entrega la recompensa al final.'
            )
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Cómo se encadenan'),
        h(
          'p.nota-txt',
          'Cada misión terminada enciende la bandera "mision:nombre". Usala en "Empieza cuando" de otra misión, o como condición de una respuesta en la ficha de un NPC para que cambie lo que dice.'
        )
      )
    );
  };
  const campoPaso = (p, i) => {
    const set = (nombre, fn) => {
        cambio(nombre, () => fn(Mi().pasos[i]));
        pintar();
      },
      c = h('div.duo');
    const npcs = [['', '(elegir NPC)']].concat(Object.values(CK.P.npcs).map(n => [n.id, n.nombre]));
    if (p.tipo === 'hablar')
      c.append(
        CK.campo(
          'Con quién',
          CK.sel(p.npc || '', npcs, v =>
            set('NPC', x => {
              x.npc = v;
            })
          )
        )
      );
    if (p.tipo === 'tema') {
      const n = CK.P.npcs[p.npc];
      c.append(
        CK.campo(
          'A quién',
          CK.sel(p.npc || '', npcs, v =>
            set('NPC', x => {
              x.npc = v;
              x.tema = '';
            })
          )
        ),
        CK.campo(
          'Sobre qué',
          CK.sel(p.tema || '', [['', '(cualquier tema)']].concat(n ? (n.temas || []).map(t => [t.id, t.nombre]) : []), v =>
            set('Tema', x => {
              x.tema = v;
            })
          )
        )
      );
    }
    if (p.tipo === 'llegar')
      c.append(
        CK.campo(
          'Mapa',
          CK.sel(p.mapa || '', [['', '(elegir)']].concat(mapasPropios().map(m => [m.id, m.nombre])), v =>
            set('Mapa', x => {
              x.mapa = v;
              x.punto = '';
            })
          )
        ),
        CK.campo(
          'Punto',
          CK.sel(p.punto || '', [['', '(elegir)']].concat(puntosDe(p.mapa)), v =>
            set('Punto', x => {
              x.punto = v;
            })
          ),
          'Los puntos con nombre del mapa. Se crean con la herramienta Punto.'
        ),
        CK.campo(
          'Qué tan cerca (px)',
          CK.num(p.radio || 28, { min: 8, max: 200 }, v =>
            set('Radio', x => {
              x.radio = v;
            })
          )
        )
      );
    if (p.tipo === 'derrotar')
      c.append(
        CK.campo(
          'Enemigo',
          CK.sel(p.enemigo || '', [['', '(cualquiera)']].concat(Object.keys(CK.ENEMIGOS).map(k => [k, CK.ENEMIGOS[k]])), v =>
            set('Enemigo', x => {
              x.enemigo = v;
            })
          )
        ),
        CK.campo(
          'Cuántos',
          CK.num(p.cantidad || 1, { min: 1, max: 99 }, v =>
            set('Cantidad', x => {
              x.cantidad = v;
            })
          )
        ),
        CK.campo(
          'Solo en el mapa',
          CK.sel(p.mapa || '', [['', '(en cualquier lado)']].concat(mapasPropios().map(m => [m.id, m.nombre])), v =>
            set('Mapa', x => {
              x.mapa = v;
            })
          )
        )
      );
    if (p.tipo === 'bandera')
      c.append(
        CK.campo(
          'Bandera',
          CK.txt(
            p.bandera || '',
            v =>
              set('Bandera', x => {
                x.bandera = CK.slug(v).replace(/^mision_/, 'mision:');
              }),
            { ph: 'mision:otra  o  puerta_abierta' }
          ),
          'Existentes: ' + (banderas().join(', ') || 'ninguna todavía')
        )
      );
    else
      c.append(
        CK.campo(
          'Al cumplirlo enciende',
          CK.txt(
            p.bandera || '',
            v =>
              set('Bandera', x => {
                x.bandera = v ? CK.slug(v) : '';
              }),
            { ph: '(opcional) una bandera' }
          ),
          'Opcional. Una bandera que queda encendida al cumplir este paso, para que un NPC cambie lo que dice o empiece otra misión.'
        )
      );
    return c;
  };
  const pintarCentro = () => {
    CK.vaciar(centro);
    const m = Mi(),
      col = h('div.col', { style: { maxWidth: '780px' } });
    centro.append(col);
    if (!m) {
      col.append(
        CK.vacio(
          'mision',
          'Sin misiones',
          'Creá la primera: por ejemplo "hablá con el herrero, preguntale por la espada, vencé 3 orcos y volvé".',
          CK.btn({ ico: 'mas', txt: 'Misión nueva', cls: 'pri', on: nueva })
        )
      );
      return;
    }
    const ed = (nombre, fn) => cambio(nombre, () => fn(Mi()));
    col.append(
      h(
        'div.fila.junto',
        { style: { marginBottom: '12px' } },
        h('div.crece', h('h1', m.nombre), h('p.ayuda-txt', 'Bandera al terminar: mision:' + m.id)),
        CK.btn({
          ico: 'duplicar',
          tip: 'Duplicar misión',
          cls: 'plano',
          on: () => {
            cambio('Duplicar misión', () => {
              const c = CK.clone(m);
              c.id = m.id + '_' + CK.uid('').slice(-3);
              c.nombre = m.nombre + ' (copia)';
              CK.P.misiones.splice(st.i + 1, 0, c);
            });
            st.i++;
            pintar();
          }
        }),
        CK.btn({
          ico: 'basura',
          tip: 'Borrar misión',
          cls: 'plano peligro',
          on: async () => {
            if (await CK.confirmar('Borrar misión', 'Se borra "' + m.nombre + '".', 'Borrar')) {
              cambio('Borrar misión', () => {
                CK.P.misiones.splice(st.i, 1);
              });
              st.i = Math.max(0, st.i - 1);
              pintar();
            }
          }
        })
      )
    );
    col.append(
      h(
        'div.caja',
        h(
          'div.duo',
          CK.h(
            'label.campo.ancho',
            h('span.campo-rot', 'Nombre'),
            CK.txt(m.nombre, v => {
              ed('Nombre', x => {
                x.nombre = v || x.nombre;
              });
              pintar();
            })
          ),
          CK.campo(
            'Empieza cuando',
            CK.sel(
              m.requiere || '',
              [['', 'Desde el principio']].concat(
                banderas()
                  .filter(b => b !== 'mision:' + m.id)
                  .map(b => [
                    b,
                    b.indexOf('mision:') === 0 ? 'Termina: ' + ((L().find(x => 'mision:' + x.id === b) || {}).nombre || b) : 'Bandera: ' + b
                  ])
              ),
              v => {
                ed('Requisito', x => {
                  x.requiere = v;
                });
                pintar();
              }
            ),
            'La misión aparece recién cuando esa bandera está encendida.'
          )
        ),
        CK.h(
          'label.campo.ancho',
          h('span.campo-rot', 'De qué se trata (para vos)'),
          CK.txt(
            m.descripcion || '',
            v =>
              ed('Descripción', x => {
                x.descripcion = v;
              }),
            { multi: true, filas: 2, ph: 'El herrero perdió su martillo en las ruinas…' }
          )
        )
      )
    );
    col.append(h('h2', 'Pasos'));
    (m.pasos || []).forEach((p, i) => {
      const T = TIPOS[p.tipo] || TIPOS.hablar,
        n = m.pasos.length;
      col.append(
        h(
          'div.caja.mpaso',
          { style: { marginBottom: '8px', display: 'block' } },
          h(
            'div.fila.junto',
            { style: { marginBottom: '8px' } },
            h('span.paso-n', String(i + 1)),
            h('span', { html: CK.ico(T[1], 18), style: { color: 'var(--oro)' } }),
            (() => {
              const e = CK.sel(
                p.tipo,
                Object.keys(TIPOS).map(k => [k, TIPOS[k][0]]),
                v => {
                  cambio('Tipo de paso', () => {
                    const x = Mi().pasos[i];
                    Mi().pasos[i] = { tipo: v, texto: '', npc: x.npc || '' };
                  });
                  pintar();
                }
              );
              e.style.cssText = 'width:190px;flex:none';
              return e;
            })(),
            h('span.nota-txt', { style: { flex: '1', minWidth: 0 } }, T[2]),
            CK.btn({
              ico: 'subir',
              tip: 'Subir',
              cls: 'chico plano',
              off: i === 0,
              on: () => {
                cambio('Mover paso', () => {
                  const a = Mi().pasos;
                  a.splice(i - 1, 0, a.splice(i, 1)[0]);
                });
                pintar();
              }
            }),
            CK.btn({
              ico: 'bajar',
              tip: 'Bajar',
              cls: 'chico plano',
              off: i === n - 1,
              on: () => {
                cambio('Mover paso', () => {
                  const a = Mi().pasos;
                  a.splice(i + 1, 0, a.splice(i, 1)[0]);
                });
                pintar();
              }
            }),
            CK.btn({
              ico: 'basura',
              tip: 'Quitar paso',
              cls: 'chico plano',
              on: () => {
                cambio('Quitar paso', () => {
                  Mi().pasos.splice(i, 1);
                });
                pintar();
              }
            })
          ),
          campoPaso(p, i),
          CK.h(
            'label.campo.ancho',
            { style: { marginTop: '6px' } },
            h('span.campo-rot', 'Lo que lee el jugador'),
            CK.txt(
              p.texto || '',
              v => {
                cambio('Texto del paso', () => {
                  Mi().pasos[i].texto = v;
                });
                pintarDer();
              },
              { ph: textoAuto(p) }
            )
          )
        )
      );
    });
    col.append(
      h(
        'div.fila',
        { style: { margin: '4px 0 18px' } },
        Object.keys(TIPOS).map(k =>
          CK.btn({
            ico: TIPOS[k][1],
            txt: TIPOS[k][0],
            cls: 'chico',
            desc: 'Agrega un paso. ' + TIPOS[k][2],
            on: () => {
              cambio('Agregar paso', () => {
                Mi().pasos.push({ tipo: k, texto: '' });
              });
              pintar();
            }
          })
        )
      )
    );
    const r = (m.recompensa = m.recompensa || {});
    col.append(
      h('h2', 'Recompensa'),
      h(
        'div.caja',
        h(
          'div.trio',
          CK.campo(
            'Monedas',
            CK.num(r.monedas || 0, { min: 0, max: 9999 }, v => {
              ed('Monedas', x => {
                x.recompensa.monedas = v;
              });
              pintarDer();
            })
          ),
          CK.campo(
            'Experiencia',
            CK.num(r.exp || 0, { min: 0, max: 9999 }, v => {
              ed('Experiencia', x => {
                x.recompensa.exp = v;
              });
              pintarDer();
            })
          ),
          CK.campo(
            'Enciende además',
            CK.txt(
              r.bandera || '',
              v =>
                ed('Bandera', x => {
                  x.recompensa.bandera = v ? CK.slug(v) : '';
                }),
              { ph: '(opcional)' }
            ),
            'Otra bandera, además de "mision:' + m.id + '".'
          )
        )
      )
    );
  };
  const pintarDer = () => {
    CK.vaciar(der);
    const m = Mi();
    if (!m) return;
    const pr = problemas(m),
      r = m.recompensa || {};
    const caja = h(
      'div.vista-objetivo',
      h('div.vo-cab', 'OBJETIVO'),
      (m.pasos || []).length
        ? (m.pasos || []).map((p, i) =>
            h(
              'div.vo-paso' + (i === 0 ? '.actual' : ''),
              '◆ ' +
                m.nombre +
                ': ' +
                (p.texto || textoAuto(p)) +
                (p.tipo === 'derrotar' && (p.cantidad || 1) > 1 ? ' (0/' + p.cantidad + ')' : '')
            )
          )
        : h('div.vo-paso', 'Sin pasos todavía'),
      h('div.vo-fin', 'Misión cumplida' + (r.monedas ? '  ·  +' + r.monedas + ' monedas' : '') + (r.exp ? '  ·  +' + r.exp + ' exp' : ''))
    );
    der.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Cómo se ve en el juego'),
        caja,
        h('p.nota-txt', 'El primer renglón es el paso actual; los demás van apareciendo de a uno.')
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Revisión'),
        pr.length
          ? pr.map(t => h('div.problema.medio', { html: CK.ico('alerta', 16) }, h('div', h('div.pd', t))))
          : h('div.problema.leve', { html: CK.ico('ok', 16) }, h('div', h('div.pd', 'Todo lo que nombra existe.')))
      ),
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Banderas'),
        h('p.nota-txt', 'Las que enciende esta misión:'),
        h(
          'div.fila',
          ['mision:' + m.id]
            .concat((m.pasos || []).map(p => p.tipo !== 'bandera' && p.bandera).filter(Boolean), r.bandera ? [r.bandera] : [])
            .map(b => h('span.etq', b))
        )
      )
    );
  };
  const pintar = () => {
    if (!el || !CK.P) return;
    pintarIzq();
    pintarCentro();
    pintarDer();
  };
  const crear = raiz => {
    el = raiz;
    el.style.gridTemplateColumns = '250px 1fr 320px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    centro = h('div.pagina', { style: { padding: '22px 26px 60px' } });
    der = h('aside.panel');
    el.append(izq, h('div', { style: { position: 'relative', minWidth: 0, overflowY: 'auto' } }, centro), der);
    centro.style.position = 'static';
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (typeof arg === 'string') {
      const i = L().findIndex(m => m.id === arg);
      if (i >= 0) st.i = i;
    }
    st.i = Math.min(st.i, Math.max(0, L().length - 1));
    pintar();
  };
  CK.iconos.mision = '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>';
  CK.registrar({
    id: 'misiones',
    nombre: 'Misiones',
    corto: 'Misiones',
    ico: 'mision',
    desc: 'Encargos por pasos: hablar, preguntar, llegar, vencer. El juego los sigue y entrega la recompensa.',
    crear,
    mostrar,
    alCambiarProyecto: () => {
      st.i = 0;
    }
  });
})();
