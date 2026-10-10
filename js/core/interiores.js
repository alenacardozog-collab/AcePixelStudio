/* INTERIORES: trae al editor las casas y las salas del castillo, que en el juego están escritas como código.
   Corre esos archivos del juego en una caja aparte (sin Phaser) y lee el resultado: tamaño, piso y paredes, muebles, colisiones, salidas y luces.
   Sirven de referencia y de punto de partida: "Hacer una copia editable" los vuelve un mapa propio que el cargador lleva al juego. */
'use strict';
(function () {
  const J = CK.juego;
  J.NOMBRES_INT = { bar: 'Taberna', tienda: 'Tienda', granero: 'Granero', casa: 'Casa', castle: 'Castillo', ruins: 'Ruinas' };
  const hexDe = n => '#' + ('000000' + (n >>> 0).toString(16)).slice(-6);
  /** Ejecuta los archivos de mapas del juego y devuelve { kinds: { kind: layout }, tex: { clave: {ruta, fw, fh} } }. */
  J.leerInteriores = async function () {
    const d = await this.dir();
    if (!d) return null;
    const html = await CK.fs.texto(d, 'index.html');
    if (!html) {
      CK.aviso('No encuentro index.html en la carpeta del juego.', 'error');
      return null;
    }
    const orden = [...html.matchAll(/<script src="(js\/(?:config|maps)\/[^"?]+)/g)]
      .map(m => m[1])
      .filter(r => !/editor_(data|assets)\.js$/.test(r));
    let txt = '';
    for (const r of orden) {
      const t = await CK.fs.texto(d, r);
      if (t) txt += '\n;/* ' + r + ' */\n' + t;
    }
    let R;
    try {
      R = new Function('window', 'document', txt + '\n;return { L: INTERIOR_LAYOUTS, b: buildInteriorLayout };')({}, undefined);
    } catch (e) {
      console.warn(e);
      CK.aviso('No pude leer los interiores del juego: ' + e.message, 'error', 7000);
      return null;
    }
    const kinds = {};
    Object.keys(R.L).forEach(k => {
      if (/^ed_/.test(k)) return;
      try {
        kinds[k] = R.b(k);
      } catch (e) {
        console.warn('interior', k, e);
      }
    });
    // de qué archivo sale cada textura: se lee de la lista de carga del juego
    const tex = {},
      pre = (await CK.fs.texto(d, 'js/scene/assets_preload.js')) || '';
    for (const m of pre.matchAll(/getAsset\('([^']+)',\s*'([^']+\.png)'\)/g)) tex[m[1]] = { ruta: m[2] };
    for (const m of pre.matchAll(/load\.spritesheet\('([^']+)',[^{;]*\{\s*frameWidth:\s*(\d+),\s*frameHeight:\s*(\d+)/g))
      if (tex[m[1]]) {
        tex[m[1]].fw = +m[2];
        tex[m[1]].fh = +m[3];
      }
    return { kinds, tex };
  };
  /** Lista de salas techadas (las abiertas ya se traen como "mapas del juego"). */
  J.interiores = async function () {
    const r = await this.leerInteriores();
    if (!r) return [];
    const out = [];
    Object.keys(r.kinds).forEach(k =>
      Object.keys(r.kinds[k].areas).forEach(n => {
        const a = r.kinds[k].areas[n];
        if (a.groundKey) return;
        out.push({
          kind: k,
          area: n,
          nombre:
            (a.title || r.kinds[k].title || J.NOMBRES_INT[k] || k) +
            (Object.keys(r.kinds[k].areas).filter(x => !r.kinds[k].areas[x].groundKey).length > 1 && !a.title ? ' · ' + n : ''),
          a,
          lectura: r
        });
      })
    );
    return out;
  };
  J.importarInterior = async function (def) {
    const idx = await this.indice();
    if (!idx) return null;
    CK._ocupado = true;
    CK.estado('Importando ' + def.nombre + '…');
    try {
      const a = def.a,
        tex = def.lectura.tex,
        hojas = await this.hojas(),
        porClave = {},
        faltan = new Set();
      const rutaDe = k =>
        (tex[k] && tex[k].ruta) ||
        (hojas[k] && hojas[k].file) ||
        (/^int_/.test(k)
          ? 'assets/interiors/' + k.slice(4) + '.png'
          : /^cs_/.test(k)
            ? 'assets/castle/' + k.slice(3) + '.png'
            : /^ru_/.test(k)
              ? 'assets/ruins/' + k.slice(3) + '.png'
              : this._buscar(idx, k, ['assets/map', 'assets/interiors', 'assets/castle']));
      const png = async k => {
        const r = rutaDe(k);
        return r ? await this._png(r) : null;
      };
      const traer = async (k, anim) => {
        if (porClave[k] !== undefined) return porClave[k];
        const ya = Object.values(CK.P.assets).find(x => x.claveJuego === k || x.texJuego === k);
        if (ya) return (porClave[k] = ya.id);
        const c = await png(k);
        if (!c) {
          faltan.add(k);
          return (porClave[k] = null);
        }
        const hj = hojas[k],
          t = tex[k] || {},
          fw = (hj && hj.fw) || t.fw,
          fh = (hj && hj.fh) || t.fh,
          ruta = rutaDe(k);
        const o = {
          nombre: k.replace(/^(cs_|ru_|int_)/, ''),
          tipo: fw ? 'hoja' : 'sprite',
          lienzo: c,
          origen: 'juego: ' + ruta,
          extra: { claveJuego: k, rutaJuego: ruta, texJuego: k, animJuego: anim || '' },
          etiquetas: [def.kind]
        };
        if (fw) {
          const an = hj && hj.anims && (hj.anims[anim] || Object.values(hj.anims)[0]);
          o.cuadros = {
            fw,
            fh,
            fps: (an && an.fps) || 6,
            bucle: true,
            vaiven: !!(an && an.yoyo),
            orden: (an && an.frames) || (fw && c.width / fw > 6 ? [0, 1, 2, 3, 4, 5].filter(i => i < c.width / fw) : null)
          };
        }
        return (porClave[k] = CK.asset.crear(o).id);
      };
      // piso, pared y marco dibujados en una sola imagen de fondo
      const W = a.w,
        H = a.h,
        wallH = a.wallH || 56,
        side = a.side || 10,
        f = CK.lienzo(W, H),
        x = CK.ctx(f);
      x.imageSmoothingEnabled = false;
      const mosaico = async (k, rx, ry, rw, rh, color) => {
        const c = k ? await png(k) : null;
        if (c) {
          x.fillStyle = x.createPattern(c, 'repeat');
          x.save();
          x.translate(rx, ry);
          x.fillRect(0, 0, rw, rh);
          x.restore();
        } else {
          x.fillStyle = color;
          x.fillRect(rx, ry, rw, rh);
        }
      };
      await mosaico(a.floorTex, 0, wallH, W, H - wallH, '#b8884f');
      await mosaico(a.wallTex, 0, 0, W, wallH, '#d8c8a0');
      if (a.sideFace) {
        await mosaico('cs_wall_side_l', side, wallH, a.sideFace, H - wallH - side, '#4a4450');
        await mosaico('cs_wall_side_r', W - side - a.sideFace, wallH, a.sideFace, H - wallH - side, '#4a4450');
      }
      (a.rects || []).forEach(r => {
        x.globalAlpha = r.alpha === undefined ? 1 : r.alpha;
        x.fillStyle = hexDe(r.color);
        x.fillRect(r.x, r.y, r.w, r.h);
      });
      x.globalAlpha = 1;
      const trim = hexDe(a.trim === undefined ? 0x3a2414 : a.trim);
      x.fillStyle = trim;
      x.fillRect(0, 0, side, H);
      x.fillRect(W - side, 0, side, H);
      x.fillRect(0, 0, W, 4);
      if (a.frontDoor) {
        x.fillRect(0, H - side, a.frontDoor.x, side);
        x.fillRect(a.frontDoor.x + a.frontDoor.w, H - side, W - a.frontDoor.x - a.frontDoor.w, side);
        x.fillStyle = hexDe(a.mat === undefined ? 0xc9a15a : a.mat);
        x.fillRect(a.frontDoor.x + 2, H - side - 8, a.frontDoor.w - 4, 8);
      } else x.fillRect(0, H - side, W, side);
      if (a.trimHi !== undefined) {
        x.fillStyle = hexDe(a.trimHi);
        x.fillRect(side - 2, 4, 2, H - side - 2);
        x.fillRect(W - side, 4, 2, H - side - 2);
      }
      // muebles hechos con rectángulos: van pintados en el fondo
      (a.items || [])
        .filter(i => i.rects)
        .forEach(i =>
          i.rects.forEach(r => {
            x.globalAlpha = r.alpha === undefined ? 1 : r.alpha;
            x.fillStyle = hexDe(r.color);
            x.fillRect(r.x, r.y, r.w, r.h);
          })
        );
      x.globalAlpha = 1;
      const id = CK.slug(def.kind + '_' + def.area),
        fondo = CK.asset.crear({
          nombre: 'sala_' + id,
          tipo: 'fondo',
          lienzo: f,
          origen: 'juego: sala ' + def.kind + '.' + def.area,
          etiquetas: [def.kind]
        });
      const piso = [],
        objs = [];
      for (const it of a.items || []) {
        if (!it.key) continue;
        const aid = await traer(it.key, it.anim);
        const s = it.scale || 1;
        (it.floor ? piso : objs).push({
          id: CK.uid('o'),
          piso: it.floor ? true : undefined,
          asset: aid,
          clave: it.key,
          x: Math.round(it.x),
          y: Math.round(it.baseY),
          flipX: !!it.flipX,
          sx: s,
          sy: s,
          rot: 0,
          anim: it.anim || null
        });
      }
      (a.lights || []).forEach(l => {
        if (l.halo) return;
        objs.push({
          id: CK.uid('o'),
          tipo: 'luz',
          x: Math.round(l.x),
          y: Math.round(l.y),
          radio: Math.round(l.r || 40),
          color: hexDe(l.color === undefined ? 0xffc46b : l.color),
          fuerza: Math.min(1, (l.alpha || 0.3) / 0.55),
          parpadeo: 1
        });
      });
      objs.push({
        id: CK.uid('o'),
        tipo: 'punto',
        clase: 'aparicion',
        nombre: '',
        x: Math.round(a.spawn.x),
        y: Math.round(a.spawn.y),
        props: {}
      });
      (a.exits || []).forEach(e =>
        objs.push({
          id: CK.uid('o'),
          tipo: 'punto',
          clase: 'puerta',
          nombre: (e.hint || '').replace(/^[▲▼◀▶]\s*/, ''),
          x: Math.round(e.x + e.w / 2),
          y: Math.round(e.y + e.h),
          w: e.w,
          h: e.h,
          props: { destino: e.to === 'outside' ? '_aldea' : '', va: e.to }
        })
      );
      const mapa = CK.mapa.nuevoDatos(def.nombre, W, H, id);
      mapa.fondo = fondo.id;
      mapa.colorFondo = '#0b0a10';
      mapa.superficie = 'wood';
      mapa.origen = {
        tipo: 'interior',
        kind: def.kind,
        area: def.area,
        archivo: 'js/maps/' + (def.kind === 'castle' ? 'castle.js' : 'interiors/' + def.kind + '.js'),
        clave: def.kind + '.' + def.area
      };
      const capa = (nombre, lista) => ({
        id: CK.uid('c'),
        nombre,
        tipo: 'objetos',
        visible: true,
        bloqueada: false,
        opacidad: 1,
        orden: 'y',
        objetos: lista,
        grupos: []
      });
      mapa.capas = piso.length ? [capa('Alfombras', piso), capa('Objetos', objs)] : [capa('Objetos', objs)];
      mapa.colisiones = (a.colliders || []).map(k => ({
        id: CK.uid('k'),
        x: Math.round(k.x),
        y: Math.round(k.y),
        w: Math.round(k.w),
        h: Math.round(k.h)
      }));
      CK.P.mapas[mapa.id] = mapa;
      CK.tocar();
      CK.emit('mapas');
      CK.aviso(
        'Importada "' +
          def.nombre +
          '": ' +
          (objs.length + piso.length) +
          ' objetos, ' +
          mapa.colisiones.length +
          ' colisiones' +
          (faltan.size ? '. Sin imagen: ' + [...faltan].slice(0, 4).join(', ') : ''),
        faltan.size ? 'info' : 'ok',
        5000
      );
      return mapa;
    } finally {
      CK._ocupado = false;
      CK.estado('Listo');
    }
  };
  /** Copia un mapa que vino del juego como mapa propio: se puede cambiar todo y sale al juego por el cargador. */
  J.copiaPropia = function (m) {
    const c = CK.clone(m),
      base = CK.slug(m.nombre + ' mio');
    let id = base,
      n = 2;
    while (CK.P.mapas[id]) id = base + '_' + n++;
    c.id = id;
    c.nombre = m.nombre + ' (mío)';
    delete c.origen;
    c.capas.forEach(k => {
      k.id = CK.uid('c');
      (k.objetos || []).forEach(o => {
        o.id = CK.uid('o');
        delete o.clave;
        if (o.props && o.props.va) delete o.props.va;
      });
    });
    (c.colisiones || []).forEach(k => {
      k.id = CK.uid('k');
    });
    c.notas = [];
    CK.P.mapas[id] = c;
    CK.tocar();
    CK.emit('mapas');
    return c;
  };

  // la ventana de importar suma la lista de salas
  const ventana0 = J.ventanaImportar;
  J.ventanaImportar = async function () {
    const d = await this.dir();
    if (!d) return;
    const salas = await this.interiores();
    if (salas.length) {
      const l = CK.h('div.lista');
      salas.forEach(s => {
        const ya = CK.P.mapas[CK.slug(s.kind + '_' + s.area)];
        l.append(
          CK.h(
            'div.item',
            CK.h('span', { html: CK.ico('puerta', 16) }),
            CK.h('span.nombre', s.nombre),
            CK.h('span.sub', (J.NOMBRES_INT[s.kind] || s.kind) + ' · ' + s.a.w + '×' + s.a.h + ' · ' + s.a.items.length + ' objetos'),
            ya
              ? CK.h('span.etq.verde', 'ya importada')
              : CK.btn({
                  txt: 'Traer',
                  cls: 'chico pri',
                  on: async (e, b) => {
                    b.disabled = true;
                    b.textContent = 'Trayendo…';
                    await this.importarInterior(s);
                    b.replaceWith(CK.h('span.etq.verde', 'lista'));
                  }
                })
          )
        );
      });
      this._salas = CK.seccion(
        'Casas y salas del castillo',
        l,
        CK.h(
          'p.nota-txt',
          'Están escritas como código en el juego, así que llegan como referencia: se ven y se miden igual, pero cambiarlas acá no reescribe ese código. Para trabajar sobre una, usá "Hacer una copia editable" en la pestaña Mapa.'
        )
      );
    } else this._salas = null;
    return ventana0.apply(this, arguments);
  };
})();
