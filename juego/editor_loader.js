'use strict';
/* CARGADOR DEL TALLER (D:\Editor): hace que CastleKnight lea lo que se exporta desde el editor.
   Lee window.EDITOR_DATA (js/maps/data/editor_data.js) y window.EDITOR_ASSETS (js/maps/data/editor_assets.js) y agrega:
     · imágenes y animaciones nuevas            · mapas nuevos (suelo, objetos, colisiones, luces, puertas)
     · NPC que conversan por temas (texto libre)  · enemigos con ruta de patrulla
     · misiones por pasos                          · efectos de partículas       · música y ambiente por mapa
     · salto directo a un mapa:  index.html?ck_zona=<mapa>&ck_x=..&ck_y=..   (botón "Probar" del editor)  ·  F7: lista de mapas
   No cambia nada del juego original: si se quita su <script> de index.html, todo vuelve a ser como antes.
   Este archivo lo escribe el editor; no hace falta editarlo a mano. */
(function () {
  if (typeof MainGameScene === 'undefined') return;
  const D = window.EDITOR_DATA && window.EDITOR_DATA.mapas ? window.EDITOR_DATA : { mapas: {} },
    A = window.EDITOR_ASSETS || {};
  // Personajes de prueba en la aldea: archivo aparte y opcional. Si no existe, no pasa nada; borrarlo los saca del juego.
  try {
    document.write('<script src="js/maps/data/editor_prueba.js?v=' + Date.now().toString(36) + '"><\/script>');
  } catch (e) {}
  // Escenario del modo práctica (campo de entrenamiento): archivo aparte y opcional.
  try {
    document.write('<script src="js/maps/data/editor_practica.js?v=' + Date.now().toString(36) + '"><\/script>');
  } catch (e) {}
  // Sonido del Taller (reverberación por lugar, voces, pluma, respiración, puertas, ambientes): opcional, borrar los dos archivos lo saca.
  try {
    document.write('<script src="js/maps/data/editor_sonidos.js?v=' + Date.now().toString(36) + '"><\/script>');
    document.write('<script src="js/core/ck_sonido.js?v=' + Date.now().toString(36) + '"><\/script>');
  } catch (e) {}
  // Pruebas automáticas (pruebas.html abre index.html?pruebas=1): solo se cargan en ese caso.
  if (/[?&]pruebas=1/.test(location.search)) {
    try {
      document.write('<script src="js/core/ck_pruebas.js?v=' + Date.now().toString(36) + '"><\/script>');
    } catch (e) {}
  }
  const PR = () => window.EDITOR_PRUEBA || { imagenes: {}, paseantes: [] };
  const P = MainGameScene.prototype,
    Q = new URLSearchParams(location.search);
  const ED = (window.CK_EDITOR = { datos: D, indice: {}, npcs: {}, enemigos: {}, fxPts: {}, vivos: [], chat: null, salto: null });
  const propios = Object.keys(D.mapas).filter(id => !D.mapas[id].origen);
  const hexInt = h => parseInt(String(h || '#ffffff').replace('#', ''), 16);
  const mezcla = (hex, k) => {
    const c = hexInt(hex),
      r = (c >> 16) & 255,
      g = (c >> 8) & 255,
      b = c & 255,
      f = v => Math.round(255 + (v - 255) * k);
    return (f(r) << 16) | (f(g) << 8) | f(b);
  };
  const kindDe = id => 'ed_' + id,
    zonaDe = id => 'ed_' + id + '.main';

  // ------------------------------------------------------------------ 1. imágenes
  const preload0 = P.preload;
  P.preload = function () {
    preload0.apply(this, arguments);
    const PRA = window.EDITOR_PRACTICA;
    if (PRA) {
      Object.keys(PRA.imagenes || {}).forEach(key => {
        const im = PRA.imagenes[key];
        if (this.textures.exists(key)) return;
        if (im.fw) this.load.spritesheet(key, im.datos, { frameWidth: im.fw, frameHeight: im.fh });
        else this.load.image(key, im.datos);
      });
      Object.keys(PRA.tilesets || {}).forEach(k => {
        if (!this.textures.exists('pr_ts_' + k)) this.load.image('pr_ts_' + k, PRA.tilesets[k]);
      });
    }
    Object.keys(PR().imagenes || {}).forEach(key => {
      const im = PR().imagenes[key];
      if (!this.textures.exists(key)) this.load.spritesheet(key, im.datos, { frameWidth: im.fw, frameHeight: im.fh });
    });
    Object.keys(A).forEach(key => {
      const meta = (D.assets || {})[key];
      if (this.textures.exists(key)) return;
      if (meta && meta.cuadros) this.load.spritesheet(key, A[key], { frameWidth: meta.cuadros.fw, frameHeight: meta.cuadros.fh });
      else this.load.image(key, A[key]);
    });
  };
  const create0 = P.create;
  P.create = function () {
    const r = create0.apply(this, arguments);
    try {
      Object.keys(D.assets || {}).forEach(key => {
        const c = D.assets[key].cuadros;
        if (!c || !this.textures.exists(key) || this.anims.exists(key)) return;
        const n = this.textures.get(key).frameTotal - 1,
          orden = c.orden || [...Array(n).keys()];
        this.anims.create({
          key,
          frames: orden.map(i => ({ key, frame: i, duration: c.dur && c.dur[i] ? Math.max(0, c.dur[i] - 1000 / (c.fps || 8)) : 0 })),
          frameRate: c.fps || 8,
          repeat: c.bucle === false ? 0 : -1,
          yoyo: !!c.vaiven
        });
      });
      // texturas que un mapa con prefijo propio (las ruinas usan 'ru_') necesita ver con ese prefijo
      (D.alias || []).concat(Object.keys(A)).forEach(k => {
        const dst = 'ru_' + k;
        if (!this.textures.exists(k) || this.textures.exists(dst)) return;
        const t = this.textures.get(k),
          src = t.getSourceImage(),
          c = (D.assets[k] || {}).cuadros;
        if (c) {
          this.textures.addSpriteSheet(dst, src, { frameWidth: c.fw, frameHeight: c.fh });
        } else if (t.frameTotal > 2) {
          const f = t.get(0);
          this.textures.addSpriteSheet(dst, src, { frameWidth: f.width, frameHeight: f.height });
        } else this.textures.addImage(dst, src);
      });
    } catch (e) {
      console.warn('[Taller] animaciones:', e);
    }
    // paseantes de prueba: caminan de punto en punto por la aldea
    try {
      // cada paseante puede traer 'anims' con 4 direcciones (anda_/quieto_ + sur, norte, este; el oeste es el este espejado)
      const animDe = key => {
        const im = PR().imagenes[key] || {};
        if (!this.textures.exists(key)) return null;
        if (!this.anims.exists(key))
          this.anims.create({
            key,
            frames: [...Array(this.textures.get(key).frameTotal - 1).keys()].map(i => ({ key, frame: i })),
            frameRate: im.fps || 9,
            repeat: -1
          });
        return key;
      };
      ED.paseantes = (PR().paseantes || [])
        .filter(p => this.textures.exists(p.sprite))
        .map(p => {
          const im = PR().imagenes[p.sprite] || {},
            n = this.textures.get(p.sprite).frameTotal - 1;
          if (!this.anims.exists(p.sprite + '_anda'))
            this.anims.create({
              key: p.sprite + '_anda',
              frames: [...Array(n).keys()].map(i => ({ key: p.sprite, frame: i })),
              frameRate: im.fps || 9,
              repeat: -1
            });
          const an = {};
          Object.keys(p.anims || {}).forEach(k => {
            const a = animDe(p.anims[k]);
            if (a) an[k] = a;
          });
          const sp = this.add
            .sprite(p.ruta[0][0], p.ruta[0][1], p.sprite)
            .setOrigin(0.5, 1)
            .setScale(p.escala || 1)
            .setDepth(p.ruta[0][1]);
          sp.play(an.anda_sur || p.sprite + '_anda');
          return { sp, p, an, dir: 'sur', i: 1 % p.ruta.length, espera: 0 };
        });
    } catch (e) {
      console.warn('[Taller] paseantes:', e);
    }
    return r;
  };

  // ------------------------------------------------------------------ 2. mapas nuevos como zonas del juego
  let idx = 12;
  propios.forEach(id => {
    const m = D.mapas[id];
    ED.indice[id] = idx;
    idx += Math.max(1, Math.ceil((m.w + 200) / 1400));
    const zona = zonaDe(id);
    ED.npcs[zona] = (m.npcs || []).slice();
    ED.fxPts[zona] = (m.fx || []).slice();
    ED.enemigos[zona] = (m.enemigos || []).filter(e => e.ruta && e.ruta.length > 1);
    const sueltos = (m.enemigos || []).filter(e => !(e.ruta && e.ruta.length > 1) && ENEMY_TYPES[e.tipo]);
    if ((m.enemigos || []).length)
      ZONE_ENEMIES[zona] = sueltos.map(e => (e.noche ? [e.tipo, e.x, e.y, e.radio || 40, 'night'] : [e.tipo, e.x, e.y, e.radio || 40]));
    INTERIOR_LAYOUTS[kindDe(id)] = function (kit) {
      const a = {
        w: m.w,
        h: m.h,
        outdoor: true,
        groundKey: m.suelo,
        surface: m.superficie || 'grass',
        title: m.titulo || m.nombre,
        rects: [],
        items: [],
        colliders: [],
        doors: [],
        exits: [],
        actors: [],
        portals: [],
        lights: [],
        polys: [],
        fx: [],
        talkers: [],
        spawn: m.aparicion ? { x: m.aparicion.x, y: m.aparicion.y } : { x: m.w / 2, y: m.h - 30 },
        ambient: m.sonido || []
      };
      if (m.ambiente && m.ambiente.fuerza > 0) a.grade = mezcla(m.ambiente.color, Math.min(1, m.ambiente.fuerza));
      (m.items || []).forEach(([key, x, y, flip, anim, o]) => {
        const it = { key, x, baseY: y, scale: (o && o.escala) || 1, flipX: !!flip, shadow: 0, fallback: { w: 16, h: 16, color: 0x6b6258 } };
        if (anim) it.anim = anim;
        if (o && o.piso) it.floor = true;
        a.items.push(it);
      });
      (m.cols || []).forEach(([x, y, w, h]) => a.colliders.push({ x, y, w, h }));
      (m.luces || []).forEach(l => {
        const c = hexInt(l.color),
          f = l.fuerza === undefined ? 0.5 : l.fuerza;
        kit.light(a, l.x, l.y + 4, l.radio, c, f * 0.55);
        kit.light(a, l.x, l.y - 6, Math.max(8, l.radio * 0.3), c, f * 0.6, { halo: true });
      });
      (m.npcs || []).forEach(n => {
        const look = (typeof STUDIO_LOOKS !== 'undefined' && STUDIO_LOOKS[n.aspecto]) || null;
        if (n.sprite && A[n.sprite])
          a.items.push({
            key: n.sprite,
            anim: (D.assets[n.sprite] || {}).cuadros ? n.sprite : undefined,
            x: n.x,
            baseY: n.y,
            scale: n.escala || 1,
            flipX: !!n.flip
          });
        else if (look)
          a.items.push({
            key: look.tex,
            anim: look.idle,
            x: n.x,
            baseY: n.y,
            scale: n.escala || look.scale[0],
            oy: look.oy,
            flipX: !!n.flip
          });
        a.colliders.push({ x: n.x - 7, y: n.y - 8, w: 14, h: 8 });
      });
      (m.puertas || []).forEach(p => {
        if (p.destino === '_aldea')
          a.exits.push({ x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h, key: 'walk', to: 'outside', hint: p.nombre || '' });
      });
      kit.areas.main = a;
      return { title: a.title, start: 'main' };
    };
  });
  ED.mapaDeZona = zona => {
    const m = /^ed_(.+)\.main$/.exec(zona || '');
    return m && D.mapas[m[1]] ? m[1] : null;
  };

  /** Entra a un mapa del editor. llegada = nombre de un punto del mapa, o {x, y}. */
  P.ckEntrar = function (id, llegada) {
    const m = D.mapas[id];
    if (!m || m.origen || this._doorTransition || this._gameMode !== 'campaign') return false;
    if (!this.currentInterior) {
      const b = this.player.body;
      this._interiorReturn = { x: b.center.x, y: b.center.y + 26, zoom: this.cameras.main.zoom };
    }
    this.fadeTransition(() => {
      if (this.currentInterior) this.setInteriorVisible(null);
      const building = this.buildInterior({ _houseName: 'Ed_' + id, _interiorIndex: ED.indice[id], _interiorKind: kindDe(id) }),
        area = building.areas.main;
      this.currentInterior = { building, areaName: 'main', area };
      this._areaSwitchHold = true;
      const p = typeof llegada === 'string' ? (m.puntos || {})[llegada] : llegada,
        at = p ? { x: area.x + p.x, y: area.y + p.y } : area.spawn;
      this.showInteriorArea(area, at);
      this.createFloatingText(at.x, at.y - 40, area.title || m.nombre, 0xfde68a);
    });
    return true;
  };
  window.ckIr = (id, x, y) => {
    const s = window.activeGameScene;
    return s && s.ckEntrar(id, x !== undefined ? { x, y } : undefined);
  };

  // ------------------------------------------------------------------ 3. al entrar a una zona: enemigos con ruta y efectos
  const areaShown0 = P.onAreaShown;
  P.onAreaShown = function (area, at) {
    if (areaShown0) areaShown0.apply(this, arguments);
    limpiarFx(this);
    if (this._gameMode !== 'campaign' || !area) return;
    (ED.enemigos[area.key] || []).forEach(def => {
      if (!ENEMY_TYPES[def.tipo] || (def.noche && !(this.isNight && this.isNight()))) return;
      const e = this.spawnEnemy(area.x + def.ruta[0][0], area.y + def.ruta[0][1] - 26, def.tipo);
      if (!e) return;
      e.zone = area.key;
      e._ruta = def.ruta.map(p => [area.x + p[0], area.y + p[1] - 26]);
      e._ri = 1;
      e._espera = 0;
    });
    (ED.fxPts[area.key] || []).forEach(p => {
      if (D.fx && D.fx[p.fx]) this.ckFx(p.fx, area.x + p.x, area.y + p.y, { fijo: true });
    });
  };
  const villageShown0 = P.onVillageShown;
  P.onVillageShown = function () {
    limpiarFx(this);
    if (villageShown0) villageShown0.apply(this, arguments);
  };

  // ------------------------------------------------------------------ 4. efectos (js/core/ck_fx.js)
  const limpiarFx = s => {
    ED.vivos.forEach(v => {
      v.img.destroy();
      if (s.textures.exists(v.key)) s.textures.remove(v.key);
    });
    ED.vivos = [];
  };
  let nFx = 0;
  /** Reproduce un efecto del editor en (x, y) del mundo. o.fijo = queda en loop hasta salir de la zona. */
  P.ckFx = function (id, x, y, o) {
    const def = D.fx && D.fx[id];
    if (!def || typeof CKFx === 'undefined') return null;
    o = o || {};
    const W = 260,
      H = 190,
      key = 'ckfx_' + nFx++,
      tex = this.textures.createCanvas(key, W, H),
      ox = def.mov && def.mov.vx > 0 ? 40 : def.mov && def.mov.vx < 0 ? W - 40 : W / 2,
      oy = H * 0.62;
    const img = this.add
      .image(x, y, key)
      .setOrigin(ox / W, oy / H)
      .setDepth(o.depth !== undefined ? o.depth : y + 2);
    const sim = CKFx.crear(o.fijo ? Object.assign({}, def, { bucle: true }) : Object.assign({}, def, { bucle: false }), {
      semilla: 1 + nFx
    });
    if (def.sonido && typeof sfx !== 'undefined') {
      try {
        sfx.fx(def.sonido, def.volumen === undefined ? 0.7 : def.volumen);
      } catch (e) {}
    }
    const v = { key, tex, img, sim, ox, oy, fijo: !!o.fijo };
    ED.vivos.push(v);
    return v;
  };
  const recurso = s => id => {
    if (!s.textures.exists(id)) return null;
    const t = s.textures.get(id),
      n = Math.max(1, t.frameTotal - 1),
      src = t.getSourceImage();
    return {
      img: src,
      n,
      cuadro: i => {
        const f = t.get(n > 1 ? i : '__BASE');
        return { x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight };
      }
    };
  };

  // ------------------------------------------------------------------ 5. NPC que conversan por temas (js/core/ck_dialogo.js)
  const estilo = document.createElement('style');
  estilo.textContent =
    '#ck-chat{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(620px,92%);padding:12px 14px;background:rgba(20,14,10,.94);border:2px solid #c9a15a;border-radius:6px;color:#f5ead0;font-family:Pixuf,MedievalSharp,monospace;font-size:15px;z-index:60;display:none;box-shadow:0 6px 0 rgba(0,0,0,.45)}#ck-chat.on{display:block}#ck-chat .n{color:#fde68a;font-size:13px;margin-bottom:4px}#ck-chat .t{min-height:44px;line-height:1.35}#ck-chat .p{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 6px}#ck-chat .p button{font:inherit;font-size:12px;padding:2px 9px;background:#3b2a1a;color:#fde68a;border:1px solid #8a6a3a;border-radius:4px;cursor:pointer}#ck-chat .p button:hover{background:#5a4024}#ck-chat input{width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;background:#0f0b08;color:#fff;border:1px solid #8a6a3a;border-radius:4px;outline:none}#ck-chat .a{font-size:11px;color:#b8a888;margin-top:5px}#ck-mision{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.18);font-size:.92em}#ck-mapas{position:absolute;left:12px;top:12px;z-index:70;background:rgba(20,14,10,.95);border:2px solid #c9a15a;border-radius:6px;padding:8px;color:#f5ead0;font:13px Pixuf,monospace;display:none}#ck-mapas.on{display:block}#ck-mapas div{padding:3px 8px;cursor:pointer}#ck-mapas div:hover{background:#5a4024}';
  document.head.appendChild(estilo);
  const anfitrion = () => document.getElementById('game-wrapper') || document.body;
  const banderas = s => {
    const b = {};
    Object.keys((s.story && s.story.flags) || {}).forEach(k => {
      if (s.story.flags[k]) b[k] = true;
    });
    if (s.isNight && s.isNight()) b.noche = true;
    b['heroe:' + s.playerHero] = true;
    return b;
  };
  const cercano = s => {
    if (!s.currentInterior || !s.player || !s.player.body) return null;
    const a = s.currentInterior.area,
      l = ED.npcs[a.key] || [],
      b = s.player.body;
    let mejor = null,
      dm = 48;
    l.forEach(n => {
      if (!n.npc || !D.npcs[n.npc]) return;
      const d = Phaser.Math.Distance.Between(b.center.x, b.center.y, a.x + n.x, a.y + n.y - 6);
      if (d < dm) {
        dm = d;
        mejor = n;
      }
    });
    return mejor;
  };
  const abrirChat = (s, punto) => {
    const npc = D.npcs[punto.npc];
    if (!npc || typeof CKDialogo === 'undefined') return;
    let el = document.getElementById('ck-chat');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ck-chat';
      el.innerHTML =
        '<div class="n"></div><div class="t"></div><div class="p"></div><input type="text" maxlength="90" placeholder="Escribí tu pregunta…"><div class="a">Enter: decir · Esc: despedirse</div>';
      anfitrion().appendChild(el);
    }
    s.story.ck = s.story.ck || {};
    s.story.ck.npc = s.story.ck.npc || {};
    const est = (s.story.ck.npc[npc.id || punto.npc] = s.story.ck.npc[npc.id || punto.npc] || { vistos: {}, turno: {} });
    const nom = el.querySelector('.n'),
      txt = el.querySelector('.t'),
      pis = el.querySelector('.p'),
      inp = el.querySelector('input');
    const pistas = () => {
      pis.innerHTML = '';
      CKDialogo.sugerencias(npc, est, 3).forEach(t => {
        const b = document.createElement('button');
        b.textContent = t;
        b.onclick = () => decir(t);
        pis.appendChild(b);
      });
    };
    const decir = t => {
      t = String(t || '').trim();
      if (!t) return;
      est.banderas = banderas(s);
      const r = CKDialogo.responder(npc, t, est);
      txt.textContent = r.texto;
      inp.value = '';
      pistas();
      if (r.tema) evento(s, 'tema', { npc: punto.npc, tema: r.tema });
      if (r.modo === 'despedida') setTimeout(cerrar, 900);
      inp.focus();
    };
    const cerrar = () => {
      el.classList.remove('on');
      ED.chat = null;
      s.dialogOpen = false;
      s.input.keyboard.enabled = true;
      if (s.input.keyboard.enableGlobalCapture) s.input.keyboard.enableGlobalCapture();
      delete est.banderas;
      s.saveStory();
      inp.onkeydown = null;
    };
    nom.textContent = npc.nombre + (npc.oficio ? ' · ' + npc.oficio : '');
    est.banderas = banderas(s);
    txt.textContent = npc.saludo && npc.saludo.length ? npc.saludo[(est.turno._saludo || 0) % npc.saludo.length] : 'Hola.';
    est.turno._saludo = (est.turno._saludo || 0) + 1;
    pistas();
    el.classList.add('on');
    ED.chat = { cerrar };
    s.dialogOpen = true;
    s.player.setVelocity(0, 0);
    s.input.keyboard.enabled = false;
    if (s.input.keyboard.disableGlobalCapture) s.input.keyboard.disableGlobalCapture();
    inp.onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter') decir(inp.value);
      else if (e.key === 'Escape') cerrar();
    };
    setTimeout(() => inp.focus(), 30);
    evento(s, 'hablar', { npc: punto.npc });
  };
  const interact0 = P.interact;
  P.interact = function () {
    if (ED.chat) return;
    if (this._gameMode === 'campaign' && this.story && !this.dialogOpen && !this._overlay && !this.isDead && !this._doorTransition) {
      const n = cercano(this);
      if (n) {
        abrirChat(this, n);
        return;
      }
    }
    return interact0.apply(this, arguments);
  };

  // ------------------------------------------------------------------ 6. misiones
  const estadoM = s => {
    s.story.ck = s.story.ck || {};
    return (s.story.ck.m = s.story.ck.m || {});
  };
  const activas = s =>
    (D.misiones || []).filter(m => {
      const e = estadoM(s)[m.id];
      return !(e && e.hecha) && (!m.requiere || s.story.flags[m.requiere]) && (m.pasos || []).length;
    });
  const avanzar = (s, m) => {
    const e = (estadoM(s)[m.id] = estadoM(s)[m.id] || { paso: 0, cuenta: 0 }),
      paso = m.pasos[e.paso];
    s.story.flags['paso:' + m.id + ':' + (e.paso + 1)] = true;
    if (paso.bandera && paso.tipo !== 'bandera') s.story.flags[paso.bandera] = true;
    s.createFloatingText(s.player.x, s.player.y - 46, '✓ ' + (paso.texto || 'Paso cumplido'), 0x86efac);
    e.paso++;
    e.cuenta = 0;
    if (e.paso >= m.pasos.length) {
      e.hecha = true;
      s.story.flags['mision:' + m.id] = true;
      const r = m.recompensa || {};
      if (r.monedas) s.story.coins += r.monedas;
      if (r.exp && s.gainXP) s.gainXP(r.exp);
      if (r.bandera) s.story.flags[r.bandera] = true;
      if (s.showZoneTitle) s.showZoneTitle('Misión cumplida', m.nombre + (r.monedas ? '  ·  +' + r.monedas + ' monedas' : ''));
      if (typeof sfx !== 'undefined') {
        try {
          sfx.fx('ui_click', 0.8);
        } catch (err) {}
      }
    }
    pintarMision(s);
    if (s.updateHUD) s.updateHUD();
    s.saveStory();
  };
  const evento = (s, tipo, d) => {
    if (!s.story) return;
    activas(s).forEach(m => {
      const e = estadoM(s)[m.id] || { paso: 0, cuenta: 0 },
        p = m.pasos[e.paso];
      if (!p || p.tipo !== tipo) return;
      if (tipo === 'hablar' && p.npc === d.npc) avanzar(s, m);
      else if (tipo === 'tema' && p.npc === d.npc && (!p.tema || p.tema === d.tema)) avanzar(s, m);
      else if (tipo === 'derrotar' && (!p.enemigo || p.enemigo === d.tipo) && (!p.mapa || zonaDe(p.mapa) === d.zona || p.mapa === d.zona)) {
        estadoM(s)[m.id] = e;
        e.cuenta = (e.cuenta || 0) + 1;
        if (e.cuenta >= (p.cantidad || 1)) avanzar(s, m);
        else {
          pintarMision(s);
          s.saveStory();
        }
      }
    });
  };
  const pintarMision = s => {
    const caja = document.getElementById('ck-objective');
    if (!caja) return;
    let el = document.getElementById('ck-mision');
    const l = s.story ? activas(s) : [];
    if (!l.length) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'ck-mision';
      caja.appendChild(el);
    }
    el.innerHTML = '';
    l.slice(0, 2).forEach(m => {
      const e = estadoM(s)[m.id] || { paso: 0, cuenta: 0 },
        p = m.pasos[e.paso],
        d = document.createElement('div');
      d.textContent =
        '◆ ' +
        m.nombre +
        ': ' +
        (p.texto || '') +
        (p.tipo === 'derrotar' && (p.cantidad || 1) > 1 ? ' (' + (e.cuenta || 0) + '/' + p.cantidad + ')' : '');
      el.appendChild(d);
    });
  };
  const derrotado0 = P.onEnemyDefeated;
  P.onEnemyDefeated = function (enemy, def) {
    const r = derrotado0 ? derrotado0.apply(this, arguments) : undefined;
    try {
      if (this._gameMode === 'campaign' && this.story) evento(this, 'derrotar', { tipo: enemy.type, zona: enemy.zone });
    } catch (e) {
      console.warn('[Taller]', e);
    }
    return r;
  };
  const objetivo0 = P.updateObjective;
  P.updateObjective = function () {
    const r = objetivo0 ? objetivo0.apply(this, arguments) : undefined;
    try {
      pintarMision(this);
    } catch (e) {}
    return r;
  };

  // ------------------------------------------------------------------ 7. música por mapa
  const musica0 = P.musicForZone;
  P.musicForZone = function (key) {
    ED.musica.escena = this;
    const id = ED.mapaDeZona(key),
      base = musica0.apply(this, arguments);
    if (id && base !== 'boss' && D.mapas[id].musica) return D.mapas[id].musica;
    if (base !== 'village') return base;
    const c = this.currentInterior;
    if (c && c.building && c.building.kind === 'bar') return 'taberna'; // la taberna tiene su tema
    if (!c && this.isNight && this.isNight()) return 'noche'; // aldea de noche
    return base;
  };

  // Temas grabados extra (assets/Music/<nombre>.mp3). Se precargan para que estén listos al entrar a
  // la zona, y los cambios de tema se hacen con un fundido corto en vez de un corte seco.
  const TEMAS = ['castle', 'ruins', 'boss', 'taberna', 'noche', 'practica'];
  ED.musica = {
    precargar() {
      if (typeof music === 'undefined' || !music.audioElements) return;
      TEMAS.forEach(n => {
        if (music.audioElements[n] !== undefined) return;
        const a = new Audio('assets/Music/' + n + '.mp3');
        a.loop = true;
        a.preload = 'auto';
        a.volume = music.enabled ? music.volume : 0;
        a.addEventListener('error', () => {
          if (music.audioElements[n] === a) music.audioElements[n] = null;
        });
        // si la escena ya pidió este tema mientras cargaba, arranca apenas esté listo
        a.addEventListener('canplaythrough', () => {
          const s = ED.musica.escena;
          if (s && s._zoneMusic === n && music.currentTrack !== n && s.playZoneMusic) s.playZoneMusic(n);
        });
        music.audioElements[n] = a;
      });
    },
    fundido(el, hasta, ms, fin) {
      clearInterval(el._ckFade);
      const desde = el.volume,
        t0 = Date.now();
      el._ckFade = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / ms);
        try {
          el.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * k));
        } catch (e) {}
        if (k >= 1) {
          clearInterval(el._ckFade);
          el._ckFade = null;
          if (fin) fin();
        }
      }, 30);
    }
  };
  if (typeof music !== 'undefined' && music && !music._ckFundido) {
    music._ckFundido = true;
    const stop0 = music.stopAll.bind(music),
      M = ED.musica;
    const cortar = el => {
      if (el._ckFade) {
        clearInterval(el._ckFade);
        el._ckFade = null;
      }
    };
    music.play = function (track) {
      this.init();
      M.precargar();
      this._pendingTrack = track;
      const nuevo = this.audioElements[track];
      if (this.currentTrack === track && nuevo && !nuevo.paused && !nuevo._ckSale) return;
      Object.keys(this.audioElements).forEach(k => {
        const el = this.audioElements[k];
        if (!el || k === track) return;
        if (!el.paused && this.enabled && el.volume > 0) {
          // el que suena se apaga de a poco
          el._ckSale = true;
          M.fundido(el, 0, 700, () => {
            el._ckSale = false;
            if (music.audioElements[music.currentTrack] !== el) {
              el.pause();
              try {
                el.currentTime = 0;
              } catch (e) {}
            }
          });
        } else {
          cortar(el);
          el._ckSale = false;
          try {
            el.pause();
            el.currentTime = 0;
          } catch (e) {}
        }
      });
      if (!nuevo) return;
      this.currentTrack = track;
      cortar(nuevo);
      nuevo._ckSale = false;
      const meta = this.enabled ? this.volume : 0;
      if (nuevo.paused) nuevo.volume = 0;
      const pr = nuevo.play();
      if (pr !== undefined) pr.catch(() => {});
      if (meta > 0) M.fundido(nuevo, meta, 900);
      else nuevo.volume = 0;
    };
    music.stopAll = function () {
      Object.keys(this.audioElements).forEach(k => {
        const el = this.audioElements[k];
        if (el) {
          cortar(el);
          el._ckSale = false;
        }
      });
      return stop0();
    };
    const vol0 = music.setVolume.bind(music);
    music.setVolume = function (v) {
      Object.keys(this.audioElements).forEach(k => {
        const el = this.audioElements[k];
        if (el && !el._ckSale) cortar(el);
      });
      return vol0(v);
    };
    M.precargar();
  }

  // ------------------------------------------------------------------ 8. cada cuadro
  const story0 = P.updateStory;
  P.updateStory = function (dt) {
    story0.apply(this, arguments);
    try {
      (ED.paseantes || []).forEach(w => {
        const sp = w.sp,
          t = w.p.ruta[w.i],
          dx = t[0] - sp.x,
          dy = t[1] - sp.y,
          d = Math.hypot(dx, dy),
          now = this.time.now,
          an = w.an || {};
        const poner = k => {
          if (an[k]) {
            if (sp.anims.getName() !== an[k]) sp.play(an[k]);
            if (sp.anims.isPaused) sp.anims.resume();
            return true;
          }
          return false;
        };
        if (now < w.espera) {
          if (!poner('quieto_' + w.dir) && sp.anims.isPlaying) sp.anims.pause();
          return;
        }
        if (d < 1.5) {
          w.i = (w.i + 1) % w.p.ruta.length;
          w.espera = now + (w.p.pausa === undefined ? 900 : w.p.pausa);
          return;
        }
        w.dir = Math.abs(dx) >= Math.abs(dy) ? 'este' : dy > 0 ? 'sur' : 'norte';
        if (!poner('anda_' + w.dir)) {
          if (sp.anims.getName() !== w.p.sprite + '_anda') sp.play(w.p.sprite + '_anda');
          if (sp.anims.isPaused) sp.anims.resume();
        }
        const v = ((w.p.vel || 22) * Math.min(100, dt)) / 1000;
        sp.x += (dx / d) * Math.min(v, d);
        sp.y += (dy / d) * Math.min(v, d);
        if (w.dir === 'este' || !an.anda_sur) {
          if (Math.abs(dx) > 0.5) sp.setFlipX(dx < 0);
        } else sp.setFlipX(false);
        sp.setDepth(Math.round(sp.y));
      });
    } catch (e) {}
    if (this._gameMode !== 'campaign' || !this.story) return;
    try {
      cadaCuadro(this, dt);
    } catch (e) {
      if (!ED._avisado) {
        ED._avisado = true;
        console.warn('[Taller]', e);
      }
    }
  };
  const cadaCuadro = (s, dt) => {
    const c = s.currentInterior,
      b = s.player.body,
      now = s.time.now;
    // efectos
    for (let i = ED.vivos.length - 1; i >= 0; i--) {
      const v = ED.vivos[i],
        x = v.tex.getContext();
      v.sim.paso(Math.min(0.05, dt / 1000));
      x.clearRect(0, 0, v.tex.width, v.tex.height);
      v.sim.dibujar(x, v.ox, v.oy, recurso(s));
      v.tex.refresh();
      if (!v.fijo && v.sim.fin) {
        v.img.destroy();
        s.textures.remove(v.key);
        ED.vivos.splice(i, 1);
      }
    }
    // salto directo pedido por el editor (?ck_zona=…)
    if (ED.salto && !s._doorTransition && !s.dialogOpen) {
      const j = ED.salto;
      if (j.fase === 0) {
        j.fase = 1;
        if (D.mapas[j.zona] && !D.mapas[j.zona].origen) s.ckEntrar(j.zona, j.x !== null ? { x: j.x, y: j.y } : undefined);
        else if (j.zona === 'ruins' && s.enterRuins) s.enterRuins();
        else if (s.enterCastle && ['road', 'garden', 'walls', 'training', 'courtyard'].includes(j.zona)) s.enterCastle();
        else ED.salto = null;
      } else if (j.fase === 1 && c) {
        j.fase = 2;
        if (c.building.kind === 'castle' && c.areaName !== j.zona && c.building.areas[j.zona]) {
          s.switchInteriorArea(j.zona, j.x !== null ? { x: j.x, y: j.y } : undefined);
          ED.salto = null;
        } else {
          if (j.x !== null && !ED.mapaDeZona(c.area.key)) s.placePlayerFeetAt(c.area.x + j.x, c.area.y + j.y);
          ED.salto = null;
        }
      }
    }
    if (ED.chat) return;
    // entrada desde la aldea y puertas entre mapas del editor
    if (!s._doorTransition) {
      if (!c) {
        for (const id of propios) {
          const en = D.mapas[id].entrada;
          if (en && Math.abs(b.center.x - en.x) < (en.r || 14) && Math.abs(b.center.y - en.y) < (en.r || 14)) {
            s.ckEntrar(id);
            break;
          }
        }
      } else {
        const id = ED.mapaDeZona(c.area.key);
        if (id && !s._areaSwitchHold)
          for (const p of D.mapas[id].puertas || []) {
            if (p.destino === '_aldea' || !D.mapas[p.destino]) continue;
            const x0 = c.area.x + p.x - p.w / 2,
              y0 = c.area.y + p.y - p.h;
            if (b.center.x >= x0 && b.center.x <= x0 + p.w && b.center.y >= y0 && b.center.y <= y0 + p.h) {
              s.ckEntrar(p.destino, p.llegada || undefined);
              break;
            }
          }
        if (id && s._areaSwitchHold) {
          const dentro = (D.mapas[id].puertas || []).some(p => {
            const x0 = c.area.x + p.x - p.w / 2,
              y0 = c.area.y + p.y - p.h;
            return b.center.x >= x0 - 4 && b.center.x <= x0 + p.w + 4 && b.center.y >= y0 - 4 && b.center.y <= y0 + p.h + 4;
          });
          if (!dentro) s._areaSwitchHold = false;
        }
      }
    }
    // cartel "T · Hablar con …"
    const n = !s.dialogOpen && cercano(s),
      pr = document.getElementById('ck-prompt');
    if (n && pr && !pr.classList.contains('on')) {
      pr.textContent = 'T · Hablar con ' + D.npcs[n.npc].nombre;
      pr.classList.add('on');
    }
    // patrullas: mientras no vean al héroe, caminan de punto en punto
    if (s.enemies)
      s.enemies.getChildren().forEach(e => {
        if (!e.active || e.isDead || !e._ruta || (e.state !== 'idle' && e.state !== 'patrol')) return;
        e.patrolTimer = now + 60000;
        const t = e._ruta[e._ri],
          dx = t[0] - e.x,
          dy = t[1] - e.y,
          d = Math.hypot(dx, dy);
        if (now < e._espera) {
          e.setVelocity(0, 0);
          e.state = 'idle';
          if (e.anims.currentAnim && e.anims.currentAnim.key !== e.type + '_idle') e.play(e.type + '_idle');
          return;
        }
        if (d < 6) {
          e._ri = (e._ri + 1) % e._ruta.length;
          e._espera = now + 700;
          return;
        }
        const v = Math.min(46, (e.def.speed || 80) * 0.5);
        e.state = 'patrol';
        e.patrolVx = (dx / d) * v;
        e.patrolVy = (dy / d) * v;
        e.setVelocity(e.patrolVx, e.patrolVy);
        if (Math.abs(dx) > 2) {
          e.facing = dx < 0 ? 'left' : 'right';
          e.setFlipX(dx < 0);
        }
        if (e.anims.currentAnim && e.anims.currentAnim.key !== e.type + '_walk' && s.anims.exists(e.type + '_walk'))
          e.play(e.type + '_walk');
      });
    // misiones: pasos de "llegar a" y "tener"
    activas(s).forEach(m => {
      const e = estadoM(s)[m.id] || { paso: 0 },
        p = m.pasos[e.paso];
      if (!p) return;
      if (p.tipo === 'bandera' && p.bandera && s.story.flags[p.bandera]) avanzar(s, m);
      else if (p.tipo === 'llegar' && c && ED.mapaDeZona(c.area.key) === p.mapa) {
        const pt = (D.mapas[p.mapa].puntos || {})[p.punto];
        if (pt && Phaser.Math.Distance.Between(b.center.x, b.center.y, c.area.x + pt.x, c.area.y + pt.y) < (p.radio || 28)) avanzar(s, m);
      }
    });
  };

  // ------------------------------------------------------------------ 9. Probar desde el editor y lista de mapas (F7)
  if (Q.get('ck_zona')) {
    ED.salto = {
      zona: Q.get('ck_zona'),
      x: Q.get('ck_x') !== null ? +Q.get('ck_x') : null,
      y: Q.get('ck_y') !== null ? +Q.get('ck_y') : null,
      fase: 0
    };
    window._pendingAutoStart = 'campaign';
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'F7') return;
    const s = window.activeGameScene;
    if (!s || s._gameMode !== 'campaign' || !propios.length) return;
    e.preventDefault();
    let el = document.getElementById('ck-mapas');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ck-mapas';
      anfitrion().appendChild(el);
    }
    if (el.classList.toggle('on')) {
      el.innerHTML = '<b>Mapas del Taller</b>';
      propios.forEach(id => {
        const d = document.createElement('div');
        d.textContent = D.mapas[id].nombre;
        d.onclick = () => {
          el.classList.remove('on');
          s.ckEntrar(id);
        };
        el.appendChild(d);
      });
    }
  });
  console.log(
    '[Taller] cargador activo: ' +
      propios.length +
      ' mapa(s), ' +
      Object.keys(D.npcs || {}).length +
      ' NPC, ' +
      Object.keys(D.fx || {}).length +
      ' efecto(s), ' +
      (D.misiones || []).length +
      ' misión(es). F7: ir a un mapa.'
  );
  // ------------------------------------------------------------------ 9. escenario del modo práctica
  // Campo de entrenamiento armado con assets del Taller (js/maps/data/editor_practica.js). Sin ese archivo, la práctica queda como siempre.
  const PRAC = {
    partes: [],
    obst: [],
    casa: null,
    limpiar(s) {
      this.partes.forEach(o => {
        try {
          o.destroy();
        } catch (e) {}
      });
      this.partes = [];
      this.casa = null;
      if (s && s.meadowTileSprite) s.meadowTileSprite.setVisible(true);
      if (s && s.groundGfx) s.groundGfx.setVisible(true);
    },
    suelo(s, D) {
      const key = 'pr_suelo';
      if (!s.textures.exists(key)) {
        const T = D.tile,
          N = D.n,
          c = document.createElement('canvas');
        c.width = T * N;
        c.height = T * N;
        const x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        const tp = s.textures.get('pr_ts_pasto').getSourceImage(),
          tc = s.textures.get('pr_ts_camino').getSourceImage(),
          cp = Math.floor(tp.width / T),
          cc = Math.floor(tc.width / T);
        for (let i = 0; i < N * N; i++) {
          const dx = (i % N) * T,
            dy = Math.floor(i / N) * T,
            g = D.pasto[i],
            r = D.camino[i];
          x.drawImage(tp, (g % cp) * T, Math.floor(g / cp) * T, T, T, dx, dy, T, T);
          if (r >= 0) x.drawImage(tc, (r % cc) * T, Math.floor(r / cc) * T, T, T, dx, dy, T, T);
        }
        s.textures.addCanvas(key, c);
      }
      this.partes.push(s.add.image(0, 0, key).setOrigin(0, 0).setDepth(-95));
    },
    armar(s) {
      if (s._gameMode === 'campaign') return;
      if (s.playZoneMusic) {
        ED.musica.escena = s;
        s._zoneMusic = 'practica';
        s.playZoneMusic('practica');
      } // tema del campo de práctica
      const D = window.EDITOR_PRACTICA;
      if (!D) return;
      if (!s.textures.exists('pr_ts_pasto')) return console.warn('[Taller] práctica: faltan las texturas del suelo');
      this.limpiar(s);
      if (s.meadowTileSprite) s.meadowTileSprite.setVisible(false);
      if (s.groundGfx) s.groundGfx.setVisible(false);
      this.suelo(s, D);
      const E = D.escala || 1,
        obst = [];
      const anim = (key, fps, repeat) => {
        if (!s.anims.exists(key)) s.anims.create({ key, frames: s.anims.generateFrameNumbers(key), frameRate: fps, repeat });
        return key;
      };
      (D.objetos || []).forEach(o => {
        if (!s.textures.exists(o.img)) return;
        this.partes.push(s.add.image(o.x, o.y, o.img).setOrigin(0.5, 1).setScale(E).setDepth(o.y));
        if (o.solido)
          obst.push({
            x: Math.round(o.x - o.solido[0] / 2),
            y: Math.round(o.y - o.solido[1]),
            w: o.solido[0],
            h: o.solido[1],
            type: 'solid',
            taller: true
          });
      });
      const C = D.casa;
      if (C && s.textures.exists(C.img)) {
        const x0 = C.x - (C.w * E) / 2,
          y0 = C.y - C.h * E;
        this.partes.push(s.add.image(C.x, C.y, C.img).setOrigin(0.5, 1).setScale(E).setDepth(C.y));
        const casa = { x0, y0 };
        if (C.humo && s.textures.exists(C.humo.img)) {
          const im = D.imagenes[C.humo.img];
          const h = s.add
            .sprite(x0 + C.humo.dx * E, y0 + C.humo.dy * E, C.humo.img)
            .setOrigin(0, 0)
            .setScale(E)
            .setDepth(C.y + 0.2);
          h.play(anim(C.humo.img, im.fps || 8, -1));
          this.partes.push(h);
        }
        if (C.puerta && s.textures.exists(C.puerta.img)) {
          const im = D.imagenes[C.puerta.img],
            key = anim(C.puerta.img, im.fps || 12, 0);
          if (!s.anims.exists(key + '_cierra'))
            s.anims.create({
              key: key + '_cierra',
              frames: s.anims.generateFrameNumbers(C.puerta.img).reverse(),
              frameRate: im.fps || 12,
              repeat: 0
            });
          const p = s.add
            .sprite(x0 + C.puerta.dx * E, y0 + C.puerta.dy * E, C.puerta.img, 0)
            .setOrigin(0, 0)
            .setScale(E)
            .setDepth(C.y + 0.1);
          this.partes.push(p);
          casa.puerta = {
            sp: p,
            key,
            ux: x0 + C.puerta.umbral[0] * E,
            uy: y0 + C.puerta.umbral[1] * E,
            r: C.puerta.radio || 34,
            abierta: false
          };
        }
        (C.solido || []).forEach(r =>
          obst.push({
            x: Math.round(x0 + r[0] * E),
            y: Math.round(y0 + r[1] * E),
            w: Math.round(r[2] * E),
            h: Math.round(r[3] * E),
            type: 'solid',
            taller: true
          })
        );
        this.casa = casa;
      }
      s.mapObstacles = (s.mapObstacles || []).filter(o => !o.taller).concat(obst);
      try {
        s.rebuildObstacleColliders();
      } catch (e) {
        console.warn('[Taller] práctica: colisiones', e);
      }
      if (D.zoom) s.cameras.main.setZoom(D.zoom);
    },
    cuadro(s) {
      const c = this.casa;
      if (!c || !c.puerta || !s.player) return;
      const p = c.puerta;
      const cerca = Math.hypot(s.player.x - p.ux, s.player.y - p.uy) < p.r;
      if (cerca !== p.abierta) {
        p.abierta = cerca;
        p.sp.play(cerca ? p.key : p.key + '_cierra');
        if (window.sfx && sfx.fx) {
          try {
            sfx.fx(cerca ? 'door_open' : 'door_close', 0.5);
          } catch (e) {}
        }
      }
    }
  };
  ED.practica = PRAC;
  const practica0 = P.startPractice;
  if (practica0)
    P.startPractice = function () {
      const r = practica0.apply(this, arguments);
      try {
        PRAC.armar(this);
      } catch (e) {
        console.warn('[Taller] práctica:', e);
      }
      return r;
    };
  const campana0 = P.startCampaign;
  if (campana0)
    P.startCampaign = function () {
      try {
        PRAC.limpiar(null);
        this.mapObstacles = (this.mapObstacles || []).filter(o => !o.taller);
      } catch (e) {}
      return campana0.apply(this, arguments);
    };
  const update0 = P.update;
  P.update = function () {
    const r = update0.apply(this, arguments);
    try {
      if (this._gameMode !== 'campaign') PRAC.cuadro(this);
      const enAldea = this._gameMode === 'campaign' && !this.currentInterior;
      (ED.paseantes || []).forEach(w => {
        if (w.sp.visible !== enAldea) w.sp.setVisible(enAldea);
      });
    } catch (e) {}
    return r;
  };
})();
