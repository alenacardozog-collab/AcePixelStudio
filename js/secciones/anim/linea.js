/* ANIMAR · línea de tiempo: reordenar, alargar, duplicar, borrar, pegar e insertar cuadros. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  // ---------------------------------------------------------------- línea de tiempo
  let pista = null,
    aguja = null,
    regla = null,
    portaCuadros = null;
  /** Abre la hoja como lista de cuadros + duraciones; fn los cambia; queda todo en un solo paso de deshacer. */
  An.editarHoja = (nombre, fn) => {
    const a = An.hojaA();
    if (!a || !a.cuadros) return;
    const k = a.cuadros,
      n = CK.asset.nCuadros(a),
      id = a.id;
    const antesImg = CK.copiaLienzo(CK.img[id]),
      antesC = JSON.stringify(a.cuadros);
    let frs = PIX.slice(CK.asset.pix(id), k.fw, k.fh).slice(0, n),
      dur = (k.dur || []).slice(0, n);
    while (dur.length < frs.length) dur.push(0);
    if (k.orden) {
      frs = k.orden.map(i => frs[i]);
      dur = k.orden.map(i => dur[i] || 0);
    }
    const r = fn(frs, dur);
    if (r === false || !frs.length) return;
    k.dur = dur.some(Boolean) ? dur.map(v => v || 0) : undefined;
    if (!k.dur) delete k.dur;
    delete k.orden;
    CK.asset.poner(id, CK.aLienzo(PIX.pack(frs, frs.length)));
    const despuesImg = CK.copiaLienzo(CK.img[id]),
      despuesC = JSON.stringify(a.cuadros);
    const poner = (img, c) => {
      const x = CK.P.assets[id];
      if (!x) return;
      x.cuadros = JSON.parse(c);
      CK.asset.poner(id, CK.copiaLienzo(img));
    };
    CK.hist.push({ nombre, deshacer: () => poner(antesImg, antesC), rehacer: () => poner(despuesImg, despuesC) });
    An.st.selC = new Set([...An.st.selC].filter(i => i < frs.length));
    An.cacheKey = '';
    An.pintarCentro();
    if (An.tabs) An.tabs.refrescar();
  };
  An.selOrden = () => [...An.st.selC].sort((a, b) => a - b);
  const conSel = i => {
    if (i !== undefined && !An.st.selC.has(i)) {
      An.st.selC = new Set([i]);
      An.st.ancla = i;
    }
    return An.selOrden();
  };
  An.ops = {
    duplicar: () => {
      const s = An.selOrden();
      if (!s.length) return;
      An.editarHoja('Duplicar cuadros', (f, d) => {
        const ult = s[s.length - 1],
          cop = s.map(i => PIX.clone(f[i])),
          cd = s.map(i => d[i]);
        f.splice(ult + 1, 0, ...cop);
        d.splice(ult + 1, 0, ...cd);
        An.st.selC = new Set(cop.map((_, k) => ult + 1 + k));
      });
    },
    borrar: () => {
      const s = An.selOrden(),
        n = CK.asset.nCuadros(An.hojaA());
      if (!s.length) return;
      if (s.length >= n) {
        CK.aviso('Tiene que quedar al menos un cuadro.', 'info');
        return;
      }
      An.editarHoja('Borrar cuadros', (f, d) => {
        s.slice()
          .reverse()
          .forEach(i => {
            f.splice(i, 1);
            d.splice(i, 1);
          });
        An.st.selC = new Set([Math.min(s[0], f.length - 1)]);
      });
    },
    vacio: despues => {
      const s = An.selOrden(),
        at = s.length ? (despues ? s[s.length - 1] + 1 : s[0]) : CK.asset.nCuadros(An.hojaA());
      An.editarHoja('Cuadro vacío', (f, d) => {
        f.splice(at, 0, PIX.make(f[0].w, f[0].h));
        d.splice(at, 0, 0);
        An.st.selC = new Set([at]);
      });
    },
    mover: hasta => {
      const s = An.selOrden();
      if (!s.length) return;
      An.editarHoja('Ordenar cuadros', (f, d) => {
        const sf = s.map(i => f[i]),
          sd = s.map(i => d[i]);
        s.slice()
          .reverse()
          .forEach(i => {
            f.splice(i, 1);
            d.splice(i, 1);
          });
        let at = hasta - s.filter(i => i < hasta).length;
        at = Math.max(0, Math.min(f.length, at));
        f.splice(at, 0, ...sf);
        d.splice(at, 0, ...sd);
        An.st.selC = new Set(sf.map((_, k) => at + k));
      });
    },
    invertir: () => {
      const s = An.selOrden();
      if (s.length < 2) return;
      An.editarHoja('Invertir cuadros', (f, d) => {
        const sf = s.map(i => f[i]).reverse(),
          sd = s.map(i => d[i]).reverse();
        s.forEach((i, k) => {
          f[i] = sf[k];
          d[i] = sd[k];
        });
      });
    },
    espejar: () => {
      const s = An.selOrden();
      if (!s.length) return;
      An.editarHoja('Espejar cuadros', f => {
        s.forEach(i => {
          f[i] = PIX.flipH(f[i]);
        });
      });
    },
    duracion: ms => {
      const s = An.selOrden();
      if (!s.length) return;
      An.editarHoja('Duración del cuadro', (f, d) => {
        s.forEach(i => {
          d[i] = ms && Math.abs(ms - An.baseMs()) > 0.5 ? Math.round(ms) : 0;
        });
      });
    },
    copiar: () => {
      const a = An.hojaA(),
        s = An.selOrden();
      if (!a || !s.length) return;
      const frs = PIX.slice(CK.asset.pix(a.id), a.cuadros.fw, a.cuadros.fh);
      portaCuadros = s.map(i => ({ im: PIX.clone(frs[i]), d: (a.cuadros.dur || [])[i] || 0 }));
      CK.estado(s.length + ' cuadro(s) copiado(s). Ctrl + V los pega después del elegido.');
    },
    pegar: () => {
      if (!portaCuadros) return;
      const s = An.selOrden(),
        at = s.length ? s[s.length - 1] + 1 : CK.asset.nCuadros(An.hojaA());
      An.editarHoja('Pegar cuadros', (f, d) => {
        const W = f[0].w,
          H = f[0].h,
          nu = portaCuadros.map(p => {
            if (p.im.w === W && p.im.h === H) return PIX.clone(p.im);
            const o = PIX.make(W, H);
            PIX.blit(o, p.im, Math.round((W - p.im.w) / 2), H - p.im.h, false);
            return o;
          });
        f.splice(at, 0, ...nu);
        d.splice(at, 0, ...portaCuadros.map(p => p.d));
        An.st.selC = new Set(nu.map((_, k) => at + k));
      });
    },
    insertarArchivos: async (archivos, at) => {
      const fs = (archivos || (await CK.elegirArchivos('image/png,image/gif,image/webp', true))).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
      if (!fs.length) return;
      const a = An.hojaA();
      if (!a) return;
      const ims = [];
      for (const f of fs) {
        try {
          const im = CK.aPix(await CK.cargarImagen(f));
          if (im.h === a.cuadros.fh && im.w > im.h && im.w % a.cuadros.fw === 0)
            PIX.slice(im, a.cuadros.fw, a.cuadros.fh).forEach(q => ims.push(q));
          else ims.push(im);
        } catch (e) {
          CK.aviso('No pude leer ' + f.name, 'error');
        }
      }
      if (!ims.length) return;
      if (at === undefined) {
        const s = An.selOrden();
        at = s.length ? s[s.length - 1] + 1 : CK.asset.nCuadros(a);
      }
      An.editarHoja('Agregar cuadros', (f, d) => {
        const W = f[0].w,
          H = f[0].h,
          nu = ims.map(im => {
            if (im.w === W && im.h === H) return im;
            const o = PIX.make(W, H);
            PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false);
            return o;
          });
        f.splice(at, 0, ...nu);
        d.splice(at, 0, ...nu.map(() => 0));
        An.st.selC = new Set(nu.map((_, k) => at + k));
      });
      if (ims.some(im => im.w > a.cuadros.fw || im.h > a.cuadros.fh))
        CK.aviso(
          'Alguna imagen era más grande que el cuadro (' +
            a.cuadros.fw +
            ' × ' +
            a.cuadros.fh +
            '): quedó recortada. Agrandá el cuadro en Pixel art → Tamaño del lienzo.',
          'info',
          6000
        );
    },
    reemplazar: async i => {
      const [f] = await CK.elegirArchivos('image/png,image/gif,image/webp');
      if (!f) return;
      const im = CK.aPix(await CK.cargarImagen(f));
      An.editarHoja('Reemplazar cuadro', fr => {
        const W = fr[0].w,
          H = fr[0].h,
          o = PIX.make(W, H);
        PIX.blit(o, im, Math.round((W - im.w) / 2), H - im.h, false);
        fr[i] = o;
      });
    }
  };
  An.editarEnPixel = i => {
    const a = An.hojaA();
    if (!a) return;
    if (a.cuadros.orden) An.editarHoja('Fijar orden', () => {});
    CK.ir('pixel', a.id);
    if (CK.pixel && CK.pixel.irCuadro) CK.pixel.irCuadro(i);
  };
  const menuCuadro = (e, i) => {
    const s = conSel(i),
      a = An.hojaA(),
      dur = (a.cuadros.dur || [])[i] || 0,
      base = An.baseMs(),
      varios = s.length > 1;
    An.pintarPista();
    CK.menu(e, [
      { titulo: varios ? s.length + ' cuadros' : 'Cuadro ' + (i + 1) },
      { txt: 'Editar en Pixel art', ico: 'pixel', tecla: 'Doble clic', off: varios, on: () => An.editarEnPixel(i) },
      '-',
      { txt: 'Duplicar', ico: 'duplicar', tecla: 'Ctrl + D', on: An.ops.duplicar },
      { txt: 'Copiar', ico: 'duplicar', tecla: 'Ctrl + C', on: An.ops.copiar },
      { txt: 'Pegar después', ico: 'duplicar', tecla: 'Ctrl + V', off: !portaCuadros, on: An.ops.pegar },
      {
        txt: 'Insertar',
        ico: 'mas',
        sub: [
          { txt: 'Cuadro vacío antes', on: () => An.ops.vacio(false) },
          { txt: 'Cuadro vacío después', on: () => An.ops.vacio(true) },
          { txt: 'Imágenes desde archivo…', on: () => An.ops.insertarArchivos(null, s[s.length - 1] + 1) }
        ]
      },
      { txt: 'Reemplazar con imagen…', ico: 'importar', off: varios, on: () => An.ops.reemplazar(i) },
      '-',
      {
        txt: 'Duración',
        ico: 'tiempo',
        sub: [1, 2, 3, 4, 6]
          .map(k => ({
            txt: '×' + k + ' (' + Math.round(base * k) + ' ms)',
            activo: !varios && Math.abs((dur || base) - base * k) < 1,
            on: () => An.ops.duracion(base * k)
          }))
          .concat([
            '-',
            {
              txt: 'Personalizada…',
              on: async () => {
                const v = await CK.pedir(
                  'Duración del cuadro',
                  'Milisegundos (a ' + An.fpsAct() + ' cuadros/s cada uno dura ' + Math.round(base) + ' ms)',
                  String(Math.round(dur || base))
                );
                const n = parseFloat(v);
                if (n > 0) An.ops.duracion(n);
              }
            }
          ])
      },
      {
        txt: 'Mover',
        ico: 'mover',
        sub: [
          { txt: 'Al principio', on: () => An.ops.mover(0) },
          { txt: 'Un lugar antes', tecla: 'Alt + ←', on: () => An.ops.mover(Math.max(0, s[0] - 1)) },
          { txt: 'Un lugar después', tecla: 'Alt + →', on: () => An.ops.mover(s[s.length - 1] + 2) },
          { txt: 'Al final', on: () => An.ops.mover(CK.asset.nCuadros(a)) }
        ]
      },
      varios ? { txt: 'Invertir el orden', ico: 'bucle', on: An.ops.invertir } : null,
      { txt: 'Espejar', ico: 'voltearH', on: An.ops.espejar },
      {
        txt: 'Descargar PNG',
        ico: 'importar',
        on: async () => {
          const frs = PIX.slice(CK.asset.pix(a.id), a.cuadros.fw, a.cuadros.fh);
          for (const k of s) CK.descargar(await CK.aBlob(CK.aLienzo(frs[k])), a.id + '_' + (k + 1) + '.png');
        }
      },
      '-',
      { txt: varios ? 'Borrar ' + s.length + ' cuadros' : 'Borrar cuadro', ico: 'basura', tecla: 'Supr', peligro: true, on: An.ops.borrar }
    ]);
  };
  An.marcarActual = () => {
    if (!pista) return;
    const f = An.fisico(An.rep.i);
    pista.querySelectorAll('.tl-cuadro').forEach(c => c.classList.toggle('actual', +c.dataset.i === f));
  };
  An.moverAguja = total => {
    if (!aguja || !pista) return;
    const { ms } = An.secuencia(),
      a = An.hojaA();
    if (!ms.length) return;
    const n = a && a.cuadros ? CK.asset.nCuadros(a) : ms.length;
    let t = An.rep.t;
    if (a && a.cuadros && a.cuadros.vaiven && ms.length > n) {
      const ida = An.inicioDe(ms, n);
      if (t > ida) {
        const vuelta = t - ida,
          idx = An.rep.i;
        const fi = An.fisico(idx),
          cel = pista.querySelector('.tl-cuadro[data-i="' + fi + '"]');
        if (cel) {
          aguja.style.left = cel.offsetLeft + cel.offsetWidth / 2 + 'px';
        }
        return;
      }
    }
    let acc = 0,
      x = 0;
    const celdas = pista.querySelectorAll('.tl-cuadro');
    for (let i = 0; i < celdas.length; i++) {
      const d = ms[i] / 1000;
      if (t < acc + d || i === celdas.length - 1) {
        x = celdas[i].offsetLeft + celdas[i].offsetWidth * Math.min(1, (t - acc) / d);
        break;
      }
      acc += d;
    }
    aguja.style.left = x + 'px';
  };
  An.pintarCabezal = () => {
    An.marcarActual();
  };
  An.pintarPista = () => {
    if (!pista) return;
    pista.querySelectorAll('.tl-cuadro').forEach(c => c.classList.toggle('sel', An.st.selC.has(+c.dataset.i)));
  };
  An.pintarLinea = () => {
    if (!An.lineaEl) return;
    CK.vaciar(An.lineaEl);
    pista = aguja = regla = null;
    const { fr, ms } = An.secuencia(),
      a = An.hojaA();
    const info = h(
      'span.nota-txt',
      fr.length
        ? fr.length +
            ' cuadros · ' +
            (ms.reduce((s, v) => s + v, 0) / 1000).toFixed(2) +
            ' s' +
            (a && a.cuadros.vaiven ? ' (ida y vuelta)' : '')
        : ''
    );
    const pasoB = d => () => An.irA(An.rep.i + d);
    const barra = h(
      'div.tl-barra',
      CK.btn({ ico: 'anterior', tip: 'Al principio', tecla: 'Inicio', cls: 'chico plano', on: () => An.irA(0) }),
      (() => {
        const b = CK.btn({ ico: 'flechaD', tip: 'Cuadro anterior', tecla: ',', cls: 'chico plano', on: pasoB(-1) });
        b.firstChild.style.transform = 'scaleX(-1)';
        return b;
      })(),
      CK.btn({
        ico: An.rep.play ? 'pausa' : 'play',
        tip: 'Reproducir / pausar',
        tecla: 'Espacio',
        cls: 'chico',
        on: (e, b) => {
          An.ponerPlay(!An.rep.play);
          b.innerHTML = CK.ico(An.rep.play ? 'pausa' : 'play');
        }
      }),
      CK.btn({ ico: 'flechaD', tip: 'Cuadro siguiente', tecla: '.', cls: 'chico plano', on: pasoB(1) }),
      CK.btn({ ico: 'siguiente', tip: 'Al final', tecla: 'Fin', cls: 'chico plano', on: () => An.irA(fr.length - 1) }),
      h('span.sep')
    );
    if (a && a.cuadros) {
      const k = a.cuadros,
        fps = CK.num(k.fps || 8, { min: 1, max: 60 }, v => {
          const f = CK.hist.datos('Velocidad', 'assets', a.id);
          k.fps = v;
          f();
          An.cacheKey = '';
          An.pintarCentro();
        });
      fps.style.width = '56px';
      barra.append(
        h('span.txt', 'cuadros/s'),
        fps,
        CK.btn({
          ico: 'bucle',
          tip: 'Se repite en loop',
          cls: 'chico plano' + (k.bucle !== false ? ' activo' : ''),
          on: () => {
            const f = CK.hist.datos('Loop', 'assets', a.id);
            k.bucle = k.bucle === false;
            f();
            An.pintarCentro();
          }
        }),
        CK.btn({
          txt: 'Ida y vuelta',
          cls: 'chico plano' + (k.vaiven ? ' activo' : ''),
          desc: 'Al llegar al último cuadro vuelve hacia atrás.',
          on: () => {
            const f = CK.hist.datos('Ida y vuelta', 'assets', a.id);
            k.vaiven = !k.vaiven;
            f();
            An.cacheKey = '';
            An.pintarCentro();
          }
        }),
        h('span.sep'),
        CK.btn({
          ico: 'mas',
          tip: 'Cuadro vacío',
          desc: 'Agrega un cuadro vacío después del elegido.',
          cls: 'chico plano',
          on: () => An.ops.vacio(true)
        }),
        CK.btn({ ico: 'duplicar', tip: 'Duplicar', tecla: 'Ctrl + D', cls: 'chico plano', on: An.ops.duplicar }),
        CK.btn({
          ico: 'importar',
          tip: 'Agregar imágenes',
          desc: 'Suma cuadros desde archivos PNG (uno por archivo, o tiras del mismo alto). También podés soltarlos sobre la línea de tiempo.',
          cls: 'chico plano',
          on: () => An.ops.insertarArchivos()
        }),
        CK.btn({ ico: 'basura', tip: 'Borrar', tecla: 'Supr', cls: 'chico plano', on: An.ops.borrar }),
        h('span.sep')
      );
      const tam = CK.rango(An.st.tamCuadro, { min: 36, max: 140, step: 4 }, v => {
        An.st.tamCuadro = v;
        An.pintarLinea();
      });
      tam.style.width = '90px';
      const tt = h('div.fila.junto', h('span.txt', { html: CK.ico('lupa', 14) }), tam);
      CK.tip(tt, 'Tamaño de los cuadros', 'Agranda o achica las miniaturas de la línea de tiempo.');
      barra.append(tt);
    }
    barra.append(h('span.crece'), info);
    An.lineaEl.append(barra);
    if (!fr.length) {
      An.lineaEl.append(
        h(
          'div.ayuda-txt',
          { style: { padding: '12px' } },
          An.st.modo === 'generar'
            ? 'Elegí un asset base a la derecha para generar la animación.'
            : 'Elegí una animación de la lista de la izquierda.'
        )
      );
      return;
    }
    // regla + pista
    const n = a && a.cuadros ? CK.asset.nCuadros(a) : fr.length,
      base = An.baseMs(),
      T = An.st.tamCuadro,
      msF = a && a.cuadros ? [...Array(n).keys()].map(i => (a.cuadros.dur || [])[i] || base) : ms.slice(0, n);
    const anchoDe = i => Math.max(T * 0.6, Math.round((T * msF[i]) / base));
    pista = h('div.tl-pista');
    regla = h('div.tl-regla');
    aguja = h('div.tl-aguja');
    const frsFis =
      a && a.cuadros
        ? [...Array(n).keys()].map(i => {
            const g = CK.asset.cuadro(a, i),
              c = CK.lienzo(g.w, g.h);
            CK.ctx(c).drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
            return c;
          })
        : fr;
    let acc = 0;
    frsFis.forEach((c, i) => {
      const w = anchoDe(i),
        d = ((a && a.cuadros && a.cuadros.dur) || [])[i];
      const cel = h(
        'div.tl-cuadro' + (An.st.selC.has(i) ? '.sel' : ''),
        { 'data-i': i, style: { width: w + 'px' } },
        h('span.nro', String(i + 1)),
        CK.mini(c, Math.min(T - 8, 160)),
        d ? h('span.tl-dur', Math.round(d) + ' ms') : null,
        a ? h('span.tl-borde') : null
      );
      cel.querySelector('canvas').style.width = cel.querySelector('canvas').style.height = Math.min(T - 8, 160) + 'px';
      if (a) {
        cel.addEventListener('pointerdown', e => alApretar(e, i, cel));
        cel.addEventListener('dblclick', () => An.editarEnPixel(i));
        cel.addEventListener('contextmenu', e => menuCuadro(e, i));
        CK.tip(
          cel,
          'Cuadro ' + (i + 1),
          (d ? 'Dura ' + Math.round(d) + ' ms. ' : '') +
            'Clic: elegir · Arrastrar: reordenar · Borde derecho: alargar · Doble clic: dibujar · Clic derecho: opciones.'
        );
      } else cel.addEventListener('click', () => An.irA(i));
      pista.append(cel);
      const marca = h('span.tl-marca', { style: { left: acc + 'px' } }, An.inicioDe(msF, i).toFixed(2) + 's');
      regla.append(marca);
      acc += w + 4;
    });
    pista.append(aguja);
    regla.style.width = acc + 'px';
    regla.addEventListener('pointerdown', e => {
      regla.setPointerCapture(e.pointerId);
      const ir = ev => {
        const r = pista.getBoundingClientRect(),
          x = ev.clientX - r.left + pista.scrollLeft;
        const celdas = [...pista.querySelectorAll('.tl-cuadro')];
        let k = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth);
        if (k < 0) k = celdas.length - 1;
        An.irA(k);
      };
      ir(e);
      const up = () => {
        regla.removeEventListener('pointermove', ir);
        regla.removeEventListener('pointerup', up);
      };
      regla.addEventListener('pointermove', ir);
      regla.addEventListener('pointerup', up);
    });
    const caja = h('div.tl-caja', regla, pista);
    if (a) {
      caja.addEventListener('dragover', e => {
        if ([...e.dataTransfer.types].includes('Files')) {
          e.preventDefault();
          caja.classList.add('soltando');
        }
      });
      caja.addEventListener('dragleave', () => caja.classList.remove('soltando'));
      caja.addEventListener('drop', e => {
        caja.classList.remove('soltando');
        const fs = [...e.dataTransfer.files].filter(f => /^image\//.test(f.type));
        if (!fs.length) return;
        e.preventDefault();
        const r = pista.getBoundingClientRect(),
          x = e.clientX - r.left + pista.scrollLeft,
          celdas = [...pista.querySelectorAll('.tl-cuadro')];
        let at = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth / 2);
        if (at < 0) at = celdas.length;
        An.ops.insertarArchivos(fs, at);
      });
      caja.addEventListener('contextmenu', e => {
        if (e.target.closest('.tl-cuadro')) return;
        CK.menu(e, [
          {
            txt: 'Cuadro vacío al final',
            ico: 'mas',
            on: () => {
              An.st.selC = new Set([n - 1]);
              An.ops.vacio(true);
            }
          },
          { txt: 'Agregar imágenes…', ico: 'importar', on: () => An.ops.insertarArchivos(null, n) },
          {
            txt: 'Pegar al final',
            ico: 'duplicar',
            off: !portaCuadros,
            on: () => {
              An.st.selC = new Set([n - 1]);
              An.ops.pegar();
            }
          }
        ]);
      });
    }
    An.lineaEl.append(caja);
    An.marcarActual();
    setTimeout(() => An.moverAguja(), 0);
  };
  /** Clic, arrastre para reordenar y borde para alargar un cuadro. */
  const alApretar = (e, i, cel) => {
    if (e.button !== 0) return;
    const a = An.hojaA();
    if (!a) return;
    const r = cel.getBoundingClientRect(),
      enBorde = e.clientX > r.right - 7,
      x0 = e.clientX;
    if (e.ctrlKey || e.metaKey) {
      An.st.selC.has(i) ? An.st.selC.delete(i) : An.st.selC.add(i);
      An.st.ancla = i;
      An.pintarPista();
      return;
    }
    if (e.shiftKey) {
      const lo = Math.min(An.st.ancla, i),
        hi = Math.max(An.st.ancla, i);
      An.st.selC = new Set([...Array(hi - lo + 1).keys()].map(k => lo + k));
      An.pintarPista();
      return;
    }
    if (!An.st.selC.has(i)) {
      An.st.selC = new Set([i]);
      An.st.ancla = i;
    }
    An.pintarPista();
    cel.setPointerCapture(e.pointerId);
    const base = An.baseMs(),
      dur0 = (a.cuadros.dur || [])[i] || base,
      w0 = cel.offsetWidth;
    let modo = enBorde ? 'durar' : null,
      marca = null,
      destino = null,
      nuevoMs = dur0;
    const mv = ev => {
      const dx = ev.clientX - x0;
      if (modo === 'durar') {
        nuevoMs = Math.max(base * 0.25, (dur0 * (w0 + dx)) / w0);
        if (!ev.shiftKey) nuevoMs = Math.max(1, Math.round(nuevoMs / base)) * base;
        cel.style.width = Math.max(An.st.tamCuadro * 0.6, Math.round((An.st.tamCuadro * nuevoMs) / base)) + 'px';
        CK.estado(
          'Duración: ' + Math.round(nuevoMs) + ' ms (×' + (nuevoMs / base).toFixed(2).replace(/\.?0+$/, '') + '). Mayús: sin redondear.'
        );
        return;
      }
      if (!modo && Math.abs(dx) > 5) {
        modo = 'mover';
        marca = h('div.tl-insertar');
        pista.append(marca);
        document.body.style.cursor = CK.cur('grabbing');
      }
      if (modo === 'mover') {
        const pr = pista.getBoundingClientRect(),
          x = ev.clientX - pr.left + pista.scrollLeft,
          celdas = [...pista.querySelectorAll('.tl-cuadro')];
        let at = celdas.findIndex(c => x < c.offsetLeft + c.offsetWidth / 2);
        if (at < 0) at = celdas.length;
        destino = at;
        const ref = celdas[at] || celdas[celdas.length - 1];
        marca.style.left = (at < celdas.length ? ref.offsetLeft - 3 : ref.offsetLeft + ref.offsetWidth + 1) + 'px';
      }
    };
    const up = () => {
      cel.removeEventListener('pointermove', mv);
      cel.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      if (marca) marca.remove();
      if (modo === 'durar') {
        if (Math.abs(nuevoMs - dur0) > 0.5) {
          An.st.selC = new Set([i]);
          An.ops.duracion(nuevoMs);
        } else An.pintarLinea();
        return;
      }
      if (modo === 'mover') {
        if (destino !== null) An.ops.mover(destino);
        return;
      }
      An.st.selC = new Set([i]);
      An.st.ancla = i;
      An.pintarPista();
      An.irA([...Array(CK.asset.nCuadros(a)).keys()].indexOf(i));
    };
    cel.addEventListener('pointermove', mv);
    cel.addEventListener('pointerup', up);
  };

  An.pintarCentro = () => {
    An.st._v = (An.st._v || 0) + 1;
    if (!An.lineaEl) return;
    An.cacheKey = '';
    An.pintarLinea();
    if (An.vista) {
      An.vista.pedir();
      An.encuadreLuego();
    }
  };
})();
