/* BASE: espacio de nombres CK, utilidades, iconos, piezas de interfaz (botones, campos, avisos, ventanas, indicadores). */
'use strict';
window.CK = { secciones: {}, orden: [], _ev: {}, v: '1.0' };

// append() tolerante: ignora null / false / undefined y aplana listas (así se pueden pasar piezas opcionales sin que aparezca "null")
(function () { const orig = Element.prototype.append; Element.prototype.append = function (...kids) { const plano = []; const sumar = c => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(sumar); else plano.push(c); }; kids.forEach(sumar); return orig.apply(this, plano); }; })();

// ---------------------------------------------------------------- eventos y utilidades
CK.on = (ev, fn) => { (CK._ev[ev] = CK._ev[ev] || []).push(fn); };
CK.emit = (ev, a, b) => { (CK._ev[ev] || []).forEach(fn => { try { fn(a, b); } catch (e) { console.error(e); } }); };
CK.uid = (p = 'id') => p + '_' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
CK.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
CK.clone = o => JSON.parse(JSON.stringify(o));
CK.slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sin_nombre';
CK.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
CK.fecha = t => { const d = new Date(t); return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); };

/** Crea un elemento: h('div.clase#id', {attr}, hijos…). on* = eventos; html = innerHTML. */
CK.h = (sel, attrs, ...kids) => {
  const m = sel.match(/^([a-z0-9]+)?(.*)$/i), el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][^.#]+/g) || []).forEach(t => { if (t[0] === '.') el.classList.add(t.slice(1)); else el.id = t.slice(1); });
  if (attrs && (attrs.nodeType || typeof attrs !== 'object' || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const k in (attrs || {})) {
    const v = attrs[k]; if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v; else el.setAttribute(k, v === true ? '' : v);
  }
  const add = c => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c.nodeType ? c : document.createTextNode(String(c))); };
  kids.forEach(add);
  return el;
};
CK.vaciar = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

