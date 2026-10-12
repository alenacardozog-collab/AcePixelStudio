/* TILES: importar hojas de tiles (cortarlas con tamaño, margen y separación) y operaciones sobre las piezas de un tileset
   (girar, espejar, duplicar, mover, borrar, quitar repetidas). Cuando las piezas cambian de lugar, lo pintado en los
   mapas se reacomoda solo (CK.mapa.remapTiles). */
'use strict';
(function () {
  const h = CK.h;
  const TL = (CK.tiles = {});

  // ---------------------------------------------------------------- cortar
  /** Corta una imagen (PIX) en piezas. o = { tile, margen, sep } */
  TL.cortar = (im, o) => {
    const t = o.tile,
      m = o.margen || 0,
      s = o.sep || 0,
      out = [];
    let cols = 0,
      filas = 0;
    for (let y = m; y + t <= im.h; y += t + s) {
      let c = 0;
      for (let x = m; x + t <= im.w; x += t + s) {
        out.push(PIX.crop(im, x, y, t, t));
        c++;
      }
      cols = Math.max(cols, c);
      filas++;
    }
    return { piezas: out, cols, filas };
  };
  const vacia = p => {
    for (let i = 3; i < p.d.length; i += 4) if (p.d[i] > 8) return false;
    return true;
  };
  const firma = p => {
    let s = 0;
    for (let i = 0; i < p.d.length; i++) s = (s * 31 + p.d[i]) | 0;
    return p.w + 'x' + p.h + ':' + s;
  };
  const iguales = (a, b) => {
    if (a.w !== b.w || a.h !== b.h) return false;
    for (let i = 0; i < a.d.length; i++) if (a.d[i] !== b.d[i]) return false;
    return true;
  };
  /** Adivina el tamaño de tile de una hoja: el del proyecto si encaja, si no el más común que divida justo. */
  TL.adivinar = (w, hh) => {
    const T = CK.P ? CK.P.estilo.tile : 16;
    if (w % T === 0 && hh % T === 0) return T;
    for (const t of [16, 32, 8, 24, 48, 64, 12, 20]) if (w % t === 0 && hh % t === 0) return t;
    return T;
  };
  /** Gira 90° a la derecha. */
  TL.girar = p => {
    const o = PIX.make(p.h, p.w);
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        const i = (y * p.w + x) * 4,
          j = (x * o.w + (o.w - 1 - y)) * 4;
        for (let k = 0; k < 4; k++) o.d[j + k] = p.d[i + k];
      }
    return o;
  };

  // ---------------------------------------------------------------- importar
  /**
   * Ventana para importar una o varias hojas de tiles. Devuelve el id del tileset creado (o null).
   * o = { archivos } (si no vienen, se piden).
   */
  TL.importar = async (o = {}) => {
    if (!CK.P) return null;
    const fs = o.archivos || (await CK.elegirArchivos('image/png,image/gif,image/webp,image/jpeg', true));
    if (!fs || !fs.length) return null;
    const hojas = [];
    for (const f of fs) {
      try {
        hojas.push({ nombre: f.name.replace(/\.[a-z0-9]+$/i, ''), im: CK.aPix(await CK.cargarImagen(f)) });
      } catch (e) {
        CK.aviso('No pude leer ' + f.name, 'error');
      }
    }
    if (!hojas.length) return null;
    const T = CK.P.estilo.tile,
      h0 = hojas[0].im;
    const cfg = {
      nombre: hojas.length === 1 ? hojas[0].nombre : 'tileset',
      tile: TL.adivinar(h0.w, h0.h),
      margen: 0,
      sep: 0,
      vacias: true,
      repetidas: true,
      paleta: false,
      aTile: true,
      cols: 0
    };
    const vista = CK.lienzo(10, 10);
    vista.className = 'tiles-imp-vista';
    const info = h('p.nota-txt');
    const resultado = () => {
      let piezas = [];
      let cols0 = 0;
      hojas.forEach(hj => {
        const r = TL.cortar(hj.im, cfg);
        piezas = piezas.concat(r.piezas);
        cols0 = Math.max(cols0, r.cols);
      });
      const total = piezas.length;
      let quit = 0,
        rep = 0;
      if (cfg.vacias) {
        const n0 = piezas.length;
        piezas = piezas.filter(p => !vacia(p));
        quit = n0 - piezas.length;
      }
      if (cfg.repetidas) {
        const vistas = new Map(),
          out = [];
        piezas.forEach(p => {
          const k = firma(p),
            l = vistas.get(k) || [];
          if (l.some(q => iguales(q, p))) {
            rep++;
            return;
          }
          l.push(p);
          vistas.set(k, l);
          out.push(p);
        });
        piezas = out;
      }
      if (cfg.aTile && cfg.tile !== T)
        piezas = piezas.map(p => (cfg.tile > T ? PIX.downscale(p, T, T, 'dominante') : PIX.resizeNearest(p, T, T)));
      if (cfg.paleta && CK.P.estilo.paleta.length) piezas = piezas.map(p => PIX.quantize(p, CK.P.estilo.paleta));
      const cols = cfg.cols || (quit || rep || hojas.length > 1 ? Math.min(8, Math.max(1, piezas.length)) : cols0 || 8);
      return { piezas, total, quit, rep, cols, t: piezas.length ? piezas[0].w : T };
    };
    const pintar = () => {
      // la hoja original con la grilla de corte encima
      const im = h0,
        k = Math.max(1, Math.min(6, Math.floor(Math.min(560 / im.w, 380 / im.h)))) || 1;
      vista.width = im.w * k;
      vista.height = im.h * k;
      const x = CK.ctx(vista);
      CK.cuadros(x, vista.width, vista.height, 8);
      x.imageSmoothingEnabled = false;
      x.drawImage(CK.aLienzo(im), 0, 0, vista.width, vista.height);
      x.strokeStyle = 'rgba(232,184,58,.85)';
      x.lineWidth = 1;
      const t = cfg.tile;
      for (let y = cfg.margen; y + t <= im.h; y += t + cfg.sep)
        for (let xx = cfg.margen; xx + t <= im.w; xx += t + cfg.sep) x.strokeRect(xx * k + 0.5, y * k + 0.5, t * k - 1, t * k - 1);
      const r = resultado();
      info.textContent =
        r.total +
        ' piezas cortadas' +
        (r.quit ? ' · ' + r.quit + ' vacías fuera' : '') +
        (r.rep ? ' · ' + r.rep + ' repetidas fuera' : '') +
        ' → quedan ' +
        r.piezas.length +
        ' de ' +
        r.t +
        ' px' +
        (hojas.length > 1 ? ' (de ' + hojas.length + ' imágenes; se ve la primera)' : '') +
        '.';
    };
    const num = (k, min, max) =>
      CK.num(cfg[k], { min, max }, v => {
        cfg[k] = v;
        pintar();
      });
    const chk = (k, txt, desc) =>
      CK.chk(
        cfg[k],
        txt,
        v => {
          cfg[k] = v;
          pintar();
        },
        desc
      );
    const cuerpo = h(
      'div.tiles-imp',
      h('div.tiles-imp-caja', vista),
      h(
        'div.tiles-imp-opc',
        CK.campo(
          'Nombre',
          CK.txt(cfg.nombre, v => {
            cfg.nombre = v;
          })
        ),
        CK.campo('Tamaño del tile', num('tile', 4, 256), 'Lado de cada pieza en la hoja, en píxeles.'),
        CK.campo('Margen', num('margen', 0, 64), 'Píxeles vacíos alrededor de toda la hoja.'),
        CK.campo('Separación', num('sep', 0, 32), 'Píxeles entre una pieza y la siguiente (muchas hojas de itch.io traen 1 o 2).'),
        CK.campo('Columnas', num('cols', 0, 64), 'Cuántas piezas por fila tiene el tileset guardado. 0 = automático.'),
        chk('vacias', 'Quitar piezas vacías', 'Las piezas totalmente transparentes no se guardan.'),
        chk('repetidas', 'Quitar piezas repetidas', 'Si dos piezas son idénticas, queda una sola.'),
        chk(
          'aTile',
          'Llevar al tile del proyecto (' + T + ' px)',
          'Si la hoja es de otro tamaño, achica o agranda cada pieza a ' + T + ' px.'
        ),
        chk('paleta', 'Llevar a la paleta del proyecto', 'Cambia cada color por el más parecido de tu paleta.'),
        info
      )
    );
    pintar();
    const ok = await CK.ventana({
      titulo: 'Importar tiles',
      ancho: Math.min(980, CK.doc().defaultView.innerWidth - 40),
      cuerpo,
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Importar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return null;
    const r = resultado();
    if (!r.piezas.length) {
      CK.aviso('No quedó ninguna pieza: revisá el tamaño, el margen y la separación.', 'error');
      return null;
    }
    const a = CK.asset.crear({
      nombre: (cfg.nombre || 'tileset').trim(),
      tipo: 'tileset',
      lienzo: CK.aLienzo(PIX.pack(r.piezas, r.cols)),
      origen: 'importado: ' + fs.map(f => f.name).join(', '),
      tileset: { tile: r.t, forma: 'libre', n: r.piezas.length }
    });
    CK.aviso('Tileset importado: ' + a.nombre + ' (' + r.piezas.length + ' piezas)');
    CK.emit('assets');
    return a.id;
  };

  // ---------------------------------------------------------------- operaciones sobre las piezas
  TL.lado = a => (a.tileset && a.tileset.tile) || CK.P.estilo.tile;
  TL.cols = a => Math.max(1, Math.floor(a.w / TL.lado(a)));
  /** Cuántas piezas tiene (la última fila puede tener huecos que no cuentan). */
  TL.cuenta = a => {
    const t = TL.lado(a),
      total = TL.cols(a) * Math.max(1, Math.floor(a.h / t));
    return a.tileset && a.tileset.n ? Math.min(a.tileset.n, total) : total;
  };
  TL.piezas = id => {
    const a = CK.P.assets[id];
    return a ? PIX.slice(CK.asset.pix(id), TL.lado(a), TL.lado(a)).slice(0, TL.cuenta(a)) : [];
  };
  /** Las piezas se pueden reordenar (los tilesets de bordes automáticos tienen un orden fijo). */
  TL.editable = a => !!a && (a.tipo === 'tileset' || a.tipo === 'textura') && (!a.tileset || a.tileset.forma !== 'wang16');
  /**
   * Aplica un cambio a las piezas y lo deja deshacible junto con lo pintado en los mapas.
   * fn(piezas) devuelve { piezas, mapa? (índice viejo → nuevo, -1 = borrada), cols? }.
   */
  TL.cambiar = (id, nombre, fn) => {
    const a = CK.P.assets[id];
    if (!a) return false;
    const r = fn(TL.piezas(id));
    if (!r || !r.piezas.length) return false;
    const antesImg = CK.copiaLienzo(CK.img[id]),
      antesMeta = JSON.stringify(a.tileset || null),
      mapas = CK.mapa ? [...new Set(CK.mapa.capasConTileset(id).map(x => x.m.id))] : [],
      antesMapas = mapas.map(m => JSON.stringify(CK.P.mapas[m]));
    const cols = r.cols || Math.min(TL.cols(a), r.piezas.length) || 1;
    CK.asset.poner(id, CK.aLienzo(PIX.pack(r.piezas, cols)));
    a.tileset = Object.assign({ tile: TL.lado(a), forma: 'libre' }, a.tileset || {}, { n: r.piezas.length });
    if (r.mapa && CK.mapa) CK.mapa.remapTiles(id, r.mapa);
    const despuesImg = CK.copiaLienzo(CK.img[id]),
      despuesMeta = JSON.stringify(a.tileset),
      despuesMapas = mapas.map(m => JSON.stringify(CK.P.mapas[m]));
    const poner = (img, meta, ms) => {
      CK.asset.poner(id, CK.copiaLienzo(img));
      CK.P.assets[id].tileset = JSON.parse(meta);
      mapas.forEach((m, i) => {
        CK.P.mapas[m] = JSON.parse(ms[i]);
        CK.emit('datos', 'mapas', m);
      });
      if (CK.mapa && CK.mapa.invalidar) CK.mapa.invalidar();
      CK.emit('tiles-cambio', id);
    };
    CK.hist.push({
      nombre,
      deshacer: () => poner(antesImg, antesMeta, antesMapas),
      rehacer: () => poner(despuesImg, despuesMeta, despuesMapas)
    });
    if (CK.mapa && CK.mapa.invalidar) CK.mapa.invalidar();
    CK.emit('tiles-cambio', id);
    return true;
  };
  const ident = n => [...Array(n).keys()];
  /** Operaciones listas. sel = índices elegidos (ordenados). Devuelven la selección nueva. */
  TL.ops = {
    girar: (id, sel) => (TL.cambiar(id, 'Girar piezas', ps => ({ piezas: ps.map((p, i) => (sel.includes(i) ? TL.girar(p) : p)) })), sel),
    espejoH: (id, sel) => (
      TL.cambiar(id, 'Espejar piezas', ps => ({ piezas: ps.map((p, i) => (sel.includes(i) ? PIX.flipH(p) : p)) })),
      sel
    ),
    espejoV: (id, sel) => (
      TL.cambiar(id, 'Espejar piezas', ps => ({ piezas: ps.map((p, i) => (sel.includes(i) ? PIX.flipV(p) : p)) })),
      sel
    ),
    duplicar: (id, sel) => {
      let nueva = [];
      TL.cambiar(id, 'Duplicar piezas', ps => {
        // las copias van al final: así no se corre nada de lo ya pintado
        const out = ps.concat(sel.map(i => PIX.clone(ps[i])));
        nueva = sel.map((_, k) => ps.length + k);
        return { piezas: out };
      });
      return nueva;
    },
    vacia: (id, sel) => {
      let n = 0;
      TL.cambiar(id, 'Pieza vacía', ps => {
        n = ps.length;
        return { piezas: ps.concat(PIX.make(ps[0].w, ps[0].h)) };
      });
      return [n];
    },
    borrar: (id, sel) => {
      TL.cambiar(id, 'Borrar piezas', ps => {
        if (sel.length >= ps.length) return null;
        const mapa = [],
          out = [];
        ps.forEach((p, i) => {
          if (sel.includes(i)) mapa[i] = -1;
          else {
            mapa[i] = out.length;
            out.push(p);
          }
        });
        return { piezas: out, mapa };
      });
      return [];
    },
    mover: (id, sel, d) => {
      let nueva = sel;
      TL.cambiar(id, 'Mover piezas', ps => {
        const orden = ident(ps.length),
          s = new Set(sel);
        // corre el bloque elegido un lugar (los demás se acomodan)
        const idx = d < 0 ? orden : orden.slice().reverse();
        idx.forEach(i => {
          const j = i + d;
          if (!s.has(orden[i]) || j < 0 || j >= orden.length || s.has(orden[j])) return;
          [orden[i], orden[j]] = [orden[j], orden[i]];
        });
        const mapa = [];
        orden.forEach((viejo, nuevo) => (mapa[viejo] = nuevo));
        nueva = sel.map(i => mapa[i]).sort((a, b) => a - b);
        return { piezas: orden.map(i => ps[i]), mapa };
      });
      return nueva;
    },
    repetidas: id => {
      let quit = 0;
      TL.cambiar(id, 'Quitar repetidas', ps => {
        const out = [],
          mapa = [];
        ps.forEach((p, i) => {
          const j = out.findIndex(q => iguales(q, p));
          if (j >= 0) {
            mapa[i] = j;
            quit++;
          } else {
            mapa[i] = out.length;
            out.push(p);
          }
        });
        return quit ? { piezas: out, mapa } : null;
      });
      return quit;
    },
    columnas: (id, n) => TL.cambiar(id, 'Columnas del tileset', ps => ({ piezas: ps, cols: Math.max(1, Math.min(n, ps.length)) })),
    /** Suma piezas de otra hoja al final (lo pintado no se mueve). */
    sumar: async id => {
      const fs = await CK.elegirArchivos('image/png,image/gif,image/webp', true);
      if (!fs || !fs.length) return 0;
      const a = CK.P.assets[id],
        t = TL.lado(a);
      let nuevas = [];
      for (const f of fs) {
        const im = CK.aPix(await CK.cargarImagen(f));
        nuevas = nuevas.concat(TL.cortar(im, { tile: t }).piezas.filter(p => !vacia(p)));
      }
      if (!nuevas.length) return 0;
      TL.cambiar(id, 'Sumar piezas', ps => ({ piezas: ps.concat(nuevas) }));
      return nuevas.length;
    }
  };

  // ---------------------------------------------------------------- bordes automáticos con cualquier tileset
  // El editor pinta el suelo con 16 piezas "de esquinas" (como las de Texturas → Bordes): pieza i tiene terreno en
  // la esquina sup-izq si !(i&1), sup-der si !(i&2), inf-izq si !(i&4), inf-der si !(i&8). La 0 es llena y la 15 vacía.
  const ESQ = i => [!(i & 1), !(i & 2), !(i & 4), !(i & 8)];
  TL.ESQ = ESQ;
  /**
   * RPG Maker (autotile A2): un bloque de 2 × 3 tiles. Arriba a la derecha, las esquinas interiores; abajo, un 2 × 2
   * con bordes y esquinas exteriores. Cada pieza de salida se arma con cuatro cuartos de tile.
   */
  TL.desdeRPGMaker = (im, t, bx, by) => {
    const m = t / 2,
      out = PIX.make(t * 4, t * 4);
    const cuarto = (col, fila) => PIX.crop(im, bx + col * m, by + fila * m, m, m);
    for (let i = 0; i < 16; i++) {
      const c = ESQ(i).map(Number),
        px = (i % 4) * t,
        py = Math.floor(i / 4) * t;
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ].forEach(([qx, qy]) => {
        const k = qy * 2 + qx,
          v = c[k],
          hz = c[qy * 2 + (1 - qx)],
          vt = c[(1 - qy) * 2 + qx],
          dg = c[(1 - qy) * 2 + (1 - qx)];
        if (!v) return;
        let col, fila;
        if (!hz && !vt) {
          col = qx === 0 ? 3 : 0;
          fila = qy === 0 ? 5 : 2;
        } else if (hz && !vt) {
          col = qx === 0 ? 1 : 2;
          fila = qy === 0 ? 5 : 2;
        } else if (!hz && vt) {
          col = qx === 0 ? 3 : 0;
          fila = qy === 0 ? 3 : 4;
        } else if (dg) {
          col = qx === 0 ? 1 : 2;
          fila = qy === 0 ? 3 : 4;
        } else {
          col = qx === 0 ? 3 : 2;
          fila = qy === 0 ? 1 : 0;
        }
        PIX.blit(out, cuarto(col, fila), px + qx * m, py + qy * m, false);
      });
    }
    return out;
  };
  /** Adivina qué pieza de un tileset corresponde a cada una de las 16 (mirando qué esquinas tienen dibujo). */
  TL.adivinar16 = piezas => {
    const t = piezas[0] ? piezas[0].w : 16,
      r = Math.max(1, Math.round(t / 8));
    const opaco = (p, x0, y0) => {
      let n = 0,
        tot = 0;
      for (let y = y0; y < y0 + r; y++)
        for (let x = x0; x < x0 + r; x++) {
          tot++;
          if (p.d[(y * p.w + x) * 4 + 3] > 128) n++;
        }
      return n / tot > 0.5;
    };
    const firma = p => [opaco(p, 0, 0), opaco(p, t - r, 0), opaco(p, 0, t - r), opaco(p, t - r, t - r)];
    const fs = piezas.map(firma),
      asig = [];
    for (let i = 0; i < 16; i++) {
      const c = ESQ(i);
      if (i === 15) {
        asig.push(-1);
        continue;
      }
      const k = fs.findIndex(f => f.every((v, j) => v === c[j]));
      asig.push(k);
    }
    return asig;
  };
  /** Arma el atlas de 16 piezas con la asignación elegida (-1 = vacía). */
  TL.armar16 = (piezas, asig, t) => {
    const out = PIX.make(t * 4, t * 4);
    asig.forEach((k, i) => {
      if (k >= 0 && piezas[k]) PIX.blit(out, piezas[k], (i % 4) * t, Math.floor(i / 4) * t, false);
    });
    return out;
  };
  const dibujoEsquinas = i => {
    const c = CK.lienzo(18, 18),
      x = CK.ctx(c);
    x.fillStyle = '#2a2d33';
    x.fillRect(0, 0, 18, 18);
    ESQ(i).forEach((v, k) => {
      x.fillStyle = v ? '#e8b83a' : '#3e434b';
      x.fillRect((k % 2) * 9 + 1, Math.floor(k / 2) * 9 + 1, 7, 7);
    });
    return c;
  };
  /** Ventana: elegir el formato y asignar piezas. Crea un tileset de bordes (16 piezas) listo para una capa de Terreno. */
  TL.armarBordes = async id => {
    const a = CK.P.assets[id];
    if (!a) return null;
    const t = TL.lado(a),
      im = CK.asset.pix(id),
      piezas = TL.piezas(id),
      cols = TL.cols(a);
    const st = {
      formato: im.w >= t * 2 && im.h >= t * 3 && /rpg|a2|auto/i.test(a.nombre) ? 'rpg' : 'mano',
      bx: 0,
      by: 0,
      asig: TL.adivinar16(piezas),
      slot: 0
    };
    const k = Math.max(1, Math.min(6, Math.floor(Math.min(480 / im.w, 360 / im.h)))) || 1;
    const hoja = CK.lienzo(im.w * k, im.h * k),
      vista = CK.lienzo(t * 4 * 3, t * 4 * 3);
    hoja.className = 'bordes-hoja';
    vista.className = 'bordes-vista';
    const slots = CK.h('div.bordes-slots');
    const ayuda = CK.h('p.nota-txt');
    const resultado = () => (st.formato === 'rpg' ? TL.desdeRPGMaker(im, t, st.bx, st.by) : TL.armar16(piezas, st.asig, t));
    const pintar = () => {
      const x = CK.ctx(hoja);
      CK.cuadros(x, hoja.width, hoja.height, 8);
      x.imageSmoothingEnabled = false;
      x.drawImage(CK.img[id], 0, 0, hoja.width, hoja.height);
      x.strokeStyle = 'rgba(255,255,255,.15)';
      for (let gx = 0; gx <= im.w; gx += t) x.strokeRect(gx * k + 0.5, 0, 0, hoja.height);
      for (let gy = 0; gy <= im.h; gy += t) x.strokeRect(0, gy * k + 0.5, hoja.width, 0);
      x.strokeStyle = '#e8b83a';
      x.lineWidth = 2;
      if (st.formato === 'rpg') x.strokeRect(st.bx * k + 1, st.by * k + 1, t * 2 * k - 2, t * 3 * k - 2);
      else
        st.asig.forEach((p, i) => {
          if (p < 0) return;
          x.strokeStyle = i === st.slot ? '#e8b83a' : 'rgba(232,184,58,.35)';
          x.strokeRect((p % cols) * t * k + 1, Math.floor(p / cols) * t * k + 1, t * k - 2, t * k - 2);
        });
      // vista previa: el atlas y un pedacito de suelo con una mancha
      const at = CK.aLienzo(resultado()),
        v = CK.ctx(vista),
        n = 12,
        tt = (t * 4 * 3) / n;
      v.imageSmoothingEnabled = false;
      v.fillStyle = '#4c7a3a';
      v.fillRect(0, 0, vista.width, vista.height);
      const g = (i, j) => ((i - 5.5) ** 2 / 14 + (j - 5.5) ** 2 / 9 < 1 || (j === 3 && i > 6) ? 1 : 0);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const p = PIX.wangIndex(g(i, j), g(i + 1, j), g(i, j + 1), g(i + 1, j + 1));
          if (p === 15) continue;
          v.drawImage(at, (p % 4) * t, Math.floor(p / 4) * t, t, t, i * tt, j * tt, tt, tt);
        }
      CK.vaciar(slots);
      if (st.formato === 'mano')
        for (let i = 0; i < 16; i++) {
          const p = st.asig[i],
            b = CK.h(
              'button.borde-slot' + (i === st.slot ? '.activo' : '') + (p < 0 && i !== 15 ? '.falta' : ''),
              {
                type: 'button',
                onclick: () => {
                  st.slot = i;
                  pintar();
                }
              },
              dibujoEsquinas(i),
              p >= 0 ? CK.mini(CK.aLienzo(piezas[p]), 26) : CK.h('span.borde-vacia', i === 15 ? 'vacía' : '?')
            );
          CK.tip(
            b,
            'Pieza ' + (i + 1),
            'Los cuadraditos dorados son las esquinas con terreno. Elegila y hacé clic en la pieza que corresponde en la hoja.'
          );
          slots.append(b);
        }
      ayuda.textContent =
        st.formato === 'rpg'
          ? 'Hacé clic en el bloque de 2 × 3 tiles del autotile que querés usar (el recuadro dorado). Las 16 piezas se arman solas.'
          : 'Elegí una de las 16 piezas de la derecha (los cuadraditos dorados son las esquinas con terreno) y hacé clic en la que le corresponde en la hoja de la izquierda. "Adivinar" las asigna mirando qué esquinas tienen dibujo. Las que quedan con ? no se usan.';
    };
    hoja.addEventListener('click', e => {
      const r = hoja.getBoundingClientRect(),
        mx = ((e.clientX - r.left) / r.width) * im.w,
        my = ((e.clientY - r.top) / r.height) * im.h;
      if (st.formato === 'rpg') {
        st.bx = CK.clamp(Math.floor(mx / (t * 2)) * t * 2, 0, Math.max(0, im.w - t * 2));
        st.by = CK.clamp(Math.floor(my / (t * 3)) * t * 3, 0, Math.max(0, im.h - t * 3));
      } else {
        const p = Math.floor(my / t) * cols + Math.floor(mx / t);
        if (p < piezas.length) {
          st.asig[st.slot] = p;
          st.slot = Math.min(15, st.slot + 1);
        }
      }
      pintar();
    });
    const fmt = CK.sel(
      st.formato,
      [
        ['mano', 'Asignar las piezas (sirve para hojas de 16 o 47 piezas)'],
        ['rpg', 'RPG Maker: autotile A2 (bloques de 2 × 3 tiles)']
      ],
      v => {
        st.formato = v;
        pintar();
      }
    );
    const cuerpo = CK.h(
      'div.bordes',
      CK.campo('Formato', fmt),
      CK.h(
        'div.bordes-grid',
        CK.h('div', CK.h('span.mini-rot', 'La hoja "' + a.nombre + '"'), CK.h('div.bordes-hoja-caja', hoja)),
        CK.h(
          'div',
          slots,
          CK.h('span.mini-rot', 'Así queda pintado'),
          vista,
          CK.h(
            'div.fila',
            CK.btn({
              ico: 'varita',
              txt: 'Adivinar',
              cls: 'chico',
              desc: 'Asigna cada pieza mirando qué esquinas tienen dibujo (funciona con hojas de fondo transparente).',
              on: () => {
                st.formato = 'mano';
                fmt.value = 'mano';
                st.asig = TL.adivinar16(piezas);
                pintar();
              }
            })
          )
        )
      ),
      ayuda
    );
    pintar();
    const ok = await CK.ventana({
      titulo: 'Armar bordes automáticos',
      ancho: Math.min(980, CK.doc().defaultView.innerWidth - 40),
      cuerpo,
      botones: [
        { txt: 'Cancelar', valor: null },
        { txt: 'Crear tileset de bordes', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return null;
    const nuevo = CK.asset.crear({
      nombre: 'bordes_' + a.nombre,
      tipo: 'tileset',
      lienzo: CK.aLienzo(resultado()),
      origen: 'bordes automáticos armados con ' + a.nombre + (st.formato === 'rpg' ? ' (RPG Maker A2)' : ''),
      tileset: { tile: t, forma: 'wang16', variantes: 0 }
    });
    CK.aviso(
      'Listo: "' + nuevo.nombre + '". En Mapa, elegilo en una capa de Terreno y pintá con el pincel: los bordes salen solos.',
      'ok',
      6000
    );
    CK.emit('assets');
    return nuevo.id;
  };
})();
