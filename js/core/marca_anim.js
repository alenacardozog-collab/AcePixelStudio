/* MARCAR PARA ANIMAR: pincel gris semitransparente para pintar los píxeles exactos que se tienen que mover,
   más la nota escrita de cómo. Lo que no se pinta queda quieto en la animación (PIX.animate con o.mascara).
   La zona se guarda dentro de la marca como texto compacto: marca.mascara = { w, h, rle }. */
'use strict';
(function () {
  const h = CK.h;
  const MA = (CK.marcaAnim = {});

  /** Píxeles (PIX) del primer cuadro de un asset: es el dibujo sobre el que se pinta la zona. */
  MA.imagenDe = id => {
    const a = CK.P && CK.P.assets[id];
    if (!a || !CK.img[id]) return null;
    const im = CK.asset.pix(id),
      f = CK.asset.cuadro(a, 0);
    return a.cuadros ? PIX.crop(im, f.x, f.y, f.w, f.h) : im;
  };
  /** Zona guardada → Uint8Array (1 = se anima), o null si no hay o si el dibujo cambió de tamaño. */
  MA.leer = (marca, w, h2) => {
    const z = marca && marca.mascara;
    if (!z || z.w !== w || z.h !== h2) return null;
    const m = PIX.unrle(z.rle, w * h2);
    return m.some(v => v) ? m : null;
  };
  MA.cuantos = marca => {
    const z = marca && marca.mascara;
    if (!z) return 0;
    let n = 0;
    PIX.unrle(z.rle, z.w * z.h).forEach(v => (n += v));
    return n;
  };
  MA.guardar = (m, w, h2) => (m && m.some(v => v) ? { w, h: h2, rle: PIX.rle(m) } : undefined);

  /**
   * Ventana para pintar la zona y escribir la nota.
   * o = { titulo, im (PIX), marca, tipos ([valor, texto]), quitar (bool: muestra "Quitar marca"), soloZona (sin nota/tipo/estado) }
   * Devuelve la marca nueva, 'quitar' o null si se canceló.
   */
  MA.editar = o =>
    new Promise(res => {
      const D = CK.doc(),
        im = o.im,
        W = im.w,
        H = im.h;
      const d = Object.assign({ nota: '', tipoAnim: '', estado: 'pendiente' }, CK.clone(o.marca || {}));
      let mask = MA.leer(d, W, H) || new Uint8Array(W * H);
      const pila = [],
        rehacer = [];
      const st = { herr: 'pincel', tam: Math.max(1, Math.round(Math.min(W, H) / 24)), opac: 0.55, verZona: true };
      // dibujo original como lienzo
      const base = CK.aLienzo(im);
      const capa = CK.lienzo(W, H),
        cx = CK.ctx(capa);
      const pintarCapa = () => {
        const id = cx.createImageData(W, H);
        for (let p = 0; p < mask.length; p++)
          if (mask[p]) {
            id.data[p * 4] = id.data[p * 4 + 1] = id.data[p * 4 + 2] = 150;
            id.data[p * 4 + 3] = 255;
          }
        cx.putImageData(id, 0, 0);
        info.textContent = contar() + ' píxeles marcados de ' + opacos + ' del dibujo';
      };
      let opacos = 0;
      for (let p = 0; p < W * H; p++) if (im.d[p * 4 + 3]) opacos++;
      const contar = () => {
        let n = 0;
        for (let p = 0; p < mask.length; p++) n += mask[p];
        return n;
      };
      const guardarPaso = () => {
        pila.push(mask.slice());
        if (pila.length > 60) pila.shift();
        rehacer.length = 0;
      };
      const deshacer = () => {
        if (!pila.length) return;
        rehacer.push(mask);
        mask = pila.pop();
        pintarCapa();
        vista.pedir();
      };
      const reHacer = () => {
        if (!rehacer.length) return;
        pila.push(mask);
        mask = rehacer.pop();
        pintarCapa();
        vista.pedir();
      };
      // ------------------------------------------------------------ pintar
      const sello = (x, y, v) => {
        const r = st.tam,
          x0 = Math.floor(x - (r - 1) / 2),
          y0 = Math.floor(y - (r - 1) / 2);
        for (let yy = y0; yy < y0 + r; yy++)
          for (let xx = x0; xx < x0 + r; xx++) {
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            if (st.tam > 2 && r > 3) {
              const dx = xx - x0 - (r - 1) / 2,
                dy = yy - y0 - (r - 1) / 2;
              if (dx * dx + dy * dy > (r / 2) * (r / 2) + 0.5) continue;
            }
            mask[yy * W + xx] = v;
          }
      };
      const linea = (a, b, v) => {
        const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
        for (let i = 0; i <= n; i++) sello(Math.round(a.x + ((b.x - a.x) * i) / n), Math.round(a.y + ((b.y - a.y) * i) / n), v);
      };
      /** Balde: marca (o desmarca) la parte del dibujo conectada y de color parecido. */
      const balde = (x, y, v) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        const i0 = (y * W + x) * 4,
          ref = [im.d[i0], im.d[i0 + 1], im.d[i0 + 2], im.d[i0 + 3]],
          tol = 48,
          visto = new Uint8Array(W * H),
          cola = [y * W + x];
        const parecido = p => {
          const i = p * 4;
          if (!ref[3]) return !im.d[i + 3];
          return im.d[i + 3] && Math.abs(im.d[i] - ref[0]) + Math.abs(im.d[i + 1] - ref[1]) + Math.abs(im.d[i + 2] - ref[2]) <= tol;
        };
        visto[cola[0]] = 1;
        while (cola.length) {
          const p = cola.pop(),
            px = p % W,
            py = (p / W) | 0;
          mask[p] = v;
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ].forEach(([dx, dy]) => {
            const nx = px + dx,
              ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
            const q = ny * W + nx;
            if (visto[q] || !parecido(q)) return;
            visto[q] = 1;
            cola.push(q);
          });
        }
      };
      let ult = null,
        valor = 1;
      const herramienta = {
        bajar: m => {
          const x = Math.floor(m.x),
            y = Math.floor(m.y);
          valor = m.boton === 2 || st.herr === 'goma' ? 0 : 1;
          guardarPaso();
          if (st.herr === 'balde') {
            balde(x, y, valor);
            ult = null;
          } else {
            sello(x, y, valor);
            ult = { x, y };
          }
          pintarCapa();
          vista.pedir();
        },
        mover: m => {
          if (!ult) return;
          const p = { x: Math.floor(m.x), y: Math.floor(m.y) };
          linea(ult, p, valor);
          ult = p;
          pintarCapa();
          vista.pedir();
        },
        pasar: () => vista.pedir(),
        subir: () => {
          ult = null;
        },
        salir: () => vista.pedir()
      };
      // ------------------------------------------------------------ vista
      const lienzo = h('canvas.marca-lienzo');
      const vista = CK.vista(lienzo, {
        herramienta,
        pintar: (x, v) => {
          x.save();
          v.mundo(x);
          // damero
          x.fillStyle = '#2a2d33';
          x.fillRect(0, 0, W, H);
          x.fillStyle = '#33373e';
          const t = Math.max(1, Math.round(8 / Math.max(1, v.z / 2)));
          for (let yy = 0; yy < H; yy += t) for (let xx = (yy / t) % 2 ? t : 0; xx < W; xx += t * 2) x.fillRect(xx, yy, t, t);
          x.drawImage(base, 0, 0);
          if (st.verZona) {
            x.globalAlpha = st.opac;
            x.drawImage(capa, 0, 0);
            x.globalAlpha = 1;
          }
          x.restore();
          v.grilla(x, 1, W, H, 'rgba(255,255,255,.05)');
          // tamaño del pincel bajo el mouse
          if (st.herr !== 'balde' && v.m && v.m.x !== undefined) {
            const r = st.tam,
              px = Math.floor(v.m.x - (r - 1) / 2),
              py = Math.floor(v.m.y - (r - 1) / 2),
              q = v.aPantalla(px, py);
            x.strokeStyle = st.herr === 'goma' ? '#e8644f' : '#e8b83a';
            x.lineWidth = 1;
            x.strokeRect(Math.round(q.x) + 0.5, Math.round(q.y) + 0.5, r * v.z, r * v.z);
          }
        }
      });
      const info = h('span.nota-txt');
      // ------------------------------------------------------------ barra de herramientas
      const bHerr = {};
      const ponerHerr = id => {
        st.herr = id;
        lienzo.style.cursor = CK.cur('crosshair', { pincel: 'pincel', goma: 'borrador', balde: 'balde' }[id]) || '';
        Object.keys(bHerr).forEach(k => bHerr[k].classList.toggle('activo', k === id));
        vista.pedir();
      };
      const herrB = (id, ico, tip, desc, tecla) => (bHerr[id] = CK.btn({ ico, tip, desc, tecla, cls: 'chico', on: () => ponerHerr(id) }));
      const todo = v => {
        guardarPaso();
        for (let p = 0; p < mask.length; p++)
          mask[p] = v === 'inv' ? (mask[p] ? 0 : im.d[p * 4 + 3] ? 1 : 0) : v === 1 ? (im.d[p * 4 + 3] ? 1 : 0) : 0;
        pintarCapa();
        vista.pedir();
      };
      const tamR = CK.rango(st.tam, { min: 1, max: Math.max(8, Math.min(32, Math.round(Math.max(W, H) / 4))) }, v => {
        st.tam = v;
        vista.pedir();
      });
      const opR = CK.rango(Math.round(st.opac * 100), { min: 10, max: 100, step: 5 }, v => {
        st.opac = v / 100;
        vista.pedir();
      });
      const barra = h(
        'div.marca-barra',
        herrB('pincel', 'lapiz', 'Pincel gris', 'Pintá los píxeles que se tienen que mover. Clic derecho borra.', 'B'),
        herrB('goma', 'borrador', 'Borrar zona', 'Despinta: esos píxeles quedan quietos.', 'E'),
        herrB(
          'balde',
          'balde',
          'Balde',
          'Marca de un clic toda la parte conectada del mismo color (por ejemplo, toda la bandera). Clic derecho la desmarca.',
          'G'
        ),
        h('span.sep'),
        h('span.marca-rot', 'Tamaño'),
        tamR,
        h('span.marca-rot', 'Opacidad'),
        opR,
        h('span.sep'),
        CK.btn({ txt: 'Todo', cls: 'chico plano', desc: 'Marca todo el dibujo (se mueve entero).', on: () => todo(1) }),
        CK.btn({ txt: 'Nada', cls: 'chico plano', desc: 'Borra toda la zona.', on: () => todo(0) }),
        CK.btn({ txt: 'Invertir', cls: 'chico plano', desc: 'Lo marcado pasa a quieto y al revés.', on: () => todo('inv') }),
        h('span.sep'),
        CK.btn({ ico: 'deshacer', tip: 'Deshacer', tecla: 'Ctrl + Z', cls: 'chico plano', on: deshacer }),
        CK.btn({ ico: 'rehacer', tip: 'Rehacer', tecla: 'Ctrl + Y', cls: 'chico plano', on: reHacer })
      );
      const ojo = CK.chk(true, 'Ver zona', v => {
        st.verZona = v;
        vista.pedir();
      });
      // ------------------------------------------------------------ datos de la marca
      const lado = h(
        'div.marca-lado',
        o.soloZona
          ? null
          : CK.campo(
              'Cómo se anima',
              CK.txt(
                d.nota,
                v => {
                  d.nota = v;
                },
                { multi: true, filas: 4, ph: 'Ej.: la bandera ondea suave, 4 cuadros, en loop. El mástil queda quieto.', vivo: true }
              )
            ),
        o.soloZona
          ? null
          : CK.campo(
              'Tipo',
              CK.sel(d.tipoAnim, o.tipos || [['', 'Lo decidimos después']], v => {
                d.tipoAnim = v;
              })
            ),
        o.soloZona
          ? null
          : CK.campo(
              'Estado',
              CK.sel(
                d.estado,
                [
                  ['pendiente', 'Pendiente'],
                  ['hecha', 'Hecha']
                ],
                v => {
                  d.estado = v;
                }
              )
            ),
        h(
          'p.nota-txt',
          'Pintá en gris lo que se tiene que mover. Lo que no pintes queda igual que en el dibujo en todos los cuadros. ' +
            'Si no pintás nada, se anima el objeto entero.'
        ),
        ojo,
        info
      );
      const cuerpo = h('div.marca-anim', barra, h('div.marca-medio', h('div.marca-caja', lienzo), lado));
      const tecla = e => {
        if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === 'z') {
          e.preventDefault();
          e.stopPropagation();
          e.shiftKey ? reHacer() : deshacer();
        } else if ((e.ctrlKey || e.metaKey) && k === 'y') {
          e.preventDefault();
          e.stopPropagation();
          reHacer();
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const m = { b: 'pincel', e: 'goma', g: 'balde' }[k];
          if (m) {
            ponerHerr(m);
            e.stopPropagation();
          } else if (k === '[' || k === ']') {
            st.tam = CK.clamp(st.tam + (k === ']' ? 1 : -1), 1, 32);
            tamR.poner(st.tam);
            vista.pedir();
            e.stopPropagation();
          }
        }
      };
      D.addEventListener('keydown', tecla, true);
      ponerHerr('pincel');
      pintarCapa();
      CK.ventana({
        titulo: o.titulo || 'Marcar para animar',
        ancho: Math.min(1040, (D.defaultView || window).innerWidth - 40),
        cuerpo,
        botones: [
          o.quitar ? { txt: 'Quitar marca', cls: 'peligro', valor: 'quitar' } : null,
          { txt: 'Cancelar', valor: null },
          { txt: o.soloZona ? 'Guardar zona' : 'Guardar marca', cls: 'pri', valor: true }
        ].filter(Boolean)
      }).then(v => {
        D.removeEventListener('keydown', tecla, true);
        const i = (CK._vistas || []).indexOf(vista);
        if (i >= 0) CK._vistas.splice(i, 1);
        if (!v) return res(null);
        if (v === 'quitar') return res('quitar');
        const z = MA.guardar(mask, W, H);
        if (z) d.mascara = z;
        else delete d.mascara;
        res(d);
      });
      setTimeout(() => {
        vista.medir();
        vista.encuadrar(W, H, 24);
      }, 40);
    });
})();