// ---------------------------------------------------------------- iconos (trazo, 24×24)
const I = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  estilo: '<path d="M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.9 0-1.3-1-1.7-1-2.8 0-1 .8-1.8 1.9-1.8H17a4 4 0 004-4c0-4.1-4-7.5-9-7.5z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="7.8" r="1.2" fill="currentColor"/>',
  mapa: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  convertir: '<rect x="3" y="4" width="8" height="8" rx="1"/><path d="M13 8h4a2 2 0 012 2v3"/><path d="M16.5 10.5L19 13l2.5-2.5"/><path d="M13 15h2v2h-2zM17 15h2v2h-2zM13 19h2v2h-2zM17 19h2v2h-2zM15 17h2v2h-2z" fill="currentColor" stroke="none"/>',
  texturas: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/>',
  pixel: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  anim: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/><path d="M10.5 9.5v5l4-2.5z" fill="currentColor"/>',
  fx: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6z"/>',
  npc: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.2 0 2.300.3 3.200.7"/><path d="M14 13h7v5h-3l-2 2v-2h-2z"/>',
  revisor: '<path d="M12 3l8 3v6c0 4.500-3.200 8-8 9-4.800-1-8-4.500-8-9V6z"/><path d="M8.5 12l2.500 2.500 4.500-5"/>',
  notas: '<path d="M5 3h14v12l-6 6H5z"/><path d="M13 21v-6h6"/><path d="M8 8h8M8 12h5"/>',
  portfolio: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 15l5-4 4 3 3-2 6 4"/><circle cx="15.500" cy="8.500" r="1.500"/>',
  assets: '<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z"/><path d="M4 7.500l8 4.500 8-4.500M12 12v9"/>',
  guardar: '<path d="M5 3h11l4 4v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M8 3v5h7V3M7 21v-7h10v7"/>',
  exportar: '<path d="M12 15V3"/><path d="M7.500 7.500L12 3l4.500 4.500"/><path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5"/>',
  importar: '<path d="M12 3v12"/><path d="M7.500 10.500L12 15l4.500-4.500"/><path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5"/>',
  probar: '<rect x="2" y="7" width="20" height="11" rx="5.500"/><path d="M7 10.500v4M5 12.500h4"/><circle cx="15.500" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13.500" r="1" fill="currentColor"/>',
  deshacer: '<path d="M8 5L3 10l5 5"/><path d="M3 10h11a6 6 0 010 12h-3"/>',
  rehacer: '<path d="M16 5l5 5-5 5"/><path d="M21 10H10a6 6 0 000 12h3"/>',
  carpeta: '<path d="M3 6a1 1 0 011-1h5l2 2.500h9a1 1 0 011 1V19a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 115 0c0 1.700-2.500 2-2.500 4"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
  version: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.400"/><path d="M3 4v4h4"/><path d="M12 7.500V12l3 2"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/>',
  seleccionar: '<path d="M5 3l14 8-6 1.500L11 19z"/>',
  mover: '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  escalar: '<path d="M14 4h6v6M10 20H4v-6"/><path d="M20 4l-7 7M4 20l7-7"/>',
  rotar: '<path d="M20 12a8 8 0 11-2.500-5.800"/><path d="M20 3.500V8h-4.500"/>',
  voltearH: '<path d="M12 3v18" stroke-dasharray="2 2.500"/><path d="M9 7L3 17h6zM15 7l6 10h-6z"/>',
  voltearV: '<path d="M3 12h18" stroke-dasharray="2 2.500"/><path d="M7 9l10-6v6zM7 15l10 6v-6z"/>',
  mano: '<path d="M8 12V5.500a1.500 1.500 0 013 0V11M11 10.500V4a1.500 1.500 0 013 0v6.500M14 10.500V5.500a1.500 1.500 0 013 0V14c0 4-2.500 7-6 7-3 0-4.500-1.500-6-4l-2-3.500a1.500 1.500 0 012.500-1.500L8 14"/>',
  lupa: '<circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500L21 21"/>',
  lupaMas: '<circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500L21 21M8 10.500h5M10.500 8v5"/>',
  lupaMenos: '<circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500L21 21M8 10.500h5"/>',
  pincel: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M6 18c-1 1.500-2 2-3 2 .500-1 1-2 1-4"/>',
  lapiz: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  borrador: '<path d="M4 15l9-9a1.500 1.500 0 012 0l4 4a1.500 1.500 0 010 2l-7 7H8z"/><path d="M9 10l6 6M6 20h14"/>',
  balde: '<path d="M4 12l7-7 8 8-6 6a2 2 0 01-3 0l-6-6z"/><path d="M11 5L8.500 2.500M4.500 12h14"/><path d="M20 16.500c1 1.300 1.500 2.100 1.500 3a1.500 1.500 0 01-3 0c0-.900.500-1.700 1.500-3z" fill="currentColor"/>',
  terreno: '<path d="M2 18c3-5 5-8 7-8s3 4 5 4 3-6 5-6 2 3 3 5"/><path d="M2 21h20"/>',
  caminar: '<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6-3-3 1.500-5 4 3 3 1M8 12l1.500-5M12 15l3 2 1 4"/>',
  bloquear: '<circle cx="12" cy="12" r="9"/><path d="M5.600 5.600l12.800 12.800"/>',
  colision: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2.500"/><rect x="9" y="12" width="6" height="5" fill="currentColor" stroke="none" opacity=".55"/>',
  luz: '<path d="M9 17h6M10 20.500h4"/><path d="M12 3a6 6 0 00-3.500 10.900c.500.400.500 1 .500 1.600V17h6v-1.500c0-.600 0-1.200.500-1.600A6 6 0 0012 3z"/>',
  nota: '<path d="M5 3h14v12l-6 6H5z"/><path d="M13 21v-6h6"/>',
  claqueta: '<path d="M3 9h18v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M3 9l1-4 16.500-2 .500 3.500zM8 4.500l2 4M13 3.800l2 4.500"/>',
  punto: '<path d="M12 21s-7-6.500-7-11.500a7 7 0 0114 0C19 14.500 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
  rect: '<rect x="4" y="5" width="16" height="14" rx="1"/>',
  rectLleno: '<rect x="4" y="5" width="16" height="14" rx="1" fill="currentColor"/>',
  linea: '<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.500" fill="currentColor"/><circle cx="19" cy="5" r="1.500" fill="currentColor"/>',
  elipse: '<ellipse cx="12" cy="12" rx="8.500" ry="6.500"/>',
  gotero: '<path d="M14 6l4 4M12.500 7.500l4 4-8 8H5v-3.500z"/><path d="M15 5a2.100 2.100 0 013-3l4 4a2.100 2.100 0 01-3 3"/>',
  varita: '<path d="M4 20L15 9M13.500 7.500l3 3"/><path d="M18 2v3M16.500 3.500h3M21 8v2M20 9h2M9 3v2M8 4h2"/>',
  lazo: '<path d="M12 4c5 0 8.500 2.500 8.500 5.500S17 15 12 15 3.500 12.500 3.500 9.500 7 4 12 4z" stroke-dasharray="3 2"/><path d="M7 14.500c-1 1-1 3 1 3.500s2 2-1 3"/>',
  selRect: '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2.500"/>',
  espejo: '<path d="M12 2.500v19" stroke-dasharray="2 2.500"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  capas: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.500l9 5 9-5M3 17l9 5 9-5"/>',
  ojo: '<path d="M2 12s3.500-6.500 10-6.500S22 12 22 12s-3.500 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/>',
  ojoNo: '<path d="M4 4l16 16"/><path d="M9.900 6C10.600 5.700 11.300 5.500 12 5.500 18.500 5.500 22 12 22 12s-1 1.900-3 3.600M14.500 18c-.800.300-1.600.500-2.500.500C5.500 18.500 2 12 2 12s1.200-2.300 3.500-4"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="1.500"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  candadoNo: '<rect x="5" y="11" width="14" height="10" rx="1.500"/><path d="M8 11V8a4 4 0 017.500-1.900"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  basura: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  duplicar: '<rect x="8" y="8" width="12" height="12" rx="1.500"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  subir: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  bajar: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  grupo: '<rect x="3" y="3" width="18" height="18" rx="1.500" stroke-dasharray="3 2.500"/><rect x="7" y="7" width="6" height="6"/><rect x="11" y="11" width="6" height="6"/>',
  grilla: '<path d="M4 4h16v16H4zM4 9.300h16M4 14.700h16M9.300 4v16M14.700 4v16"/>',
  iman: '<path d="M5 4h5v8a2 2 0 004 0V4h5v8a7 7 0 01-14 0z"/><path d="M5 8h5M14 8h5"/>',
  ok: '<path d="M4.500 12.500l5 5L19.500 7"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  alerta: '<path d="M12 3.500L22 20H2z"/><path d="M12 10v5"/><circle cx="12" cy="17.300" r=".8" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.700" r=".9" fill="currentColor"/>',
  imagen: '<rect x="3" y="4" width="18" height="16" rx="1.500"/><path d="M3 16l5-5 4 4 3-3 6 5"/><circle cx="15" cy="9" r="1.500"/>',
  play: '<path d="M7 4.500v15l12-7.500z" fill="currentColor"/>',
  pausa: '<path d="M7 5v14M17 5v14" stroke-width="3"/>',
  parar: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>',
  anterior: '<path d="M17 5v14l-9-7z" fill="currentColor"/><path d="M6 5v14"/>',
  siguiente: '<path d="M7 5v14l9-7z" fill="currentColor"/><path d="M18 5v14"/>',
  bucle: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 013-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 01-3 3H4"/>',
  cebolla: '<rect x="3" y="7" width="10" height="12" rx="1" opacity=".45"/><rect x="7" y="5" width="10" height="12" rx="1" opacity=".7"/><rect x="11" y="3" width="10" height="12" rx="1"/>',
  fuego: '<path d="M12 21c-3.500 0-6-2.500-6-6 0-3 2-4.500 3-7 2 1 2.500 2.500 2.500 4 1.500-1.500 2-4 1.500-8 3.500 2 5 6 5 11 0 3.500-2.500 6-6 6z"/>',
  rayo: '<path d="M13 2L5 13.500h6L10 22l8-11.500h-6z"/>',
  particulas: '<circle cx="6" cy="17" r="2.200"/><circle cx="12.500" cy="11" r="1.800"/><circle cx="18" cy="6" r="1.300"/><circle cx="17" cy="15" r="1"/><circle cx="8" cy="8" r="1"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.800-4 3.800-6.500 8-6.500s7.200 2.500 8 6.500"/>',
  chat: '<path d="M4 5h16v11H11l-5 4v-4H4z"/><path d="M8 9h8M8 12.500h5"/>',
  recortar: '<path d="M7 2v15h15M2 7h15v15"/>',
  paleta: '<rect x="3" y="3" width="7.500" height="7.500" rx="1" fill="currentColor"/><rect x="13.500" y="3" width="7.500" height="7.500" rx="1"/><rect x="3" y="13.500" width="7.500" height="7.500" rx="1"/><rect x="13.500" y="13.500" width="7.500" height="7.500" rx="1" fill="currentColor" opacity=".5"/>',
  limpiar: '<path d="M14 3l7 7-9 9H7l-3-3z"/><path d="M9 8l7 7M4 21h16"/><path d="M4 6l.700 1.800L6.500 8.500l-1.800.700L4 11l-.700-1.800L1.500 8.500l1.800-.700z" fill="currentColor" stroke="none"/>',
  contorno: '<path d="M12 4l7 4v8l-7 4-7-4V8z" stroke-width="2.600"/>',
  mosaico: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  dado: '<rect x="4" y="4" width="16" height="16" rx="2.500"/><circle cx="8.500" cy="8.500" r="1.200" fill="currentColor"/><circle cx="15.500" cy="15.500" r="1.200" fill="currentColor"/><circle cx="12" cy="12" r="1.200" fill="currentColor"/><circle cx="15.500" cy="8.500" r="1.200" fill="currentColor"/><circle cx="8.500" cy="15.500" r="1.200" fill="currentColor"/>',
  transicion: '<path d="M3 3h18v18H3z"/><path d="M3 14c3-3 5 1 8-2s4-6 10-5v14H3z" fill="currentColor" opacity=".5"/>',
  sombra: '<circle cx="12" cy="9" r="5"/><ellipse cx="12" cy="19" rx="7" ry="2.200" fill="currentColor" opacity=".5" stroke="none"/>',
  centrar: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="2.500"/>',
  prefab: '<path d="M4 8l8-4.500L20 8v8l-8 4.500L4 16z"/><path d="M12 12v8.500M4 8l8 4 8-4"/><circle cx="18.500" cy="5.500" r="3" fill="currentColor" stroke="none"/>',
  enlace: '<path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400L12 5.600"/><path d="M14 10a4.500 4.500 0 00-6.400 0l-3 3A4.500 4.500 0 0011 19.400l1-1"/>',
  recargar: '<path d="M20 12a8 8 0 11-2.500-5.800"/><path d="M20 3.500V8h-4.500"/>',
  flechaD: '<path d="M9 5l7 7-7 7"/>',
  flechaAb: '<path d="M5 9l7 7 7-7"/>',
  estrella: '<path d="M12 3l2.700 5.800 6.300.800-4.600 4.300 1.200 6.200L12 17l-5.600 3.100 1.200-6.200L3 9.600l6.300-.800z"/>',
  puerta: '<path d="M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M3 21h18"/><circle cx="14.500" cy="12.500" r="1" fill="currentColor"/>',
  linterna: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  tiempo: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.500 2"/>',
  texto: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  teclado: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  hoja: '<rect x="3" y="6" width="5" height="12"/><rect x="9.500" y="6" width="5" height="12"/><rect x="16" y="6" width="5" height="12"/>',
  comparar: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 3v18"/><path d="M8.5 10L6 12l2.5 2M15.5 10l2.5 2-2.5 2"/>',
  sonido: '<path d="M4 10v4h3l5 4V6L7 10z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  tamano: '<path d="M4 4h16v16H4z"/><path d="M8 4v3M12 4v5M16 4v3M4 8h3M4 12h5M4 16h3"/>'
};
// Corrige números con ceros sobrantes escritos a mano (".500" → ".5") para que el SVG quede limpio.
Object.keys(I).forEach(k => { I[k] = I[k].replace(/(\d*\.\d*?[1-9])0+(?=[^\d]|$)/g, '$1').replace(/(\d)\.0+(?=[^\d]|$)/g, '$1'); });
CK.iconos = I;
CK.ico = (n, tam) => `<svg class="ico" viewBox="0 0 24 24" width="${tam || 20}" height="${tam || 20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.info}</svg>`;

