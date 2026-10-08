/* FX: efectos editables por capas (partículas, luces, destellos, sacudida) con vista previa en vivo.
   Se guardan como datos (el juego los reproduce con js/core/fxsim.js) o se "hornean" a una hoja de sprites para cualquier motor. */
'use strict';
(function () {
  const h = CK.h; let el, izq, der, cv, lineaT, sim = null, vivo = false, espera = 0;
  const st = { id: null, capa: 0, fondo: 'oscuro', mapaFondo: null, pixelado: true, pausa: false, escala: 3 };
  const BW = 240, BH = 160;
  const FX = () => CK.P && CK.P.fx[st.id];
  const TIPOS = { emisor: ['Partículas', 'particulas'], luz: ['Luz', 'luz'], destello: ['Destello', 'rayo'], sacudida: ['Sacudida', 'mover'] };
  const reiniciar = () => { const f = FX(); sim = f ? CKFx.crear(f, { semilla: 7 }) : null; espera = 0; };
  const recurso = id => { const a = CK.P.assets[id]; return a && CK.img[id] ? { img: CK.img[id], n: CK.asset.nCuadros(a), cuadro: i => CK.asset.cuadro(a, i) } : null; };
  const origen = f => ({ x: f.mov && f.mov.vx > 0 ? Math.round(BW * 0.14) : f.mov && f.mov.vx < 0 ? Math.round(BW * 0.86) : Math.round(BW / 2), y: f.mov && f.mov.vy < 0 ? Math.round(BH * 0.85) : Math.round(BH * 0.58) });

  // ---------------------------------------------------------------- dibujo
  let baja = null, capaFx = null, fondoMapa = null, fondoDe = null;
  const cuadro = (dt) => {
    const f = FX(); if (!cv || !f || !sim) return;
    baja = baja || CK.lienzo(BW, BH); capaFx = capaFx || CK.lienzo(BW, BH);
    if (!st.pausa) { if (sim.fin) { espera += dt; if (espera > 0.7) reiniciar(); } else sim.paso(dt); }
    const x = CK.ctx(baja), o = origen(f);
    if (st.fondo === 'mapa' && st.mapaFondo && CK.P.mapas[st.mapaFondo]) { if (fondoDe !== st.mapaFondo) { fondoMapa = CK.mapa.foto(CK.P.mapas[st.mapaFondo]); fondoDe = st.mapaFondo; } x.fillStyle = '#17191c'; x.fillRect(0, 0, BW, BH); x.drawImage(fondoMapa, Math.max(0, Math.round(fondoMapa.width / 2 - BW / 2)), Math.max(0, Math.round(fondoMapa.height / 2 - BH / 2)), BW, BH, 0, 0, BW, BH); }
    else { x.fillStyle = { oscuro: '#1b1d21', noche: '#161a30', pasto: '#4c7a3a', piedra: '#6b6258', claro: '#c9c2b0' }[st.fondo] || '#1b1d21'; x.fillRect(0, 0, BW, BH); }
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(o.x - 3, o.y, 7, 1); x.fillRect(o.x, o.y - 3, 1, 7);
    const y = CK.ctx(capaFx); y.clearRect(0, 0, BW, BH); sim.dibujar(y, o.x, o.y, recurso, 'particulas');
    if (st.pixelado) { const d = y.getImageData(0, 0, BW, BH), pal = CK.P.estilo.paleta; let im = { w: BW, h: BH, d: d.data }; for (let i = 3; i < im.d.length; i += 4) im.d[i] = im.d[i] >= 70 ? 255 : 0; if (pal.length) im = PIX.quantize(im, pal); y.putImageData(new ImageData(new Uint8ClampedArray(im.d), BW, BH), 0, 0); }
    x.drawImage(capaFx, sim.sacudida.x * 0, 0); sim.dibujar(x, o.x, o.y, recurso, 'luces');
    const r = cv.parentElement.getBoundingClientRect(), k = Math.max(1, Math.floor(Math.min((r.width - 20) / BW, (r.height - 20) / BH)));
    if (cv.width !== BW * k) { cv.width = BW * k; cv.height = BH * k; cv.style.width = BW * k + 'px'; cv.style.height = BH * k + 'px'; }
    const z = CK.ctx(cv); z.drawImage(baja, 0, 0, BW * k, BH * k);
    if (lineaT) { const m = lineaT.querySelector('.aguja'); if (m) m.style.left = Math.min(100, sim.t / f.dur * 100) + '%'; }
  };
  const lazo = t => { if (!vivo) return; const dt = Math.min(0.05, (t - (lazo.u || t)) / 1000); lazo.u = t; if (CK.seccion_actual === 'fx') cuadro(dt || 0.016); requestAnimationFrame(lazo); };

  // ---------------------------------------------------------------- edición con deshacer
  let antes = null;
  const tocar = (nombre, final) => { if (antes === null) return; if (final !== false) { const a = antes, d = JSON.stringify(FX()), id = st.id; antes = null; if (a !== d) CK.hist.push({ nombre, deshacer: () => { CK.P.fx[id] = JSON.parse(a); CK.emit('datos', 'fx', id); }, rehacer: () => { CK.P.fx[id] = JSON.parse(d); CK.emit('datos', 'fx', id); } }); } CK.tocar(); };
  const ed = (nombre, fn, final) => { if (antes === null) antes = JSON.stringify(FX()); fn(FX()); if (sim) sim.e = FX(); tocar(nombre, final); };
  const rg = (rot, get, set, min, max, step, ayuda) => CK.campo(rot, CK.rango(get(), { min, max, step: step || 1 }, (v, fin) => ed(rot, () => set(v), fin)), ayuda);
  const par = (rot, arr, min, max, step, ayuda, n1 = 'mín', n2 = 'máx') => h('div', { style: { margin: '6px 0' } }, CK.tip(h('span.campo-rot', rot), rot, ayuda), h('div.duo', h('label', h('span.mini-rot', n1), CK.rango(arr()[0], { min, max, step: step || 1 }, (v, fin) => ed(rot, () => { arr()[0] = v; }, fin))), h('label', h('span.mini-rot', n2), CK.rango(arr()[1], { min, max, step: step || 1 }, (v, fin) => ed(rot, () => { arr()[1] = v; }, fin)))));

  const nuevoFx = (plantilla) => { const base = plantilla ? CK.clone(CKFx.plantillas[plantilla]) : { nombre: 'Efecto nuevo', dur: 1, bucle: true, capas: [Object.assign({ tipo: 'emisor', nombre: 'Partículas', inicio: 0 }, CK.clone(CKFx.DEF), { colores: [CK.P.estilo.paleta[CK.P.estilo.paleta.length - 1] || '#ffffff'] })] }; let id = CK.slug(base.nombre), n = 2; while (CK.P.fx[id]) id = CK.slug(base.nombre) + '_' + (n++); base.id = id; base.capas.forEach(c => { if (c.tipo === 'emisor') Object.keys(CKFx.DEF).forEach(k => { if (c[k] === undefined) c[k] = CK.clone(CKFx.DEF[k]); }); });
    CK.P.fx[id] = base; CK.tocar(); st.id = id; st.capa = 0; reiniciar(); pintarTodo(); };
  const aPaleta = () => ed('Llevar a la paleta', f => { const P = PIX.palRGB(CK.P.estilo.paleta); if (!P.length) return; const cerca = hx => { const c = PIX.hex2rgb(hx); return CK.P.estilo.paleta[PIX.nearestIdx(P, c[0], c[1], c[2])]; }; f.capas.forEach(c => { if (c.colores) c.colores = c.colores.map(cerca); }); });
  /** Hornea el efecto cuadro a cuadro. Devuelve { frames (pix), fw, fh, fps }. */
  const hornear = (f, fps = 12) => {
    const s = CKFx.crear(CK.clone(Object.assign({}, f, { bucle: false })), { semilla: 7 }), W = 320, H = 240, ox = W / 2 - (f.mov ? (f.mov.vx || 0) * f.dur / 2 : 0), oy = H * 0.6 - (f.mov ? (f.mov.vy || 0) * f.dur / 2 : 0), c = CK.lienzo(W, H), x = CK.ctx(c), crudos = [], dt = 1 / 60, total = Math.ceil((f.dur + 0.9) * 60), cada = Math.round(60 / fps);
    if (f.bucle) for (let i = 0; i < Math.ceil(f.dur * 60); i++) s.paso(dt);          // pre-rodaje: el loop arranca ya "lleno"
    const sb = f.bucle ? CKFx.crear(CK.clone(f), { semilla: 7 }) : s; if (f.bucle) for (let i = 0; i < Math.ceil(f.dur * 120); i++) sb.paso(dt);
    const usar = f.bucle ? sb : s, pasos = f.bucle ? Math.ceil(f.dur * 60) : total;
    for (let i = 0; i < pasos; i++) { if (i % cada === 0) { x.clearRect(0, 0, W, H); usar.dibujar(x, Math.round(ox), Math.round(oy), recurso, 'particulas'); let im = CK.aPix(c); im = { w: W, h: H, d: new Uint8ClampedArray(im.d) }; for (let q = 3; q < im.d.length; q += 4) im.d[q] = im.d[q] >= 70 ? 255 : 0; if (CK.P.estilo.paleta.length) im = PIX.quantize(im, CK.P.estilo.paleta); crudos.push(im); } usar.paso(dt); if (!f.bucle && usar.fin) break; }
    while (crudos.length > 1 && !PIX.bbox(crudos[crudos.length - 1])) crudos.pop();
    let x0 = W, y0 = H, x1 = 0, y1 = 0; crudos.forEach(im => { const b = PIX.bbox(im); if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }); if (x1 <= x0) { x0 = 0; y0 = 0; x1 = 8; y1 = 8; }
    return { frames: crudos.map(im => PIX.crop(im, x0, y0, x1 - x0, y1 - y0)), fw: x1 - x0, fh: y1 - y0, fps, ancla: { x: Math.round(ox) - x0, y: Math.round(oy) - y0 } };
  };
  CK.fxHornear = hornear;

  // ---------------------------------------------------------------- paneles
  const pintarIzq = () => {
    if (!izq) return; CK.vaciar(izq); const l = h('div.lista');
    Object.values(CK.P.fx).forEach(f => l.append(h('div.item' + (f.id === st.id ? '.activo' : ''), { onclick: () => { st.id = f.id; st.capa = 0; reiniciar(); pintarTodo(); } }, h('span', { html: CK.ico('fx', 16) }), h('span.nombre', f.nombre), h('span.sub', f.dur + ' s' + (f.bucle ? ' · loop' : '')))));
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Efectos del proyecto', CK.btn({ ico: 'mas', txt: 'Vacío', cls: 'chico', desc: 'Crea un efecto con un solo emisor de partículas para armarlo desde cero.', on: () => nuevoFx() })), Object.keys(CK.P.fx).length ? l : h('p.nota-txt', 'Todavía no hay efectos. Empezá por una plantilla y cambiale lo que quieras.')));
    const lp = h('div.lista'); Object.keys(CKFx.plantillas).forEach(k => { const p = CKFx.plantillas[k], b = h('div.item', { onclick: () => nuevoFx(k) }, h('span', { html: CK.ico(p.mov ? 'rayo' : /fuego|explos/.test(k) ? 'fuego' : 'particulas', 16) }), h('span.nombre', p.nombre), h('span.sub', p.capas.length + ' capas')); CK.tip(b, 'Plantilla: ' + p.nombre, 'Clic para crear un efecto nuevo a partir de esta plantilla. Después lo editás libremente.'); lp.append(b); });
    izq.append(h('div.bloque', h('h3.bloque-tit', 'Plantillas'), lp));
  };
  const pintarLinea = () => {
    if (!lineaT) return; CK.vaciar(lineaT); const f = FX(); if (!f) return;
    const filas = h('div', { style: { position: 'relative' } });
    f.capas.forEach((c, i) => {
      const a = c.inicio || 0, b = c.fin === undefined || c.fin === null ? f.dur : c.fin, seg = h('div.pista-seg', { style: { left: a / f.dur * 100 + '%', width: Math.max(1.5, (b - a) / f.dur * 100) + '%', background: c.oculta ? 'var(--linea2)' : ({ emisor: 'var(--oro)', luz: '#ffb04a', destello: '#f5f1e6', sacudida: 'var(--violeta)' })[c.tipo] } }), barra = h('div.pista-barra', seg);
      CK.tip(seg, c.nombre + ': ' + a.toFixed(2) + ' s a ' + b.toFixed(2) + ' s', 'Arrastrá el medio para moverla en el tiempo, o el borde derecho para acortarla o alargarla.');
      seg.addEventListener('pointerdown', e => { e.stopPropagation(); seg.setPointerCapture(e.pointerId); st.capa = i; const r = barra.getBoundingClientRect(), sr = seg.getBoundingClientRect(), borde = e.clientX > sr.right - 8, x0 = e.clientX, a0 = a, b0 = b; antes = JSON.stringify(FX());
        const mv = ev => { const d = (ev.clientX - x0) / r.width * f.dur; ed('Tiempos', () => { if (borde) c.fin = +CK.clamp(b0 + d, a0 + 0.02, f.dur).toFixed(2); else { const na = CK.clamp(a0 + d, 0, f.dur - (b0 - a0)); c.inicio = +na.toFixed(2); c.fin = +(na + (b0 - a0)).toFixed(2); } }, false); const na = c.inicio || 0, nb = c.fin === undefined ? f.dur : c.fin; seg.style.left = na / f.dur * 100 + '%'; seg.style.width = Math.max(1.5, (nb - na) / f.dur * 100) + '%'; };
        const up = () => { seg.removeEventListener('pointermove', mv); seg.removeEventListener('pointerup', up); tocar('Tiempos', true); pintarTodo(); };
        seg.addEventListener('pointermove', mv); seg.addEventListener('pointerup', up); });
      filas.append(h('div.pista' + (i === st.capa ? '.activo' : ''), { onclick: () => { st.capa = i; pintarTodo(); } }, h('span.nombre', { style: { display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer' }, html: CK.ico(TIPOS[c.tipo][1], 14) }, h('span', c.nombre || TIPOS[c.tipo][0])), barra,
        CK.btn({ ico: c.oculta ? 'ojoNo' : 'ojo', tip: c.oculta ? 'Mostrar capa' : 'Ocultar capa', cls: 'chico plano', on: e => { e.stopPropagation(); ed('Ver capa', () => { c.oculta = !c.oculta; }); pintarLinea(); } })));
    });
    filas.append(h('div.aguja', { style: { position: 'absolute', top: 0, bottom: 0, left: '0%', width: '1px', background: '#fff', marginLeft: '126px', pointerEvents: 'none' } }));
    const ag = filas.querySelector('.aguja'); ag.style.marginLeft = '0'; const cont = h('div', { style: { position: 'relative', marginLeft: '126px', marginRight: '32px', height: 0 } }, ag); ag.style.height = f.capas.length * 28 + 'px';
    const agregar = tipo => ed('Agregar capa', fx => { const c = tipo === 'emisor' ? Object.assign({ tipo, nombre: 'Partículas ' + (fx.capas.length + 1), inicio: 0 }, CK.clone(CKFx.DEF)) : tipo === 'luz' ? { tipo, nombre: 'Luz', inicio: 0, color: '#ffcc66', radio: [30, 30], fuerza: 0.5, parpadeo: 0 } : tipo === 'destello' ? { tipo, nombre: 'Destello', inicio: 0, fin: 0.1, color: '#ffffff', fuerza: 0.5 } : { tipo, nombre: 'Sacudida', inicio: 0, fin: 0.2, fuerza: 2 }; fx.capas.push(c); st.capa = fx.capas.length - 1; });
    lineaT.append(h('div.fila', { style: { marginBottom: '6px' } }, h('b', 'Línea de tiempo'), h('span.nota-txt', 'cada barra es una capa: cuándo entra y cuándo sale'), h('span.crece'),
      ...Object.keys(TIPOS).map(t => CK.btn({ ico: TIPOS[t][1], txt: TIPOS[t][0], cls: 'chico', desc: { emisor: 'Agrega un emisor de partículas: fuego, chispas, humo, polvo, magia.', luz: 'Agrega un resplandor que ilumina alrededor.', destello: 'Un fogonazo que cubre la pantalla un instante: impactos, explosiones.', sacudida: 'Hace temblar la cámara: golpes fuertes.' }[t], on: () => { agregar(t); pintarTodo(); } }))), cont, filas);
  };
  const pintarDer = () => {
    if (!der) return; CK.vaciar(der); const f = FX(); if (!f) { der.append(CK.vacio('fx', 'Ningún efecto abierto', 'Elegí una plantilla de la izquierda (fuego, golpe, curación, bola de fuego…) y ajustala a tu gusto.')); return; }
    der.append(h('div.bloque', h('h3.bloque-tit', 'Efecto'), CK.campo('Nombre', CK.txt(f.nombre, v => { ed('Nombre', x => { x.nombre = v || x.nombre; }); pintarIzq(); })),
      rg('Duración (s)', () => f.dur, v => { f.dur = v; }, 0.1, 6, 0.05, 'Cuánto dura una pasada del efecto.'),
      CK.chk(f.bucle, 'Se repite (ambiente)', v => { ed('Loop', x => { x.bucle = v; }); reiniciar(); }, 'Encendido: fuego, lluvia, auras. Apagado: golpes, explosiones, hechizos que ocurren una vez.'),
      h('div.duo', h('label', h('span.mini-rot', 'Se mueve → (px/s)'), CK.num((f.mov || {}).vx || 0, { step: 10 }, v => { ed('Movimiento', x => { x.mov = x.mov || {}; x.mov.vx = v; }); reiniciar(); })), h('label', h('span.mini-rot', 'Se mueve ↓ (px/s)'), CK.num((f.mov || {}).vy || 0, { step: 10 }, v => { ed('Movimiento', x => { x.mov = x.mov || {}; x.mov.vy = v; }); reiniciar(); }))),
      h('p.nota-txt', 'Con movimiento, el efecto viaja como un proyectil (bola de fuego, flecha mágica) y deja su estela.'),
      (() => { if (!CK.audioJuego && CK.fs.dir('juego')) CK.leerAudioJuego().then(pintarDer); const l = (CK.audioJuego || {}).sfx || []; return h('div.fila.junto', CK.campo('Sonido', CK.sel(f.sonido || '', [['', '(sin sonido)']].concat(l.includes(f.sonido) || !f.sonido ? l : [f.sonido].concat(l)), v => { ed('Sonido', x => { x.sonido = v; }); pintarDer(); }), l.length ? 'Un sonido del juego (assets/audio/sfx) que suena cuando arranca el efecto.' : 'Conectá la carpeta del juego para elegir entre sus sonidos.'), f.sonido ? CK.btn({ ico: 'sonido', tip: 'Escuchar', cls: 'chico', on: () => CK.sonar('assets/audio/sfx/' + f.sonido + '.mp3', f.volumen === undefined ? 0.7 : f.volumen) }) : null); })(),
      f.sonido ? rg('Volumen', () => f.volumen === undefined ? 0.7 : f.volumen, v => { f.volumen = v; }, 0.05, 1, 0.05) : null,
      h('div.fila', { style: { marginTop: '8px' } }, CK.btn({ ico: 'paleta', txt: 'Colores a la paleta', cls: 'chico', desc: 'Cambia todos los colores del efecto por los más cercanos de la paleta del proyecto.', on: () => { aPaleta(); pintarDer(); } }), CK.btn({ ico: 'duplicar', txt: 'Duplicar', cls: 'chico', on: () => { const n = CK.clone(f); n.id = f.id + '_copia_' + Date.now().toString(36).slice(-3); n.nombre = f.nombre + ' (copia)'; CK.P.fx[n.id] = n; CK.tocar(); st.id = n.id; reiniciar(); pintarTodo(); } }), CK.btn({ ico: 'basura', txt: 'Borrar', cls: 'chico peligro', on: async () => { if (await CK.confirmar('Borrar efecto', 'Se borra "' + f.nombre + '".', 'Borrar')) { const fin = CK.hist.datos('Borrar efecto', 'fx', f.id); delete CK.P.fx[f.id]; fin(); st.id = Object.keys(CK.P.fx)[0] || null; reiniciar(); pintarTodo(); } } }))));
    const c = f.capas[st.capa]; if (!c) return;
    const cab = h('div.bloque', h('h3.bloque-tit', { html: CK.ico(TIPOS[c.tipo][1], 16) }, 'Capa: ' + TIPOS[c.tipo][0], CK.btn({ ico: 'duplicar', tip: 'Duplicar capa', cls: 'chico', on: () => { ed('Duplicar capa', x => { x.capas.splice(st.capa + 1, 0, CK.clone(c)); st.capa++; }); pintarTodo(); } }), CK.btn({ ico: 'basura', tip: 'Borrar capa', cls: 'chico peligro', on: () => { ed('Borrar capa', x => { x.capas.splice(st.capa, 1); st.capa = Math.max(0, st.capa - 1); }); pintarTodo(); } })),
      CK.campo('Nombre', CK.txt(c.nombre || '', v => { ed('Nombre de capa', () => { c.nombre = v; }); pintarLinea(); })),
      h('div.duo', h('label', h('span.mini-rot', 'Entra (s)'), CK.num(c.inicio || 0, { min: 0, max: f.dur, step: 0.05 }, v => { ed('Tiempos', () => { c.inicio = v; }); pintarLinea(); })), h('label', h('span.mini-rot', 'Sale (s)'), CK.num(c.fin === undefined || c.fin === null ? f.dur : c.fin, { min: 0, max: f.dur, step: 0.05 }, v => { ed('Tiempos', () => { c.fin = v; }); pintarLinea(); }))));
    der.append(cab);
    if (c.tipo === 'emisor') {
      der.append(h('div.bloque', h('h3.bloque-tit', 'De dónde salen'),
        CK.campo('Forma', CK.sel(c.forma, [['punto', 'Un punto'], ['linea', 'Una línea'], ['circulo', 'Un círculo'], ['anillo', 'Un anillo'], ['area', 'Un área']], v => { ed('Forma', () => { c.forma = v; }); pintarDer(); }), 'La zona donde nacen las partículas.'),
        c.forma !== 'punto' ? rg('Ancho', () => c.ancho, v => { c.ancho = v; }, 0, 240, 1) : null, ['circulo', 'anillo', 'area'].includes(c.forma) ? rg('Alto', () => c.alto, v => { c.alto = v; }, 0, 160, 1, 'En círculo y anillo, un alto menor al ancho da un óvalo acostado (visto desde arriba).') : null,
        h('div.duo', h('label', h('span.mini-rot', 'Corrida →'), CK.num(c.x || 0, {}, v => ed('Posición', () => { c.x = v; }))), h('label', h('span.mini-rot', 'Corrida ↓'), CK.num(c.y || 0, {}, v => ed('Posición', () => { c.y = v; })))),
        rg('Por segundo', () => c.tasa, v => { c.tasa = v; }, 0, 200, 1, 'Cuántas partículas nacen por segundo mientras la capa está activa.'),
        rg('De golpe', () => c.rafaga || 0, v => { c.rafaga = v; }, 0, 80, 1, 'Partículas que salen todas juntas al empezar. Para golpes y explosiones.')));
      der.append(h('div.bloque', h('h3.bloque-tit', 'Cómo se mueven'),
        par('Vida (s)', () => c.vida, 0.05, 5, 0.05, 'Cuánto dura cada partícula. Se elige al azar entre los dos valores.'), par('Velocidad', () => c.vel, 0, 300, 1, 'Rapidez inicial, al azar entre los dos valores.'),
        rg('Dirección °', () => c.angulo, v => { c.angulo = v; }, -180, 180, 5, '0 = derecha, −90 = arriba, 90 = abajo, 180 = izquierda.'), rg('Abanico °', () => c.apertura, v => { c.apertura = v; }, 0, 360, 5, 'Cuánto se abren alrededor de la dirección. 360 = para todos lados.'),
        rg('Gravedad ↓', () => c.gravY, v => { c.gravY = v; }, -400, 400, 10, 'Positiva: caen. Negativa: flotan hacia arriba.'), rg('Viento →', () => c.gravX, v => { c.gravX = v; }, -300, 300, 10),
        rg('Freno', () => c.freno || 0, v => { c.freno = v; }, 0, 10, 0.5, 'Cuánto se frenan con el tiempo. Alto: salen rápido y quedan flotando.'), rg('Vaivén', () => c.onda || 0, v => { c.onda = v; }, 0, 40, 1, 'Se mecen de lado a lado: humo, nieve, chispas que suben.')));
      const cols = CK.muestras(() => c.colores, { alElegir: (hex, e, i) => { if (c.colores.length > 1) { ed('Quitar color', () => { c.colores.splice(i, 1); }); cols.refrescar(); } }, pista: 'Clic para quitarlo. Las partículas pasan por estos colores, de izquierda a derecha, a lo largo de su vida.' });
      const palE = CK.muestras(() => CK.P.estilo.paleta, { chicas: true, alElegir: hex => { ed('Agregar color', () => { c.colores.push(hex); }); cols.refrescar(); }, pista: 'Clic para agregarlo al final.' });
      der.append(h('div.bloque', h('h3.bloque-tit', 'Cómo se ven'),
        CK.campo('Figura', h('div.fila.junto', CK.sel(c.figura, [['pixel', 'Cuadrado'], ['circulo', 'Círculo'], ['chispa', 'Chispa (raya)'], ['cruz', 'Estrella'], ['gota', 'Gota'], ['asset', 'Un asset…']], async v => { if (v === 'asset') { const id = await CK.elegirAsset('Dibujo de la partícula', ['sprite', 'hoja', 'fx', 'ui']); if (!id) { pintarDer(); return; } ed('Figura', () => { c.figura = 'asset'; c.asset = id; }); } else ed('Figura', () => { c.figura = v; }); pintarDer(); }), c.figura === 'asset' && CK.P.assets[c.asset] ? CK.mini(CK.img[c.asset], 24) : null)),
        c.figura === 'asset' ? CK.chk(!!c.animar, 'Recorrer sus cuadros a lo largo de la vida', v => ed('Animar', () => { c.animar = v; })) : null,
        par('Tamaño (px)', () => c.tam, 1, 24, 1, 'Tamaño al nacer y al morir.', 'al nacer', 'al morir'), par('Opacidad', () => c.alfa, 0, 1, 0.05, 'Opacidad al nacer y al morir.', 'al nacer', 'al morir'),
        h('span.campo-rot', 'Colores a lo largo de su vida'), h('div', { style: { margin: '4px 0 8px' } }, cols), h('span.mini-rot', 'Agregar de la paleta'), palE,
        CK.campo('Mezcla', CK.sel(c.mezcla, [['normal', 'Normal'], ['luz', 'Luz (suma brillo)']], v => ed('Mezcla', () => { c.mezcla = v; })), 'Luz: las partículas se suman y brillan donde se juntan. Para fuego y magia.'), rg('Giro', () => c.giro || 0, v => { c.giro = v; }, -12, 12, 0.5, 'Solo para partículas que son un asset.')));
    } else if (c.tipo === 'luz') {
      der.append(h('div.bloque', h('h3.bloque-tit', 'Luz'), CK.campo('Color', CK.color(c.color, v => ed('Color', () => { c.color = v; }, false))), par('Radio (px)', () => c.radio, 2, 200, 1, 'Radio al entrar y al salir.', 'al entrar', 'al salir'), rg('Intensidad', () => c.fuerza, v => { c.fuerza = v; }, 0.05, 1, 0.05), rg('Parpadeo', () => c.parpadeo || 0, v => { c.parpadeo = v; }, 0, 5, 0.5), CK.chk(!!c.apagar, 'Se apaga de a poco', v => ed('Apagar', () => { c.apagar = v; })),
        h('div.duo', h('label', h('span.mini-rot', 'Corrida →'), CK.num(c.x || 0, {}, v => ed('Posición', () => { c.x = v; }))), h('label', h('span.mini-rot', 'Corrida ↓'), CK.num(c.y || 0, {}, v => ed('Posición', () => { c.y = v; }))))));
    } else if (c.tipo === 'destello') der.append(h('div.bloque', h('h3.bloque-tit', 'Destello'), CK.campo('Color', CK.color(c.color, v => ed('Color', () => { c.color = v; }, false))), rg('Intensidad', () => c.fuerza, v => { c.fuerza = v; }, 0.05, 1, 0.05), h('p.nota-txt', 'Cubre toda la pantalla y se desvanece entre "Entra" y "Sale". Usalo corto (0,05 a 0,15 s).')));
    else der.append(h('div.bloque', h('h3.bloque-tit', 'Sacudida'), rg('Fuerza (px)', () => c.fuerza, v => { c.fuerza = v; }, 1, 10, 1), h('p.nota-txt', 'Mueve la cámara al azar y se calma hacia el final. Con 2 o 3 píxeles alcanza para un golpe.')));
  };
  const pintarTodo = () => { pintarIzq(); pintarLinea(); pintarDer(); if (sim && FX()) sim.e = FX(); };

  const crear = raiz => {
    el = raiz; el.style.gridTemplateColumns = '250px 1fr 330px';
    izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } }); der = h('aside.panel');
    cv = h('canvas', { style: { imageRendering: 'pixelated', borderRadius: '8px', border: '1px solid var(--linea)' } }); lineaT = h('div', { style: { padding: '10px 12px', background: 'var(--panel)', borderTop: '1px solid var(--linea)', maxHeight: '250px', overflowY: 'auto' } });
    const bPausa = CK.btn({ ico: 'pausa', tip: 'Pausar / reproducir', tecla: 'Espacio', cls: 'chico plano', on: () => { st.pausa = !st.pausa; bPausa.innerHTML = CK.ico(st.pausa ? 'play' : 'pausa'); } });
    const fondoSel = CK.sel(st.fondo, [['oscuro', 'Fondo oscuro'], ['noche', 'Noche'], ['pasto', 'Pasto'], ['piedra', 'Piedra'], ['claro', 'Claro'], ['mapa', 'Un mapa…']], async v => { st.fondo = v; if (v === 'mapa') { const ms = Object.values(CK.P.mapas); if (!ms.length) { CK.aviso('Todavía no hay mapas en el proyecto.', 'info'); st.fondo = 'oscuro'; fondoSel.value = 'oscuro'; return; } st.mapaFondo = ms.find(m => m.id === (CK.P.ui.mapa || '')) ? CK.P.ui.mapa : ms[0].id; fondoDe = null; } }); fondoSel.style.width = '130px';
    const centro = h('div', { style: { display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } }, h('div', { style: { position: 'relative', display: 'grid', placeItems: 'center', minHeight: 0, overflow: 'hidden' } }, cv,
      h('div.sobre', h('div.tira', bPausa, CK.btn({ ico: 'recargar', tip: 'Reiniciar', desc: 'Vuelve a empezar el efecto desde cero.', tecla: 'R', cls: 'chico plano', on: reiniciar }), h('span.sep'), fondoSel, (() => { const b = CK.btn({ ico: 'pixel', tip: 'Pixelado y en paleta', desc: 'Muestra las partículas con bordes duros y solo con colores de la paleta, como se verían dentro del juego. Las luces siguen suaves.', cls: 'chico plano activo', on: () => { st.pixelado = !st.pixelado; b.classList.toggle('activo', st.pixelado); } }); return b; })()),
        h('div.tira', CK.btn({ ico: 'hoja', txt: 'Hornear a hoja', cls: 'chico', desc: 'Convierte el efecto en una hoja de sprites (cuadros fijos). Sirve en cualquier motor y se puede colocar en el mapa como un objeto animado. Las luces no se hornean.', on: hornearYGuardar }), CK.btn({ ico: 'play', txt: 'GIF', cls: 'chico', desc: 'Descarga el efecto como GIF para revisarlo o mostrarlo.', on: () => { const f = FX(); if (!f) return; const r = hornear(f, 15); CK.descargar(new Blob([CKGif(r.frames, { fps: 15, escala: 3 })], { type: 'image/gif' }), f.id + '.gif'); } })))), lineaT);
    el.append(izq, centro, der);
    CK.on('datos', g => { if (g === 'fx') { if (!FX()) st.id = Object.keys(CK.P.fx)[0] || null; reiniciar(); if (CK.seccion_actual === 'fx') pintarTodo(); } });
  };
  const hornearYGuardar = async () => {
    const f = FX(); if (!f) return; const r = hornear(f, 12); if (!r.frames.length) { CK.aviso('El efecto no dibuja partículas (¿solo tiene luces?).', 'info'); return; }
    const ya = Object.values(CK.P.assets).find(a => a.fxDe === f.id), lienzo = CK.aLienzo(PIX.pack(r.frames, r.frames.length)), cuadros = { fw: r.fw, fh: r.fh, fps: r.fps, bucle: !!f.bucle, ancla: r.ancla };
    if (ya) { const fin = CK.hist.imagen('Hornear efecto', ya.id); CK.asset.poner(ya.id, lienzo); ya.cuadros = cuadros; fin(); CK.aviso('Hoja actualizada: ' + ya.nombre + ' (' + r.frames.length + ' cuadros)'); }
    else { const a = CK.asset.crear({ nombre: 'fx_' + f.id, tipo: 'fx', lienzo, cuadros, origen: 'efecto ' + f.nombre, extra: { fxDe: f.id } }); CK.aviso('Hoja creada: ' + a.nombre + ' (' + r.frames.length + ' cuadros de ' + r.fw + ' × ' + r.fh + '). Está en Animaciones y en Assets del mapa.', 'ok', 5500); }
  };
  /** Completa lo que le falte a un efecto que no nació acá (importado, escrito a mano o por Claude). */
  const completar = () => Object.values(CK.P.fx).forEach(f => { f.capas = f.capas || []; if (!f.dur) f.dur = 1; f.capas.forEach(c => { if (c.tipo === 'emisor') Object.keys(CKFx.DEF).forEach(k => { if (c[k] === undefined) c[k] = CK.clone(CKFx.DEF[k]); }); if (c.tipo === 'luz') { if (!Array.isArray(c.radio)) c.radio = [c.radio || 30, c.radio || 30]; if (c.fuerza === undefined) c.fuerza = 0.5; if (!c.color) c.color = '#ffc46b'; } }); });
  const mostrar = () => { if (!CK.P) return; completar(); if (!FX()) st.id = Object.keys(CK.P.fx)[0] || null; reiniciar(); pintarTodo(); if (!vivo) { vivo = true; lazo.u = 0; requestAnimationFrame(lazo); } };
  const tecla = (e, k) => { if (k === 'r') { reiniciar(); return true; } if (k === ' ') { st.pausa = !st.pausa; return true; } return false; };
  CK.registrar({ id: 'fx', nombre: 'Efectos', corto: 'FX', ico: 'fx', desc: 'Poderes, fuego, golpes, luces y clima: partículas editables con vista previa, exportables como datos o como hoja de sprites.', crear, mostrar, tecla, ocultar: () => { vivo = false; }, alCambiarProyecto: () => { st.id = null; sim = null; } });
})();
