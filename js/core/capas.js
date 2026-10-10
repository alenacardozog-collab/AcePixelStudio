/* LISTA DE CAPAS CON CARPETAS: la usan Mapa y Pixel art.
   - Arrastrar una capa la sube o la baja (arriba = adelante). Soltarla entre las capas de una carpeta la mete ahí.
   - Soltarla sobre el título de una carpeta también la mete. Las carpetas se pliegan, se ocultan enteras y se arrastran.
   - Clic derecho: mover a carpeta, sacar de la carpeta, renombrar o desarmar la carpeta.
   o = {
     items(): el arreglo real de capas (de abajo hacia arriba; se reordena en el lugar),
     id(x), carpeta(x), ponerCarpeta(x, nombre | null), visible(x), ponerVisible(x, v),
     activo(): id de la capa elegida, elegir(x),
     fila(x): contenido de la fila (botones, nombre…), sin la caja,  doble(x): doble clic (renombrar),
     cambio(nombre, fn): aplica fn con deshacer y vuelve a pintar,
     menu(x, ev, extra): menú propio de la capa (extra = opciones de carpeta para sumar); si falta, se usa uno básico,
     plegadas: Set de carpetas plegadas (lo guarda la sección),
     alArrastrar(x, ev), alTerminar(): avisos para quien quiera recibir la capa en otro lado (ej. la tira de cuadros)
   } */
