/* EXPORTAR (v2): arma lo que lee el cargador del juego (juego/editor_loader.js) e instala ese cargador en CastleKnight.
   Reemplaza los datos de exportación de juego.js. */
'use strict';
(function () {
  const J = CK.juego;
  /** Enemigos y aspectos de NPC que el juego ya trae (para elegirlos en el mapa). */
  CK.ENEMIGOS = {
    orc: 'Orco',
    orc_armored: 'Orco acorazado',
    orc_elite: 'Orco de élite',
    slime: 'Limo',
    bat: 'Murciélago',
    werewolf: 'Hombre lobo',
    werebear: 'Hombre oso',
    skeleton: 'Esqueleto',
    skeleton_armored: 'Esqueleto acorazado',
    skeleton_great: 'Gran esqueleto',
    skeleton_archer: 'Esqueleto arquero',
    necromancer: 'El Nigromante (jefe)'
  };
  CK.ASPECTOS = {
    npc1: 'Aldeano',
    npc2: 'Campesino',
    npc3: 'Noble (hombre)',
    npc4: 'Aldeana',
    npc5: 'Noble (mujer)',
    npc6: 'Anciano',
    npc7: 'Anciana',
    npc8: 'Princesa',
    npc9: 'Reina',
    npc10: 'Trabajador',
    knight: 'Caballero',
    templar: 'Templario',
    lancer: 'Lancero a caballo',
    axeman: 'Hachero',
    archer: 'Arquero',
    priest: 'Sacerdote',
    king: 'Rey'
  };
  CK.MUSICAS = { '': 'La de la aldea', village: 'Aldea', castle: 'Castillo', ruins: 'Ruinas', boss: 'Jefe' };

  /** Reproduce un archivo de sonido de la carpeta del juego (llamarlo otra vez con el mismo lo corta). */
  let sonando = null;
  CK.sonar = async (ruta, vol) => {
    if (sonando) {
      sonando.pause();
      const era = sonando._ruta;
      sonando = null;
      if (era === ruta) return;
    }
    const d = CK.fs.dir('juego');
    if (!d) {
      CK.aviso('Conectá la carpeta del juego para escuchar sus sonidos.', 'info');
      return;
    }
    let f = null;
    for (const r of [ruta, ruta.replace(/\.mp3$/, '.ogg'), ruta.replace(/\.mp3$/, '.wav')]) {
      try {
        f = await CK.fs.leer(d, r);
      } catch (e) {
        f = null;
      }
      if (f) break;
    }
    if (!f) {
      CK.aviso(
        'El juego no tiene el archivo ' +
          ruta +
          (/Music/.test(ruta) ? ' (esa música la genera el juego mientras no haya un archivo grabado).' : '.'),
        'info',
        5000
      );
      return;
    }
    const a = new Audio(URL.createObjectURL(f));
    a.volume = vol === undefined ? 0.7 : vol;
    a._ruta = ruta;
    sonando = a;
    a.onended = () => {
      if (sonando === a) sonando = null;
    };
    a.play().catch(() => {});
  };
  CK.rutaMusica = n => 'assets/Music/' + (n === 'village' ? 'villageSong' : n) + '.mp3';
  /** Lee qué música, ambientes y efectos de sonido tiene el juego. */
  CK.leerAudioJuego = async () => {
    const d = CK.fs.dir('juego'),
      out = { musica: Object.keys(CK.MUSICAS).filter(Boolean), ambiente: [], sfx: [] };
    CK.audioJuego = out;
    if (!d) return out;
    const nombres = async ruta =>
      (await CK.fs.listar(d, ruta))
        .filter(e => !e.carpeta && /\.(mp3|ogg|wav)$/i.test(e.nombre))
        .map(e => e.nombre.replace(/\.[a-z0-9]+$/i, ''))
        .sort();
    (await nombres('assets/Music')).forEach(n => {
      if (!/^(IntroSong|villageSong)$/.test(n) && !out.musica.includes(n)) out.musica.push(n);
    });
    const sfx = await nombres('assets/audio/sfx');
    out.ambiente = sfx.filter(n => /^amb_/.test(n));
    out.sfx = sfx.filter(n => !/^amb_/.test(n));
    return out;
  };

  /** Clave de textura con la que el juego ya carga este asset (null si es arte nuevo o fue modificado). */
  J.texDe = a => {
    if (!a || a.modificado) return null;
    if (a.texJuego) return a.texJuego;
    const r = a.rutaJuego;
    if (!r) return null;
    const n = r
      .split('/')
      .pop()
      .replace(/\.png$/i, '');
    if (/^assets\/ruins\//.test(r)) return /_anim$/.test(n) ? 'ru_' + n : 'ru_' + n;
    if (/^assets\/castle\//.test(r)) return 'cs_' + n;
    if (/^assets\/interiors\//.test(r)) return 'int_' + n;
    if (/^assets\/map\//.test(r)) return n;
    return null;
  };
  const claveDe = a => J.texDe(a) || 'ed_' + a.id;
  /** Un mapa nuevo en el formato del cargador. */
  J.datosNuevo = (m, usados) => {
    const items = [],
      luces = [],
      puntos = {},
      puertas = [],
      npcs = [],
      enemigos = [],
      fx = [];
    let aparicion = null;
    CK.mapa.objetosDe(m, true).forEach(o => {
      if (o.oculto) return;
      if (o.tipo === 'luz') {
        luces.push({ x: Math.round(o.x), y: Math.round(o.y), radio: o.radio, color: o.color, fuerza: o.fuerza, parpadeo: o.parpadeo || 0 });
        return;
      }
      if (o.tipo === 'punto') {
        const p = o.props || {},
          x = Math.round(o.x),
          y = Math.round(o.y);
        if (o.nombre) puntos[o.nombre] = { x, y };
        if (o.clase === 'aparicion' && !aparicion) aparicion = { x, y };
        else if (o.clase === 'puerta')
          puertas.push({ x, y, w: o.w || 32, h: o.h || 20, destino: p.destino || '', llegada: p.llegada || '', nombre: o.nombre || '' });
        else if (o.clase === 'npc') {
          const n = {
            x,
            y,
            npc: p.npc || '',
            aspecto: p.aspecto || 'npc1',
            nombre: o.nombre || '',
            escala: +p.escala || 0,
            flip: !!p.flip
          };
          if (p.sprite && CK.P.assets[p.sprite]) {
            n.sprite = claveDe(CK.P.assets[p.sprite]);
            usados.add(p.sprite);
          }
          npcs.push(n);
        } else if (o.clase === 'enemigo')
          enemigos.push({
            tipo: p.tipo || 'orc',
            x,
            y,
            radio: +p.radio || 40,
            noche: !!p.noche,
            ruta: (o.ruta || []).length ? [[x, y]].concat(o.ruta.map(q => [Math.round(q[0]), Math.round(q[1])])) : []
          });
        else if (o.clase === 'efecto' && p.fx) fx.push({ x, y, fx: p.fx });
        return;
      }
      const a = CK.P.assets[o.asset];
      if (!a) return;
      usados.add(a.id);
      const it = [
        claveDe(a),
        Math.round(o.x),
        Math.round(o.y),
        o.flipX ? 1 : 0,
        o.anim || (a.cuadros ? (J.texDe(a) ? a.animJuego || '' : 'ed_' + a.id) : '')
      ];
      const ex = {};
      if ((o.sx || 1) !== 1) ex.escala = o.sx;
      if (o.piso) ex.piso = true;
      if (ex.escala || ex.piso) it.push(ex);
      items.push(it);
    });
    const d = J.datosMapa(m);
    return {
      nombre: m.nombre,
      titulo: m.titulo || m.nombre,
      w: m.w,
      h: m.h,
      suelo: 'ed_suelo_' + m.id,
      superficie: m.superficie || 'grass',
      items,
      cols: d.cols,
      luces,
      ambiente: m.ambiente && m.ambiente.fuerza > 0 ? m.ambiente : null,
      aparicion,
      puntos,
      puertas,
      npcs,
      enemigos,
      fx,
      entrada: m.entrada && m.entrada.x ? m.entrada : null,
      musica: m.musica || '',
      sonido: (m.sonido || []).filter(s => s && s[0])
    };
  };
  /** Todo lo que lee el cargador. Devuelve { datos, imagenes: { clave: canvas } }. */
  J.paquete = () => {
    const P = CK.P,
      usados = new Set(),
      D = {
        hecho: 'Taller CastleKnight',
        v: 2,
        guardado: Date.now(),
        tile: P.estilo.tile,
        assets: {},
        mapas: {},
        npcs: {},
        fx: {},
        misiones: CK.clone(P.misiones || []).map(m => {
          (m.pasos || []).forEach(p => {
            if (!p.texto && CK.misionTexto) p.texto = CK.misionTexto(p);
          });
          return m;
        })
      },
      imagenes = {};
    const alias = new Set();
    Object.values(P.mapas).forEach(m => {
      if (m.origen) {
        D.mapas[m.id] = { nombre: m.nombre, origen: m.origen };
        if (m.origen.tipo === 'juego') {
          const dd = J.datosMapa(m);
          dd.nuevos.forEach(id => usados.add(id));
          dd.alias.forEach(k => alias.add(k));
        }
        return;
      }
      D.mapas[m.id] = J.datosNuevo(m, usados);
      imagenes['ed_suelo_' + m.id] = CK.mapa.hornearSuelo(m);
    });
    D.alias = [...alias];
    Object.values(P.fx).forEach(f => {
      D.fx[f.id] = f;
      (f.capas || []).forEach(c => {
        if (c.figura === 'asset' && P.assets[c.asset]) {
          usados.add(c.asset);
        }
      });
    });
    Object.values(P.npcs).forEach(n => {
      D.npcs[n.id] = {
        id: n.id,
        nombre: n.nombre,
        oficio: n.oficio,
        saludo: n.saludo || [],
        despedida: n.despedida || [],
        escape: n.escape || [],
        temas: n.temas || []
      };
    });
    usados.forEach(id => {
      const a = P.assets[id];
      if (!a || J.texDe(a) || !CK.img[id]) return;
      const k = 'ed_' + id;
      imagenes[k] = CK.img[id];
      D.assets[k] = { w: a.w, h: a.h };
      if (a.cuadros)
        D.assets[k].cuadros = {
          fw: a.cuadros.fw,
          fh: a.cuadros.fh,
          fps: a.cuadros.fps || 8,
          bucle: a.cuadros.bucle !== false,
          vaiven: !!a.cuadros.vaiven,
          orden: a.cuadros.orden || null,
          dur: a.cuadros.dur || null
        };
    });
    // las partículas que usan un asset lo nombran por su clave de textura
    Object.values(D.fx).forEach(f => {
      D.fx[f.id] = CK.clone(f);
      D.fx[f.id].capas.forEach(c => {
        if (c.figura === 'asset' && P.assets[c.asset]) c.asset = claveDe(P.assets[c.asset]);
      });
    });
    return { datos: D, imagenes };
  };
  J.textoDatos = () =>
    '/* Generado por el Taller CastleKnight (D:\\Editor). Se reescribe en cada exportación: no editar a mano. */\nwindow.EDITOR_DATA = ' +
    JSON.stringify(J.paquete().datos, null, 1) +
    ';\n';
  const textoImagenes = imagenes =>
    '/* Generado por el Taller CastleKnight: imágenes nuevas embebidas, para que el juego abra con doble clic. */\nwindow.EDITOR_ASSETS = {\n' +
    Object.keys(imagenes)
      .map(k => ' ' + JSON.stringify(k) + ': "' + imagenes[k].toDataURL('image/png') + '"')
      .join(',\n') +
    '\n};\n';

  const MARCA = '<!-- Taller (D:\\Editor): datos y cargador. Borrar este bloque deja el juego como estaba. -->',
    FIN = '<!-- /Taller -->';
  const bloque = v =>
    '  ' +
    MARCA +
    '\n  <script src="js/maps/data/editor_data.js?v=' +
    v +
    '"></script>\n  <script src="js/maps/data/editor_assets.js?v=' +
    v +
    '"></script>\n  <script src="js/core/ck_dialogo.js?v=' +
    v +
    '"></script>\n  <script src="js/core/ck_fx.js?v=' +
    v +
    '"></script>\n  <script src="js/editor_loader.js?v=' +
    v +
    '"></script>\n  ' +
    FIN +
    '\n';
  /** Pone (o actualiza) el bloque del Taller en el index.html del juego, justo antes de game.js. */
  J.parchearIndex = (html, v) => {
    const i = html.indexOf(MARCA);
    if (i >= 0) {
      const f = html.indexOf(FIN, i);
      if (f < 0) return null;
      const ini = html.lastIndexOf('\n', i) + 1,
        fin = html.indexOf('\n', f) + 1;
      return html.slice(0, ini) + bloque(v) + html.slice(fin);
    }
    const m = /^[ \t]*<script src="js\/game\.js[^"]*"><\/script>/m.exec(html);
    if (!m) return null;
    return html.slice(0, m.index) + bloque(v) + html.slice(m.index);
  };
  J.cargadorInstalado = async () => {
    const d = CK.fs.dir('juego');
    if (!d) return false;
    const t = await CK.fs.texto(d, 'index.html');
    return !!(t && t.includes('js/editor_loader.js') && (await CK.fs.texto(d, 'js/editor_loader.js')));
  };
  /** Copia el cargador y sus dos archivos de apoyo al juego y agrega sus <script> a index.html (con respaldo). */
  J.instalarCargador = async () => {
    const dj = await J.dir(),
      de = CK.fs.dir('editor');
    if (!dj) return false;
    if (!de) {
      CK.aviso('Conectá también la carpeta del editor: de ahí se copia el cargador.', 'info', 5000);
      return false;
    }
    const origen = {
      'js/editor_loader.js': 'juego/editor_loader.js',
      'js/core/ck_dialogo.js': 'js/core/dialogo.js',
      'js/core/ck_fx.js': 'js/core/fxsim.js'
    };
    for (const dest in origen) {
      const t = await CK.fs.texto(de, origen[dest]);
      if (!t) {
        CK.aviso('No encuentro ' + origen[dest] + ' en la carpeta del editor.', 'error', 6000);
        return false;
      }
      await CK.fs.escribir(dj, dest, t);
    }
    for (const f of ['js/maps/data/editor_data.js', 'js/maps/data/editor_assets.js'])
      if (!(await CK.fs.texto(dj, f)))
        await CK.fs.escribir(dj, f, f.includes('assets') ? 'window.EDITOR_ASSETS = {};\n' : 'window.EDITOR_DATA = null;\n');
    const html = await CK.fs.texto(dj, 'index.html');
    if (!html) {
      CK.aviso('No encuentro index.html en la carpeta del juego.', 'error');
      return false;
    }
    const nuevo = J.parchearIndex(html, Date.now().toString(36));
    if (!nuevo) {
      CK.aviso('No pude ubicar la línea de game.js en index.html. No lo toqué.', 'error', 6000);
      return false;
    }
    if (!html.includes(MARCA)) await CK.fs.escribir(de, CK.rutaProyecto() + '/respaldo/index_antes_del_cargador.html', html);
    await CK.fs.escribir(dj, 'index.html', nuevo);
    CK.aviso('Cargador instalado en el juego.');
    return true;
  };

  J.ventanaExportar = async function () {
    if (!CK.P) return;
    const d = CK.fs.dir('juego'),
      cuerpo = CK.h('div'),
      mapas = Object.values(CK.P.mapas),
      sel = { datos: true };
    const delJuego = mapas.filter(m => m.origen && m.origen.tipo === 'juego'),
      propios = mapas.filter(m => !m.origen),
      inst = d ? await J.cargadorInstalado() : false;
    if (!d)
      cuerpo.append(
        CK.h(
          'div.problema.medio',
          { html: CK.ico('alerta', 18) },
          CK.h(
            'div',
            CK.h('div.pt', 'La carpeta del juego no está conectada'),
            CK.h('div.pd', 'Sin ella no puedo escribir en CastleKnight.')
          ),
          CK.btn({
            txt: 'Conectar',
            cls: 'chico pri',
            on: async () => {
              await CK.conectarCarpeta('juego');
              cuerpo.closest('.ventana').cerrar(null);
              J.ventanaExportar();
            }
          })
        )
      );
    else
      cuerpo.append(
        CK.h(
          'div.problema.' + (inst ? 'leve' : 'medio'),
          { html: CK.ico(inst ? 'ok' : 'alerta', 18) },
          CK.h(
            'div',
            CK.h('div.pt', inst ? 'El cargador está instalado en el juego' : 'El juego todavía no tiene el cargador'),
            CK.h(
              'div.pd',
              inst
                ? 'CastleKnight lee lo que exportes: mapas nuevos, arte, luces, NPC, misiones y efectos.'
                : 'Es el archivo que le enseña a CastleKnight a leer lo que hacés acá. Agrega un archivo y un bloque en index.html; no cambia nada más.'
            )
          ),
          CK.btn({
            txt: inst ? 'Reinstalar' : 'Instalar cargador',
            cls: 'chico' + (inst ? '' : ' pri'),
            on: async () => {
              if (await J.instalarCargador()) {
                cuerpo.closest('.ventana').cerrar(null);
                J.ventanaExportar();
              }
            }
          })
        )
      );
    const pk = J.paquete(),
      nImg = Object.keys(pk.imagenes).length;
    cuerpo.append(
      CK.seccion(
        'Qué se exporta',
        CK.chk(
          true,
          'Datos e imágenes del proyecto',
          v => {
            sel.datos = v;
          },
          'Escribe editor_data.js y editor_assets.js en js/maps/data/ del juego.'
        ),
        CK.h(
          'p.nota-txt',
          propios.length +
            ' mapa(s) nuevo(s)' +
            (propios.length ? ' (' + propios.map(m => m.nombre).join(', ') + ')' : '') +
            ' · ' +
            nImg +
            ' imagen(es) · ' +
            Object.keys(pk.datos.npcs).length +
            ' NPC · ' +
            pk.datos.misiones.length +
            ' misión(es) · ' +
            Object.keys(pk.datos.fx).length +
            ' efecto(s). Para entrar a un mapa nuevo dentro del juego: tecla F7, una puerta desde otro mapa, o el botón Probar.'
        )
      )
    );
    if (delJuego.length)
      cuerpo.append(
        CK.seccion(
          'Mapas que ya existen en el juego',
          CK.h(
            'p.ayuda-txt',
            'Reescribe solo las listas de objetos y colisiones en el archivo del juego. Antes guarda una copia en la carpeta del editor.'
          ),
          delJuego.map(m => {
            sel['m_' + m.id] = false;
            return CK.chk(false, m.nombre + ' → ' + m.origen.archivo, v => {
              sel['m_' + m.id] = v;
            });
          })
        )
      );
    const ok = await CK.ventana({
      titulo: 'Exportar al juego',
      ancho: 580,
      cuerpo,
      botones: [
        { txt: 'Cancelar', valor: false },
        { txt: 'Exportar', ico: 'exportar', cls: 'pri', valor: true }
      ]
    });
    if (!ok) return;
    if (!d) {
      CK.aviso('Falta conectar la carpeta del juego.', 'error');
      return;
    }
    await J.exportar(sel);
  };
  J.exportar = async function (sel) {
    const d = await J.dir();
    if (!d) return false;
    CK._ocupado = true;
    let mapasEscritos = 0,
      nImg = 0;
    try {
      if (sel.datos !== false) {
        const pk = J.paquete();
        nImg = Object.keys(pk.imagenes).length;
        await CK.fs.escribir(
          d,
          'js/maps/data/editor_data.js',
          '/* Generado por el Taller CastleKnight (D:\\Editor). Se reescribe en cada exportación: no editar a mano. */\nwindow.EDITOR_DATA = ' +
            JSON.stringify(pk.datos, null, 1) +
            ';\n'
        );
        await CK.fs.escribir(d, 'js/maps/data/editor_assets.js', textoImagenes(pk.imagenes));
        const html = await CK.fs.texto(d, 'index.html');
        if (html && html.includes(MARCA)) {
          const n = J.parchearIndex(html, Date.now().toString(36));
          if (n) await CK.fs.escribir(d, 'index.html', n);
        }
      }
      for (const m of Object.values(CK.P.mapas)) {
        if (!m.origen || m.origen.tipo !== 'juego' || !sel['m_' + m.id]) continue;
        const txt = await CK.fs.texto(d, m.origen.archivo);
        if (!txt) {
          CK.aviso('No encontré ' + m.origen.archivo, 'error');
          continue;
        }
        const de = CK.fs.dir('editor');
        if (de)
          await CK.fs.escribir(
            de,
            CK.rutaProyecto() +
              '/respaldo/' +
              m.origen.archivo.split('/').pop().replace('.js', '') +
              '_' +
              new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') +
              '.js',
            txt
          );
        const dd = J.datosMapa(m);
        let nuevo = J._reemplazar(txt, m.origen.ancla, 'items', J.textoItems(dd.items));
        if (nuevo) nuevo = J._reemplazar(nuevo, m.origen.ancla, 'cols', J.textoCols(dd.cols));
        if (!nuevo) {
          CK.aviso('No pude ubicar las listas de "' + m.nombre + '" en ' + m.origen.archivo + '. No lo toqué.', 'error', 6000);
          continue;
        }
        await CK.fs.escribir(d, m.origen.archivo, nuevo);
        mapasEscritos++;
      }
      CK.tocar();
      const inst = await J.cargadorInstalado();
      if (!sel.callado)
        CK.aviso(
          'Exportado: ' +
            (sel.datos !== false ? 'datos del proyecto y ' + nImg + ' imagen(es)' : '') +
            (mapasEscritos ? ' · ' + mapasEscritos + ' mapa(s) del juego actualizados' : '') +
            (inst ? '' : '. Falta instalar el cargador para que el juego lo lea.'),
          inst ? 'ok' : 'info',
          6000
        );
      return true;
    } catch (e) {
      console.error(e);
      CK.aviso('Error al exportar: ' + e.message, 'error', 7000);
      return false;
    } finally {
      CK._ocupado = false;
    }
  };
  /** Listas items / cols de un mapa que ya existe en el juego, en su formato. alias = texturas que el cargador tiene que duplicar con el prefijo del mapa. */
  J.datosMapa = function (m) {
    const items = [],
      alias = new Set(),
      nuevos = new Set(),
      ru = !!(m.origen && m.origen.clave === 'ruins');
    CK.mapa.objetosDe(m).forEach(o => {
      if (o.oculto || o.tipo) return;
      const a = CK.P.assets[o.asset];
      let key,
        anim = o.anim || '';
      if (o.clave && (!a || (!a.modificado && a.claveJuego === o.clave))) key = o.clave;
      else if (a) {
        const tex = claveDe(a);
        if (!J.texDe(a)) nuevos.add(a.id);
        if (ru) {
          if (tex.indexOf('ru_') === 0) key = tex.slice(3);
          else {
            key = tex;
            alias.add(tex);
          }
        } else key = tex;
        if (a.cuadros && !anim) anim = J.texDe(a) ? a.animJuego || '' : 'ed_' + a.id;
      } else return;
      const it = [key, Math.round(o.x), Math.round(o.y), o.flipX ? 1 : 0];
      if (anim) it.push(anim);
      items.push(it);
    });
    const cols = (m.colisiones || []).map(k => [Math.round(k.x), Math.round(k.y), Math.round(k.w), Math.round(k.h)]);
    CK.mapa.objetosDe(m).forEach(o => {
      if (o.col && !o.oculto) {
        const r = CK.mapa.colDe(o);
        if (r) cols.push([Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)]);
      }
    });
    if (m.zonas && m.zonas.datos) {
      const g = PIX.unrle(m.zonas.datos, m.zonas.w * m.zonas.h);
      PIX.gridRects(g, m.zonas.w, m.zonas.h, v => v === 2, m.zonas.celda).forEach(r => cols.push(r));
    }
    return { items, cols, alias: [...alias], nuevos: [...nuevos] };
  };
  /** Probar: si el juego ya tiene el cargador, exporta primero y abre el juego en el mapa que se está editando. */
  J.probar = async function () {
    if (!CK.P) return;
    let url = CK.P.juego.url || '../prueba/index.html';
    const q = [];
    const m = CK.mapa && CK.mapa.actual && CK.mapa.actual();
    if (m && CK.seccionVisible('mapa')) {
      q.push('ck_zona=' + encodeURIComponent(m.origen ? m.origen.clave.split('.').pop() : m.id));
      const c = CK.mapa.centroVista();
      if (c) q.push('ck_x=' + Math.round(c.x), 'ck_y=' + Math.round(c.y));
    }
    q.push('ck_t=' + Date.now());
    url += (url.includes('?') ? '&' : '?') + q.join('&');
    const w = window.open('about:blank', 'castleknight_prueba');
    if (!w) {
      CK.aviso('El navegador bloqueó la pestaña nueva. Permití las ventanas emergentes para este archivo.', 'error', 6000);
      return;
    }
    let exp = false;
    try {
      if (CK.fs.dir('juego') && (await J.cargadorInstalado())) exp = await J.exportar({ datos: true, callado: true });
    } catch (e) {
      console.warn(e);
    }
    w.location.href = new URL(url, location.href).href;
    CK.estado(
      'Juego abierto en otra pestaña' +
        (exp ? ' con lo último exportado.' : '. No exporté: falta conectar la carpeta del juego o instalar el cargador.')
    );
  };
})();
