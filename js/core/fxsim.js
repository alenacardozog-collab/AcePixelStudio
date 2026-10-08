/* FXSIM: reproduce un efecto (partículas, luces, destellos) sobre cualquier canvas 2D.
   No depende del editor: el mismo archivo sirve dentro del juego (window.CKFx).
   efecto = { dur (segundos), bucle, mov:{vx,vy}, capas:[ {tipo:'emisor'|'luz'|'destello'|'sacudida', inicio, fin, …} ] } */
(function (root) {
  'use strict';
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const hex = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const entre = (v, R) => Array.isArray(v) ? lerp(v[0], v[1], R()) : v;
  const DEF = { forma: 'punto', ancho: 0, alto: 0, tasa: 20, rafaga: 0, vida: [0.4, 0.8], vel: [20, 40], angulo: -90, apertura: 30, gravX: 0, gravY: 0, freno: 0, tam: [2, 1], colores: ['#ffffff'], alfa: [1, 1], figura: 'pixel', mezcla: 'normal', x: 0, y: 0, giro: 0 };

  class Sim {
    constructor(efecto, o = {}) { this.e = efecto; this.o = o; this.reiniciar(); }
    reiniciar() { this.t = 0; this.p = []; this.R = rng(this.o.semilla || 7); this.acum = {}; this.rafagas = {}; this.fin = false; this.sacudida = { x: 0, y: 0 }; this.ox = 0; this.oy = 0; }
    activa(c) { const a = c.inicio || 0, b = c.fin === undefined || c.fin === null ? this.e.dur : c.fin; return this.t >= a && this.t <= b; }
    emitir(c, n) {
      const R = this.R, d = Object.assign({}, DEF, c);
      for (let i = 0; i < n; i++) {
        let x = d.x + this.ox, y = d.y + this.oy;
        if (d.forma === 'linea') x += (R() - 0.5) * d.ancho; else if (d.forma === 'area') { x += (R() - 0.5) * d.ancho; y += (R() - 0.5) * d.alto; } else if (d.forma === 'circulo') { const a = R() * 6.283, r = Math.sqrt(R()) * d.ancho / 2; x += Math.cos(a) * r; y += Math.sin(a) * r * (d.alto ? d.alto / Math.max(1, d.ancho) : 1); } else if (d.forma === 'anillo') { const a = R() * 6.283; x += Math.cos(a) * d.ancho / 2; y += Math.sin(a) * (d.alto || d.ancho) / 2; }
        const ang = (d.angulo + (R() - 0.5) * d.apertura) * Math.PI / 180, v = entre(d.vel, R), vida = Math.max(0.05, entre(d.vida, R));
        this.p.push({ c, d, x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, t: 0, vida, s: R(), rot: R() * 6.283 });
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
          if (c.tasa) { this.acum[i] = (this.acum[i] || 0) + c.tasa * dt; const n = Math.floor(this.acum[i]); if (n) { this.acum[i] -= n; this.emitir(c, n); } }
        }
        if (c.tipo === 'sacudida' && this.activa(c)) { const k = 1 - (this.t - (c.inicio || 0)) / Math.max(0.01, (c.fin || e.dur) - (c.inicio || 0)), f = (c.fuerza || 2) * k; this.sacudida.x += Math.round((this.R() - 0.5) * 2 * f); this.sacudida.y += Math.round((this.R() - 0.5) * 2 * f); }
      });
      for (let i = this.p.length - 1; i >= 0; i--) {
        const q = this.p[i], d = q.d; q.t += dt; if (q.t >= q.vida) { this.p.splice(i, 1); continue; }
        q.vx += d.gravX * dt; q.vy += d.gravY * dt; if (d.freno) { const f = Math.max(0, 1 - d.freno * dt); q.vx *= f; q.vy *= f; }
        if (d.onda) q.x += Math.sin((q.t + q.s) * 8) * d.onda * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; if (d.giro) q.rot += d.giro * dt;
      }
    }
    /** Dibuja el efecto con su origen en (x, y). pase: 'particulas' | 'luces' | (nada = todo). recurso(id) devuelve { img, cuadro(i) -> {x,y,w,h}, n } para figuras que son assets. */
    dibujar(ctx, x, y, recurso, pase) {
      const e = this.e; x += this.sacudida.x; y += this.sacudida.y;
      if (pase !== 'particulas') (e.capas || []).forEach(c => {
        if (c.oculta || !this.activa(c)) return; const a = c.inicio || 0, b = c.fin === undefined || c.fin === null ? e.dur : c.fin, k = Math.min(1, Math.max(0, (this.t - a) / Math.max(0.001, b - a)));
        if (c.tipo === 'luz') {
          const r = Math.max(1, lerp(c.radio ? c.radio[0] : 30, c.radio ? c.radio[1] : 30, k) * (1 + (c.parpadeo || 0) * 0.08 * Math.sin(this.t * 31 + 1.7) * Math.sin(this.t * 13))), col = hex(c.color || '#ffcc66'), f = (c.fuerza === undefined ? 0.6 : c.fuerza) * (c.apagar ? 1 - k : 1), cx = x + (c.x || 0) + this.ox, cy = y + (c.y || 0) + this.oy;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${col},${f})`); g.addColorStop(0.5, `rgba(${col},${f * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
        } else if (c.tipo === 'destello') { ctx.save(); ctx.globalCompositeOperation = c.mezcla === 'normal' ? 'source-over' : 'lighter'; ctx.globalAlpha = (c.fuerza === undefined ? 0.6 : c.fuerza) * (1 - k); ctx.fillStyle = c.color || '#ffffff'; ctx.fillRect(-4096, -4096, 8192, 8192); ctx.restore(); }
      });
      if (pase === 'luces') return;
      for (const q of this.p) {
        const d = q.d, k = q.t / q.vida, tam = Math.max(1, Math.round(lerp(d.tam[0], d.tam[1], k))), alfa = lerp(d.alfa[0], d.alfa[1], k); if (alfa <= 0.02) continue;
        const col = d.colores[Math.min(d.colores.length - 1, Math.floor(k * d.colores.length))], px = Math.round(x + q.x), py = Math.round(y + q.y);
        ctx.globalAlpha = alfa; ctx.globalCompositeOperation = d.mezcla === 'luz' ? 'lighter' : 'source-over'; ctx.fillStyle = col;
        if (d.figura === 'pixel') ctx.fillRect(px - (tam >> 1), py - (tam >> 1), tam, tam);
        else if (d.figura === 'circulo') { const r = tam / 2; for (let yy = 0; yy < tam; yy++) { const dy = yy + 0.5 - r, w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * 2); if (w > 0) ctx.fillRect(px - Math.floor(w / 2), py - Math.floor(r) + yy, w, 1); } }
        else if (d.figura === 'chispa') { const v = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / v, uy = q.vy / v, len = Math.max(2, tam * 2); for (let s = 0; s < len; s++) ctx.fillRect(Math.round(px - ux * s), Math.round(py - uy * s), 1, 1); }
        else if (d.figura === 'cruz') { ctx.fillRect(px - tam, py, tam * 2 + 1, 1); ctx.fillRect(px, py - tam, 1, tam * 2 + 1); }
        else if (d.figura === 'gota') ctx.fillRect(px, py - tam, 1, tam + 1);
        else if (d.figura === 'asset' && recurso) { const r = recurso(d.asset); if (r && r.img) { const f = r.cuadro(d.animar ? Math.min(r.n - 1, Math.floor(k * r.n)) : Math.floor(q.s * r.n) % r.n), sc = tam / Math.max(1, d.tam[0]); ctx.save(); ctx.translate(px, py); if (d.giro) ctx.rotate(q.rot); ctx.drawImage(r.img, f.x, f.y, f.w, f.h, -Math.round(f.w * sc / 2), -Math.round(f.h * sc / 2), Math.round(f.w * sc), Math.round(f.h * sc)); ctx.restore(); } else ctx.fillRect(px, py, tam, tam); }
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

  const api = { Sim, plantillas: PL, DEF, crear: (efecto, o) => new Sim(efecto, o) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CKFx = api;
})(typeof window !== 'undefined' ? window : globalThis);
