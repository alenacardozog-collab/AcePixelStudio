/* MAPA (modelo, dibujo y herramientas). La interfaz está en mapa_ui.js.
   Un mapa tiene capas (de abajo hacia arriba): 'terreno' (bordes automáticos), 'tiles' (piezas sueltas) y 'objetos'.
   Los objetos se apoyan en su base: (x, y) es el centro de los pies, igual que en el juego. */
'use strict';
(function () {
  const S = {
    id: null,
    capa: null,
    herr: 'seleccionar',
    sel: [],
    selCol: null,
    selNota: null,
    asset: null,
    prefab: null,
    tileSel: [0],
    sello: null, // varias piezas juntas elegidas con un rectángulo en el selector: { w, h, celdas: [índices] }
    tileXf: 0, // giro / espejo de lo que se pinta (bits TXF)
    pincel: 1,
    zonaValor: 1,
    iman: false,
    grilla: true,
    animar: false,
    ver: { cols: true, zonas: true, luces: true, notas: true, marcas: true, fondo: true },
    caminar: null
  };
  const rt = {}; // datos decodificados por capa: { tipo, arr, lienzo, sucio }
  // capas de Tiles: cada celda guarda (pieza + 1) en los 12 bits de abajo y el giro / espejo arriba
  const TXF = { idx: 4095, fx: 4096, fy: 8192, rot: 16384 };
  const mod = (a, n) => ((a % n) + n) % n;
  /** Giro 90° a la derecha sobre un giro/espejo ya puesto (la pieza se dibuja: espejo y después giro). */
  const xfGirar = f => (f & TXF.rot ? (f & ~TXF.rot) ^ TXF.fx ^ TXF.fy : f | TXF.rot);
  /** Espejo horizontal (h) o vertical (v) en pantalla, sobre un giro/espejo ya puesto. */
  const xfEspejo = (f, eje) => {
    const girada = f & TXF.rot;
    return f ^ ((eje === 'h') !== !!girada ? TXF.fx : TXF.fy);
  };
  /** Lo que se pinta, ya girado / espejado: { w, h, celdas: [valor de celda] } (valor = pieza + 1 | bits). */
  const selloActual = () => {
    const f = S.tileXf & ~TXF.idx;
    if (!S.sello) return null;
    const { w, h, celdas } = S.sello;
    let W = w,
      H = h,
      out = celdas.map(i => (i + 1) | f);
    const tomar = (c, r) => out[r * W + c];
    if (f & TXF.fx) out = Array.from({ length: W * H }, (_, p) => tomar(W - 1 - (p % W), (p / W) | 0));
    if (f & TXF.fy) out = Array.from({ length: W * H }, (_, p) => tomar(p % W, H - 1 - ((p / W) | 0)));
    if (f & TXF.rot) {
      const ant = out,
        W0 = W,
        H0 = H;
      out = new Array(W0 * H0);
      for (let r = 0; r < H0; r++) for (let c = 0; c < W0; c++) out[c * H0 + (H0 - 1 - r)] = ant[r * W0 + c];
      W = H0;
      H = W0;
    }
    return { w: W, h: H, celdas: out };
  };
  /** Valor que va en la celda (i, j) al pintar: la pieza elegida (o una al azar de las sumadas) o la del sello. */
  const valorTile = (i, j) => {
    const sl = selloActual();
    if (sl) {
      const a = S._ancla || { i: 0, j: 0 };
      return sl.celdas[mod(j - a.j, sl.h) * sl.w + mod(i - a.i, sl.w)];
    }
    return (S.tileSel[Math.floor(Math.random() * S.tileSel.length)] + 1) | (S.tileXf & ~TXF.idx);
  };
  /** Dibuja una pieza con su giro / espejo. */
  const dibujarPieza = (x, img, v, cols, st, dx, dy, T) => {
    const p = (v & TXF.idx) - 1,
      sx = (p % cols) * st,
      sy = Math.floor(p / cols) * st;
    if (!(v & ~TXF.idx)) return x.drawImage(img, sx, sy, st, st, dx, dy, T, T);
    x.save();
    x.translate(dx + T / 2, dy + T / 2);
    if (v & TXF.rot) x.rotate(Math.PI / 2);
    x.scale(v & TXF.fx ? -1 : 1, v & TXF.fy ? -1 : 1);
    x.drawImage(img, sx, sy, st, st, -T / 2, -T / 2, T, T);
    x.restore();
  };
  let vista = null,
    arrastre = null,
    fantasma = null,
    tiempo = 0,
    bucle = false;
  const M = () => (CK.P && CK.P.mapas[S.id]) || null;
  const capaAct = () => {
    const m = M();
    return m ? m.capas.find(c => c.id === S.capa) || null : null;
  };
  const pedir = () => vista && vista.pedir();
  const ZONAS = {
    1: { nombre: 'Caminable', color: '#5fc27e' },
    2: { nombre: 'Bloqueado', color: '#e8644f' },
    3: { nombre: 'Solo NPC', color: '#58a6ff' },
    4: { nombre: 'Solo jugador', color: '#e8b83a' }
  };
  const PUNTOS = {
    aparicion: ['Aparición del héroe', '#5fc27e'],
    puerta: ['Puerta / salida', '#e8b83a'],
    npc: ['NPC', '#58a6ff'],
    enemigo: ['Enemigo', '#e8644f'],
    efecto: ['Efecto (FX)', '#f29ad0'],
    disparador: ['Disparador', '#b48cf2']
  };

  // ---------------------------------------------------------------- modelo
  const rle16 = arr => {
    let s = '',
      i = 0;
    while (i < arr.length) {
      let j = i;
      while (j < arr.length && arr[j] === arr[i]) j++;
      s += arr[i] + (j - i > 1 ? 'x' + (j - i) : '') + ',';
      i = j;
    }
    return s.slice(0, -1);
  };
  const unrle16 = (s, n) => {
    const out = new Uint16Array(n);
    let p = 0;
    if (!s) return out;
    for (const tok of s.split(',')) {
      const [v, c] = tok.split('x'),
        k = c ? +c : 1;
      out.fill(+v, p, Math.min(n, p + k));
      p += k;
      if (p >= n) break;
    }
    return out;
  };
  const nuevaCapa = (tipo, nombre) => {
    const c = {
      id: CK.uid('c'),
      nombre: nombre || { terreno: 'Terreno', tiles: 'Tiles', objetos: 'Objetos' }[tipo],
      tipo,
      visible: true,
      bloqueada: false,
      opacidad: 1
    };
    if (tipo === 'objetos') {
      c.orden = 'y';
      c.objetos = [];
      c.grupos = [];
    } else {
      c.tileset = null;
      c.datos = '';
    }
    return c;
  };
  const dims = (m, c) => {
    const t = m.tile;
    return c.tipo === 'terreno'
      ? { gw: Math.ceil(m.w / t) + 1, gh: Math.ceil(m.h / t) + 1 }
      : { gw: Math.ceil(m.w / t), gh: Math.ceil(m.h / t) };
  };
  const datosCapa = c => {
    const m = M();
    let r = rt[c.id];
    if (!r || r.tipo !== c.tipo) {
      const d = dims(m, c);
      r = rt[c.id] = {
        tipo: c.tipo,
        gw: d.gw,
        gh: d.gh,
        arr: c.tipo === 'terreno' ? PIX.unrle(c.datos, d.gw * d.gh) : unrle16(c.datos, d.gw * d.gh),
        sucio: true
      };
    }
    return r;
  };
  const guardarCapa = c => {
    const r = rt[c.id];
    if (r) c.datos = c.tipo === 'terreno' ? PIX.rle(r.arr) : rle16(r.arr);
  };
  const zonas = () => {
    const m = M();
    if (!m.zonas) {
      const celda = Math.max(4, m.tile / 2);
      m.zonas = { celda, w: Math.ceil(m.w / celda), h: Math.ceil(m.h / celda), datos: '' };
    }
    let r = rt._zonas;
    if (!r || r.de !== m.id) r = rt._zonas = { de: m.id, arr: PIX.unrle(m.zonas.datos, m.zonas.w * m.zonas.h), sucio: true };
    return r;
  };
  const objetosDe = (m, todos) => {
    const out = [];
    (m.capas || []).forEach(c => {
      if (c.tipo === 'objetos')
        c.objetos.forEach(o => {
          if (todos || !o.tipo) out.push(o);
        });
    });
    return out;
  };
  const buscarObj = id => {
    const m = M();
    if (!m) return null;
    for (const c of m.capas)
      if (c.tipo === 'objetos') {
        const o = c.objetos.find(x => x.id === id);
        if (o) return o;
      }
    return null;
  };
  const capaDe = id => M().capas.find(c => c.tipo === 'objetos' && c.objetos.some(o => o.id === id));
  const frameDe = o => {
    const a = CK.P.assets[o.asset];
    if (!a) return { x: 0, y: 0, w: 16, h: 16 };
    let i = o.cuadro || 0;
    if (a.cuadros && S.animar) {
      const n = CK.asset.nCuadros(a),
        ord = a.cuadros.orden,
        len = ord ? ord.length : n;
      let k = Math.floor((tiempo * (a.cuadros.fps || 6)) / 1000);
      if (a.cuadros.vaiven && len > 1) {
        k %= len * 2 - 2;
        if (k >= len) k = len * 2 - 2 - k;
      } else k %= len;
      i = ord ? ord[k] : k;
    }
    return CK.asset.cuadro(a, i);
  };
  /** Caja del objeto en el mundo (sin rotación) */
  const cajaDe = o => {
    if (o.tipo === 'luz') return { x: o.x - 7, y: o.y - 7, w: 14, h: 14 };
    if (o.tipo === 'punto') return { x: o.x - 7, y: o.y - 14, w: 14, h: 14 };
    const f = frameDe(o),
      w = f.w * Math.abs(o.sx || 1),
      h = f.h * Math.abs(o.sy || 1);
    return { x: o.x - w / 2, y: o.y - h, w, h };
  };
  // ---------------------------------------------------------------- colisiones ancladas a un objeto
  // Una colisión del mapa puede tener ancla = id de un objeto y su posición relativa (ox, oy, ow, oh, sin escala):
  // se mueve, escala, espeja y gira (su centro) con el objeto. x, y, w, h se recalculan siempre desde el objeto.
  const objEnMapa = (m, id) => objetosDe(m, true).find(o => o.id === id) || null;
  const anclaPos = (k, o) => {
    const sx = Math.abs(o.sx || 1),
      sy = Math.abs(o.sy || 1),
      w = k.ow * sx,
      h = k.oh * sy;
    let cx = o.flipX ? -(k.ox + k.ow) * sx : k.ox * sx,
      mx = cx + w / 2,
      my = k.oy * sy + h / 2;
    if (o.rot) {
      const r = (o.rot * Math.PI) / 180,
        c = Math.cos(r),
        s = Math.sin(r);
      [mx, my] = [mx * c - my * s, mx * s + my * c];
    }
    return { x: o.x + mx - w / 2, y: o.y + my - h / 2, w, h };
  };
  /** Pone la colisión anclada al objeto o (calcula su posición relativa desde donde está ahora). */
  const anclarCol = (k, o) => {
    const sx = Math.abs(o.sx || 1),
      sy = Math.abs(o.sy || 1);
    let mx = k.x + k.w / 2 - o.x,
      my = k.y + k.h / 2 - o.y;
    if (o.rot) {
      const r = (-o.rot * Math.PI) / 180,
        c = Math.cos(r),
        s = Math.sin(r);
      [mx, my] = [mx * c - my * s, mx * s + my * c];
    }
    const ow = k.w / sx,
      oh = k.h / sy,
      cx = mx - k.w / 2;
    k.ancla = o.id;
    k.ow = +ow.toFixed(3);
    k.oh = +oh.toFixed(3);
    k.ox = +(o.flipX ? -cx / sx - ow : cx / sx).toFixed(3);
    k.oy = +((my - k.h / 2) / sy).toFixed(3);
  };
  const desanclarCol = k => {
    ['ancla', 'ox', 'oy', 'ow', 'oh', 'huerfana'].forEach(c => delete k[c]);
  };
  /** Recalcula x, y, w, h de las colisiones ancladas (se llama al dibujar y al exportar). */
  const sincronizarCols = m => {
    (m.colisiones || []).forEach(k => {
      if (!k.ancla) return;
      const o = objEnMapa(m, k.ancla);
      if (!o) {
        k.huerfana = true;
        return;
      }
      delete k.huerfana;
      Object.assign(k, anclaPos(k, o));
    });
  };
  /** Después de mover o estirar a mano una colisión anclada: guarda su nueva posición relativa. */
  const reanclar = k => {
    if (!k.ancla) return;
    const o = objEnMapa(M(), k.ancla);
    if (o) anclarCol(k, o);
  };
  /** El objeto que está debajo de un punto (por su caja), para anclar ahí una colisión nueva. */
  const objetoDebajo = (m, wx, wy) => {
    const l = objetosDe(m).filter(o => !o.tipo && !o.oculto);
    for (let i = l.length - 1; i >= 0; i--) {
      const b = cajaDe(l[i]);
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return l[i];
    }
    return null;
  };
  S.colAnclar = (() => {
    try {
      return localStorage.getItem('ck_col_anclar') !== '0';
    } catch (e) {
      return true;
    }
  })();

  /** Colisión de un objeto en coordenadas del mundo. */
  const colDe = o => {
    if (!o.col) return null;
    const sx = Math.abs(o.sx || 1),
      sy = Math.abs(o.sy || 1);
    let cx = o.col.x * sx;
    if (o.flipX) cx = -(o.col.x + o.col.w) * sx;
    return { x: o.x + cx, y: o.y + o.col.y * sy, w: o.col.w * sx, h: o.col.h * sy };
  };
  const tocaObj = (o, wx, wy) => {
    if (o.tipo) {
      const b = cajaDe(o);
      return wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h;
    }
    const a = CK.P.assets[o.asset],
      f = frameDe(o);
    let dx = wx - o.x,
      dy = wy - o.y;
    if (o.rot) {
      const r = (-o.rot * Math.PI) / 180,
        c = Math.cos(r),
        s = Math.sin(r);
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
    }
    let lx = dx / (o.sx || 1),
      ly = dy / (o.sy || 1);
    if (o.flipX) lx = -lx;
    if (o.flipY) ly = -f.h - ly;
    const px = Math.floor(lx + f.w / 2),
      py = Math.floor(ly + f.h);
    if (px < 0 || py < 0 || px >= f.w || py >= f.h) return false;
    if (!a || !CK.img[o.asset]) return true;
    return CK.ctx(CK.img[o.asset]).getImageData(f.x + px, f.y + py, 1, 1).data[3] > 20;
  };
  const ordenDibujo = c => (c.orden === 'y' ? c.objetos.slice().sort((a, b) => a.y + (a.z || 0) - (b.y + (b.z || 0))) : c.objetos);
  const objetoEn = (wx, wy) => {
    const m = M();
    for (let i = m.capas.length - 1; i >= 0; i--) {
      const c = m.capas[i];
      if (c.tipo !== 'objetos' || !c.visible || c.bloqueada) continue;
      const l = ordenDibujo(c);
      for (let j = l.length - 1; j >= 0; j--) {
        const o = l[j];
        if (o.oculto || o.bloqueado) continue;
        if (o.tipo === 'luz' && !S.ver.luces) continue;
        if (tocaObj(o, wx, wy)) return o;
      }
    }
    return null;
  };
  const ajustar = v => (S.iman ? Math.round(v / (M().tile / 2)) * (M().tile / 2) : Math.round(v));
  const fin = nombre => CK.hist.datos(nombre, 'mapas', S.id);
  const elegir = (ids, sumar) => {
    S.sel = sumar ? [...new Set(S.sel.concat(ids))] : ids;
    S.selCol = null;
    S.selNota = null;
    CK.emit('mapa-sel');
    pedir();
  };
  /** ids incluyendo todo el grupo de cada objeto */
  const conGrupo = ids => {
    const out = new Set(ids);
    ids.forEach(id => {
      const o = buscarObj(id);
      if (o && o.grupo)
        capaDe(id).objetos.forEach(x => {
          if (x.grupo === o.grupo) out.add(x.id);
        });
    });
    return [...out];
  };

  // ---------------------------------------------------------------- dibujo de capas de tiles
  const piezaTerreno = (m, c, r, i, j) => {
    const g = r.arr,
      gw = r.gw;
    return PIX.wangIndex(g[j * gw + i], g[j * gw + i + 1], g[(j + 1) * gw + i], g[(j + 1) * gw + i + 1]);
  };
  const dibujarCapaTiles = (m, c) => {
    const r = datosCapa(c),
      a = CK.P.assets[c.tileset],
      img = a && CK.img[c.tileset],
      T = m.tile;
    if (!r.lienzo || r.lienzo.width !== m.w || r.lienzo.height !== m.h) {
      r.lienzo = CK.lienzo(m.w, m.h);
      r.sucio = true;
    }
    if (!r.sucio && !r.zona) return r.lienzo;
    // si solo cambiaron unas celdas (pincel), se redibuja ese rectángulo y no la capa entera
    const z = !r.sucio && r.zona ? r.zona : null;
    r.sucio = false;
    r.zona = null;
    const x = CK.ctx(r.lienzo);
    const ci0 = z ? Math.max(0, z.i0) : 0,
      cj0 = z ? Math.max(0, z.j0) : 0,
      ci1 = z ? Math.min(r.gw - 1, z.i1) : r.gw - 1,
      cj1 = z ? Math.min(r.gh - 1, z.j1) : r.gh - 1;
    if (z) x.clearRect(ci0 * T, cj0 * T, (ci1 - ci0 + 1) * T, (cj1 - cj0 + 1) * T);
    else x.clearRect(0, 0, m.w, m.h);
    if (!img) return r.lienzo;
    const st = (a.tileset && a.tileset.tile) || T,
      cols = Math.max(1, Math.floor(a.w / st));
    if (c.tipo === 'terreno') {
      const filas = Math.floor(a.h / st),
        nVar = a.tileset && a.tileset.variantes !== undefined ? a.tileset.variantes : filas > 4 ? (filas - 4) * cols : 0;
      for (let j = cj0; j < Math.min(r.gh - 1, cj1 + 1); j++)
        for (let i = ci0; i < Math.min(r.gw - 1, ci1 + 1); i++) {
          let p = piezaTerreno(m, c, r, i, j);
          if (p === 15) continue;
          if (p === 0 && nVar) {
            // continuo: las variantes son los 16 pedazos de una textura de 4 × 4 tiles y se ponen en orden (la textura se ve entera)
            const v =
              a.tileset.continuo && nVar >= 16
                ? 1 + (i % 4) + (j % 4) * 4
                : Math.floor((((i * 73856093) ^ (j * 19349663)) >>> 0) % (nVar + 1));
            if (v) p = 15 + v;
          }
          x.drawImage(img, (p % cols) * st, Math.floor(p / cols) * st, st, st, i * T, j * T, T, T);
        }
    } else
      for (let j = cj0; j <= cj1; j++)
        for (let i = ci0; i <= ci1; i++) {
          const v = r.arr[j * r.gw + i];
          if (!(v & TXF.idx)) continue;
          dibujarPieza(x, img, v, cols, st, i * T, j * T, T);
        }
    return r.lienzo;
  };
  const sombras = {};
  const dibujarSombra = (x, o) => {
    const f = frameDe(o),
      w = Math.max(4, Math.round(f.w * Math.abs(o.sx || 1) * o.sombra)),
      hh = Math.max(2, Math.round(w * 0.32)),
      k = w + 'x' + hh;
    if (!sombras[k]) sombras[k] = CK.aLienzo(PIX.shadow(w, hh, '#000000', 84));
    x.drawImage(sombras[k], Math.round(o.x - w / 2), Math.round(o.y - hh * 0.62));
  };
  // ---------------------------------------------------------------- giro y escala limpios (sin deformar el pixel art)
  const entero = v => Math.abs(v - Math.round(v)) < 1e-6 && v >= 1;
  const girado = o => (((o.rot || 0) % 360) + 360) % 360;
  /** En el editor: el giro que no es recto o la escala que no es entera se dibujan con RotSprite (cacheado). */
  const pideLimpio = o => girado(o) % 90 !== 0 || !entero(Math.abs(o.sx || 1)) || !entero(Math.abs(o.sy || 1));
  /** Para el juego: todo lo que el juego no sabe hacer solo (girar, escalar distinto en X e Y, espejar vertical, escala no entera). */
  const pideHorneado = o => girado(o) !== 0 || Math.abs(o.sx || 1) !== Math.abs(o.sy || 1) || !!o.flipY || !entero(Math.abs(o.sx || 1));
  const fuentes = new Map(),
    limpios = new Map();
  /** El cuadro f del asset, ya espejado, como imagen de PIX (se reutiliza: así la versión ×8 también queda guardada). */
  const fuenteDe = (a, f, fx, fy) => {
    const k = a.id + ':' + (a.modificado || 0) + ':' + f.x + ',' + f.y + ',' + f.w + ',' + f.h + ':' + fx + fy;
    let im = fuentes.get(k);
    if (!im) {
      const c = CK.lienzo(f.w, f.h),
        x = CK.ctx(c);
      x.translate(fx ? f.w : 0, fy ? f.h : 0);
      x.scale(fx ? -1 : 1, fy ? -1 : 1);
      x.drawImage(CK.img[a.id], f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      im = CK.aPix(c);
      if (fuentes.size > 400) fuentes.clear();
      fuentes.set(k, im);
    }
    return im;
  };
  /** Un cuadro del objeto girado y escalado limpio. Devuelve { c (lienzo), ax, ay (dónde queda el pie) }. */
  const cuadroLimpio = (o, a, f) => {
    const fx = !!o.flipX !== (o.sx || 1) < 0,
      fy = !!o.flipY !== (o.sy || 1) < 0,
      sx = Math.abs(o.sx || 1),
      sy = Math.abs(o.sy || 1),
      oy = (a.cuadros && a.cuadros.oy) || 0,
      k = a.id + ':' + (a.modificado || 0) + ':' + f.x + ',' + f.y + ':' + girado(o) + ':' + sx + ':' + sy + ':' + fx + fy;
    let r = limpios.get(k);
    if (!r) {
      const src = fuenteDe(a, f, fx, fy),
        t = PIX.transformar(src, (girado(o) * Math.PI) / 180, sx, sy, Math.round(f.w / 2), fy ? oy : f.h - oy);
      r = { c: CK.aLienzo(t.im), ax: t.ax, ay: t.ay };
      if (limpios.size > 300) limpios.clear();
      limpios.set(k, r);
    }
    return r;
  };
  /**
   * Para exportar: todos los cuadros del objeto horneados con su giro, escala y espejo, alineados por el pie.
   * Devuelve { c (hoja), fw, fh, n, ox, oy (punto de apoyo como fracción del cuadro) }.
   */
  const hornearObjeto = o => {
    const a = CK.P.assets[o.asset];
    if (!a || !CK.img[a.id]) return null;
    const n = a.cuadros ? CK.asset.nCuadros(a) : 1,
      rs = [];
    for (let i = 0; i < n; i++) rs.push(cuadroLimpio(o, a, CK.asset.cuadro(a, i)));
    const AX = Math.ceil(Math.max(...rs.map(r => r.ax))),
      AY = Math.ceil(Math.max(...rs.map(r => r.ay))),
      fw = Math.max(1, Math.ceil(Math.max(...rs.map(r => AX - r.ax + r.c.width)))),
      fh = Math.max(1, Math.ceil(Math.max(...rs.map(r => AY - r.ay + r.c.height)))),
      c = CK.lienzo(fw * n, fh),
      x = CK.ctx(c);
    rs.forEach((r, i) => x.drawImage(r.c, Math.round(i * fw + AX - r.ax), Math.round(AY - r.ay)));
    return { c, fw, fh, n, ox: AX / fw, oy: AY / fh };
  };

  const dibujarObj = (x, o, alpha) => {
    const img = CK.img[o.asset],
      f = frameDe(o);
    // giro o escala que deformarían el dibujo: versión limpia (mientras se arrastra el asa, la rápida)
    const a0 = CK.P.assets[o.asset];
    if (
      img &&
      a0 &&
      pideLimpio(o) &&
      !(arrastre && (arrastre.tipo === 'rotar' || arrastre.tipo === 'escalar') && arrastre.o0.id === o.id)
    ) {
      const r = cuadroLimpio(o, a0, f);
      x.save();
      x.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (alpha === undefined ? 1 : alpha);
      x.drawImage(r.c, Math.round(o.x - r.ax), Math.round(o.y - r.ay));
      x.restore();
      return;
    }
    x.save();
    x.translate(o.x, o.y);
    if (o.rot) x.rotate((o.rot * Math.PI) / 180);
    x.scale((o.sx || 1) * (o.flipX ? -1 : 1), o.sy || 1);
    if (o.flipY) {
      x.translate(0, -f.h / 2);
      x.scale(1, -1);
      x.translate(0, f.h / 2);
    }
    x.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (alpha === undefined ? 1 : alpha);
    const oy = (CK.P.assets[o.asset] && CK.P.assets[o.asset].cuadros && CK.P.assets[o.asset].cuadros.oy) || 0;
    if (img) x.drawImage(img, f.x, f.y, f.w, f.h, -Math.round(f.w / 2), -f.h + oy, f.w, f.h);
    else {
      x.fillStyle = '#b8483c';
      x.fillRect(-8, -16, 16, 16);
      x.fillStyle = '#fff';
      x.font = '6px sans-serif';
      x.fillText('?', -2, -6);
    }
    x.restore();
  };
  // efectos (FX) puestos como punto en el mapa: se dibujan en vivo, como en el juego
  const fxVivos = new Map();
  const recursoFx = id => {
    const a = CK.P.assets[id];
    return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null;
  };
  const dibujarFxMapa = (x, m) => {
    if (typeof CKFx === 'undefined') return;
    objetosDe(m, true).forEach(o => {
      if (o.tipo !== 'punto' || o.clase !== 'efecto' || o.oculto) return;
      const def = CK.P.fx[(o.props || {}).fx];
      if (!def) return;
      const firma = JSON.stringify(def);
      let v = fxVivos.get(o.id);
      if (!v || v.firma !== firma) {
        v = { firma, sim: CKFx.crear(CK.clone(Object.assign({}, def, { bucle: true })), { semilla: 7 }), u: 0 };
        for (let i = 0; i < Math.ceil((def.dur || 1) * 60); i++) v.sim.paso(1 / 60); // ya encendido, no vacío
        fxVivos.set(o.id, v);
      }
      const dt = v.u ? Math.min(0.05, (tiempo - v.u) / 1000) : 0;
      v.u = tiempo;
      if (dt > 0) v.sim.paso(dt);
      v.sim.dibujar(x, o.x, o.y, recursoFx);
    });
  };
  const hornearSuelo = m => {
    const prev = S.id;
    S.id = m.id;
    const c = CK.lienzo(m.w, m.h),
      x = CK.ctx(c);
    x.fillStyle = m.colorFondo || '#2f4a2c';
    x.fillRect(0, 0, m.w, m.h);
    if (m.fondo && CK.img[m.fondo]) x.drawImage(CK.img[m.fondo], 0, 0);
    m.capas.forEach(cp => {
      if (cp.tipo !== 'objetos' && cp.visible) {
        const r = datosCapa(cp);
        r.sucio = true;
        x.globalAlpha = cp.opacidad;
        x.drawImage(dibujarCapaTiles(m, cp), 0, 0);
        x.globalAlpha = 1;
      }
    });
    m.capas.forEach(cp => {
      if (cp.tipo === 'objetos' && cp.visible)
        cp.objetos.forEach(ob => {
          if (!ob.oculto && !ob.tipo && ob.sombra) dibujarSombra(x, ob);
        });
    });
    S.id = prev;
    return c;
  };
  /** Imagen completa del mapa (para miniaturas, portfolio y revisión). */
  const foto = (m, o = {}) => {
    const c = hornearSuelo(m),
      x = CK.ctx(c),
      prev = S.id;
    S.id = m.id;
    m.capas.forEach(cp => {
      if (cp.tipo === 'objetos' && cp.visible)
        ordenDibujo(cp).forEach(ob => {
          if (!ob.oculto && !ob.tipo) dibujarObj(x, ob, cp.opacidad);
        });
    });
    if (o.luces) pintarLuces(x, m);
    S.id = prev;
    return c;
  };
  const pintarLuces = (x, m) => {
    const amb = m.ambiente;
    if (amb && amb.fuerza > 0) {
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.globalAlpha = amb.fuerza;
      x.fillStyle = amb.color || '#20264a';
      x.fillRect(0, 0, m.w, m.h);
      x.restore();
    }
    const heroe = S.caminar && S.id === m.id ? S.caminar : null;
    objetosDe(m, true).forEach(o => {
      if (o.tipo !== 'luz' || o.oculto) return;
      // "sigue al héroe": al caminar por el mapa en el editor la luz va con él
      if (o.sigue === 'heroe' && heroe) CK.luces.dibujarMapa(x, o, tiempo, heroe.x, heroe.y - 8);
      else CK.luces.dibujarMapa(x, o, tiempo);
    });
  };

  // ---------------------------------------------------------------- pintar la vista
  const pintar = (x, v) => {
    const m = M();
    if (!m) return;
    sincronizarCols(m);
    x.save();
    v.mundo(x);
    x.fillStyle = m.colorFondo || '#2f4a2c';
    x.fillRect(0, 0, m.w, m.h);
    if (m.fondo && CK.img[m.fondo] && S.ver.fondo) x.drawImage(CK.img[m.fondo], 0, 0);
    const heroe = S.caminar;
    // solo se dibuja lo que se ve (mapas grandes)
    const vx0 = Math.max(0, Math.floor(-v.tx / v.z) - 2),
      vy0 = Math.max(0, Math.floor(-v.ty / v.z) - 2),
      vx1 = Math.min(m.w, Math.ceil((v.w - v.tx) / v.z) + 2),
      vy1 = Math.min(m.h, Math.ceil((v.h - v.ty) / v.z) + 2),
      visible = o => {
        const a = CK.P.assets[o.asset];
        if (!a) return true;
        const k = Math.max(Math.abs(o.sx || 1), Math.abs(o.sy || 1)) * (o.rot ? 1.5 : 1),
          w = (a.cuadros ? a.cuadros.fw : a.w) * k,
          hh = (a.cuadros ? a.cuadros.fh : a.h) * k;
        return !(o.x + w / 2 < vx0 || o.x - w / 2 > vx1 || o.y + 8 < vy0 || o.y - hh > vy1);
      };
    m.capas.forEach(c => {
      if (!c.visible) return;
      if (c.tipo !== 'objetos') {
        x.globalAlpha = c.opacidad;
        const lz = dibujarCapaTiles(m, c);
        if (vx1 > vx0 && vy1 > vy0) x.drawImage(lz, vx0, vy0, vx1 - vx0, vy1 - vy0, vx0, vy0, vx1 - vx0, vy1 - vy0);
        x.globalAlpha = 1;
        return;
      }
      let l = ordenDibujo(c);
      if (heroe && c.id === heroe.capa) {
        l = l.concat([{ _heroe: true, y: heroe.y, z: 0 }]);
        if (c.orden === 'y') l.sort((a, b) => a.y + (a.z || 0) - (b.y + (b.z || 0)));
      }
      l = l.filter(o => o._heroe || o.tipo || visible(o));
      l.forEach(o => {
        if (!o._heroe && !o.oculto && !o.tipo && o.sombra) dibujarSombra(x, o);
      });
      l.forEach(o => {
        if (o._heroe) return dibujarHeroe(x, heroe);
        if (o.oculto || o.tipo) return;
        dibujarObj(x, o, c.opacidad);
      });
    });
    dibujarFxMapa(x, m);
    if (S.ver.luces) pintarLuces(x, m);
    x.restore();

    // ---- guías en píxeles de pantalla
    const z = v.z,
      P = (wx, wy) => ({ x: Math.round(wx * z + v.tx), y: Math.round(wy * z + v.ty) });
    x.save();
    x.lineWidth = 1;
    x.strokeStyle = 'rgba(255,255,255,.35)';
    const o0 = P(0, 0);
    x.strokeRect(o0.x - 0.5, o0.y - 0.5, m.w * z + 1, m.h * z + 1);
    if (S.grilla) v.grilla(x, m.tile, m.w, m.h);
    if (S.ver.zonas && (m.zonas || /zona/.test(S.herr))) {
      const zr = zonas(),
        zc = m.zonas.celda,
        zw = m.zonas.w,
        fuerte = S.herr === 'zona' || S.herr === 'balde-zona';
      const zj0 = Math.max(0, Math.floor(vy0 / zc)),
        zj1 = Math.min(m.zonas.h, Math.ceil(vy1 / zc)),
        zi0 = Math.max(0, Math.floor(vx0 / zc)),
        zi1 = Math.min(zw, Math.ceil(vx1 / zc));
      for (let j = zj0; j < zj1; j++)
        for (let i = zi0; i < zi1; i++) {
          const val = zr.arr[j * zw + i];
          if (!val) continue;
          const p = P(i * zc, j * zc);
          x.fillStyle = ZONAS[val].color;
          x.globalAlpha = fuerte ? 0.42 : 0.2;
          x.fillRect(p.x, p.y, Math.ceil(zc * z), Math.ceil(zc * z));
        }
      x.globalAlpha = 1;
    }
    if (S.ver.cols) {
      (m.colisiones || []).forEach(k => {
        const p = P(k.x, k.y),
          sel = k.id === S.selCol;
        x.fillStyle = sel ? 'rgba(232,100,79,.45)' : 'rgba(232,100,79,.22)';
        x.strokeStyle = sel ? '#fff' : '#e8644f';
        if (k.ancla) x.setLineDash(k.huerfana ? [2, 3] : []);
        x.fillRect(p.x, p.y, k.w * z, k.h * z);
        x.strokeRect(p.x + 0.5, p.y + 0.5, k.w * z - 1, k.h * z - 1);
        x.setLineDash([]);
        if (k.ancla && !k.huerfana) {
          // cadenita: la colisión va con su objeto
          const o = objEnMapa(m, k.ancla),
            a = o && P(o.x, o.y);
          if (a && sel) {
            x.strokeStyle = 'rgba(255,255,255,.7)';
            x.setLineDash([3, 3]);
            x.beginPath();
            x.moveTo(p.x + (k.w * z) / 2, p.y + (k.h * z) / 2);
            x.lineTo(a.x, a.y);
            x.stroke();
            x.setLineDash([]);
          }
          x.fillStyle = '#fff';
          x.font = '600 10px system-ui, sans-serif';
          x.fillText('⚓', p.x + 2, p.y + 11);
        }
        if (k.nombre && (sel || z >= 2)) etiqueta(x, k.nombre, p.x + (k.w * z) / 2, p.y - 6, '#e8644f');
        if (sel) asas(x, p.x, p.y, k.w * z, k.h * z);
      });
      objetosDe(m).forEach(o => {
        const r = colDe(o);
        if (!r || o.oculto) return;
        const p = P(r.x, r.y);
        x.fillStyle = 'rgba(232,184,58,.28)';
        x.strokeStyle = '#e8b83a';
        x.fillRect(p.x, p.y, r.w * z, r.h * z);
        x.strokeRect(p.x + 0.5, p.y + 0.5, r.w * z - 1, r.h * z - 1);
      });
    }
    objetosDe(m, true).forEach(o => {
      if (o.oculto) return;
      const p = P(o.x, o.y);
      if (o.tipo === 'luz' && S.ver.luces) {
        if (S.sel.length === 1 && S.sel[0] === o.id && S.herr === 'seleccionar')
          asasLuz(o).forEach(a => {
            const q = P(a.x, a.y);
            x.strokeStyle = 'rgba(255,255,255,.5)';
            x.setLineDash([2, 3]);
            x.beginPath();
            x.moveTo(p.x, p.y);
            x.lineTo(q.x, q.y);
            x.stroke();
            x.setLineDash([]);
            x.fillStyle = a.forma === 'dir' ? '#58a6ff' : a.forma === 'ap' ? '#e8b83a' : '#fff';
            x.strokeStyle = '#1b1d21';
            x.beginPath();
            if (a.forma === 'cua') x.rect(q.x - 4, q.y - 4, 8, 8);
            else x.arc(q.x, q.y, 5, 0, 7);
            x.fill();
            x.stroke();
          });
        if (o.nombre) etiqueta(x, o.nombre, p.x, p.y - 12, o.color || '#ffcc66');
        x.fillStyle = o.color || '#ffcc66';
        x.strokeStyle = '#111';
        x.beginPath();
        x.arc(p.x, p.y, 6, 0, 7);
        x.fill();
        x.stroke();
        if (S.sel.includes(o.id)) {
          x.strokeStyle = 'rgba(255,255,255,.6)';
          x.setLineDash([4, 4]);
          x.beginPath();
          x.arc(p.x, p.y, (o.forma ? CK.luces.extension(o) : o.radio) * z, 0, 7);
          x.stroke();
          x.setLineDash([]);
          if (o.forma === 'foco' || o.forma === 'sol') {
            const d = ((o.dir === undefined ? 90 : o.dir) * Math.PI) / 180;
            x.strokeStyle = '#e8b83a';
            x.lineWidth = 2;
            x.beginPath();
            x.moveTo(p.x, p.y);
            x.lineTo(p.x + Math.cos(d) * 22, p.y + Math.sin(d) * 22);
            x.stroke();
            x.lineWidth = 1;
          }
        }
      }
      if (o.tipo === 'punto' && o.clase === 'enemigo') {
        const sel = S.sel.includes(o.id),
          r = +(o.props || {}).radio || 40;
        x.strokeStyle = 'rgba(232,100,79,' + (sel ? 0.9 : 0.45) + ')';
        x.lineWidth = sel ? 2 : 1;
        if (o.ruta && o.ruta.length) {
          x.setLineDash([6, 4]);
          x.beginPath();
          x.moveTo(p.x, p.y);
          o.ruta.forEach(q => {
            const w = P(q[0], q[1]);
            x.lineTo(w.x, w.y);
          });
          x.lineTo(p.x, p.y);
          x.stroke();
          x.setLineDash([]);
          o.ruta.forEach((q, i) => {
            const w = P(q[0], q[1]);
            x.fillStyle = '#e8644f';
            x.beginPath();
            x.arc(w.x, w.y, sel ? 5 : 3, 0, 7);
            x.fill();
            if (sel) {
              x.fillStyle = '#fff';
              x.save();
              x.font = '10px sans-serif';
              x.textAlign = 'center';
              x.fillText(String(i + 2), w.x, w.y - 8);
              x.restore();
            }
          });
        } else if (sel) {
          x.setLineDash([3, 4]);
          x.beginPath();
          x.arc(p.x, p.y, r * z, 0, 7);
          x.stroke();
          x.setLineDash([]);
        }
        x.lineWidth = 1;
      }
      if (o.tipo === 'punto') {
        const [rot, col] = PUNTOS[o.clase] || PUNTOS.disparador;
        x.fillStyle = col;
        x.strokeStyle = '#111';
        x.beginPath();
        x.moveTo(p.x, p.y);
        x.lineTo(p.x - 7, p.y - 12);
        x.arc(p.x, p.y - 14, 7, Math.PI, 0);
        x.lineTo(p.x, p.y);
        x.fill();
        x.stroke();
        etiqueta(x, o.nombre || rot, p.x, p.y - 26, col);
        if (o.w && o.h) {
          x.strokeStyle = col;
          x.setLineDash([5, 3]);
          x.strokeRect(p.x - (o.w * z) / 2 + 0.5, p.y - o.h * z + 0.5, o.w * z, o.h * z);
          x.setLineDash([]);
        }
      }
      if (o.marca && S.ver.marcas) {
        const b = cajaDe(o),
          q = P(b.x + b.w, b.y);
        x.fillStyle = o.marca.estado === 'hecha' ? '#5fc27e' : '#b48cf2';
        x.strokeStyle = '#111';
        x.beginPath();
        x.arc(q.x, q.y, 8, 0, 7);
        x.fill();
        x.stroke();
        x.fillStyle = '#111';
        x.beginPath();
        x.moveTo(q.x - 3, q.y - 4);
        x.lineTo(q.x + 4, q.y);
        x.lineTo(q.x - 3, q.y + 4);
        x.fill();
      }
    });
    if (S.ver.notas)
      (m.notas || []).forEach(n => {
        const p = P(n.x, n.y),
          sel = n.id === S.selNota;
        x.fillStyle = n.hecho ? '#5fc27e' : '#f2c14e';
        x.strokeStyle = sel ? '#fff' : '#111';
        x.lineWidth = sel ? 2 : 1;
        x.beginPath();
        x.rect(p.x - 8, p.y - 8, 16, 16);
        x.fill();
        x.stroke();
        x.lineWidth = 1;
        x.fillStyle = '#111';
        x.fillRect(p.x - 4, p.y - 4, 8, 1.5);
        x.fillRect(p.x - 4, p.y - 0.5, 8, 1.5);
        x.fillRect(p.x - 4, p.y + 3, 5, 1.5);
        if (sel || z >= 3) etiqueta(x, n.texto.slice(0, 40) + (n.texto.length > 40 ? '…' : ''), p.x, p.y - 14, '#f2c14e');
      });
    // selección
    const sel = S.sel.map(buscarObj).filter(Boolean);
    if (sel.length) {
      x.strokeStyle = '#58a6ff';
      // la caja y las asas giran con el objeto (alrededor de su pie)
      const girado = (o, fn) => {
        if (!o.rot || o.tipo) return fn();
        const a = P(o.x, o.y);
        x.save();
        x.translate(a.x, a.y);
        x.rotate((o.rot * Math.PI) / 180);
        x.translate(-a.x, -a.y);
        fn();
        x.restore();
      };
      sel.forEach(o => {
        const b = cajaDe(o),
          p = P(b.x, b.y);
        girado(o, () => x.strokeRect(p.x - 0.5, p.y - 0.5, b.w * z + 1, b.h * z + 1));
        const a = P(o.x, o.y);
        x.fillStyle = '#58a6ff';
        x.fillRect(a.x - 2, a.y - 2, 5, 5);
      });
      if (sel.length === 1 && !sel[0].tipo && S.herr === 'seleccionar') {
        const b = cajaDe(sel[0]),
          p = P(b.x, b.y);
        girado(sel[0], () => asas(x, p.x, p.y, b.w * z, b.h * z, true));
      }
    }
    if (arrastre && arrastre.tipo === 'marco') {
      const a = P(arrastre.x0, arrastre.y0),
        b = P(arrastre.x1, arrastre.y1);
      x.strokeStyle = '#58a6ff';
      x.fillStyle = 'rgba(88,166,255,.15)';
      x.setLineDash([4, 3]);
      x.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      x.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
      x.setLineDash([]);
    }
    if (arrastre && (arrastre.tipo === 'col-nueva' || arrastre.tipo === 'rect-zona' || arrastre.tipo === 'rect-tiles')) {
      const r = rectDe(arrastre),
        a = P(r.x, r.y);
      x.strokeStyle = '#fff';
      x.setLineDash([4, 3]);
      x.strokeRect(a.x + 0.5, a.y + 0.5, r.w * z, r.h * z);
      x.setLineDash([]);
    }
    // fantasma de lo que se va a colocar / pincel
    if (fantasma) {
      x.save();
      v.mundo(x);
      if (fantasma.objs)
        fantasma.objs.forEach(o => {
          if (!o.tipo) dibujarObj(x, o, 0.6);
        });
      // vista previa de las piezas que se van a pintar (con giro y espejo)
      const fp = fantasma.piezas,
        ta = fp && CK.P.assets[fp.c.tileset],
        ti = ta && CK.img[fp.c.tileset];
      if (ti) {
        const T = m.tile,
          st = (ta.tileset && ta.tileset.tile) || T,
          cols = Math.max(1, Math.floor(ta.w / st));
        x.globalAlpha = 0.7;
        if (fp.sl)
          for (let r = 0; r < fp.sl.h; r++)
            for (let q = 0; q < fp.sl.w; q++)
              dibujarPieza(x, ti, fp.sl.celdas[r * fp.sl.w + q], cols, st, (fp.i + q) * T, (fp.j + r) * T, T);
        else {
          const v = S.tileSel[0] + 1 + (S.tileXf & ~TXF.idx);
          for (let r = 0; r < fp.n; r++) for (let q = 0; q < fp.n; q++) dibujarPieza(x, ti, v, cols, st, (fp.i + q) * T, (fp.j + r) * T, T);
        }
        x.globalAlpha = 1;
      }
      x.restore();
      if (fantasma.celdas) {
        x.strokeStyle = '#fff';
        x.fillStyle = 'rgba(255,255,255,.14)';
        const r = fantasma.celdas,
          p = P(r.x, r.y);
        x.fillRect(p.x, p.y, r.w * z, r.h * z);
        x.strokeRect(p.x + 0.5, p.y + 0.5, r.w * z - 1, r.h * z - 1);
      }
      if (fantasma.circulo) {
        const c = fantasma.circulo,
          p = P(c.x, c.y);
        x.strokeStyle = '#fff';
        x.beginPath();
        x.arc(p.x, p.y, Math.max(3, c.r * z), 0, 7);
        x.stroke();
      }
    }
    x.restore();
  };
  const etiqueta = (x, txt, px, py, color) => {
    x.font = '600 11px "Segoe UI", system-ui, sans-serif';
    const w = x.measureText(txt).width + 10;
    x.fillStyle = 'rgba(16,17,20,.88)';
    x.fillRect(Math.round(px - w / 2), py - 9, w, 16);
    x.fillStyle = color || '#fff';
    x.textBaseline = 'middle';
    x.fillText(txt, Math.round(px - w / 2) + 5, py);
  };
  const asas = (x, px, py, w, h, rot) => {
    x.fillStyle = '#fff';
    x.strokeStyle = '#1b1d21';
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0.5, 0],
      [0.5, 1],
      [0, 0.5],
      [1, 0.5]
    ].forEach(([u, vv]) => {
      x.fillRect(Math.round(px + w * u) - 4, Math.round(py + h * vv) - 4, 8, 8);
      x.strokeRect(Math.round(px + w * u) - 3.5, Math.round(py + h * vv) - 3.5, 7, 7);
    });
    if (rot) {
      x.beginPath();
      x.moveTo(px + w / 2, py);
      x.lineTo(px + w / 2, py - 20);
      x.strokeStyle = '#58a6ff';
      x.stroke();
      x.beginPath();
      x.arc(px + w / 2, py - 22, 5, 0, 7);
      x.fillStyle = '#58a6ff';
      x.fill();
      x.strokeStyle = '#1b1d21';
      x.stroke();
    }
  };
  /** El mouse llevado al espacio del objeto sin girar (gira alrededor de su pie, x / y). Así las asas siguen al giro. */
  const desrotar = (o, m) => {
    if (!o || !o.rot) return m;
    const r = (-o.rot * Math.PI) / 180,
      c = Math.cos(r),
      s = Math.sin(r),
      gx = (px, py, ox, oy) => [ox + (px - ox) * c - (py - oy) * s, oy + (px - ox) * s + (py - oy) * c];
    const [x, y] = gx(m.x, m.y, o.x, o.y),
      ps = { x: o.x * vista.z + vista.tx, y: o.y * vista.z + vista.ty },
      [sx, sy] = m.sx === undefined ? [m.sx, m.sy] : gx(m.sx, m.sy, ps.x, ps.y);
    return Object.assign({}, m, { x, y, sx, sy });
  };
  /** Asas de una luz en el lienzo (en el mundo): alcance, punta (dirección + alcance), apertura, ancho y alto. */
  const asasLuz = o => {
    const f = o.forma || 'punto',
      R = +o.radio || 48,
      d = (((f === 'area' || f === 'linea') && o.dir === undefined ? 0 : o.dir === undefined ? 90 : +o.dir) * Math.PI) / 180,
      c = Math.cos(d),
      s = Math.sin(d),
      L = (lx, ly) => ({ x: o.x + lx * c - ly * s, y: o.y + lx * s + ly * c }),
      z = vista.z,
      out = [];
    if (f === 'foco' || f === 'sol') {
      out.push(Object.assign({ k: 'punta', forma: 'dir' }, L(R, 0)));
      if (f === 'foco') {
        const a = (((o.apertura === undefined ? 50 : +o.apertura) / 2) * Math.PI) / 180;
        out.push({ k: 'apertura', forma: 'ap', x: o.x + Math.cos(d + a) * R * 0.7, y: o.y + Math.sin(d + a) * R * 0.7 });
      } else out.push(Object.assign({ k: 'ancho', forma: 'cua' }, L(0, (+o.ancho || 24) / 2)));
    } else if (f === 'area') {
      const w = +o.ancho || 32,
        hh = +o.alto || 16;
      out.push(Object.assign({ k: 'ancho', forma: 'cua' }, L(w / 2, 0)));
      out.push(Object.assign({ k: 'alto', forma: 'cua' }, L(0, hh / 2)));
      out.push(Object.assign({ k: 'radio', forma: 'cua' }, L(w / 2 + R, 0)));
      out.push(Object.assign({ k: 'giro', forma: 'dir' }, L(0, -hh / 2 - 16 / z)));
    } else if (f === 'linea') {
      out.push(Object.assign({ k: 'ancho', forma: 'cua' }, L((+o.ancho || 40) / 2, 0)));
      out.push(Object.assign({ k: 'radio', forma: 'cua' }, L(0, R)));
      out.push(Object.assign({ k: 'giro', forma: 'dir' }, L(0, -R - 16 / z)));
    } else out.push({ k: 'radio', forma: 'cua', x: o.x + R, y: o.y });
    return out;
  };
  const asaLuzEn = (o, m) => asasLuz(o).find(a => Math.hypot((a.x - m.x) * vista.z, (a.y - m.y) * vista.z) <= 7) || null;
  const asaEn = (b, m) => {
    const z = vista.z,
      px = b.x * z + vista.tx,
      py = b.y * z + vista.ty,
      w = b.w * z,
      h = b.h * z;
    const pts = { nw: [0, 0], ne: [1, 0], sw: [0, 1], se: [1, 1], n: [0.5, 0], s: [0.5, 1], w: [0, 0.5], e: [1, 0.5] };
    for (const k in pts) {
      const ax = px + w * pts[k][0],
        ay = py + h * pts[k][1];
      if (Math.abs(m.sx - ax) <= 6 && Math.abs(m.sy - ay) <= 6) return k;
    }
    if (Math.hypot(m.sx - (px + w / 2), m.sy - (py - 22)) <= 7) return 'rot';
    return null;
  };
  const rectDe = a => ({ x: Math.min(a.x0, a.x1), y: Math.min(a.y0, a.y1), w: Math.abs(a.x1 - a.x0), h: Math.abs(a.y1 - a.y0) });

  // ---------------------------------------------------------------- héroe de prueba (caminar por el mapa)
  const dibujarHeroe = (x, h) => {
    const a = h.asset && CK.P.assets[h.asset];
    if (a && CK.img[a.id]) {
      const f = CK.asset.cuadro(a, h.mov ? Math.floor(tiempo / 120) : 0);
      x.save();
      x.translate(Math.round(h.x), Math.round(h.y));
      x.scale(h.izq ? -1 : 1, 1);
      const oy = a.cuadros && a.cuadros.fh >= 90 ? 0.61 : 1;
      x.drawImage(CK.img[a.id], f.x, f.y, f.w, f.h, -Math.round(f.w / 2), -Math.round(f.h * oy), f.w, f.h);
      x.restore();
      return;
    }
    const px = Math.round(h.x),
      py = Math.round(h.y),
      b = h.mov && Math.floor(tiempo / 140) % 2 ? 1 : 0;
    x.fillStyle = 'rgba(0,0,0,.3)';
    x.fillRect(px - 6, py - 2, 12, 3);
    x.fillStyle = '#3a4a66';
    x.fillRect(px - 5, py - 12 - b, 10, 9);
    x.fillStyle = '#93897a';
    x.fillRect(px - 4, py - 19 - b, 8, 7);
    x.fillStyle = '#b8483c';
    x.fillRect(px - 1, py - 22 - b, 2, 3);
    x.fillStyle = '#1b1420';
    x.fillRect(px - 4, py - 3, 3, 3 - b);
    x.fillRect(px + 1, py - 3, 3, 2 + b);
    x.fillRect(px - 2, py - 16 - b, 4, 1);
  };
  const solidoEn = (m, rx, ry, rw, rh) => {
    if (rx < 0 || ry < 0 || rx + rw > m.w || ry + rh > m.h) return true;
    const choca = k => rx < k.x + k.w && rx + rw > k.x && ry < k.y + k.h && ry + rh > k.y;
    if ((m.colisiones || []).some(choca)) return true;
    if (
      objetosDe(m).some(o => {
        const r = colDe(o);
        return r && !o.oculto && choca(r);
      })
    )
      return true;
    if (m.zonas) {
      const zr = zonas(),
        zc = m.zonas.celda;
      for (let j = Math.floor(ry / zc); j <= Math.floor((ry + rh - 0.01) / zc); j++)
        for (let i = Math.floor(rx / zc); i <= Math.floor((rx + rw - 0.01) / zc); i++) {
          const v = zr.arr[j * m.zonas.w + i];
          if (v === 2 || v === 3) return true;
        }
    }
    return false;
  };
  const teclas = {};
  const pasoHeroe = dt => {
    const h = S.caminar,
      m = M();
    if (!h || !m) return;
    let dx = 0,
      dy = 0;
    if (teclas.arrowleft || teclas.a) dx--;
    if (teclas.arrowright || teclas.d) dx++;
    if (teclas.arrowup || teclas.w) dy--;
    if (teclas.arrowdown || teclas.s) dy++;
    h.mov = !!(dx || dy);
    if (dx) h.izq = dx < 0;
    if (!h.mov) return;
    const v = (70 * dt) / 1000 / (dx && dy ? 1.414 : 1),
      nx = h.x + dx * v,
      ny = h.y + dy * v;
    if (!solidoEn(m, nx - 5, h.y - 6, 10, 6)) h.x = nx;
    if (!solidoEn(m, h.x - 5, ny - 6, 10, 6)) h.y = ny;
    CK.estadoDer('Héroe en ' + Math.round(h.x) + ', ' + Math.round(h.y));
  };
  const lazo = t => {
    if (!bucle) return;
    const dt = Math.min(50, t - (lazo.ult || t));
    lazo.ult = t;
    tiempo = t;
    if (S.caminar) pasoHeroe(dt);
    if (CK.seccionVisible('mapa')) pedir();
    CK.raf(lazo);
  };
  const revisarBucle = () => {
    const hace =
      S.animar ||
      !!S.caminar ||
      (M() &&
        objetosDe(M(), true).some(
          o =>
            (S.ver.luces && o.tipo === 'luz' && (o.parpadeo || o.pulso || o.sigue)) ||
            (o.clase === 'efecto' && o.props && CK.P.fx[o.props.fx])
        ));
    if (hace && !bucle) {
      bucle = true;
      lazo.ult = 0;
      CK.raf(lazo);
    } else if (!hace) bucle = false;
  };

  // ---------------------------------------------------------------- pintar tiles, terreno y zonas
  const pintarTerreno = (c, wx, wy, valor) => {
    const m = M(),
      r = datosCapa(c),
      T = m.tile,
      ci = Math.round(wx / T),
      cj = Math.round(wy / T),
      rad = S.pincel - 1;
    let cambio = false;
    for (let j = cj - rad; j <= cj + rad; j++)
      for (let i = ci - rad; i <= ci + rad; i++) {
        if (i < 0 || j < 0 || i >= r.gw || j >= r.gh) continue;
        if (rad > 1 && (i - ci) ** 2 + (j - cj) ** 2 > (rad + 0.4) ** 2) continue;
        if (r.arr[j * r.gw + i] !== valor) {
          r.arr[j * r.gw + i] = valor;
          cambio = true;
          marcarZona(r, i - 1, j - 1, i, j); // una esquina toca las 4 celdas de alrededor
        }
      }
    if (cambio) pedir();
    return cambio;
  };
  /** Anota qué celdas hay que redibujar (se junta todo en un rectángulo). */
  const marcarZona = (r, i0, j0, i1, j1) => {
    const z = r.zona;
    r.zona = z ? { i0: Math.min(z.i0, i0), j0: Math.min(z.j0, j0), i1: Math.max(z.i1, i1), j1: Math.max(z.j1, j1) } : { i0, j0, i1, j1 };
  };
  const pintarTiles = (c, wx, wy, borrar) => {
    const m = M(),
      r = datosCapa(c),
      T = m.tile,
      ci = Math.floor(wx / T),
      cj = Math.floor(wy / T),
      sl = !borrar && selloActual();
    let cambio = false,
      i0,
      j0,
      nw,
      nh;
    if (sl) {
      // el sello se repite alineado a donde empezó el trazo: al arrastrar arma el patrón sin cortes
      const a = S._ancla || (S._ancla = { i: ci, j: cj });
      i0 = a.i + Math.floor((ci - a.i) / sl.w) * sl.w;
      j0 = a.j + Math.floor((cj - a.j) / sl.h) * sl.h;
      nw = sl.w;
      nh = sl.h;
    } else {
      const n = S.pincel,
        o = Math.floor((n - 1) / 2);
      i0 = ci - o;
      j0 = cj - o;
      nw = nh = n;
    }
    for (let j = j0; j < j0 + nh; j++)
      for (let i = i0; i < i0 + nw; i++) {
        if (i < 0 || j < 0 || i >= r.gw || j >= r.gh) continue;
        const v = borrar ? 0 : valorTile(i, j);
        if (r.arr[j * r.gw + i] !== v) {
          r.arr[j * r.gw + i] = v;
          cambio = true;
          marcarZona(r, i, j, i, j);
        }
      }
    if (cambio) pedir();
    return cambio;
  };
  const rellenar = (arr, gw, gh, i0, j0, valor) => {
    if (i0 < 0 || j0 < 0 || i0 >= gw || j0 >= gh) return false;
    const obj = arr[j0 * gw + i0],
      azar = typeof valor === 'function';
    if (!azar && obj === valor) return false;
    const st = [j0 * gw + i0],
      visto = new Uint8Array(gw * gh);
    while (st.length) {
      const p = st.pop();
      if (visto[p] || arr[p] !== obj) continue;
      visto[p] = 1;
      const i = p % gw,
        j = (p / gw) | 0;
      if (i > 0) st.push(p - 1);
      if (i < gw - 1) st.push(p + 1);
      if (j > 0) st.push(p - gw);
      if (j < gh - 1) st.push(p + gw);
    }
    for (let p = 0; p < visto.length; p++) if (visto[p]) arr[p] = azar ? valor(p % gw, (p / gw) | 0) : valor;
    return true;
  };
  const pintarZona = (wx, wy, valor) => {
    const m = M(),
      zr = zonas(),
      zc = m.zonas.celda,
      ci = Math.floor(wx / zc),
      cj = Math.floor(wy / zc),
      n = S.pincel,
      o = Math.floor((n - 1) / 2);
    let cambio = false;
    for (let j = cj - o; j < cj - o + n; j++)
      for (let i = ci - o; i < ci - o + n; i++) {
        if (i < 0 || j < 0 || i >= m.zonas.w || j >= m.zonas.h) continue;
        if (zr.arr[j * m.zonas.w + i] !== valor) {
          zr.arr[j * m.zonas.w + i] = valor;
          cambio = true;
        }
      }
    if (cambio) pedir();
    return cambio;
  };
  const lineaPinta = (a, b, fn) => {
    const d = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)),
      pasos = Math.max(1, Math.ceil(d / 3));
    let c = false;
    for (let i = 1; i <= pasos; i++) c = fn(a.x + ((b.x - a.x) * i) / pasos, a.y + ((b.y - a.y) * i) / pasos) || c;
    return c;
  };

  // ---------------------------------------------------------------- colocar objetos
  const nuevoObj = (assetId, x, y) => {
    const a = CK.P.assets[assetId],
      o = { id: CK.uid('o'), asset: assetId, x, y, sx: 1, sy: 1, rot: 0, flipX: false };
    if (a && a.col) o.col = CK.clone(a.col);
    if (a && a.claveJuego) o.clave = a.claveJuego;
    return o;
  };
  const capaObjetos = () => {
    const m = M();
    let c = capaAct();
    if (!c || c.tipo !== 'objetos')
      c = m.capas
        .slice()
        .reverse()
        .find(k => k.tipo === 'objetos' && !k.bloqueada);
    if (!c) {
      c = nuevaCapa('objetos');
      m.capas.push(c);
    }
    S.capa = c.id;
    return c;
  };
  const instanciaPrefab = (pf, x, y) => {
    const g = pf.objetos.length > 1 ? CK.uid('g') : null;
    return pf.objetos.map(t => Object.assign(CK.clone(t), { id: CK.uid('o'), x: x + t.x, y: y + t.y, grupo: g, prefab: pf.id }));
  };
  const armarFantasma = m => {
    if (S.herr === 'colocar') {
      const x = ajustar(m.x),
        y = ajustar(m.y);
      fantasma =
        S.prefab && CK.P.prefabs[S.prefab]
          ? { objs: instanciaPrefab(CK.P.prefabs[S.prefab], x, y) }
          : S.asset && CK.P.assets[S.asset]
            ? { objs: [nuevoObj(S.asset, x, y)] }
            : null;
    } else if (S.herr === 'pincel' || S.herr === 'borrador') {
      const c = capaAct(),
        T = M().tile;
      if (c && c.tipo === 'terreno')
        fantasma = { circulo: { x: Math.round(m.x / T) * T, y: Math.round(m.y / T) * T, r: Math.max(0.5, S.pincel - 1) * T } };
      else if (c && c.tipo === 'tiles') {
        const sl = S.herr === 'pincel' && selloActual(),
          ci = Math.floor(m.x / T),
          cj = Math.floor(m.y / T);
        if (sl) fantasma = { celdas: { x: ci * T, y: cj * T, w: sl.w * T, h: sl.h * T }, piezas: { c, i: ci, j: cj, sl } };
        else {
          const o = Math.floor((S.pincel - 1) / 2);
          fantasma = {
            celdas: { x: (ci - o) * T, y: (cj - o) * T, w: S.pincel * T, h: S.pincel * T },
            piezas: S.herr === 'pincel' ? { c, i: ci - o, j: cj - o, n: S.pincel } : null
          };
        }
      } else fantasma = null;
    } else if (S.herr === 'zona') {
      const zc = (M().zonas || { celda: M().tile / 2 }).celda,
        o = Math.floor((S.pincel - 1) / 2);
      fantasma = { celdas: { x: (Math.floor(m.x / zc) - o) * zc, y: (Math.floor(m.y / zc) - o) * zc, w: S.pincel * zc, h: S.pincel * zc } };
    } else fantasma = null;
    pedir();
  };

  /**
   * Pone algo de la biblioteca en el lugar de un punto o luz ya colocado (o en {x, y}).
   * q = { tipo: 'luz', p, nombre } | { tipo: 'npc' | 'fx' | 'asset' | 'prefab', id }
   */
  const ponerDeBib = (q, o) => {
    const mm = M();
    if (!mm || !q || !o) return;
    const c = (o.id && capaDe(o.id)) || capaObjetos(),
      f = fin('Poner de la biblioteca'),
      nuevos = [];
    const punto = clase => {
      const n = { id: CK.uid('o'), tipo: 'punto', clase, nombre: '', x: Math.round(o.x), y: Math.round(o.y), props: {} };
      c.objetos.push(n);
      nuevos.push(n.id);
      return n;
    };
    if (q.tipo === 'luz') {
      let l = o.tipo === 'luz' ? o : null;
      if (!l) {
        l = { id: CK.uid('o'), tipo: 'luz', x: Math.round(o.x), y: Math.round(o.y), radio: 48, color: '#ffc46b', fuerza: 0.55 };
        c.objetos.push(l);
        nuevos.push(l.id);
      }
      CK.luces.aplicar(l, q.p);
      if (q.nombre) l.nombre = q.nombre;
    } else if (q.tipo === 'npc') {
      const n = CK.P.npcs[q.id];
      if (!n) return;
      const pt = o.tipo === 'punto' && o.clase === 'npc' ? o : punto('npc');
      pt.props = pt.props || {};
      pt.props.npc = n.id;
      const r = n.retrato && CK.P.assets[n.retrato];
      if (r && r.tipo !== 'ui') pt.props.sprite = r.id;
      if (!pt.nombre) pt.nombre = n.nombre;
    } else if (q.tipo === 'fx') {
      if (!CK.P.fx[q.id]) return;
      const pt = o.tipo === 'punto' && o.clase === 'efecto' ? o : punto('efecto');
      pt.props = pt.props || {};
      pt.props.fx = q.id;
      if (!pt.nombre) pt.nombre = CK.P.fx[q.id].nombre || q.id;
    } else if (q.tipo === 'asset') {
      if (!CK.P.assets[q.id]) return;
      const n = nuevoObj(q.id, Math.round(o.x), Math.round(o.y));
      c.objetos.push(n);
      nuevos.push(n.id);
    } else if (q.tipo === 'prefab') {
      const pf = CK.P.prefabs[q.id];
      if (!pf) return;
      instanciaPrefab(pf, Math.round(o.x), Math.round(o.y)).forEach(n => {
        c.objetos.push(n);
        nuevos.push(n.id);
      });
    }
    f();
    CK.emit('mapa-capas');
    revisarBucle();
    elegir(nuevos.length ? nuevos : [o.id]);
    CK.emit('mapa-prop');
    pedir();
  };

  // ---------------------------------------------------------------- herramientas (eventos del lienzo)
  const herramienta = {
    pasar(m) {
      armarFantasma(m);
      const mm = M();
      if (!mm) return;
      CK.estadoDer(Math.floor(m.x) + ', ' + Math.floor(m.y) + '  ·  tile ' + Math.floor(m.x / mm.tile) + ', ' + Math.floor(m.y / mm.tile));
      let cur = '';
      if (S.herr === 'seleccionar') {
        const s = S.sel.length === 1 && buscarObj(S.sel[0]);
        const asa = s && !s.tipo ? asaEn(cajaDe(s), desrotar(s, m)) : s && s.tipo === 'luz' && S.ver.luces && asaLuzEn(s, m) ? 'luz' : null;
        cur =
          asa === 'luz'
            ? 'grab'
            : asa === 'rot'
              ? 'crosshair'
              : asa
                ? { nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' }[asa] + '-resize'
                : objetoEn(m.x, m.y)
                  ? 'move'
                  : '';
      } else cur = 'crosshair';
      if (!CK._espacio) vista.c.style.cursor = CK.cur(cur, S.herr);
    },
    salir() {
      fantasma = null;
      pedir();
    },
    bajar(m) {
      const mm = M();
      if (!mm) return;
      const der = m.boton === 2,
        h = S.herr;
      if (S.caminar && h !== 'caminar') {
      }
      if (h === 'seleccionar') {
        const s = S.sel.length === 1 && buscarObj(S.sel[0]),
          asa = s && !s.tipo ? asaEn(cajaDe(s), desrotar(s, m)) : null;
        const al = s && s.tipo === 'luz' && S.ver.luces && !der ? asaLuzEn(s, m) : null;
        if (al) {
          arrastre = { tipo: 'luz-asa', asa: al.k, o: s, fin: fin('Ajustar luz') };
          return;
        }
        if (asa) {
          arrastre = {
            tipo: asa === 'rot' ? 'rotar' : 'escalar',
            asa,
            o0: CK.clone(s),
            caja: cajaDe(s),
            m0: desrotar(s, m),
            fin: fin(asa === 'rot' ? 'Rotar' : 'Escalar')
          };
          return;
        }
        const o = objetoEn(m.x, m.y);
        if (o) {
          let ids = m.alt ? [o.id] : conGrupo([o.id]);
          if (m.shift) {
            if (S.sel.includes(o.id)) elegir(S.sel.filter(i => !ids.includes(i)));
            else elegir(ids, true);
          } else if (!S.sel.includes(o.id)) elegir(ids);
          if (m.ctrl && !der) duplicar(true);
          arrastre = {
            tipo: 'mover',
            m0: m,
            pos: S.sel.map(id => {
              const q = buscarObj(id);
              return { id, x: q.x, y: q.y };
            }),
            fin: fin('Mover'),
            movio: false
          };
          return;
        }
        const nota = (mm.notas || []).find(n => Math.abs(n.x - m.x) * vista.z < 9 && Math.abs(n.y - m.y) * vista.z < 9);
        if (nota) {
          S.selNota = nota.id;
          S.sel = [];
          CK.emit('mapa-sel');
          arrastre = { tipo: 'mover-nota', n: nota, dx: m.x - nota.x, dy: m.y - nota.y, fin: fin('Mover nota') };
          pedir();
          return;
        }
        if (!m.shift) elegir([]);
        arrastre = { tipo: 'marco', x0: m.x, y0: m.y, x1: m.x, y1: m.y };
        return;
      }
      if (h === 'colocar') {
        if (der) {
          CK.mapa.herr('seleccionar');
          return;
        }
        if (!fantasma || !fantasma.objs) {
          CK.aviso('Elegí primero un asset en la pestaña Assets.', 'info');
          return;
        }
        const c = capaObjetos(),
          f = fin('Colocar');
        fantasma.objs.forEach(o => c.objetos.push(CK.clone(o)));
        f();
        elegir(fantasma.objs.map(o => o.id));
        CK.emit('mapa-capas');
        armarFantasma(m);
        revisarBucle();
        return;
      }
      if (h === 'pincel' || h === 'borrador') {
        const c = capaAct();
        if (!c || c.tipo === 'objetos') {
          CK.aviso('Elegí una capa de Terreno o de Tiles en la pestaña Capas (o creá una).', 'info');
          return;
        }
        if (c.bloqueada) {
          CK.aviso('Esa capa está bloqueada.', 'info');
          return;
        }
        if (!c.tileset) {
          CK.aviso('Esta capa todavía no tiene tileset. Elegilo en la pestaña Capas.', 'info');
          return;
        }
        const borra = h === 'borrador' || der;
        if (m.alt && c.tipo === 'tiles') {
          // cuentagotas: toma la pieza (con su giro) que hay en el mapa
          const r = datosCapa(c),
            i = Math.floor(m.x / mm.tile),
            j = Math.floor(m.y / mm.tile),
            v = i >= 0 && j >= 0 && i < r.gw && j < r.gh ? r.arr[j * r.gw + i] : 0;
          if (v & TXF.idx) {
            S.tileSel = [(v & TXF.idx) - 1];
            S.tileXf = v & ~TXF.idx;
            S.sello = null;
            CK.emit('mapa-tiles');
            CK.estado('Pieza tomada del mapa');
          }
          return;
        }
        if (c.tipo === 'tiles') {
          const T0 = mm.tile;
          S._ancla = { i: Math.floor(m.x / T0), j: Math.floor(m.y / T0) };
        }
        if (m.shift && c.tipo === 'tiles') {
          arrastre = { tipo: 'rect-tiles', c, borra, x0: m.x, y0: m.y, x1: m.x, y1: m.y, fin: fin('Rectángulo de tiles') };
          return;
        }
        const fn = (x, y) => (c.tipo === 'terreno' ? pintarTerreno(c, x, y, borra ? 0 : 1) : pintarTiles(c, x, y, borra));
        arrastre = { tipo: 'trazo', fn, ult: m, c, fin: fin(borra ? 'Borrar' : 'Pintar') };
        fn(m.x, m.y);
        return;
      }
      if (h === 'balde') {
        const c = capaAct();
        if (!c || c.tipo === 'objetos' || !c.tileset) {
          CK.aviso('Elegí una capa de Terreno o Tiles con tileset.', 'info');
          return;
        }
        const r = datosCapa(c),
          T = mm.tile,
          f = fin('Rellenar');
        let ok;
        if (c.tipo === 'terreno') ok = rellenar(r.arr, r.gw, r.gh, Math.round(m.x / T), Math.round(m.y / T), der ? 0 : 1);
        else
          ok = rellenar(
            r.arr,
            r.gw,
            r.gh,
            Math.floor(m.x / T),
            Math.floor(m.y / T),
            der ? 0 : (S._ancla = { i: Math.floor(m.x / T), j: Math.floor(m.y / T) }) && ((i, j) => valorTile(i, j))
          );
        if (ok) {
          r.sucio = true;
          guardarCapa(c);
          f();
          pedir();
        }
        return;
      }
      if (h === 'zona') {
        const val = der ? 0 : S.zonaValor;
        zonas();
        if (m.shift) {
          arrastre = { tipo: 'rect-zona', val, x0: m.x, y0: m.y, x1: m.x, y1: m.y, fin: fin('Zona') };
          return;
        }
        const fn = (x, y) => pintarZona(x, y, val);
        arrastre = { tipo: 'trazo', fn, ult: m, zona: true, fin: fin('Pintar zona') };
        fn(m.x, m.y);
        return;
      }
      if (h === 'balde-zona') {
        const zr = zonas(),
          zc = mm.zonas.celda,
          f = fin('Rellenar zona');
        if (rellenar(zr.arr, mm.zonas.w, mm.zonas.h, Math.floor(m.x / zc), Math.floor(m.y / zc), der ? 0 : S.zonaValor)) {
          mm.zonas.datos = PIX.rle(zr.arr);
          f();
          pedir();
        }
        return;
      }
      if (h === 'colision') {
        const k = (mm.colisiones || [])
          .slice()
          .reverse()
          .find(
            k => m.x >= k.x - 2 / vista.z && m.x <= k.x + k.w + 2 / vista.z && m.y >= k.y - 2 / vista.z && m.y <= k.y + k.h + 2 / vista.z
          );
        if (der && k) {
          const f = fin('Borrar colisión');
          mm.colisiones = mm.colisiones.filter(q => q.id !== k.id);
          f();
          S.selCol = null;
          pedir();
          CK.emit('mapa-sel');
          return;
        }
        if (k && k.id === S.selCol) {
          const asa = asaEn(k, m);
          if (asa && asa !== 'rot') {
            arrastre = { tipo: 'col-escalar', k, asa, k0: CK.clone(k), m0: m, fin: fin('Ajustar colisión') };
            return;
          }
        }
        if (k) {
          S.selCol = k.id;
          S.sel = [];
          S.selNota = null;
          CK.emit('mapa-sel');
          arrastre = { tipo: 'col-mover', k, dx: m.x - k.x, dy: m.y - k.y, fin: fin('Mover colisión') };
          pedir();
          return;
        }
        S.selCol = null;
        arrastre = {
          tipo: 'col-nueva',
          x0: ajustar(m.x),
          y0: ajustar(m.y),
          x1: ajustar(m.x),
          y1: ajustar(m.y),
          fin: fin('Nueva colisión')
        };
        return;
      }
      if (h === 'ruta') {
        const o = S.sel.length === 1 && buscarObj(S.sel[0]);
        if (!o || o.clase !== 'enemigo') {
          CK.mapa.herr('seleccionar');
          return;
        }
        const f = fin(der ? 'Quitar punto de ruta' : 'Punto de ruta');
        o.ruta = o.ruta || [];
        if (der) o.ruta.pop();
        else o.ruta.push([ajustar(m.x), ajustar(m.y)]);
        f();
        pedir();
        CK.emit('mapa-sel');
        return;
      }
      if (h === 'luz') {
        const c = capaObjetos(),
          f = fin('Agregar luz'),
          o = {
            id: CK.uid('o'),
            tipo: 'luz',
            x: Math.round(m.x),
            y: Math.round(m.y),
            radio: 48,
            color: '#ffc46b',
            fuerza: 0.55,
            parpadeo: 1
          };
        c.objetos.push(o);
        f();
        elegir([o.id]);
        CK.emit('mapa-capas');
        revisarBucle();
        CK.mapa.herr('seleccionar');
        return;
      }
      if (h === 'punto') {
        const c = capaObjetos(),
          f = fin('Agregar punto'),
          o = {
            id: CK.uid('o'),
            tipo: 'punto',
            clase: S.puntoClase || 'aparicion',
            nombre: '',
            x: ajustar(m.x),
            y: ajustar(m.y),
            props: {}
          };
        c.objetos.push(o);
        f();
        elegir([o.id]);
        CK.emit('mapa-capas');
        CK.mapa.herr('seleccionar');
        // NPC o efecto: si hay fichas o efectos hechos, ofrecerlos ahí mismo
        if (CK.mapa.ofrecerBib) CK.mapa.ofrecerBib(o, m.e);
        return;
      }
      if (h === 'nota') {
        CK.pedir('Nota en el mapa', 'Qué hay que hacer o revisar acá', '').then(t => {
          if (!t) return;
          const f = fin('Agregar nota');
          mm.notas = mm.notas || [];
          const n = { id: CK.uid('n'), x: Math.round(m.x), y: Math.round(m.y), texto: t, clase: 'Arte', hecho: false, creada: Date.now() };
          mm.notas.push(n);
          f();
          S.selNota = n.id;
          S.sel = [];
          CK.emit('mapa-sel');
          CK.emit('notas');
          pedir();
        });
        return;
      }
      if (h === 'marca') {
        const o = objetoEn(m.x, m.y);
        if (!o || o.tipo) {
          CK.aviso('Hacé clic sobre el objeto que querés animar.', 'info');
          return;
        }
        elegir([o.id]);
        CK.mapa.marcar(o.id);
        return;
      }
      if (h === 'caminar') {
        const c = capaObjetos();
        S.caminar = { x: m.x, y: m.y, capa: c.id, asset: (S.caminar && S.caminar.asset) || null };
        revisarBucle();
        CK.estado('Movete con las flechas o WASD. Clic para saltar a otro punto. Esc para salir.');
        pedir();
        return;
      }
    },
    mover(m) {
      const a = arrastre,
        mm = M();
      if (!a) return;
      if (a.tipo === 'mover') {
        let dx = m.x - a.m0.x,
          dy = m.y - a.m0.y;
        if (m.shift) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        if (Math.abs(dx) + Math.abs(dy) > 1 / vista.z) a.movio = true;
        a.pos.forEach((p, i) => {
          const o = buscarObj(p.id);
          if (!o) return;
          if (i === 0 && S.iman) {
            const nx = ajustar(p.x + dx),
              ny = ajustar(p.y + dy);
            dx = nx - p.x;
            dy = ny - p.y;
          }
          o.x = Math.round(p.x + dx);
          o.y = Math.round(p.y + dy);
        });
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'escalar') {
        // El borde opuesto al asa queda quieto (como en cualquier programa de dibujo); con Ctrl se escala desde el centro.
        // Todo se calcula en el espacio del objeto sin girar y el pie se vuelve a llevar al mundo con el giro.
        m = desrotar(a.o0, m);
        const o = buscarObj(a.o0.id),
          f = frameDe(o),
          o0 = a.o0,
          s0x = Math.abs(o0.sx || 1),
          s0y = Math.abs(o0.sy || 1),
          w0 = f.w * s0x,
          h0 = f.h * s0y,
          izq = o0.x - w0 / 2,
          der = o0.x + w0 / 2,
          arr = o0.y - h0,
          centro = m.ctrl;
        let w = w0,
          hh = h0;
        if (/e/.test(a.asa)) w = centro ? (m.x - o0.x) * 2 : m.x - izq;
        if (/w/.test(a.asa)) w = centro ? (o0.x - m.x) * 2 : der - m.x;
        if (/n/.test(a.asa)) hh = centro ? (o0.y - h0 / 2 - m.y) * 2 : o0.y - m.y;
        if (/s/.test(a.asa)) hh = centro ? (m.y - (o0.y - h0 / 2)) * 2 : m.y - arr;
        w = Math.max(1, w);
        hh = Math.max(1, hh);
        if (a.asa.length === 2 && !m.shift) {
          // esquinas: mantienen la proporción (Mayús: libre)
          const k = Math.max(w / w0, hh / h0);
          w = w0 * k;
          hh = h0 * k;
        }
        // tamaños en píxeles enteros (el pixel art no queda con medio píxel); con Alt, de a 25 %
        let sx = Math.round(w) / f.w,
          sy = Math.round(hh) / f.h;
        if (m.alt) {
          sx = Math.max(0.25, Math.round(sx * 4) / 4);
          sy = Math.max(0.25, Math.round(sy * 4) / 4);
        }
        w = f.w * sx;
        hh = f.h * sy;
        // dónde queda el pie (abajo al centro) en el espacio sin girar
        let px = o0.x,
          py = o0.y;
        if (!centro) {
          if (/e/.test(a.asa)) px = izq + w / 2;
          if (/w/.test(a.asa)) px = der - w / 2;
          if (/s/.test(a.asa)) py = arr + hh;
        } else py = o0.y - h0 / 2 + hh / 2;
        const r = ((o0.rot || 0) * Math.PI) / 180,
          dx = px - o0.x,
          dy = py - o0.y;
        o.x = Math.round(o0.x + dx * Math.cos(r) - dy * Math.sin(r));
        o.y = Math.round(o0.y + dx * Math.sin(r) + dy * Math.cos(r));
        o.sx = +(Math.sign(o0.sx || 1) * sx).toFixed(4);
        o.sy = +(Math.sign(o0.sy || 1) * sy).toFixed(4);
        CK.estado(
          'Tamaño: ' + Math.round(w) + ' × ' + Math.round(hh) + ' px (' + Math.round(sx * 100) + ' % × ' + Math.round(sy * 100) + ' %)'
        );
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'luz-asa') {
        const o = a.o,
          dx = m.x - o.x,
          dy = m.y - o.y,
          f = o.forma || 'punto',
          ang = ((((Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360,
          d = (((f === 'area' || f === 'linea') && o.dir === undefined ? 0 : o.dir === undefined ? 90 : +o.dir) * Math.PI) / 180,
          lx = dx * Math.cos(d) + dy * Math.sin(d),
          ly = -dx * Math.sin(d) + dy * Math.cos(d),
          paso = v => (m.shift ? Math.round(v) : Math.round(v / 15) * 15) % 360;
        if (a.asa === 'radio') {
          const base = f === 'area' ? (+o.ancho || 32) / 2 : 0;
          o.radio = Math.max(4, Math.round(f === 'linea' ? Math.abs(ly) : f === 'area' ? lx - base : Math.hypot(dx, dy)));
        } else if (a.asa === 'punta') {
          o.radio = Math.max(4, Math.round(Math.hypot(dx, dy)));
          o.dir = paso(ang);
        } else if (a.asa === 'giro') {
          o.dir = paso(ang + 90);
        } else if (a.asa === 'apertura') {
          let df = Math.abs(((ang - (o.dir === undefined ? 90 : +o.dir) + 540) % 360) - 180);
          o.apertura = Math.max(4, Math.min(300, Math.round(df * 2)));
        } else if (a.asa === 'ancho') o.ancho = Math.max(1, Math.round(Math.abs(f === 'sol' ? ly : lx) * 2));
        else if (a.asa === 'alto') o.alto = Math.max(1, Math.round(Math.abs(ly) * 2));
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'rotar') {
        const o = buscarObj(a.o0.id),
          b = a.caja,
          cx = b.x + b.w / 2,
          cy = b.y + b.h;
        let ang = (Math.atan2(m.y - cy, m.x - cx) * 180) / Math.PI + 90;
        ang = m.shift ? Math.round(ang) : Math.round(ang / 15) * 15;
        o.rot = ((ang % 360) + 360) % 360;
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'marco' || a.tipo === 'rect-zona' || a.tipo === 'rect-tiles') {
        a.x1 = m.x;
        a.y1 = m.y;
        pedir();
      } else if (a.tipo === 'trazo') {
        lineaPinta(a.ult, m, a.fn);
        a.ult = m;
        armarFantasma(m);
      } else if (a.tipo === 'col-nueva') {
        a.x1 = ajustar(m.x);
        a.y1 = ajustar(m.y);
        pedir();
      } else if (a.tipo === 'col-mover') {
        a.k.x = ajustar(m.x - a.dx);
        a.k.y = ajustar(m.y - a.dy);
        reanclar(a.k);
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'col-escalar') {
        const k = a.k,
          k0 = a.k0,
          x1 = k0.x + k0.w,
          y1 = k0.y + k0.h,
          mx = ajustar(m.x),
          my = ajustar(m.y);
        let nx0 = k0.x,
          ny0 = k0.y,
          nx1 = x1,
          ny1 = y1;
        if (/w/.test(a.asa)) nx0 = Math.min(mx, x1 - 1);
        if (/e/.test(a.asa)) nx1 = Math.max(mx, k0.x + 1);
        if (/n/.test(a.asa)) ny0 = Math.min(my, y1 - 1);
        if (/s/.test(a.asa)) ny1 = Math.max(my, k0.y + 1);
        k.x = nx0;
        k.y = ny0;
        k.w = nx1 - nx0;
        k.h = ny1 - ny0;
        reanclar(k);
        CK.emit('mapa-prop');
        pedir();
      } else if (a.tipo === 'mover-nota') {
        a.n.x = Math.round(m.x - a.dx);
        a.n.y = Math.round(m.y - a.dy);
        pedir();
      }
    },
    subir(m) {
      const a = arrastre,
        mm = M();
      arrastre = null;
      if (!a) return;
      if (a.tipo === 'marco') {
        const r = rectDe(a);
        if (r.w * vista.z > 4 || r.h * vista.z > 4) {
          const ids = [];
          mm.capas.forEach(c => {
            if (c.tipo === 'objetos' && c.visible && !c.bloqueada)
              c.objetos.forEach(o => {
                if (o.oculto || o.bloqueado) return;
                const b = cajaDe(o);
                if (b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y) ids.push(o.id);
              });
          });
          elegir(conGrupo(ids), m.shift);
        }
        pedir();
        return;
      }
      if (a.tipo === 'trazo') {
        if (a.zona) mm.zonas.datos = PIX.rle(zonas().arr);
        else guardarCapa(a.c);
        a.fin();
        return;
      }
      if (a.tipo === 'rect-zona') {
        const r = rectDe(a),
          zr = zonas(),
          zc = mm.zonas.celda;
        for (let j = Math.max(0, Math.floor(r.y / zc)); j <= Math.min(mm.zonas.h - 1, Math.floor((r.y + r.h) / zc)); j++)
          for (let i = Math.max(0, Math.floor(r.x / zc)); i <= Math.min(mm.zonas.w - 1, Math.floor((r.x + r.w) / zc)); i++)
            zr.arr[j * mm.zonas.w + i] = a.val;
        mm.zonas.datos = PIX.rle(zr.arr);
        a.fin();
        pedir();
        return;
      }
      if (a.tipo === 'rect-tiles') {
        const r = rectDe(a),
          d = datosCapa(a.c),
          T = mm.tile;
        for (let j = Math.max(0, Math.floor(r.y / T)); j <= Math.min(d.gh - 1, Math.floor((r.y + r.h) / T)); j++)
          for (let i = Math.max(0, Math.floor(r.x / T)); i <= Math.min(d.gw - 1, Math.floor((r.x + r.w) / T)); i++)
            d.arr[j * d.gw + i] = a.borra ? 0 : valorTile(i, j);
        d.sucio = true;
        guardarCapa(a.c);
        a.fin();
        pedir();
        return;
      }
      if (a.tipo === 'col-nueva') {
        const r = rectDe(a);
        if (r.w >= 2 && r.h >= 2) {
          mm.colisiones = mm.colisiones || [];
          const k = { id: CK.uid('k'), x: r.x, y: r.y, w: r.w, h: r.h };
          const debajo = S.colAnclar && objetoDebajo(mm, r.x + r.w / 2, r.y + r.h / 2);
          if (debajo) anclarCol(k, debajo);
          mm.colisiones.push(k);
          a.fin();
          if (debajo)
            CK.estado(
              'Colisión anclada a «' +
                ((CK.P.assets[debajo.asset] || {}).nombre || 'objeto') +
                '»: se mueve con él. Se desancla en Propiedades.'
            );
          S.selCol = k.id;
          CK.emit('mapa-sel');
        }
        pedir();
        return;
      }
      if ((a.tipo === 'col-mover' || a.tipo === 'col-escalar') && a.k) reanclar(a.k);
      if (a.fin) {
        a.fin();
        CK.emit('mapa-prop');
        if (a.tipo === 'mover' && a.movio) CK.emit('mapa-capas');
      }
      pedir();
    }
  };

  // ---------------------------------------------------------------- acciones
  const borrarSel = () => {
    const m = M();
    if (!m) return;
    if (S.selCol) {
      const f = fin('Borrar colisión');
      m.colisiones = m.colisiones.filter(k => k.id !== S.selCol);
      f();
      S.selCol = null;
    } else if (S.selNota) {
      const f = fin('Borrar nota');
      m.notas = m.notas.filter(n => n.id !== S.selNota);
      f();
      S.selNota = null;
      CK.emit('notas');
    } else if (S.sel.length) {
      const f = fin('Borrar objetos');
      m.capas.forEach(c => {
        if (c.tipo === 'objetos') c.objetos = c.objetos.filter(o => !S.sel.includes(o.id));
      });
      // sus colisiones ancladas se van con ellos
      if (m.colisiones) m.colisiones = m.colisiones.filter(k => !k.ancla || !S.sel.includes(k.ancla));
      f();
      S.sel = [];
      CK.emit('mapa-capas');
    }
    CK.emit('mapa-sel');
    pedir();
  };
  const duplicar = enSitio => {
    if (!S.sel.length) return;
    const f = fin('Duplicar'),
      nuevos = [],
      grupos = {};
    S.sel.forEach(id => {
      const o = buscarObj(id),
        c = capaDe(id),
        n = CK.clone(o);
      n.id = CK.uid('o');
      if (o.grupo) {
        grupos[o.grupo] = grupos[o.grupo] || CK.uid('g');
        n.grupo = grupos[o.grupo];
      }
      if (!enSitio) {
        n.x += M().tile;
        n.y += M().tile;
      }
      c.objetos.push(n);
      nuevos.push(n.id);
      (M().colisiones || [])
        .filter(k => k.ancla === o.id)
        .forEach(k => M().colisiones.push(Object.assign(CK.clone(k), { id: CK.uid('k'), ancla: n.id })));
    });
    Object.keys(grupos).forEach(g => {
      M().capas.forEach(c => {
        if (c.tipo === 'objetos') {
          const og = (c.grupos || []).find(x => x.id === g);
          if (og) c.grupos.push({ id: grupos[g], nombre: og.nombre + ' copia' });
        }
      });
    });
    f();
    elegir(nuevos);
    CK.emit('mapa-capas');
  };
  const agrupar = () => {
    const objs = S.sel.map(buscarObj).filter(Boolean);
    if (objs.length < 2) {
      CK.aviso('Seleccioná dos o más objetos para agruparlos (Mayús + clic o arrastrando un marco).', 'info');
      return;
    }
    const f = fin('Agrupar'),
      g = CK.uid('g'),
      c = capaDe(objs[0].id);
    objs.forEach(o => {
      o.grupo = g;
    });
    c.grupos = c.grupos || [];
    c.grupos.push({ id: g, nombre: 'Grupo ' + (c.grupos.length + 1) });
    f();
    CK.emit('mapa-capas');
    CK.aviso('Agrupados: ahora se mueven juntos. Alt + clic para tocar uno solo.');
  };
  const desagrupar = () => {
    const f = fin('Desagrupar');
    S.sel.map(buscarObj).forEach(o => {
      if (o) delete o.grupo;
    });
    f();
    CK.emit('mapa-capas');
  };
  const cambiar = (nombre, fn) => {
    const f = fin(nombre);
    S.sel.map(buscarObj).filter(Boolean).forEach(fn);
    f();
    CK.emit('mapa-prop');
    pedir();
  };
  const reordenar = dir => {
    if (!S.sel.length) return;
    const f = fin('Ordenar');
    S.sel.forEach(id => {
      const c = capaDe(id),
        o = buscarObj(id);
      if (c.orden === 'y') o.z = (o.z || 0) + dir * 4;
      else {
        const i = c.objetos.indexOf(o),
          j = CK.clamp(i + dir, 0, c.objetos.length - 1);
        c.objetos.splice(i, 1);
        c.objetos.splice(j, 0, o);
      }
    });
    f();
    CK.emit('mapa-prop');
    CK.emit('mapa-capas');
    pedir();
  };
  const colAuto = () =>
    cambiar('Colisión automática', o => {
      if (o.tipo || !CK.img[o.asset]) return;
      const a = CK.P.assets[o.asset],
        f = CK.asset.cuadro(a, 0),
        im = PIX.crop(CK.asset.pix(o.asset), f.x, f.y, f.w, f.h),
        r = PIX.footprint(im, 0.3);
      if (r) o.col = { x: r.x - f.w / 2, y: r.y - f.h, w: r.w, h: r.h };
    });
  const guardarPrefab = async () => {
    const objs = S.sel.map(buscarObj).filter(Boolean);
    if (!objs.length) return;
    const n = await CK.pedir(
      'Guardar como prearmado',
      'Nombre (por ejemplo: Antorcha de pared)',
      objs[0].nombre || (CK.P.assets[objs[0].asset] || {}).nombre || 'Prearmado'
    );
    if (!n) return;
    const base = objs.find(o => !o.tipo) || objs[0],
      id = CK.slug(n) + '_' + Date.now().toString(36).slice(-3);
    CK.P.prefabs[id] = {
      id,
      nombre: n,
      objetos: objs.map(o => {
        const t = CK.clone(o);
        delete t.id;
        delete t.grupo;
        t.x = o.x - base.x;
        t.y = o.y - base.y;
        return t;
      })
    };
    CK.tocar();
    CK.emit('prefabs');
    CK.aviso('Prearmado guardado. Lo encontrás en Assets → Prearmados.');
  };
  const marcar = async id => {
    const o = buscarObj(id);
    if (!o) return;
    const tipos = [
      ['', 'Lo decidimos después'],
      ['mano', 'La hago yo a mano']
    ].concat(Object.keys(PIX.ANIMS).map(k => [k, 'Generada: ' + PIX.ANIMS[k].nombre]));
    const im = CK.marcaAnim.imagenDe(o.asset);
    if (!im) return CK.aviso('Ese objeto no tiene dibujo para marcar.', 'info');
    const a = CK.P.assets[o.asset];
    const r = await CK.marcaAnim.editar({
      titulo: 'Marcar para animar · ' + (o.nombre || (a && a.nombre) || 'objeto'),
      im,
      marca: o.marca,
      tipos,
      quitar: !!o.marca
    });
    if (!r) return;
    const f = fin('Marca de animación');
    if (r === 'quitar') delete o.marca;
    else o.marca = r;
    f();
    CK.emit('mapa-prop');
    CK.emit('notas');
    pedir();
  };

  // ---------------------------------------------------------------- piezas de un tileset que cambian de lugar
  /** Capas de Tiles (de todos los mapas) que usan el tileset `id`. */
  const capasConTileset = id => {
    const out = [];
    Object.values(CK.P.mapas).forEach(m => m.capas.forEach(c => c.tipo === 'tiles' && c.tileset === id && out.push({ m, c })));
    return out;
  };
  /** Reacomoda lo pintado cuando las piezas de un tileset cambian de lugar. mapa[índice viejo] = índice nuevo (o -1 si se borró). */
  const remapTiles = (id, mapa) => {
    capasConTileset(id).forEach(({ m, c }) => {
      const t = m.tile,
        n = Math.ceil(m.w / t) * Math.ceil(m.h / t),
        arr = rt[c.id] && S.id === m.id ? rt[c.id].arr : unrle16(c.datos, n);
      for (let p = 0; p < arr.length; p++) {
        const v = arr[p];
        if (!(v & TXF.idx)) continue;
        const nv = mapa[(v & TXF.idx) - 1];
        arr[p] = nv === undefined ? v : nv < 0 ? 0 : (nv + 1) | (v & ~TXF.idx);
      }
      c.datos = rle16(arr);
      delete rt[c.id];
    });
    pedir();
  };

  // ---------------------------------------------------------------- API
  CK.mapa = {
    TXF,
    xfGirar,
    xfEspejo,
    selloActual,
    capasConTileset,
    remapTiles,
    S,
    ZONAS,
    PUNTOS,
    ponerDeBib,
    pideHorneado,
    hornearObjeto,
    sincronizarCols,
    anclarCol,
    desanclarCol,
    reanclar,
    objetoDebajo,
    nuevaCapa,
    objetosDe,
    colDe,
    cajaDe,
    hornearSuelo,
    foto,
    buscarObj,
    capaDe,
    datosCapa,
    guardarCapa,
    zonas,
    fin,
    elegir,
    pedir,
    borrarSel,
    duplicar,
    agrupar,
    desagrupar,
    cambiar,
    reordenar,
    colAuto,
    guardarPrefab,
    marcar,
    herramienta,
    pintar,
    revisarBucle,
    solidoEn,
    frameDe,
    actual: M,
    capaAct,
    nuevoDatos(nombre, w, h, id) {
      let base = id || CK.slug(nombre),
        mid = base,
        n = 2;
      while (CK.P.mapas[mid]) mid = base + '_' + n++;
      return {
        id: mid,
        nombre,
        w,
        h,
        tile: CK.P.estilo.tile,
        fondo: null,
        colorFondo: '#3f6b35',
        capas: [nuevaCapa('terreno', 'Suelo'), nuevaCapa('objetos', 'Objetos')],
        colisiones: [],
        notas: [],
        ambiente: { color: '#20264a', fuerza: 0 }
      };
    },
    crear(nombre, w, h) {
      const m = this.nuevoDatos(nombre, w, h);
      CK.P.mapas[m.id] = m;
      CK.tocar();
      CK.emit('mapas');
      return m;
    },
    abrir(id) {
      if (!CK.P.mapas[id]) return;
      S.id = id;
      S.sel = [];
      S.selCol = null;
      S.selNota = null;
      S.caminar = null;
      Object.keys(rt).forEach(k => delete rt[k]);
      const m = M();
      S.capa = (
        m.capas
          .slice()
          .reverse()
          .find(c => c.tipo === 'objetos') ||
        m.capas[0] ||
        {}
      ).id;
      CK.P.ui.mapa = id;
      CK.emit('mapa-abierto');
      if (vista) vista.encuadrar(m.w, m.h);
      revisarBucle();
    },
    herr(h) {
      S.herr = h;
      if (h !== 'caminar' && S.caminar) {
        S.caminar = null;
        revisarBucle();
      }
      fantasma = null;
      CK.emit('mapa-herr');
      pedir();
    },
    ponerVista(v) {
      vista = v;
    },
    vista: () => vista,
    centroVista() {
      return vista && M() ? vista.aMundo(vista.w / 2, vista.h / 2) : null;
    },
    invalidar(capaId) {
      if (capaId) {
        if (rt[capaId]) rt[capaId].sucio = true;
      } else Object.keys(rt).forEach(k => delete rt[k]);
      pedir();
    },
    redimensionar(w, h) {
      const m = M(),
        f = fin('Cambiar tamaño del mapa');
      m.capas.forEach(c => {
        if (c.tipo === 'objetos') return;
        const r = datosCapa(c),
          old = r.arr,
          ogw = r.gw,
          ogh = r.gh;
        m.w = w;
        m.h = h;
        const d = dims(m, c),
          n = new old.constructor(d.gw * d.gh);
        for (let j = 0; j < Math.min(ogh, d.gh); j++) for (let i = 0; i < Math.min(ogw, d.gw); i++) n[j * d.gw + i] = old[j * ogw + i];
        rt[c.id] = { tipo: c.tipo, gw: d.gw, gh: d.gh, arr: n, sucio: true };
        guardarCapa(c);
      });
      if (m.zonas) {
        const zr = zonas(),
          zc = m.zonas.celda,
          nw = Math.ceil(w / zc),
          nh = Math.ceil(h / zc),
          n = new Uint8Array(nw * nh);
        for (let j = 0; j < Math.min(nh, m.zonas.h); j++)
          for (let i = 0; i < Math.min(nw, m.zonas.w); i++) n[j * nw + i] = zr.arr[j * m.zonas.w + i];
        m.zonas = { celda: zc, w: nw, h: nh, datos: PIX.rle(n) };
        delete rt._zonas;
      }
      m.w = w;
      m.h = h;
      f();
      this.invalidar();
    },
    teclas
  };
  CK.on('datos', (g, id) => {
    if (g === 'mapas' && id === S.id) {
      Object.keys(rt).forEach(k => delete rt[k]);
      S.sel = S.sel.filter(i => buscarObj(i));
      CK.emit('mapa-capas');
      CK.emit('mapa-sel');
      revisarBucle();
      pedir();
    }
  });
  CK.on('asset-img', () => {
    Object.keys(rt).forEach(k => {
      if (rt[k]) rt[k].sucio = true;
    });
    pedir();
  });
  window.addEventListener('keydown', e => {
    teclas[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', e => {
    delete teclas[e.key.toLowerCase()];
  });
})();
