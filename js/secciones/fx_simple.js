/* FX · lo principal: controles grandes que mueven varios valores juntos y de forma coherente.
   Intensidad (cuántas partículas y cuánto brillo), Tamaño, Velocidad, Duración y Tono del color.
   Se aplican sobre una copia de los valores de partida (efecto.base); si después se toca algo en "Ajuste fino",
   lo que se ve queda fijo y los controles vuelven a 100 %. Nada se pierde: todo lo de siempre sigue en "Ajuste fino".
   "Variar" propone una versión parecida con pequeñas diferencias; las probadas quedan a mano para volver. */
'use strict';
(function () {
  const h = CK.h;
  const FS = (CK.fxSimple = {});
  const NEUTRO = { int: 1, tam: 1, vel: 1, dur: 1, tono: 0 };
  const esc = (v, k, def) => {
    const x = v === undefined ? def : v;
    return Array.isArray(x) ? x.map(n => +(n * k).toFixed(3)) : +(x * k).toFixed(3);
  };
  // ---- color: girar el tono
  const aHsl = hex => {
    const n = parseInt(String(hex).replace('#', ''), 16),
      r = ((n >> 16) & 255) / 255,
      g = ((n >> 8) & 255) / 255,
      b = (n & 255) / 255,
      mx = Math.max(r, g, b),
      mn = Math.min(r, g, b),
      l = (mx + mn) / 2;
    let hh = 0,
      s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh *= 60;
    }
    return [hh, s, l];
  };
  const deHsl = (hh, s, l) => {
    const f = n => {
      const k = (n + hh / 30) % 12,
        a = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const girar = (hex, grados) => {
    if (!grados || typeof hex !== 'string' || hex[0] !== '#') return hex;
    const [hh, s, l] = aHsl(hex);
    return deHsl((hh + grados + 360) % 360, s, l);
  };
  FS.girarColor = girar;

  /** Recalcula el efecto a partir de su base y los controles. */
  FS.aplicar = e => {
    const B = e.base,
      M = Object.assign({}, NEUTRO, e.macro);
    if (!B) return;
    const D = CKFx.DEF,
      tiempo = M.dur / M.vel;
    e.dur = +(B.dur * tiempo).toFixed(3);
    e.mov = B.mov ? { vx: (B.mov.vx || 0) * M.vel * M.tam, vy: (B.mov.vy || 0) * M.vel * M.tam } : B.mov;
    e.capas = B.capas.map(c0 => {
      const c = CK.clone(c0);
      if (c.inicio) c.inicio = +(c.inicio * tiempo).toFixed(3);
      if (c.fin !== undefined && c.fin !== null) c.fin = +(c.fin * tiempo).toFixed(3);
      if (c.tipo === 'emisor') {
        c.tasa = esc(c.tasa, M.int * M.vel, D.tasa);
        if (c.rafaga) c.rafaga = Math.max(1, Math.round(c.rafaga * M.int));
        c.tam = esc(c.tam, M.tam, D.tam);
        c.ancho = esc(c.ancho, M.tam, 0);
        c.alto = esc(c.alto, M.tam, 0);
        c.x = esc(c.x, M.tam, 0);
        c.y = esc(c.y, M.tam, 0);
        c.vel = esc(c.vel, M.tam * M.vel, D.vel);
        c.vida = esc(c.vida, 1 / M.vel, D.vida);
        c.gravX = esc(c.gravX, M.vel * M.vel * M.tam, 0);
        c.gravY = esc(c.gravY, M.vel * M.vel * M.tam, 0);
        if (M.int !== 1) c.alfa = (c.alfa || D.alfa).map(a => +Math.min(1, a * (0.7 + 0.3 * M.int)).toFixed(3));
        if (M.tono) c.colores = (c.colores || D.colores).map(x => girar(x, M.tono));
      } else if (c.tipo === 'luz') {
        c.radio = esc(c.radio, M.tam, [20, 20]);
        c.fuerza = +Math.min(1.5, (c.fuerza === undefined ? 0.6 : c.fuerza) * Math.sqrt(M.int)).toFixed(3);
        if (M.tono) c.color = girar(c.color, M.tono);
      } else if (c.tipo === 'destello') {
        c.fuerza = +Math.min(1, (c.fuerza || 0.3) * Math.sqrt(M.int)).toFixed(3);
        if (M.tono) c.color = girar(c.color, M.tono);
      } else if (c.tipo === 'sacudida') c.fuerza = esc(c.fuerza, M.int, 2);
      return c;
    });
  };
  /** Fija lo que se ve: sin base ni controles (se llama al tocar algo en "Ajuste fino"). */
  FS.fijar = e => {
    delete e.base;
    delete e.macro;
  };

  // ---- variar: una versión parecida
  const VAR = 0.18;
  FS.variar = (e, semilla) => {
    const R = (() => {
      let s = semilla >>> 0 || 1;
      return () => {
        s ^= s << 13;
        s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 4294967296;
      };
    })();
    const f = (v, k = VAR) =>
      Array.isArray(v) ? v.map(n => +(n * (1 + (R() * 2 - 1) * k)).toFixed(3)) : +(v * (1 + (R() * 2 - 1) * k)).toFixed(3);
    const D = CKFx.DEF;
    FS.fijar(e);
    e.capas.forEach(c => {
      if (c.tipo === 'emisor') {
        c.tasa = f(c.tasa === undefined ? D.tasa : c.tasa);
        c.vel = f(c.vel || D.vel);
        c.vida = f(c.vida || D.vida, 0.12);
        c.tam = f(c.tam || D.tam, 0.15);
        c.apertura = Math.max(0, Math.round((c.apertura === undefined ? D.apertura : c.apertura) + (R() * 2 - 1) * 10));
        c.angulo = Math.round((c.angulo === undefined ? D.angulo : c.angulo) + (R() * 2 - 1) * 8);
        if (c.gravY) c.gravY = f(c.gravY);
        if (c.turbulencia) c.turbulencia = f(c.turbulencia);
        c.colores = (c.colores || D.colores).map(x => girar(x, Math.round((R() * 2 - 1) * 10)));
      } else if (c.tipo === 'luz') {
        c.radio = f(c.radio || [20, 20], 0.12);
        c.fuerza = f(c.fuerza === undefined ? 0.6 : c.fuerza, 0.12);
      }
    });
  };

  // ---- el bloque "Lo principal"
  const CONTROLES = [
    ['int', 'Intensidad', 25, 250, 5, '%', 'Más o menos partículas y brillo.'],
    ['tam', 'Tamaño', 40, 300, 5, '%', 'Todo más grande o más chico: partículas, zona y distancia que recorren.'],
    ['vel', 'Velocidad', 30, 300, 5, '%', 'Todo pasa más rápido o más lento, sin cambiar la forma.'],
    ['dur', 'Duración', 30, 300, 5, '%', 'Cuánto dura el efecto (y cuándo entra y sale cada capa).'],
    ['tono', 'Color', -180, 180, 5, '°', 'Gira el tono de todos los colores: de fuego a fuego azul, de veneno verde a violeta.']
  ];
  /**
   * o = { e (efecto), editar(nombre, fn, final), repintar(), pintarTodo(), variantes: [] (lista de versiones probadas) }
   */
  FS.bloque = o => {
    const e = o.e,
      M = Object.assign({}, NEUTRO, e.macro);
    const filas = CONTROLES.map(([k, rot, min, max, step, u, desc]) => {
      const val = k === 'tono' ? M.tono : Math.round(M[k] * 100);
      const r = CK.rango(val, { min, max, step, comun: k === 'tono' ? 0 : 100 }, (v, fin) => {
        o.editar(
          'Lo principal: ' + rot.toLowerCase(),
          x => {
            if (!x.base) x.base = { dur: x.dur, mov: x.mov ? CK.clone(x.mov) : x.mov, capas: CK.clone(x.capas) };
            x.macro = Object.assign({}, NEUTRO, x.macro);
            x.macro[k] = k === 'tono' ? v : v / 100;
            FS.aplicar(x);
          },
          fin
        );
        if (fin) o.pintarTodo();
      });
      r.querySelector('.rango-val').textContent = val + u;
      r.querySelector('input').addEventListener('input', ev => (r.querySelector('.rango-val').textContent = ev.target.value + u));
      const c = CK.campo(rot, r, desc);
      c.classList.add('fx-macro');
      return c;
    });
    const tocado = e.macro && Object.keys(NEUTRO).some(k => (e.macro[k] === undefined ? NEUTRO[k] : e.macro[k]) !== NEUTRO[k]);
    const variantes = o.variantes || [];
    return h(
      'div.bloque.fx-simple',
      h('h3.bloque-tit', 'Lo principal'),
      ...filas,
      h(
        'div.fila',
        { style: { marginTop: '8px' } },
        CK.btn({
          ico: 'dado',
          txt: 'Variar',
          cls: 'chico',
          desc: 'Una versión parecida, con pequeñas diferencias (cantidad, velocidad, ángulo, color). Probá varias: las anteriores quedan acá abajo.',
          on: () => {
            variantes.push(CK.clone(e));
            if (variantes.length > 12) variantes.shift();
            o.editar('Variar', x => FS.variar(x, 1 + Math.floor(Math.random() * 1e6)), true);
            o.pintarTodo();
          }
        }),
        tocado
          ? CK.btn({
              ico: 'recargar',
              txt: 'Volver a 100 %',
              cls: 'chico plano',
              desc: 'Deja los controles como al principio (los valores de partida).',
              on: () => {
                o.editar(
                  'Lo principal: volver',
                  x => {
                    x.macro = Object.assign({}, NEUTRO);
                    FS.aplicar(x);
                    FS.fijar(x);
                  },
                  true
                );
                o.pintarTodo();
              }
            })
          : null
      ),
      variantes.length
        ? h(
            'div.fx-probadas',
            h('span.mini-rot', 'Probadas (clic para volver a una):'),
            h(
              'div.fila',
              variantes.map((v, i) =>
                CK.btn({
                  txt: String(i + 1),
                  cls: 'chico',
                  desc: 'Volver a la versión ' + (i + 1) + ' que probaste.',
                  on: () => {
                    o.editar(
                      'Volver a una versión probada',
                      x => {
                        Object.keys(x).forEach(k => delete x[k]);
                        Object.assign(x, CK.clone(v));
                      },
                      true
                    );
                    o.pintarTodo();
                  }
                })
              )
            )
          )
        : null
    );
  };

  // ---- elegir con dibujos en vez de listas
  const DIB = {
    punto: '<circle cx="12" cy="12" r="2.4" fill="currentColor"/>',
    linea:
      '<path d="M4 12h16"/><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
    circulo:
      '<circle cx="12" cy="12" r="7" stroke-dasharray="2 2"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="13" r="1" fill="currentColor"/><circle cx="11" cy="15" r="1" fill="currentColor"/>',
    anillo:
      '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/><circle cx="7" cy="17" r="1.3" fill="currentColor"/>',
    area: '<rect x="5" y="6" width="14" height="12" rx="1.5" stroke-dasharray="2 2"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="11" cy="15" r="1" fill="currentColor"/>',
    pixel: '<rect x="8" y="8" width="8" height="8" fill="currentColor"/>',
    rombo: '<path d="M12 5l6 7-6 7-6-7z" fill="currentColor"/>',
    chispa: '<path d="M8 16l8-8" stroke-width="2.6"/>',
    cruz: '<path d="M12 6v12M6 12h12" stroke-width="2.4"/>',
    estrella: '<path d="M12 4l2.2 5 5.3.4-4 3.5 1.3 5.2L12 15.3 7.2 18.1l1.3-5.2-4-3.5 5.3-.4z" fill="currentColor"/>',
    gota: '<path d="M12 4c3 4.5 5 7.3 5 9.6a5 5 0 0 1-10 0c0-2.3 2-5.1 5-9.6z" fill="currentColor"/>',
    brillo:
      '<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    humo: '<path d="M7 17a4 4 0 0 1 .5-8 5 5 0 0 1 9.4 1.5A3.3 3.3 0 0 1 17 17z" fill="currentColor" opacity=".8"/>',
    asset: '<rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20 16l-5-5-8 8"/>'
  };
  DIB.circulo_fig = '<circle cx="12" cy="12" r="5" fill="currentColor"/>';
  DIB.anillo_fig = '<circle cx="12" cy="12" r="5.5" stroke-width="2.2"/>';
  DIB.linea_fig = '<path d="M5 19L19 5" stroke-width="2.2"/>';
  /** Fila de botones con dibujo. ops = [[valor, texto, dibujo?]] */
  FS.conDibujos = (valor, ops, on) =>
    h(
      'div.con-dibujos',
      ops.map(([v, txt, d]) => {
        const b = h('button.con-dib' + (v === valor ? '.activo' : ''), {
          type: 'button',
          html:
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            (DIB[d || v] || '') +
            '</svg>',
          onclick: () => on(v)
        });
        CK.tip(b, txt);
        return b;
      })
    );
})();
