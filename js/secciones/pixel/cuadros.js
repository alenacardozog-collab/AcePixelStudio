/* PIXEL · acciones sobre la imagen, tamaño del lienzo, Aseprite y tira de cuadros. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});
  const h = CK.h;

  // ---------------------------------------------------------------- acciones sobre la imagen
  Px.enCapa = (nombre, fn, todo) => {
    Px.soltarFlot();
    const fin = Px.cambioCapa(nombre),
      k = Px.capa(),
      cx = CK.ctx(k.c),
      r = todo ? { x: 0, y: 0, w: k.c.width, h: k.c.height } : Px.FR(),
      d = cx.getImageData(r.x, r.y, r.w, r.h),
      res = fn({ w: r.w, h: r.h, d: d.data });
    if (res.w !== r.w || res.h !== r.h) {
      const ajust = PIX.make(r.w, r.h);
      PIX.blit(ajust, res, Math.round((r.w - res.w) / 2), r.h - res.h, false);
      cx.putImageData(new ImageData(new Uint8ClampedArray(ajust.d), r.w, r.h), r.x, r.y);
    } else cx.putImageData(new ImageData(new Uint8ClampedArray(res.d), r.w, r.h), r.x, r.y);
    fin();
    Px.pedir();
  };
  Px.tamanoLienzo = async () => {
    const a = Px.A(),
      f = Px.FR(),
      d = { w: f.w, h: f.h, ancla: 'abajo', escalar: false };
    const ok = await CK.ventana({
      titulo: a.cuadros ? 'Tamaño de cada cuadro' : 'Tamaño del lienzo',
      cuerpo: h(
        'div',
        CK.campo(
          'Ancho',
          CK.num(d.w, { min: 1, max: 1024 }, v => {
            d.w = v;
          })
        ),
        CK.campo(
          'Alto',
          CK.num(d.h, { min: 1, max: 1024 }, v => {
            d.h = v;
          })
        ),
        CK.campo(
          'El dibujo queda',
          CK.sel(
            d.ancla,
            [
              ['abajo', 'Abajo al centro (pies)'],
              ['centro', 'Al centro'],
              ['arriba-izq', 'Arriba a la izquierda']
            ],
            v => {
              d.ancla = v;
            }
          )
        ),
        CK.chk(
          false,
          'Agrandar o achicar el dibujo también (sin emborronar)',
          v => {
            d.escalar = v;
          },
          'Apagado: solo cambia el espacio alrededor. Encendido: estira los píxeles al nuevo tamaño.'
        )
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Aplicar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    Px.estructura('Tamaño del lienzo', () => {
      const n = CK.asset.nCuadros(a);
      Px.doc.capas.forEach(k => {
        const src = CK.aPix(k.c),
          frs = [];
        for (let i = 0; i < n; i++) {
          const g = CK.asset.cuadro(a, i);
          let im = PIX.crop(src, g.x, g.y, g.w, g.h);
          if (d.escalar) im = PIX.resizeNearest(im, d.w, d.h);
          else {
            const o = PIX.make(d.w, d.h),
              dx = d.ancla === 'arriba-izq' ? 0 : Math.round((d.w - g.w) / 2),
              dy = d.ancla === 'abajo' ? d.h - g.h : d.ancla === 'centro' ? Math.round((d.h - g.h) / 2) : 0;
            PIX.blit(o, im, dx, dy, false);
            im = o;
          }
          frs.push(im);
        }
        k.c = CK.aLienzo(PIX.pack(frs, n));
      });
      if (a.cuadros) {
        a.cuadros.fw = d.w;
        a.cuadros.fh = d.h;
      }
      Px.sel = null;
    });
    const g = Px.FR();
    Px.vista.encuadrar(g.w, g.h, 40);
  };
  Px.editarAfuera = async () => {
    const dir = CK.fs.dir('editor'),
      a = Px.A();
    if (!dir) {
      CK.aviso('Conectá la carpeta del editor para poder abrir el archivo en Aseprite.', 'info', 5000);
      return;
    }
    Px.soltarFlot();
    await CK.guardar({ silencio: true });
    const ruta = CK.rutaProyecto() + '/assets/' + a.id + '.png';
    let ult = (await CK.fs.leer(dir, ruta)).lastModified;
    clearInterval(Px.vigia);
    Px.vigia = setInterval(async () => {
      try {
        if (Px.S.id !== a.id) {
          clearInterval(Px.vigia);
          return;
        }
        const fi = await CK.fs.leer(dir, ruta);
        if (fi.lastModified > ult + 50) {
          ult = fi.lastModified;
          const c = await CK.cargarImagen(fi);
          Px.estructura('Cambios de Aseprite', () => {
            Px.doc.capas = [{ id: 'c1', nombre: 'Capa 1', visible: true, opacidad: 1, asset: null, c }];
            Px.doc.activa = 0;
          });
          ult = Date.now() + 2500;
          CK.aviso('Actualizado desde el archivo: ' + a.nombre);
        }
      } catch (e) {}
    }, 1500);
    CK.ventana({
      titulo: 'Editar en Aseprite',
      ancho: 520,
      cuerpo: h(
        'div',
        h(
          'p',
          'Abrí este archivo con Aseprite (o Pyxel Edit). Cada vez que guardes ahí, se actualiza solo acá mientras tengas este asset abierto.'
        ),
        h('input.in', { readonly: true, value: 'D:\\Editor\\' + ruta.replace(/\//g, '\\'), onclick: e => e.target.select() }),
        h('p.nota-txt', 'Guardá como PNG sobre el mismo archivo. Si el asset tiene varias capas acá, al volver queda en una sola.')
      )
    });
  };

  // ---------------------------------------------------------------- cuadros de animación
  const frames = () => {
    const a = Px.A(),
      n = CK.asset.nCuadros(a);
    return Px.doc.capas.map(k => {
      const src = CK.aPix(k.c),
        l = [];
      for (let i = 0; i < n; i++) {
        const g = CK.asset.cuadro(a, i);
        l.push(PIX.crop(src, g.x, g.y, g.w, g.h));
      }
      return l;
    });
  };
  const ponerFrames = porCapa => {
    Px.doc.capas.forEach((k, i) => {
      k.c = CK.aLienzo(PIX.pack(porCapa[i], porCapa[i].length));
    });
  };
  const opCuadros = (nombre, fn) => {
    Px.soltarFlot();
    const a = Px.A();
    if (!a.cuadros) return;
    Px.estructura(nombre, () => {
      const fs = frames();
      fn(fs);
      ponerFrames(fs);
      Px.doc.cuadro = CK.clamp(Px.doc.cuadro, 0, fs[0].length - 1);
      Px.sel = null;
    });
  };
  /** Lleva el dibujo de una capa a un cuadro y lo deja centrado ahí. nuevo = crea el cuadro al final. copiar = deja también el original. */
  Px.arrCapa = null;
  const capaACuadro = (ci, fi, copiar, nuevo) => {
    Px.soltarFlot();
    const a = Px.A(),
      k0 = Px.doc.capas[ci];
    if (!a || !k0) return;
    let aviso = null;
    const hay = im => {
      for (let i = 3; i < im.d.length; i += 4) if (im.d[i] > 0) return true;
      return false;
    };
    Px.estructura('Capa al cuadro', () => {
      if (!a.cuadros) {
        a.cuadros = { fw: a.w, fh: a.h, fps: 8, bucle: true };
        if (a.tipo === 'sprite') a.tipo = 'hoja';
      }
      const fs = frames(),
        l = fs[ci],
        W = l[0].w,
        H = l[0].h;
      if (nuevo) {
        fs.forEach(q => q.push(PIX.make(W, H)));
        fi = l.length - 1;
      }
      let si = hay(l[Px.doc.cuadro]) ? Px.doc.cuadro : l.findIndex((im, i) => i !== fi && hay(im));
      if (si < 0) si = hay(l[fi]) ? fi : -1;
      if (si < 0) {
        aviso = 'La capa "' + k0.nombre + '" está vacía: no hay nada para llevar.';
        if (nuevo) fs.forEach(q => q.pop());
        ponerFrames(fs);
        return;
      }
      const src = l[si];
      let x0 = W,
        y0 = H,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (src.d[(y * W + x) * 4 + 3] > 0) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      const bw = x1 - x0 + 1,
        bh = y1 - y0 + 1,
        parte = PIX.crop(src, x0, y0, bw, bh),
        dx = Math.floor((W - bw) / 2),
        dy = Math.floor((H - bh) / 2);
      if (si === fi || !copiar) l[si] = PIX.make(W, H);
      const dst = si === fi ? l[fi] : PIX.clone(l[fi]);
      for (let y = 0; y < bh; y++)
        for (let x = 0; x < bw; x++) {
          const i = (y * bw + x) * 4;
          if (!parte.d[i + 3]) continue;
          const o = ((dy + y) * W + dx + x) * 4;
          for (let q = 0; q < 4; q++) dst.d[o + q] = parte.d[i + q];
        }
      l[fi] = dst;
      ponerFrames(fs);
      Px.doc.cuadro = fi;
      Px.doc.activa = ci;
      Px.sel = null;
    });
    if (aviso) CK.aviso(aviso, 'info', 4000);
    else CK.estado('"' + k0.nombre + '" quedó centrada en el cuadro ' + (Px.doc.cuadro + 1) + '. Ctrl + Z la devuelve.');
    const g = Px.FR();
    if (nuevo && Px.vista) Px.vista.encuadrar(g.w, g.h, 40);
  };
  /** Hace que un elemento de la tira acepte capas arrastradas. */
  const recibeCapa = (elx, soltar) => {
    elx.addEventListener('dragover', e => {
      if (Px.arrCapa === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
      elx.classList.add('soltar');
    });
    elx.addEventListener('dragleave', () => elx.classList.remove('soltar'));
    elx.addEventListener('drop', e => {
      e.preventDefault();
      elx.classList.remove('soltar');
      if (Px.arrCapa === null) return;
      const ci = Px.arrCapa;
      Px.arrCapa = null;
      soltar(ci, e.ctrlKey);
    });
  };
  const cajaNueva = () => {
    const d = h('div.cuadro.nuevo', { html: CK.ico('mas', 18) }, h('span', 'cuadro nuevo'));
    CK.tip(d, 'Soltar acá: cuadro nuevo', 'Arrastrá una capa hasta acá y se crea un cuadro al final con esa capa centrada.');
    recibeCapa(d, (ci, copiar) => capaACuadro(ci, 0, copiar, true));
    return d;
  };
  Px.pintarCuadros = () => {
    if (!Px.cuadrosEl) return;
    CK.vaciar(Px.cuadrosEl);
    const a = Px.A();
    if (!a) return;
    if (!a.cuadros) {
      Px.cuadrosEl.append(
        h('span.ayuda-txt', { style: { alignSelf: 'center' } }, 'Imagen fija.'),
        CK.btn({
          ico: 'anim',
          txt: 'Convertir en animación',
          cls: 'chico',
          desc: 'Divide la imagen en cuadros (o le agrega un segundo cuadro) para animarla cuadro a cuadro.',
          on: async () => {
            const d = { fw: a.w, fh: a.h };
            const ok = await CK.ventana({
              titulo: 'Convertir en animación',
              cuerpo: h(
                'div',
                h(
                  'p',
                  'Si la imagen ya es una tira de poses, poné el tamaño de cada cuadro. Si es un solo dibujo, dejalo así: se crea como primer cuadro.'
                ),
                CK.campo(
                  'Ancho del cuadro',
                  CK.num(d.fw, { min: 1, max: a.w }, v => {
                    d.fw = v;
                  })
                ),
                CK.campo(
                  'Alto del cuadro',
                  CK.num(d.fh, { min: 1, max: a.h }, v => {
                    d.fh = v;
                  })
                )
              ),
              botones: [
                { txt: 'Cancelar', valor: false },
                { txt: 'Convertir', cls: 'pri', valor: true }
              ]
            });
            if (!ok) return;
            Px.estructura('Convertir en animación', () => {
              a.cuadros = { fw: d.fw, fh: d.fh, fps: 8, bucle: true };
              if (a.tipo === 'sprite') a.tipo = 'hoja';
            });
            const g = Px.FR();
            Px.vista.encuadrar(g.w, g.h, 40);
          }
        }),
        cajaNueva()
      );
      return;
    }
    const n = CK.asset.nCuadros(a),
      alto = 56;
    for (let i = 0; i < n; i++) {
      const g = CK.asset.cuadro(a, i),
        mini = CK.mini(CK.img[a.id], alto, g);
      const caja = h(
        'div.cuadro' + (i === Px.doc.cuadro ? '.activo' : ''),
        {
          onclick: () => Px.irCuadro(i),
          oncontextmenu: e => {
            Px.irCuadro(i);
            CK.menu(e, [
              { titulo: 'Cuadro ' + (i + 1) },
              {
                txt: 'Duplicar',
                ico: 'duplicar',
                on: () =>
                  opCuadros('Duplicar cuadro', fs => {
                    fs.forEach(l => l.splice(i + 1, 0, PIX.clone(l[i])));
                    Px.doc.cuadro = i + 1;
                  })
              },
              {
                txt: 'Cuadro vacío después',
                ico: 'mas',
                on: () =>
                  opCuadros('Cuadro nuevo', fs => {
                    fs.forEach(l => l.splice(i + 1, 0, PIX.make(l[0].w, l[0].h)));
                    Px.doc.cuadro = i + 1;
                  })
              },
              {
                txt: 'Mover antes',
                ico: 'anterior',
                off: i === 0,
                on: () =>
                  opCuadros('Ordenar cuadros', fs => {
                    fs.forEach(l => {
                      const t = l[i];
                      l[i] = l[i - 1];
                      l[i - 1] = t;
                    });
                    Px.doc.cuadro = i - 1;
                  })
              },
              {
                txt: 'Mover después',
                ico: 'siguiente',
                off: i === n - 1,
                on: () =>
                  opCuadros('Ordenar cuadros', fs => {
                    fs.forEach(l => {
                      const t = l[i];
                      l[i] = l[i + 1];
                      l[i + 1] = t;
                    });
                    Px.doc.cuadro = i + 1;
                  })
              },
              { txt: 'Ver en la línea de tiempo', ico: 'anim', on: () => CK.ir('anim', { asset: a.id }) },
              '-',
              {
                txt: 'Borrar cuadro',
                ico: 'basura',
                peligro: true,
                off: n < 2,
                on: () => opCuadros('Borrar cuadro', fs => fs.forEach(l => l.splice(i, 1)))
              }
            ]);
          }
        },
        h('span.nro', String(i + 1)),
        mini
      );
      recibeCapa(caja, (ci, copiar) => capaACuadro(ci, i, copiar, false));
      Px.cuadrosEl.append(caja);
    }
    Px.cuadrosEl.append(cajaNueva());
    Px.cuadrosEl.append(
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' } },
        h(
          'div.fila.junto',
          CK.btn({
            ico: 'mas',
            tip: 'Cuadro nuevo',
            desc: 'Agrega un cuadro vacío después del actual.',
            cls: 'chico',
            on: () =>
              opCuadros('Cuadro nuevo', fs => {
                fs.forEach(l => l.splice(Px.doc.cuadro + 1, 0, PIX.make(l[0].w, l[0].h)));
                Px.doc.cuadro++;
              })
          }),
          CK.btn({
            ico: 'duplicar',
            tip: 'Duplicar cuadro',
            desc: 'Copia el cuadro actual: la forma más rápida de hacer la pose siguiente.',
            cls: 'chico',
            on: () =>
              opCuadros('Duplicar cuadro', fs => {
                fs.forEach(l => l.splice(Px.doc.cuadro + 1, 0, PIX.clone(l[Px.doc.cuadro])));
                Px.doc.cuadro++;
              })
          }),
          CK.btn({
            ico: 'basura',
            tip: 'Borrar cuadro',
            cls: 'chico peligro',
            on: () => {
              if (n < 2) return;
              opCuadros('Borrar cuadro', fs => fs.forEach(l => l.splice(Px.doc.cuadro, 1)));
            }
          }),
          CK.btn({
            ico: 'anterior',
            tip: 'Mover antes',
            desc: 'Cambia el orden: este cuadro pasa un lugar antes.',
            cls: 'chico',
            on: () => {
              if (Px.doc.cuadro > 0)
                opCuadros('Ordenar cuadros', fs => {
                  fs.forEach(l => {
                    const t = l[Px.doc.cuadro];
                    l[Px.doc.cuadro] = l[Px.doc.cuadro - 1];
                    l[Px.doc.cuadro - 1] = t;
                  });
                  Px.doc.cuadro--;
                });
            }
          }),
          CK.btn({
            ico: 'siguiente',
            tip: 'Mover después',
            cls: 'chico',
            on: () => {
              if (Px.doc.cuadro < n - 1)
                opCuadros('Ordenar cuadros', fs => {
                  fs.forEach(l => {
                    const t = l[Px.doc.cuadro];
                    l[Px.doc.cuadro] = l[Px.doc.cuadro + 1];
                    l[Px.doc.cuadro + 1] = t;
                  });
                  Px.doc.cuadro++;
                });
            }
          })
        ),
        h(
          'div.fila.junto',
          CK.btn({
            ico: 'cebolla',
            tip: 'Papel cebolla',
            desc: 'Muestra en transparencia el cuadro anterior y el siguiente, para dibujar el movimiento.',
            cls: 'chico' + (Px.S.cebolla ? ' activo' : ''),
            on: (e, b) => {
              Px.S.cebolla = !Px.S.cebolla;
              b.classList.toggle('activo', Px.S.cebolla);
              Px.pedir();
            }
          }),
          h('span.nota-txt', 'cuadros/s'),
          (() => {
            const i = CK.num(a.cuadros.fps || 8, { min: 1, max: 30 }, v => {
              a.cuadros.fps = v;
              CK.tocar();
            });
            i.style.width = '54px';
            i.style.height = '24px';
            return i;
          })(),
          CK.btn({
            ico: 'anim',
            txt: 'Más opciones',
            cls: 'chico',
            desc: 'Alinear cuadros, exportar GIF y hoja en la sección Animaciones.',
            on: () => CK.ir('anim', { asset: a.id })
          })
        )
      )
    );
    if (a.juego)
      Px.cuadrosEl.append(
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', marginLeft: '10px' } },
          CK.btn({
            ico: 'exportar',
            txt: 'Devolver al juego',
            cls: 'chico' + (CK.animJuego && CK.animJuego.modificada(a) ? ' pri' : ''),
            desc: 'Esta animación vino del juego: reemplaza la imagen en ' + a.juego.archivo + ' (con respaldo del original).',
            on: async () => {
              if (CK.animJuego && (await CK.animJuego.devolver(a.id))) Px.pintarCuadros();
            }
          })
        )
      );
  };
  Px.irCuadro = i => {
    Px.soltarFlot();
    Px.sel = null;
    Px.doc.cuadro = CK.clamp(i, 0, CK.asset.nCuadros(Px.A()) - 1);
    Px.pintarCuadros();
    Px.pedir();
  };
})();
