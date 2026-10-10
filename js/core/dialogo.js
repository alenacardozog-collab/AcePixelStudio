/* DIÁLOGO: el jugador escribe libre y el NPC responde por temas, en su rol. Sin internet ni costo.
   Este archivo no depende del editor: se puede cargar tal cual en el juego (window.CKDialogo).
   npc = { nombre, saludo:[…], despedida:[…], escape:[…], temas:[{ id, nombre, claves:[…], respuestas:[…], repetida:[…], variantes:[{ si, respuestas:[…] }] }] }
   estado = { vistos:{}, banderas:{ noche:true, 'mision:llave':true, 'heroe:horos':true } }  (el juego lo guarda por NPC) */
(function (root) {
  'use strict';
  const D = {};
  D.normalizar = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9ñ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const VACIAS = new Set(
    'el la los las un una unos unas de del al a en y o que me te se lo le mi tu su es son esta este esto eso esa por para con sin sobre como donde cuando quien cual cuanto muy mas ya hay tiene tienes sabes sabe algo acerca sos eres usted vos tu yo nos podes puedes decime dime contame cuentame hablame'.split(
      ' '
    )
  );
  D.palabras = s =>
    D.normalizar(s)
      .split(' ')
      .filter(w => w && !VACIAS.has(w));
  const lev = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const d = [];
    for (let i = 0; i <= a.length; i++) {
      d[i] = [i];
      for (let j = 1; j <= b.length; j++)
        d[i][j] = i === 0 ? j : Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  };
  const raiz = w => (w.length > 5 ? w.replace(/(es|s|a|o)$/, '') : w);
  /** Qué tan bien coincide una palabra del jugador con una clave (0 a 1). */
  D.parecido = (w, clave) => {
    if (w === clave) return 1;
    const rw = raiz(w),
      rc = raiz(clave);
    if (rw === rc && rw.length >= 4) return 0.9;
    if (clave.length >= 5 && w.length >= 4 && (w.startsWith(rc) || clave.startsWith(rw))) return 0.75;
    const e = lev(w, clave);
    if (clave.length >= 8 && e <= 2) return 0.7;
    if (clave.length >= 5 && e <= 1) return 0.7;
    return 0;
  };
  /** Puntaje de cada tema para un texto. Devuelve [{ tema, puntos, por }] de mayor a menor. */
  D.puntuar = (npc, texto) => {
    const norm = D.normalizar(texto),
      ws = D.palabras(texto),
      out = [];
    (npc.temas || []).forEach(t => {
      let puntos = 0,
        por = [];
      (t.claves || []).forEach(c0 => {
        const c = D.normalizar(c0);
        if (!c) return;
        if (c.includes(' ')) {
          if ((' ' + norm + ' ').includes(' ' + c + ' ')) {
            puntos += 2 * c.split(' ').length;
            por.push(c0);
          }
          return;
        }
        let best = 0;
        for (const w of ws) best = Math.max(best, D.parecido(w, c));
        if (best) {
          puntos += best;
          por.push(c0);
        }
      });
      if (puntos >= 0.7) out.push({ tema: t, puntos, por });
    });
    return out.sort((a, b) => b.puntos - a.puntos);
  };
  const elegir = (lista, clave, estado) => {
    if (!lista || !lista.length) return null;
    estado.turno = estado.turno || {};
    const i = (estado.turno[clave] || 0) % lista.length;
    estado.turno[clave] = i + 1;
    return lista[i];
  };
  const SALUDOS = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hey', 'ey'],
    CHAU = ['adios', 'chau', 'hasta luego', 'nos vemos', 'me voy', 'hasta pronto'];
  /** Respuesta del NPC. Devuelve { texto, tema (id o null), modo: 'tema'|'repetida'|'saludo'|'despedida'|'escape', por:[claves] } */
  D.responder = (npc, texto, estado) => {
    estado = estado || {};
    estado.vistos = estado.vistos || {};
    estado.banderas = estado.banderas || {};
    const norm = D.normalizar(texto),
      r = D.puntuar(npc, texto);
    if (!r.length) {
      if (SALUDOS.some(s => norm === s || norm.startsWith(s + ' ')))
        return { texto: elegir(npc.saludo, '_saludo', estado) || 'Hola.', tema: null, modo: 'saludo', por: [] };
      if (CHAU.some(s => norm.includes(s)))
        return { texto: elegir(npc.despedida, '_chau', estado) || 'Hasta luego.', tema: null, modo: 'despedida', por: [] };
      return { texto: elegir(npc.escape, '_escape', estado) || '…', tema: null, modo: 'escape', por: [] };
    }
    const t = r[0].tema,
      vistas = estado.vistos[t.id] || 0;
    estado.vistos[t.id] = vistas + 1;
    const v = (t.variantes || []).find(x => x.si && estado.banderas[x.si] && x.respuestas && x.respuestas.length);
    const base = v ? v.respuestas : t.respuestas || [];
    if (vistas >= base.length && t.repetida && t.repetida.length)
      return { texto: elegir(t.repetida, t.id + '_rep', estado), tema: t.id, modo: 'repetida', por: r[0].por };
    return {
      texto: elegir(base, t.id + (v ? '_' + v.si : ''), estado) || elegir(npc.escape, '_escape', estado) || '…',
      tema: t.id,
      modo: 'tema',
      por: r[0].por,
      variante: v ? v.si : null
    };
  };
  /** Temas para mostrar como pistas debajo de la caja de texto. */
  D.sugerencias = (npc, estado, n = 3) => {
    const vistos = (estado && estado.vistos) || {};
    return (npc.temas || [])
      .filter(t => t.sugerir !== false && t.claves && t.claves.length)
      .sort((a, b) => (vistos[a.id] || 0) - (vistos[b.id] || 0))
      .slice(0, n)
      .map(t => t.nombre);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  else root.CKDialogo = D;
})(typeof window !== 'undefined' ? window : globalThis);
