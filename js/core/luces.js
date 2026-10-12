/* LUCES: tipos de luz (redonda, foco, rectángulo, tira, anillo, haz de sol), suavizado, dirección, escalones pixel,
   parpadeo y pulso. El "núcleo" (entre las marcas luz-nucleo) se copia tal cual al cargador del juego
   (juego/editor_loader.js), así la luz se ve igual en el editor y en el juego. Una luz sin "forma" es una luz vieja:
   se dibuja como antes (degradé redondo) para no cambiar lo ya hecho. */
'use strict';
/*<luz-nucleo>*/
var LUZ = (function () {
  var cl = function (v, a, b) {
    return v < a ? a : v > b ? b : v;
  };
  var hex = function (s) {
    s = String(s || '#ffcc66').replace('#', '');
    if (s.length === 3) s = s.replace(/./g, '$&$&');
    var n = parseInt(s, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  var D = {
    forma: 'punto',
    radio: 48,
    color: '#ffc46b',
    color2: '',
    fuerza: 0.55,
    suave: 60,
    nucleo: 0,
    escalones: 0,
    dir: 90,
    apertura: 50,
    ancho: 32,
    alto: 16,
    grosor: 30,
    parpadeo: 0,
    pulso: 0,
    modo: 'suma'
  };
  var v = function (o, k) {
    return o[k] === undefined || o[k] === null || o[k] === '' ? D[k] : o[k];
  };
  /** Distancia desde el centro hasta el borde del lienzo de la luz. */
  var extension = function (o) {
    var R = +v(o, 'radio'),
      f = v(o, 'forma');
    if (f === 'area') return R + Math.hypot(+v(o, 'ancho'), +v(o, 'alto')) / 2;
    if (f === 'linea') return R + +v(o, 'ancho') / 2;
    if (f === 'sol') return R + +v(o, 'ancho') + R * Math.tan((cl(+v(o, 'apertura'), 0, 120) * Math.PI) / 360);
    return R;
  };
  /** Cuánta luz hay a una distancia u (0 = centro, 1 = borde). */
  var perfil = function (u, o) {
    var c = cl(+v(o, 'nucleo'), 0, 90) / 100,
      s = cl(+v(o, 'suave'), 2, 100) / 100,
      n = Math.round(+v(o, 'escalones'));
    if (u <= c) return 1;
    var uu = (u - c) / (1 - c);
    if (uu >= 1) return 0;
    var a = cl((1 - uu) / s, 0, 1),
      r = a * a * (3 - 2 * a) * Math.pow(1 - uu, s * 1.2);
    if (n >= 2) r = r > 0.02 ? Math.ceil(r * n) / n : 0;
    return r;
  };
  var suaveAng = function (ang, a, s) {
    var tw = Math.max(0.03, a * s),
      t = cl((a + tw / 2 - ang) / tw, 0, 1);
    return t * t * (3 - 2 * t);
  };
  /** Valor (0..1) y mezcla de color (0 = centro, 1 = borde) en un punto relativo al centro de la luz. */
  var muestra = function (o, dx, dy) {
    var f = v(o, 'forma'),
      R = Math.max(1, +v(o, 'radio')),
      // rectángulo y tira: sin dirección quedan acostados (0°); foco y haz apuntan abajo (90°)
      d = (((f === 'area' || f === 'linea') && (o.dir === undefined || o.dir === '') ? 0 : +v(o, 'dir')) * Math.PI) / 180,
      co = Math.cos(d),
      si = Math.sin(d),
      lx = dx * co + dy * si,
      ly = -dx * si + dy * co,
      s = cl(+v(o, 'suave'), 2, 100) / 100,
      u,
      k = 1;
    if (f === 'foco') {
      var r = Math.hypot(dx, dy),
        a = (cl(+v(o, 'apertura'), 2, 359) * Math.PI) / 360;
      u = r / R;
      k = suaveAng(Math.abs(Math.atan2(ly, lx)), a, s);
      var fuente = perfil(r / Math.max(2, R * 0.12), o) * 0.8;
      var val = Math.max(perfil(u, o) * k, fuente);
      return [val, cl(u, 0, 1)];
    }
    if (f === 'sol') {
      var W = Math.max(1, +v(o, 'ancho')),
        sp = Math.tan((cl(+v(o, 'apertura'), 0, 120) * Math.PI) / 360),
        t = lx,
        hw = W / 2 + Math.max(0, t) * sp;
      if (t < 0) u = Math.hypot(t, ly) / (W / 2);
      else u = Math.abs(ly) / hw;
      var largo = t <= 0 ? 1 : Math.pow(cl(1 - t / R, 0, 1), 0.8);
      return [perfil(u, o) * largo, cl(t / R, 0, 1)];
    }
    if (f === 'area') {
      var ex = Math.max(Math.abs(lx) - +v(o, 'ancho') / 2, 0),
        ey = Math.max(Math.abs(ly) - +v(o, 'alto') / 2, 0);
      u = Math.hypot(ex, ey) / R;
    } else if (f === 'linea') {
      u = Math.hypot(Math.max(Math.abs(lx) - +v(o, 'ancho') / 2, 0), ly) / R;
    } else if (f === 'anillo') {
      var g = cl(+v(o, 'grosor'), 5, 100) / 100,
        w = Math.max(1, (R * g) / 2),
        rc = R - w;
      u = Math.abs(Math.hypot(dx, dy) - rc) / w;
    } else u = Math.hypot(dx, dy) / R;
    return [perfil(u, o) * k, cl(u, 0, 1)];
  };
  var CLAVES = ['forma', 'radio', 'color', 'color2', 'suave', 'nucleo', 'escalones', 'dir', 'apertura', 'ancho', 'alto', 'grosor'];
  var claveDe = function (o) {
    return CLAVES.map(function (k) {
      return v(o, k);
    }).join('|');
  };
  var cache = {},
    nCache = 0;
  /** Lienzo con la luz dibujada (sin intensidad ni parpadeo: eso se aplica al dibujarla). e = medio lado en píxeles del mundo. */
  var textura = function (o, crear) {
    var k = claveDe(o);
    if (cache[k]) return cache[k];
    var E = Math.ceil(extension(o)),
      duro = +v(o, 'escalones') >= 2 || +v(o, 'suave') < 15,
      esc = Math.min(1, (duro ? 640 : 320) / (2 * E)),
      n = Math.max(2, Math.ceil(2 * E * esc)),
      c = crear ? crear(n, n) : document.createElement('canvas');
    c.width = n;
    c.height = n;
    var x = c.getContext('2d'),
      im = x.createImageData(n, n),
      p = im.data,
      c1 = hex(v(o, 'color')),
      c2 = v(o, 'color2') ? hex(v(o, 'color2')) : c1;
    for (var j = 0; j < n; j++)
      for (var i = 0; i < n; i++) {
        var m = muestra(o, ((i + 0.5) / n) * 2 * E - E, ((j + 0.5) / n) * 2 * E - E),
          a = m[0];
        if (a <= 0.002) continue;
        var t = m[1],
          q = (j * n + i) * 4;
        p[q] = c1[0] + (c2[0] - c1[0]) * t;
        p[q + 1] = c1[1] + (c2[1] - c1[1]) * t;
        p[q + 2] = c1[2] + (c2[2] - c1[2]) * t;
        p[q + 3] = cl(a, 0, 1) * 255;
      }
    x.putImageData(im, 0, 0);
    var r = { c: c, e: E, duro: duro, clave: k, id: ++nCache };
    cache[k] = r;
    return r;
  };
  /** Multiplicadores de tamaño y brillo en el instante t (milisegundos). */
  var vida = function (o, t) {
    var p = +v(o, 'parpadeo'),
      pu = +v(o, 'pulso'),
      tam = p ? 1 + Math.sin(t / 90 + (o.x || 0)) * 0.06 * p + Math.sin(t / 37 + (o.y || 0)) * 0.04 * p : 1,
      bri = pu ? 1 - (pu / 4) * 0.55 * (0.5 + 0.5 * Math.sin((t / 1000) * Math.PI * (0.6 + pu * 0.15))) : 1;
    return [tam, bri];
  };
  /** Dibuja la luz en (x, y) de un contexto en coordenadas del mundo. */
  var dibujar = function (ctx, o, t, x, y) {
    var tx = textura(o),
      vi = vida(o, t || 0),
      e = tx.e * vi[0];
    ctx.save();
    ctx.globalCompositeOperation = v(o, 'modo') === 'suave' ? 'screen' : 'lighter';
    ctx.globalAlpha = cl(+v(o, 'fuerza') * vi[1], 0, 1);
    ctx.imageSmoothingEnabled = !tx.duro;
    ctx.drawImage(tx.c, (x === undefined ? o.x : x) - e, (y === undefined ? o.y : y) - e, e * 2, e * 2);
    ctx.restore();
  };
  return {
    D: D,
    v: v,
    extension: extension,
    perfil: perfil,
    muestra: muestra,
    textura: textura,
    vida: vida,
    dibujar: dibujar,
    clave: claveDe
  };
})();
/*</luz-nucleo>*/

(function () {
  const h = CK.h;
  const L = (CK.luces = Object.assign({}, LUZ));
  /** Una luz vieja (sin forma) se sigue dibujando como siempre. */
  L.vieja = o => !o.forma;
  L.FORMAS = [
    ['punto', 'Redonda', '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>'],
    ['foco', 'Foco (cono)', '<path d="M4 12l15-7v14z"/><circle cx="4" cy="12" r="1.6" fill="currentColor"/>'],
    [
      'area',
      'Rectángulo (ventana, puerta)',
      '<rect x="6" y="7" width="12" height="10" rx="1"/><rect x="3" y="4" width="18" height="16" rx="3" stroke-dasharray="2 2"/>'
    ],
    ['linea', 'Tira (lava, neón, río)', '<path d="M4 12h16"/><path d="M4 8h16M4 16h16" stroke-dasharray="2 2"/>'],
    ['anillo', 'Anillo (magia, portal)', '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5" stroke-dasharray="2 2"/>'],
    ['sol', 'Haz de luz (sol por una ventana)', '<path d="M5 4l5 0 9 16H8z"/>']
  ];
  const PRE = (nombre, p) => ({ nombre, p });
  L.PRESETS = [
    PRE('Antorcha', { forma: 'punto', color: '#ffb05a', color2: '#ff6a2a', radio: 56, fuerza: 0.6, suave: 70, nucleo: 10, parpadeo: 2 }),
    PRE('Vela', { forma: 'punto', color: '#ffd27a', radio: 26, fuerza: 0.5, suave: 75, parpadeo: 1.5 }),
    PRE('Fogata', { forma: 'punto', color: '#ff9a3c', color2: '#ff4d1f', radio: 90, fuerza: 0.7, suave: 65, nucleo: 8, parpadeo: 3 }),
    PRE('Farol', { forma: 'punto', color: '#ffe2a0', radio: 64, fuerza: 0.55, suave: 55, nucleo: 20, parpadeo: 0.5 }),
    PRE('Ventana', { forma: 'area', color: '#ffd88a', ancho: 20, alto: 14, radio: 22, fuerza: 0.5, suave: 80 }),
    PRE('Luz de luna', { forma: 'punto', color: '#9fc4ff', radio: 120, fuerza: 0.35, suave: 90, modo: 'suave' }),
    PRE('Rayo de sol', { forma: 'sol', color: '#fff1c4', radio: 90, ancho: 24, apertura: 16, dir: 110, fuerza: 0.35, suave: 70 }),
    PRE('Foco', { forma: 'foco', color: '#fff4d6', radio: 100, apertura: 40, dir: 0, fuerza: 0.6, suave: 45 }),
    PRE('Magia', { forma: 'anillo', color: '#7fb2ff', color2: '#c58bff', radio: 40, grosor: 35, fuerza: 0.6, suave: 60, pulso: 2 }),
    PRE('Cristal (pixel)', { forma: 'punto', color: '#7ff5e0', radio: 40, fuerza: 0.55, escalones: 4, suave: 40, pulso: 1.5 }),
    PRE('Lava', { forma: 'linea', color: '#ff5a1f', color2: '#ffb02e', ancho: 60, radio: 26, fuerza: 0.6, suave: 70, pulso: 1 }),
    PRE('Neón', { forma: 'linea', color: '#ff4fd8', ancho: 40, radio: 10, fuerza: 0.7, suave: 40 }),
    PRE('Aura del héroe', { forma: 'punto', color: '#ffe9b0', radio: 34, fuerza: 0.35, suave: 85, pulso: 1, sigue: 'heroe' }),
    PRE('Linterna del héroe', {
      forma: 'foco',
      color: '#fff4d6',
      radio: 90,
      apertura: 45,
      dir: 0,
      fuerza: 0.55,
      suave: 50,
      sigue: 'heroe',
      mira: true
    }),
    PRE('Luz escalonada', { forma: 'punto', color: '#ffcf6b', radio: 48, escalones: 3, suave: 30, fuerza: 0.55, parpadeo: 1 })
  ];
  // propiedades que se guardan / copian de una luz (sin posición)
  L.PROPS = [
    'forma',
    'radio',
    'color',
    'color2',
    'fuerza',
    'suave',
    'nucleo',
    'escalones',
    'dir',
    'apertura',
    'ancho',
    'alto',
    'grosor',
    'parpadeo',
    'pulso',
    'modo',
    'encima',
    'sigue',
    'mira'
  ];
  L.props = o => {
    const r = {};
    L.PROPS.forEach(k => {
      if (o[k] !== undefined && o[k] !== '' && o[k] !== null) r[k] = CK.clone(o[k]);
    });
    return r;
  };
  /** Pone las propiedades p en la luz o (borra las que no vienen, así un tipo no arrastra cosas del anterior). */
  L.aplicar = (o, p) => {
    L.PROPS.forEach(k => {
      if (k === 'fuerza' && p[k] === undefined) return;
      if (p[k] === undefined) delete o[k];
      else o[k] = CK.clone(p[k]);
    });
    if (!o.forma) o.forma = 'punto';
  };
  /** Dibujo chico de una luz sobre fondo oscuro (para elegir de un vistazo). */
  L.mini = (p, tam = 46) => {
    const c = CK.lienzo(tam, tam),
      x = CK.ctx(c);
    x.fillStyle = '#15161c';
    x.fillRect(0, 0, tam, tam);
    x.fillStyle = '#23252e';
    for (let i = 0; i < tam; i += 8) for (let j = (i / 8) % 2 ? 0 : 8; j < tam; j += 16) x.fillRect(j, i, 8, 8);
    const o = Object.assign({}, p, { forma: p.forma || 'punto', fuerza: Math.min(1, (p.fuerza || 0.55) * 1.5) }),
      E = L.extension(o),
      k = (tam * 0.46) / Math.max(8, E);
    x.save();
    x.translate(tam / 2, tam / 2);
    x.scale(k, k);
    L.dibujar(x, o, 0, 0, 0);
    x.restore();
    return c;
  };
  /** Dibuja una luz del mapa (vieja o nueva) en el instante t. */
  L.dibujarMapa = (x, o, t, px, py) => {
    px = px === undefined ? o.x : px;
    py = py === undefined ? o.y : py;
    if (!L.vieja(o)) return L.dibujar(x, o, t, px, py);
    const par = o.parpadeo ? 1 + Math.sin(t / 90 + o.x) * 0.06 * o.parpadeo + Math.sin(t / 37 + o.y) * 0.04 * o.parpadeo : 1,
      r = o.radio * par,
      g = x.createRadialGradient(px, py, 0, px, py, r),
      c = PIX.hex2rgb(o.color || '#ffcc66'),
      f = o.fuerza === undefined ? 0.6 : o.fuerza;
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${f})`);
    g.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${f * 0.35})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = g;
    x.fillRect(px - r, py - r, r * 2, r * 2);
    x.restore();
  };
  /** Luces guardadas por el usuario (Biblioteca → Luces). */
  L.guardadas = () => Object.values((CK.P && CK.P.luces) || {});
  L.guardar = async (o, nombre) => {
    nombre = nombre || (await CK.pedir('Guardar luz', 'Nombre', 'Mi luz'));
    if (!nombre) return null;
    CK.P.luces = CK.P.luces || {};
    let id = CK.slug ? CK.slug(nombre) : nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    while (CK.P.luces[id]) id += '_';
    const f = CK.hist.datos('Guardar luz', 'luces', id);
    CK.P.luces[id] = { id, nombre, p: L.props(o), creado: Date.now() };
    f();
    CK.emit('luces');
    CK.emit('assets');
    CK.aviso('Luz guardada: ' + nombre + '. La encontrás en la Biblioteca y al colocar luces.', 'ok');
    return CK.P.luces[id];
  };

  /** Elegidor con dibujos: [[valor, nombre, svg]] */
  const conDib = (valor, ops, on) =>
    h(
      'div.con-dibujos',
      ops.map(([v, txt, svg]) => {
        const b = h('button.con-dib' + (v === valor ? '.activo' : ''), {
          type: 'button',
          html:
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            svg +
            '</svg>',
          onclick: () => on(v)
        });
        CK.tip(b, txt);
        return b;
      })
    );

  /** Grilla de tipos de luz (de fábrica y guardadas). al(p, nombre) al elegir. */
  L.grilla = (al, o = {}) => {
    const g = h('div.luz-grilla');
    const tarjeta = (p, nombre, extra) => {
      const t = h(
        'button.luz-tarjeta',
        { type: 'button', onclick: () => al(CK.clone(p), nombre) },
        L.mini(p, o.tam || 46),
        h('span', nombre),
        extra || null
      );
      CK.tip(t, nombre, 'Clic para usar esta luz.');
      return t;
    };
    const tuyas = L.guardadas();
    if (tuyas.length) {
      g.append(h('div.luz-sub', 'Tus luces'));
      tuyas.forEach(s => g.append(tarjeta(s.p, s.nombre)));
      g.append(h('div.luz-sub', 'De fábrica'));
    }
    L.PRESETS.forEach(s => g.append(tarjeta(s.p, s.nombre)));
    return g;
  };

  /**
   * Panel de edición de una o varias luces del mapa.
   * o = { objs, mapa (id), pedir(), refrescar(), bucle() }
   */
  L.panel = ({ objs, mapa, pedir, refrescar, bucle, sinGuardar }) => {
    const o = objs[0];
    let pend = null;
    const tocar = (nombre, fn, final = true) => {
      if (!pend && mapa) pend = CK.hist.datos('Luz: ' + nombre, 'mapas', mapa);
      objs.forEach(x => {
        // al tocar algo nuevo, una luz vieja pasa a ser "nueva" (forma redonda), que se ve casi igual
        if (!x.forma && !['color', 'radio', 'fuerza', 'parpadeo'].includes(nombre)) x.forma = 'punto';
        fn(x);
      });
      if (bucle) bucle();
      pedir();
      if (final) {
        if (pend) pend();
        pend = null;
        if (mapa) CK.tocar();
      }
    };
    const val = k => (o[k] === undefined ? (k === 'dir' && (o.forma === 'area' || o.forma === 'linea') ? 0 : LUZ.D[k]) : o[k]);
    const rango = (rot, k, opts, ayuda, conv) =>
      CK.campo(
        rot,
        CK.rango(conv ? conv.a(val(k)) : val(k), opts, (v, f) =>
          tocar(
            k,
            x => {
              x[k] = conv ? conv.de(v) : v;
            },
            f
          )
        ),
        ayuda
      );
    const forma = o.forma || 'punto';
    const tipos = h(
      'div.bloque',
      h('h3.bloque-tit', 'Tipo de luz'),
      L.grilla((p, nombre) => {
        tocar('Tipo ' + nombre, x => L.aplicar(x, p));
        refrescar();
      }),
      h('p.nota-txt', 'Elegí una para empezar y después ajustala abajo. Lo que armes lo podés guardar como luz tuya.')
    );
    const principal = h(
      'div.bloque',
      h('h3.bloque-tit', 'Luz'),
      CK.campo(
        'Forma',
        conDib(forma, L.FORMAS, v => {
          tocar('Forma', x => {
            x.forma = v;
          });
          refrescar();
        })
      ),
      CK.campo(
        'Color',
        CK.color(val('color'), v => tocar('color', x => (x.color = v)))
      ),
      rango('Alcance', 'radio', { min: 4, max: 400, comun: 48 }, 'Hasta dónde llega la luz, en píxeles del juego.'),
      rango('Intensidad', 'fuerza', { min: 5, max: 100, comun: 55 }, null, { a: v => Math.round(v * 100), de: v => v / 100 }),
      rango('Suavizado', 'suave', { min: 2, max: 100, comun: 60 }, 'Poco = borde marcado. Mucho = se desvanece de a poco.')
    );
    // lo que depende de la forma
    if (forma === 'foco' || forma === 'sol' || forma === 'area' || forma === 'linea')
      principal.append(
        CK.campo(
          'Dirección',
          h(
            'div.fila',
            dial(val('dir'), (v, f) => {
              tocar('dir', x => (x.dir = v), f);
              if (f) refrescar();
            }),
            CK.rango(val('dir'), { min: 0, max: 359 }, (v, f) => tocar('dir', x => (x.dir = v), f))
          ),
          forma === 'area' || forma === 'linea' ? 'Gira la forma.' : 'Hacia dónde apunta (0 = derecha, 90 = abajo).'
        )
      );
    if (forma === 'foco')
      principal.append(rango('Apertura', 'apertura', { min: 4, max: 300, comun: 50 }, 'Qué tan abierto es el cono, en grados.'));
    if (forma === 'sol')
      principal.append(
        rango('Ancho del haz', 'ancho', { min: 2, max: 200, comun: 24 }),
        rango('Se abre', 'apertura', { min: 0, max: 90, comun: 16 }, 'Cuánto se ensancha el haz a medida que se aleja.')
      );
    if (forma === 'area')
      principal.append(h('div.duo', rango('Ancho', 'ancho', { min: 1, max: 400 }), rango('Alto', 'alto', { min: 1, max: 400 })));
    if (forma === 'linea') principal.append(rango('Largo', 'ancho', { min: 2, max: 600, comun: 40 }));
    if (forma === 'anillo') principal.append(rango('Grosor del anillo', 'grosor', { min: 5, max: 100, comun: 30 }));
    const mov = h(
      'div.bloque',
      h('h3.bloque-tit', 'Movimiento'),
      rango('Parpadeo', 'parpadeo', { min: 0, max: 4, step: 0.5 }, '0 = fija. Más alto = titila como una llama.'),
      rango('Pulso', 'pulso', { min: 0, max: 4, step: 0.5 }, 'Respira despacio (magia, cristales, lava).')
    );
    const c2 = h(
      'div.fila',
      CK.chk(!!o.color2, 'Otro color en el borde', v => {
        tocar('color2', x => {
          if (v) x.color2 = x.color2 || '#ff6a2a';
          else delete x.color2;
        });
        refrescar();
      }),
      o.color2 ? CK.color(o.color2, v => tocar('color2', x => (x.color2 = v))) : null
    );
    const fino = CK.masOpciones(
      'Ajuste fino',
      c2,
      rango('Centro brillante', 'nucleo', { min: 0, max: 90 }, 'Agranda la parte de adentro que brilla a pleno.'),
      rango('Escalones (pixel)', 'escalones', { min: 0, max: 8 }, '0 = degradé continuo. 2 a 5 = luz en escalones, al estilo pixel art.'),
      CK.campo(
        'Mezcla',
        CK.sel(
          val('modo'),
          [
            ['suma', 'Fuerte (suma luz)'],
            ['suave', 'Suave (no quema los claros)']
          ],
          v => tocar('modo', x => (x.modo = v))
        )
      ),
      CK.chk(!!o.encima, 'Por encima de los objetos (brillo de la llama, no el piso)', v =>
        tocar('encima', x => {
          if (v) x.encima = true;
          else delete x.encima;
        })
      ),
      CK.chk(o.sigue === 'heroe', 'Sigue al héroe (en el juego y al caminar en el editor)', v => {
        tocar('sigue', x => {
          if (v) x.sigue = 'heroe';
          else {
            delete x.sigue;
            delete x.mira;
          }
        });
        refrescar();
      }),
      o.sigue === 'heroe' && forma === 'foco'
        ? CK.chk(!!o.mira, 'Apunta hacia donde camina', v =>
            tocar('mira', x => {
              if (v) x.mira = true;
              else delete x.mira;
            })
          )
        : null
    );
    const acc = h(
      'div.bloque',
      h(
        'div.fila',
        CK.btn({
          ico: 'guardar',
          txt: 'Guardar como luz mía',
          cls: 'chico',
          desc: 'La guarda en la Biblioteca (Luces) para volver a usarla en cualquier mapa.',
          on: async () => {
            await L.guardar(o);
            refrescar();
          }
        })
      )
    );
    return h('div', tipos, principal, mov, h('div.bloque', fino), sinGuardar ? null : acc);
  };
  /** Ventana para cambiar una luz guardada: vista previa animada sobre un piso, Guardar cambios o Guardar como nueva. */
  L.ventanaEditar = async id => {
    const s = CK.P.luces[id];
    if (!s) return;
    const tmp = Object.assign({ x: 0, y: 0 }, CK.clone(s.p));
    if (!tmp.forma) tmp.forma = 'punto';
    const W = 300,
      cv = CK.lienzo(W, 220);
    cv.className = 'luz-previa';
    let vivo = true;
    const pintar = now => {
      if (!vivo) return;
      CK.raf(pintar);
      const x = CK.ctx(cv);
      x.fillStyle = '#2b3326';
      x.fillRect(0, 0, W, 220);
      x.fillStyle = '#26301f';
      for (let i = 0; i < W; i += 16) for (let j = (i / 16) % 2 ? 0 : 16; j < 220; j += 32) x.fillRect(i, j, 16, 16);
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = 'rgba(32,38,74,.55)';
      x.fillRect(0, 0, W, 220);
      x.restore();
      L.dibujar(x, tmp, now, W / 2, 110);
    };
    CK.raf(pintar);
    const cont = h('div.luz-panel-ventana');
    const armar = () => cont.replaceChildren(L.panel({ objs: [tmp], mapa: null, pedir: () => {}, refrescar: armar, sinGuardar: true }));
    armar();
    const r = await CK.ventana({
      titulo: 'Modificar luz: ' + s.nombre,
      ancho: 720,
      cuerpo: h(
        'div.luz-editar',
        h('div', cv, h('p.nota-txt', 'Así se ve sobre pasto, de noche (en el juego cambia según el mapa).')),
        cont
      ),
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Guardar como nueva', valor: 'nueva' },
        { txt: 'Guardar cambios', cls: 'pri', valor: 'guardar' }
      ]
    });
    vivo = false;
    if (!r) return;
    if (r === 'guardar') {
      const f = CK.hist.datos('Modificar luz', 'luces', id);
      s.p = L.props(tmp);
      s.modificado = Date.now();
      f();
      CK.emit('assets');
      CK.aviso('Luz guardada: ' + s.nombre, 'ok');
    } else {
      const nm = await CK.pedir('Guardar como nueva', 'Nombre', s.nombre + ' (nueva)');
      if (!nm) return;
      const n = await L.guardar(tmp, nm);
      if (n && CK.biblioteca) CK.biblioteca.elegir('luces', n.id);
    }
  };
  /** Ruedita para elegir un ángulo arrastrando. */
  const dial = (v, on) => {
    const c = CK.lienzo(34, 34);
    c.className = 'luz-dial';
    const pintar = a => {
      const x = CK.ctx(c);
      x.clearRect(0, 0, 34, 34);
      x.strokeStyle = 'rgba(255,255,255,.35)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.arc(17, 17, 14, 0, 7);
      x.stroke();
      x.strokeStyle = '#e8b83a';
      x.lineWidth = 2.5;
      x.beginPath();
      x.moveTo(17, 17);
      x.lineTo(17 + Math.cos((a * Math.PI) / 180) * 13, 17 + Math.sin((a * Math.PI) / 180) * 13);
      x.stroke();
    };
    pintar(v);
    const ang = e => {
      const r = c.getBoundingClientRect();
      return (Math.round((Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI) + 360) % 360;
    };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      const a = ang(e);
      pintar(a);
      on(a, false);
      const mv = ev => {
        const b = ang(ev);
        pintar(b);
        on(b, false);
      };
      const up = ev => {
        c.removeEventListener('pointermove', mv);
        c.removeEventListener('pointerup', up);
        on(ang(ev), true);
      };
      c.addEventListener('pointermove', mv);
      c.addEventListener('pointerup', up);
    });
    return c;
  };
})();
