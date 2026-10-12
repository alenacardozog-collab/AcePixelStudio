/* BUSCADOR (Ctrl + K): escribís lo que querés hacer o el nombre de algo y te lleva.
   Busca en: secciones, botones de la sección que estás usando (y de la barra de arriba), assets, mapas, efectos,
   NPC y las recetas de "¿Cómo hago…?". No distingue mayúsculas ni tildes. */
'use strict';
(function () {
  const h = CK.h;
  const B = (CK.buscador = {});
  const norm = t =>
    String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  /** Puntaje: 0 = no coincide. Mejor si empieza igual o coincide al principio de una palabra. */
  const puntaje = (q, texto) => {
    const t = norm(texto);
    if (!q) return 1;
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)) return 60;
    if (t.includes(q)) return 40;
    // todas las palabras de la búsqueda aparecen en algún orden
    const ps = q.split(/\s+/).filter(Boolean);
    if (ps.length > 1 && ps.every(p => t.includes(p))) return 30;
    return 0;
  };
  /** Todo lo que se puede buscar ahora mismo. */
  const fuentes = () => {
    const out = [];
    Object.values(CK.secciones).forEach(s =>
      out.push({ tipo: 'Sección', ico: s.ico, txt: s.nombre, sub: s.desc, extra: s.corto, ir: () => CK.ir(s.id) })
    );
    // botones con nombre de la sección donde estás y de la barra de arriba
    const sec = CK.secciones[CK.foco || CK.seccion_actual];
    const vistos = new Set();
    const juntar = (raiz, donde) => {
      if (!raiz) return;
      raiz.querySelectorAll('button[data-tip], .btn[data-tip]').forEach(b => {
        if (b.disabled || b.closest('.riel-btn, #riel') || !b.offsetParent) return;
        const t = b.dataset.tip,
          k = donde + t;
        if (!t || vistos.has(k)) return;
        vistos.add(k);
        out.push({ tipo: donde, ico: null, txt: t, sub: b.dataset.desc || '', tecla: b.dataset.tecla, ir: () => b.click() });
      });
    };
    if (sec && sec.el) juntar(sec.el, sec.corto || sec.nombre);
    juntar(document.getElementById('barra'), 'Barra');
    if (CK.P) {
      CK.asset.lista().forEach(a =>
        out.push({
          tipo: 'Asset',
          ico: 'imagen',
          txt: a.nombre,
          sub: (a.tipo || '') + (a.carpeta ? ' · ' + a.carpeta : ''),
          extra: (a.etiquetas || []).join(' '),
          ir: () => (a.cuadros ? CK.ir('anim', { asset: a.id }) : CK.ir('pixel', a.id))
        })
      );
      Object.values(CK.P.mapas || {}).forEach(m =>
        out.push({ tipo: 'Mapa', ico: 'mapa', txt: m.nombre, sub: m.w + ' × ' + m.h + ' px', ir: () => CK.ir('mapa', m.id) })
      );
      Object.values(CK.P.fx || {}).forEach(f =>
        out.push({ tipo: 'Efecto', ico: 'fx', txt: f.nombre || f.id, sub: 'Efecto del proyecto', ir: () => CK.ir('fx', f.id) })
      );
      Object.values(CK.P.npcs || {}).forEach(n =>
        out.push({ tipo: 'NPC', ico: 'npc', txt: n.nombre || n.id, sub: 'Personaje', ir: () => CK.ir('npc', n.id) })
      );
    }
    if (CK.guia && CK.guia.recetas)
      CK.guia
        .recetas()
        .forEach(r =>
          out.push({ tipo: '¿Cómo hago…?', ico: 'info', txt: r.titulo, sub: r.seccionNombre, ir: () => CK.guia.abrirReceta(r.id) })
        );
    return out;
  };
  let abierto = null;
  B.abrir = () => {
    if (abierto) return;
    const D = CK.doc();
    let todo = fuentes(),
      res = [],
      sel = 0;
    const entrada = h('input.busc-in', {
      type: 'text',
      placeholder: 'Buscá una acción, sección, asset, mapa o efecto…',
      spellcheck: false
    });
    const lista = h('div.busc-lista');
    const pie = h(
      'div.busc-pie',
      h('span', h('kbd', '↑'), h('kbd', '↓'), ' elegir'),
      h('span', h('kbd', 'Enter'), ' ir'),
      h('span', h('kbd', 'Esc'), ' cerrar')
    );
    const caja = h('div.busc-caja', { role: 'dialog' }, entrada, lista, pie);
    const fondo = h('div.busc-fondo', { onmousedown: e => e.target === fondo && cerrar() }, caja);
    const cerrar = () => {
      fondo.remove();
      abierto = null;
    };
    const ejecutar = r => {
      cerrar();
      if (!r) return;
      setTimeout(() => {
        try {
          r.ir();
        } catch (e) {
          console.error(e);
          CK.aviso(e.message, 'error');
        }
      }, 0);
    };
    const pintar = () => {
      const q = norm(entrada.value.trim());
      res = todo
        .map(r => ({ r, p: Math.max(puntaje(q, r.txt), puntaje(q, r.extra) * 0.8, q.length > 2 ? puntaje(q, r.sub) * 0.4 : 0) }))
        .filter(x => x.p > 0)
        .sort((a, b) => b.p - a.p || (a.r.tipo === 'Sección' ? -1 : 0))
        .slice(0, q ? 40 : 18)
        .map(x => x.r);
      sel = Math.min(sel, Math.max(0, res.length - 1));
      CK.vaciar(lista);
      if (!res.length) lista.append(h('div.busc-vacio', 'Nada coincide con "' + entrada.value + '".'));
      res.forEach((r, i) =>
        lista.append(
          h(
            'button.busc-item' + (i === sel ? '.activo' : ''),
            { type: 'button', onmousemove: () => i !== sel && ((sel = i), marcar()), onclick: () => ejecutar(r) },
            h('span.busc-ico', { html: r.ico ? CK.ico(r.ico, 16) : CK.ico('rayo', 16) }),
            h('span.busc-txt', h('b', r.txt), r.sub ? h('span', r.sub) : null),
            r.tecla ? h('kbd', r.tecla) : null,
            h('span.busc-tipo', r.tipo)
          )
        )
      );
    };
    const marcar = () => {
      [...lista.children].forEach((c, i) => c.classList.toggle('activo', i === sel));
      const a = lista.children[sel];
      if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    };
    entrada.addEventListener('input', () => {
      sel = 0;
      pintar();
    });
    entrada.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cerrar();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!res.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + res.length) % res.length;
        marcar();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        ejecutar(res[sel]);
      }
    });
    D.body.append(fondo);
    abierto = { cerrar };
    pintar();
    setTimeout(() => entrada.focus(), 10);
  };
  B.cerrar = () => abierto && abierto.cerrar();
  B.buscar = q => {
    const n = norm(q);
    return fuentes()
      .map(r => ({ r, p: puntaje(n, r.txt) }))
      .filter(x => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .map(x => x.r);
  };
})();
