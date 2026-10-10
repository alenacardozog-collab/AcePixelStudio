/* REVISOR y NOTAS.
   Revisor: recorre el proyecto y lista lo que desentona o falta, con un botón para arreglarlo cuando se puede.
   Notas: todo lo pendiente en un solo lugar (notas sueltas, notas clavadas en mapas y marcas de animación). Es lo que lee Claude. */
'use strict';
(function () {
  const h = CK.h;
  let elR,
    elN,
    cacheStats = {};
  const stats = a => {
    const k = a.id + ':' + (a.modificado || a.creado || 0) + ':' + CK.P.estilo.paleta.length;
    if (!cacheStats[k]) cacheStats[k] = PIX.stats(CK.asset.pix(a.id), CK.P.estilo.paleta);
    return cacheStats[k];
  };
  const filtro = (id, nombre, fn) => {
    const fin = CK.hist.imagen(nombre, id);
    CK.asset.poner(id, CK.aLienzo(fn(CK.asset.pix(id))));
    fin();
  };

  /** Devuelve [{ nivel:'grave'|'medio'|'leve', grupo, titulo, detalle, ir(), arreglar:{txt, fn} }] */
  CK.revisar = () => {
    const P = CK.P,
      out = [],
      e = P.estilo,
      add = (nivel, grupo, titulo, detalle, ir, arreglar) => out.push({ nivel, grupo, titulo, detalle, ir, arreglar });
    const usados = new Set();
    Object.values(P.mapas).forEach(m => {
      CK.mapa.objetosDe(m).forEach(o => usados.add(o.asset));
      m.capas.forEach(c => c.tileset && usados.add(c.tileset));
      if (m.fondo) usados.add(m.fondo);
    });
    // ---- assets
    Object.values(P.assets).forEach(a => {
      if (a.tipo === 'ref' || a.tipo === 'capa' || !CK.img[a.id]) return;
      const s = stats(a),
        abrir = () => CK.ir('pixel', a.id),
        esFondo = a.tipo === 'fondo';
      if (!s.opacos) {
        add('medio', 'Assets', a.nombre + ' está vacío', 'La imagen no tiene ningún píxel dibujado.', abrir);
        return;
      }
      if (s.escala > 1 && !esFondo)
        add(
          'grave',
          'Assets',
          a.nombre + ': pixel art agrandado ×' + s.escala,
          'Cada "píxel" del dibujo mide ' +
            s.escala +
            ' × ' +
            s.escala +
            ' píxeles reales. Al lado de assets a tamaño real se ve con otra densidad.',
          abrir,
          {
            txt: 'Llevar a tamaño real',
            fn: () =>
              filtro(a.id, 'Tamaño real', im => PIX.downscale(im, Math.round(im.w / s.escala), Math.round(im.h / s.escala), 'dominante'))
          }
        );
      if (s.fueraDePaleta > 0.06 && e.paleta.length && e.definida)
        add(
          s.fueraDePaleta > 0.4 ? 'medio' : 'leve',
          'Assets',
          a.nombre + ': ' + Math.round(s.fueraDePaleta * 100) + '% fuera de la paleta',
          'Usa colores que no están en la paleta del proyecto. Es la causa más común de que un asset "parezca de otro juego".',
          abrir,
          { txt: 'Llevar a la paleta', fn: () => filtro(a.id, 'Llevar a la paleta', im => PIX.quantize(im, e.paleta)) }
        );
      if (s.semitransparente > 0.04 && a.tipo !== 'fx' && !esFondo)
        add(
          'medio',
          'Assets',
          a.nombre + ': bordes borrosos',
          Math.round(s.semitransparente * 100) + '% de sus píxeles son semitransparentes. En pixel art el borde tiene que ser duro.',
          abrir,
          { txt: 'Bordes duros', fn: () => filtro(a.id, 'Bordes duros', im => PIX.cleanup(PIX.hardenAlpha(im, 110))) }
        );
      if (s.colores > e.maxColores * 1.5 && !esFondo && a.tipo !== 'tileset' && !(s.fueraDePaleta > 0.06 && e.definida))
        add(
          'leve',
          'Assets',
          a.nombre + ': ' + s.colores + (s.colores >= 600 ? '+' : '') + ' colores',
          'La guía de estilo pide como máximo ' + e.maxColores + ' por asset.',
          abrir,
          { txt: 'Reducir a ' + e.maxColores, fn: () => filtro(a.id, 'Reducir colores', im => PIX.reduceColors(im, e.maxColores)) }
        );
      if (
        (a.tipo === 'textura' || a.tipo === 'tileset') &&
        (a.w % ((a.tileset && a.tileset.tile) || e.tile) || a.h % ((a.tileset && a.tileset.tile) || e.tile))
      )
        add(
          'medio',
          'Assets',
          a.nombre + ': no encaja en la grilla',
          'Mide ' + a.w + ' × ' + a.h + ' y el tile es de ' + ((a.tileset && a.tileset.tile) || e.tile) + ' px: sobran píxeles.',
          abrir
        );
      if (a.cuadros) {
        if (a.w % a.cuadros.fw || a.h % a.cuadros.fh)
          add(
            'grave',
            'Animaciones',
            a.nombre + ': la hoja no se divide justo',
            'Mide ' + a.w + ' × ' + a.h + ' y cada cuadro ' + a.cuadros.fw + ' × ' + a.cuadros.fh + '.',
            () => CK.ir('anim', { asset: a.id })
          );
        else if (a.tipo !== 'fx' && CK.asset.nCuadros(a) > 1) {
          const j = PIX.frameJitter(PIX.slice(CK.asset.pix(a.id), a.cuadros.fw, a.cuadros.fh));
          if (j > 2 && !a.receta)
            add(
              'leve',
              'Animaciones',
              a.nombre + ': se corre ' + j + ' px entre cuadros',
              'Si no es parte del movimiento (un salto, un ataque), el personaje "salta" al animarse.',
              () => CK.ir('anim', { asset: a.id })
            );
        }
      }
    });
    // ---- mapas
    Object.values(P.mapas).forEach(m => {
      const ir = sel => () => {
        CK.ir('mapa', m.id);
        if (sel)
          setTimeout(() => {
            CK.mapa.elegir(sel);
            const o = CK.mapa.buscarObj(sel[0]);
            if (o && CK.mapa.vista()) CK.mapa.vista().centrarEn(o.x, o.y);
          }, 60);
      };
      const objs = CK.mapa.objetosDe(m),
        todos = CK.mapa.objetosDe(m, true),
        g = 'Mapa: ' + m.nombre;
      const sinImg = objs.filter(o => !CK.img[o.asset]);
      if (sinImg.length)
        add(
          'grave',
          g,
          sinImg.length + ' objeto(s) sin imagen',
          'Su asset no está en el proyecto: ' + [...new Set(sinImg.map(o => o.clave || o.asset))].slice(0, 5).join(', ') + '.',
          ir(sinImg.map(o => o.id))
        );
      const fuera = todos.filter(o => o.x < -8 || o.y < -8 || o.x > m.w + 8 || o.y > m.h + 40);
      if (fuera.length)
        add('medio', g, fuera.length + ' objeto(s) fuera del mapa', 'Quedaron más allá del borde y no se ven.', ir(fuera.map(o => o.id)));
      const raros = objs.filter(o => o.sx % 1 || o.sy % 1);
      if (raros.length)
        add(
          'medio',
          g,
          raros.length + ' objeto(s) con escala no entera',
          'Con ×1,5 o ×0,75 los píxeles salen de distinto tamaño que los del resto. Usá ×1, ×2 o ×3.',
          ir(raros.map(o => o.id)),
          {
            txt: 'Redondear escalas',
            fn: () => {
              const f = CK.hist.datos('Redondear escalas', 'mapas', m.id);
              CK.mapa.objetosDe(m).forEach(o => {
                o.sx = Math.max(1, Math.round(o.sx));
                o.sy = Math.max(1, Math.round(o.sy));
              });
              f();
            }
          }
        );
      const rot = objs.filter(o => o.rot && o.rot % 90);
      if (rot.length)
        add(
          'leve',
          g,
          rot.length + ' objeto(s) girados en ángulos libres',
          'Girar pixel art fuera de 90° deforma los píxeles.',
          ir(rot.map(o => o.id))
        );
      if (!m.origen) {
        const T = m.tile,
          tieneZonas = m.zonas && m.zonas.datos && /[1-9]/.test(m.zonas.datos.replace(/x\d+/g, ''));
        const sinCol = objs.filter(
          o =>
            !o.col &&
            CK.P.assets[o.asset] &&
            Math.max(CK.P.assets[o.asset].w, CK.P.assets[o.asset].h) >= T * 2 &&
            !(m.colisiones || []).some(k => o.x >= k.x - 2 && o.x <= k.x + k.w + 2 && o.y >= k.y - 2 && o.y <= k.y + k.h + 6)
        );
        if (sinCol.length && !tieneZonas)
          add(
            'leve',
            g,
            sinCol.length + ' objeto(s) grandes sin colisión',
            'El héroe los atraviesa. Elegilos y usá Colisión → Automática, o pintá zonas bloqueadas.',
            ir(sinCol.map(o => o.id)),
            {
              txt: 'Colisión automática',
              fn: () => {
                CK.ir('mapa', m.id);
                CK.mapa.elegir(sinCol.map(o => o.id));
                CK.mapa.colAuto();
              }
            }
          );
      }
      m.capas.forEach(c => {
        if (c.tipo !== 'objetos' && !c.tileset && c.visible)
          add(
            'leve',
            g,
            'La capa "' + c.nombre + '" no tiene tileset',
            'No se puede pintar en ella hasta elegir uno en la pestaña Capas.',
            ir()
          );
        if (c.tileset && !CK.img[c.tileset])
          add('grave', g, 'La capa "' + c.nombre + '" perdió su tileset', 'El asset ' + c.tileset + ' ya no está en el proyecto.', ir());
      });
      const ap = todos.filter(o => o.tipo === 'punto' && o.clase === 'aparicion');
      if (!ap.length && !m.origen)
        add(
          'leve',
          g,
          'Sin punto de aparición',
          'El juego no sabe dónde poner al héroe al entrar. Colocá un Punto (O) de tipo "Aparición del héroe".',
          ir()
        );
      // alcanzable: desde la aparición, ¿se llega a puertas, NPC y enemigos?
      if (ap.length) {
        const cel = m.zonas ? m.zonas.celda : m.tile / 2,
          gw = Math.ceil(m.w / cel),
          gh = Math.ceil(m.h / cel),
          bloq = new Uint8Array(gw * gh),
          z = m.zonas ? PIX.unrle(m.zonas.datos, m.zonas.w * m.zonas.h) : null;
        if (z) for (let i = 0; i < bloq.length; i++) if (z[i] === 2 || z[i] === 3) bloq[i] = 1;
        const marcar = k => {
          for (let j = Math.max(0, Math.floor(k.y / cel)); j <= Math.min(gh - 1, Math.floor((k.y + k.h - 0.01) / cel)); j++)
            for (let i = Math.max(0, Math.floor(k.x / cel)); i <= Math.min(gw - 1, Math.floor((k.x + k.w - 0.01) / cel)); i++) {
              const cx = (i + 0.5) * cel,
                cy = (j + 0.5) * cel;
              if (cx >= k.x && cx <= k.x + k.w && cy >= k.y && cy <= k.y + k.h) bloq[j * gw + i] = 1;
            }
        };
        (m.colisiones || []).forEach(marcar);
        objs.forEach(o => {
          const r = CK.mapa.colDe(o);
          if (r) marcar(r);
        });
        const visto = new Uint8Array(gw * gh),
          st = [];
        ap.forEach(p => st.push(CK.clamp(Math.floor((p.y - 2) / cel), 0, gh - 1) * gw + CK.clamp(Math.floor(p.x / cel), 0, gw - 1)));
        while (st.length) {
          const p = st.pop();
          if (visto[p] || bloq[p]) continue;
          visto[p] = 1;
          const i = p % gw,
            j = (p / gw) | 0;
          if (i > 0) st.push(p - 1);
          if (i < gw - 1) st.push(p + 1);
          if (j > 0) st.push(p - gw);
          if (j < gh - 1) st.push(p + gw);
        }
        const cerca = o => {
          const ci = CK.clamp(Math.floor(o.x / cel), 0, gw - 1),
            cj = CK.clamp(Math.floor((o.y - 2) / cel), 0, gh - 1);
          for (let dj = -2; dj <= 2; dj++)
            for (let di = -2; di <= 2; di++) {
              const i = ci + di,
                j = cj + dj;
              if (i >= 0 && j >= 0 && i < gw && j < gh && visto[j * gw + i]) return true;
            }
          return false;
        };
        const lejos = todos.filter(o => o.tipo === 'punto' && o.clase !== 'aparicion' && !cerca(o));
        if (lejos.length)
          add(
            'grave',
            g,
            lejos.length + ' punto(s) a los que el héroe no puede llegar',
            lejos
              .map(o => o.nombre || CK.mapa.PUNTOS[o.clase][0])
              .slice(0, 5)
              .join(', ') + ': quedan encerrados por colisiones o zonas bloqueadas.',
            ir(lejos.map(o => o.id))
          );
      }
      todos
        .filter(o => o.tipo === 'punto' && o.clase === 'puerta' && !(o.props && o.props.destino))
        .forEach(o => add('leve', g, 'Puerta sin destino', (o.nombre || 'Una puerta') + ' no dice a qué mapa lleva.', ir([o.id])));
      todos
        .filter(o => o.tipo === 'punto' && o.clase === 'npc' && !(o.props && o.props.npc && P.npcs[o.props.npc]))
        .forEach(o =>
          add(
            'leve',
            g,
            'NPC sin ficha',
            (o.nombre || 'Un punto de NPC') + ' no tiene asignado un personaje de la sección NPC.',
            ir([o.id])
          )
        );
    });
    // ---- NPC
    Object.values(P.npcs).forEach(n => {
      const ir = () => CK.ir('npc', n.id),
        g = 'NPC';
      if (!(n.temas || []).length) add('medio', g, n.nombre + ' no tiene temas', 'No puede conversar todavía.', ir);
      const vac = (n.temas || []).filter(t => !(t.respuestas || []).length);
      if (vac.length)
        add(
          'medio',
          g,
          n.nombre + ': ' + vac.length + ' tema(s) sin respuestas',
          vac
            .map(t => t.nombre)
            .slice(0, 6)
            .join(', '),
          ir
        );
      if (!(n.escape || []).length)
        add(
          'medio',
          g,
          n.nombre + ' no tiene frases para cuando no entiende',
          'Si el jugador pregunta algo imprevisto, respondería "…". Escribile 4 o 5 en su tono.',
          ir
        );
      const rep = CK.npcRepetidas ? CK.npcRepetidas(n) : [];
      if (rep.length)
        add(
          'leve',
          g,
          n.nombre + ': palabras clave repetidas',
          rep
            .slice(0, 4)
            .map(r => '"' + r.clave + '"')
            .join(', ') + ' aparecen en más de un tema.',
          ir
        );
    });
    // ---- misiones y enemigos
    (P.misiones || []).forEach(m => {
      if (CK.misionProblemas) CK.misionProblemas(m).forEach(t => add('medio', 'Misiones', m.nombre, t, () => CK.ir('misiones', m.id)));
    });
    Object.values(P.mapas).forEach(m => {
      if (m.origen) return;
      const g = 'Mapa: ' + m.nombre,
        ir = ids => () => {
          CK.ir('mapa');
          CK.mapa.abrir(m.id);
          if (ids) CK.mapa.elegir(ids);
        },
        todos = CK.mapa.objetosDe(m, true);
      todos
        .filter(o => o.clase === 'efecto' && !(o.props && P.fx[o.props.fx]))
        .forEach(o => add('leve', g, 'Punto de efecto sin efecto', 'Elegí qué efecto de la sección FX se enciende ahí.', ir([o.id])));
      todos
        .filter(
          o =>
            o.clase === 'puerta' &&
            o.props &&
            P.mapas[o.props.destino] &&
            o.props.llegada &&
            !CK.mapa.objetosDe(P.mapas[o.props.destino], true).some(q => q.tipo === 'punto' && q.nombre === o.props.llegada)
        )
        .forEach(o =>
          add(
            'medio',
            g,
            'Puerta que llega a un punto que no existe',
            '"' + o.props.llegada + '" no está en ' + P.mapas[o.props.destino].nombre + '.',
            ir([o.id])
          )
        );
      if (!todos.some(o => o.clase === 'puerta') && !(m.entrada && m.entrada.x))
        add(
          'leve',
          g,
          'No tiene salida ni entrada',
          'Sin una puerta de vuelta a la aldea el héroe queda encerrado; solo se llega con F7 o Probar.',
          ir()
        );
    });
    // ---- pendientes
    const pend = CK.animPendientes ? CK.animPendientes().filter(p => p.o.marca.estado !== 'hecha').length : 0;
    if (pend)
      add('leve', 'Pendientes', pend + ' animación(es) marcadas sin hacer', 'Objetos que marcaste "a animar" en los mapas.', () =>
        CK.ir('anim')
      );
    const orden = { grave: 0, medio: 1, leve: 2 };
    return out.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  };
  /** Todos los assets lado a lado, a la misma escala, sobre el color de suelo: lo que desentona salta a la vista. */
  CK.lamina = (o = {}) => {
    const esc = o.escala || 2,
      as = CK.asset.lista(o.tipos || ['sprite', 'hoja', 'personaje', 'ui', 'fx', 'textura', 'tileset']),
      W = o.ancho || 1400,
      pad = 10;
    let x = pad,
      y = pad,
      fila = 0;
    const pos = [];
    as.forEach(a => {
      const f = CK.asset.cuadro(a, 0),
        w = f.w * esc,
        hh = f.h * esc;
      if (x + w + pad > W && x > pad) {
        x = pad;
        y += fila + pad + 14;
        fila = 0;
      }
      pos.push({ a, f, x, y, w, h: hh });
      x += w + pad;
      fila = Math.max(fila, hh);
    });
    const c = CK.lienzo(W, y + fila + pad + 16),
      cx = CK.ctx(c);
    cx.fillStyle = o.fondo || CK.P.estilo.paleta[8] || '#4c7a3a';
    cx.fillRect(0, 0, c.width, c.height);
    cx.font = '10px "Segoe UI", sans-serif';
    cx.textBaseline = 'top';
    pos.forEach(p => {
      cx.drawImage(CK.img[p.a.id], p.f.x, p.f.y, p.f.w, p.f.h, p.x, p.y, p.w, p.h);
      cx.fillStyle = 'rgba(0,0,0,.55)';
      const t = p.a.nombre.slice(0, Math.max(4, Math.floor(p.w / 5.5)));
      cx.fillRect(p.x, p.y + p.h + 1, Math.min(p.w, cx.measureText(t).width + 4), 12);
      cx.fillStyle = '#fff';
      cx.fillText(t, p.x + 2, p.y + p.h + 2);
    });
    return c;
  };

  /** Prueba un arreglo, muestra el antes y el después del asset que cambia y lo deshace si no se acepta. */
  const previa = async p => {
    const refs = Object.assign({}, CK.img),
      antes = {};
    Object.keys(refs).forEach(id => {
      antes[id] = refs[id];
    });
    try {
      p.arreglar.fn();
    } catch (e) {
      CK.aviso('No se pudo probar: ' + e.message, 'error');
      return;
    }
    const id = Object.keys(CK.img).find(k => CK.img[k] !== antes[k]);
    if (!id || !antes[id]) {
      CK.hist.deshacer();
      CK.aviso('Este arreglo no cambia una imagen: no hay qué comparar.', 'info');
      pintarR();
      return;
    }
    const a = CK.P.assets[id],
      f = a ? CK.asset.cuadro(a, 0) : null,
      rec = c => {
        if (!f || !a.cuadros) return c;
        const o = CK.lienzo(f.w, f.h);
        CK.ctx(o).drawImage(c, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
        return o;
      };
    const ok = await CK.ventanaComparar(p.arreglar.txt + ' · ' + (a ? a.nombre : id), rec(antes[id]), rec(CK.copiaLienzo(CK.img[id])), {
      botones: [
        { txt: 'Dejar como estaba', valor: false },
        { txt: 'Aplicar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) CK.hist.deshacer();
    else CK.aviso('Hecho: ' + p.arreglar.txt);
    pintarR();
  };
  const pintarR = () => {
    if (!elR || !CK.P) return;
    const col = h('div.col');
    CK.vaciar(elR).append(col);
    const t0 = performance.now(),
      ps = CK.revisar();
    CK.P.ui.revisado = true;
    CK.pintarCuentaRevisor(ps.filter(p => p.nivel !== 'leve').length);
    const n = { grave: 0, medio: 0, leve: 0 };
    ps.forEach(p => n[p.nivel]++);
    col.append(
      h('h1', 'Revisor'),
      h(
        'p.bajada',
        ps.length
          ? 'Encontré ' +
              ps.length +
              ' cosa(s) para mirar: ' +
              n.grave +
              ' importantes, ' +
              n.medio +
              ' a corregir y ' +
              n.leve +
              ' sugerencias. Lo que tiene botón se arregla con un clic (y se puede deshacer).'
          : 'No encontré nada que desentone: paleta, tamaños, colisiones y diálogos están en orden.'
      ),
      h(
        'div.fila',
        { style: { marginBottom: '18px' } },
        CK.btn({ ico: 'recargar', txt: 'Volver a revisar', on: pintarR }),
        CK.btn({
          ico: 'mosaico',
          txt: 'Lámina de revisión',
          desc: 'Una sola imagen con todos los assets lado a lado, a la misma escala y sobre el color del suelo. Lo que desentona salta a la vista.',
          on: async () => {
            const c = CK.lamina({ escala: 2 }),
              v = h('div', { style: { overflow: 'auto', maxHeight: '70vh' } }, c);
            c.style.maxWidth = 'none';
            const ok = await CK.ventana({
              titulo: 'Lámina de revisión',
              ancho: 1100,
              cuerpo: v,
              botones: [
                { txt: 'Cerrar', valor: null },
                { txt: 'Descargar PNG', ico: 'importar', cls: 'pri', valor: true }
              ]
            });
            if (ok) CK.descargar(await CK.aBlob(c), 'lamina_' + CK.slug(CK.P.nombre) + '.png');
          }
        }),
        ps.some(p => p.arreglar && /paleta/.test(p.arreglar.txt))
          ? CK.btn({
              ico: 'paleta',
              txt: 'Llevar todo a la paleta',
              desc: 'Aplica "Llevar a la paleta" a todos los assets que lo necesitan, de una vez.',
              on: async () => {
                const l = ps.filter(p => p.arreglar && /paleta/.test(p.arreglar.txt));
                if (
                  await CK.confirmar(
                    'Llevar todo a la paleta',
                    'Se van a cambiar los colores de ' +
                      l.length +
                      ' assets por los más cercanos de la paleta. Cada uno se puede deshacer.',
                    'Aplicar a ' + l.length
                  )
                ) {
                  l.forEach(p => p.arreglar.fn());
                  pintarR();
                }
              }
            })
          : null
      )
    );
    if (!CK.P.estilo.definida)
      col.append(
        h(
          'div.problema.leve',
          { html: CK.ico('info', 18) },
          h(
            'div',
            h('div.pt', 'Todavía no fijaste la guía de estilo'),
            h('div.pd', 'Hasta que definas la paleta del proyecto no reviso colores (la que viene de fábrica es solo un punto de partida).')
          ),
          CK.btn({ txt: 'Abrir guía de estilo', cls: 'chico pri', on: () => CK.ir('estilo') })
        )
      );
    if (!ps.length) col.append(CK.vacio('ok', 'Todo en orden', 'Volvé a pasar el revisor después de sumar assets o mapas.'));
    let grupo = null;
    ps.forEach(p => {
      if (p.grupo !== grupo) {
        grupo = p.grupo;
        col.append(h('h2', grupo));
      }
      col.append(
        h(
          'div.problema.' + p.nivel,
          { html: CK.ico(p.nivel === 'leve' ? 'info' : 'alerta', 18) },
          h('div', h('div.pt', p.titulo), h('div.pd', p.detalle)),
          h(
            'div.fila.junto',
            p.arreglar
              ? CK.btn({
                  ico: 'comparar',
                  tip: 'Ver antes y después',
                  desc: 'Muestra cómo quedaría este arreglo sin aplicarlo todavía.',
                  cls: 'chico',
                  on: () => previa(p)
                })
              : null,
            p.arreglar
              ? CK.btn({
                  txt: p.arreglar.txt,
                  cls: 'chico pri',
                  on: () => {
                    try {
                      p.arreglar.fn();
                      CK.aviso('Hecho: ' + p.arreglar.txt.toLowerCase());
                    } catch (e) {
                      CK.aviso(e.message, 'error');
                    }
                    setTimeout(pintarR, 80);
                  }
                })
              : null,
            p.ir ? CK.btn({ txt: 'Ver', cls: 'chico', on: p.ir }) : null
          )
        )
      );
    });
    CK.estadoDer('Revisado en ' + Math.round(performance.now() - t0) + ' ms');
  };
  CK.registrar({
    id: 'revisor',
    nombre: 'Revisor',
    ico: 'revisor',
    desc: 'Lista lo que desentona o falta en assets, mapas y diálogos, con arreglos de un clic.',
    crear: e => {
      elR = h('div.pagina');
      e.append(elR);
    },
    mostrar: pintarR,
    alCambiarProyecto: () => {
      cacheStats = {};
    }
  });
  CK.on('guardado', () => {
    if (CK.P && !CK.seccionVisible('revisor'))
      setTimeout(() => {
        try {
          CK.pintarCuentaRevisor(CK.revisar().filter(p => p.nivel !== 'leve').length);
        } catch (e) {}
      }, 300);
  });

  // ================================================================ NOTAS
  let verHechas = false;
  /** Todas las notas del proyecto en una sola lista. */
  CK.todasLasNotas = () => {
    const out = [];
    CK.P.notas.forEach(n => out.push({ n, donde: 'General', tipo: 'nota' }));
    Object.values(CK.P.mapas).forEach(m => {
      (m.notas || []).forEach(n => out.push({ n, donde: m.nombre, tipo: 'mapa', mapa: m }));
      CK.mapa.objetosDe(m).forEach(o => {
        if (o.marca)
          out.push({
            n: {
              id: o.id,
              texto:
                'Animar "' +
                (o.nombre || (CK.P.assets[o.asset] || {}).nombre || 'objeto') +
                '": ' +
                (o.marca.nota || '(sin detalle)') +
                (o.marca.mascara ? ' [zona pintada: ' + CK.marcaAnim.cuantos(o.marca) + ' px se mueven; lo demás queda quieto]' : ''),
              clase: 'Animación',
              hecho: o.marca.estado === 'hecha',
              respuesta: o.marca.respuesta
            },
            donde: m.nombre,
            tipo: 'marca',
            mapa: m,
            o
          });
      });
    });
    return out;
  };
  const pintarN = () => {
    if (!elN || !CK.P) return;
    const col = h('div.col', { style: { maxWidth: '820px' } });
    CK.vaciar(elN).append(col);
    const todas = CK.todasLasNotas(),
      pend = todas.filter(x => !x.n.hecho);
    const txt = CK.txt('', () => {}, {
        multi: true,
        filas: 2,
        ph: 'Ej.: el techo de la taberna se ve chato · falta algo en la esquina del patio · el herrero necesita más temas',
        vivo: true
      }),
      tema = CK.sel('Arte', ['Arte', 'Animación', 'Mapa', 'NPC', 'Enemigo', 'Mecánica', 'Historia', 'Otro'], () => {});
    tema.style.width = '130px';
    const agregar = () => {
      const t = txt.value.trim();
      if (!t) return;
      CK.P.notas.push({ id: CK.uid('n'), texto: t, clase: tema.value, hecho: false, creada: Date.now() });
      CK.tocar();
      CK.emit('notas');
      pintarN();
    };
    col.append(
      h('h1', 'Notas'),
      h(
        'p.bajada',
        'Todo lo pendiente, en un solo lugar: lo que anotes acá, las notas clavadas en los mapas y los objetos marcados para animar. Claude lee esta lista del archivo del proyecto, resuelve lo que puede, contesta y marca lo hecho.'
      ),
      h(
        'div.caja',
        txt,
        h(
          'div.fila',
          { style: { marginTop: '8px' } },
          tema,
          CK.btn({ ico: 'mas', txt: 'Agregar nota', cls: 'pri', on: agregar }),
          h('span.nota-txt', 'Para anotar sobre un lugar exacto, usá la herramienta Nota (N) dentro del mapa.')
        )
      ),
      h(
        'div.fila',
        { style: { margin: '18px 0 8px' } },
        h('h2', { style: { margin: 0 } }, pend.length + ' pendiente' + (pend.length === 1 ? '' : 's')),
        h('span.crece'),
        CK.chk(verHechas, 'Mostrar también las resueltas (' + (todas.length - pend.length) + ')', v => {
          verHechas = v;
          pintarN();
        })
      )
    );
    const lista = verHechas ? todas : pend;
    if (!lista.length)
      col.append(CK.vacio('notas', 'Nada pendiente', 'Cuando algo no te convenza, anotalo acá o directamente sobre el mapa.'));
    lista.forEach(x => {
      const n = x.n,
        marcar = v => {
          if (x.tipo === 'marca') {
            const f = CK.hist.datos('Marca', 'mapas', x.mapa.id);
            x.o.marca.estado = v ? 'hecha' : 'pendiente';
            f();
          } else if (x.tipo === 'mapa') {
            const f = CK.hist.datos('Nota', 'mapas', x.mapa.id);
            n.hecho = v;
            f();
          } else {
            n.hecho = v;
            CK.tocar();
          }
          CK.emit('notas');
          pintarN();
        };
      col.append(
        h(
          'div.problema.' + (n.hecho ? 'leve' : 'medio'),
          { style: n.hecho ? { opacity: 0.65 } : null },
          (() => {
            const c = h('input', {
              type: 'checkbox',
              checked: !!n.hecho,
              style: { width: '17px', height: '17px', accentColor: 'var(--oro)', marginTop: '2px' }
            });
            c.addEventListener('change', () => marcar(c.checked));
            CK.tip(c, n.hecho ? 'Volver a pendiente' : 'Marcar como resuelta');
            return c;
          })(),
          h(
            'div',
            h('div.pt', { style: n.hecho ? { textDecoration: 'line-through' } : null }, n.texto),
            h(
              'div.pd',
              h('span.etq', n.clase || 'Nota'),
              ' ',
              h('span.etq.' + (x.tipo === 'nota' ? '' : 'azul'), x.donde),
              n.creada ? ' · ' + CK.fecha(n.creada) : ''
            ),
            n.respuesta
              ? h(
                  'div.pd',
                  {
                    style: {
                      marginTop: '5px',
                      padding: '6px 9px',
                      background: 'var(--hueco)',
                      borderRadius: '6px',
                      borderLeft: '2px solid var(--violeta)',
                      color: 'var(--texto)'
                    }
                  },
                  h('b', 'Claude: '),
                  n.respuesta
                )
              : null
          ),
          h(
            'div.fila.junto',
            x.mapa
              ? CK.btn({
                  txt: 'Ver en el mapa',
                  cls: 'chico',
                  on: () => {
                    CK.ir('mapa', x.mapa.id);
                    setTimeout(() => {
                      const v = CK.mapa.vista();
                      if (x.o) {
                        CK.mapa.elegir([x.o.id]);
                        v && v.centrarEn(x.o.x, x.o.y);
                      } else {
                        CK.mapa.S.selNota = n.id;
                        CK.emit('mapa-sel');
                        v && v.centrarEn(n.x, n.y);
                      }
                    }, 60);
                  }
                })
              : null,
            x.tipo === 'marca'
              ? CK.btn({
                  ico: 'anim',
                  txt: 'Animar',
                  cls: 'chico',
                  on: () => CK.ir('anim', { asset: x.o.asset, objeto: x.o.id, mapa: x.mapa.id })
                })
              : null,
            x.tipo === 'nota'
              ? CK.btn({
                  ico: 'basura',
                  tip: 'Borrar nota',
                  cls: 'chico plano peligro',
                  on: () => {
                    CK.P.notas = CK.P.notas.filter(q => q.id !== n.id);
                    CK.tocar();
                    CK.emit('notas');
                    pintarN();
                  }
                })
              : null
          )
        )
      );
    });
  };
  CK.registrar({
    id: 'notas',
    nombre: 'Notas',
    ico: 'notas',
    desc: 'Pendientes y comentarios del proyecto. Claude los lee, responde y marca lo resuelto.',
    crear: e => {
      elN = h('div.pagina');
      e.append(elN);
    },
    mostrar: pintarN
  });
})();
