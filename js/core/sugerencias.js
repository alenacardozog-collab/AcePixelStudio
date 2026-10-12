/* SUGERENCIAS AL CREAR: qué tamaño conviene para cada cosa (según el tile y el héroe del proyecto) y una vista previa
   de cómo se vería en el mapa, al lado del héroe y a tamaño real. Se usa en "Dibujo nuevo", en "Crear algo nuevo"
   (Inicio y Biblioteca), en la pestaña "Prueba" de Pixel art (en vivo, mientras dibujás) y en la Biblioteca. */
'use strict';
(function () {
  const h = CK.h;
  const SG = (CK.sugerencias = {});
  const T = () => (CK.P && CK.P.estilo.tile) || 16;
  const H = () => (CK.P && +CK.P.estilo.altoHeroe) || 30;

  /** Qué se puede crear y su tamaño sugerido (en píxeles del juego). */
  SG.tipos = () => {
    const t = T(),
      hh = H();
    return [
      {
        id: 'personaje',
        nombre: 'Personaje o NPC',
        w: Math.round(hh * 0.75),
        h: hh,
        lienzo: [32, 32],
        tipo: 'personaje',
        forma: 'persona',
        nota: 'Del mismo alto que el héroe (' + hh + ' px). Dejá aire alrededor para que respire al animar.'
      },
      {
        id: 'enemigo',
        nombre: 'Enemigo chico',
        w: Math.round(hh * 0.8),
        h: Math.round(hh * 0.75),
        lienzo: [32, 32],
        tipo: 'personaje',
        forma: 'bicho',
        nota: 'Un poco más bajo que el héroe: se lee como amenaza sin taparlo.'
      },
      {
        id: 'jefe',
        nombre: 'Enemigo grande',
        w: hh * 2,
        h: Math.round(hh * 1.8),
        lienzo: [64, 64],
        tipo: 'personaje',
        forma: 'bicho',
        nota: 'Casi el doble del héroe. Más grande cuesta animarlo y ocupa media pantalla.'
      },
      {
        id: 'chico',
        nombre: 'Objeto chico',
        w: t,
        h: t,
        lienzo: [t, t],
        tipo: 'sprite',
        forma: 'caja',
        nota: 'Un tile: cofre, roca, maceta, cartel. Llega a la rodilla o la cintura del héroe.'
      },
      {
        id: 'mediano',
        nombre: 'Objeto mediano',
        w: t * 2,
        h: t * 2,
        lienzo: [t * 2, t * 2],
        tipo: 'sprite',
        forma: 'caja',
        nota: '2 × 2 tiles: carro, pozo, fogata grande, estatua chica.'
      },
      {
        id: 'arbol',
        nombre: 'Árbol',
        w: t * 3,
        h: t * 4,
        lienzo: [t * 3, t * 4],
        tipo: 'sprite',
        forma: 'arbol',
        nota: 'Unas dos veces el alto del héroe. El tronco ocupa 1 tile: es lo que choca.'
      },
      {
        id: 'casa',
        nombre: 'Casa',
        w: t * 6,
        h: t * 6,
        lienzo: [t * 6, t * 6],
        tipo: 'sprite',
        forma: 'casa',
        nota: 'La puerta del alto del héroe más un poco (unos ' + Math.round(hh * 1.2) + ' px).'
      },
      {
        id: 'tile',
        nombre: 'Tile o textura de suelo',
        w: t,
        h: t,
        lienzo: [t, t],
        tipo: 'textura',
        forma: 'tile',
        nota: 'Exactamente ' + t + ' × ' + t + ': se repite para armar el suelo.'
      },
      {
        id: 'efecto',
        nombre: 'Efecto dibujado (fuego, chispa)',
        w: t * 2,
        h: t * 2,
        lienzo: [t * 2, t * 2],
        tipo: 'sprite',
        forma: 'fuego',
        nota: 'Para animar cuadro a cuadro. Los efectos de partículas se arman en FX.'
      },
      {
        id: 'icono',
        nombre: 'Ícono de interfaz',
        w: 16,
        h: 16,
        lienzo: [16, 16],
        tipo: 'ui',
        forma: 'icono',
        nota: '16 px en pantalla (el juego lo agranda con el resto). 32 para íconos grandes.'
      },
      {
        id: 'retrato',
        nombre: 'Retrato para diálogos',
        w: 48,
        h: 48,
        lienzo: [48, 48],
        tipo: 'ui',
        forma: 'cara',
        nota: 'Se ve en la caja de diálogo, no en el mapa.'
      }
    ];
  };

  // ---------------------------------------------------------------- héroe de referencia
  SG.heroe = () => {
    if (!CK.P) return null;
    const ref = CK.P.estilo.heroeRef && CK.P.assets[CK.P.estilo.heroeRef];
    if (ref && CK.img[ref.id]) return ref;
    return (
      Object.values(CK.P.assets).find(
        a => CK.img[a.id] && a.cuadros && /h[eé]roe|hero|caballero|knight|player|jugador/i.test(a.nombre + ' ' + a.id)
      ) || null
    );
  };
  /** Dibuja al héroe con los pies en (x, y). */
  const dibHeroe = (x, px, py, t) => {
    const a = SG.heroe();
    if (a) {
      const f = CK.asset.cuadro(a, Math.floor((t || 0) / 140) % Math.max(1, CK.asset.nCuadros(a))),
        oy = a.cuadros && a.cuadros.fh >= 90 ? 0.61 : 1;
      x.drawImage(CK.img[a.id], f.x, f.y, f.w, f.h, Math.round(px - f.w / 2), Math.round(py - f.h * oy), f.w, f.h);
      return;
    }
    // figura simple del alto del héroe del proyecto
    const k = H() / 22,
      R = (cx, cy, w, hh, c) => {
        x.fillStyle = c;
        x.fillRect(Math.round(px + cx * k), Math.round(py + cy * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(hh * k)));
      };
    R(-6, -2, 12, 3, 'rgba(0,0,0,.3)');
    R(-5, -12, 10, 9, '#3a4a66');
    R(-4, -19, 8, 7, '#93897a');
    R(-1, -22, 2, 3, '#b8483c');
    R(-4, -3, 3, 3, '#1b1420');
    R(1, -3, 3, 3, '#1b1420');
    R(-2, -16, 4, 1, '#1b1420');
  };

  // ---------------------------------------------------------------- piso (un pedazo de un mapa del proyecto)
  const fotos = {};
  SG.mapaDeFondo = () => {
    if (!CK.P) return null;
    const ms = Object.values(CK.P.mapas).filter(m => m.capas && m.w);
    return ms.find(m => m.id === CK.P.ui.mapa) || ms[0] || null;
  };
  const fotoMapa = m => {
    const k = m.id + ':' + (m.modificado || 0);
    if (!fotos[k]) {
      try {
        fotos[k] = CK.mapa.foto(m);
      } catch (e) {
        fotos[k] = null;
      }
    }
    return fotos[k];
  };
  const piso = (x, W, Hh, esc) => {
    const m = SG.mapaDeFondo(),
      f = m && fotoMapa(m),
      vw = W / esc,
      vh = Hh / esc;
    if (f) {
      const ap = CK.mapa.objetosDe(m, true).find(o => o.tipo === 'punto' && o.clase === 'aparicion');
      const cx = CK.clamp(ap ? ap.x : m.w / 2, vw / 2, Math.max(vw / 2, m.w - vw / 2)),
        cy = CK.clamp(ap ? ap.y : m.h / 2, vh / 2, Math.max(vh / 2, m.h - vh / 2));
      x.fillStyle = m.colorFondo || '#2f4a2c';
      x.fillRect(0, 0, vw, vh);
      x.drawImage(f, Math.round(cx - vw / 2), Math.round(cy - vh / 2), Math.ceil(vw), Math.ceil(vh), 0, 0, Math.ceil(vw), Math.ceil(vh));
      return m.nombre;
    }
    // sin mapas: pasto con los verdes de la paleta
    const pal = (CK.P && CK.P.estilo.paleta) || [],
      verdes = ['#2f4a2c', '#4c7a3a', '#74a84a'].filter(c => pal.includes(c)),
      vs = verdes.length ? verdes : ['#2f4a2c', '#3c5c33', '#4c7a3a'],
      t = T();
    for (let j = 0; j < vh; j += t)
      for (let i = 0; i < vw; i += t) {
        x.fillStyle = vs[((i / t) * 7 + (j / t) * 3) % 2 ? 0 : Math.min(1, vs.length - 1)];
        x.fillRect(i, j, t, t);
        x.fillStyle = vs[vs.length - 1];
        x.fillRect(i + ((i * 3 + j) % t), j + ((i + j * 5) % t), 1, 2);
      }
    return null;
  };

  // ---------------------------------------------------------------- siluetas (cuando todavía no hay dibujo)
  const silueta = (x, forma, px, py, w, hh) => {
    x.save();
    x.fillStyle = 'rgba(232,184,58,.55)';
    x.strokeStyle = '#e8b83a';
    x.lineWidth = 1;
    const L = px - w / 2,
      Tp = py - hh;
    x.beginPath();
    if (forma === 'persona' || forma === 'cara') {
      x.ellipse(px, Tp + hh * 0.18, w * 0.28, hh * 0.18, 0, 0, 7);
      x.rect(L + w * 0.18, Tp + hh * 0.34, w * 0.64, hh * 0.66);
    } else if (forma === 'bicho') {
      x.ellipse(px, py - hh * 0.45, w / 2, hh * 0.45, 0, 0, 7);
    } else if (forma === 'arbol') {
      x.ellipse(px, Tp + hh * 0.38, w / 2, hh * 0.38, 0, 0, 7);
      x.rect(px - w * 0.12, Tp + hh * 0.7, w * 0.24, hh * 0.3);
    } else if (forma === 'casa') {
      x.moveTo(L, Tp + hh * 0.4);
      x.lineTo(px, Tp);
      x.lineTo(L + w, Tp + hh * 0.4);
      x.lineTo(L + w, py);
      x.lineTo(L, py);
      x.closePath();
    } else if (forma === 'fuego') {
      x.moveTo(px, Tp);
      x.quadraticCurveTo(L + w, py - hh * 0.3, px, py);
      x.quadraticCurveTo(L, py - hh * 0.3, px, Tp);
    } else x.rect(L, Tp, w, hh);
    x.fill();
    x.restore();
    x.save();
    x.strokeStyle = 'rgba(255,255,255,.7)';
    x.setLineDash([2, 2]);
    x.lineWidth = 1;
    x.strokeRect(L + 0.5, Tp + 0.5, w - 1, hh - 1);
    x.restore();
  };

  /**
   * Dibuja la escena de prueba en el lienzo c.
   * o = { tipo (de SG.tipos), w, h, asset (id) o img + cuadro, esc, t (ms), grilla }
   */
  SG.escena = (c, o) => {
    const x = CK.ctx(c),
      W = c.width,
      Hh = c.height,
      esc = o.esc || 3;
    x.imageSmoothingEnabled = false;
    x.save();
    x.scale(esc, esc);
    const nombreMapa = piso(x, W, Hh, esc);
    const vw = W / esc,
      vh = Hh / esc,
      suelo = Math.round(vh * 0.78),
      a = o.asset && CK.P.assets[o.asset];
    // grilla de tiles, suave
    if (o.grilla !== false) {
      x.fillStyle = 'rgba(255,255,255,.07)';
      for (let i = 0; i < vw; i += T()) x.fillRect(i, 0, 1 / esc, vh);
      for (let j = 0; j < vh; j += T()) x.fillRect(0, j, vw, 1 / esc);
    }
    // sombra del héroe y el héroe
    const hx = Math.round(vw * 0.32);
    dibHeroe(x, hx, suelo, o.t);
    // lo nuevo
    const nx = Math.round(vw * 0.62);
    let w = o.w,
      hh = o.h;
    if (a && CK.img[a.id]) {
      const n = CK.asset.nCuadros(a),
        f = CK.asset.cuadro(a, n > 1 ? Math.floor(((o.t || 0) / 1000) * ((a.cuadros && a.cuadros.fps) || 8)) % n : 0);
      w = f.w;
      hh = f.h;
      if (a.tipo === 'textura' || a.tipo === 'tileset') {
        // un tile se muestra repetido en el piso
        const ft = a.tipo === 'tileset' ? CK.asset.cuadro(a, 0) : { x: 0, y: 0, w: a.w, h: a.h };
        for (let j = suelo - ft.h * 2; j < suelo + ft.h; j += ft.h)
          for (let i = nx - ft.w * 2; i < nx + ft.w * 2; i += ft.w) x.drawImage(CK.img[a.id], ft.x, ft.y, ft.w, ft.h, i, j, ft.w, ft.h);
      } else x.drawImage(CK.img[a.id], f.x, f.y, f.w, f.h, Math.round(nx - f.w / 2), suelo - f.h, f.w, f.h);
    } else if (o.img) x.drawImage(o.img, Math.round(nx - o.img.width / 2), suelo - o.img.height);
    else if (o.tipo) silueta(x, o.tipo.forma, nx, suelo, w, hh);
    x.restore();
    // rótulos
    x.font = '600 11px system-ui, sans-serif';
    x.textBaseline = 'top';
    const rot = (txt, px, py) => {
      const m = x.measureText(txt).width;
      x.fillStyle = 'rgba(15,16,20,.72)';
      x.fillRect(px - m / 2 - 4, py, m + 8, 16);
      x.fillStyle = '#f1ead8';
      x.fillText(txt, px - m / 2, py + 2);
    };
    rot('Héroe', hx * esc, suelo * esc + 4);
    if (w && hh) rot(w + ' × ' + hh + ' px', nx * esc, suelo * esc + 4);
    x.font = '11px system-ui, sans-serif';
    x.fillStyle = 'rgba(241,234,216,.75)';
    x.fillText(nombreMapa ? 'Sobre «' + nombreMapa + '» · ×' + esc : 'Sobre pasto de prueba (todavía no hay mapas) · ×' + esc, 8, 6);
  };

  /**
   * Bloque de sugerencias para elegir qué crear: tarjetas por tipo, tamaño y vista previa.
   * o = { inicial (id), alCambiar({ tipo, w, h }) }. Devuelve { el, valor() }.
   */
  SG.bloque = (o = {}) => {
    const tipos = SG.tipos();
    let act = tipos.find(t => t.id === o.inicial) || tipos[0],
      w = act.lienzo[0],
      hh = act.lienzo[1];
    const cv = CK.lienzo(420, 220);
    cv.className = 'sug-previa';
    const nota = h('p.nota-txt'),
      iw = CK.num(w, { min: 1, max: 1024 }, v => {
        w = v;
        repintar();
      }),
      ih = CK.num(hh, { min: 1, max: 1024 }, v => {
        hh = v;
        repintar();
      });
    let vivo = true,
      t0 = performance.now();
    const repintar = () => {
      SG.escena(cv, { tipo: act, w: Math.min(w, act.w) || w, h: Math.min(hh, act.h) || hh, t: performance.now() - t0, esc: 2 });
      nota.textContent =
        act.nota +
        (w !== act.lienzo[0] || hh !== act.lienzo[1] ? '' : ' Lienzo sugerido: ' + act.lienzo[0] + ' × ' + act.lienzo[1] + ' px.');
      if (o.alCambiar) o.alCambiar({ tipo: act, w, h: hh });
    };
    const tarjetas = h('div.sug-tipos');
    const pintarTarjetas = () =>
      tarjetas.replaceChildren(
        ...tipos.map(t => {
          const mini = CK.lienzo(34, 34),
            mx = CK.ctx(mini),
            k = Math.min(1, 28 / Math.max(t.w, t.h));
          mx.save();
          mx.translate(17, 31);
          mx.scale(k, k);
          silueta(mx, t.forma, 0, 0, t.w, t.h);
          mx.restore();
          const b = h(
            'button.sug-tipo' + (t === act ? '.activo' : ''),
            {
              type: 'button',
              onclick: () => {
                act = t;
                w = t.lienzo[0];
                hh = t.lienzo[1];
                iw.value = w;
                ih.value = hh;
                pintarTarjetas();
                repintar();
              }
            },
            mini,
            h('span', t.nombre),
            h('small', t.lienzo[0] + '×' + t.lienzo[1])
          );
          return b;
        })
      );
    pintarTarjetas();
    const el = h(
      'div.sug',
      h('div.sug-tit', '¿Qué vas a crear?'),
      tarjetas,
      h('div.sug-der', cv, nota, h('div.duo', CK.campo('Ancho del lienzo', iw), CK.campo('Alto del lienzo', ih)))
    );
    repintar();
    // los personajes del juego se mueven: la vista previa también
    const anim = () => {
      if (!vivo || !cv.isConnected) return;
      CK.raf(anim);
      if (SG.heroe())
        SG.escena(cv, { tipo: act, w: Math.min(w, act.w) || w, h: Math.min(hh, act.h) || hh, t: performance.now() - t0, esc: 2 });
    };
    setTimeout(() => CK.raf(anim), 50);
    return {
      el,
      valor: () => ({ tipo: act, w, h: hh }),
      cerrar: () => {
        vivo = false;
      }
    };
  };

  /** "Crear algo nuevo": elegir qué, ver el tamaño en el mapa y empezar a dibujarlo en Pixel art. */
  SG.crearNuevo = async inicial => {
    if (!CK.P) return CK.aviso('Primero creá o abrí un proyecto.', 'info');
    const b = SG.bloque({ inicial });
    let nombre = '';
    const iN = CK.txt('', v => (nombre = v), { vivo: true });
    iN.placeholder = 'Por ejemplo: herrero, barril, roble';
    const ok = await CK.ventana({
      titulo: 'Crear algo nuevo',
      ancho: 860,
      cuerpo: h('div', CK.campo('Nombre', iN), b.el),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Empezar a dibujar', cls: 'pri', valor: true }
      ]
    });
    b.cerrar();
    if (!ok) return null;
    const v = b.valor();
    const a = CK.asset.crear({
      nombre: (nombre || '').trim() || v.tipo.nombre.toLowerCase(),
      tipo: v.tipo.tipo,
      lienzo: CK.lienzo(v.w, v.h),
      origen: 'dibujado a mano'
    });
    CK.ir('pixel', a.id);
    if (CK._pixel && CK._pixel.tabs && CK._pixel.tabs.ir) setTimeout(() => CK._pixel.tabs.ir('enmapa'), 60);
    return a;
  };

  /** Pestaña en vivo: lo que estás dibujando, en el mapa y al lado del héroe. idDe() = asset actual. */
  SG.panelVivo = (c, idDe) => {
    const cv = CK.lienzo(272, 200);
    cv.className = 'sug-previa';
    const pref = (CK.P.ui.sugEsc = CK.P.ui.sugEsc || 2);
    const sel = CK.sel(
      String(pref),
      [
        ['1', 'Tamaño real'],
        ['2', '× 2'],
        ['3', '× 3']
      ],
      v => {
        CK.P.ui.sugEsc = +v;
      }
    );
    const t0 = performance.now();
    const paso = () => {
      if (!cv.isConnected) return;
      CK.raf(paso);
      const id = idDe();
      if (!id) return;
      SG.escena(cv, { asset: id, esc: CK.P.ui.sugEsc || 2, t: performance.now() - t0 });
    };
    CK.raf(paso);
    const a = SG.heroe();
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Así se ve en el juego'),
        cv,
        CK.campo('Acercar', sel),
        h(
          'p.nota-txt',
          'Tu dibujo sobre un pedazo de tu mapa, al lado del héroe y a la escala del juego. Se actualiza mientras dibujás. ' +
            (a ? 'Héroe de referencia: ' + a.nombre + '.' : 'Héroe de referencia: figura de ' + H() + ' px (podés elegir el tuyo).')
        ),
        h(
          'div.fila',
          CK.btn({
            ico: 'persona',
            txt: 'Elegir el héroe de referencia',
            cls: 'chico',
            on: async () => {
              const id = await CK.elegirAsset('Héroe de referencia', ['personaje', 'hoja', 'sprite']);
              if (!id) return;
              CK.P.estilo.heroeRef = id;
              CK.tocar();
              CK.emit('estilo');
            }
          })
        )
      )
    );
  };

  /** Ventana "Ver en el mapa" para cualquier asset. */
  SG.verEnMapa = async id => {
    const a = CK.P.assets[id];
    if (!a) return;
    const cv = CK.lienzo(560, 300);
    cv.className = 'sug-previa';
    let vivo = true;
    const t0 = performance.now();
    const paso = () => {
      if (!vivo) return;
      CK.raf(paso);
      SG.escena(cv, { asset: id, esc: 3, t: performance.now() - t0 });
    };
    CK.raf(paso);
    await CK.ventana({
      titulo: a.nombre + ' en el mapa',
      ancho: 600,
      cuerpo: h('div', cv, h('p.nota-txt', 'A la escala del juego (× 3), al lado del héroe.'))
    });
    vivo = false;
  };
})();
