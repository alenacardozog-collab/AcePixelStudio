/* ANIMAR · eventos por cuadro: en un cuadro puede sonar algo, salir un efecto, marcarse el golpe o avisar al juego.
   Se guardan en a.cuadros.ev[cuadro] = [{ t: 'sonido', n, v } | { t: 'fx', id, x, y } | { t: 'golpe' } | { t: 'aviso', n }]
   (índice del cuadro de la hoja, igual que las duraciones). El juego los respeta (js/editor_loader.js en CastleKnight). */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;
  const TIPOS = {
    sonido: { nombre: 'Sonido', ico: 'sonido', desc: 'Suena un sonido del juego (assets/audio/sfx).' },
    fx: { nombre: 'Efecto', ico: 'fx', desc: 'Sale un efecto del proyecto, corrido desde los pies del personaje.' },
    golpe: { nombre: 'Golpe', ico: 'rayo', desc: 'El momento exacto en que el ataque pega. El juego avisa "ck_golpe" en ese cuadro.' },
    aviso: { nombre: 'Aviso', ico: 'alerta', desc: 'Un aviso con nombre para el juego (por ejemplo "paso" o "soltar_flecha").' }
  };
  An.TIPOS_EV = TIPOS;
  const texto = e =>
    e.t === 'sonido'
      ? 'Sonido: ' + (e.n || '?')
      : e.t === 'fx'
        ? 'Efecto: ' + ((CK.P.fx[e.id] || {}).nombre || e.id || '?')
        : e.t === 'golpe'
          ? 'Golpe'
          : 'Aviso: ' + (e.n || '?');

  /** Iconitos de los eventos de un cuadro, para la línea de tiempo. */
  An.insigniasEv = (a, i) => {
    const ev = (a.cuadros.ev || [])[i];
    if (!ev || !ev.length) return null;
    const s = h('span.tl-ev', { html: ev.map(e => CK.ico((TIPOS[e.t] || TIPOS.aviso).ico, 11)).join('') });
    s.title = ev.map(texto).join(' · ');
    return s;
  };

  // ---------------------------------------------------------------- escuchar los sonidos mientras se reproduce
  const cache = {};
  let silencio = false;
  An.st.sonarEv = An.st.sonarEv !== false;
  An.sonarEventos = async (a, i) => {
    if (!a || !a.cuadros || !An.st.sonarEv || silencio) return;
    const ev = (a.cuadros.ev || [])[i];
    if (!ev) return;
    const d = CK.fs.dir('juego');
    if (!d) return;
    for (const e of ev) {
      if (e.t !== 'sonido' || !e.n) continue;
      try {
        if (!cache[e.n]) {
          const f = await CK.fs.leer(d, 'assets/audio/sfx/' + e.n + '.mp3');
          cache[e.n] = URL.createObjectURL(f);
        }
        const au = new Audio(cache[e.n]);
        au.volume = e.v === undefined ? 0.7 : e.v;
        au.play().catch(() => {});
      } catch (er) {
        cache[e.n] = null;
      }
    }
  };

  // ---------------------------------------------------------------- ventana para editar los eventos de un cuadro
  An.editarEventos = async i => {
    let a = An.hojaA();
    if (!a || !a.cuadros) return;
    if (a.cuadros.orden) An.editarHoja('Fijar orden', () => {});
    a = An.hojaA();
    if (!CK.audioJuego && CK.fs.dir('juego') && CK.leerAudioJuego) await CK.leerAudioJuego();
    const sfx = (CK.audioJuego || {}).sfx || [];
    const lista = CK.clone((a.cuadros.ev || [])[i] || []);
    const caja = h('div.ev-lista');
    const fila = (e, k) => {
      const T = TIPOS[e.t] || TIPOS.aviso;
      const quitar = CK.btn({
        ico: 'basura',
        tip: 'Quitar',
        cls: 'chico plano',
        on: () => {
          lista.splice(k, 1);
          pintar();
        }
      });
      let ctl;
      if (e.t === 'sonido') {
        const sel = sfx.length
          ? CK.sel(e.n || '', [['', '(elegí un sonido)']].concat(sfx.includes(e.n) || !e.n ? sfx : [e.n].concat(sfx)), v => (e.n = v))
          : CK.txt(e.n, v => (e.n = v.trim()), { ph: 'nombre del archivo, sin .mp3' });
        ctl = h(
          'div.fila.junto',
          sel,
          CK.rango(Math.round((e.v === undefined ? 0.7 : e.v) * 100), { min: 0, max: 100, step: 5 }, v => (e.v = v / 100)),
          CK.btn({
            ico: 'play',
            tip: 'Escuchar',
            cls: 'chico plano',
            on: () => e.n && CK.sonar('assets/audio/sfx/' + e.n + '.mp3', e.v === undefined ? 0.7 : e.v)
          })
        );
      } else if (e.t === 'fx') {
        const ops = Object.values(CK.P.fx).map(f => [f.id, f.nombre || f.id]);
        ctl = h(
          'div.fila.junto',
          ops.length
            ? CK.sel(e.id || '', [['', '(elegí un efecto)']].concat(ops), v => (e.id = v))
            : h('span.nota-txt', 'Todavía no hay efectos en el proyecto (se crean en la sección FX).'),
          h('span.mini-rot', '→'),
          CK.num(e.x || 0, { step: 1 }, v => (e.x = v)),
          h('span.mini-rot', '↓'),
          CK.num(e.y || 0, { step: 1 }, v => (e.y = v))
        );
      } else if (e.t === 'aviso') ctl = CK.txt(e.n, v => (e.n = v.trim()), { ph: 'nombre del aviso, ej.: paso' });
      else ctl = h('span.nota-txt', 'En este cuadro pega el ataque.');
      return h('div.ev-fila', h('span.ev-tipo', { html: CK.ico(T.ico, 15) }, T.nombre), h('div.crece', ctl), quitar);
    };
    const pintar = () => {
      CK.vaciar(caja);
      if (!lista.length) caja.append(h('p.nota-txt', 'Este cuadro no tiene eventos. Agregá uno con los botones de abajo.'));
      lista.forEach((e, k) => caja.append(fila(e, k)));
    };
    pintar();
    const agregar = t => () => {
      lista.push(t === 'sonido' ? { t, n: '', v: 0.7 } : t === 'fx' ? { t, id: '', x: 0, y: 0 } : t === 'aviso' ? { t, n: '' } : { t });
      pintar();
    };
    const cuerpo = h(
      'div',
      h(
        'p',
        'Lo que pasa justo cuando aparece el cuadro ' +
          (i + 1) +
          '. El juego lo respeta: suena, sale el efecto o avisa el golpe en el momento exacto de la animación.'
      ),
      caja,
      h(
        'div.fila',
        { style: { marginTop: '10px' } },
        Object.keys(TIPOS).map(t =>
          CK.btn({ ico: TIPOS[t].ico, txt: '+ ' + TIPOS[t].nombre, desc: TIPOS[t].desc, cls: 'chico', on: agregar(t) })
        )
      ),
      !CK.fs.dir('juego') ? h('p.nota-txt', 'Conectá la carpeta del juego para elegir entre sus sonidos y escucharlos.') : null
    );
    const ok = await CK.ventana({
      titulo: 'Eventos del cuadro ' + (i + 1),
      ancho: 620,
      cuerpo,
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Guardar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    const limpia = lista.filter(e => (e.t === 'sonido' ? e.n : e.t === 'fx' ? e.id : e.t === 'aviso' ? e.n : true));
    An.editarHoja('Eventos del cuadro', f => {
      if (!f[i]) return false;
      if (limpia.length) f[i].ev = limpia;
      else delete f[i].ev;
    });
  };
})();
