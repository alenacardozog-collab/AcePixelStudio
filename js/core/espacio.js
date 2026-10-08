/* ESPACIO DE TRABAJO: paneles que se despegan, se mueven, cambian de tamaño, se ocultan y se vuelven a pegar (como en Photoshop).
   · Cada panel lateral tiene una barrita arriba: arrastrarla lo despega; el botón de la ventana lo despega o lo pega; la × lo oculta.
   · El borde interno de un panel pegado se arrastra para cambiarle el ancho.
   · Las pestañas marcadas como despegables (Capas, Propiedades, Assets, Mapa) se sacan arrastrándolas o con doble clic.
   · Todo se recuerda en este navegador. "Restablecer" vuelve al acomodo de fábrica. */
'use strict';
(function () {
  const h = CK.h, CLAVE = 'ck_espacio_v1';
  let datos = {}; try { datos = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { datos = {}; }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { } };
  const E = CK.espacio = { secciones: {}, pestanas: [], z: 40 };
  CK.iconos.ventanas = '<rect x="3" y="4" width="12" height="10" rx="1.5"/><rect x="9" y="10" width="12" height="10" rx="1.5"/>';
  CK.iconos.despegar = '<rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M12 4h8v8M20 4l-8 8"/>';
  CK.iconos.pegar = '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M15 4v16"/>';
  const avisarCambio = () => { window.dispatchEvent(new Event('resize')); const s = CK.secciones[CK.seccion_actual]; if (s && s.mostrar && s.el) { try { s.mostrar(); } catch (e) { } } };
  const partir = t => { const out = []; let prof = 0, cur = ''; for (const ch of String(t || '')) { if (ch === '(') prof++; if (ch === ')') prof--; if (ch === ' ' && !prof) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
  const dentro = r => { const W = innerWidth, H = innerHeight; r.w = Math.max(200, Math.min(r.w, W - 20)); r.h = Math.max(140, Math.min(r.h, H - 60)); r.x = Math.max(4, Math.min(r.x, W - 80)); r.y = Math.max(50, Math.min(r.y, H - 60)); return r; };
  const alFrente = caja => { caja.style.zIndex = ++E.z; };

  /** Arrastre genérico: mover(dx, dy, e) mientras se arrastra, soltar(e) al final. Devuelve true si llegó a moverse. */
  const arrastrar = (e0, mover, soltar, umbral = 0) => {
    if (e0.button !== 0) return; const x0 = e0.clientX, y0 = e0.clientY; let activo = !umbral;
    const mv = e => { const dx = e.clientX - x0, dy = e.clientY - y0; if (!activo && Math.hypot(dx, dy) < umbral) return; activo = true; e.preventDefault(); mover(dx, dy, e); };
    const up = e => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.body.style.userSelect = ''; if (activo && soltar) soltar(e); };
    document.body.style.userSelect = 'none'; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };

  // ------------------------------------------------------------------ paneles de una sección
  E.preparar = sec => {
    if (!sec.el || E.secciones[sec.id]) return; const base = partir(sec.el.style.gridTemplateColumns), hijos = [...sec.el.children], paneles = [];
    const S = E.secciones[sec.id] = { sec, base, paneles }; datos[sec.id] = datos[sec.id] || {};
    const centro = hijos.findIndex((c, i) => base[c.style.gridColumn ? +c.style.gridColumn - 1 : i] && /fr/.test(base[c.style.gridColumn ? +c.style.gridColumn - 1 : i]));
    let auto = 0;
    hijos.forEach((p, i) => {
      const col = p.style.gridColumn ? parseInt(p.style.gridColumn, 10) - 1 : auto; if (!p.style.gridColumn) auto++;
      if (!p.matches('aside.panel') || !/px$/.test(base[col] || '')) return;
      const lado = i < centro || centro < 0 && col === 0 ? 'izq' : 'der', clave = lado + col, st = datos[sec.id][clave] = Object.assign({ modo: 'pegado', ancho: parseInt(base[col], 10) }, datos[sec.id][clave] || {});
      const P = { el: p, col, lado, clave, st, ancho0: parseInt(base[col], 10), nombre: sec.nombre + ' · panel ' + (lado === 'izq' ? 'izquierdo' : 'derecho') };
      const tit = h('span.acople-tit', P.nombre), bFlot = CK.btn({ ico: 'despegar', tip: 'Despegar', desc: 'Convierte este panel en una ventana suelta que podés mover y agrandar. También se despega arrastrando esta barrita.', cls: 'chico plano', on: () => E.modo(P, P.st.modo === 'flotante' ? 'pegado' : 'flotante') });
      const bOcu = CK.btn({ ico: 'cerrar', tip: 'Ocultar panel', desc: 'Lo saca de la vista para dejar más lugar. Vuelve desde el botón "Espacio" de la barra de arriba.', cls: 'chico plano', on: () => E.modo(P, 'oculto') });
      P.barra = h('div.acople-barra', h('span.acople-agarre'), tit, bFlot, bOcu); P.bFlot = bFlot;
      P.caja = h('div.acople-caja'); P.borde = h('div.acople-borde.' + lado); P.hueco = h('div.acople', { style: { gridColumn: p.style.gridColumn, gridRow: p.style.gridRow } });
      p.replaceWith(P.hueco); p.style.gridColumn = p.style.gridRow = ''; P.caja.append(P.barra, p); P.hueco.append(P.caja, P.borde);
      // arrastrar la barrita: despega y mueve; soltar contra su borde lo vuelve a pegar
      P.barra.addEventListener('pointerdown', e => {
        if (e.target.closest('.btn')) return; alFrente(P.caja); let r0 = null;
        arrastrar(e, (dx, dy, ev) => {
          if (P.st.modo !== 'flotante') { const r = P.caja.getBoundingClientRect(); Object.assign(P.st, { x: r.left, y: r.top, w: r.width, h: Math.min(r.height, innerHeight * 0.7) }); E.modo(P, 'flotante', true); }
          if (!r0) r0 = { x: P.st.x, y: P.st.y }; P.st.x = r0.x + dx; P.st.y = r0.y + dy; colocar(P); zona(P, ev, true);
        }, ev => { if (zona(P, ev, false)) E.modo(P, 'pegado'); else { dentro(P.st); colocar(P); guardar(); } }, 7);
      });
      P.barra.addEventListener('dblclick', e => { if (!e.target.closest('.btn')) E.modo(P, P.st.modo === 'flotante' ? 'pegado' : 'flotante'); });
      P.caja.addEventListener('pointerdown', () => { if (P.st.modo === 'flotante') alFrente(P.caja); }, true);
      // borde interno: cambia el ancho del panel pegado
      P.borde.addEventListener('pointerdown', e => { const a0 = P.st.ancho; P.borde.classList.add('activo'); arrastrar(e, dx => { P.st.ancho = Math.max(170, Math.min(640, a0 + (lado === 'izq' ? dx : -dx))); aplicar(S); }, () => { P.borde.classList.remove('activo'); guardar(); avisarCambio(); }); });
      P.borde.addEventListener('dblclick', () => { P.st.ancho = P.ancho0; aplicar(S); guardar(); avisarCambio(); });
      new ResizeObserver(() => { if (P.st.modo !== 'flotante' || !P.caja.offsetWidth) return; const r = P.caja.getBoundingClientRect(); if (Math.abs(r.width - P.st.w) > 1 || Math.abs(r.height - P.st.h) > 1) { P.st.w = r.width; P.st.h = r.height; guardar(); } }).observe(P.caja);
      paneles.push(P);
    });
    aplicar(S);
  };
  /** Zona de pegado: el costado de la sección donde vive el panel. */
  let marca = null;
  const zona = (P, ev, mostrar) => {
    const a = E.secciones[CK.seccion_actual], r = a && a.sec.el.getBoundingClientRect(); if (!r) return false;
    const cerca = P.lado === 'izq' ? ev.clientX < r.left + 46 : ev.clientX > r.right - 46;
    if (!marca) { marca = h('div.acople-zona'); document.body.append(marca); }
    marca.style.display = mostrar && cerca ? '' : 'none'; if (mostrar && cerca) Object.assign(marca.style, { top: r.top + 'px', height: r.height + 'px', width: P.st.ancho + 'px', left: (P.lado === 'izq' ? r.left : r.right - P.st.ancho) + 'px' });
    return cerca;
  };
  const colocar = P => { Object.assign(P.caja.style, { left: P.st.x + 'px', top: P.st.y + 'px', width: P.st.w + 'px', height: P.st.h + 'px' }); };
  const aplicar = S => {
    const cols = S.base.slice();
    S.paneles.forEach(P => {
      const m = P.st.modo; cols[P.col] = m === 'pegado' ? P.st.ancho + 'px' : '0px';
      P.caja.classList.toggle('flotante', m === 'flotante'); P.caja.style.display = m === 'oculto' ? 'none' : ''; P.borde.style.display = m === 'pegado' ? '' : 'none'; P.hueco.classList.toggle('vacio', m !== 'pegado');
      if (m === 'flotante') { if (P.st.x === undefined) { const r = S.sec.el.getBoundingClientRect(); Object.assign(P.st, { w: P.st.ancho, h: Math.min(560, r.height - 40), x: P.lado === 'izq' ? r.left + 70 : r.right - P.st.ancho - 30, y: r.top + 30 }); } dentro(P.st); colocar(P); if (!P.caja.style.zIndex) alFrente(P.caja); }
      else Object.assign(P.caja.style, { left: '', top: '', width: '', height: '', zIndex: '' });
      P.bFlot.innerHTML = CK.ico(m === 'flotante' ? 'pegar' : 'despegar', 16); CK.tip(P.bFlot, m === 'flotante' ? 'Pegar' : 'Despegar', m === 'flotante' ? 'Vuelve a poner este panel en su costado. También podés arrastrarlo hasta ese borde o hacer doble clic en la barrita.' : 'Convierte este panel en una ventana suelta que podés mover y agrandar. También se despega arrastrando esta barrita.');
    });
    S.sec.el.style.gridTemplateColumns = cols.join(' ');
  };
  E.modo = (P, modo, sinAviso) => { P.st.modo = modo; const S = Object.values(E.secciones).find(s => s.paneles.includes(P)); aplicar(S); guardar(); if (marca) marca.style.display = 'none'; avisarCambio(); if (!sinAviso && modo === 'oculto') CK.aviso('Panel oculto. Vuelve desde "Espacio", en la barra de arriba.', 'info', 3500); };

  // ------------------------------------------------------------------ pestañas despegables
  const pest0 = CK.pestanas;
  CK.pestanas = (tabs, inicial, o) => {
    if (!o || !o.despegable) return pest0(tabs, inicial);
    const clave = 'pest:' + o.id; const st = datos[clave] = datos[clave] || {};
    const cab = h('div.pest'), cuerpo = h('div.pest-cuerpo'), cont = h('div.pest-caja', cab, cuerpo), flot = {}; let act = inicial || tabs[0].id;
    const suelta = id => !!(st[id] && st[id].suelta === true);
    const ventana = t => {
      if (flot[t.id]) return flot[t.id]; const s = st[t.id], cu = h('div.panel.acople-cuerpo');
      const caja = h('div.acople-caja.flotante.de-pest', h('div.acople-barra', h('span.acople-agarre'), h('span.acople-tit', { html: t.ico ? CK.ico(t.ico, 14) : '' }, ' ' + t.txt), CK.btn({ ico: 'pegar', tip: 'Pegar', desc: 'Devuelve esta ventana a su lugar entre las pestañas. También con doble clic en la barrita.', cls: 'chico plano', on: () => soltar(t.id, false) })), cu);
      const barra = caja.firstChild; barra.addEventListener('pointerdown', e => { if (e.target.closest('.btn')) return; alFrente(caja); const r0 = { x: s.x, y: s.y }; arrastrar(e, (dx, dy) => { s.x = r0.x + dx; s.y = r0.y + dy; caja.style.left = s.x + 'px'; caja.style.top = s.y + 'px'; }, () => { dentro(s); caja.style.left = s.x + 'px'; caja.style.top = s.y + 'px'; guardar(); }, 3); });
      barra.addEventListener('dblclick', e => { if (!e.target.closest('.btn')) soltar(t.id, false); }); caja.addEventListener('pointerdown', () => alFrente(caja), true);
      new ResizeObserver(() => { if (!caja.offsetWidth) return; const r = caja.getBoundingClientRect(); if (Math.abs(r.width - s.w) > 1 || Math.abs(r.height - s.h) > 1) { s.w = r.width; s.h = r.height; guardar(); } }).observe(caja);
      (cont.closest('.area') || document.body).append(caja); return (flot[t.id] = { caja, cu });
    };
    const soltar = (id, v, pos) => {
      const t = tabs.find(x => x.id === id); if (!t) return; const s = st[id] = st[id] || {};
      if (v) { const r = cont.getBoundingClientRect(), n = Object.keys(st).filter(k => st[k] && st[k].suelta === true).length; Object.assign(s, { suelta: true, w: s.w || Math.max(260, r.width), h: s.h || 380, x: pos ? pos.x : s.x !== undefined ? s.x : r.left - Math.max(260, r.width) - 16 - n * 24, y: pos ? pos.y : s.y !== undefined ? s.y : r.top + 40 + n * 30 }); dentro(s); }
      else { s.suelta = false; if (flot[id]) { flot[id].caja.remove(); delete flot[id]; } act = id; }
      guardar(); pintar();
    };
    const pintar = () => {
      CK.vaciar(cab); const pegadas = tabs.filter(t => !suelta(t.id)); if (suelta(act) && pegadas.length) act = pegadas[0].id;
      pegadas.forEach(t => {
        const b = h('button' + (t.id === act ? '.activo' : ''), { type: 'button', html: t.ico ? CK.ico(t.ico, 16) : '', onclick: () => { act = t.id; pintar(); }, ondblclick: () => soltar(t.id, true) }, h('span', t.txt));
        CK.tip(b, t.txt, (t.desc ? t.desc + ' ' : '') + 'Arrastrala hacia afuera (o doble clic) para despegarla como ventana.');
        b.addEventListener('pointerdown', e => arrastrar(e, () => { }, ev => soltar(t.id, true, { x: ev.clientX - 120, y: ev.clientY - 10 }), 22));
        cab.append(b);
      });
      if (o.apilable && pegadas.length > 1) { const b = CK.btn({ ico: st._apilado ? 'pegar' : 'lista', tip: st._apilado ? 'Volver a pestañas' : 'Apilar', desc: st._apilado ? 'Vuelve a mostrar una pestaña por vez.' : 'Muestra todas las pestañas una debajo de la otra, cada una con su alto. El borde entre dos se arrastra para agrandar una y achicar la otra.', cls: 'chico plano' + (st._apilado ? ' activo' : ''), on: () => { st._apilado = !st._apilado; guardar(); pintar(); } }); b.classList.add('pest-apilar'); cab.append(b); }
      if (st._apilado && pegadas.length > 1) {
        [...cab.querySelectorAll('button:not(.pest-apilar)')].forEach(b => { b.classList.remove('activo'); b.onclick = () => { const s = cuerpo.querySelector('[data-pila="' + b.dataset.pila + '"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }; });
        pegadas.forEach((t, i) => cab.querySelectorAll('button:not(.pest-apilar)')[i].dataset.pila = t.id);
        const sc = cuerpo.scrollTop; CK.vaciar(cuerpo); st._altos = st._altos || {}; st._cerradas = st._cerradas || {};
        pegadas.forEach(t => {
          const cerrada = !!st._cerradas[t.id], caja = h('div.pila-cuerpo', { style: { height: (st._altos[t.id] || o.alto || 250) + 'px', display: cerrada ? 'none' : '' } }), borde = h('div.pila-borde', { style: { display: cerrada ? 'none' : '' } });
          const cabeza = h('div.pila-cab', { 'data-pila': t.id, html: CK.ico(cerrada ? 'flechaD' : 'flechaAb', 12) + (t.ico ? CK.ico(t.ico, 14) : ''), onclick: () => { st._cerradas[t.id] = !cerrada; guardar(); pintar(); } }, h('span', t.txt));
          CK.tip(cabeza, t.txt, 'Clic para plegar o desplegar. Arrastrá la franja de abajo para cambiarle el alto.');
          borde.addEventListener('pointerdown', e => { const a0 = caja.offsetHeight; borde.classList.add('activo'); arrastrar(e, (dx, dy) => { const a = Math.max(60, Math.min(900, a0 + dy)); caja.style.height = a + 'px'; st._altos[t.id] = a; }, () => { borde.classList.remove('activo'); guardar(); window.dispatchEvent(new Event('resize')); }); });
          borde.addEventListener('dblclick', () => { delete st._altos[t.id]; guardar(); pintar(); });
          cuerpo.append(cabeza, caja, borde); if (!cerrada) t.pintar(caja);
        });
        cuerpo.scrollTop = sc;
        tabs.filter(x => suelta(x.id)).forEach(x => { const v = ventana(x), s = st[x.id], sc2 = v.cu.scrollTop; Object.assign(v.caja.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' }); if (!v.caja.style.zIndex) alFrente(v.caja); CK.vaciar(v.cu); x.pintar(v.cu); v.cu.scrollTop = sc2; });
        return;
      }
      CK.vaciar(cuerpo); const t = pegadas.find(x => x.id === act); if (t) t.pintar(cuerpo); else cuerpo.append(h('div.bloque', h('p.nota-txt', 'Todas las pestañas están despegadas. Doble clic en la barrita de una ventana la devuelve acá.')));
      tabs.filter(x => suelta(x.id)).forEach(x => { const v = ventana(x), s = st[x.id], sc = v.cu.scrollTop; Object.assign(v.caja.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' }); if (!v.caja.style.zIndex) alFrente(v.caja); CK.vaciar(v.cu); x.pintar(v.cu); v.cu.scrollTop = sc; });
    };
    cont.refrescar = pintar; cont.ir = id => { if (!suelta(id)) act = id; pintar(); }; cont.actual = () => act; cont.visible = id => act === id || suelta(id) || !!st._apilado; cont.apilar = v => { st._apilado = !!v; guardar(); pintar(); }; cont.suelta = suelta; cont.soltar = soltar; cont.tabs = tabs; cont.nombre = o.nombre || o.id;
    cont.restablecer = () => { Object.keys(flot).forEach(id => { flot[id].caja.remove(); delete flot[id]; }); Object.keys(st).forEach(k => delete st[k]); act = inicial || tabs[0].id; pintar(); };
    E.pestanas.push(cont); pintar(); return cont;
  };

  // ------------------------------------------------------------------ restablecer y menú
  E.restablecer = soloActual => {
    Object.values(E.secciones).forEach(S => { if (soloActual && S.sec.id !== CK.seccion_actual) return; S.paneles.forEach(P => { Object.keys(P.st).forEach(k => delete P.st[k]); Object.assign(P.st, { modo: 'pegado', ancho: P.ancho0 }); }); aplicar(S); });
    E.pestanas.forEach(p => { if (!soloActual || p.isConnected && p.offsetParent !== null) p.restablecer(); });
    if (!soloActual) { Object.keys(datos).forEach(k => { if (!E.secciones[k] && !/^pest:/.test(k)) delete datos[k]; }); }
    guardar(); avisarCambio(); CK.aviso(soloActual ? 'Esta sección volvió a su acomodo original.' : 'Todo el espacio de trabajo volvió a su acomodo original.');
  };
  E.ventana = () => {
    const S = E.secciones[CK.seccion_actual], cuerpo = h('div'), cerrar = () => { const v = cuerpo.closest('.ventana'); if (v) v.cerrar(null); };
    const fila = (nombre, modo, alCambiar) => h('div.fila.junto', { style: { marginBottom: '6px' } }, h('span.crece', nombre), (() => { const e = CK.sel(modo, [['pegado', 'Pegado'], ['flotante', 'Ventana suelta'], ['oculto', 'Oculto']], alCambiar); e.style.cssText = 'width:150px;flex:none'; return e; })());
    const ps = S ? S.paneles : [], pt = E.pestanas.filter(p => p.isConnected && p.offsetParent !== null);
    cuerpo.append(CK.seccion('Paneles de ' + (S ? S.sec.nombre : 'esta sección'), ps.length ? ps.map(P => fila(P.lado === 'izq' ? 'Panel izquierdo' : 'Panel derecho', P.st.modo, v => E.modo(P, v, true))) : h('p.nota-txt', 'Esta sección no tiene paneles laterales.')));
    pt.forEach(p => cuerpo.append(CK.seccion('Pestañas', p.tabs.map(t => fila(t.txt, p.suelta(t.id) ? 'flotante' : 'pegado', v => p.soltar(t.id, v !== 'pegado')).firstChild.parentNode))));
    pt.forEach(() => cuerpo.querySelectorAll('section:last-of-type select option[value=oculto]').forEach(o => o.remove()));
    cuerpo.append(CK.seccion('Cómo se usa', h('p.nota-txt', 'Arrastrá la barrita de arriba de un panel para despegarlo; soltalo contra su costado (se marca en dorado) o hacé doble clic en la barrita para pegarlo. El borde interno de un panel pegado se arrastra para cambiarle el ancho (doble clic: ancho original). Las ventanas sueltas se agrandan desde su esquina inferior derecha. Las pestañas Capas, Propiedades, Assets y Mapa se despegan arrastrándolas hacia afuera o con doble clic, y así podés verlas todas a la vez.')),
      h('div.fila', { style: { marginTop: '10px' } }, CK.btn({ ico: 'recargar', txt: 'Restablecer esta sección', desc: 'Devuelve los paneles de la sección abierta a su lugar y tamaño originales.', on: () => { E.restablecer(true); cerrar(); } }), CK.btn({ ico: 'recargar', txt: 'Restablecer todo', cls: 'peligro', desc: 'Devuelve todos los paneles, ventanas y pestañas de todas las secciones a como venían. Por si algo se salió de control.', on: () => { E.restablecer(false); cerrar(); } })));
    CK.ventana({ titulo: 'Espacio de trabajo', ancho: 470, cuerpo, botones: [{ txt: 'Cerrar', valor: false }] });
  };
  window.addEventListener('resize', () => { Object.values(E.secciones).forEach(S => S.paneles.forEach(P => { if (P.st.modo === 'flotante') { dentro(P.st); colocar(P); } })); });
  // atajo de emergencia: Ctrl + Mayús + 0 restablece todo aunque no se vea ningún botón
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '0' || e.key === ')' || e.code === 'Digit0')) { e.preventDefault(); E.restablecer(false); } });
})();