// ---------------------------------------------------------------- indicadores (resalta al pasar, explica al detenerse)
CK.verIndicadores = true;
(function () {
  let timer = null, caja = null, actual = null;
  const ocultar = () => { clearTimeout(timer); if (caja) caja.classList.remove('ver'); actual = null; };
  const mostrar = el => {
    if (!CK.verIndicadores) return;
    caja = caja || document.body.appendChild(CK.h('div.indicador'));
    CK.vaciar(caja);
    caja.append(CK.h('div.ind-nombre', el.dataset.tip), el.dataset.desc ? CK.h('div.ind-desc', el.dataset.desc) : null, el.dataset.tecla ? CK.h('div.ind-tecla', 'Atajo ', CK.h('kbd', el.dataset.tecla)) : null);
    caja.classList.add('ver');
    const r = el.getBoundingClientRect(), c = caja.getBoundingClientRect(); let x, y;
    if (el.dataset.lado === 'der' || r.left < 70) { x = r.right + 10; y = r.top + r.height / 2 - c.height / 2; }
    else { x = r.left + r.width / 2 - c.width / 2; y = r.bottom + 8; if (y + c.height > innerHeight - 6) y = r.top - c.height - 8; }
    caja.style.left = CK.clamp(x, 6, innerWidth - c.width - 6) + 'px'; caja.style.top = CK.clamp(y, 6, innerHeight - c.height - 6) + 'px';
  };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el === actual) return; ocultar(); if (!el) return;
    actual = el; timer = setTimeout(() => mostrar(el), 480);
  });
  document.addEventListener('mousedown', ocultar, true);
  document.addEventListener('keydown', ocultar, true);
  window.addEventListener('blur', ocultar);
})();
/** Marca un elemento con nombre, explicación y atajo. */
CK.tip = (el, nombre, desc, tecla, lado) => { el.dataset.tip = nombre; if (desc) el.dataset.desc = desc; if (tecla) el.dataset.tecla = tecla; if (lado) el.dataset.lado = lado; el.setAttribute('aria-label', nombre); return el; };

