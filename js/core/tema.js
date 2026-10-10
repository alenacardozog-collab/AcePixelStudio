/* TEMA: dos estilos de interfaz que se eligen con el botón del pincel en la barra de arriba.
   - "Profesional": el de siempre (gris neutro, oro para lo activo).
   - "Taller medieval": madera y pergamino, letra con carácter, botones más grandes, ayudas resumidas.
   Aparte, los cursores del taller: dibujados en pixel art (guantelete, pluma, goma, balde, gotero, mira…), con uno
   distinto según la herramienta. Lo elegido se recuerda en este navegador. Los estilos están en css/tema_taller.css. */
'use strict';
(function () {
  const CLAVE = 'ck_tema_v1';
  const T = (CK.temaUI = {});
  let cfg = { tema: 'pro', cursores: false, ayudasCortas: false };
  try {
    Object.assign(cfg, JSON.parse(localStorage.getItem(CLAVE) || '{}'));
  } catch (e) {}
  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(cfg));
    } catch (e) {}
  };

  // ---------------------------------------------------------------- cursores en pixel art (16 × 16, se ven a 32 px)
  // k contorno · S acero · m acero en sombra · w pergamino · g oro · G oro oscuro · b madera · r rojo
  const COL = { k: '#1a110a', S: '#dfe3e8', m: '#8d98a6', w: '#f6ecd4', g: '#e6b247', G: '#9b6a1c', b: '#8a5a33', r: '#c0463a' };
  const DIB = {
    flecha: [
      [0, 0],
      'k',
      'kk',
      'kSk',
      'kSSk',
      'kSSSk',
      'kSSSSk',
      'kSSSSSk',
      'kSSSSSmk',
      'kSSSSSSmk',
      'kSSSSkkkkk',
      'kSSkSmk',
      'kSk.kSmk',
      'kk..kSmk',
      'k....kSmk',
      '.....kSmk',
      '......kk'
    ],
    senala: [
      [5, 0],
      '.....kk',
      '....kSSk',
      '....kSmk',
      '....kSmk',
      '....kSmkkk',
      '....kSmkSmkk',
      '..kkkSmkSmkSkk',
      '.kSSkSmkSmkSmSk',
      '.kSmkSSSSSSSSmk',
      '.kSmSSSSSSSSSmk',
      '..kSSSSSSSSSSmk',
      '..kmSSSSSSSSmk',
      '...kmSSSSSSSmk',
      '....kggggggggk',
      '....kGGGGGGGGk',
      '....kkkkkkkkkk'
    ],
    mano: [
      [8, 8],
      '......kk',
      '...kk.kSk.kk',
      '..kSk.kSk.kSk',
      '..kSk.kSk.kSk.kk',
      '..kSk.kSk.kSkkSk',
      '..kSmkkSmkkSmkSk',
      '..kSSSSSSSSSSkSk',
      '.kk.kSSSSSSSSSSk',
      'kSSkkSSSSSSSSSmk',
      'kSmSSSSSSSSSSSmk',
      '.kSSSSSSSSSSSmk',
      '..kmSSSSSSSSSmk',
      '...kmSSSSSSSmk',
      '....kggggggggk',
      '....kGGGGGGGGk',
      '....kkkkkkkkkk'
    ],
    puno: [
      [8, 8],
      '',
      '',
      '',
      '....kk.kk.kk',
      '...kSSkSSkSSkk',
      '...kSmkSmkSmkSk',
      '..kkSSSSSSSSkSk',
      '.kSSkSSSSSSSSSk',
      '.kSmSSSSSSSSSmk',
      '..kSSSSSSSSSSmk',
      '..kmSSSSSSSSSmk',
      '...kmSSSSSSSmk',
      '....kggggggggk',
      '....kGGGGGGGGk',
      '....kkkkkkkkkk'
    ],
    pluma: [
      [0, 15],
      '...........kkkk',
      '..........kwwwwk',
      '.........kwwwwwk',
      '........kwwwwwk',
      '.......kwwwwwwk',
      '......kwwwwwwk',
      '.....kwwwwwwk',
      '....kwwwwwwk',
      '...kwwbwwwk',
      '...kwbwwwk',
      '..kwbwwkk',
      '..kbwkk',
      '.kbkk',
      '.kgk',
      'kGk',
      'kk'
    ],
    goma: [
      [3, 12],
      '',
      '........kkkk',
      '.......krrrrk',
      '......krrrrrrk',
      '.....krrrrrrrrk',
      '....kwkrrrrrrrk',
      '...kwwwkrrrrrk',
      '..kwwwwwkrrrk',
      '.kwwwwwwwkrk',
      '.kwwwwwwwwkk',
      '..kwwwwwwwk',
      '...kwwwwwk',
      '....kwwwk',
      '.....kkk'
    ],
    balde: [
      [2, 14],
      '',
      '.....kkkkk',
      '....k.....k',
      '...k.kkkkk.k',
      '...kkgggggkk',
      '...kSgggggSkk',
      '..kmSSSSSSSmk',
      '..kmSSSSSSSmk',
      '..kmmSSSSSmmk',
      '...kmSSSSSmk',
      '...kmSSSSSmk',
      '....kmmmmmk',
      '.....kkkkk',
      '..k',
      '.kgk',
      '..k'
    ],
    gotero: [
      [1, 14],
      '............kk',
      '...........krrk',
      '..........krrrrk',
      '.........kkrrrrk',
      '........kSkkrrk',
      '.......kSSSkkk',
      '......kSSSSk',
      '.....kwSSSk',
      '....kwwSSk',
      '...kwwwSk',
      '..kwwwwk',
      '..kwwwk',
      '.kwwwk',
      '.kwkk',
      '.kk'
    ],
    mira: [
      [7, 6],
      '......kkk',
      '......kwk',
      '....kkkwkkk',
      '...kgk.w.kgk',
      '..kgk..w..kgk',
      'kkk....k....kkk',
      'kwwwwwk.kwwwwwk',
      'kkk....k....kkk',
      '..kgk..w..kgk',
      '...kgk.w.kgk',
      '....kkkwkkk',
      '......kwk',
      '......kkk'
    ],
    mover: [
      [7, 7],
      '.......k',
      '......kwk',
      '.....kwwwk',
      '....kkkwkkk',
      '......kwk',
      '...k..kwk..k',
      '..kk..kwk..kk',
      '.kwkkkkwkkkkwk',
      'kwwwwwwwwwwwwwk',
      '.kwkkkkwkkkkwk',
      '..kk..kwk..kk',
      '...k..kwk..k',
      '......kwk',
      '....kkkwkkk',
      '.....kwwwk',
      '......kwk'
    ]
  };
  const URL = {};
  const dibujar = (filas, x2) => {
    const c = document.createElement('canvas');
    c.width = c.height = 16 * x2;
    const x = c.getContext('2d');
    filas.forEach((f, j) =>
      [...f].forEach((ch, i) => {
        if (!COL[ch]) return;
        x.fillStyle = COL[ch];
        x.fillRect(i * x2, j * x2, x2, x2);
      })
    );
    return c.toDataURL('image/png');
  };
  Object.keys(DIB).forEach(k => {
    const [hot, ...filas] = DIB[k];
    URL[k] = 'url("' + dibujar(filas, 2) + '") ' + hot[0] * 2 + ' ' + hot[1] * 2;
  });
  T.dibujos = DIB;
  // las variables de cursor van en un <style> propio (así las copian también las ventanas de otra pantalla)
  const estilo = document.createElement('style');
  estilo.id = 'ck-cursores';
  estilo.textContent =
    ':root{' +
    Object.keys(URL)
      .map(
        k =>
          '--cur-' +
          k +
          ':' +
          URL[k] +
          ',' +
          ({ flecha: 'default', senala: 'pointer', mano: 'grab', puno: 'grabbing', mover: 'move' }[k] || 'crosshair')
      )
      .join(';') +
    '}';
  document.head.append(estilo);

  /** Herramienta en uso (la ponen Pixel art y Mapa), para elegir el cursor sobre el lienzo. */
  CK.herrActual = null;
  const PORHERR = {
    lapiz: 'pluma',
    pincel: 'pluma',
    linea: 'pluma',
    zona: 'pluma',
    borrador: 'goma',
    goma: 'goma',
    balde: 'balde',
    'balde-zona': 'balde',
    gotero: 'gotero',
    cuentagotas: 'gotero'
  };
  /** Traduce un cursor estándar al del taller cuando está prendido. Uso: el.style.cursor = CK.cur('crosshair'). */
  CK.cur = (nombre, herr = CK.herrActual) => {
    if (!cfg.cursores || !nombre) return nombre;
    if (nombre === 'crosshair') return 'var(--cur-' + (PORHERR[herr] || 'mira') + ')';
    const k = { default: 'flecha', pointer: 'senala', grab: 'mano', grabbing: 'puno', move: 'mover' }[nombre];
    return k ? 'var(--cur-' + k + ')' : nombre;
  };

  // ---------------------------------------------------------------- aplicar
  const clases = () => ({
    'tema-taller': cfg.tema === 'taller',
    'cursores-taller': !!cfg.cursores,
    'ayudas-cortas': !!cfg.ayudasCortas
  });
  T.aplicar = (D = document) => {
    if (!D.body) return;
    const c = clases();
    Object.keys(c).forEach(k => D.body.classList.toggle(k, c[k]));
  };
  const aplicarTodo = () => {
    T.aplicar(document);
    (CK._externas || new Set()).forEach(w => {
      try {
        if (!w.closed) T.aplicar(w.document);
      } catch (e) {}
    });
    // los lienzos recalculan medidas (los botones cambian de tamaño)
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
    CK.emit && CK.emit('tema');
  };
  if (document.body) T.aplicar();
  else document.addEventListener('DOMContentLoaded', () => T.aplicar());
  T.cfg = () => Object.assign({}, cfg);
  T.poner = (o = {}) => {
    if (o.tema && o.tema !== cfg.tema) {
      // cada estilo trae sus cursores y ayudas; después se pueden cambiar a mano
      cfg.cursores = o.tema === 'taller';
      cfg.ayudasCortas = o.tema === 'taller';
    }
    Object.assign(cfg, o);
    guardar();
    aplicarTodo();
  };
  /** Menú del botón de la barra. */
  T.menu = e =>
    CK.menu(e, [
      { titulo: 'Estilo de la interfaz' },
      {
        txt: 'Profesional',
        ico: cfg.tema === 'pro' ? 'ok' : 'nada',
        activo: cfg.tema === 'pro',
        on: () => T.poner({ tema: 'pro' })
      },
      {
        txt: 'Taller medieval',
        ico: cfg.tema === 'taller' ? 'ok' : 'nada',
        activo: cfg.tema === 'taller',
        on: () => T.poner({ tema: 'taller' })
      },
      '-',
      { txt: 'Cursores del taller', ico: cfg.cursores ? 'ok' : 'nada', on: () => T.poner({ cursores: !cfg.cursores }) },
      { txt: 'Ayudas resumidas', ico: cfg.ayudasCortas ? 'ok' : 'nada', on: () => T.poner({ ayudasCortas: !cfg.ayudasCortas }) }
    ]);
  CK.iconos.tema = '<path d="M14.5 4.5l5 5-8.5 8.5H6v-5z"/><path d="M12.5 6.5l5 5"/><path d="M3 21c1.500-.5 3-1.500 3-3"/>';
  CK.iconos.nada = '<path d="M0 0"/>';
})();
