/* PIXEL · panel derecho (color, capas, vista) y tira de opciones. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});
  const h = CK.h;

  // ---------------------------------------------------------------- panel derecho
  Px.pintarColor = () => {
    if (Px.rueda) Px.rueda.poner(Px.S.c1);
    const cab = Px.el && Px.el.querySelector('.par-color');
    if (cab) {
      cab.querySelector('.c1').style.background = Px.S.c1;
      cab.querySelector('.c2').style.background = Px.S.c2;
    }
    const hx = Px.el && Px.el.querySelector('.hex-c1');
    if (hx && document.activeElement !== hx) hx.value = Px.S.c1;
    Px.el &&
      Px.el.querySelectorAll('.pal-proy .muestra').forEach(b => b.classList.toggle('activo', b.dataset.tip.toLowerCase() === Px.S.c1));
  };
  const crearRueda = alCambiar => {
    const T = 168,
      R = T / 2,
      c = CK.lienzo(T, T),
      r1 = R - 2,
      r0 = R - 20,
      lado = Math.floor(r0 * 1.36),
      o = Math.round(R - lado / 2);
    let H = 0,
      Sa = 0,
      V = 0,
      modo = null;
    c.style.cursor = CK.cur('crosshair');
    c.style.imageRendering = 'auto';
    const pintarR = () => {
      const x = c.getContext('2d');
      x.clearRect(0, 0, T, T);
      for (let a = 0; a < 360; a += 1) {
        x.beginPath();
        x.strokeStyle = 'hsl(' + a + ',100%,50%)';
        x.lineWidth = r1 - r0;
        x.arc(R, R, (r1 + r0) / 2, ((a - 1.2) * Math.PI) / 180, ((a + 1.2) * Math.PI) / 180);
        x.stroke();
      }
      const img = x.createImageData(lado, lado);
      for (let yy = 0; yy < lado; yy++)
        for (let xx = 0; xx < lado; xx++) {
          const rgb = PIX.hsv2rgb(H, xx / (lado - 1), 1 - yy / (lado - 1)),
            i = (yy * lado + xx) * 4;
          img.data[i] = rgb[0];
          img.data[i + 1] = rgb[1];
          img.data[i + 2] = rgb[2];
          img.data[i + 3] = 255;
        }
      x.putImageData(img, o, o);
      const ha = (H * Math.PI) / 180,
        hx = R + (Math.cos(ha) * (r1 + r0)) / 2,
        hy = R + (Math.sin(ha) * (r1 + r0)) / 2;
      x.lineWidth = 2;
      x.strokeStyle = '#fff';
      x.beginPath();
      x.arc(hx, hy, 6, 0, 7);
      x.stroke();
      x.strokeStyle = '#000';
      x.lineWidth = 1;
      x.beginPath();
      x.arc(hx, hy, 7.5, 0, 7);
      x.stroke();
      const sx = o + Sa * (lado - 1),
        sy = o + (1 - V) * (lado - 1);
      x.strokeStyle = '#fff';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(sx, sy, 5, 0, 7);
      x.stroke();
      x.strokeStyle = '#000';
      x.lineWidth = 1;
      x.beginPath();
      x.arc(sx, sy, 6.5, 0, 7);
      x.stroke();
    };
    const ev = e => {
      const r = c.getBoundingClientRect(),
        mx = ((e.clientX - r.left) * T) / r.width,
        my = ((e.clientY - r.top) * T) / r.height,
        d = Math.hypot(mx - R, my - R);
      if (!modo) modo = d > r0 - 2 ? 'h' : 'sv';
      if (modo === 'h') H = ((Math.atan2(my - R, mx - R) * 180) / Math.PI + 360) % 360;
      else {
        Sa = CK.clamp((mx - o) / (lado - 1), 0, 1);
        V = CK.clamp(1 - (my - o) / (lado - 1), 0, 1);
      }
      pintarR();
      alCambiar(PIX.rgb2hex(...PIX.hsv2rgb(H, Sa, V)));
    };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      modo = null;
      ev(e);
    });
    c.addEventListener('pointermove', e => {
      if (e.buttons) ev(e);
    });
    c.addEventListener('pointerup', () => {
      modo = null;
    });
    c.poner = hex => {
      const [hh, s, v] = PIX.rgb2hsv(...PIX.hex2rgb(hex));
      if (s > 0.001 && v > 0.001) H = hh;
      Sa = s;
      V = v;
      pintarR();
    };
    return c;
  };
  Px.pColor = c => {
    Px.rueda = crearRueda(hex => {
      Px.S.c1 = Px.S.soloPaleta ? Px.colorOk(hex) : hex;
      Px.pintarColor();
    });
    const par = h(
      'div.par-color',
      h('button.c2', {
        type: 'button',
        style: { background: Px.S.c2 },
        onclick: () => {
          [Px.S.c1, Px.S.c2] = [Px.S.c2, Px.S.c1];
          Px.pintarColor();
        }
      }),
      h('button.c1', { type: 'button', style: { background: Px.S.c1 } })
    );
    CK.tip(
      par,
      'Color principal y secundario',
      'El de adelante se usa con el clic izquierdo; el de atrás con el derecho. Clic en el de atrás para intercambiarlos.',
      'X'
    );
    const hx = CK.txt(Px.S.c1, v => {
      if (/^#?[0-9a-f]{6}$/i.test(v)) {
        Px.S.c1 = '#' + v.replace('#', '').toLowerCase();
        Px.pintarColor();
      }
    });
    hx.classList.add('hex-c1');
    hx.style.width = '86px';
    c.append(
      h(
        'div.bloque',
        h('div', { style: { display: 'grid', placeItems: 'center' } }, Px.rueda),
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          par,
          hx,
          CK.btn({
            ico: 'mas',
            tip: 'Sumar a la paleta',
            desc: 'Agrega el color principal a la paleta del proyecto.',
            cls: 'chico',
            on: () => {
              if (!CK.P.estilo.paleta.includes(Px.S.c1)) {
                CK.P.estilo.paleta.push(Px.S.c1);
                CK.tocar();
                Px.tabs.refrescar();
              }
            }
          })
        ),
        CK.chk(
          Px.S.soloPaleta,
          'Dibujar solo con la paleta',
          v => {
            Px.S.soloPaleta = v;
            if (v) {
              Px.S.c1 = Px.colorOk(Px.S.c1);
              Px.S.c2 = Px.colorOk(Px.S.c2);
              Px.pintarColor();
            }
          },
          'Cualquier color que elijas se cambia por el más cercano de la paleta del proyecto: imposible salirse del estilo.'
        )
      )
    );
    const mp = CK.muestras(() => CK.P.estilo.paleta, {
      actual: () => Px.S.c1,
      alElegir: hex => {
        Px.S.c1 = hex;
        Px.pintarColor();
      },
      alDerecho: hex => {
        Px.S.c2 = hex;
        Px.pintarColor();
      },
      pista: 'Clic: color principal. Clic derecho: secundario.'
    });
    mp.classList.add('pal-proy');
    c.append(h('div.bloque', h('h3.bloque-tit', 'Paleta del proyecto'), mp));
    const usados = PIX.colors(CK.asset.pix(Px.S.id), 400)
        .slice(0, 48)
        .map(x => x.hex),
      fuera = usados.filter(u => !CK.P.estilo.paleta.includes(u));
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Colores de esta imagen (' + usados.length + (usados.length >= 48 ? '+' : '') + ')'),
        CK.muestras(usados, {
          chicas: true,
          actual: () => Px.S.c1,
          alElegir: hex => {
            Px.S.c1 = hex;
            Px.pintarColor();
          },
          alDerecho: hex => {
            Px.S.c2 = hex;
            Px.pintarColor();
          }
        }),
        fuera.length ? h('p.nota-txt', { style: { color: 'var(--oro)' } }, fuera.length + ' no están en la paleta del proyecto.') : null
      )
    );
    Px.pintarColor();
  };
  Px.pCapas = c => {
    const idx = k => Px.doc.capas.indexOf(k);
    const l = CK.capasUI({
      items: () => Px.doc.capas,
      id: k => k.id,
      nombre: k => k.nombre,
      carpeta: k => k.carpeta || null,
      ponerCarpeta: (k, n) => {
        if (n) k.carpeta = n;
        else delete k.carpeta;
      },
      visible: k => k.visible,
      ponerVisible: (k, v) => {
        k.visible = v;
      },
      activo: () => (Px.doc.capas[Px.doc.activa] || {}).id,
      elegir: (k, callado) => {
        if (!callado) Px.soltarFlot();
        Px.doc.activa = Math.max(0, idx(k));
        if (!callado) Px.tabs.refrescar();
      },
      cambio: (nombre, fn) => {
        Px.soltarFlot();
        Px.estructura(nombre, fn);
      },
      plegadas: (Px.capasPlegadas = Px.capasPlegadas || new Set()),
      doble: async k => {
        const n = await CK.pedir('Nombre de la capa', 'Nombre', k.nombre);
        if (n) {
          k.nombre = n;
          Px.guardarMeta();
          CK.tocar();
          Px.tabs.refrescar();
        }
      },
      menu: (k, e, extra) => menuCapa(e, idx(k), extra),
      alArrastrar: k => {
        Px.arrCapa = idx(k);
        if (Px.cuadrosEl) Px.cuadrosEl.classList.add('esperando');
        CK.estado(
          'Soltá la capa en otra fila para ordenarla, en una carpeta para meterla, o sobre un cuadro de la tira de abajo para centrarla ahí (Ctrl: copia).'
        );
      },
      alTerminar: () => {
        Px.arrCapa = null;
        if (Px.cuadrosEl) {
          Px.cuadrosEl.classList.remove('esperando');
          Px.cuadrosEl.querySelectorAll('.soltar').forEach(x => x.classList.remove('soltar'));
        }
      },
      fila: k => [
        CK.btn({
          ico: k.visible ? 'ojo' : 'ojoNo',
          tip: k.visible ? 'Ocultar' : 'Mostrar',
          cls: k.visible ? 'encendido' : '',
          on: e => {
            e.stopPropagation();
            k.visible = !k.visible;
            Px.componer();
            Px.pedir();
            Px.tabs.refrescar();
          }
        }),
        CK.mini(k.c, 24, Px.FR()),
        h('span.nombre', k.nombre),
        h('span.sub', Math.round(k.opacidad * 100) + '%')
      ]
    });
    const k = Px.capa();
    c.append(
      h(
        'div.bloque',
        h('h3.bloque-tit', 'Capas (arriba = adelante)'),
        l,
        h(
          'p.nota-txt',
          { style: { margin: '6px 0 0' } },
          'Arrastrá una capa para ordenarla o meterla en una carpeta (clic derecho → carpeta nueva). Soltada sobre un cuadro de la tira de abajo, queda centrada en ese cuadro.'
        ),
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          CK.btn({
            ico: 'mas',
            tip: 'Capa nueva',
            desc: 'Agrega una capa transparente encima. Sirve para probar un detalle sin tocar lo de abajo.',
            cls: 'chico',
            on: () =>
              Px.estructura('Capa nueva', () => {
                const n = {
                  id: 'c' + Date.now().toString(36),
                  nombre: 'Capa ' + (Px.doc.capas.length + 1),
                  visible: true,
                  opacidad: 1,
                  asset: null,
                  c: CK.lienzo(k.c.width, k.c.height)
                };
                Px.doc.capas.splice(Px.doc.activa + 1, 0, n);
                Px.doc.activa++;
              })
          }),
          CK.btn({
            ico: 'recortar',
            tip: 'Separar selección en capa nueva',
            desc: 'Corta lo que marcaste con Selección, Lazo o Varita y lo deja en una capa nueva.',
            tecla: 'Ctrl + Mayús + J',
            cls: 'chico',
            on: () => Px.selACapa(false)
          }),
          CK.btn({
            ico: 'assets',
            tip: 'Guardar capa como asset',
            desc: 'Guarda la capa activa como un asset aparte, recortado justo.',
            cls: 'chico',
            on: () => Px.aAssetNuevo(true)
          }),
          CK.btn({
            ico: 'duplicar',
            tip: 'Duplicar capa',
            cls: 'chico',
            on: () =>
              Px.estructura('Duplicar capa', () => {
                Px.doc.capas.splice(Px.doc.activa + 1, 0, {
                  id: 'c' + Date.now().toString(36),
                  nombre: k.nombre + ' copia',
                  visible: true,
                  opacidad: k.opacidad,
                  asset: null,
                  c: CK.copiaLienzo(k.c)
                });
                Px.doc.activa++;
              })
          }),
          CK.btn({
            ico: 'subir',
            tip: 'Subir capa',
            cls: 'chico',
            on: () => {
              if (Px.doc.activa < Px.doc.capas.length - 1)
                Px.estructura('Ordenar capas', () => {
                  const i = Px.doc.activa;
                  [Px.doc.capas[i], Px.doc.capas[i + 1]] = [Px.doc.capas[i + 1], Px.doc.capas[i]];
                  Px.doc.activa++;
                });
            }
          }),
          CK.btn({
            ico: 'bajar',
            tip: 'Bajar capa',
            cls: 'chico',
            on: () => {
              if (Px.doc.activa > 0)
                Px.estructura('Ordenar capas', () => {
                  const i = Px.doc.activa;
                  [Px.doc.capas[i], Px.doc.capas[i - 1]] = [Px.doc.capas[i - 1], Px.doc.capas[i]];
                  Px.doc.activa--;
                });
            }
          }),
          CK.btn({
            ico: 'capas',
            tip: 'Unir con la de abajo',
            desc: 'Funde la capa activa con la que tiene debajo.',
            cls: 'chico',
            on: () => {
              if (Px.doc.activa > 0)
                Px.estructura('Unir capas', () => {
                  const ab = Px.doc.capas[Px.doc.activa - 1],
                    x = CK.ctx(ab.c);
                  x.globalAlpha = k.opacidad;
                  x.drawImage(k.c, 0, 0);
                  x.globalAlpha = 1;
                  Px.doc.capas.splice(Px.doc.activa, 1);
                  Px.doc.activa--;
                });
            }
          }),
          CK.btn({
            ico: 'basura',
            tip: 'Borrar capa',
            cls: 'chico peligro',
            on: () => {
              if (Px.doc.capas.length > 1)
                Px.estructura('Borrar capa', () => {
                  Px.doc.capas.splice(Px.doc.activa, 1);
                  Px.doc.activa = Math.max(0, Px.doc.activa - 1);
                });
              else CK.aviso('Tiene que quedar al menos una capa.', 'info');
            }
          })
        ),
        CK.campo(
          'Opacidad',
          CK.rango(Math.round(k.opacidad * 100), { min: 0, max: 100 }, (v, f) => {
            k.opacidad = v / 100;
            Px.pedir();
            if (f) {
              Px.componer();
              Px.tabs.refrescar();
            }
          })
        )
      )
    );
  };
  const menuCapa = (e, i, extra) => {
    const k = Px.doc.capas[i];
    CK.menu(e, [
      { titulo: k.nombre },
      {
        txt: 'Renombrar…',
        ico: 'texto',
        on: async () => {
          const n = await CK.pedir('Nombre de la capa', 'Nombre', k.nombre);
          if (n) {
            k.nombre = n;
            Px.guardarMeta();
            CK.tocar();
            Px.tabs.refrescar();
          }
        }
      },
      {
        txt: k.visible ? 'Ocultar' : 'Mostrar',
        ico: k.visible ? 'ojoNo' : 'ojo',
        on: () => {
          k.visible = !k.visible;
          Px.componer();
          Px.pedir();
          Px.tabs.refrescar();
        }
      },
      {
        txt: 'Duplicar',
        ico: 'duplicar',
        on: () =>
          Px.estructura('Duplicar capa', () => {
            Px.doc.capas.splice(i + 1, 0, {
              id: 'c' + Date.now().toString(36),
              nombre: k.nombre + ' copia',
              visible: true,
              opacidad: k.opacidad,
              asset: null,
              c: CK.copiaLienzo(k.c)
            });
            Px.doc.activa = i + 1;
          })
      },
      {
        txt: 'Subir',
        ico: 'subir',
        off: i >= Px.doc.capas.length - 1,
        on: () =>
          Px.estructura('Ordenar capas', () => {
            [Px.doc.capas[i], Px.doc.capas[i + 1]] = [Px.doc.capas[i + 1], Px.doc.capas[i]];
            Px.doc.activa = i + 1;
          })
      },
      {
        txt: 'Bajar',
        ico: 'bajar',
        off: i === 0,
        on: () =>
          Px.estructura('Ordenar capas', () => {
            [Px.doc.capas[i], Px.doc.capas[i - 1]] = [Px.doc.capas[i - 1], Px.doc.capas[i]];
            Px.doc.activa = i - 1;
          })
      },
      {
        txt: 'Unir con la de abajo',
        ico: 'capas',
        off: i === 0,
        on: () =>
          Px.estructura('Unir capas', () => {
            const ab = Px.doc.capas[i - 1],
              x = CK.ctx(ab.c);
            x.globalAlpha = k.opacidad;
            x.drawImage(k.c, 0, 0);
            x.globalAlpha = 1;
            Px.doc.capas.splice(i, 1);
            Px.doc.activa = i - 1;
          })
      },
      {
        txt: 'Transformar la capa',
        ico: 'escalar',
        on: () => {
          Px.sel = null;
          Px.ponerHerr('transformar');
        }
      },
      { txt: 'Guardar como asset', ico: 'assets', on: () => Px.aAssetNuevo(true) },
      ...(extra || []),
      '-',
      {
        txt: 'Borrar capa',
        ico: 'basura',
        peligro: true,
        off: Px.doc.capas.length < 2,
        on: () =>
          Px.estructura('Borrar capa', () => {
            Px.doc.capas.splice(i, 1);
            Px.doc.activa = Math.max(0, i - 1);
          })
      }
    ]);
  };
  Px.pVista = c => {
    const a = Px.A(),
      caja = h('div', { style: { display: 'grid', placeItems: 'center', gap: '8px' } });
    let esc = 2;
    const fija = CK.lienzo(1, 1);
    fija.style.imageRendering = 'pixelated';
    Px.previa = () => {
      if (!fija.isConnected) return;
      const f = Px.FR();
      fija.width = f.w * esc;
      fija.height = f.h * esc;
      const x = CK.ctx(fija);
      CK.cuadros(x, fija.width, fija.height, 8);
      x.drawImage(CK.img[Px.S.id], f.x, f.y, f.w, f.h, 0, 0, fija.width, fija.height);
    };
    caja.append(fija);
    if (a.cuadros) {
      const rep = CK.reproductor(
        () => {
          const n = CK.asset.nCuadros(a),
            l = [];
          for (let i = 0; i < n; i++) {
            const g = CK.asset.cuadro(a, i),
              cc = CK.lienzo(g.w, g.h);
            CK.ctx(cc).drawImage(CK.img[Px.S.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
            l.push(cc);
          }
          return l;
        },
        () => a.cuadros.fps || 8,
        { tam: 180 }
      );
      caja.append(h('span.nota-txt', 'Animación en loop'), rep);
    }
    c.append(
      h(
        'div.bloque',
        h(
          'h3.bloque-tit',
          'Tamaño real',
          CK.sel(
            '2',
            [
              ['1', '×1'],
              ['2', '×2'],
              ['3', '×3'],
              ['4', '×4']
            ],
            v => {
              esc = +v;
              Px.previa();
            }
          )
        ),
        caja
      )
    );
    setTimeout(Px.previa, 0);
  };

  // ---------------------------------------------------------------- tira de opciones
  const inter = (ico, tip, desc, get, set, tecla) => {
    const b = CK.btn({
      ico,
      tip,
      desc,
      tecla,
      cls: 'chico plano' + (get() ? ' activo' : ''),
      on: () => {
        set(!get());
        b.classList.toggle('activo', get());
        Px.pedir();
      }
    });
    return b;
  };
  Px.pintarTira = () => {
    if (!Px.tira) return;
    CK.vaciar(Px.tira);
    const a = Px.A();
    Px.tira.append(
      h(
        'div.tira',
        CK.btn({
          ico: 'imagen',
          txt: a ? a.nombre : 'Elegir asset',
          cls: 'chico',
          desc: 'El asset que estás editando. Clic para abrir otro.',
          on: async () => {
            const id = await CK.elegirAsset('Abrir en el editor de píxeles');
            if (id) Px.abrir(id);
          }
        }),
        CK.btn({ ico: 'mas', tip: 'Dibujo nuevo', desc: 'Crea un asset vacío para dibujar desde cero.', cls: 'chico plano', on: nuevo })
      )
    );
    if (!a) return;
    const tam = CK.rango(Px.S.tam, { min: 1, max: 24 }, v => {
      Px.S.tam = v;
      Px.pedir();
    });
    tam.style.width = '110px';
    const tt = h('div.tira', h('span.txt', 'Punta'), tam);
    CK.tip(tt, 'Tamaño de la punta', 'Grosor del lápiz, el borrador y las formas, en píxeles.', '[ y ]');
    tt.append(
      inter(
        'elipse',
        'Punta redonda',
        'Encendido: la punta es un círculo (bordes más naturales en follaje, humo, piedras). Apagado: es un cuadrado. Se nota desde el tamaño 3.',
        () => Px.S.redonda,
        v => {
          Px.S.redonda = v;
        }
      )
    );
    Px.tira.append(
      tt,
      h(
        'div.tira',
        inter(
          'centrar',
          'Píxel perfecto',
          'Al dibujar a mano alzada quita los píxeles dobles de las esquinas: las líneas quedan limpias, de 1 píxel.',
          () => Px.S.perfecto,
          v => {
            Px.S.perfecto = v;
          }
        ),
        inter(
          'rectLleno',
          'Relleno',
          'Rectángulos y elipses salen llenos en vez de solo el borde.',
          () => Px.S.relleno,
          v => {
            Px.S.relleno = v;
          }
        ),
        inter(
          'enlace',
          'Contiguo',
          'Encendido: el balde y la varita toman solo la zona conectada. Apagado: toman ese color en todo el cuadro.',
          () => Px.S.contiguo,
          v => {
            Px.S.contiguo = v;
          }
        ),
        h('span.sep'),
        inter(
          'espejo',
          'Espejo horizontal',
          'Lo que dibujás de un lado se repite del otro. Ideal para personajes y objetos vistos de frente.',
          () => Px.S.espH,
          v => {
            Px.S.espH = v;
          }
        ),
        inter(
          'voltearV',
          'Espejo vertical',
          'Repite el dibujo arriba y abajo.',
          () => Px.S.espV,
          v => {
            Px.S.espV = v;
          }
        ),
        inter(
          'grilla',
          'Grilla',
          'Muestra la cuadrícula de píxeles (con zoom alto) y la de tiles.',
          () => Px.S.grilla,
          v => {
            Px.S.grilla = v;
          }
        )
      )
    );
    if (Px.sel || Px.flot)
      Px.tira.append(
        h(
          'div.tira',
          h('span.txt', 'Selección'),
          CK.btn({ ico: 'voltearH', tip: 'Voltear selección', cls: 'chico plano', on: () => Px.transformarSel('Voltear', PIX.flipH) }),
          CK.btn({ ico: 'voltearV', tip: 'Voltear vertical', cls: 'chico plano', on: () => Px.transformarSel('Voltear', PIX.flipV) }),
          CK.btn({
            ico: 'rotar',
            tip: 'Rotar 90°',
            desc: 'Gira la selección un cuarto de vuelta sin deformar píxeles.',
            cls: 'chico plano',
            on: () =>
              Px.tr
                ? Px.trRapido(t => {
                    t.ang += Math.PI / 2;
                  })
                : Px.transformarSel('Rotar', PIX.rot90)
          }),
          CK.btn({
            ico: 'escalar',
            txt: Px.tr ? 'Aplicar' : 'Transformar',
            cls: 'chico' + (Px.tr ? ' pri' : ''),
            tecla: 'T',
            desc: 'Rotar a cualquier ángulo, escalar y estirar con manijas (o con números desde el clic derecho).',
            on: () => {
              if (Px.tr) Px.terminarTr();
              else Px.ponerHerr('transformar');
            }
          }),
          Px.tr ? CK.btn({ ico: 'ajustes', tip: 'Transformar con números', cls: 'chico plano', on: Px.trNumeros }) : null,
          Px.tr ? CK.btn({ ico: 'cerrar', tip: 'Cancelar transformación', tecla: 'Esc', cls: 'chico plano', on: Px.cancelarTr }) : null,
          CK.btn({
            ico: 'capas',
            txt: 'A capa nueva',
            desc: 'Corta lo seleccionado y lo pone en una capa nueva, en el mismo lugar. Sirve para separar las partes de un dibujo (una rama, un brazo, un objeto de una lámina) y trabajarlas por separado.',
            tecla: 'Ctrl + Mayús + J',
            cls: 'chico',
            on: () => Px.selACapa(false)
          }),
          CK.btn({
            ico: 'assets',
            txt: 'A asset nuevo',
            desc: 'Guarda lo seleccionado como un asset aparte, recortado justo. Así se separan varios objetos que vinieron juntos en una misma imagen.',
            cls: 'chico',
            on: () => Px.aAssetNuevo(false)
          }),
          CK.btn({ ico: 'duplicar', tip: 'Copiar', tecla: 'Ctrl + C', cls: 'chico plano', on: () => Px.copiar() }),
          CK.btn({ ico: 'basura', tip: 'Borrar lo seleccionado', tecla: 'Supr', cls: 'chico plano', on: Px.borrarSel }),
          CK.btn({
            ico: 'cerrar',
            tip: 'Soltar la selección',
            tecla: 'Esc',
            cls: 'chico plano',
            on: () => {
              Px.soltarFlot();
              Px.sel = null;
              Px.pintarTira();
              Px.pedir();
            }
          })
        )
      );
    const pal = () => CK.P.estilo.paleta;
    Px.tira.append(
      h(
        'div.tira',
        CK.btn({
          ico: 'paleta',
          tip: 'Llevar a la paleta',
          desc: 'Cambia cada color de la capa por el más cercano de la paleta del proyecto.',
          cls: 'chico plano',
          on: () => Px.enCapa('Llevar a la paleta', im => PIX.quantize(im, pal()), true)
        }),
        CK.btn({
          ico: 'limpiar',
          tip: 'Limpiar',
          desc: 'Quita píxeles sueltos y deja los bordes duros (sin semitransparencias).',
          cls: 'chico plano',
          on: () => Px.enCapa('Limpiar', im => PIX.cleanup(PIX.hardenAlpha(im, 110)))
        }),
        CK.btn({
          ico: 'contorno',
          tip: 'Agregar contorno',
          desc:
            'Rodea la figura con 1 píxel de contorno según la guía de estilo (' +
            CK.P.estilo.contorno +
            '). Necesita 1 píxel libre alrededor.',
          cls: 'chico plano',
          on: () =>
            Px.enCapa('Contorno', im => {
              const e = CK.P.estilo;
              const r =
                e.contorno === 'color' && pal().length
                  ? PIX.outlineSelf(PIX.crop(im, 1, 1, im.w - 2, im.h - 2), pal(), -2)
                  : PIX.outline(im, e.contorno === 'ninguno' ? Px.S.c1 : e.colorContorno, { agrandar: false });
              return r;
            })
        }),
        CK.btn({
          ico: 'recortar',
          tip: 'Quitar contorno',
          desc: 'Saca 1 píxel de todo el borde de la figura.',
          cls: 'chico plano',
          on: () => Px.enCapa('Quitar contorno', PIX.removeOutline)
        }),
        h('span.sep'),
        CK.btn({
          ico: 'voltearH',
          tip: 'Voltear todo',
          desc: 'Espeja el cuadro completo.',
          cls: 'chico plano',
          on: () => Px.enCapa('Voltear', PIX.flipH)
        }),
        CK.btn({
          ico: 'tamano',
          tip: 'Tamaño del lienzo',
          desc: 'Cambia el ancho y alto del dibujo (o de cada cuadro).',
          cls: 'chico plano',
          on: Px.tamanoLienzo
        }),
        CK.btn({
          ico: 'exportar',
          tip: 'Editar en Aseprite',
          desc: 'Muestra el archivo PNG de este asset para abrirlo en Aseprite. Al guardar allá, se actualiza solo acá.',
          cls: 'chico plano',
          on: Px.editarAfuera
        }),
        CK.btn({
          ico: 'importar',
          tip: 'Descargar PNG',
          desc: 'Baja la imagen, a tamaño real o ampliada.',
          cls: 'chico plano',
          on: async () => {
            const e = await CK.ventana({
              titulo: 'Descargar',
              cuerpo: h('p', 'Elegí la escala. Las ampliadas no se emborronan: sirven para mostrar en un portfolio.'),
              botones: [1, 2, 4, 8].map(n => ({ txt: '×' + n, valor: n, cls: n === 1 ? 'pri' : '' }))
            });
            if (!e) return;
            const im = PIX.resizeNearest(CK.asset.pix(Px.S.id), a.w * e, a.h * e);
            CK.descargar(await CK.aBlob(CK.aLienzo(im)), a.id + (e > 1 ? '_x' + e : '') + '.png');
          }
        })
      )
    );
  };
  const nuevo = async () => {
    const T = CK.P.estilo.tile,
      d = { nombre: 'dibujo', w: T * 2, h: T * 2, tipo: 'sprite' };
    const rap = (txt, w, hh) =>
        CK.btn({
          txt,
          cls: 'chico',
          on: () => {
            d.w = w;
            d.h = hh;
            iw.value = w;
            ih.value = hh;
          }
        }),
      iw = CK.num(d.w, { min: 1, max: 1024 }, v => {
        d.w = v;
      }),
      ih = CK.num(d.h, { min: 1, max: 1024 }, v => {
        d.h = v;
      });
    const ok = await CK.ventana({
      titulo: 'Dibujo nuevo',
      cuerpo: h(
        'div',
        CK.campo(
          'Nombre',
          CK.txt(
            d.nombre,
            v => {
              d.nombre = v;
            },
            { vivo: true }
          )
        ),
        CK.campo(
          'Tipo',
          CK.sel(
            d.tipo,
            Object.keys(CK.asset.TIPOS)
              .filter(k => !['ref', 'hoja'].includes(k))
              .map(k => [k, CK.asset.TIPOS[k]]),
            v => {
              d.tipo = v;
            }
          )
        ),
        CK.campo('Ancho', iw),
        CK.campo('Alto', ih),
        h(
          'div.fila',
          h('span.nota-txt', 'Rápidos:'),
          rap('1 tile', T, T),
          rap('2 × 2 tiles', T * 2, T * 2),
          rap('Personaje', CK.P.estilo.personaje[0], CK.P.estilo.personaje[1]),
          rap('Ícono 16', 16, 16),
          rap('Ícono 32', 32, 32)
        )
      ),
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Crear', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    const a = CK.asset.crear({ nombre: d.nombre.trim() || 'dibujo', tipo: d.tipo, lienzo: CK.lienzo(d.w, d.h), origen: 'dibujado a mano' });
    Px.abrir(a.id);
  };
  Px.pintarTodo = () => {
    if (!Px.el) return;
    Px.pintarTira();
    Px.pintarCuadros();
    if (Px.tabs) Px.tabs.refrescar();
    pintarVacio();
    Px.pedir();
  };
  let vacio = null;
  const pintarVacio = () => {
    if (vacio) {
      vacio.remove();
      vacio = null;
    }
    if (Px.A()) return;
    vacio = h(
      'div',
      { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', background: 'var(--hueco)', zIndex: 4 } },
      CK.vacio(
        'pixel',
        'Elegí qué dibujar',
        'Abrí un asset del proyecto para retocarlo, o empezá un dibujo nuevo.',
        h(
          'div.fila',
          CK.btn({
            ico: 'imagen',
            txt: 'Abrir un asset',
            cls: 'pri',
            on: async () => {
              const id = await CK.elegirAsset('Abrir en el editor de píxeles');
              if (id) Px.abrir(id);
            }
          }),
          CK.btn({ ico: 'mas', txt: 'Dibujo nuevo', on: nuevo })
        )
      )
    );
    Px.lienzo.parentElement.append(vacio);
  };
})();