// ---------------------------------------------------------------- piezas de interfaz
/** Botón. o = { ico, txt, tip, desc, tecla, on, cls, lado } */
CK.btn = o => {
  const b = CK.h('button.btn' + (o.cls ? '.' + o.cls.split(' ').join('.') : ''), { type: 'button', onclick: e => { if (o.on) o.on(e, b); } });
  if (o.ico) b.insertAdjacentHTML('beforeend', CK.ico(o.ico, o.tam));
  if (o.txt) b.append(CK.h('span', o.txt));
  if (!o.txt) b.classList.add('solo-ico');
  if (o.off) b.disabled = true;
  if (o.tip || o.txt) CK.tip(b, o.tip || o.txt, o.desc, o.tecla, o.lado);
  return b;
};
/** Grupo de herramientas excluyentes. items = [{id, ico, tip, desc, tecla}] */
CK.herramientas = (items, actual, alElegir, o = {}) => {
  const cont = CK.h('div.herr' + (o.cls ? '.' + o.cls : ''));
  const btns = {};
  items.forEach(it => {
    if (it === '-') { cont.append(CK.h('div.herr-sep')); return; }
    if (it.titulo) { cont.append(CK.h('div.herr-titulo', it.titulo)); return; }
    const b = CK.btn({ ico: it.ico, tip: it.tip, desc: it.desc, tecla: it.tecla, lado: o.lado || 'der', tam: 22, cls: 'herr-btn', on: () => { set(it.id); alElegir(it.id, it); } });
    if (o.rotulos) b.append(CK.h('span.herr-rot', it.corto || it.tip));
    btns[it.id] = b; cont.append(b);
  });
  const set = id => { Object.keys(btns).forEach(k => btns[k].classList.toggle('activo', k === id)); };
  set(actual); cont.elegir = set; cont.btns = btns;
  return cont;
};
CK.campo = (rotulo, control, ayuda) => { const c = CK.h('label.campo', CK.h('span.campo-rot', rotulo), control); if (ayuda) CK.tip(c, rotulo, ayuda); return c; };
CK.num = (v, o, on) => { const i = CK.h('input.in', { type: 'number', value: v, min: o.min, max: o.max, step: o.step || 1 }); i.addEventListener('change', () => { let n = parseFloat(i.value); if (isNaN(n)) n = v; if (o.min !== undefined) n = Math.max(o.min, n); if (o.max !== undefined) n = Math.min(o.max, n); i.value = n; on(n); }); return i; };
CK.rango = (v, o, on) => {
  const out = CK.h('span.rango-val', String(v)), i = CK.h('input.rango', { type: 'range', value: v, min: o.min, max: o.max, step: o.step || 1 });
  i.addEventListener('input', () => { out.textContent = i.value; on(parseFloat(i.value), false); });
  i.addEventListener('change', () => on(parseFloat(i.value), true));
  const w = CK.h('span.rango-caja', i, out); w.poner = n => { i.value = n; out.textContent = String(n); }; return w;
};
CK.sel = (v, ops, on) => { const s = CK.h('select.in', ops.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return CK.h('option', { value: val }, txt); })); s.value = v; s.addEventListener('change', () => on(s.value)); return s; };
CK.chk = (v, txt, on, desc) => { const i = CK.h('input', { type: 'checkbox', checked: !!v }); i.addEventListener('change', () => on(i.checked)); const l = CK.h('label.chk', i, CK.h('span', txt)); if (desc) CK.tip(l, txt, desc); return l; };
CK.txt = (v, on, o = {}) => { const i = CK.h(o.multi ? 'textarea.in' : 'input.in', { type: o.multi ? null : 'text', placeholder: o.ph || '', rows: o.multi ? (o.filas || 3) : null }); i.value = v || ''; i.addEventListener(o.vivo ? 'input' : 'change', () => on(i.value)); return i; };
CK.color = (v, on) => { const i = CK.h('input.in-color', { type: 'color', value: v || '#000000' }); i.addEventListener('input', () => on(i.value)); return i; };
CK.seccion = (titulo, ...kids) => CK.h('section.bloque', CK.h('h3.bloque-tit', titulo), ...kids);
CK.vacio = (ico, titulo, texto, accion) => CK.h('div.vacio', { html: CK.ico(ico, 34) }, CK.h('div.vacio-tit', titulo), CK.h('div.vacio-txt', texto), accion || null);

