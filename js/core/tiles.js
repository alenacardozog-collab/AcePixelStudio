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
})();
