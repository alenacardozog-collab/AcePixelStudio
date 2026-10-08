/* PIX: operaciones de imagen para pixel art. Mismo código en el editor (navegador) y en los comandos (Node).
   Una imagen es { w, h, d } con d = Uint8ClampedArray RGBA. Ninguna función modifica su entrada salvo que lo diga. */
(function (root) {
  'use strict';
  const PIX = {};

  // ------------------------------------------------------------------ básicos
  PIX.make = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
  PIX.clone = im => ({ w: im.w, h: im.h, d: new Uint8ClampedArray(im.d) });
  PIX.hex2rgb = hex => {
    let s = String(hex).replace('#', '');
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  PIX.rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  PIX.lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  /** Distancia de color perceptual barata ("redmean"). */
  PIX.dist = (r1, g1, b1, r2, g2, b2) => {
    const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  };
  PIX.rgb2hsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  };
  PIX.hsv2rgb = (h, s, v) => {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };
  /** Generador aleatorio con semilla (mismo resultado en navegador y Node). */
  PIX.rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const hash2 = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >> 13)) * 1274126177 | 0; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };
  /** Ruido suave periódico (periodo en píxeles), para bordes orgánicos que encajan entre tiles. */
  PIX.noiseP = (x, y, cell, period, seed) => {
    const gx = x / cell, gy = y / cell, n = Math.max(1, Math.round(period / cell));
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const w = v => ((v % n) + n) % n;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(w(x0), w(y0), seed), b = hash2(w(x0 + 1), w(y0), seed), c = hash2(w(x0), w(y0 + 1), seed), d = hash2(w(x0 + 1), w(y0 + 1), seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };

  PIX.get = (im, x, y) => { const i = (y * im.w + x) * 4; return [im.d[i], im.d[i + 1], im.d[i + 2], im.d[i + 3]]; };
  PIX.set = (im, x, y, r, g, b, a) => { if (x < 0 || y < 0 || x >= im.w || y >= im.h) return; const i = (y * im.w + x) * 4; im.d[i] = r; im.d[i + 1] = g; im.d[i + 2] = b; im.d[i + 3] = a; };
  PIX.blit = (dst, src, dx, dy, over) => {
    for (let y = 0; y < src.h; y++) {
      const ty = y + dy; if (ty < 0 || ty >= dst.h) continue;
      for (let x = 0; x < src.w; x++) {
        const tx = x + dx; if (tx < 0 || tx >= dst.w) continue;
        const i = (y * src.w + x) * 4, a = src.d[i + 3];
        if (over && a === 0) continue;
        const j = (ty * dst.w + tx) * 4;
        if (over && a < 255) {
          const k = a / 255, ia = dst.d[j + 3] / 255, oa = k + ia * (1 - k);
          for (let c = 0; c < 3; c++) dst.d[j + c] = oa ? (src.d[i + c] * k + dst.d[j + c] * ia * (1 - k)) / oa : 0;
          dst.d[j + 3] = oa * 255;
        } else { dst.d[j] = src.d[i]; dst.d[j + 1] = src.d[i + 1]; dst.d[j + 2] = src.d[i + 2]; dst.d[j + 3] = a; }
      }
    }
    return dst;
  };
  PIX.crop = (im, x0, y0, w, h) => PIX.blit(PIX.make(w, h), im, -x0, -y0, false);
  PIX.flipH = im => { const o = PIX.make(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4, j = (y * im.w + (im.w - 1 - x)) * 4; o.d[j] = im.d[i]; o.d[j + 1] = im.d[i + 1]; o.d[j + 2] = im.d[i + 2]; o.d[j + 3] = im.d[i + 3]; } return o; };
  PIX.flipV = im => { const o = PIX.make(im.w, im.h); for (let y = 0; y < im.h; y++) o.d.set(im.d.subarray(y * im.w * 4, (y + 1) * im.w * 4), (im.h - 1 - y) * im.w * 4); return o; };
  PIX.rot90 = im => { const o = PIX.make(im.h, im.w); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4, j = (x * o.w + (im.h - 1 - y)) * 4; o.d[j] = im.d[i]; o.d[j + 1] = im.d[i + 1]; o.d[j + 2] = im.d[i + 2]; o.d[j + 3] = im.d[i + 3]; } return o; };
  /** Rectángulo que contiene todo lo opaco: {x, y, w, h} o null si está vacía. */
  PIX.bbox = (im, thr = 0) => {
    let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.d[(y * im.w + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  PIX.trim = im => { const b = PIX.bbox(im); return b ? PIX.crop(im, b.x, b.y, b.w, b.h) : PIX.make(1, 1); };
  PIX.pad = (im, l, t, r, b) => PIX.blit(PIX.make(im.w + l + r, im.h + t + b), im, l, t, false);

  // ------------------------------------------------------------------ escala
  PIX.resizeNearest = (im, w, h) => {
    const o = PIX.make(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = Math.min(im.w - 1, Math.floor((x + 0.5) * im.w / w)), sy = Math.min(im.h - 1, Math.floor((y + 0.5) * im.h / h));
      const i = (sy * im.w + sx) * 4, j = (y * w + x) * 4;
      o.d[j] = im.d[i]; o.d[j + 1] = im.d[i + 1]; o.d[j + 2] = im.d[i + 2]; o.d[j + 3] = im.d[i + 3];
    }
    return o;
  };
  /** Reduce una imagen grande a píxeles: cada píxel nuevo toma el color dominante (o el promedio) de su bloque. */
  PIX.downscale = (im, w, h, mode = 'dominante') => {
    if (w >= im.w && h >= im.h) return PIX.resizeNearest(im, w, h);
    const o = PIX.make(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * im.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * im.w / w));
      const y0 = Math.floor(y * im.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * im.h / h));
      let r = 0, g = 0, b = 0, a = 0, n = 0, op = 0; const bins = new Map();
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * im.w + xx) * 4; n++;
        if (im.d[i + 3] < 128) continue;
        op++; r += im.d[i]; g += im.d[i + 1]; b += im.d[i + 2]; a += im.d[i + 3];
        if (mode === 'dominante') { const k = ((im.d[i] >> 3) << 10) | ((im.d[i + 1] >> 3) << 5) | (im.d[i + 2] >> 3); const e = bins.get(k) || [0, 0, 0, 0]; e[0]++; e[1] += im.d[i]; e[2] += im.d[i + 1]; e[3] += im.d[i + 2]; bins.set(k, e); }
      }
      const j = (y * w + x) * 4;
      if (op * 2 < n) continue;
      if (mode === 'dominante') { let best = null; bins.forEach(e => { if (!best || e[0] > best[0]) best = e; }); o.d[j] = best[1] / best[0]; o.d[j + 1] = best[2] / best[0]; o.d[j + 2] = best[3] / best[0]; }
      else { o.d[j] = r / op; o.d[j + 1] = g / op; o.d[j + 2] = b / op; }
      o.d[j + 3] = 255;
    }
    return o;
  };
  /** Si la imagen es pixel art agrandado (x2, x4…), devuelve el factor; 1 si ya está a tamaño real. */
  PIX.pixelScale = im => {
    const g = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; };
    let f = 0, runs = 0;
    const scan = (len, lines, at) => {
      for (let l = 0; l < lines; l += Math.max(1, Math.floor(lines / 24))) {
        let run = 1;
        for (let p = 1; p <= len; p++) {
          const same = p < len && at(l, p) === at(l, p - 1);
          if (same) run++; else { if (p < len || run < len) { f = g(f, run); runs++; } run = 1; if (f === 1) return; }
        }
      }
    };
    const key = (x, y) => { const i = (y * im.w + x) * 4; return im.d[i + 3] < 8 ? -1 : (im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2]; };
    scan(im.w, im.h, (y, x) => key(x, y)); if (f !== 1) scan(im.h, im.w, (x, y) => key(x, y));
    return runs < 4 || !f ? 1 : Math.min(f, 16);
  };

  // ------------------------------------------------------------------ paleta
  /** Colores más representativos de una imagen (corte por mediana). Devuelve ['#rrggbb', …] de oscuro a claro. */
  PIX.extractPalette = (im, n = 24) => {
    const px = [];
    const step = Math.max(1, Math.floor(im.w * im.h / 60000));
    for (let p = 0; p < im.w * im.h; p += step) { const i = p * 4; if (im.d[i + 3] > 200) px.push([im.d[i], im.d[i + 1], im.d[i + 2]]); }
    if (!px.length) return [];
    let boxes = [px];
    while (boxes.length < n) {
      let bi = -1, br = 0, bc = 0;
      boxes.forEach((b, i) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let mn = 255, mx = 0; for (const p of b) { if (p[c] < mn) mn = p[c]; if (p[c] > mx) mx = p[c]; } const r = (mx - mn) * (c === 1 ? 1.2 : 1) * Math.log(b.length + 1); if (r > br) { br = r; bi = i; bc = c; } } });
      if (bi < 0 || br === 0) break;
      const b = boxes[bi].sort((p, q) => p[bc] - q[bc]), m = b.length >> 1;
      boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
    }
    const out = boxes.filter(b => b.length).map(b => { let r = 0, g = 0, bl = 0; for (const p of b) { r += p[0]; g += p[1]; bl += p[2]; } return [r / b.length, g / b.length, bl / b.length]; });
    const seen = new Set();
    return out.sort((a, b) => PIX.lum(...a) - PIX.lum(...b)).map(c => PIX.rgb2hex(...c)).filter(h => !seen.has(h) && seen.add(h));
  };
  PIX.palRGB = pal => pal.map(PIX.hex2rgb);
  PIX.nearestIdx = (rgbPal, r, g, b) => { let bi = 0, bd = Infinity; for (let i = 0; i < rgbPal.length; i++) { const p = rgbPal[i], d = PIX.dist(r, g, b, p[0], p[1], p[2]); if (d < bd) { bd = d; bi = i; } } return bi; };
  /** Lleva cada color al más cercano de la paleta. k (0–1) = cuánto acerca; 1 = exacto. tramado = mezcla ordenada entre los dos más cercanos. */
  PIX.quantize = (im, pal, o = {}) => {
    const out = PIX.clone(im), P = PIX.palRGB(pal), k = o.k === undefined ? 1 : o.k, cache = new Map();
    if (!P.length) return out;
    const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
      const i = (y * im.w + x) * 4; if (im.d[i + 3] === 0) continue;
      let r = im.d[i], g = im.d[i + 1], b = im.d[i + 2];
      if (o.tramado) { const t = (B[y & 3][x & 3] / 16 - 0.5) * o.tramado * 64; r += t; g += t; b += t; }
      const key = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255) | 0;
      let p = o.tramado ? null : cache.get(key);
      if (!p) { p = P[PIX.nearestIdx(P, r, g, b)]; if (!o.tramado) cache.set(key, p); }
      out.d[i] = im.d[i] + (p[0] - im.d[i]) * k; out.d[i + 1] = im.d[i + 1] + (p[1] - im.d[i + 1]) * k; out.d[i + 2] = im.d[i + 2] + (p[2] - im.d[i + 2]) * k;
    }
    return out;
  };
  /** Reduce a n colores propios (sin paleta externa). */
  PIX.reduceColors = (im, n) => PIX.quantize(im, PIX.extractPalette(im, n));
  /** Lista de colores usados: [{hex, n}] de más a menos usado. */
  PIX.colors = (im, max = 4096) => {
    const m = new Map();
    for (let i = 0; i < im.d.length; i += 4) { if (im.d[i + 3] < 8) continue; const k = (im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2]; m.set(k, (m.get(k) || 0) + 1); if (m.size > max) break; }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ hex: '#' + k.toString(16).padStart(6, '0'), n }));
  };
  /** Fracción (0–1) de píxeles opacos cuyo color NO está en la paleta (con tolerancia). */
  PIX.offPalette = (im, pal, tol = 0) => {
    const P = PIX.palRGB(pal); if (!P.length) return 0;
    const cache = new Map(); let off = 0, n = 0, t2 = tol * tol * 9;
    for (let i = 0; i < im.d.length; i += 4) {
      if (im.d[i + 3] < 128) continue; n++;
      const k = (im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2]; let bad = cache.get(k);
      if (bad === undefined) { const p = P[PIX.nearestIdx(P, im.d[i], im.d[i + 1], im.d[i + 2])]; bad = PIX.dist(im.d[i], im.d[i + 1], im.d[i + 2], p[0], p[1], p[2]) > t2; cache.set(k, bad); }
      if (bad) off++;
    }
    return n ? off / n : 0;
  };
  PIX.replaceColor = (im, from, to, tol = 0) => {
    const a = PIX.hex2rgb(from), b = PIX.hex2rgb(to), o = PIX.clone(im), t2 = tol * tol * 9;
    for (let i = 0; i < o.d.length; i += 4) if (o.d[i + 3] && PIX.dist(o.d[i], o.d[i + 1], o.d[i + 2], a[0], a[1], a[2]) <= t2) { o.d[i] = b[0]; o.d[i + 1] = b[1]; o.d[i + 2] = b[2]; }
    return o;
  };
  /** Aclara (pasos > 0) u oscurece (pasos < 0) saltando al tono vecino de la paleta: sombrea sin salir del estilo. */
  PIX.shiftTone = (im, pal, pasos, mask) => {
    const P = PIX.palRGB(pal), o = PIX.clone(im); if (!P.length) return o;
    const cache = new Map();
    const next = (r, g, b) => {
      const k = (r << 16) | (g << 8) | b; if (cache.has(k)) return cache.get(k);
      const [h, s] = PIX.rgb2hsv(r, g, b), L = PIX.lum(r, g, b); let best = null, bd = Infinity;
      for (const p of P) {
        const dl = (PIX.lum(...p) - L) * Math.sign(pasos); if (dl <= 3) continue;
        const [h2, s2] = PIX.rgb2hsv(...p); let dh = Math.abs(h - h2); if (dh > 180) dh = 360 - dh;
        const cost = Math.abs(dl - 26 * Math.abs(pasos)) + dh * 0.9 * Math.min(s, s2) * 2 + Math.abs(s - s2) * 40;
        if (cost < bd) { bd = cost; best = p; }
      }
      const res = best || [r, g, b]; cache.set(k, res); return res;
    };
    for (let p = 0; p < im.w * im.h; p++) { const i = p * 4; if (!o.d[i + 3] || (mask && !mask[p])) continue; const c = next(o.d[i], o.d[i + 1], o.d[i + 2]); o.d[i] = c[0]; o.d[i + 1] = c[1]; o.d[i + 2] = c[2]; }
    return o;
  };
  PIX.adjust = (im, o = {}) => {
    const out = PIX.clone(im), c = o.contraste || 0, br = o.brillo || 0, sat = o.saturacion || 0, hue = o.tono || 0, f = (259 * (c + 255)) / (255 * (259 - c));
    for (let i = 0; i < out.d.length; i += 4) {
      if (!out.d[i + 3]) continue;
      let r = f * (out.d[i] - 128) + 128 + br, g = f * (out.d[i + 1] - 128) + 128 + br, b = f * (out.d[i + 2] - 128) + 128 + br;
      if (sat || hue) { let [h, s, v] = PIX.rgb2hsv(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))); h = (h + hue + 360) % 360; s = Math.max(0, Math.min(1, s * (1 + sat / 100))); [r, g, b] = PIX.hsv2rgb(h, s, v); }
      out.d[i] = r; out.d[i + 1] = g; out.d[i + 2] = b;
    }
    return out;
  };

  // ------------------------------------------------------------------ limpieza
  /** Bordes duros: lo semitransparente pasa a opaco o a nada. */
  PIX.hardenAlpha = (im, thr = 110) => { const o = PIX.clone(im); for (let i = 3; i < o.d.length; i += 4) o.d[i] = o.d[i] >= thr ? 255 : 0; return o; };
  /** Quita el fondo liso: rellena desde los bordes todo lo parecido al color de las esquinas. */
  PIX.removeBg = (im, tol = 24, color) => {
    const o = PIX.clone(im), w = im.w, h = im.h, seen = new Uint8Array(w * h), st = [];
    const cs = color ? [PIX.hex2rgb(color)] : [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => PIX.get(im, x, y)).filter(c => c[3] > 8);
    if (!cs.length) return o;
    const t2 = tol * tol * 9, near = i => cs.some(c => PIX.dist(im.d[i], im.d[i + 1], im.d[i + 2], c[0], c[1], c[2]) <= t2);
    for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
    while (st.length) {
      const p = st.pop(); if (seen[p]) continue; seen[p] = 1; const i = p * 4;
      if (im.d[i + 3] > 8 && !near(i)) continue;
      o.d[i + 3] = 0; const x = p % w, y = (p / w) | 0;
      if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
    }
    return o;
  };
  /** Quita píxeles sueltos: islas opacas diminutas y píxeles de un color que no toca a ningún igual. */
  PIX.cleanup = (im, o = {}) => {
    const out = PIX.clone(im), w = im.w, h = im.h, minIsla = o.isla === undefined ? 2 : o.isla;
    // 1. islas opacas más chicas que minIsla
    const lab = new Int32Array(w * h).fill(-1); let n = 0;
    for (let p = 0; p < w * h; p++) {
      if (lab[p] !== -1 || !im.d[p * 4 + 3]) continue;
      const st = [p], cells = []; lab[p] = n;
      while (st.length) { const q = st.pop(); cells.push(q); const x = q % w, y = (q / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const r = yy * w + xx; if (lab[r] === -1 && im.d[r * 4 + 3]) { lab[r] = n; st.push(r); } } }
      if (cells.length < minIsla) for (const q of cells) out.d[q * 4 + 3] = 0;
      n++;
    }
    // 2. píxeles huérfanos dentro de la figura: toman el color más común de sus vecinos
    if (o.huerfanos !== false) {
      const src = PIX.clone(out);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (!src.d[i + 3]) continue;
        const k = (src.d[i] << 16) | (src.d[i + 1] << 8) | src.d[i + 2]; let same = 0, opq = 0; const cnt = new Map();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = (yy * w + xx) * 4; if (!src.d[j + 3]) continue; opq++; const kk = (src.d[j] << 16) | (src.d[j + 1] << 8) | src.d[j + 2]; if (kk === k) same++; cnt.set(kk, (cnt.get(kk) || 0) + 1); }
        if (same === 0 && opq === 4) { let bk = k, bn = 0; cnt.forEach((v, kk) => { if (v > bn) { bn = v; bk = kk; } }); if (bn >= 3) { out.d[i] = bk >> 16; out.d[i + 1] = (bk >> 8) & 255; out.d[i + 2] = bk & 255; } }
      }
    }
    return out;
  };
  /** Agrega un contorno de 1 px alrededor de la figura. agrandar = suma 1 px de margen para que entre. */
  PIX.outline = (im, color = '#000000', o = {}) => {
    const src = o.agrandar === false ? im : PIX.pad(im, 1, 1, 1, 1), out = PIX.clone(src), c = PIX.hex2rgb(color), w = src.w, h = src.h;
    const dirs = o.diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (src.d[i + 3]) continue;
      for (const [dx, dy] of dirs) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; if (src.d[(yy * w + xx) * 4 + 3]) { out.d[i] = c[0]; out.d[i + 1] = c[1]; out.d[i + 2] = c[2]; out.d[i + 3] = 255; break; } }
    }
    return out;
  };
  /** Quita 1 px del borde de la figura (el contorno). */
  PIX.removeOutline = im => {
    const out = PIX.clone(im), w = im.w, h = im.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!im.d[i + 3]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !im.d[(yy * w + xx) * 4 + 3]) { out.d[i + 3] = 0; break; } }
    }
    return out;
  };
  /** Contorno del color de cada zona pero más oscuro (contorno "de color", no negro). */
  PIX.outlineSelf = (im, pal, pasos = -2) => {
    const padded = PIX.pad(im, 1, 1, 1, 1), out = PIX.clone(padded), w = padded.w, h = padded.h, mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (padded.d[i + 3]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = (yy * w + xx) * 4; if (padded.d[j + 3]) { out.d[i] = padded.d[j]; out.d[i + 1] = padded.d[j + 1]; out.d[i + 2] = padded.d[j + 2]; out.d[i + 3] = 255; mask[y * w + x] = 1; break; } }
    }
    return PIX.shiftTone(out, pal, pasos, mask);
  };
  /** Informe de un asset para el revisor. */
  PIX.stats = (im, pal) => {
    let op = 0, semi = 0; for (let i = 3; i < im.d.length; i += 4) { if (im.d[i] > 0) op++; if (im.d[i] > 12 && im.d[i] < 243) semi++; }
    const cols = PIX.colors(im, 600);
    return { w: im.w, h: im.h, opacos: op, semitransparente: op ? semi / op : 0, colores: cols.length, escala: PIX.pixelScale(im), fueraDePaleta: pal && pal.length ? PIX.offPalette(im, pal, 10) : 0, caja: PIX.bbox(im) };
  };
  /** Colisión sugerida: el pie de la figura (parte baja de lo opaco). Devuelve {x, y, w, h} relativo a la imagen. */
  PIX.footprint = (im, frac = 0.3) => {
    const b = PIX.bbox(im, 100); if (!b) return null;
    const fh = Math.max(4, Math.round(b.h * frac)), y0 = b.y + b.h - fh; let x0 = im.w, x1 = -1;
    for (let y = y0; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (im.d[(y * im.w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    return x1 < 0 ? null : { x: x0 + 1, y: y0, w: Math.max(2, x1 - x0 - 1), h: fh };
  };

  // ------------------------------------------------------------------ texturas y tiles
  /** Hace que una textura se pueda repetir sin que se note la unión (sin crear colores nuevos). */
  PIX.seamless = (im, seed = 7) => {
    const w = im.w, h = im.h, o = PIX.make(w, h), hx = w >> 1, hy = h >> 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ex = Math.abs((x + 0.5) / w * 2 - 1), ey = Math.abs((y + 0.5) / h * 2 - 1);
      let m = Math.max(ex, ey); m = Math.max(0, Math.min(1, (m - 0.55) / 0.4));
      const n = PIX.noiseP(x, y, Math.max(2, w / 8), w, seed) * 0.6 + hash2(x, y, seed) * 0.4;
      const useShift = m > n;
      const sx = useShift ? (x + hx) % w : x, sy = useShift ? (y + hy) % h : y, i = (sy * w + sx) * 4, j = (y * w + x) * 4;
      o.d[j] = im.d[i]; o.d[j + 1] = im.d[i + 1]; o.d[j + 2] = im.d[i + 2]; o.d[j + 3] = im.d[i + 3];
    }
    return o;
  };
  /** Repite la imagen n×n (vista en mosaico). */
  PIX.mosaic = (im, nx = 3, ny = 3) => { const o = PIX.make(im.w * nx, im.h * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) PIX.blit(o, im, i * im.w, j * im.h, false); return o; };
  /** Variantes de un tile repetible: desplazadas, espejadas y con pequeños parches cambiados de lugar. */
  PIX.variants = (im, n = 3, seed = 3) => {
    const R = PIX.rng(seed * 7919 + 13), out = [];
    for (let v = 0; v < n; v++) {
      const dx = Math.floor(R() * im.w), dy = Math.floor(R() * im.h); let t = PIX.make(im.w, im.h);
      for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (((y + dy) % im.h) * im.w + ((x + dx) % im.w)) * 4, j = (y * im.w + x) * 4; t.d[j] = im.d[i]; t.d[j + 1] = im.d[i + 1]; t.d[j + 2] = im.d[i + 2]; t.d[j + 3] = im.d[i + 3]; }
      if (R() < 0.5) t = PIX.flipH(t);
      const parches = 2 + Math.floor(R() * 3);
      for (let k = 0; k < parches; k++) {
        const s = 2 + Math.floor(R() * Math.max(2, im.w / 5)), ax = 1 + Math.floor(R() * (im.w - s - 2)), ay = 1 + Math.floor(R() * (im.h - s - 2)), bx = 1 + Math.floor(R() * (im.w - s - 2)), by = 1 + Math.floor(R() * (im.h - s - 2));
        if (ax < 0 || ay < 0 || bx < 0 || by < 0) continue;
        const pa = PIX.crop(t, ax, ay, s, s);
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { if ((x - s / 2 + .5) ** 2 + (y - s / 2 + .5) ** 2 > (s / 2) ** 2) continue; const i = (y * s + x) * 4; PIX.set(t, bx + x, by + y, pa.d[i], pa.d[i + 1], pa.d[i + 2], pa.d[i + 3]); }
      }
      out.push(t);
    }
    return out;
  };
  /** Toma una pieza de tile×tile de una textura más grande, con envoltura. */
  PIX.tileFrom = (tex, tile, ox = 0, oy = 0) => { const o = PIX.make(tile, tile); for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) { const i = ((((y + oy) % tex.h + tex.h) % tex.h) * tex.w + (((x + ox) % tex.w + tex.w) % tex.w)) * 4, j = (y * tile + x) * 4; o.d[j] = tex.d[i]; o.d[j + 1] = tex.d[i + 1]; o.d[j + 2] = tex.d[i + 2]; o.d[j + 3] = tex.d[i + 3]; } return o; };
  /** Juego de 16 piezas de transición entre dos terrenos (bordes y esquinas, con borde orgánico).
      Atlas 4×4; la pieza i está en (i % 4, i / 4) y sus bits dicen qué esquina NO tiene el terreno de arriba:
      1 = arriba-izq, 2 = arriba-der, 4 = abajo-izq, 8 = abajo-der. 0 = todo terreno, 15 = todo base.
      (Mismo orden que los tilesets que ya usa CastleKnight.) */
  PIX.wang16 = (terreno, base, tile = 16, o = {}) => {
    const seed = o.semilla || 5, amp = o.irregular === undefined ? 0.5 : o.irregular, at = PIX.make(tile * 4, tile * 4);
    const borde = o.borde === undefined ? 0.28 : o.borde;   // cuánto se oscurece la orilla
    for (let i = 0; i < 16; i++) {
      const c = [!(i & 1), !(i & 2), !(i & 4), !(i & 8)].map(Number), ins = new Uint8Array(tile * tile);
      for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) {
        const u = (x + 0.5) / tile, v = (y + 0.5) / tile, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
        const val = c[0] * (1 - su) * (1 - sv) + c[1] * su * (1 - sv) + c[2] * (1 - su) * sv + c[3] * su * sv;
        const n = PIX.noiseP(x, y, Math.max(2, tile / 4), tile, seed) * 0.7 + PIX.noiseP(x, y, Math.max(1, tile / 8), tile, seed + 9) * 0.3;
        ins[y * tile + x] = val > 0.5 + (n - 0.5) * amp ? 1 : 0;
      }
      if (i === 0) ins.fill(1); if (i === 15) ins.fill(0);
      const ox = (i % 4) * tile, oy = ((i / 4) | 0) * tile;
      for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) {
        const inside = ins[y * tile + x], src = inside ? terreno : base;
        if (!src) continue;
        const si = (((y + oy) % src.h) * src.w + ((x + ox) % src.w)) * 4; let r = src.d[si], g = src.d[si + 1], b = src.d[si + 2], a = src.d[si + 3];
        if (inside && borde && i !== 0) {
          let edge = false;
          for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= tile || yy >= tile) continue; if (!ins[yy * tile + xx]) { edge = true; break; } }
          if (edge) { r *= 1 - borde; g *= 1 - borde; b *= 1 - borde; }
        }
        PIX.set(at, ox + x, oy + y, r, g, b, a);
      }
    }
    return o.paleta && o.paleta.length ? PIX.quantize(at, o.paleta) : at;
  };
  /** Índice de pieza wang16 para una celda, dado si cada esquina tiene el terreno. */
  PIX.wangIndex = (tl, tr, bl, br) => (tl ? 0 : 1) | (tr ? 0 : 2) | (bl ? 0 : 4) | (br ? 0 : 8);

  // ------------------------------------------------------------------ cuadros y hojas
  PIX.slice = (im, fw, fh) => { const out = []; for (let y = 0; y + fh <= im.h; y += fh) for (let x = 0; x + fw <= im.w; x += fw) out.push(PIX.crop(im, x, y, fw, fh)); return out; };
  PIX.pack = (frames, cols) => {
    if (!frames.length) return PIX.make(1, 1);
    const fw = Math.max(...frames.map(f => f.w)), fh = Math.max(...frames.map(f => f.h)); cols = cols || frames.length;
    const o = PIX.make(fw * Math.min(cols, frames.length), fh * Math.ceil(frames.length / cols));
    frames.forEach((f, i) => PIX.blit(o, f, (i % cols) * fw + ((fw - f.w) >> 1), ((i / cols) | 0) * fh + (fh - f.h), false));
    return o;
  };
  /** Alinea los cuadros para que el personaje no "salte": por los pies (abajo-centro) o por el centro. */
  PIX.alignFrames = (frames, modo = 'pies') => {
    const bs = frames.map(f => PIX.bbox(f, 60)); const ok = bs.filter(Boolean); if (!ok.length) return frames.map(PIX.clone);
    const fw = frames[0].w, fh = frames[0].h;
    const tx = Math.round(fw / 2), ty = modo === 'pies' ? Math.max(...ok.map(b => b.y + b.h)) : Math.round(fh / 2);
    return frames.map((f, i) => {
      const b = bs[i]; if (!b) return PIX.clone(f);
      const cx = b.x + b.w / 2, dx = Math.round(tx - cx), dy = modo === 'pies' ? ty - (b.y + b.h) : Math.round(ty - (b.y + b.h / 2));
      return PIX.blit(PIX.make(fw, fh), f, dx, dy, false);
    });
  };
  /** Cuánto se mueve el personaje entre cuadros (0 = perfecto). Para el revisor. */
  PIX.frameJitter = frames => { const bs = frames.map(f => PIX.bbox(f, 60)).filter(Boolean); if (bs.length < 2) return 0; const feet = bs.map(b => b.y + b.h), cx = bs.map(b => b.x + b.w / 2); return Math.max(Math.max(...feet) - Math.min(...feet), Math.round(Math.max(...cx) - Math.min(...cx))); };

  // ------------------------------------------------------------------ animaciones generadas
  const sample = (im, x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= im.w || y >= im.h) return null; const i = (y * im.w + x) * 4; return im.d[i + 3] ? i : null; };
  const warp = (im, fn, padX = 0, padY = 0) => {
    const o = PIX.make(im.w + padX * 2, im.h + padY * 2);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const [sx, sy] = fn(x - padX, y - padY); const i = sample(im, sx, sy); if (i === null) continue; const j = (y * o.w + x) * 4; o.d[j] = im.d[i]; o.d[j + 1] = im.d[i + 1]; o.d[j + 2] = im.d[i + 2]; o.d[j + 3] = im.d[i + 3]; }
    return o;
  };
  const TAU = Math.PI * 2;
  /** Catálogo de animaciones que se generan solas a partir de un asset quieto. */
  PIX.ANIMS = {
    ondear: { nombre: 'Ondear', desc: 'Tela o bandera que flamea; un lado queda fijo.', params: { cuadros: [6, 2, 16], fuerza: [2, 1, 6], ondas: [1.5, 0.5, 4], fijo: ['izquierda', ['izquierda', 'derecha', 'arriba']] } },
    mecer: { nombre: 'Mecer', desc: 'Árbol, pasto o planta que se mueve con el viento; la base queda quieta.', params: { cuadros: [6, 2, 16], fuerza: [2, 1, 6] } },
    flotar: { nombre: 'Flotar', desc: 'Sube y baja suave: ítems, cristales, fantasmas.', params: { cuadros: [8, 2, 16], fuerza: [2, 1, 6] } },
    respirar: { nombre: 'Respirar', desc: 'Reposo de un personaje: el cuerpo sube y baja 1 píxel.', params: { cuadros: [4, 2, 8], fuerza: [1, 1, 2] } },
    latir: { nombre: 'Latir', desc: 'Crece y se achica: corazones, ítems importantes.', params: { cuadros: [6, 2, 12], fuerza: [1, 1, 4] } },
    titilar: { nombre: 'Titilar', desc: 'La luz cambia de intensidad: antorchas, fuego, ventanas.', params: { cuadros: [6, 2, 12], fuerza: [1, 1, 3] } },
    brillo: { nombre: 'Destello', desc: 'Una franja de luz cruza el objeto: metal, tesoros, cristales.', params: { cuadros: [8, 4, 16], ancho: [3, 1, 8] } },
    agua: { nombre: 'Agua', desc: 'Ondas que se desplazan: fuentes, ríos, charcos.', params: { cuadros: [6, 2, 12], fuerza: [1, 1, 3], ondas: [2, 1, 5] } },
    sacudir: { nombre: 'Sacudir', desc: 'Tiembla de lado a lado: golpe, cofre trabado, alarma.', params: { cuadros: [4, 2, 8], fuerza: [1, 1, 4] } },
    golpe: { nombre: 'Destello de daño', desc: 'Parpadea en blanco al recibir un golpe.', params: { cuadros: [4, 2, 8] } },
    girar: { nombre: 'Girar', desc: 'Gira sobre su eje vertical: monedas, llaves.', params: { cuadros: [8, 4, 16] } },
    aparecer: { nombre: 'Aparecer', desc: 'Se arma píxel a píxel: invocaciones, teletransporte.', params: { cuadros: [8, 3, 16] } },
    humo: { nombre: 'Elevarse', desc: 'Sube y se deshace: humo, vapor, almas.', params: { cuadros: [8, 3, 16], fuerza: [6, 2, 16] } }
  };
  /** Píxeles que la animación agrega por debajo de la base original (para que el objeto no se corra en el mapa). */
  PIX.animBase = (tipo, o = {}) => { const d = PIX.ANIMS[tipo]; if (!d) return 0; const F = o.fuerza === undefined ? (d.params.fuerza ? d.params.fuerza[0] : 0) : o.fuerza; return tipo === 'ondear' || tipo === 'latir' ? F : 0; };
  /** Genera los cuadros de una animación. o = { cuadros, fuerza, …, paleta } según PIX.ANIMS[tipo].params. */
  PIX.animate = (im, tipo, o = {}) => {
    const def = PIX.ANIMS[tipo]; if (!def) throw new Error('Animación desconocida: ' + tipo);
    const P = {}; Object.keys(def.params).forEach(k => { P[k] = o[k] === undefined ? def.params[k][0] : o[k]; });
    const n = Math.max(2, P.cuadros | 0), F = P.fuerza || 1, frames = [], pal = o.paleta || [], b = PIX.bbox(im) || { x: 0, y: 0, w: im.w, h: im.h };
    for (let f = 0; f < n; f++) {
      const t = f / n, ph = t * TAU; let fr;
      if (tipo === 'ondear') {
        const fijo = P.fijo;
        fr = warp(im, (x, y) => {
          if (fijo === 'arriba') { const k = (y - b.y) / b.h; return [x - Math.round(Math.sin(ph + k * P.ondas * TAU) * F * k), y]; }
          const k = fijo === 'derecha' ? (b.x + b.w - x) / b.w : (x - b.x) / b.w;
          return [x, y - Math.round(Math.sin(ph - k * P.ondas * TAU) * F * Math.max(0, k))];
        }, 0, F);
      } else if (tipo === 'mecer') {
        fr = warp(im, (x, y) => { const k = 1 - (y - b.y) / b.h; return [x - Math.round(Math.sin(ph) * F * k * k), y]; }, F, 0);
      } else if (tipo === 'flotar') {
        fr = warp(im, (x, y) => [x, y + Math.round((Math.sin(ph) + 1) / 2 * F)], 0, F);
      } else if (tipo === 'respirar') {
        const up = Math.sin(ph) > 0 ? F : 0, corte = b.y + Math.round(b.h * 0.72);
        fr = warp(im, (x, y) => [x, y < corte ? y + up : y]);
        if (up) for (let yy = corte - up; yy < corte; yy++) for (let x = 0; x < im.w; x++) { const i = sample(im, x, corte - 1); if (i !== null && fr.d[(yy * fr.w + x) * 4 + 3] === 0) PIX.set(fr, x, yy, im.d[i], im.d[i + 1], im.d[i + 2], im.d[i + 3]); }
      } else if (tipo === 'latir') {
        const s = 1 + Math.max(0, Math.sin(ph)) * F / Math.max(8, b.w) * 2, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        fr = warp(im, (x, y) => [cx + (x - cx) / s, cy + (y - cy) / s], F, F);
      } else if (tipo === 'titilar') {
        const paso = Math.round(Math.sin(ph) * F + (hash2(f, 3, 11) - 0.5) * F);
        fr = paso && pal.length ? PIX.shiftTone(im, pal, paso) : (paso ? PIX.adjust(im, { brillo: paso * 14 }) : PIX.clone(im));
      } else if (tipo === 'brillo') {
        fr = PIX.clone(im); const pos = -P.ancho + t * (b.w + b.h + P.ancho * 2), mask = new Uint8Array(im.w * im.h); let any = false;
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const d = (x - b.x) + (y - b.y) - pos; if (d >= 0 && d < P.ancho && im.d[(y * im.w + x) * 4 + 3]) { mask[y * im.w + x] = 1; any = true; } }
        if (any) fr = pal.length ? PIX.shiftTone(im, pal, 2, mask) : (() => { const c = PIX.clone(im); for (let p = 0; p < mask.length; p++) if (mask[p]) for (let k = 0; k < 3; k++) c.d[p * 4 + k] = Math.min(255, c.d[p * 4 + k] + 70); return c; })();
      } else if (tipo === 'agua') {
        fr = warp(im, (x, y) => [x + Math.round(Math.sin(ph + (y - b.y) / b.h * P.ondas * TAU) * F), y]);
        for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const j = (y * im.w + x) * 4; if (im.d[j + 3] && !fr.d[j + 3]) { fr.d[j] = im.d[j]; fr.d[j + 1] = im.d[j + 1]; fr.d[j + 2] = im.d[j + 2]; fr.d[j + 3] = im.d[j + 3]; } else if (!im.d[j + 3]) fr.d[j + 3] = 0; }
      } else if (tipo === 'sacudir') {
        const dx = (f % 2 ? 1 : -1) * Math.max(1, Math.round(F * (1 - t)));
        fr = warp(im, (x, y) => [x - dx, y], F, 0);
      } else if (tipo === 'golpe') {
        fr = PIX.clone(im); if (f % 2 === 0) for (let i = 0; i < fr.d.length; i += 4) if (fr.d[i + 3]) { fr.d[i] = fr.d[i + 1] = fr.d[i + 2] = 255; }
      } else if (tipo === 'girar') {
        const s = Math.cos(ph), cx = b.x + b.w / 2, as = Math.max(0.12, Math.abs(s));
        fr = warp(im, (x, y) => [s < 0 ? cx - (x - cx) / as - 0.01 : cx + (x - cx) / as, y]);
        if (s < 0) fr = pal.length ? PIX.shiftTone(fr, pal, -1) : PIX.adjust(fr, { brillo: -22 });
      } else if (tipo === 'aparecer') {
        fr = PIX.clone(im); const lim = (f + 1) / n;
        for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const v = hash2(x, y, 5) * 0.6 + (1 - (y - b.y) / b.h) * 0.4; if (v > lim) fr.d[(y * im.w + x) * 4 + 3] = 0; }
      } else if (tipo === 'humo') {
        fr = PIX.make(im.w, im.h + F);
        for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4; if (!im.d[i + 3] || hash2(x, y, 9) < t * 0.95) continue; const k = 1 - (y - b.y) / b.h, dx = Math.round(Math.sin(ph + y * 0.6) * t * 2); PIX.set(fr, x + dx, y + F - Math.round(t * F * (0.4 + k * 0.6)), im.d[i], im.d[i + 1], im.d[i + 2], im.d[i + 3]); }
      }
      frames.push(fr);
    }
    // 'flotar' solo sube: se quita el margen de abajo para que la base del objeto no cambie de lugar
    if (tipo === 'flotar') return frames.map(fr => PIX.crop(fr, 0, 0, fr.w, fr.h - F));
    return frames;
  };

  // ------------------------------------------------------------------ sombra de contacto y formas
  /** Sombra ovalada tramada (sin semitransparencias borrosas). */
  PIX.shadow = (w, h, color = '#000000', alpha = 90) => {
    const o = PIX.make(w, h), c = PIX.hex2rgb(color);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = ((x + .5 - w / 2) / (w / 2)) ** 2 + ((y + .5 - h / 2) / (h / 2)) ** 2; if (d <= 1) PIX.set(o, x, y, c[0], c[1], c[2], d > 0.7 ? Math.round(alpha * 0.55) : alpha); }
    return o;
  };

  // ------------------------------------------------------------------ malla de zonas (texto compacto)
  /** Comprime una grilla de números chicos (0–9) a texto "valor×cantidad". */
  PIX.rle = arr => { let s = '', i = 0; while (i < arr.length) { let j = i; while (j < arr.length && arr[j] === arr[i]) j++; s += arr[i] + (j - i > 1 ? 'x' + (j - i) : '') + ','; i = j; } return s.slice(0, -1); };
  PIX.unrle = (s, n) => { const out = new Uint8Array(n); let p = 0; if (!s) return out; for (const tok of s.split(',')) { const [v, c] = tok.split('x'); const k = c ? +c : 1; out.fill(+v, p, Math.min(n, p + k)); p += k; if (p >= n) break; } return out; };
  /** Une celdas marcadas en rectángulos (para exportar zonas bloqueadas como colisiones). */
  PIX.gridRects = (grid, gw, gh, test, cell) => {
    const used = new Uint8Array(gw * gh), out = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if (used[y * gw + x] || !test(grid[y * gw + x])) continue;
      let w = 1; while (x + w < gw && !used[y * gw + x + w] && test(grid[y * gw + x + w])) w++;
      let h = 1; outer: while (y + h < gh) { for (let k = 0; k < w; k++) if (used[(y + h) * gw + x + k] || !test(grid[(y + h) * gw + x + k])) break outer; h++; }
      for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) used[(y + j) * gw + x + k] = 1;
      out.push([x * cell, y * cell, w * cell, h * cell]);
    }
    return out;
  };


  // ------------------------------------------------------------------ conversor (referencia -> asset)
  PIX.CONV = { quitarFondo: true, tolFondo: 24, colorFondo: null, recortar: true, modoTam: 'alto', alto: 32, ancho: 32, factor: 4, metodo: 'dominante', usarPaleta: true, fuerza: 1, maxColores: 0, tramado: 0, bordesDuros: true, umbral: 110, limpiar: true, contorno: 'ninguno', colorContorno: '#1b1420' };
  /** Pasa una imagen de referencia por toda la cadena: fondo, recorte, tamaño, paleta, limpieza y contorno. */
  PIX.convert = (im, cfg = {}, paleta = []) => {
    const c = Object.assign({}, PIX.CONV, cfg); let r = PIX.clone(im);
    if (c.quitarFondo) r = PIX.removeBg(r, c.tolFondo, c.colorFondo || undefined);
    if (c.recortar) r = PIX.trim(r);
    let w = r.w, h = r.h;
    if (c.modoTam === 'alto') { h = Math.max(1, c.alto | 0); w = Math.max(1, Math.round(r.w * h / r.h)); }
    else if (c.modoTam === 'ancho') { w = Math.max(1, c.ancho | 0); h = Math.max(1, Math.round(r.h * w / r.w)); }
    else if (c.modoTam === 'exacto') { w = Math.max(1, c.ancho | 0); h = Math.max(1, c.alto | 0); }
    else if (c.modoTam === 'factor') { w = Math.max(1, Math.round(r.w / c.factor)); h = Math.max(1, Math.round(r.h / c.factor)); }
    else if (c.modoTam === 'auto') { const f = PIX.pixelScale(r); w = Math.max(1, Math.round(r.w / f)); h = Math.max(1, Math.round(r.h / f)); }
    if (w !== r.w || h !== r.h) r = (w < r.w || h < r.h) ? PIX.downscale(r, w, h, c.metodo) : PIX.resizeNearest(r, w, h);
    if (c.bordesDuros) r = PIX.hardenAlpha(r, c.umbral);
    if (c.maxColores > 1) r = PIX.reduceColors(r, c.maxColores);
    if (c.usarPaleta && paleta && paleta.length) r = PIX.quantize(r, paleta, { k: c.fuerza, tramado: c.tramado });
    if (c.limpiar) r = PIX.cleanup(r);
    if (c.contorno === 'negro') r = PIX.outline(r, '#000000'); else if (c.contorno === 'fijo') r = PIX.outline(r, c.colorContorno);
    else if (c.contorno === 'color') r = paleta && paleta.length ? PIX.outlineSelf(r, paleta, -2) : PIX.outline(r, c.colorContorno);
    return r;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PIX; else root.PIX = PIX;
})(typeof window !== 'undefined' ? window : globalThis);