CK.aviso = (msg, tipo = 'ok', ms = 3200) => {
  const cont = document.getElementById('avisos') || document.body.appendChild(CK.h('div#avisos'));
  const a = CK.h('div.aviso.' + tipo, { html: CK.ico(tipo === 'ok' ? 'ok' : tipo === 'error' ? 'alerta' : 'info', 18) }, CK.h('span', msg));
  cont.append(a); setTimeout(() => { a.classList.add('fuera'); setTimeout(() => a.remove(), 260); }, ms);
};
/** Ventana. o = { titulo, cuerpo, botones: [{txt, cls, valor}], ancho }. Devuelve una promesa con el valor del botón. */
CK.ventana = o => new Promise(res => {
  const cerrar = v => { fondo.remove(); document.removeEventListener('keydown', tecla, true); res(v); };
  const tecla = e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(null); } };
  const pie = CK.h('div.ven-pie', (o.botones || [{ txt: 'Cerrar', valor: null }]).map(b => CK.btn({ txt: b.txt, ico: b.ico, cls: b.cls || '', on: () => cerrar(typeof b.valor === 'function' ? b.valor() : b.valor) })));
  const caja = CK.h('div.ventana', { style: { width: (o.ancho || 460) + 'px' }, role: 'dialog' }, CK.h('div.ven-cab', CK.h('h2', o.titulo), CK.btn({ ico: 'cerrar', tip: 'Cerrar', on: () => cerrar(null) })), CK.h('div.ven-cuerpo', o.cuerpo), pie);
  const fondo = CK.h('div.ven-fondo', { onmousedown: e => { if (e.target === fondo) cerrar(null); } }, caja);
  document.body.append(fondo); document.addEventListener('keydown', tecla, true);
  const f = caja.querySelector('input,textarea,select'); if (f) setTimeout(() => f.focus(), 30);
  caja.cerrar = cerrar;
});
CK.confirmar = (titulo, texto, si = 'Sí') => CK.ventana({ titulo, cuerpo: CK.h('p', texto), botones: [{ txt: 'Cancelar', valor: false }, { txt: si, cls: 'pri', valor: true }] });
CK.pedir = (titulo, rotulo, valor = '') => { const i = CK.h('input.in', { type: 'text', value: valor }); i.addEventListener('keydown', e => { if (e.key === 'Enter') i.closest('.ventana').cerrar(i.value.trim()); }); return CK.ventana({ titulo, cuerpo: CK.campo(rotulo, i), botones: [{ txt: 'Cancelar', valor: null }, { txt: 'Aceptar', cls: 'pri', valor: () => i.value.trim() }] }); };
CK.estado = txt => { const e = document.getElementById('estado-txt'); if (e) e.textContent = txt; };
CK.estadoDer = txt => { const e = document.getElementById('estado-der'); if (e) e.textContent = txt; };

