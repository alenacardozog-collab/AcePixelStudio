/* GIF: arma un GIF animado a partir de cuadros { w, h, d } (RGBA). Sirve en el navegador y en Node. Devuelve Uint8Array. */
(function (root) {
  'use strict';
  const PIXL = typeof module !== 'undefined' && module.exports ? require('./pix.js') : root.PIX;
  const lzw = (min, idx) => {
    const out = [],
      clear = 1 << min,
      eoi = clear + 1;
    let next = eoi + 1,
      size = min + 1,
      cur = 0,
      bits = 0,
      dict = new Map();
    const emit = c => {
      cur |= c << bits;
      bits += size;
      while (bits >= 8) {
        out.push(cur & 255);
        cur >>>= 8;
        bits -= 8;
      }
    };
    emit(clear);
    let pre = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i],
        key = (pre << 8) | k,
        hit = dict.get(key);
      if (hit !== undefined) {
        pre = hit;
        continue;
      }
      emit(pre);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1;
        size = min + 1;
        dict = new Map();
      } else {
        if (next >= 1 << size) size++;
        dict.set(key, next++);
      }
      pre = k;
    }
    emit(pre);
    emit(eoi);
    if (bits > 0) out.push(cur & 255);
    return out;
  };
  /** frames: [{w,h,d}], o = { ms (duración de cada cuadro) | fps, bucle (true), escala (entero) } */
  const gif = (frames, o = {}) => {
    const esc = Math.max(1, o.escala | 0 || 1),
      w = frames[0].w * esc,
      h = frames[0].h * esc,
      delay = Math.max(2, Math.round((o.ms || 1000 / (o.fps || 8)) / 10));
    // paleta global: índice 0 = transparente
    const mapa = new Map();
    let pal = [];
    for (const f of frames) {
      for (let i = 0; i < f.d.length; i += 4) {
        if (f.d[i + 3] < 128) continue;
        const k = (f.d[i] << 16) | (f.d[i + 1] << 8) | f.d[i + 2];
        if (!mapa.has(k)) {
          mapa.set(k, pal.length + 1);
          pal.push(k);
          if (pal.length > 255) break;
        }
      }
      if (pal.length > 255) break;
    }
    let cerca = null;
    if (pal.length > 255) {
      const junto = PIXL.make(
        frames.reduce((s, f) => s + f.w, 0),
        Math.max(...frames.map(f => f.h))
      );
      let x = 0;
      frames.forEach(f => {
        PIXL.blit(junto, f, x, 0, false);
        x += f.w;
      });
      const P = PIXL.palRGB(PIXL.extractPalette(junto, 255));
      pal = P.map(c => (c[0] << 16) | (c[1] << 8) | c[2]);
      mapa.clear();
      cerca = (r, g, b) => PIXL.nearestIdx(P, r, g, b) + 1;
    }
    const B = [];
    const u16 = v => B.push(v & 255, (v >> 8) & 255),
      str = s => {
        for (const c of s) B.push(c.charCodeAt(0));
      };
    str('GIF89a');
    u16(w);
    u16(h);
    B.push(0xf7, 0, 0);
    B.push(0, 0, 0);
    for (let i = 0; i < 255; i++) {
      const c = pal[i] || 0;
      B.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
    }
    if (o.bucle !== false) {
      B.push(0x21, 0xff, 11);
      str('NETSCAPE2.0');
      B.push(3, 1, 0, 0, 0);
    }
    frames.forEach((f, fi) => {
      const dl = o.delays && o.delays[fi] ? Math.max(2, Math.round(o.delays[fi] / 10)) : delay; // duración propia de cada cuadro (ms)
      B.push(0x21, 0xf9, 4, 0x09, dl & 255, dl >> 8, 0, 0); // disposal 2 (limpiar) + transparente
      B.push(0x2c);
      u16(0);
      u16(0);
      u16(w);
      u16(h);
      B.push(0);
      const idx = new Uint8Array(w * h),
        cache = new Map();
      for (let y = 0; y < f.h; y++)
        for (let x2 = 0; x2 < f.w; x2++) {
          const i = (y * f.w + x2) * 4;
          let v = 0;
          if (f.d[i + 3] >= 128) {
            const k = (f.d[i] << 16) | (f.d[i + 1] << 8) | f.d[i + 2];
            v = mapa.get(k);
            if (v === undefined) {
              v = cache.get(k);
              if (v === undefined) {
                v = cerca ? cerca(f.d[i], f.d[i + 1], f.d[i + 2]) : 0;
                cache.set(k, v);
              }
            }
          }
          if (esc === 1) idx[y * w + x2] = v;
          else for (let yy = 0; yy < esc; yy++) idx.fill(v, (y * esc + yy) * w + x2 * esc, (y * esc + yy) * w + x2 * esc + esc);
        }
      const data = lzw(8, idx);
      B.push(8);
      for (let p = 0; p < data.length; p += 255) {
        const n = Math.min(255, data.length - p);
        B.push(n);
        for (let q = 0; q < n; q++) B.push(data[p + q]);
      }
      B.push(0);
    });
    B.push(0x3b);
    return new Uint8Array(B);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = gif;
  else root.CKGif = gif;
})(typeof window !== 'undefined' ? window : globalThis);