'use strict';
(function () {
  const h = CK.h;
  /** Deja juntas las capas de cada carpeta, donde está la más alta de ellas. */
  const agrupar = (arr, carpeta) => {
    const res = [],
      vistas = new Set();
    for (let i = arr.length - 1; i >= 0; i--) {
      const c = carpeta(arr[i]);
      if (!c) {
        res.push(arr[i]);
        continue;
      }
      if (vistas.has(c)) continue;
      vistas.add(c);
      for (let j = arr.length - 1; j >= 0; j--) if (carpeta(arr[j]) === c) res.push(arr[j]);
    }
    arr.splice(0, arr.length, ...res.reverse());
  };
  CK.capasAgrupar = agrupar;

  CK.capasUI = o => {
    const lista = h('div.lista.capas-lista'),
      arr = () => o.items();
    let arrastre = null; // { tipo: 'capa' | 'carpeta', x | nombre }
    const enCarpeta = c => arr().filter(x => o.carpeta(x) === c);
    const conservarActivo = fn => () => {
      const act = arr().find(x => o.id(x) === o.activo());
      fn();
      agrupar(arr(), o.carpeta);
      if (act) o.elegir(act, true);
    };
    const nombreLibre = base => {
      const ya = new Set(arr().map(o.carpeta).filter(Boolean));
      let n = base,
        k = 2;
      while (ya.has(n)) n = base + ' ' + k++;
      return n;
    };
    const aCarpeta = async x => {
      const ya = [...new Set(arr().map(o.carpeta).filter(Boolean))],
        d = { v: o.carpeta(x) || '' };
      let input;
      const v = await CK.ventana({
        titulo: 'Mover a carpeta',
        cuerpo: h(
          'div',
          CK.campo('Carpeta', (input = CK.txt(d.v, t => (d.v = t), { vivo: true, ph: 'Personaje, Fondo…' }))),
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
            : null,
          h('p.nota-txt', 'Vacío: la saca de la carpeta.')
        ),
        botones: [
          { txt: 'Cancelar', valor: null },
          { txt: 'Mover', cls: 'pri', valor: () => d.v }
        ]
      });
      if (v === null) return;
      o.cambio(
        'Mover a carpeta',
        conservarActivo(() => o.ponerCarpeta(x, v.trim() || null))
      );
    };
    const extraDe = x =>
      [
        '-',
        { txt: 'Mover a carpeta…', ico: 'carpeta', on: () => aCarpeta(x) },
        {
          txt: 'Carpeta nueva con esta capa',
          ico: 'carpeta',
          on: () =>
            o.cambio(
              'Carpeta nueva',
              conservarActivo(() => o.ponerCarpeta(x, nombreLibre('Carpeta')))
            )
        },
        o.carpeta(x)
          ? {
              txt: 'Sacar de la carpeta',
              ico: 'cerrar',
              on: () =>
                o.cambio(
                  'Sacar de la carpeta',
                  conservarActivo(() => o.ponerCarpeta(x, null))
                )
            }
          : null
      ].filter(Boolean);
    const marcar = (el, pos) => {
      lista.querySelectorAll('.capa-fila,.capa-carpeta').forEach(q => q.classList.remove('soltar-arriba', 'soltar-abajo', 'soltar-dentro'));
      if (el && pos) el.classList.add('soltar-' + pos);
    };
    /** Mueve la capa (o la carpeta entera) junto a la referencia. dentro = carpeta destino o null. */
    const soltar = (ref, pos) => {
      if (!arrastre) return;
      const a = arr(),
        mov = arrastre.tipo === 'carpeta' ? enCarpeta(arrastre.nombre) : [arrastre.x];
      if (ref && mov.includes(ref)) return;
      const nombre = arrastre.tipo === 'carpeta' ? 'Mover carpeta' : 'Ordenar capas';
      o.cambio(
        nombre,
        conservarActivo(() => {
          mov.forEach(m => a.splice(a.indexOf(m), 1));
          let destino = null,
            i;
          if (pos === 'dentro') {
            // sobre el título de la carpeta: arriba de todo dentro de ella
            const miembros = enCarpeta(ref);
            destino = ref;
            i = miembros.length ? a.indexOf(miembros[miembros.length - 1]) + 1 : a.length;
          } else {
            i = a.indexOf(ref) + (pos === 'arriba' ? 1 : 0);
            if (arrastre.tipo === 'capa') destino = o.carpeta(ref) || null;
            else if (o.carpeta(ref)) {
              // una carpeta no entra en otra: se pone antes o después de toda la carpeta vecina
              const vecina = enCarpeta(o.carpeta(ref));
              i = pos === 'arriba' ? a.indexOf(vecina[vecina.length - 1]) + 1 : a.indexOf(vecina[0]);
            }
          }
          a.splice(i, 0, ...mov);
          if (arrastre.tipo === 'capa') o.ponerCarpeta(mov[0], destino);
        })
      );
    };
    const filaCapa = (x, dentro) => {
      const el = h(
        'div.item.capa-fila' + (o.id(x) === o.activo() ? '.activo' : '') + (dentro ? '.en-carpeta' : ''),
        { draggable: 'true' },
        o.fila(x)
      );
      el.addEventListener('click', e => {
        if (e.target.closest('.btn')) return;
        o.elegir(x);
      });
      el.addEventListener('dblclick', e => {
        if (!e.target.closest('.btn') && o.doble) o.doble(x);
      });
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        o.elegir(x);
        if (o.menu) o.menu(x, e, extraDe(x));
        else CK.menu(e, [{ titulo: o.nombre ? o.nombre(x) : 'Capa' }, ...extraDe(x).slice(1)]);
      });
      el.addEventListener('dragstart', e => {
        arrastre = { tipo: 'capa', x };
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', 'capa');
        el.style.opacity = '.45';
        if (o.alArrastrar) o.alArrastrar(x, e);
      });
      el.addEventListener('dragend', () => {
        arrastre = null;
        el.style.opacity = '';
        marcar(null);
        if (o.alTerminar) o.alTerminar();
      });
      el.addEventListener('dragover', e => {
        if (!arrastre) return;
        e.preventDefault();
        const r = el.getBoundingClientRect();
        marcar(el, e.clientY < r.top + r.height / 2 ? 'arriba' : 'abajo');
      });
      el.addEventListener('drop', e => {
        if (!arrastre) return;
        e.preventDefault();
        const r = el.getBoundingClientRect();
        soltar(x, e.clientY < r.top + r.height / 2 ? 'arriba' : 'abajo');
        arrastre = null;
      });
      return el;
    };
    const filaCarpeta = c => {
      const miembros = enCarpeta(c),
        plegada = o.plegadas && o.plegadas.has(c),
        todasVisibles = miembros.every(o.visible);
      const el = h(
        'div.item.capa-carpeta',
        { draggable: 'true' },
        CK.btn({
          ico: plegada ? 'siguiente' : 'bajar',
          tip: plegada ? 'Desplegar' : 'Plegar',
          cls: 'chico plano',
          on: e => {
            e.stopPropagation();
            if (plegada) o.plegadas.delete(c);
            else o.plegadas.add(c);
            pintar();
          }
        }),
        CK.btn({
          ico: todasVisibles ? 'ojo' : 'ojoNo',
          tip: todasVisibles ? 'Ocultar la carpeta' : 'Mostrar la carpeta',
          cls: todasVisibles ? 'encendido' : '',
          on: e => {
            e.stopPropagation();
            o.cambio(todasVisibles ? 'Ocultar carpeta' : 'Mostrar carpeta', () => miembros.forEach(m => o.ponerVisible(m, !todasVisibles)));
          }
        }),
        h('span', { html: CK.ico('carpeta', 16) }),
        h('span.nombre', c),
        h('span.sub', miembros.length + (miembros.length === 1 ? ' capa' : ' capas'))
      );
      CK.tip(
        el,
        'Carpeta "' + c + '"',
        'Arrastrala para moverla entera. Soltá una capa encima para meterla. Doble clic: renombrar. Clic derecho: opciones.'
      );
      const renombrar = async () => {
        const n = await CK.pedir('Nombre de la carpeta', 'Nombre', c);
        if (!n || n === c) return;
        o.cambio(
          'Renombrar carpeta',
          conservarActivo(() => miembros.forEach(m => o.ponerCarpeta(m, n)))
        );
        if (o.plegadas && o.plegadas.has(c)) {
          o.plegadas.delete(c);
          o.plegadas.add(n);
        }
      };
      el.addEventListener('dblclick', e => {
        if (!e.target.closest('.btn')) renombrar();
      });
      el.addEventListener('click', e => {
        if (e.target.closest('.btn')) return;
        const tope = miembros[miembros.length - 1];
        if (tope) o.elegir(tope);
      });
      el.addEventListener('contextmenu', e =>
        CK.menu(e, [
          { titulo: 'Carpeta "' + c + '"' },
          { txt: 'Renombrar…', ico: 'texto', on: renombrar },
          {
            txt: todasVisibles ? 'Ocultar todo' : 'Mostrar todo',
            ico: todasVisibles ? 'ojoNo' : 'ojo',
            on: () => o.cambio('Ver carpeta', () => miembros.forEach(m => o.ponerVisible(m, !todasVisibles)))
          },
          {
            txt: plegada ? 'Desplegar' : 'Plegar',
            ico: 'bajar',
            on: () => {
              plegada ? o.plegadas.delete(c) : o.plegadas.add(c);
              pintar();
            }
          },
          '-',
          {
            txt: 'Desarmar la carpeta (las capas quedan)',
            ico: 'cerrar',
            on: () =>
              o.cambio(
                'Desarmar carpeta',
                conservarActivo(() => miembros.forEach(m => o.ponerCarpeta(m, null)))
              )
          }
        ])
      );
      el.addEventListener('dragstart', e => {
        arrastre = { tipo: 'carpeta', nombre: c };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'carpeta');
        el.style.opacity = '.45';
      });
      el.addEventListener('dragend', () => {
        arrastre = null;
        el.style.opacity = '';
        marcar(null);
      });
      el.addEventListener('dragover', e => {
        if (!arrastre || (arrastre.tipo === 'carpeta' && arrastre.nombre === c)) return;
        e.preventDefault();
        const r = el.getBoundingClientRect(),
          y = (e.clientY - r.top) / r.height;
        marcar(el, arrastre.tipo === 'capa' ? (y < 0.25 ? 'arriba' : 'dentro') : y < 0.5 ? 'arriba' : 'abajo');
      });
      el.addEventListener('drop', e => {
        if (!arrastre) return;
        e.preventDefault();
        const r = el.getBoundingClientRect(),
          y = (e.clientY - r.top) / r.height;
        if (arrastre.tipo === 'capa' && y >= 0.25) soltar(c, 'dentro');
        else {
          // arriba del título = arriba de toda la carpeta
          const top = miembros[miembros.length - 1],
            bot = miembros[0];
          if (arrastre.tipo === 'carpeta') soltar(y < 0.5 ? top : bot, y < 0.5 ? 'arriba' : 'abajo');
          else {
            const a = arr();
            o.cambio(
              'Ordenar capas',
              conservarActivo(() => {
                a.splice(a.indexOf(arrastre.x), 1);
                a.splice(a.indexOf(top) + 1, 0, arrastre.x);
                o.ponerCarpeta(arrastre.x, null);
              })
            );
          }
        }
        arrastre = null;
      });
      return el;
    };
    const pintar = () => {
      CK.vaciar(lista);
      const a = arr(),
        hechas = new Set();
      for (let i = a.length - 1; i >= 0; i--) {
        const x = a[i],
          c = o.carpeta(x);
        if (!c) {
          lista.append(filaCapa(x, false));
          continue;
        }
        if (hechas.has(c)) continue;
        hechas.add(c);
        lista.append(filaCarpeta(c));
        if (!(o.plegadas && o.plegadas.has(c)))
          enCarpeta(c)
            .slice()
            .reverse()
            .forEach(m => lista.append(filaCapa(m, true)));
      }
    };
    agrupar(arr(), o.carpeta);
    pintar();
    lista.refrescar = pintar;
    lista.nuevaCarpeta = () => {
      const x = arr().find(q => o.id(q) === o.activo());
      if (x)
        o.cambio(
          'Carpeta nueva',
          conservarActivo(() => o.ponerCarpeta(x, nombreLibre('Carpeta')))
        );
    };
    return lista;
  };
})();