// ---------------------------------------------------------------- imágenes ↔ canvas
CK.lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
CK.ctx = c => { const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return x; };
CK.aPix = c => { const d = CK.ctx(c).getImageData(0, 0, c.width, c.height); return { w: c.width, h: c.height, d: d.data }; };
CK.aLienzo = im => { const c = CK.lienzo(im.w, im.h); CK.ctx(c).putImageData(new ImageData(new Uint8ClampedArray(im.d), im.w, im.h), 0, 0); return c; };
CK.copiaLienzo = c => { const o = CK.lienzo(c.width, c.height); CK.ctx(o).drawImage(c, 0, 0); return o; };
CK.cargarImagen = src => new Promise((res, rej) => {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src), im = new Image();
  im.onload = () => { const c = CK.lienzo(im.naturalWidth, im.naturalHeight); CK.ctx(c).drawImage(im, 0, 0); if (typeof src !== 'string') URL.revokeObjectURL(url); res(c); };
  im.onerror = () => rej(new Error('No se pudo leer la imagen')); im.src = url;
});
CK.aBlob = c => new Promise(res => c.toBlob(res, 'image/png'));
CK.descargar = (blob, nombre) => { const a = CK.h('a', { href: URL.createObjectURL(blob), download: nombre }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
CK.elegirArchivos = (accept, multiple) => new Promise(res => { const i = CK.h('input', { type: 'file', accept, multiple: multiple || null, style: { display: 'none' } }); i.addEventListener('change', () => { res([...i.files]); i.remove(); }); document.body.append(i); i.click(); });
/** Fondo a cuadros para ver transparencias. */
CK.cuadros = (ctx, w, h, t = 8, a = '#3a3d44', b = '#33363c') => { ctx.fillStyle = a; ctx.fillRect(0, 0, w, h); ctx.fillStyle = b; for (let y = 0; y < h; y += t) for (let x = (y / t) % 2 ? t : 0; x < w; x += t * 2) ctx.fillRect(x, y, t, t); };
/** Miniatura de un lienzo dentro de una caja (sin emborronar). */
CK.mini = (c, tam = 48, frame) => {
  const o = CK.lienzo(tam, tam), x = CK.ctx(o); if (!c) return o;
  const sw = frame ? frame.w : c.width, sh = frame ? frame.h : c.height, sx = frame ? frame.x : 0, sy = frame ? frame.y : 0;
  let k = Math.min(tam / sw, tam / sh); if (k > 1) k = Math.floor(k);
  const w = Math.max(1, Math.round(sw * k)), hh = Math.max(1, Math.round(sh * k));
  x.drawImage(c, sx, sy, sw, sh, (tam - w) >> 1, (tam - hh) >> 1, w, hh); return o;
};
