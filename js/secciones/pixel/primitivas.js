/* PIXEL · puntas, líneas, formas, relleno, máscaras y selección flotante. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});

  // ---------------------------------------------------------------- primitivas
  Px.ctxCapa = () => {
    const x = CK.ctx(Px.capa().c),
      f = Px.FR();
    x.save();
    x.beginPath();
    if (Px.sel && !Px.flot) {
      for (let y = 0; y < f.h; y++) {
        let x0 = -1;
        for (let i = 0; i <= f.w; i++) {
          const on = i < f.w && Px.sel.m[y * f.w + i];
          if (on && x0 < 0) x0 = i;
          else if (!on && x0 >= 0) {
            x.rect(f.x + x0, f.y + y, i - x0, 1);
            x0 = -1;
          }
        }
      }
    } else x.rect(f.x, f.y, f.w, f.h);
    x.clip();
    x.translate(f.x, f.y);
    return x;
  };
  Px.colorOk = hex => {
    if (!Px.S.soloPaleta || !CK.P.estilo.paleta.length) return hex;
    const P = PIX.palRGB(CK.P.estilo.paleta),
      c = PIX.hex2rgb(hex);
    return CK.P.estilo.paleta[PIX.nearestIdx(P, c[0], c[1], c[2])];
  };
  Px.espejos = (x, y, fn) => {
    const f = Px.FR(),
      pts = [[x, y]];
    if (Px.S.espH) pts.push([f.w - 1 - x, y]);
    if (Px.S.espV) pts.push([x, f.h - 1 - y]);
    if (Px.S.espH && Px.S.espV) pts.push([f.w - 1 - x, f.h - 1 - y]);
    pts.forEach(p => fn(p[0], p[1]));
  };
  /** Píxeles que cubre la punta, como corrimientos desde su esquina: cuadrada (todos) o redonda (un disco). */
  const puntas = {};
  Px.puntaPx = tam => {
    const k = (Px.S.redonda ? 'r' : 'c') + tam;
    if (puntas[k]) return puntas[k];
    const l = [],
      c = tam / 2,
      r2 = tam <= 2 ? 9 : c * c + (tam % 2 ? 0.3 : 0);
    for (let dy = 0; dy < tam; dy++)
      for (let dx = 0; dx < tam; dx++) if (!Px.S.redonda || (dx + 0.5 - c) ** 2 + (dy + 0.5 - c) ** 2 <= r2) l.push([dx, dy]);
    return (puntas[k] = l);
  };
  Px.sello = (x, px, py, color, tam) => {
    const o = Math.floor((tam - 1) / 2),
      red = Px.S.redonda && tam > 2;
    Px.espejos(px, py, (qx, qy) => {
      if (color) x.fillStyle = color;
      if (!red) {
        if (color) x.fillRect(qx - o, qy - o, tam, tam);
        else x.clearRect(qx - o, qy - o, tam, tam);
        return;
      }
      Px.puntaPx(tam).forEach(([dx, dy]) => {
        if (color) x.fillRect(qx - o + dx, qy - o + dy, 1, 1);
        else x.clearRect(qx - o + dx, qy - o + dy, 1, 1);
      });
    });
  };
  Px.bres = (x0, y0, x1, y1, fn) => {
    const dx = Math.abs(x1 - x0),
      dy = Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      fn(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };
  Px.formaPts = (tipo, a, b, lleno) => {
    const pts = [],
      x0 = Math.min(a.x, b.x),
      x1 = Math.max(a.x, b.x),
      y0 = Math.min(a.y, b.y),
      y1 = Math.max(a.y, b.y);
    if (tipo === 'linea') Px.bres(a.x, a.y, b.x, b.y, (x, y) => pts.push([x, y]));
    else if (tipo === 'rect') {
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) if (lleno || x === x0 || x === x1 || y === y0 || y === y1) pts.push([x, y]);
    } else {
      const rx = (x1 - x0) / 2,
        ry = (y1 - y0) / 2,
        cx = x0 + rx,
        cy = y0 + ry,
        dentro = (x, y) => (rx < 0.5 || ry < 0.5 ? true : ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (!dentro(x, y)) continue;
          if (
            lleno ||
            !dentro(x - 1, y) ||
            !dentro(x + 1, y) ||
            !dentro(x, y - 1) ||
            !dentro(x, y + 1) ||
            x === x0 ||
            x === x1 ||
            y === y0 ||
            y === y1
          )
            pts.push([x, y]);
        }
    }
    return pts;
  };
  Px.leer = () => {
    const f = Px.FR();
    return CK.ctx(Px.capa().c).getImageData(f.x, f.y, f.w, f.h);
  };
  Px.escribir = d => {
    const f = Px.FR();
    CK.ctx(Px.capa().c).putImageData(d, f.x, f.y);
  };
  Px.colorEn = (px, py, todas) => {
    const f = Px.FR();
    if (px < 0 || py < 0 || px >= f.w || py >= f.h) return null;
    const d = CK.ctx(todas ? CK.img[Px.S.id] : Px.capa().c).getImageData(f.x + px, f.y + py, 1, 1).data;
    return d[3] < 8 ? null : PIX.rgb2hex(d[0], d[1], d[2]);
  };
  Px.inundar = (d, w, hh, px, py, tolerar) => {
    const m = new Uint8Array(w * hh),
      i0 = (py * w + px) * 4,
      t = [d[i0], d[i1(i0)], d[i0 + 2], d[i0 + 3]];
    function i1(i) {
      return i + 1;
    }
    const igual = p => {
      const i = p * 4;
      return d[i + 3] < 8 && t[3] < 8 ? true : d[i] === t[0] && d[i + 1] === t[1] && d[i + 2] === t[2] && Math.abs(d[i + 3] - t[3]) < 8;
    };
    if (tolerar === 'global') {
      for (let p = 0; p < w * hh; p++) if (igual(p)) m[p] = 1;
      return m;
    }
    const st = [py * w + px];
    while (st.length) {
      const p = st.pop();
      if (m[p] || !igual(p)) continue;
      m[p] = 1;
      const x = p % w,
        y = (p / w) | 0;
      if (x > 0) st.push(p - 1);
      if (x < w - 1) st.push(p + 1);
      if (y > 0) st.push(p - w);
      if (y < hh - 1) st.push(p + w);
    }
    return m;
  };
  Px.cajaMascara = (m, w, hh) => {
    let x0 = w,
      y0 = hh,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < hh; y++)
      for (let x = 0; x < w; x++)
        if (m[y * w + x]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  Px.ponerSel = (m, sumar) => {
    const f = Px.FR();
    if (sumar && Px.sel) for (let i = 0; i < m.length; i++) m[i] = m[i] || Px.sel.m[i];
    const b = Px.cajaMascara(m, f.w, f.h);
    Px.sel = b ? { m, b } : null;
    Px.pintarTira();
    Px.pedir();
  };

  // ---------------------------------------------------------------- selección flotante
  Px.levantar = () => {
    if (Px.flot) return;
    const f = Px.FR(),
      d = Px.leer(),
      fin = Px.cambioCapa('Mover');
    const m = Px.sel
      ? Px.sel.m
      : (() => {
          const mm = new Uint8Array(f.w * f.h);
          for (let p = 0; p < mm.length; p++) mm[p] = d.data[p * 4 + 3] > 0 ? 1 : 0;
          return mm;
        })();
    const c = CK.lienzo(f.w, f.h),
      cd = new ImageData(f.w, f.h);
    for (let p = 0; p < m.length; p++)
      if (m[p]) {
        for (let k = 0; k < 4; k++) {
          cd.data[p * 4 + k] = d.data[p * 4 + k];
          d.data[p * 4 + k] = 0;
        }
      }
    CK.ctx(c).putImageData(cd, 0, 0);
    Px.escribir(d);
    Px.flot = { c, x: 0, y: 0, m: m.slice(), fin, todo: !Px.sel };
  };
  Px.soltarFlot = () => {
    Px.tr = null;
    if (!Px.flot || !Px.doc) return;
    const f = Px.FR(),
      x = CK.ctx(Px.capa().c);
    x.save();
    x.beginPath();
    x.rect(f.x, f.y, f.w, f.h);
    x.clip();
    x.drawImage(Px.flot.c, f.x + Px.flot.x, f.y + Px.flot.y);
    x.restore();
    if (!Px.flot.todo) {
      const m = new Uint8Array(f.w * f.h);
      for (let y = 0; y < f.h; y++)
        for (let xx = 0; xx < f.w; xx++) {
          const sx = xx - Px.flot.x,
            sy = y - Px.flot.y;
          if (sx >= 0 && sy >= 0 && sx < Px.flot.c.width && sy < Px.flot.c.height && Px.flot.m[sy * Px.flot.c.width + sx])
            m[y * f.w + xx] = 1;
        }
      const b = Px.cajaMascara(m, f.w, f.h);
      Px.sel = b ? { m, b } : null;
    } else Px.sel = null;
    const fin = Px.flot.fin;
    Px.flot = null;
    fin();
    Px.pedir();
  };
  Px.transformarSel = (nombre, fn) => {
    const f = Px.FR();
    if (!Px.flot) {
      if (!Px.sel) {
        const m = new Uint8Array(f.w * f.h).fill(1);
        Px.sel = { m, b: { x: 0, y: 0, w: f.w, h: f.h } };
      }
      Px.levantar();
    }
    const b = Px.cajaMascara(Px.flot.m, Px.flot.c.width, Px.flot.c.height);
    if (!b) return;
    const parte = PIX.crop(CK.aPix(Px.flot.c), b.x, b.y, b.w, b.h),
      mp = PIX.make(b.w, b.h);
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) if (Px.flot.m[(b.y + y) * Px.flot.c.width + b.x + x]) mp.d[(y * b.w + x) * 4 + 3] = 255;
    const r = fn(parte),
      rm = fn(mp),
      nc = CK.lienzo(Math.max(Px.flot.c.width, b.x + r.w), Math.max(Px.flot.c.height, b.y + r.h)),
      nm = new Uint8Array(nc.width * nc.height);
    CK.ctx(nc).putImageData(new ImageData(new Uint8ClampedArray(r.d), r.w, r.h), b.x, b.y);
    for (let y = 0; y < rm.h; y++) for (let x = 0; x < rm.w; x++) if (rm.d[(y * rm.w + x) * 4 + 3]) nm[(b.y + y) * nc.width + b.x + x] = 1;
    Px.flot.c = nc;
    Px.flot.m = nm;
    Px.flot.todo = false;
    Px.pedir();
  };
})();
