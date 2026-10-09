/* FXSIM: reproduce un efecto (partículas, luces, destellos) sobre cualquier canvas 2D.
   No depende del editor: el mismo archivo sirve dentro del juego (window.CKFx).
   efecto = { dur (segundos), bucle, mov:{vx,vy}, contorno:{grosor,color,forma}, capas:[ {tipo:'emisor'|'luz'|'destello'|'sacudida', inicio, fin, contorno, …} ] }
   contorno: borde alrededor de las partículas (de 1 a 8 px). La capa puede usar el del efecto, uno propio o ninguno (contorno: false). */
(function (root) {
  'use strict';
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const hex = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const entre = (v, R) => Array.isArray(v) ? lerp(v[0], v[1], R()) : v;
  /** Curvas de suavizado: cómo avanza un valor a lo largo de la vida de la partícula (k de 0 a 1). */
  const CURVAS = {
    lineal: k => k, entrada: k => k * k, salida: k => 1 - (1 - k) * (1 - k), suave: k => k * k * (3 - 2 * k), muySuave: k => k * k * k * (k * (k * 6 - 15) + 10),
    rapida: k => Math.sqrt(k), tardia: k => k * k * k, rebote: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; },
    elastica: k => k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * 2.0944) + 1, pico: k => Math.sin(k * Math.PI), pulso: k => 0.5 - 0.5 * Math.cos(k * Math.PI * 4), escalones: k => Math.floor(k * 4) / 4
  };
  const NOMBRES_CURVA = { lineal: 'Pareja (lineal)', entrada: 'Arranca lento', salida: 'Frena al final', suave: 'Suave (lento-rápido-lento)', muySuave: 'Muy suave', rapida: 'Cambia rápido al principio', tardia: 'Cambia casi al final', rebote: 'Con rebote', elastica: 'Elástica', pico: 'Sube y vuelve (pico)', pulso: 'Late dos veces', escalones: 'A saltos' };
  const cur = (n, k) => (CURVAS[n] || CURVAS.lineal)(k);
  const TMP = [];
  const tmp = (i, w, h) => { let c = TMP[i]; if (!c) c = TMP[i] = document.createElement('canvas'); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };
  const ruido = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  const DEF = { forma: 'punto', ancho: 0, alto: 0, tasa: 20, rafaga: 0, vida: [0.4, 0.8], vel: [20, 40], angulo: -90, apertura: 30, gravX: 0, gravY: 0, freno: 0, tam: [2, 1], colores: ['#ffffff'], alfa: [1, 1], figura: 'pixel', mezcla: 'normal', x: 0, y: 0, giro: 0, curvaTam: 'lineal', curvaAlfa: 'lineal', curvaColor: 'lineal', colorSuave: false, suavizado: false, aparece: 0, estela: 0, orbita: 0, atraccion: 0, turbulencia: 0, rebote: 0, suelo: 40, tamAzar: 0, radial: false, ritmo: 'constante', estirar: 0 };

  class Sim {
    constructor(efecto, o = {}) { this.e = efecto; this.o = o; this.reiniciar(); }
    reiniciar() { this.t = 0; this.p = []; this.R = rng(this.o.semilla || 7); this.acum = {}; this.rafagas = {}; this.fin = false; this.sacudida = { x: 0, y: 0 }; this.ox = 0; this.oy = 0; }
    activa(c) { const a = c.inicio || 0, b = c.fin === undefined || c.fin === null ? this.e.dur : c.fin; return this.t >= a && this.t <= b; }
    emitir(c, n) {
      const R = this.R, d = Object.assign({}, DEF, c);
      for (let i = 0; i < n; i++) {
        let x = d.x + this.ox, y = d.y + this.oy;
        if (d.forma === 'linea') x += (R() - 0.5) * d.ancho; else if (d.forma === 'area') { x += (R() - 0.5) * d.ancho; y += (R() - 0.5) * d.alto; } else if (d.forma === 'circulo') { const a = R() * 6.283, r = Math.sqrt(R()) * d.ancho / 2; x += Math.cos(a) * r; y += Math.sin(a) * r * (d.alto ? d.alto / Math.max(1, d.ancho) : 1); } else if (d.forma === 'anillo') { const a = R() * 6.283; x += Math.cos(a) * d.ancho / 2; y += Math.sin(a) * (d.alto || d.ancho) / 2; }
        let ang = (d.angulo + (R() - 0.5) * d.apertura) * Math.PI / 180; const v = entre(d.vel, R), vida = Math.max(0.05, entre(d.vida, R));
        if (d.radial) { const rx = x - d.x - this.ox, ry = y - d.y - this.oy; ang = (rx || ry ? Math.atan2(ry, rx) : R() * 6.283) + (R() - 0.5) * d.apertura * Math.PI / 180; }
        this.p.push({ c, d, x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, t: 0, vida, s: R(), rot: R() * 6.283, k: 1 + (R() - 0.5) * 2 * (d.tamAzar || 0), ox: d.x + this.ox, oy: d.y + this.oy, h: d.estela ? [] : null });
      }
    }
    paso(dt) {
      const e = this.e; this.t += dt;
      if (this.t > e.dur) { if (e.bucle) { this.t -= e.dur; this.rafagas = {}; this.acum = {}; } else if (!this.p.length) this.fin = true; }
      const mv = e.mov || {}; this.ox = (mv.vx || 0) * Math.min(this.t, e.dur); this.oy = (mv.vy || 0) * Math.min(this.t, e.dur);
      this.sacudida.x = this.sacudida.y = 0;
      (e.capas || []).forEach((c, i) => {
        if (c.oculta) return;
        if (c.tipo === 'emisor' && this.activa(c) && (this.t <= e.dur || e.bucle)) {
          if (c.rafaga && !this.rafagas[i]) { this.rafagas[i] = true; this.emitir(c, c.rafaga); }
          if (c.tasa) { const a0 = c.inicio || 0, b0 = c.fin === undefined || c.fin === null ? e.dur : c.fin, kk = Math.min(1, Math.max(0, (this.t - a0) / Math.max(0.001, b0 - a0))), rit = c.ritmo === 'crece' ? kk * 2 : c.ritmo === 'decrece' ? (1 - kk) * 2 : c.ritmo === 'pulso' ? 1 + Math.sin(this.t * 12.566) : c.ritmo === 'pico' ? Math.sin(kk * Math.PI) * 1.6 : 1; this.acum[i] = (this.acum[i] || 0) + c.tasa * rit * dt; const n = Math.floor(this.acum[i]); if (n) { this.acum[i] -= n; this.emitir(c, n); } }
        }
        if (c.tipo === 'sacudida' && this.activa(c)) { const k = 1 - (this.t - (c.inicio || 0)) / Math.max(0.01, (c.fin || e.dur) - (c.inicio || 0)), f = (c.fuerza || 2) * k; this.sacudida.x += Math.round((this.R() - 0.5) * 2 * f); this.sacudida.y += Math.round((this.R() - 0.5) * 2 * f); }
      });
      for (let i = this.p.length - 1; i >= 0; i--) {
        const q = this.p[i], d = q.d; q.t += dt; if (q.t >= q.vida) { this.p.splice(i, 1); continue; }
        q.vx += d.gravX * dt; q.vy += d.gravY * dt; if (d.freno) { const f = Math.max(0, 1 - d.freno * dt); q.vx *= f; q.vy *= f; }
        if (d.onda) q.x += Math.sin((q.t + q.s) * 8) * d.onda * dt;
        if (d.atraccion) { const ax = q.ox - q.x, ay = q.oy - q.y, l = Math.hypot(ax, ay) || 1; q.vx += ax / l * d.atraccion * dt; q.vy += ay / l * d.atraccion * dt; }
        if (d.turbulencia) { q.vx += ruido(q.s * 91 + Math.floor(q.t * 9), 1.3) * d.turbulencia * dt * 9; q.vy += ruido(q.s * 57 + Math.floor(q.t * 9), 7.1) * d.turbulencia * dt * 9; }
        if (q.h) { q.h.push(q.x, q.y); if (q.h.length > d.estela * 4) q.h.splice(0, q.h.length - d.estela * 4); }
        q.x += q.vx * dt; q.y += q.vy * dt; if (d.giro) q.rot += d.giro * dt;
        if (d.orbita) { const a = d.orbita * dt * Math.PI / 180, rx = q.x - q.ox, ry = q.y - q.oy, co = Math.cos(a), si = Math.sin(a); q.x = q.ox + rx * co - ry * si; q.y = q.oy + rx * si + ry * co; }
        if (d.rebote && q.vy > 0 && q.y > q.oy + d.suelo) { q.y = q.oy + d.suelo; q.vy = -q.vy * d.rebote; q.vx *= 0.8; }
      }
    }
    /** Dibuja el efecto con su origen en (x, y). pase: 'particulas' | 'luces' | (nada = todo). recurso(id) devuelve { img, cuadro(i) -> {x,y,w,h}, n } para figuras que son assets. */
    dibujar(ctx, x, y, recurso, pase) {
      const e = this.e; x += this.sacudida.x; y += this.sacudida.y;
      if (pase !== 'particulas') (e.capas || []).forEach(c => {
        if (c.oculta || !this.activa(c)) return; const a = c.inicio || 0, b = c.fin === undefined || c.fin === null ? e.dur : c.fin, k = Math.min(1, Math.max(0, (this.t - a) / Math.max(0.001, b - a)));
        if (c.tipo === 'luz') {
          const kc = cur(c.curva, k), r = Math.max(1, lerp(c.radio ? c.radio[0] : 30, c.radio ? c.radio[1] : 30, kc) * (1 + (c.parpadeo || 0) * 0.08 * Math.sin(this.t * 31 + 1.7) * Math.sin(this.t * 13))), col = hex(c.color || '#ffcc66'), f = (c.fuerza === undefined ? 0.6 : c.fuerza) * (c.apagar ? 1 - kc : 1), cx = x + (c.x || 0) + this.ox, cy = y + (c.y || 0) + this.oy;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${col},${f})`); g.addColorStop(0.5, `rgba(${col},${f * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
        } else if (c.tipo === 'destello') { ctx.save(); ctx.globalCompositeOperation = c.mezcla === 'normal' ? 'source-over' : 'lighter'; ctx.globalAlpha = (c.fuerza === undefined ? 0.6 : c.fuerza) * (1 - k); ctx.fillStyle = c.color || '#ffffff'; ctx.fillRect(-4096, -4096, 8192, 8192); ctx.restore(); }
      });
      if (pase === 'luces') return;
      // contorno: el del efecto (e.contorno = { grosor, color }) o el propio de la capa (c.contorno = false para ninguno)
      const cfgDe = c => { if (c.contorno === false) return null; const o = c.contorno && typeof c.contorno === 'object' ? c.contorno : e.contorno; return o && o.grosor > 0 ? o : null; };
      const dib = (ctx, q) => {
        const d = q.d, k = q.t / q.vida, suave = !!d.suavizado;
        const tamF = Math.max(suave ? 0.6 : 1, lerp(d.tam[0], d.tam[1], cur(d.curvaTam, k)) * (q.k || 1)), tam = suave ? tamF : Math.max(1, Math.round(tamF));
        let alfa = lerp(d.alfa[0], d.alfa[1], cur(d.curvaAlfa, k)); if (d.aparece > 0 && k < d.aparece) alfa *= k / d.aparece; if (alfa <= 0.02) return;
        const nC = d.colores.length, kC = Math.min(0.9999, Math.max(0, cur(d.curvaColor, k))); let col;
        if (d.colorSuave && nC > 1) { const f = kC * (nC - 1), i0 = Math.floor(f), a = hex(d.colores[i0]), b = hex(d.colores[Math.min(nC - 1, i0 + 1)]), u = f - i0; col = 'rgb(' + Math.round(lerp(a[0], b[0], u)) + ',' + Math.round(lerp(a[1], b[1], u)) + ',' + Math.round(lerp(a[2], b[2], u)) + ')'; }
        else col = d.colores[Math.min(nC - 1, Math.floor(kC * nC))];
        const px = suave ? x + q.x : Math.round(x + q.x), py = suave ? y + q.y : Math.round(y + q.y);
        ctx.globalCompositeOperation = d.mezcla === 'luz' ? 'lighter' : 'source-over'; ctx.fillStyle = col; ctx.strokeStyle = col;
        // estela: copias que se van apagando detrás de la partícula
        if (q.h && q.h.length) { const n = q.h.length / 2; for (let i = 0; i < n; i += 2) { const u = (i + 1) / n, t2 = Math.max(1, tamF * (0.35 + 0.65 * u)); ctx.globalAlpha = alfa * u * 0.5; const hx = x + q.h[i * 2], hy = y + q.h[i * 2 + 1]; if (suave) { ctx.beginPath(); ctx.arc(hx, hy, t2 / 2, 0, 6.2832); ctx.fill(); } else { const t3 = Math.max(1, Math.round(t2)); ctx.fillRect(Math.round(hx) - (t3 >> 1), Math.round(hy) - (t3 >> 1), t3, t3); } } }
        ctx.globalAlpha = alfa;
        const fig = d.figura;
        if (fig === 'brillo' || fig === 'humo') { const r = Math.max(1, tamF * (fig === 'humo' ? 1 : 1.2)), c0 = hex(col.charAt(0) === '#' ? col : '#' + col.slice(4, -1).split(',').map(n => (+n).toString(16).padStart(2, '0')).join('')), g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(' + c0 + ',1)'); g.addColorStop(fig === 'humo' ? 0.55 : 0.25, 'rgba(' + c0 + ',' + (fig === 'humo' ? 0.7 : 0.45) + ')'); g.addColorStop(1, 'rgba(' + c0 + ',0)'); ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2); }
        else if (suave && (fig === 'pixel' || fig === 'circulo')) { if (d.estirar) { const v = Math.hypot(q.vx, q.vy) || 1, a = Math.atan2(q.vy, q.vx), e2 = 1 + Math.min(4, v / 60 * d.estirar); ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, tamF / 2 * e2, tamF / 2 / Math.sqrt(e2), 0, 0, 6.2832); ctx.fill(); ctx.restore(); } else if (fig === 'pixel') ctx.fillRect(px - tamF / 2, py - tamF / 2, tamF, tamF); else { ctx.beginPath(); ctx.arc(px, py, tamF / 2, 0, 6.2832); ctx.fill(); } }
        else if (fig === 'pixel') ctx.fillRect(px - (tam >> 1), py - (tam >> 1), tam, tam);
        else if (fig === 'circulo') { const r = tam / 2; for (let yy = 0; yy < tam; yy++) { const dy = yy + 0.5 - r, w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 2); if (w > 0) ctx.fillRect(px - Math.floor(w / 2), py - Math.floor(r) + yy, w, 1); } }
        else if (fig === 'anillo') { const r = Math.max(1, tamF); if (suave) { ctx.lineWidth = Math.max(1, tamF * 0.18); ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.stroke(); } else { const n = Math.max(8, Math.round(r * 6.3)); for (let i = 0; i < n; i++) { const a = i / n * 6.2832; ctx.fillRect(Math.round(px + Math.cos(a) * r), Math.round(py + Math.sin(a) * r), 1, 1); } } }
        else if (fig === 'rombo') { const r = Math.max(1, Math.round(tamF / 2)); for (let yy = -r; yy <= r; yy++) { const w = r - Math.abs(yy); ctx.fillRect(Math.round(px) - w, Math.round(py) + yy, w * 2 + 1, 1); } }
        else if (fig === 'estrella') { const t = Math.max(1, Math.round(tamF)), c = Math.max(1, Math.round(tamF / 3)); ctx.fillRect(Math.round(px) - t, Math.round(py), t * 2 + 1, 1); ctx.fillRect(Math.round(px), Math.round(py) - t, 1, t * 2 + 1); for (let i = 1; i <= c; i++) { ctx.fillRect(Math.round(px) - i, Math.round(py) - i, 1, 1); ctx.fillRect(Math.round(px) + i, Math.round(py) - i, 1, 1); ctx.fillRect(Math.round(px) - i, Math.round(py) + i, 1, 1); ctx.fillRect(Math.round(px) + i, Math.round(py) + i, 1, 1); } }
        else if (fig === 'chispa' || fig === 'linea') { const v = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / v, uy = q.vy / v, len = Math.max(2, tamF * (fig === 'linea' ? 3 : 2) * (1 + (d.estirar || 0) * Math.min(3, v / 80))); if (suave) { ctx.lineWidth = fig === 'linea' ? Math.max(1, tamF / 3) : 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ux * len, py - uy * len); ctx.stroke(); } else for (let s2 = 0; s2 < len; s2++) ctx.fillRect(Math.round(px - ux * s2), Math.round(py - uy * s2), 1, 1); }
        else if (fig === 'cruz') { ctx.fillRect(Math.round(px) - tam, Math.round(py), tam * 2 + 1, 1); ctx.fillRect(Math.round(px), Math.round(py) - tam, 1, tam * 2 + 1); }
        else if (fig === 'gota') ctx.fillRect(Math.round(px), Math.round(py) - tam, 1, tam + 1);
        else if (fig === 'asset' && recurso) { const r = recurso(d.asset); if (r && r.img) { const f = r.cuadro(d.animar ? Math.min(r.n - 1, Math.floor(k * r.n)) : Math.floor(q.s * r.n) % r.n), sc = tamF / Math.max(1, d.tam[0]); ctx.save(); ctx.translate(px, py); if (d.giro) ctx.rotate(q.rot); ctx.imageSmoothingEnabled = suave; ctx.drawImage(r.img, f.x, f.y, f.w, f.h, -Math.round(f.w * sc / 2), -Math.round(f.h * sc / 2), Math.round(f.w * sc), Math.round(f.h * sc)); ctx.restore(); } else ctx.fillRect(px, py, tam, tam); }
            };
      const conContorno = typeof document !== 'undefined' && ctx.canvas && this.p.some(q => cfgDe(q.c));
      if (!conContorno) for (const q of this.p) dib(ctx, q);
      else {
        const orden = new Map(); (e.capas || []).forEach((c, i) => orden.set(c, i)); const grupos = new Map();
        for (const q of this.p) { if (!grupos.has(q.c)) grupos.set(q.c, []); grupos.get(q.c).push(q); }
        [...grupos.keys()].sort((p1, p2) => (orden.get(p1) || 0) - (orden.get(p2) || 0)).forEach(c => {
          const cfg = cfgDe(c), l = grupos.get(c); if (!cfg) { l.forEach(q => dib(ctx, q)); return; }
          const W = ctx.canvas.width, H = ctx.canvas.height, A = tmp(0, W, H), B = tmp(1, W, H), t = ctx.getTransform();
          const xa = A.getContext('2d'); xa.setTransform(1, 0, 0, 1, 0, 0); xa.globalAlpha = 1; xa.globalCompositeOperation = 'source-over'; xa.clearRect(0, 0, W, H); xa.setTransform(t); xa.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
          l.forEach(q => dib(xa, q)); xa.setTransform(1, 0, 0, 1, 0, 0); xa.globalAlpha = 1; xa.globalCompositeOperation = 'source-over';
          const xb = B.getContext('2d'); xb.setTransform(1, 0, 0, 1, 0, 0); xb.globalAlpha = 1; xb.globalCompositeOperation = 'source-over'; xb.clearRect(0, 0, W, H); xb.drawImage(A, 0, 0); xb.globalCompositeOperation = 'source-in'; xb.fillStyle = cfg.color || '#1b1420'; xb.fillRect(0, 0, W, H); xb.globalCompositeOperation = 'source-over';
          const s = Math.max(1, Math.hypot(t.a, t.b)), g = Math.max(1, Math.min(8, Math.round(cfg.grosor || 1))), redondo = cfg.forma !== 'cuadrado';
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = cfg.alfa === undefined ? 1 : cfg.alfa; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
          for (let dy = -g; dy <= g; dy++) for (let dx = -g; dx <= g; dx++) { if (!dx && !dy) continue; if (redondo && dx * dx + dy * dy > g * g + g * 0.6) continue; ctx.drawImage(B, Math.round(dx * s), Math.round(dy * s)); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = c.mezcla === 'luz' ? 'lighter' : 'source-over'; ctx.drawImage(A, 0, 0); ctx.restore();
        });
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  const PL = {};
  const E = (o) => Object.assign({ tipo: 'emisor', inicio: 0 }, o);
  PL.fuego = { nombre: 'Fuego', dur: 1.2, bucle: true, capas: [E({ nombre: 'Llamas', forma: 'linea', ancho: 8, tasa: 38, vida: [0.35, 0.7], vel: [18, 34], angulo: -90, apertura: 24, tam: [4, 1], colores: ['#f2c14e', '#e0803c', '#b8483c', '#5a2a22'], figura: 'circulo', mezcla: 'luz' }), E({ nombre: 'Chispas', tasa: 5, vida: [0.5, 1], vel: [30, 55], angulo: -90, apertura: 50, gravY: -10, tam: [1, 1], colores: ['#f6d573', '#e0803c'], onda: 12 }), { tipo: 'luz', nombre: 'Resplandor', inicio: 0, color: '#ff9a3c', radio: [34, 34], fuerza: 0.45, parpadeo: 2 }] };
  PL.humo = { nombre: 'Humo', dur: 2, bucle: true, capas: [E({ nombre: 'Humo', forma: 'linea', ancho: 6, tasa: 9, vida: [1.2, 2], vel: [10, 18], angulo: -90, apertura: 20, tam: [3, 7], colores: ['#93897a', '#6b6258', '#4a4540'], alfa: [0.75, 0], figura: 'circulo', onda: 8 })] };
  PL.golpe = { nombre: 'Chispa de golpe', dur: 0.35, bucle: false, capas: [E({ nombre: 'Chispas', rafaga: 14, tasa: 0, vida: [0.15, 0.32], vel: [60, 150], angulo: 0, apertura: 360, freno: 5, tam: [2, 1], colores: ['#ffffff', '#f6d573', '#e0803c'], figura: 'chispa' }), E({ nombre: 'Estrella', rafaga: 1, tasa: 0, vida: [0.12, 0.12], vel: [0, 0], tam: [5, 1], colores: ['#ffffff'], figura: 'cruz' }), { tipo: 'destello', nombre: 'Destello', inicio: 0, fin: 0.08, color: '#ffffff', fuerza: 0.35 }, { tipo: 'sacudida', nombre: 'Sacudida', inicio: 0, fin: 0.18, fuerza: 2 }] };
  PL.curacion = { nombre: 'Curación', dur: 1.4, bucle: false, capas: [E({ nombre: 'Brillos', forma: 'circulo', ancho: 22, alto: 8, tasa: 26, fin: 1, vida: [0.5, 0.9], vel: [16, 32], angulo: -90, apertura: 10, tam: [2, 1], colores: ['#f5f1e6', '#a6cf5e', '#74a84a'], figura: 'cruz', mezcla: 'luz' }), E({ nombre: 'Anillo', forma: 'anillo', ancho: 26, alto: 9, tasa: 40, fin: 0.9, vida: [0.25, 0.4], vel: [4, 10], angulo: -90, apertura: 0, tam: [1, 1], colores: ['#a6cf5e'] }), { tipo: 'luz', nombre: 'Luz', inicio: 0, color: '#8fe07a', radio: [10, 40], fuerza: 0.4, apagar: true }] };
  PL.magia = { nombre: 'Aura mágica', dur: 1.6, bucle: true, capas: [E({ nombre: 'Órbita', forma: 'anillo', ancho: 24, alto: 10, tasa: 30, vida: [0.4, 0.8], vel: [8, 20], angulo: -90, apertura: 40, tam: [2, 1], colores: ['#f5f1e6', '#8fb3c9', '#5d7a9a', '#3a4a66'], mezcla: 'luz' }), { tipo: 'luz', nombre: 'Luz', inicio: 0, color: '#6aa8ff', radio: [28, 28], fuerza: 0.35, parpadeo: 1 }] };
  PL.explosion = { nombre: 'Explosión', dur: 0.8, bucle: false, capas: [E({ nombre: 'Bola', rafaga: 26, tasa: 0, forma: 'circulo', ancho: 8, vida: [0.25, 0.55], vel: [30, 110], angulo: 0, apertura: 360, freno: 4, tam: [7, 2], colores: ['#f5f1e6', '#f2c14e', '#e0803c', '#b8483c', '#3b2a3a'], figura: 'circulo' }), E({ nombre: 'Escombros', rafaga: 12, tasa: 0, vida: [0.4, 0.8], vel: [70, 160], angulo: -90, apertura: 150, gravY: 320, tam: [2, 1], colores: ['#3b2a3a', '#5a4630'] }), E({ nombre: 'Humo', inicio: 0.12, fin: 0.4, tasa: 30, forma: 'circulo', ancho: 16, vida: [0.5, 0.9], vel: [8, 24], angulo: -90, apertura: 120, tam: [4, 8], colores: ['#6b6258', '#4a4540'], alfa: [0.7, 0], figura: 'circulo' }), { tipo: 'destello', nombre: 'Destello', inicio: 0, fin: 0.12, color: '#fff3c4', fuerza: 0.6 }, { tipo: 'sacudida', nombre: 'Sacudida', inicio: 0, fin: 0.35, fuerza: 4 }, { tipo: 'luz', nombre: 'Luz', inicio: 0, fin: 0.5, color: '#ffb04a', radio: [60, 20], fuerza: 0.7, apagar: true }] };
  PL.polvo = { nombre: 'Polvo de pasos', dur: 0.4, bucle: false, capas: [E({ nombre: 'Polvo', rafaga: 5, tasa: 0, forma: 'linea', ancho: 6, vida: [0.25, 0.4], vel: [8, 22], angulo: -90, apertura: 140, freno: 3, tam: [2, 3], colores: ['#c9b47a', '#a08a5c'], alfa: [0.8, 0], figura: 'circulo' })] };
  PL.bola_fuego = { nombre: 'Bola de fuego', dur: 0.9, bucle: false, mov: { vx: 120, vy: 0 }, capas: [E({ nombre: 'Núcleo', tasa: 60, vida: [0.08, 0.14], vel: [0, 6], angulo: 180, apertura: 360, tam: [6, 4], colores: ['#f5f1e6', '#f2c14e'], figura: 'circulo' }), E({ nombre: 'Estela', tasa: 70, vida: [0.2, 0.45], vel: [10, 30], angulo: 180, apertura: 40, tam: [4, 1], colores: ['#f2c14e', '#e0803c', '#b8483c', '#5a2a22'], figura: 'circulo', mezcla: 'luz' }), E({ nombre: 'Chispas', tasa: 14, vida: [0.2, 0.5], vel: [20, 60], angulo: 180, apertura: 120, gravY: 60, tam: [1, 1], colores: ['#f6d573'] }), { tipo: 'luz', nombre: 'Luz', inicio: 0, color: '#ff9a3c', radio: [26, 26], fuerza: 0.5, parpadeo: 2 }] };
  PL.rayo = { nombre: 'Proyectil arcano', dur: 0.8, bucle: false, mov: { vx: 150, vy: 0 }, capas: [E({ nombre: 'Punta', tasa: 80, vida: [0.05, 0.1], vel: [0, 4], apertura: 360, tam: [4, 3], colores: ['#ffffff', '#8fb3c9'], figura: 'circulo' }), E({ nombre: 'Estela', tasa: 90, vida: [0.15, 0.35], vel: [0, 12], angulo: 180, apertura: 30, tam: [3, 1], colores: ['#8fb3c9', '#5d7a9a', '#3a4a66'], mezcla: 'luz' }), E({ nombre: 'Destellos', tasa: 18, vida: [0.15, 0.3], vel: [10, 40], apertura: 360, tam: [1, 1], colores: ['#ffffff'], figura: 'cruz' }), { tipo: 'luz', nombre: 'Luz', inicio: 0, color: '#6aa8ff', radio: [22, 22], fuerza: 0.5 }] };
  PL.lluvia = { nombre: 'Lluvia', dur: 2, bucle: true, capas: [E({ nombre: 'Gotas', forma: 'linea', ancho: 220, y: -70, tasa: 130, vida: [0.5, 0.7], vel: [230, 280], angulo: 100, apertura: 2, tam: [5, 5], colores: ['#8fb3c9'], alfa: [0.7, 0.7], figura: 'gota' })] };
  PL.nieve = { nombre: 'Nieve', dur: 3, bucle: true, capas: [E({ nombre: 'Copos', forma: 'linea', ancho: 220, y: -70, tasa: 22, vida: [3, 4.5], vel: [18, 32], angulo: 90, apertura: 20, tam: [1, 2], colores: ['#ffffff', '#f5f1e6'], onda: 14 })] };
  PL.luciernagas = { nombre: 'Luciérnagas', dur: 4, bucle: true, capas: [E({ nombre: 'Luciérnagas', forma: 'area', ancho: 120, alto: 70, tasa: 4, vida: [1.5, 3], vel: [3, 9], angulo: 0, apertura: 360, tam: [1, 1], colores: ['#a6cf5e', '#f6d573', '#a6cf5e'], alfa: [0, 1], onda: 10, mezcla: 'luz' })] };

  // ---- plantillas con suavizado, curvas y movimientos nuevos
  PL.portal = { nombre: 'Portal', dur: 2, bucle: true, capas: [E({ nombre: 'Remolino', forma: 'anillo', ancho: 34, alto: 34, tasa: 46, vida: [0.7, 1.2], vel: [0, 4], apertura: 360, orbita: 220, atraccion: 26, tam: [3, 1], colores: ['#f5f1e6', '#b48cf2', '#5d4bd6', '#2a2060'], colorSuave: true, curvaTam: 'salida', estela: 3, mezcla: 'luz' }), E({ nombre: 'Centro', tasa: 14, vida: [0.5, 0.9], vel: [0, 3], apertura: 360, tam: [9, 15], colores: ['#b48cf2', '#5d4bd6'], alfa: [0.5, 0], figura: 'brillo', mezcla: 'luz', curvaAlfa: 'suave' }), { tipo: 'luz', nombre: 'Resplandor', inicio: 0, color: '#8a6cf0', radio: [44, 44], fuerza: 0.5, parpadeo: 2 }] };
  PL.humo_suave = { nombre: 'Humo suave', dur: 2.4, bucle: true, capas: [E({ nombre: 'Humo', forma: 'linea', ancho: 8, tasa: 11, vida: [1.6, 2.6], vel: [10, 18], angulo: -90, apertura: 22, turbulencia: 9, tam: [5, 15], tamAzar: 0.3, colores: ['#bdb4a3', '#93897a', '#6b6258'], colorSuave: true, alfa: [0.55, 0], aparece: 0.15, curvaAlfa: 'entrada', curvaTam: 'salida', figura: 'humo', suavizado: true })] };
  PL.niebla = { nombre: 'Niebla', dur: 6, bucle: true, capas: [E({ nombre: 'Bancos', forma: 'area', ancho: 240, alto: 90, tasa: 3, vida: [4, 6], vel: [5, 11], angulo: 0, apertura: 14, tam: [26, 40], tamAzar: 0.35, colores: ['#d9e0e6', '#b9c4cf'], alfa: [0.32, 0.32], aparece: 0.3, curvaAlfa: 'pico', figura: 'humo', suavizado: true })] };
  PL.hojas = { nombre: 'Hojas que caen', dur: 4, bucle: true, capas: [E({ nombre: 'Hojas', forma: 'linea', ancho: 200, y: -70, tasa: 5, vida: [3, 4.4], vel: [16, 28], angulo: 80, apertura: 30, onda: 26, turbulencia: 5, gravY: 6, tam: [3, 3], tamAzar: 0.3, colores: ['#a6cf5e', '#f2c14e', '#e0803c'], curvaColor: 'escalones', figura: 'rombo', aparece: 0.08 })] };
  PL.burbujas = { nombre: 'Burbujas', dur: 3, bucle: true, capas: [E({ nombre: 'Burbujas', forma: 'linea', ancho: 30, tasa: 6, vida: [1.4, 2.4], vel: [14, 26], angulo: -90, apertura: 16, onda: 14, tam: [2, 5], tamAzar: 0.4, colores: ['#cfeaf5', '#8fb3c9'], alfa: [0.9, 0.2], curvaTam: 'salida', figura: 'anillo' })] };
  PL.electricidad = { nombre: 'Chispas eléctricas', dur: 0.6, bucle: true, capas: [E({ nombre: 'Arcos', forma: 'circulo', ancho: 14, tasa: 34, vida: [0.06, 0.16], vel: [70, 190], apertura: 360, radial: true, turbulencia: 60, tam: [2, 1], colores: ['#ffffff', '#bfe9ff', '#58a6ff'], figura: 'linea', estirar: 1, mezcla: 'luz', ritmo: 'pulso' }), { tipo: 'luz', nombre: 'Chispazo', inicio: 0, color: '#8fd0ff', radio: [26, 34], fuerza: 0.5, parpadeo: 4, curva: 'pulso' }] };
  PL.hielo = { nombre: 'Impacto de hielo', dur: 0.7, bucle: false, capas: [E({ nombre: 'Esquirlas', rafaga: 18, tasa: 0, vida: [0.3, 0.6], vel: [70, 150], apertura: 360, freno: 4, gravY: 120, rebote: 0.4, suelo: 18, tam: [3, 1], colores: ['#ffffff', '#cfeaf5', '#8fb3c9', '#5d7a9a'], figura: 'rombo', curvaTam: 'tardia' }), E({ nombre: 'Onda', rafaga: 1, tasa: 0, vida: [0.35, 0.35], vel: [0, 0], tam: [3, 26], colores: ['#ffffff', '#cfeaf5'], alfa: [0.9, 0], curvaTam: 'salida', curvaAlfa: 'entrada', figura: 'anillo', suavizado: true }), { tipo: 'destello', nombre: 'Destello', inicio: 0, fin: 0.1, color: '#dff4ff', fuerza: 0.35 }] };
  PL.veneno = { nombre: 'Nube de veneno', dur: 2, bucle: true, capas: [E({ nombre: 'Nube', forma: 'circulo', ancho: 26, alto: 10, tasa: 9, vida: [1, 1.8], vel: [6, 14], angulo: -90, apertura: 60, turbulencia: 7, tam: [6, 13], colores: ['#a6cf5e', '#74a84a', '#2f4a2c'], colorSuave: true, alfa: [0.5, 0], aparece: 0.2, figura: 'humo', suavizado: true }), E({ nombre: 'Burbujas', forma: 'circulo', ancho: 24, alto: 8, tasa: 6, vida: [0.5, 0.9], vel: [14, 26], angulo: -90, apertura: 10, tam: [1, 3], colores: ['#d6f29a'], figura: 'anillo', curvaTam: 'salida' })] };
  PL.polvo_dorado = { nombre: 'Polvo dorado', dur: 2.5, bucle: true, capas: [E({ nombre: 'Brillos', forma: 'area', ancho: 60, alto: 40, tasa: 12, vida: [0.9, 1.7], vel: [3, 10], angulo: -90, apertura: 80, onda: 8, tam: [1, 3], tamAzar: 0.5, colores: ['#fff7d6', '#f6d573', '#e8b83a'], alfa: [1, 1], curvaAlfa: 'pico', curvaTam: 'pico', aparece: 0.2, figura: 'estrella', mezcla: 'luz' })] };
  PL.estela_espada = { nombre: 'Tajo de espada', dur: 0.3, bucle: false, capas: [E({ nombre: 'Filo', forma: 'anillo', ancho: 44, alto: 30, rafaga: 34, tasa: 0, vida: [0.12, 0.26], vel: [20, 60], radial: true, apertura: 20, freno: 6, tam: [3, 1], colores: ['#ffffff', '#dfe9f2', '#8fb3c9'], colorSuave: true, figura: 'linea', estirar: 1.5, suavizado: true, curvaAlfa: 'entrada', alfa: [1, 0], mezcla: 'luz' }), { tipo: 'destello', nombre: 'Destello', inicio: 0, fin: 0.06, color: '#ffffff', fuerza: 0.2 }] };
  PL.antorcha_suave = { nombre: 'Llama suave', dur: 1.4, bucle: true, capas: [E({ nombre: 'Llama', forma: 'linea', ancho: 6, tasa: 30, vida: [0.4, 0.75], vel: [16, 30], angulo: -90, apertura: 18, turbulencia: 12, tam: [6, 1], colores: ['#fff3c4', '#f2c14e', '#e0803c', '#b8483c'], colorSuave: true, curvaTam: 'entrada', alfa: [0.9, 0], curvaAlfa: 'tardia', figura: 'circulo', suavizado: true, mezcla: 'luz' }), E({ nombre: 'Brasas', tasa: 4, vida: [0.6, 1.2], vel: [26, 50], angulo: -90, apertura: 50, onda: 14, tam: [1, 1], colores: ['#f6d573', '#e0803c'], curvaAlfa: 'tardia', alfa: [1, 0] }), { tipo: 'luz', nombre: 'Resplandor', inicio: 0, color: '#ffb04a', radio: [46, 46], fuerza: 0.55, parpadeo: 2 }] };
  PL.subir_nivel = { nombre: 'Subir de nivel', dur: 1.3, bucle: false, capas: [E({ nombre: 'Columna', forma: 'circulo', ancho: 22, alto: 8, tasa: 60, fin: 0.8, vida: [0.4, 0.8], vel: [50, 110], angulo: -90, apertura: 6, tam: [2, 1], colores: ['#ffffff', '#f6d573', '#e8b83a'], colorSuave: true, figura: 'linea', estirar: 1, mezcla: 'luz', ritmo: 'pico' }), E({ nombre: 'Anillo', rafaga: 1, tasa: 0, vida: [0.6, 0.6], vel: [0, 0], tam: [4, 30], colores: ['#fff7d6', '#f6d573'], alfa: [1, 0], curvaTam: 'salida', figura: 'anillo', suavizado: true, mezcla: 'luz' }), E({ nombre: 'Estrellas', inicio: 0.2, rafaga: 12, tasa: 0, vida: [0.5, 0.9], vel: [40, 90], angulo: -90, apertura: 120, gravY: 90, tam: [2, 1], colores: ['#ffffff', '#f6d573'], figura: 'estrella', curvaTam: 'pico' }), { tipo: 'luz', nombre: 'Luz', inicio: 0, color: '#ffe08a', radio: [14, 60], fuerza: 0.6, apagar: true, curva: 'salida' }] };

  const api = { Sim, plantillas: PL, DEF, CURVAS, NOMBRES_CURVA, crear: (efecto, o) => new Sim(efecto, o) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CKFx = api;
})(typeof window !== 'undefined' ? window : globalThis);
