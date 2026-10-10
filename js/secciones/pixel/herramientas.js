/* PIXEL · lo que hace cada herramienta con el mouse y cómo se pinta el lienzo. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});

  Px.herramienta = {
    pasar(m) {
      const p = Px.P(m),
        f = Px.FR();
      Px.S.cursor = p;
      if (Px.S.herr === 'transformar' && Px.tr) {
        const mj = Px.manijasTr(Px.vista),
          cerca = q => Math.hypot(q.x - m.sx, q.y - m.sy) <= 8,
          hm = mj.l.find(cerca);
        Px.vista.c.style.cursor = cerca(mj.rot)
          ? 'alias'
          : hm
            ? hm.hx && hm.hy
              ? hm.hx === hm.hy
                ? 'nwse-resize'
                : 'nesw-resize'
              : hm.hx
                ? 'ew-resize'
                : 'ns-resize'
            : Px.dentroTr(Px.vista, m.sx, m.sy)
              ? CK.cur('move')
              : 'alias';
        Px.pedir();
        return;
      }
      CK.estadoDer(
        p.x >= 0 && p.y >= 0 && p.x < f.w && p.y < f.h
          ? p.x + ', ' + p.y + (Px.colorEn(p.x, p.y, true) ? '  ·  ' + Px.colorEn(p.x, p.y, true).toUpperCase() : '')
          : ''
      );
      if (!CK._espacio)
        Px.vista.c.style.cursor = CK.cur(
          Px.S.herr === 'mover' || (['selRect', 'lazo', 'varita'].includes(Px.S.herr) && Px.dentroSel(p)) ? 'move' : 'crosshair',
          Px.S.herr
        );
      Px.pedir();
    },
    salir() {
      Px.S.cursor = null;
      Px.pedir();
    },
    bajar(m) {
      if (!Px.doc) return;
      const p = Px.P(m),
        der = m.boton === 2,
        f = Px.FR(),
        hh = Px.S.herr,
        k = Px.capa();
      Px.S.cursor = p;
      if (!k.visible && !['gotero', 'selRect', 'lazo', 'varita'].includes(hh)) {
        CK.aviso('La capa activa está oculta.', 'info');
        return;
      }
      if (der && ['selRect', 'lazo', 'varita', 'mover', 'transformar'].includes(hh)) return; // clic derecho: menú de opciones
      if (hh === 'transformar') {
        Px.trBajar(m);
        return;
      }
      if (m.alt || hh === 'gotero') {
        const c = Px.colorEn(p.x, p.y, true);
        if (c) {
          if (der) Px.S.c2 = c;
          else Px.S.c1 = c;
          Px.pintarColor();
        }
        return;
      }
      if (Px.flot && !Px.dentroSel(p) && hh !== 'mover') Px.soltarFlot();
      if (hh === 'mover' || (['selRect', 'lazo', 'varita'].includes(hh) && Px.dentroSel(p) && !m.shift)) {
        Px.levantar();
        Px.trazo = { tipo: 'mover', p0: p, x0: Px.flot.x, y0: Px.flot.y };
        return;
      }
      if (hh === 'lapiz' || hh === 'borrador' || hh === 'sombrear') {
        const color = hh === 'borrador' ? null : Px.colorOk(der ? Px.S.c2 : Px.S.c1),
          fin = Px.cambioCapa(hh === 'lapiz' ? 'Lápiz' : hh === 'borrador' ? 'Borrador' : 'Sombrear'),
          x = Px.ctxCapa();
        Px.trazo = {
          tipo: hh,
          color,
          fin,
          x,
          pts: [],
          antes: hh === 'sombrear' || Px.S.perfecto ? Px.leer() : null,
          hechos: new Set(),
          pasos: der ? -Px.S.sombra : Px.S.sombra
        };
        if (hh !== 'sombrear' && m.shift && Px.S.ultimo)
          Px.bres(Px.S.ultimo.x, Px.S.ultimo.y, p.x, p.y, (qx, qy) => Px.sello(x, qx, qy, color, Px.S.tam));
        else puntoTrazo(p);
        Px.S.ultimo = p;
        Px.pedir();
        return;
      }
      if (hh === 'balde') {
        if (p.x < 0 || p.y < 0 || p.x >= f.w || p.y >= f.h) return;
        const fin = Px.cambioCapa('Balde'),
          d = Px.leer(),
          msk = Px.inundar(d.data, f.w, f.h, p.x, p.y, Px.S.contiguo ? null : 'global'),
          c = PIX.hex2rgb(Px.colorOk(der ? Px.S.c2 : Px.S.c1));
        for (let q = 0; q < msk.length; q++)
          if (msk[q] && (!Px.sel || Px.sel.m[q])) {
            d.data[q * 4] = c[0];
            d.data[q * 4 + 1] = c[1];
            d.data[q * 4 + 2] = c[2];
            d.data[q * 4 + 3] = 255;
          }
        Px.escribir(d);
        fin();
        Px.pedir();
        return;
      }
      if (hh === 'reemplazar') {
        const de = Px.colorEn(p.x, p.y);
        if (!de) return;
        const a = Px.A(),
          fin = Px.cambioCapa('Reemplazar color'),
          cx = CK.ctx(k.c),
          r = m.shift ? { x: 0, y: 0, w: k.c.width, h: k.c.height } : f,
          d = cx.getImageData(r.x, r.y, r.w, r.h),
          im = PIX.replaceColor({ w: r.w, h: r.h, d: d.data }, de, Px.colorOk(Px.S.c1));
        cx.putImageData(new ImageData(new Uint8ClampedArray(im.d), r.w, r.h), r.x, r.y);
        fin();
        Px.pedir();
        CK.estado('Reemplazado ' + de + ' por ' + Px.S.c1 + (m.shift && a.cuadros ? ' en toda la hoja' : ''));
        return;
      }
      if (['linea', 'rect', 'elipse'].includes(hh)) {
        Px.trazo = { tipo: 'forma', forma: hh, a: p, b: p, color: Px.colorOk(der ? Px.S.c2 : Px.S.c1) };
        Px.pedir();
        return;
      }
      if (hh === 'selRect') {
        Px.trazo = { tipo: 'selRect', a: p, b: p, sumar: m.shift };
        return;
      }
      if (hh === 'lazo') {
        Px.trazo = { tipo: 'lazo', pts: [p], sumar: m.shift };
        return;
      }
      if (hh === 'varita') {
        if (p.x < 0 || p.y < 0 || p.x >= f.w || p.y >= f.h) {
          Px.ponerSel(new Uint8Array(f.w * f.h));
          return;
        }
        const d = Px.leer();
        Px.ponerSel(Px.inundar(d.data, f.w, f.h, p.x, p.y, Px.S.contiguo ? null : 'global'), m.shift);
        return;
      }
    },
    mover(m) {
      const p = Px.P(m),
        t = Px.trazo;
      Px.S.cursor = p;
      if (!t) return;
      if (t.tipo === 'tr') {
        Px.trMover(m);
        return;
      }
      if (t.tipo === 'mover') {
        Px.flot.x = t.x0 + p.x - t.p0.x;
        Px.flot.y = t.y0 + p.y - t.p0.y;
        Px.pedir();
        return;
      }
      if (['lapiz', 'borrador', 'sombrear'].includes(t.tipo)) {
        if (Px.S.ultimo && (Px.S.ultimo.x !== p.x || Px.S.ultimo.y !== p.y)) {
          const pts = [];
          Px.bres(Px.S.ultimo.x, Px.S.ultimo.y, p.x, p.y, (x, y) => pts.push({ x, y }));
          pts.slice(1).forEach(puntoTrazo);
          Px.S.ultimo = p;
          Px.pedir();
        }
        return;
      }
      if (t.tipo === 'forma' || t.tipo === 'selRect') {
        let b = p;
        if (m.shift) {
          const dx = p.x - t.a.x,
            dy = p.y - t.a.y;
          if (t.forma === 'linea') {
            if (Math.abs(dx) > Math.abs(dy) * 2) b = { x: p.x, y: t.a.y };
            else if (Math.abs(dy) > Math.abs(dx) * 2) b = { x: t.a.x, y: p.y };
            else {
              const n = Math.max(Math.abs(dx), Math.abs(dy));
              b = { x: t.a.x + Math.sign(dx) * n, y: t.a.y + Math.sign(dy) * n };
            }
          } else if (t.tipo === 'forma') {
            const n = Math.max(Math.abs(dx), Math.abs(dy));
            b = { x: t.a.x + Math.sign(dx || 1) * n, y: t.a.y + Math.sign(dy || 1) * n };
          }
        }
        t.b = b;
        Px.pedir();
        return;
      }
      if (t.tipo === 'lazo') {
        const u = t.pts[t.pts.length - 1];
        if (u.x !== p.x || u.y !== p.y) {
          t.pts.push(p);
          Px.pedir();
        }
      }
    },
    subir() {
      const t = Px.trazo,
        f = Px.FR();
      Px.trazo = null;
      if (!t) return;
      if (t.tipo === 'tr') {
        Px.pintarTira();
        return;
      }
      if (['lapiz', 'borrador', 'sombrear'].includes(t.tipo)) {
        t.x.restore();
        t.fin();
        Px.pedir();
        return;
      }
      if (t.tipo === 'forma') {
        const fin = Px.cambioCapa({ linea: 'Línea', rect: 'Rectángulo', elipse: 'Elipse' }[t.forma]),
          x = Px.ctxCapa();
        Px.formaPts(t.forma, t.a, t.b, Px.S.relleno).forEach(([qx, qy]) =>
          Px.sello(x, qx, qy, t.color, t.forma === 'linea' || !Px.S.relleno ? Px.S.tam : 1)
        );
        x.restore();
        fin();
        Px.pedir();
        return;
      }
      if (t.tipo === 'selRect') {
        const x0 = CK.clamp(Math.min(t.a.x, t.b.x), 0, f.w - 1),
          x1 = CK.clamp(Math.max(t.a.x, t.b.x), 0, f.w - 1),
          y0 = CK.clamp(Math.min(t.a.y, t.b.y), 0, f.h - 1),
          y1 = CK.clamp(Math.max(t.a.y, t.b.y), 0, f.h - 1),
          m = new Uint8Array(f.w * f.h);
        if (t.a.x !== t.b.x || t.a.y !== t.b.y) for (let y = y0; y <= y1; y++) m.fill(1, y * f.w + x0, y * f.w + x1 + 1);
        Px.ponerSel(m, t.sumar);
        return;
      }
      if (t.tipo === 'lazo') {
        const m = new Uint8Array(f.w * f.h),
          pts = t.pts;
        if (pts.length > 2)
          for (let y = 0; y < f.h; y++)
            for (let x = 0; x < f.w; x++) {
              let dentro = false;
              for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const a = pts[i],
                  b = pts[j];
                if (a.y > y !== b.y > y && x + 0.5 < ((b.x - a.x) * (y + 0.5 - a.y)) / (b.y - a.y) + a.x + 0.5) dentro = !dentro;
              }
              if (dentro) m[y * f.w + x] = 1;
            }
        Px.ponerSel(m, t.sumar);
        return;
      }
      Px.pedir();
    }
  };
  const puntoTrazo = p => {
    const t = Px.trazo,
      f = Px.FR();
    if (t.tipo === 'sombrear') {
      const pal = CK.P.estilo.paleta,
        o = Math.floor((Px.S.tam - 1) / 2),
        cx = CK.ctx(Px.capa().c);
      Px.espejos(p.x, p.y, (ex, ey) => {
        for (const [dx, dy] of Px.puntaPx(Px.S.tam)) {
          {
            const qx = ex - o + dx,
              qy = ey - o + dy;
            if (qx < 0 || qy < 0 || qx >= f.w || qy >= f.h) continue;
            const key = qy * f.w + qx;
            if (t.hechos.has(key) || (Px.sel && !Px.sel.m[key])) continue;
            t.hechos.add(key);
            const i = key * 4;
            if (t.antes.data[i + 3] < 8) continue;
            const uno = { w: 1, h: 1, d: new Uint8ClampedArray([t.antes.data[i], t.antes.data[i + 1], t.antes.data[i + 2], 255]) },
              r = pal.length ? PIX.shiftTone(uno, pal, t.pasos) : PIX.adjust(uno, { brillo: t.pasos * 22 });
            cx.fillStyle = PIX.rgb2hex(r.d[0], r.d[1], r.d[2]);
            cx.fillRect(f.x + qx, f.y + qy, 1, 1);
          }
        }
      });
      return;
    }
    Px.sello(t.x, p.x, p.y, t.color, Px.S.tam);
    if (Px.S.perfecto && Px.S.tam === 1 && t.antes) {
      t.pts.push(p);
      const n = t.pts.length;
      if (n >= 3) {
        const a = t.pts[n - 3],
          b = t.pts[n - 2],
          c = t.pts[n - 1];
        if (Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1 && (b.x === a.x || b.y === a.y) && (b.x === c.x || b.y === c.y)) {
          Px.espejos(b.x, b.y, (qx, qy) => {
            if (qx < 0 || qy < 0 || qx >= f.w || qy >= f.h) return;
            const i = (qy * f.w + qx) * 4,
              d = t.antes.data;
            t.x.clearRect(qx, qy, 1, 1);
            if (d[i + 3]) {
              t.x.fillStyle = `rgba(${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3] / 255})`;
              t.x.fillRect(qx, qy, 1, 1);
            }
          });
          t.pts.splice(n - 2, 1);
        }
      }
    }
  };

  // ---------------------------------------------------------------- pintar el lienzo
  Px.pintar = (x, v) => {
    if (!Px.doc || !Px.A()) return;
    const f = Px.FR(),
      a = Px.A(),
      z = v.z;
    x.save();
    x.translate(v.tx, v.ty);
    CK.cuadros(x, 0, 0);
    x.fillStyle = '#3a3d44';
    x.fillRect(0, 0, f.w * z, f.h * z);
    x.fillStyle = '#33363c';
    const q = Math.max(4, z * (z >= 8 ? 1 : 4));
    for (let yy = 0; yy < f.h * z; yy += q)
      for (let xx = ((yy / q) % 2) * q; xx < f.w * z; xx += q * 2) x.fillRect(xx, yy, Math.min(q, f.w * z - xx), Math.min(q, f.h * z - yy));
    x.restore();
    x.save();
    v.mundo(x);
    if (Px.S.cebolla && a.cuadros) {
      const n = CK.asset.nCuadros(a);
      [
        [-1, 0.28],
        [1, 0.16]
      ].forEach(([d, al]) => {
        const i = Px.doc.cuadro + d;
        if (i < 0 || i >= n) return;
        const g = CK.asset.cuadro(a, i);
        x.globalAlpha = al;
        x.drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
      });
      x.globalAlpha = 1;
    }
    Px.doc.capas.forEach((k, i) => {
      if (!k.visible) return;
      x.globalAlpha = k.opacidad;
      x.drawImage(k.c, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      if (Px.flot && i === Px.doc.activa) x.drawImage(Px.flot.c, Px.flot.x, Px.flot.y);
    });
    x.globalAlpha = 1;
    if (Px.trazo && Px.trazo.tipo === 'forma') {
      x.fillStyle = Px.trazo.color;
      const t = Px.trazo.forma === 'linea' || !Px.S.relleno ? Px.S.tam : 1,
        o = Math.floor((t - 1) / 2);
      Px.formaPts(Px.trazo.forma, Px.trazo.a, Px.trazo.b, Px.S.relleno).forEach(([qx, qy]) =>
        Px.espejos(qx, qy, (ex, ey) => {
          if (Px.S.redonda && t > 2) Px.puntaPx(t).forEach(([dx, dy]) => x.fillRect(ex - o + dx, ey - o + dy, 1, 1));
          else x.fillRect(ex - o, ey - o, t, t);
        })
      );
    }
    x.restore();
    x.save();
    x.lineWidth = 1;
    if (Px.S.grilla && z >= 8) v.grilla(x, 1, f.w, f.h, 'rgba(255,255,255,.07)');
    const T = CK.P.estilo.tile;
    if (Px.S.grilla && f.w > T && z * T >= 24) v.grilla(x, T, f.w, f.h, 'rgba(232,184,58,.35)');
    x.strokeStyle = 'rgba(255,255,255,.4)';
    x.strokeRect(v.tx - 0.5, v.ty - 0.5, f.w * z + 1, f.h * z + 1);
    x.strokeStyle = 'rgba(180,140,242,.8)';
    x.setLineDash([5, 4]);
    if (Px.S.espH) {
      x.beginPath();
      x.moveTo(v.tx + (f.w * z) / 2, v.ty);
      x.lineTo(v.tx + (f.w * z) / 2, v.ty + f.h * z);
      x.stroke();
    }
    if (Px.S.espV) {
      x.beginPath();
      x.moveTo(v.tx, v.ty + (f.h * z) / 2);
      x.lineTo(v.tx + f.w * z, v.ty + (f.h * z) / 2);
      x.stroke();
    }
    x.setLineDash([]);
    // contorno de la selección
    const ms = Px.flot
      ? { m: Px.flot.m, w: Px.flot.c.width, h: Px.flot.c.height, ox: Px.flot.x, oy: Px.flot.y }
      : Px.sel
        ? { m: Px.sel.m, w: f.w, h: f.h, ox: 0, oy: 0 }
        : null;
    if (ms && !(Px.flot && Px.flot.todo)) {
      x.beginPath();
      for (let y = 0; y < ms.h; y++)
        for (let i = 0; i < ms.w; i++) {
          if (!ms.m[y * ms.w + i]) continue;
          const px = v.tx + (i + ms.ox) * z,
            py = v.ty + (y + ms.oy) * z;
          if (y === 0 || !ms.m[(y - 1) * ms.w + i]) {
            x.moveTo(px, py + 0.5);
            x.lineTo(px + z, py + 0.5);
          }
          if (y === ms.h - 1 || !ms.m[(y + 1) * ms.w + i]) {
            x.moveTo(px, py + z - 0.5);
            x.lineTo(px + z, py + z - 0.5);
          }
          if (i === 0 || !ms.m[y * ms.w + i - 1]) {
            x.moveTo(px + 0.5, py);
            x.lineTo(px + 0.5, py + z);
          }
          if (i === ms.w - 1 || !ms.m[y * ms.w + i + 1]) {
            x.moveTo(px + z - 0.5, py);
            x.lineTo(px + z - 0.5, py + z);
          }
        }
      x.strokeStyle = '#111';
      x.stroke();
      x.setLineDash([4, 4]);
      x.strokeStyle = '#fff';
      x.stroke();
      x.setLineDash([]);
    }
    if (Px.trazo && Px.trazo.tipo === 'selRect') {
      const x0 = Math.min(Px.trazo.a.x, Px.trazo.b.x),
        y0 = Math.min(Px.trazo.a.y, Px.trazo.b.y),
        w = Math.abs(Px.trazo.b.x - Px.trazo.a.x) + 1,
        hh = Math.abs(Px.trazo.b.y - Px.trazo.a.y) + 1;
      x.setLineDash([4, 4]);
      x.strokeStyle = '#fff';
      x.strokeRect(v.tx + x0 * z + 0.5, v.ty + y0 * z + 0.5, w * z - 1, hh * z - 1);
      x.setLineDash([]);
    }
    if (Px.trazo && Px.trazo.tipo === 'lazo') {
      x.beginPath();
      Px.trazo.pts.forEach((p, i) => {
        const px = v.tx + (p.x + 0.5) * z,
          py = v.ty + (p.y + 0.5) * z;
        if (i) x.lineTo(px, py);
        else x.moveTo(px, py);
      });
      x.strokeStyle = '#fff';
      x.setLineDash([4, 4]);
      x.stroke();
      x.setLineDash([]);
    }
    if (Px.tr && Px.flot) {
      const mj = Px.manijasTr(v);
      x.beginPath();
      mj.esquinas.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)));
      x.closePath();
      x.strokeStyle = '#000';
      x.lineWidth = 3;
      x.stroke();
      x.strokeStyle = '#58d0ff';
      x.lineWidth = 1;
      x.stroke();
      x.beginPath();
      x.moveTo(mj.arriba.x, mj.arriba.y);
      x.lineTo(mj.rot.x, mj.rot.y);
      x.stroke();
      mj.l.forEach(q => {
        x.fillStyle = '#fff';
        x.strokeStyle = '#000';
        x.fillRect(q.x - 4, q.y - 4, 8, 8);
        x.strokeRect(q.x - 4.5, q.y - 4.5, 9, 9);
      });
      x.beginPath();
      x.arc(mj.rot.x, mj.rot.y, 5, 0, 7);
      x.fillStyle = '#58d0ff';
      x.fill();
      x.strokeStyle = '#000';
      x.stroke();
      x.lineWidth = 1;
    }
    const c = Px.S.cursor;
    if (c && !Px.trazo && ['lapiz', 'borrador', 'sombrear', 'linea', 'rect', 'elipse'].includes(Px.S.herr)) {
      const o = Math.floor((Px.S.tam - 1) / 2);
      Px.espejos(c.x, c.y, (ex, ey) => {
        if (Px.S.redonda && Px.S.tam > 2) {
          const rr = (Px.S.tam * z) / 2,
            ccx = v.tx + (ex - o) * z + rr,
            ccy = v.ty + (ey - o) * z + rr;
          x.strokeStyle = '#000';
          x.beginPath();
          x.arc(ccx, ccy, rr + 0.5, 0, 7);
          x.stroke();
          x.strokeStyle = '#fff';
          x.beginPath();
          x.arc(ccx, ccy, Math.max(0.5, rr - 0.5), 0, 7);
          x.stroke();
          return;
        }
        x.strokeStyle = '#000';
        x.strokeRect(v.tx + (ex - o) * z - 0.5, v.ty + (ey - o) * z - 0.5, Px.S.tam * z + 1, Px.S.tam * z + 1);
        x.strokeStyle = '#fff';
        x.strokeRect(v.tx + (ex - o) * z + 0.5, v.ty + (ey - o) * z + 0.5, Px.S.tam * z - 1, Px.S.tam * z - 1);
      });
    }
    x.restore();
  };
})();
