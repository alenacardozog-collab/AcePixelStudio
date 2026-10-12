/* PREFERENCIAS DE LA INTERFAZ (botón de los controles deslizantes en la barra de arriba). Se recuerdan en este navegador.
   - Modo simple / completo: en el simple, cada sección muestra lo esencial y lo avanzado queda en "Más opciones"
     (lo marcado con CK.masOpciones(...) o con la clase .avanzado).
   - Tamaño de la interfaz: 90 %, 100 %, 110 %, 125 % o 140 % (agranda o achica todo, también los lienzos).
   - Cursores elegantes: dibujados a mano en vector (línea fina, sombra suave, un toque dorado), uno por herramienta.
   El estilo "Taller medieval" se quitó: css/tema_taller.css quedó vacío y ya no se carga. */
'use strict';
(function () {
  const CLAVE = 'ck_interfaz_v2';
  const T = (CK.temaUI = {});
  let cfg = { simple: false, tam: 1, cursores: true };
  try {
    Object.assign(cfg, JSON.parse(localStorage.getItem(CLAVE) || '{}'));
    if (!(cfg.tam >= 0.8 && cfg.tam <= 1.5)) cfg.tam = 1; // un tamaño raro guardado no deja la interfaz inusable
    localStorage.removeItem('ck_tema_v1'); // el estilo Taller ya no existe
  } catch (e) {}
  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(cfg));
    } catch (e) {}
  };

  // ---------------------------------------------------------------- cursores (SVG de 32 × 32, se pasan a PNG 1x y 2x)
  // contorno oscuro grueso + relleno claro encima = se ven sobre cualquier fondo; sombra suave; detalle en oro
  const OSC = '#121417',
    CLA = '#f4f2ee',
    MED = '#b9bec6',
    ORO = '#e8b83a',
    ORO2 = '#a87a14';
  const sombra =
    '<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0.8" dy="1.4" stdDeviation="1.1" flood-color="#000" flood-opacity=".45"/></filter></defs>';
  const svg = cuerpo =>
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    sombra +
    '<g filter="url(#s)">' +
    cuerpo +
    '</g></svg>';
  /** Un trazo con contorno: primero oscuro y grueso, después claro y fino. */
  const trazo = (d, ancho, color = CLA, extra = '') =>
    `<path d="${d}" fill="none" stroke="${OSC}" stroke-width="${ancho + 2.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const forma = (d, color = CLA) =>
    `<path d="${d}" fill="${color}" stroke="${OSC}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  const DIB = {
    // flecha clásica, con un filo dorado del lado izquierdo
    flecha: [
      [3, 2],
      svg(
        forma('M3.5 2.5 L3.5 23 L8.6 18.4 L12.2 26.4 L15.6 24.9 L12.1 17 L19 17 Z') +
          '<path d="M5 6 L5 19.5" stroke="' +
          ORO +
          '" stroke-width="1.6" stroke-linecap="round"/>'
      )
    ],
    // mano que señala (botones y enlaces)
    senala: [
      [11, 3],
      svg(
        forma(
          'M9.6 4.2c0-1.2 1-2.1 2.1-2.1s2.1.9 2.1 2.1v8.1c.4-.6 1.1-1 1.9-1 1 0 1.8.6 2.1 1.4.4-.5 1-.8 1.8-.8 1 0 1.8.7 2.1 1.6.4-.3.9-.5 1.4-.5 1.3 0 2.2 1 2.2 2.3v5.6c0 4.4-3.1 7.4-7.4 7.4h-1.6c-2.6 0-4.4-1-5.8-3l-4.3-6.1c-.7-1-.5-2.3.5-3 .9-.6 2.1-.4 2.8.4l1.8 2.1z'
        ) +
          '<path d="M13.8 13.6v4.2M17.8 14.2v3.6M21.3 15.2v2.8" stroke="' +
          MED +
          '" stroke-width="1.2" stroke-linecap="round"/><path d="M11 29.2h9" stroke="' +
          ORO +
          '" stroke-width="1.8" stroke-linecap="round"/>'
      )
    ],
    // mano abierta (se puede agarrar)
    mano: [
      [16, 15],
      svg(
        forma(
          'M8.4 14.6V8.6c0-1.1.9-2 2-2s2 .9 2 2v4.6V5.8c0-1.1.9-2 2-2s2 .9 2 2v7.4V6.6c0-1.1.9-2 2-2s2 .9 2 2v7.2-4.4c0-1.1.9-2 2-2s2 .9 2 2v10.8c0 4.6-3.3 8-7.8 8h-1.4c-2.5 0-4.3-.9-5.8-2.8l-4.6-5.8c-.7-.9-.6-2.2.3-2.9.9-.7 2.1-.6 2.9.2z'
        ) +
          '<path d="M12 28.8h8" stroke="' +
          ORO +
          '" stroke-width="1.8" stroke-linecap="round"/>'
      )
    ],
    // puño (agarrando)
    puno: [
      [16, 16],
      svg(
        forma(
          'M8.6 15.4v-3.2c0-1.1.9-1.9 1.9-1.9s1.9.8 1.9 1.9v-1.4c0-1.1.9-1.9 1.9-1.9s1.9.8 1.9 1.9v.4c0-1.1.9-1.9 1.9-1.9s1.9.8 1.9 1.9v.6c.3-.8 1.1-1.3 1.9-1.3 1.1 0 2 .9 2 2v6.6c0 4.6-3.3 8-7.8 8h-1.4c-2.6 0-4.4-1-5.9-3l-1.9-2.7c-.8-1.1-.4-2.5.6-3.1z'
        ) +
          '<path d="M12.4 12v2.6M16.2 11.4v3M20 12v2.6" stroke="' +
          MED +
          '" stroke-width="1.2" stroke-linecap="round"/><path d="M12.4 28.6h7.4" stroke="' +
          ORO +
          '" stroke-width="1.8" stroke-linecap="round"/>'
      )
    ],
    // lápiz fino: cuerpo claro, virola dorada, punta oscura (la punta es el punto exacto)
    lapiz: [
      [3, 29],
      svg(
        '<g transform="rotate(45 16 16)">' +
          forma('M13.4 2.5h5.2v19.4h-5.2z') +
          forma('M13.4 2.5h5.2v3.4h-5.2z', '#e9a4a0') +
          forma('M13.4 5.9h5.2v2.4h-5.2z', ORO) +
          forma('M13.4 21.9h5.2L16 29.6z', '#d9c39a') +
          '<path d="M15 27.2 16 29.6 17 27.2z" fill="' +
          OSC +
          '"/><path d="M15.9 9v12" stroke="' +
          MED +
          '" stroke-width="1"/></g>'
      )
    ],
    // goma de borrar inclinada, dos tonos
    goma: [
      [8, 25],
      svg(
        '<g transform="rotate(-40 16 16)">' +
          forma('M6.5 11.5h19a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z') +
          forma('M15.5 11.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10z', '#e9a4a0') +
          '<path d="M15.5 11.5v10" stroke="' +
          ORO +
          '" stroke-width="1.6"/></g>'
      )
    ],
    // balde volcando una gota dorada (la gota es el punto exacto)
    balde: [
      [6, 27],
      svg(
        '<g transform="rotate(-28 18 13)">' +
          forma('M10 8.5h16l-2 14.5a2.4 2.4 0 0 1-2.4 2h-7.2a2.4 2.4 0 0 1-2.4-2z') +
          '<path d="M10 8.5q8 3 16 0" fill="' +
          ORO +
          '" stroke="' +
          OSC +
          '" stroke-width="1.4"/>' +
          trazo('M11.5 7.5q6.5-7 13 0', 1.4, MED) +
          '</g>' +
          forma('M6 21.2c1.6 2.2 2.6 3.6 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.2 1-2.6 2.6-4.8z', ORO)
      )
    ],
    // gotero con bulbo dorado (la punta es el punto exacto)
    gotero: [
      [3, 29],
      svg(
        '<g transform="rotate(45 16 16)">' +
          forma('M12.6 2.8a3.4 3.4 0 0 1 6.8 0v5.4h-6.8z', ORO) +
          forma('M11.4 8.2h9.2v2.6h-9.2z', MED) +
          forma('M13.4 10.8h5.2v13.4L16 29.4l-2.6-5.2z') +
          '<path d="M14.7 17.6h2.6v6.2L16 26.6l-1.3-2.8z" fill="' +
          ORO +
          '" opacity=".75"/></g>'
      )
    ],
    // mira de precisión: círculo fino, cruz con hueco y punto dorado en el centro
    mira: [
      [16, 16],
      svg(
        '<circle cx="16" cy="16" r="8.2" fill="none" stroke="' +
          OSC +
          '" stroke-width="3.6"/><circle cx="16" cy="16" r="8.2" fill="none" stroke="' +
          CLA +
          '" stroke-width="1.4"/>' +
          trazo('M16 2.5v7M16 22.5v7M2.5 16h7M22.5 16h7', 1.4) +
          '<circle cx="16" cy="16" r="2" fill="' +
          ORO +
          '" stroke="' +
          OSC +
          '" stroke-width="1.2"/>'
      )
    ],
    // mover: cuatro flechas finas y centro dorado
    mover: [
      [16, 16],
      svg(
        trazo('M16 4v24M4 16h24', 1.6) +
          trazo('M12.6 7.4 16 4l3.4 3.4M12.6 24.6 16 28l3.4-3.4M7.4 12.6 4 16l3.4 3.4M24.6 12.6 28 16l-3.4 3.4', 1.6) +
          '<circle cx="16" cy="16" r="2.4" fill="' +
          ORO +
          '" stroke="' +
          OSC +
          '" stroke-width="1.2"/>'
      )
    ]
  };
  T.dibujos = DIB;
  const PNG = {};
  const FALLBACK = { flecha: 'default', senala: 'pointer', mano: 'grab', puno: 'grabbing', mover: 'move' };
  const estilo = document.createElement('style');
  estilo.id = 'ck-cursores';
  document.head.append(estilo);
  const escribirEstilo = () => {
    estilo.textContent =
      ':root{' +
      Object.keys(DIB)
        .map(k => {
          const [hx, hy] = DIB[k][0],
            fb = FALLBACK[k] || 'crosshair',
            p = PNG[k];
          const img = p
            ? 'image-set(url("' + p[0] + '") 1x, url("' + p[1] + '") 2x) ' + hx + ' ' + hy
            : 'url("data:image/svg+xml,' + encodeURIComponent(DIB[k][1]) + '") ' + hx + ' ' + hy;
          return '--cur-' + k + ':' + img + ',' + fb;
        })
        .join(';') +
      '}';
  };
  escribirEstilo();
  // pasar cada SVG a PNG nítido (1x y 2x): queda mejor en pantallas de alta resolución
  const aPng = (texto, esc) =>
    new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 32 * esc;
        c.getContext('2d').drawImage(im, 0, 0, 32 * esc, 32 * esc);
        try {
          res(c.toDataURL('image/png'));
        } catch (e) {
          res(null);
        }
      };
      im.onerror = () => res(null);
      im.src = 'data:image/svg+xml,' + encodeURIComponent(texto);
    });
  Promise.all(
    Object.keys(DIB).map(async k => {
      const a = await aPng(DIB[k][1], 1),
        b = await aPng(DIB[k][1], 2);
      if (a && b) PNG[k] = [a, b];
    })
  ).then(escribirEstilo);

  /** Herramienta en uso, para elegir el cursor sobre el lienzo. */
  CK.herrActual = null;
  const PORHERR = {
    lapiz: 'lapiz',
    pincel: 'lapiz',
    linea: 'lapiz',
    zona: 'lapiz',
    borrador: 'goma',
    goma: 'goma',
    balde: 'balde',
    'balde-zona': 'balde',
    gotero: 'gotero',
    cuentagotas: 'gotero'
  };
  /** Traduce un cursor estándar al elegante cuando está prendido. Uso: el.style.cursor = CK.cur('crosshair', herramienta). */
  CK.cur = (nombre, herr = CK.herrActual) => {
    if (!cfg.cursores || !nombre) return nombre;
    if (nombre === 'crosshair') return 'var(--cur-' + (PORHERR[herr] || 'mira') + ')';
    const k = { default: 'flecha', pointer: 'senala', grab: 'mano', grabbing: 'puno', move: 'mover' }[nombre];
    return k ? 'var(--cur-' + k + ')' : nombre;
  };

  // ---------------------------------------------------------------- aplicar
  T.aplicar = (D = document) => {
    if (!D.body) return;
    D.body.classList.toggle('modo-simple', !!cfg.simple);
    D.body.classList.toggle('cursores-lindos', !!cfg.cursores);
    D.body.classList.remove('tema-taller', 'cursores-taller', 'ayudas-cortas');
    D.documentElement.style.zoom = cfg.tam && cfg.tam !== 1 ? String(cfg.tam) : '';
    // con otro tamaño queda siempre a mano un botoncito para volver a 100 % (por si el menú quedó fuera de la pantalla)
    let chip = D.getElementById('tam-volver');
    if (cfg.tam && cfg.tam !== 1) {
      if (!chip) {
        chip = D.createElement('button');
        chip.id = 'tam-volver';
        chip.type = 'button';
        chip.onclick = () => T.poner({ tam: 1 });
        D.body.append(chip);
      }
      chip.textContent = 'Tamaño ' + Math.round(cfg.tam * 100) + ' % · volver a 100 %  (Ctrl + Alt + 0)';
    } else if (chip) chip.remove();
  };
  // Ctrl + Alt + 0: tamaño normal de la interfaz, siempre
  document.addEventListener(
    'keydown',
    e => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
        e.preventDefault();
        e.stopPropagation();
        T.poner({ tam: 1 });
      }
    },
    true
  );
  const aplicarTodo = () => {
    T.aplicar(document);
    (CK._externas || new Set()).forEach(w => {
      try {
        if (!w.closed) T.aplicar(w.document);
      } catch (e) {}
    });
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      (CK._vistas || []).forEach(v => v.c.isConnected && v.medir());
    }, 30);
    if (CK.emit) CK.emit('interfaz');
  };
  if (document.body) T.aplicar();
  else document.addEventListener('DOMContentLoaded', () => T.aplicar());
  T.cfg = () => Object.assign({}, cfg);
  T.simple = () => !!cfg.simple;
  T.poner = (o = {}) => {
    Object.assign(cfg, o);
    guardar();
    aplicarTodo();
  };
  const marca = si => (si ? 'ok' : 'nada');
  /** Menú del botón de la barra. */
  T.menu = e =>
    CK.menu(e, [
      { titulo: 'Interfaz' },
      {
        txt: 'Modo simple',
        ico: marca(cfg.simple),
        on: () => T.poner({ simple: true })
      },
      {
        txt: 'Modo completo',
        ico: marca(!cfg.simple),
        on: () => T.poner({ simple: false })
      },
      '-',
      {
        txt: 'Tamaño de la interfaz',
        ico: 'lupaMas',
        sub: [0.9, 1, 1.1, 1.25, 1.4].map(z => ({
          txt: Math.round(z * 100) + ' %' + (z === 1 ? ' (normal)' : ''),
          ico: marca(Math.abs((cfg.tam || 1) - z) < 0.01),
          on: () => T.poner({ tam: z })
        }))
      },
      { txt: 'Cursores elegantes', ico: marca(cfg.cursores), on: () => T.poner({ cursores: !cfg.cursores }) },
      {
        txt: 'Preguntar antes de aplicar cambios',
        ico: marca(cfg.preguntar !== false),
        on: () => {
          T.poner({ preguntar: cfg.preguntar === false });
          CK.aviso(
            cfg.preguntar === false
              ? 'Listo: los cambios se guardan solos (autoguardado cada minuto y al cerrar).'
              : 'Listo: al cambiar de pestaña te pregunto si aplicar o descartar; sin aplicar no se guarda nada.',
            'info',
            5000
          );
        }
      },
      '-',
      CK.guia
        ? { txt: 'Ver el recorrido de esta sección', ico: 'info', on: () => CK.guia.recorrido(CK.foco || CK.seccion_actual, true) }
        : null,
      CK.guia ? { txt: 'Volver a mostrar todos los recorridos', ico: 'recargar', on: () => CK.guia.reiniciar() } : null,
      '-',
      CK.errores
        ? {
            txt: 'Ver errores' + (CK.errores.lista().length ? ' (' + CK.errores.lista().length + ')' : ''),
            ico: 'alerta',
            on: () => CK.errores.ventana()
          }
        : null
    ]);

  /**
   * "Más opciones": en modo completo se ve todo como siempre; en modo simple queda plegado con un botón para abrirlo.
   * Uso: CK.masOpciones('Ajuste fino', el1, el2, …)
   */
  // Recuerda qué "Ajuste fino" quedó abierto (por sección y título), así no se cierra cuando el panel se vuelve a dibujar.
  const moAbiertos = new Set();
  CK.masOpciones = (titulo, ...hijos) => {
    const clave = (CK.seccion_actual || '') + '|' + (titulo || '');
    const cuerpo = CK.h('div.mo-cuerpo', ...hijos);
    const caja = CK.h('div.mas-opciones' + (moAbiertos.has(clave) ? '.abierto' : ''));
    const cab = CK.h(
      'button.mo-cab',
      {
        type: 'button',
        onclick: () => {
          caja.classList.toggle('abierto');
          if (caja.classList.contains('abierto')) moAbiertos.add(clave);
          else moAbiertos.delete(clave);
        }
      },
      CK.h('span', { html: CK.ico('flechaD', 13) }),
      CK.h('span', titulo || 'Más opciones')
    );
    caja.append(cab, cuerpo);
    return caja;
  };
  /**
   * Junta ciertos campos (por su rótulo) en un "Ajuste fino" al final de cont: en modo simple queda plegado,
   * en modo completo se ve igual que siempre. rotulos = textos de .campo-rot o de casillas .chk.
   */
  CK.plegar = (cont, rotulos, titulo = 'Ajuste fino') => {
    const set = new Set(rotulos);
    const els = [...cont.querySelectorAll('.campo, .chk')].filter(e => {
      const t = (e.querySelector('.campo-rot') || e.querySelector('span') || {}).textContent;
      return set.has((t || '').trim());
    });
    if (!els.length) return null;
    const mo = CK.masOpciones(titulo);
    els.forEach(e => mo.querySelector('.mo-cuerpo').append(e));
    cont.append(CK.h('div.bloque', mo));
    return mo;
  };
  CK.iconos.tema = '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>';
  CK.iconos.nada = '<path d="M0 0"/>';
})();
