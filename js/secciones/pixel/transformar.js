/* PIXEL · transformación libre (rotar, escalar, voltear, RotSprite) y menú del lienzo. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});
  const h = CK.h;

  // ---------------------------------------------------------------- transformación libre (rotar, escalar, voltear)
  Px.tr = null;
  /** Escala ×2 que respeta los bordes del pixel art (Scale2x / EPX). Con tres pasadas queda ×8 para rotar limpio (idea de RotSprite). */
  const scale2x = im => {
    const W = im.w,
      H = im.h,
      o = PIX.make(W * 2, H * 2),
      d = im.d,
      igual = (a, b) => d[a] === d[b] && d[a + 1] === d[b + 1] && d[a + 2] === d[b + 2] && d[a + 3] === d[b + 3];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const P = (y * W + x) * 4,
          A = y > 0 ? P - W * 4 : P,
          B = x < W - 1 ? P + 4 : P,
          C = x > 0 ? P - 4 : P,
          D = y < H - 1 ? P + W * 4 : P;
        const e = [
          igual(C, A) && !igual(C, D) && !igual(A, B) ? A : P,
          igual(A, B) && !igual(A, C) && !igual(B, D) ? B : P,
          igual(D, C) && !igual(D, B) && !igual(C, A) ? C : P,
          igual(B, D) && !igual(B, A) && !igual(D, C) ? D : P
        ];
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ].forEach(([ox, oy], k) => {
          const q = ((y * 2 + oy) * W * 2 + x * 2 + ox) * 4;
          for (let c = 0; c < 4; c++) o.d[q + c] = d[e[k] + c];
        });
      }
    return o;
  };
  Px.empezarTr = () => {
    if (!Px.doc) return;
    const f = Px.FR();
    if (!Px.flot) {
      if (!Px.sel) {
        const m = new Uint8Array(f.w * f.h).fill(1);
        Px.sel = { m, b: { x: 0, y: 0, w: f.w, h: f.h } };
      }
      Px.levantar();
    }
    const fd = CK.ctx(Px.flot.c).getImageData(0, 0, Px.flot.c.width, Px.flot.c.height).data,
      mm = Px.flot.m.map((v, i) => (v && fd[i * 4 + 3] > 0 ? 1 : 0)); // solo lo que tiene dibujo
    const b = Px.cajaMascara(mm, Px.flot.c.width, Px.flot.c.height);
    if (!b) {
      CK.aviso('No hay nada dibujado para transformar.', 'info');
      return;
    }
    const im = PIX.crop(CK.aPix(Px.flot.c), b.x, b.y, b.w, b.h);
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) if (!Px.flot.m[(b.y + y) * Px.flot.c.width + b.x + x]) im.d[(y * b.w + x) * 4 + 3] = 0;
    Px.tr = {
      im,
      bw: b.w,
      bh: b.h,
      cx: Px.flot.x + b.x + b.w / 2,
      cy: Px.flot.y + b.y + b.h / 2,
      sx: 1,
      sy: 1,
      ang: 0,
      suave: !!Px.S.trSuave,
      ocho: null,
      antes: { c: CK.copiaLienzo(Px.flot.c), m: Px.flot.m.slice(), x: Px.flot.x, y: Px.flot.y }
    };
    Px.pintarTira();
    Px.pedir();
  };
  /** Rehace el flotante a partir del original con la escala y el giro actuales (vecino más cercano: no inventa colores). */
  Px.aplicarTr = () => {
    if (!Px.tr || !Px.flot) return;
    const { bw, bh, sx, sy, ang } = Px.tr,
      co = Math.cos(ang),
      si = Math.sin(ang),
      hw = (bw * Math.abs(sx)) / 2,
      hh = (bh * Math.abs(sy)) / 2;
    const ex = Math.abs(hw * co) + Math.abs(hh * si),
      ey = Math.abs(hw * si) + Math.abs(hh * co);
    const x0 = Math.floor(Px.tr.cx - ex + 1e-6),
      y0 = Math.floor(Px.tr.cy - ey + 1e-6),
      x1 = Math.ceil(Px.tr.cx + ex - 1e-6),
      y1 = Math.ceil(Px.tr.cy + ey - 1e-6),
      W = Math.max(1, x1 - x0),
      H = Math.max(1, y1 - y0);
    const recto = Math.abs(Math.round(ang / (Math.PI / 2)) * (Math.PI / 2) - ang) < 1e-4,
      suave = Px.tr.suave && !recto;
    if (suave && !Px.tr.ocho) Px.tr.ocho = scale2x(scale2x(scale2x(Px.tr.im)));
    const src = suave ? Px.tr.ocho : Px.tr.im,
      K = suave ? 8 : 1,
      out = new ImageData(W, H),
      m = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = x0 + x + 0.5 - Px.tr.cx,
          dy = y0 + y + 0.5 - Px.tr.cy,
          u = (dx * co + dy * si) / sx + bw / 2,
          v = (-dx * si + dy * co) / sy + bh / 2;
        if (u < 0 || v < 0 || u >= bw || v >= bh) continue;
        const px = Math.min(src.w - 1, Math.floor(u * K)),
          py = Math.min(src.h - 1, Math.floor(v * K)),
          i = (py * src.w + px) * 4;
        if (src.d[i + 3] < 8) continue;
        const o = (y * W + x) * 4;
        out.data[o] = src.d[i];
        out.data[o + 1] = src.d[i + 1];
        out.data[o + 2] = src.d[i + 2];
        out.data[o + 3] = src.d[i + 3];
        m[y * W + x] = 1;
      }
    const c = CK.lienzo(W, H);
    CK.ctx(c).putImageData(out, 0, 0);
    Px.flot.c = c;
    Px.flot.m = m;
    Px.flot.x = x0;
    Px.flot.y = y0;
    Px.flot.todo = false;
    Px.pedir();
  };
  Px.cancelarTr = () => {
    if (!Px.tr || !Px.flot) {
      Px.tr = null;
      return;
    }
    const a = Px.tr.antes;
    Px.flot.c = a.c;
    Px.flot.m = a.m;
    Px.flot.x = a.x;
    Px.flot.y = a.y;
    Px.tr = null;
    Px.pintarTira();
    Px.pedir();
  };
  Px.terminarTr = () => {
    if (!Px.tr) return;
    Px.tr = null;
    Px.pintarTira();
    Px.pedir();
    CK.estado('Transformación lista: arrastrala o hacé clic afuera / Enter para fijarla.');
  };
  /** Esquinas y manijas de la transformación, en coordenadas de la pantalla. */
  Px.manijasTr = v => {
    const co = Math.cos(Px.tr.ang),
      si = Math.sin(Px.tr.ang),
      hw = (Px.tr.bw * Math.abs(Px.tr.sx)) / 2,
      hh = (Px.tr.bh * Math.abs(Px.tr.sy)) / 2,
      P = (lx, ly) => ({ x: v.tx + (Px.tr.cx + lx * co - ly * si) * v.z, y: v.ty + (Px.tr.cy + lx * si + ly * co) * v.z });
    const l = [];
    [-1, 0, 1].forEach(hx =>
      [-1, 0, 1].forEach(hy => {
        if (hx || hy) l.push(Object.assign(P(hx * hw, hy * hh), { hx, hy }));
      })
    );
    const arriba = P(0, -hh),
      rot = { x: arriba.x + si * 22, y: arriba.y - co * 22, rot: true };
    return { esquinas: [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)], l, rot, arriba };
  };
  Px.dentroTr = (v, sx0, sy0) => {
    const co = Math.cos(Px.tr.ang),
      si = Math.sin(Px.tr.ang),
      wx = (sx0 - v.tx) / v.z - Px.tr.cx,
      wy = (sy0 - v.ty) / v.z - Px.tr.cy,
      lx = wx * co + wy * si,
      ly = -wx * si + wy * co;
    return Math.abs(lx) <= (Px.tr.bw * Math.abs(Px.tr.sx)) / 2 && Math.abs(ly) <= (Px.tr.bh * Math.abs(Px.tr.sy)) / 2;
  };
  Px.trBajar = m => {
    if (!Px.tr) {
      Px.empezarTr();
      if (!Px.tr) return;
    }
    const v = Px.vista,
      mj = Px.manijasTr(v),
      cerca = q => Math.hypot(q.x - m.sx, q.y - m.sy) <= 8;
    const base = { cx: Px.tr.cx, cy: Px.tr.cy, sx: Px.tr.sx, sy: Px.tr.sy, ang: Px.tr.ang, mx: m.x, my: m.y };
    if (cerca(mj.rot)) {
      Px.trazo = { tipo: 'tr', modo: 'rotar', base, a0: Math.atan2(m.y - Px.tr.cy, m.x - Px.tr.cx) };
      return;
    }
    const h0 = mj.l.find(cerca);
    if (h0) {
      const co = Math.cos(Px.tr.ang),
        si = Math.sin(Px.tr.ang),
        hw = (Px.tr.bw * Math.abs(Px.tr.sx)) / 2,
        hh = (Px.tr.bh * Math.abs(Px.tr.sy)) / 2;
      Px.trazo = { tipo: 'tr', modo: 'escalar', base, hx: h0.hx, hy: h0.hy, O: { x: -h0.hx * hw, y: -h0.hy * hh }, co, si };
      return;
    }
    if (Px.dentroTr(v, m.sx, m.sy)) {
      Px.trazo = { tipo: 'tr', modo: 'mover', base };
      return;
    }
    Px.trazo = { tipo: 'tr', modo: 'rotar', base, a0: Math.atan2(m.y - Px.tr.cy, m.x - Px.tr.cx) };
  };
  Px.trMover = m => {
    const t = Px.trazo,
      b = t.base;
    if (t.modo === 'mover') {
      Px.tr.cx = b.cx + Math.round(m.x - b.mx);
      Px.tr.cy = b.cy + Math.round(m.y - b.my);
    } else if (t.modo === 'rotar') {
      let a = b.ang + Math.atan2(m.y - b.cy, m.x - b.cx) - t.a0;
      const paso = m.shift ? 15 : 1;
      a = (Math.round((a * 180) / Math.PI / paso) * paso * Math.PI) / 180;
      Px.tr.ang = a;
      CK.estado('Giro: ' + Math.round(((((a * 180) / Math.PI) % 360) + 360) % 360) + '°');
    } else {
      const wx = m.x - b.cx,
        wy = m.y - b.cy,
        lx = wx * t.co + wy * t.si,
        ly = -wx * t.si + wy * t.co,
        sgx = Math.sign(b.sx) || 1,
        sgy = Math.sign(b.sy) || 1;
      let nw = t.hx ? Math.max(1, Math.round((lx - t.O.x) * t.hx)) : Px.tr.bw * Math.abs(b.sx),
        nh = t.hy ? Math.max(1, Math.round((ly - t.O.y) * t.hy)) : Px.tr.bh * Math.abs(b.sy);
      if (m.shift && t.hx && t.hy) {
        const k = Math.max(nw / (Px.tr.bw * Math.abs(b.sx)), nh / (Px.tr.bh * Math.abs(b.sy)));
        nw = Math.max(1, Math.round(Px.tr.bw * Math.abs(b.sx) * k));
        nh = Math.max(1, Math.round(Px.tr.bh * Math.abs(b.sy) * k));
      }
      Px.tr.sx = (sgx * nw) / Px.tr.bw;
      Px.tr.sy = (sgy * nh) / Px.tr.bh;
      const clx = t.hx ? t.O.x + (t.hx * nw) / 2 : 0,
        cly = t.hy ? t.O.y + (t.hy * nh) / 2 : 0;
      Px.tr.cx = b.cx + clx * t.co - cly * t.si;
      Px.tr.cy = b.cy + clx * t.si + cly * t.co;
      CK.estado(
        'Tamaño: ' + nw + ' × ' + nh + ' px (' + Math.round((nw / Px.tr.bw) * 100) + '% × ' + Math.round((nh / Px.tr.bh) * 100) + '%)'
      );
    }
    Px.aplicarTr();
  };
  /** Cambios rápidos sobre la transformación (girar, voltear, escalar) — la empiezan si hace falta. */
  Px.trRapido = fn => {
    if (!Px.tr) Px.empezarTr();
    if (!Px.tr) return;
    fn(Px.tr);
    Px.aplicarTr();
    Px.pintarTira();
  };
  Px.trNumeros = async () => {
    if (!Px.tr) Px.empezarTr();
    if (!Px.tr) return;
    const d = {
      w: Math.round(Math.abs(Px.tr.sx) * 100),
      h: Math.round(Math.abs(Px.tr.sy) * 100),
      ang: Math.round((Px.tr.ang * 180) / Math.PI),
      fh: Px.tr.sx < 0,
      fv: Px.tr.sy < 0,
      suave: Px.tr.suave,
      prop: true
    };
    let iw, ih;
    const ok = await CK.ventana({
      titulo: 'Transformar',
      cuerpo: h(
        'div',
        h(
          'div.duo',
          h(
            'label',
            h('span.mini-rot', 'Ancho %'),
            (iw = CK.num(d.w, { min: 1, max: 2000 }, v => {
              if (d.prop) {
                d.h = Math.round((d.h * v) / d.w);
                ih.value = d.h;
              }
              d.w = v;
            }))
          ),
          h(
            'label',
            h('span.mini-rot', 'Alto %'),
            (ih = CK.num(d.h, { min: 1, max: 2000 }, v => {
              if (d.prop) {
                d.w = Math.round((d.w * v) / d.h);
                iw.value = d.w;
              }
              d.h = v;
            }))
          )
        ),
        CK.chk(d.prop, 'Mantener proporción', v => {
          d.prop = v;
        }),
        CK.campo(
          'Girar (°)',
          CK.num(d.ang, { min: -360, max: 360 }, v => {
            d.ang = v;
          })
        ),
        CK.chk(d.fh, 'Voltear horizontal', v => {
          d.fh = v;
        }),
        CK.chk(d.fv, 'Voltear vertical', v => {
          d.fv = v;
        }),
        CK.chk(
          d.suave,
          'Giro limpio para pixel art (RotSprite)',
          v => {
            d.suave = v;
          },
          'Agranda ×8 respetando los bordes antes de girar: las líneas inclinadas quedan sin dientes raros. Solo cambia algo en ángulos que no son de 90°.'
        ),
        h('p.nota-txt', 'Nunca inventa colores: cada píxel nuevo copia uno del original.')
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Aplicar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    Px.tr.sx = ((d.fh ? -1 : 1) * d.w) / 100;
    Px.tr.sy = ((d.fv ? -1 : 1) * d.h) / 100;
    Px.tr.ang = (d.ang * Math.PI) / 180;
    Px.tr.suave = Px.S.trSuave = d.suave;
    Px.tr.ocho = null;
    Px.aplicarTr();
    Px.pintarTira();
  };
  Px.menuLienzo = e => {
    const hay = !!(Px.sel || Px.flot),
      A0 = Px.A();
    if (!A0) return;
    CK.menu(e, [
      hay ? { titulo: Px.tr ? 'Transformando' : 'Selección' } : { titulo: A0.nombre },
      Px.tr
        ? {
            txt: 'Aplicar transformación',
            ico: 'ok',
            tecla: 'Enter',
            on: () => {
              Px.terminarTr();
            }
          }
        : null,
      Px.tr ? { txt: 'Cancelar transformación', ico: 'cerrar', tecla: 'Esc', on: Px.cancelarTr } : null,
      hay ? { txt: 'Copiar', ico: 'duplicar', tecla: 'Ctrl + C', on: () => Px.copiar() } : null,
      hay ? { txt: 'Cortar', ico: 'recortar', tecla: 'Ctrl + X', on: () => Px.copiar(true) } : null,
      { txt: 'Pegar', ico: 'duplicar', tecla: 'Ctrl + V', off: !Px.portaSel, on: Px.pegar },
      hay ? { txt: 'Borrar lo seleccionado', ico: 'basura', tecla: 'Supr', on: Px.borrarSel } : null,
      '-',
      { txt: 'Transformar libre', ico: 'escalar', tecla: 'T', on: () => Px.ponerHerr('transformar') },
      {
        txt: 'Rotar',
        ico: 'rotar',
        sub: [
          {
            txt: '90° a la derecha',
            on: () =>
              Px.trRapido(t => {
                t.ang += Math.PI / 2;
              })
          },
          {
            txt: '90° a la izquierda',
            on: () =>
              Px.trRapido(t => {
                t.ang -= Math.PI / 2;
              })
          },
          {
            txt: '180°',
            on: () =>
              Px.trRapido(t => {
                t.ang += Math.PI;
              })
          },
          '-',
          {
            txt: '45°',
            on: () =>
              Px.trRapido(t => {
                t.ang += Math.PI / 4;
              })
          },
          {
            txt: '15°',
            on: () =>
              Px.trRapido(t => {
                t.ang += Math.PI / 12;
              })
          },
          {
            txt: '−15°',
            on: () =>
              Px.trRapido(t => {
                t.ang -= Math.PI / 12;
              })
          }
        ]
      },
      {
        txt: 'Escalar',
        ico: 'tamano',
        sub: [
          {
            txt: '×2',
            on: () =>
              Px.trRapido(t => {
                t.sx *= 2;
                t.sy *= 2;
              })
          },
          {
            txt: '×3',
            on: () =>
              Px.trRapido(t => {
                t.sx *= 3;
                t.sy *= 3;
              })
          },
          {
            txt: '½',
            on: () =>
              Px.trRapido(t => {
                t.sx /= 2;
                t.sy /= 2;
              })
          },
          {
            txt: '150%',
            on: () =>
              Px.trRapido(t => {
                t.sx *= 1.5;
                t.sy *= 1.5;
              })
          },
          {
            txt: '75%',
            on: () =>
              Px.trRapido(t => {
                t.sx *= 0.75;
                t.sy *= 0.75;
              })
          }
        ]
      },
      {
        txt: 'Voltear horizontal',
        ico: 'voltearH',
        on: () =>
          Px.trRapido(t => {
            t.sx = -t.sx;
          })
      },
      {
        txt: 'Voltear vertical',
        ico: 'voltearV',
        on: () =>
          Px.trRapido(t => {
            t.sy = -t.sy;
          })
      },
      { txt: 'Transformar con números…', ico: 'ajustes', on: Px.trNumeros },
      {
        txt: 'Giro limpio (RotSprite)',
        ico: 'pixel',
        activo: !!Px.S.trSuave,
        on: () => {
          Px.S.trSuave = !Px.S.trSuave;
          if (Px.tr) {
            Px.tr.suave = Px.S.trSuave;
            Px.tr.ocho = null;
            Px.aplicarTr();
          }
        }
      },
      '-',
      hay ? { txt: 'A capa nueva', ico: 'capas', on: () => Px.selACapa(false) } : null,
      hay ? { txt: 'A asset nuevo', ico: 'assets', on: () => Px.aAssetNuevo(false) } : null,
      {
        txt: 'Seleccionar todo',
        ico: 'selRect',
        tecla: 'Ctrl + A',
        on: () => {
          Px.soltarFlot();
          const f = Px.FR();
          Px.ponerSel(new Uint8Array(f.w * f.h).fill(1));
        }
      },
      hay
        ? {
            txt: 'Invertir selección',
            ico: 'selRect',
            on: () => {
              Px.soltarFlot();
              if (!Px.sel) return;
              const m = Px.sel.m.map(v => (v ? 0 : 1));
              Px.ponerSel(m);
            }
          }
        : null,
      hay
        ? {
            txt: 'Soltar la selección',
            ico: 'cerrar',
            tecla: 'Esc',
            on: () => {
              Px.soltarFlot();
              Px.sel = null;
              Px.pintarTira();
              Px.pedir();
            }
          }
        : null,
      '-',
      {
        txt: 'Ver todo',
        ico: 'centrar',
        tecla: '0',
        on: () => {
          const f = Px.FR();
          Px.vista.encuadrar(f.w, f.h, 40);
        }
      },
      {
        txt: 'Grilla',
        ico: 'grilla',
        activo: Px.S.grilla,
        on: () => {
          Px.S.grilla = !Px.S.grilla;
          Px.pintarTira();
          Px.pedir();
        }
      }
    ]);
  };
})();
