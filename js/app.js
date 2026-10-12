/* APP: barra superior, riel de secciones, atajos generales y arranque. */
'use strict';
(function () {
  const h = CK.h;
  CK.iconos.monitor = '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>';
  const GRUPOS = [
    ['inicio', 'estilo', 'biblioteca'],
    ['mapa'],
    ['texturas', 'pixel'],
    ['anim', 'fx'],
    ['npc', 'misiones', 'interfaz'],
    ['revisor', 'portfolio']
  ];
  // secciones hermanas: comparten una sola pestaña; adentro se elige con los botoncitos que aparecen al lado
  const FAMILIAS = {
    texturas: { nombre: 'Texturas', hijos: ['texturas', 'convertir'], rotulos: ['Texturas y suelos', 'Convertir referencias'] },
    revisor: { nombre: 'Revisor', hijos: ['revisor', 'notas'], rotulos: ['Revisión', 'Notas'] }
  };
  const familiaDe = id => Object.keys(FAMILIAS).find(k => FAMILIAS[k].hijos.includes(id)) || null;
  const ultimoHijo = {};
  CK.familiaDe = familiaDe;
  let actual = null;

  // ------------------------------------------------------------ secciones
  // Una sección se ve en el área principal o en una ventana aparte (para trabajar dos cosas a la vez).
  const historial = [];
  CK.flotantes = new Map(); // id -> { caja, sec }
  CK.seccionVisible = id => CK.seccion_actual === id || CK.flotantes.has(id);
  const crearEl = (sec, id) => {
    if (sec.el) return;
    sec.el = h('div.area', { 'data-seccion': id });
    document.getElementById('contenido').append(sec.el);
    sec.crear(sec.el);
    try {
      CK.espacio.preparar(sec);
    } catch (e) {
      console.error(e);
    }
  };
  CK.ir = (id, arg, o = {}) => {
    const s = CK.secciones[id];
    if (!s) return;
    // cambios sin aplicar: pregunta (Aplicar / Descartar / Seguir) y recién después cambia de pestaña
    if (CK.aplicar && CK.P && !CK.aplicar.antesDeIr(id, arg, o)) return;
    if (!CK.P && id !== 'inicio') {
      CK.aviso('Primero creá o abrí un proyecto.', 'info');
      id = 'inicio';
    }
    const sec = CK.secciones[id],
      cont = document.getElementById('contenido');
    // abierta en ventana: se trae al frente
    if (CK.flotantes.has(id)) {
      const f = CK.flotantes.get(id);
      if (f.externa) {
        try {
          f.externa.focus();
        } catch (e) {}
      } else alFrente(f.caja);
      CK.foco = id;
      if (sec.mostrar) sec.mostrar(arg);
      pintarRiel();
      return;
    }
    if (actual && actual !== sec) {
      if (!o.volver && actual.id && actual.id !== historial[historial.length - 1]) {
        historial.push(actual.id);
        if (historial.length > 40) historial.shift();
      }
      if (actual.ocultar && !CK.flotantes.has(actual.id)) actual.ocultar();
    }
    crearEl(sec, id);
    [...cont.children].forEach(c => {
      c.style.display = c === sec.el ? '' : 'none';
    });
    actual = sec;
    CK.seccion_actual = id;
    CK.foco = id;
    if (CK.P && id !== 'inicio') CK.P.ui.seccion = id;
    pintarRiel();
    document.getElementById('estado-herr').textContent = sec.nombre;
    CK.estado(sec.desc);
    if (sec.mostrar) sec.mostrar(arg);
    if (CK.guia) CK.guia.alMostrar(id);
  };
  /** Vuelve a la sección en la que estabas antes. */
  CK.volver = () => {
    while (historial.length) {
      const id = historial.pop();
      if (id !== CK.seccion_actual && CK.secciones[id] && !CK.flotantes.has(id)) return CK.ir(id, undefined, { volver: true });
    }
    CK.aviso('No hay una sección anterior.', 'info', 1500);
  };

  // ---- ventanas de sección
  let zVentanas = 50;
  // las ventanas de sección quedan entre los paneles sueltos (40) y los diálogos (90): si se pasan, se renumeran
  const alFrente = caja => {
    if (zVentanas >= 85) {
      const orden = [...CK.flotantes.values()].sort((a, b) => (+a.caja.style.zIndex || 0) - (+b.caja.style.zIndex || 0));
      zVentanas = 50;
      orden.forEach(f => (f.caja.style.zIndex = ++zVentanas));
    }
    caja.style.zIndex = ++zVentanas;
    CK.flotantes.forEach(f => f.caja.classList.toggle('frente', f.caja === caja));
  };
  const RECT = 'ck_ventanas_v1';
  const rects = (() => {
    try {
      return JSON.parse(localStorage.getItem(RECT) || '{}') || {};
    } catch (e) {
      return {};
    }
  })();
  const guardarRects = () => {
    try {
      localStorage.setItem(RECT, JSON.stringify(rects));
    } catch (e) {}
  };
  const partido = () => {
    const lados = { izq: 0, der: 0 };
    CK.flotantes.forEach(f => {
      if (f.lado) lados[f.lado] = 1;
    });
    const c = document.getElementById('contenido');
    c.style.marginLeft = lados.izq ? '50vw' : '';
    c.style.marginRight = lados.der ? '50vw' : '';
    window.dispatchEvent(new Event('resize'));
  };
  const ubicar = (f, r) => {
    Object.assign(f.caja.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  };
  const encajar = (f, lado) => {
    const zona = document.getElementById('contenido').getBoundingClientRect(),
      top = zona.top,
      alto = innerHeight - top - document.getElementById('estado').offsetHeight;
    f.lado = lado || null;
    f.caja.classList.toggle('encajada', !!lado);
    if (lado === 'izq') ubicar(f, { x: 0, y: top, w: innerWidth / 2, h: alto });
    else if (lado === 'der') ubicar(f, { x: innerWidth / 2, y: top, w: innerWidth / 2, h: alto });
    else if (lado === 'todo') {
      f.lado = null;
      ubicar(f, { x: 0, y: top, w: innerWidth, h: alto });
    } else ubicar(f, rects[f.sec.id] || { x: innerWidth * 0.5 - 40, y: top + 30, w: innerWidth * 0.48, h: alto - 60 });
    partido();
  };
  CK.flotar = (id, pos) => {
    const sec = CK.secciones[id];
    if (!sec || !CK.P || id === 'inicio' || CK.flotantes.has(id)) return;
    crearEl(sec, id);
    const cuerpo = h('div.vsec-cuerpo');
    const cerrarB = (ico, tip, on) => CK.btn({ ico, tip, cls: 'chico plano', on });
    const caja = h(
      'div.vsec',
      h(
        'div.vsec-barra',
        h('span', { html: CK.ico(sec.ico, 15) }),
        h('b.vsec-tit', sec.nombre),
        h('span.crece'),
        cerrarB('pegar', 'Mitad izquierda (el resto de la pantalla queda para la otra sección)', () => encajar(f, 'izq')),
        cerrarB('ventanas', 'Ventana libre', () => encajar(f, null)),
        cerrarB('despegar', 'Mitad derecha', () => encajar(f, 'der')),
        cerrarB('centrar', 'Pantalla completa', () => encajar(f, 'todo')),
        cerrarB('monitor', 'Llevar a otra pantalla (ventana del navegador aparte, para el segundo monitor)', () => CK.aOtraPantalla(id)),
        cerrarB('pegar', 'Volver a pegar en la barra (pasa a ser la sección principal)', () => CK.pegarSeccion(id)),
        cerrarB('cerrar', 'Cerrar la ventana', () => CK.cerrarVentana(id))
      ),
      cuerpo
    );
    const f = { caja, sec, lado: null };
    caja.querySelectorAll('.vsec-barra .btn')[0].firstChild.style.transform = 'scaleX(-1)';
    cuerpo.append(sec.el);
    sec.el.style.display = '';
    document.body.append(caja);
    CK.flotantes.set(id, f);
    alFrente(caja);
    encajar(f, rects[id] && rects[id].lado ? rects[id].lado : null);
    if (pos)
      ubicar(
        f,
        Object.assign({}, rects[id] || { w: innerWidth * 0.48, h: innerHeight * 0.7 }, {
          x: Math.max(0, pos.x - 120),
          y: Math.max(40, pos.y - 12)
        })
      );
    // mover arrastrando la barra; al soltar cerca de un borde se encaja en esa mitad
    const barra = caja.firstChild;
    barra.addEventListener('pointerdown', e => {
      if (e.target.closest('.btn')) return;
      const r0 = caja.getBoundingClientRect(),
        x0 = e.clientX,
        y0 = e.clientY;
      barra.setPointerCapture(e.pointerId);
      const mv = ev => {
        if (f.lado) {
          f.lado = null;
          caja.classList.remove('encajada');
          partido();
        }
        ubicar(f, { x: r0.left + ev.clientX - x0, y: Math.max(40, r0.top + ev.clientY - y0), w: r0.width, h: r0.height });
      };
      const up = ev => {
        barra.removeEventListener('pointermove', mv);
        barra.removeEventListener('pointerup', up);
        if (ev.clientX < 12) encajar(f, 'izq');
        else if (ev.clientX > innerWidth - 12) encajar(f, 'der');
        guardarR();
      };
      barra.addEventListener('pointermove', mv);
      barra.addEventListener('pointerup', up);
    });
    barra.addEventListener('dblclick', e => {
      if (!e.target.closest('.btn')) encajar(f, f.lado ? null : 'der');
    });
    const guardarR = () => {
      const r = caja.getBoundingClientRect();
      rects[id] = f.lado ? Object.assign(rects[id] || {}, { lado: f.lado }) : { x: r.left, y: r.top, w: r.width, h: r.height };
      guardarRects();
    };
    new ResizeObserver(() => {
      if (!caja.isConnected) return;
      window.dispatchEvent(new Event('resize'));
      if (!f.lado) guardarR();
    }).observe(caja);
    caja.addEventListener(
      'pointerdown',
      () => {
        alFrente(caja);
        CK.foco = id;
      },
      true
    );
    // si era la principal, el área principal vuelve a la anterior
    if (actual === sec) {
      actual = null;
      CK.seccion_actual = null;
      let prev = null;
      while (historial.length && !prev) {
        const q = historial.pop();
        if (q !== id && !CK.flotantes.has(q)) prev = q;
      }
      CK.ir(prev || 'inicio', undefined, { volver: true });
    }
    CK.foco = id;
    if (sec.mostrar) sec.mostrar();
    pintarRiel();
    CK.aviso(sec.nombre + ' quedó en una ventana aparte. Arrastrala de la barra, encajala en una mitad o volvé a pegarla.', 'info', 4500);
  };
  /**
   * Lleva una sección a una ventana del navegador aparte, que se puede arrastrar a otro monitor.
   * La sección sigue siendo la misma (mismo proyecto, mismo deshacer): solo cambia de ventana.
   */
  CK.aOtraPantalla = id => {
    const sec = CK.secciones[id];
    if (!sec || !CK.P || id === 'inicio') return;
    const prev = CK.flotantes.get(id);
    if (prev && prev.externa) {
      try {
        prev.externa.focus();
      } catch (e) {}
      return;
    }
    const r = rects['ext:' + id] || {
      x: (screen.availLeft || 0) + 60,
      y: (screen.availTop || 0) + 60,
      w: Math.round(screen.availWidth * 0.6),
      h: Math.round(screen.availHeight * 0.75)
    };
    const w = window.open('', 'ck_sec_' + id, 'popup=yes,left=' + r.x + ',top=' + r.y + ',width=' + r.w + ',height=' + r.h);
    if (!w) {
      CK.aviso('El navegador bloqueó la ventana nueva. Permití las ventanas emergentes para esta página y probá de nuevo.', 'error', 6000);
      return;
    }
    if (prev) devolver(prev);
    crearEl(sec, id);
    const D = w.document;
    D.open();
    D.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title></title></head><body></body></html>');
    D.close();
    D.title = sec.nombre + ' · ' + document.title;
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(n => {
      const c = D.createElement(n.tagName);
      if (n.tagName === 'LINK') {
        c.rel = 'stylesheet';
        c.href = n.href;
      } else c.textContent = n.textContent;
      D.head.append(c);
    });
    D.body.className = document.body.className;
    const cuerpo = D.createElement('div');
    cuerpo.className = 'externa-cuerpo';
    cuerpo.style.cssText = 'position:fixed;inset:0;overflow:hidden';
    D.body.append(cuerpo);
    cuerpo.append(sec.el);
    sec.el.style.display = '';
    const f = { caja: cuerpo, sec, lado: null, externa: w };
    CK.flotantes.set(id, f);
    CK._externas.add(w);
    CK.instalarIndicadores(D);
    // foco: menús, diálogos y teclas van a la ventana donde se está trabajando
    const enfocar = () => {
      CK._docActivo = D;
      CK.foco = id;
      pintarRiel();
    };
    w.addEventListener('focus', enfocar);
    D.addEventListener('pointerdown', enfocar, true);
    // los atajos se atienden igual que en la ventana principal (salvo al escribir en un campo)
    const reenviarTecla = e => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') || (e.target && e.target.isContentEditable)) return;
      const c = new KeyboardEvent(e.type, {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        repeat: e.repeat,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(c);
      if (c.defaultPrevented) e.preventDefault();
    };
    w.addEventListener('keydown', reenviarTecla);
    w.addEventListener('keyup', reenviarTecla);
    // arrastres que escuchan la ventana principal (por ejemplo, el ancho de los paneles)
    ['pointermove', 'pointerup'].forEach(t =>
      w.addEventListener(t, e => {
        window.dispatchEvent(
          new PointerEvent(t, {
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            button: e.button,
            buttons: e.buttons,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            bubbles: true
          })
        );
      })
    );
    const guardarR = () => {
      if (w.closed) return;
      rects['ext:' + id] = { x: w.screenX, y: w.screenY, w: w.outerWidth, h: w.outerHeight };
      guardarRects();
    };
    w.addEventListener(
      'resize',
      CK.debounce(() => {
        (CK._vistas || []).forEach(v => v.c.ownerDocument === D && v.medir());
        window.dispatchEvent(new Event('resize'));
        if (sec.mostrar) sec.mostrar();
        guardarR();
      }, 60)
    );
    const vigilar = setInterval(() => {
      if (w.closed) return clearInterval(vigilar);
      guardarR();
    }, 2000);
    // si el usuario cierra la ventana, la sección vuelve a la principal
    w.addEventListener('pagehide', () => {
      if (f.cerrando || CK.flotantes.get(id) !== f) return;
      devolver(f);
      if (CK.foco === id) CK.foco = CK.seccion_actual;
      pintarRiel();
      CK.aviso(sec.nombre + ' volvió a la ventana principal.', 'info');
    });
    // si era la principal, el área principal vuelve a la anterior
    if (actual === sec) {
      actual = null;
      CK.seccion_actual = null;
      let ant = null;
      while (historial.length && !ant) {
        const q = historial.pop();
        if (q !== id && !CK.flotantes.has(q)) ant = q;
      }
      CK.ir(ant || 'inicio', undefined, { volver: true });
    }
    partido();
    enfocar();
    setTimeout(() => {
      (CK._vistas || []).forEach(v => v.c.ownerDocument === D && v.medir());
      if (sec.mostrar) sec.mostrar();
    }, 80);
    CK.aviso(sec.nombre + ' quedó en una ventana aparte: arrastrala al otro monitor. Al cerrarla vuelve sola.', 'info', 5000);
    return w;
  };
  window.addEventListener('pagehide', () => CK._externas.forEach(w => !w.closed && w.close()));
  document.addEventListener(
    'pointerdown',
    () => {
      CK._docActivo = null;
    },
    true
  );
  window.addEventListener('focus', () => {
    CK._docActivo = null;
  });
  /** Saca la sección de su ventana (interna o de otra pantalla) y la deja guardada en el área principal. */
  const devolver = f => {
    CK.flotantes.delete(f.sec.id);
    f.sec.el.style.display = 'none';
    document.getElementById('contenido').append(f.sec.el);
    if (f.externa) {
      CK._externas.delete(f.externa);
      if (CK._docActivo === f.externa.document) CK._docActivo = null;
      f.cerrando = true;
      try {
        if (!f.externa.closed) f.externa.close();
      } catch (e) {}
    } else f.caja.remove();
    (CK._vistas || []).forEach(v => v.c.isConnected && v.medir());
  };
  CK.pegarSeccion = id => {
    const f = CK.flotantes.get(id);
    if (!f) return;
    devolver(f);
    partido();
    CK.ir(id);
  };
  CK.cerrarVentana = id => {
    const f = CK.flotantes.get(id);
    if (!f) return;
    devolver(f);
    if (f.sec.ocultar) f.sec.ocultar();
    partido();
    if (CK.foco === id) CK.foco = CK.seccion_actual;
    pintarRiel();
  };
  document.addEventListener(
    'pointerdown',
    e => {
      if (e.target.closest && e.target.closest('#contenido')) CK.foco = CK.seccion_actual;
    },
    true
  );

  // ---- barra de secciones (pestañas arriba; opción: riel a la izquierda como antes)
  const VERTICAL = 'ck_riel_vertical';
  const esVertical = () => {
    try {
      return localStorage.getItem(VERTICAL) === '1';
    } catch (e) {
      return false;
    }
  };
  const pintarRiel = () => {
    const r = document.getElementById('riel');
    if (!r || !r.dataset.listo) return;
    const fa = familiaDe(CK.seccion_actual);
    if (fa) ultimoHijo[fa] = CK.seccion_actual;
    r.querySelectorAll('.riel-btn').forEach(b => {
      const f = b.dataset.familia;
      b.classList.toggle('activo', f ? f === fa : b.dataset.id === CK.seccion_actual);
      b.classList.toggle('flotante', f ? FAMILIAS[f].hijos.some(x => CK.flotantes.has(x)) : CK.flotantes.has(b.dataset.id));
    });
    r.querySelectorAll('.riel-sub').forEach(sb => {
      sb.classList.toggle('ver', sb.dataset.familia === fa);
      sb.querySelectorAll('button').forEach(x => {
        x.classList.toggle('activo', x.dataset.id === CK.seccion_actual);
        x.classList.toggle('flotante', CK.flotantes.has(x.dataset.id));
      });
    });
    if (bVolver) {
      const prev = [...historial].reverse().find(q => q !== CK.seccion_actual && CK.secciones[q] && !CK.flotantes.has(q));
      bVolver.disabled = !prev;
      CK.tip(bVolver, prev ? 'Volver a ' + CK.secciones[prev].nombre : 'Volver', 'Vuelve a la sección en la que estabas antes.', 'Alt + ←');
    }
  };
  const riel = () => {
    const r = CK.vaciar(document.getElementById('riel'));
    document.body.classList.toggle('riel-vertical', esVertical());
    GRUPOS.forEach((g, gi) => {
      if (gi) r.append(h('div.riel-sep'));
      g.forEach(id0 => {
        const fam = FAMILIAS[id0] ? id0 : null,
          s0 = CK.secciones[id0];
        if (!s0) return;
        // en una familia, el clic derecho y el arrastre actúan sobre la hermana que se está viendo
        const cual = () => (fam ? ultimoHijo[fam] || id0 : id0);
        const b = h(
          'button.riel-btn',
          {
            type: 'button',
            'data-id': id0,
            'data-familia': fam || null,
            html: CK.ico(s0.ico, esVertical() ? 24 : 16),
            onclick: () => CK.ir(cual())
          },
          h('span', fam ? FAMILIAS[fam].nombre : s0.corto || s0.nombre)
        );
        const id = id0,
          s = s0;
        CK.tip(
          b,
          s.nombre,
          s.desc + (id === 'inicio' ? '' : ' Clic derecho o arrastrar hacia abajo: abrir en una ventana aparte.'),
          s.atajo,
          esVertical() ? 'der' : 'abajo'
        );
        b.addEventListener('contextmenu', e => {
          const id = cual(),
            s = CK.secciones[id];
          return CK.menu(e, [
            { titulo: s.nombre },
            { txt: 'Abrir acá', ico: 'ok', on: () => (CK.flotantes.has(id) ? CK.pegarSeccion(id) : CK.ir(id)) },
            id !== 'inicio' && !CK.flotantes.has(id)
              ? { txt: 'Abrir en una ventana aparte', ico: 'despegar', on: () => CK.flotar(id) }
              : null,
            id !== 'inicio' && !(CK.flotantes.get(id) || {}).externa
              ? { txt: 'Llevar a otra pantalla', ico: 'monitor', on: () => CK.aOtraPantalla(id) }
              : null,
            CK.flotantes.has(id) ? { txt: 'Traer la ventana al frente', ico: 'ventanas', on: () => CK.ir(id) } : null,
            CK.flotantes.has(id) ? { txt: 'Cerrar la ventana', ico: 'cerrar', on: () => CK.cerrarVentana(id) } : null,
            '-',
            {
              txt: esVertical() ? 'Secciones arriba, en pestañas' : 'Secciones a la izquierda, como antes',
              ico: 'ajustes',
              on: alternarRiel
            }
          ]);
        });
        // arrastrar la pestaña fuera de la barra la abre en una ventana
        b.addEventListener('pointerdown', e => {
          const id = cual();
          if (e.button !== 0 || id === 'inicio') return;
          const x0 = e.clientX,
            y0 = e.clientY;
          const mv = ev => {
            const lejos = esVertical() ? ev.clientX - x0 > 60 : ev.clientY - y0 > 50;
            if (lejos) {
              fin();
              CK.flotar(id, { x: ev.clientX, y: ev.clientY });
            }
          };
          const fin = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', fin);
          };
          window.addEventListener('pointermove', mv);
          window.addEventListener('pointerup', fin);
        });
        r.append(b);
        if (fam)
          r.append(
            h(
              'div.riel-sub',
              { 'data-familia': fam },
              FAMILIAS[fam].hijos.map((x, k) =>
                CK.secciones[x]
                  ? CK.tip(
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-id': x,
                          onclick: () => CK.ir(x),
                          oncontextmenu: e =>
                            CK.menu(e, [
                              { titulo: CK.secciones[x].nombre },
                              { txt: 'Abrir en una ventana aparte', ico: 'despegar', on: () => CK.flotar(x) },
                              { txt: 'Llevar a otra pantalla', ico: 'monitor', on: () => CK.aOtraPantalla(x) }
                            ])
                        },
                        FAMILIAS[fam].rotulos[k]
                      ),
                      CK.secciones[x].nombre,
                      CK.secciones[x].desc
                    )
                  : null
              )
            )
          );
      });
    });
    r.dataset.listo = '1';
    pintarRiel();
  };
  const alternarRiel = () => {
    try {
      localStorage.setItem(VERTICAL, esVertical() ? '0' : '1');
    } catch (e) {}
    riel();
    window.dispatchEvent(new Event('resize'));
  };
  CK.alternarRiel = alternarRiel;
  let bVolver = null;

  // ------------------------------------------------------------ barra superior
  const ESCUDO =
    '<svg class="marca-escudo" viewBox="0 0 26 26"><path d="M13 2l9 3v8c0 5.500-3.800 9.500-9 11-5.200-1.500-9-5.500-9-11V5z" fill="#e8b83a"/><path d="M13 2v22c5.200-1.500 9-5.500 9-11V5z" fill="#c8962a"/><path d="M9 9h3v3H9zM14 9h3v3h-3zM9 14h3v3H9zM14 14h3v3h-3z" fill="#1d1a10"/></svg>'
      .replace(/\.500/g, '.5')
      .replace(/\.800/g, '.8')
      .replace(/\.200/g, '.2');
  let chipProy, chipEd, chipJu, cuentaRev, cuentaNot, bDes, bRe;
  /** Historial: los últimos pasos; clic en uno deshace o rehace hasta ahí. */
  const irAlPaso = n => {
    const H = CK.hist;
    let guarda = 200;
    while (H.pos > n && guarda--) H.deshacer();
    while (H.pos < n && guarda--) H.rehacer();
  };
  CK.irAlPaso = irAlPaso;
  const menuHistorial = e => {
    const H = CK.hist,
      desde = Math.max(0, H.pila.length - 30),
      items = [{ titulo: H.pila.length ? 'Historial (' + H.pila.length + ' pasos)' : 'Historial vacío' }];
    if (desde > 0) items.push({ txt: '… ' + desde + ' pasos más viejos', off: true });
    items.push({ txt: 'Como estaba al empezar', ico: H.pos === 0 ? 'ok' : 'nada', on: () => irAlPaso(0), off: !H.pila.length });
    for (let i = desde; i < H.pila.length; i++)
      items.push({
        txt: (i >= H.pos ? '↷ ' : '') + H.pila[i].nombre,
        ico: H.pos === i + 1 ? 'ok' : 'nada',
        on: () => irAlPaso(i + 1)
      });
    if (H.pila.length > H.pos) items.push('-', { txt: 'Los pasos con ↷ están deshechos: elegí uno para rehacer hasta ahí.', off: true });
    CK.menu(e, items);
  };
  const barra = () => {
    const b = CK.vaciar(document.getElementById('barra'));
    chipProy = h(
      'div.proy',
      { onclick: menuProyecto },
      h('span.punto'),
      h('b', 'Sin proyecto'),
      h('span', { html: CK.ico('flechaAb', 14) })
    );
    CK.tip(
      chipProy,
      'Proyecto',
      'Clic para cambiar el nombre, abrir otro proyecto, crear uno nuevo, descargar una copia o volver a una versión anterior. El punto dorado indica cambios sin guardar.'
    );
    bDes = CK.btn({
      ico: 'deshacer',
      tip: 'Deshacer',
      desc: 'Vuelve atrás el último cambio.',
      tecla: 'Ctrl + Z',
      cls: 'plano',
      on: () => CK.hist.deshacer()
    });
    bRe = CK.btn({
      ico: 'rehacer',
      tip: 'Rehacer',
      desc: 'Repite el cambio que deshiciste.',
      tecla: 'Ctrl + Y',
      cls: 'plano',
      on: () => CK.hist.rehacer()
    });
    chipEd = h('span.chip', { onclick: () => conectar('editor') });
    chipJu = h('span.chip', { onclick: () => conectar('juego') });
    cuentaRev = h('span.cuenta.cero', '0');
    cuentaNot = h('span.cuenta.cero', '0');
    const bRev = CK.btn({
      ico: 'revisor',
      txt: 'Revisor',
      desc: 'Lista lo que desentona o falta: assets fuera de paleta, tamaños distintos, objetos sin colisión, zonas sin salida.',
      cls: 'plano',
      on: () => CK.ir('revisor')
    });
    bRev.append(cuentaRev);
    const bNot = CK.btn({
      ico: 'notas',
      txt: 'Notas',
      desc: 'Pendientes y comentarios que dejaste en el proyecto. Claude los lee y marca lo resuelto.',
      cls: 'plano',
      on: () => CK.ir('notas')
    });
    bNot.append(cuentaNot);
    const bInd = CK.btn({
      ico: 'info',
      tip: 'Indicadores',
      desc: 'Muestra u oculta estos carteles que explican cada herramienta al detenerte sobre ella.',
      cls: 'plano activo',
      on: (e, el) => {
        CK.verIndicadores = !CK.verIndicadores;
        el.classList.toggle('activo', CK.verIndicadores);
        CK.aviso(CK.verIndicadores ? 'Indicadores activados' : 'Indicadores ocultos', 'info', 1600);
      }
    });
    bVolver = CK.btn({
      ico: 'flechaD',
      tip: 'Volver',
      desc: 'Vuelve a la sección en la que estabas antes.',
      tecla: 'Alt + ←',
      cls: 'plano',
      on: () => CK.volver()
    });
    bVolver.firstChild.style.transform = 'scaleX(-1)';
    b.append(
      h('div.marca', { html: ESCUDO }, h('span', 'Taller')),
      bVolver,
      chipProy,
      CK.btn({
        ico: 'guardar',
        txt: 'Guardar',
        desc: 'Guarda el proyecto para seguir después. Además se guarda solo cada minuto.',
        tecla: 'Ctrl + S',
        on: () => CK.guardar()
      }),
      CK.btn({
        ico: 'version',
        tip: 'Guardar versión',
        desc: 'Guarda una copia numerada del proyecto para poder volver a este punto si un cambio no te convence.',
        cls: 'plano',
        on: guardarVersion
      }),
      h('div.barra-sep'),
      bDes,
      bRe,
      CK.btn({
        ico: 'tiempo',
        tip: 'Historial',
        desc: 'La lista de lo último que hiciste. Clic en cualquier paso para volver ahí (o adelantarte si lo habías deshecho).',
        cls: 'plano',
        on: e => menuHistorial(e)
      }),
      h('div.barra-sep'),
      CK.btn({
        ico: 'exportar',
        txt: 'Exportar al juego',
        desc: 'Copia a la carpeta del juego los assets y mapas listos, en el formato que el juego lee.',
        on: () => CK.juego.ventanaExportar()
      }),
      CK.btn({
        ico: 'probar',
        txt: 'Probar',
        desc: 'Exporta lo último y abre CastleKnight en otra pestaña, en el mapa que estabas editando.',
        tecla: 'F5',
        cls: 'pri',
        on: () => CK.juego.probar()
      }),
      h('div.barra-esp'),
      h('div.carpetas', chipEd, chipJu),
      h('div.barra-sep'),
      bRev,
      bNot,
      CK.btn({
        ico: 'ventanas',
        txt: 'Espacio',
        desc: 'Acomodá el espacio de trabajo: qué paneles se ven, cuáles van sueltos como ventanas, y el botón para restablecer todo.',
        tecla: 'Ctrl + Mayús + 0: restablecer',
        cls: 'plano',
        on: () => CK.espacio.ventana()
      }),
      bInd,
      CK.btn({
        ico: 'tema',
        tip: 'Interfaz',
        desc: 'Modo simple o completo, tamaño de la interfaz, cursores elegantes y los recorridos guiados de cada sección.',
        cls: 'plano',
        on: e => CK.temaUI.menu(e)
      }),
      CK.btn({
        ico: 'ayuda',
        tip: '¿Cómo hago…?',
        desc: 'Recetas cortas para las tareas de siempre (pintar el suelo, animar una bandera, ponerle sonido a un golpe…), con botones que te llevan directo.',
        cls: 'plano',
        on: () => CK.guia.ventana()
      }),
      CK.btn({ ico: 'teclado', tip: 'Atajos de teclado', desc: 'Lista de todas las teclas rápidas.', tecla: '?', cls: 'plano', on: atajos })
    );
    pintarBarra();
    // si no entra todo, los botones de la derecha quedan solo con su ícono (el nombre sale al pasar el mouse)
    const ajustar = () => {
      b.classList.remove('compacta', 'muy-compacta');
      if (b.scrollWidth > b.clientWidth + 2) b.classList.add('compacta');
      if (b.scrollWidth > b.clientWidth + 2) b.classList.add('muy-compacta');
    };
    new ResizeObserver(CK.debounce(ajustar, 60)).observe(b);
    CK.on('interfaz', () => setTimeout(ajustar, 60));
    setTimeout(ajustar, 50);
  };
  const pintarBarra = () => {
    if (!chipProy) return;
    chipProy.querySelector('b').textContent = CK.P ? CK.P.nombre : 'Sin proyecto';
    chipProy.classList.toggle('sucio', !!CK._sucio);
    const chip = (el, tipo, rot) => {
      const d = CK.fs.dir(tipo),
        pend = CK.fs.pendiente(tipo);
      el.className = 'chip ' + (d ? 'ok' : 'falta');
      el.innerHTML =
        CK.ico(d ? 'carpeta' : 'enlace', 14) + '<span>' + rot + (d ? ': ' + d.name : pend ? ': reconectar' : ': conectar') + '</span>';
      CK.tip(
        el,
        'Carpeta ' + rot.toLowerCase(),
        d
          ? 'Conectada a "' + d.name + '". Clic para elegir otra.'
          : pend
            ? 'El navegador pide permiso de nuevo en cada sesión. Clic para volver a conectar.'
            : tipo === 'editor'
              ? 'Elegí la carpeta del editor (D:\\Editor). Ahí se guardan los proyectos en archivos, para respaldo y para que Claude pueda trabajar sobre ellos.'
              : 'Elegí la carpeta de CastleKnight (D:\\prueba) para importar sus mapas y assets y exportarle los resultados.'
      );
    };
    chip(chipEd, 'editor', 'Editor');
    chip(chipJu, 'juego', 'Juego');
    bDes.disabled = !CK.hist.pos;
    bRe.disabled = CK.hist.pos >= CK.hist.pila.length;
    let np = 0;
    try {
      np = CK.P ? (CK.todasLasNotas ? CK.todasLasNotas().filter(x => !x.n.hecho).length : CK.P.notas.filter(n => !n.hecho).length) : 0;
    } catch (e) {}
    cuentaNot.textContent = np;
    cuentaNot.classList.toggle('cero', !np);
  };
  CK.pintarCuentaRevisor = n => {
    if (cuentaRev) {
      cuentaRev.textContent = n;
      cuentaRev.classList.toggle('cero', !n);
    }
  };
  ['sucio', 'proyecto', 'carpetas', 'hist', 'notas', 'guardado'].forEach(ev => CK.on(ev, pintarBarra));

  const conectar = async tipo => {
    if (CK.fs.pendiente(tipo)) {
      await CK.fs.recordar(true);
      if (CK.fs.dir(tipo)) {
        CK.aviso('Carpeta reconectada');
        CK.emit('carpetas');
        return;
      }
    }
    await CK.fs.conectar(tipo);
  };
  CK.conectarCarpeta = conectar;
  const guardarVersion = async () => {
    if (!CK.P) return;
    const nota = await CK.pedir('Guardar versión', 'Nota corta (opcional)', '');
    if (nota === null) return;
    CK.guardar({ version: true, nota, silencio: true });
  };

  const menuProyecto = async () => {
    const lista = await CK.proyectos(),
      cuerpo = h('div');
    const cerrar = () => cuerpo.closest('.ventana').cerrar(null);
    if (CK.P)
      cuerpo.append(
        CK.seccion(
          'Proyecto abierto',
          CK.campo(
            'Nombre',
            CK.txt(CK.P.nombre, v => {
              if (v.trim()) {
                CK.P.nombre = v.trim();
                Object.keys(CK.img).forEach(id => CK._imgSucias.add(id));
                CK.tocar();
                pintarBarra();
              }
            })
          ),
          h(
            'div.fila',
            { style: { marginTop: '8px' } },
            CK.btn({
              ico: 'importar',
              txt: 'Descargar copia',
              desc: 'Baja todo el proyecto en un solo archivo .ckproj, con sus imágenes adentro.',
              on: () => CK.descargar(CK.empaquetar(), CK.slug(CK.P.nombre) + '.ckproj')
            }),
            CK.btn({
              ico: 'tiempo',
              txt: 'Copias automáticas',
              desc: 'Copias de todo el proyecto que el editor guarda solo cada 10 minutos. Volvé a cualquiera.',
              on: () => {
                cerrar();
                CK.copias.ventana();
              }
            }),
            CK.btn({
              ico: 'version',
              txt: 'Versiones',
              desc: 'Volver a una copia numerada anterior.',
              on: () => {
                cerrar();
                verVersiones();
              }
            }),
            CK.btn({
              ico: 'recargar',
              txt: 'Recargar de la carpeta',
              desc: 'Vuelve a leer los archivos del disco. Usalo después de que Claude trabaje sobre el proyecto.',
              on: async () => {
                cerrar();
                await CK.abrir(CK.slug(CK.P.nombre), 'disco');
              }
            })
          )
        )
      );
    const otros = h('div.lista');
    lista.forEach(p =>
      otros.append(
        h(
          'div.item' + (CK.P && CK.slug(CK.P.nombre) === p.slug ? '.activo' : ''),
          {
            onclick: async () => {
              cerrar();
              if (CK._sucio) await CK.guardar({ silencio: true });
              await CK.abrir(p.slug);
            }
          },
          h('span', { html: CK.ico('carpeta', 16) }),
          h('span.nombre', p.nombre || p.slug),
          h('span.sub', CK.fecha(p.modificado)),
          p.disco ? h('span.etq.verde', 'en carpeta') : h('span.etq', 'navegador')
        )
      )
    );
    cuerpo.append(
      CK.seccion(
        'Abrir otro',
        lista.length ? otros : h('p.ayuda-txt', 'Todavía no hay proyectos guardados.'),
        h(
          'div.fila',
          { style: { marginTop: '10px' } },
          CK.btn({
            ico: 'mas',
            txt: 'Proyecto nuevo',
            cls: 'pri',
            on: async () => {
              cerrar();
              const n = await CK.pedir('Proyecto nuevo', 'Nombre del proyecto', 'CastleKnight');
              if (n) {
                if (CK._sucio) await CK.guardar({ silencio: true });
                await CK.nuevo(n);
                CK.ir('inicio');
              }
            }
          }),
          CK.btn({
            ico: 'exportar',
            txt: 'Abrir archivo .ckproj',
            on: async () => {
              cerrar();
              const [f] = await CK.elegirArchivos('.ckproj,application/json');
              if (f)
                try {
                  await CK.desempaquetar(f);
                  CK.aviso('Proyecto abierto desde archivo');
                } catch (e) {
                  CK.aviso(e.message, 'error');
                }
            }
          })
        )
      )
    );
    CK.ventana({ titulo: 'Proyectos', ancho: 540, cuerpo });
  };
  CK.menuProyecto = menuProyecto;
  const verVersiones = async () => {
    const vs = await CK.versiones(),
      cuerpo = h('div');
    if (!vs.length)
      cuerpo.append(
        h('p', 'Todavía no guardaste versiones. Usá el botón del reloj en la barra para guardar una antes de un cambio grande.')
      );
    vs.forEach(v =>
      cuerpo.append(
        h(
          'div.item',
          h('span', { html: CK.ico('version', 16) }),
          h('span.nombre', v.nombre),
          CK.btn({
            txt: 'Volver a esta',
            cls: 'chico',
            on: async () => {
              if (
                await CK.confirmar(
                  'Volver a esta versión',
                  'Los mapas, NPC, efectos y notas vuelven a como estaban en esa versión. Las imágenes quedan como están hoy. Antes se guarda una versión del estado actual.',
                  'Volver'
                )
              ) {
                await CK.guardar({ version: true, nota: 'antes de volver', silencio: true });
                await CK.volverA(await v.leer());
                cuerpo.closest('.ventana').cerrar(null);
                CK.aviso('Proyecto restaurado');
              }
            }
          })
        )
      )
    );
    CK.ventana({ titulo: 'Versiones guardadas', ancho: 500, cuerpo });
  };
  // atajos que no tienen un botón propio (los demás se leen solos de los botones de cada sección)
  const ATAJOS_EXTRA = {
    general: [
      ['Ctrl + S', 'Guardar'],
      ['Ctrl + Z / Ctrl + Y', 'Deshacer / Rehacer'],
      ['Ctrl + K', 'Buscar cualquier acción, sección o asset'],
      ['F5', 'Probar en el juego (otra pestaña)'],
      ['Alt + ←', 'Volver a la sección anterior'],
      ['Espacio + arrastrar', 'Mover la vista'],
      ['Rueda', 'Acercar o alejar'],
      ['0 / + / −', 'Ver todo / acercar / alejar'],
      ['Ctrl + Mayús + 0', 'Restablecer el espacio de trabajo'],
      ['?', 'Esta lista']
    ],
    mapa: [
      ['Supr', 'Borrar lo seleccionado'],
      ['Ctrl + D', 'Duplicar'],
      ['Ctrl + G / Ctrl + Mayús + G', 'Agrupar / desagrupar'],
      ['H', 'Voltear lo seleccionado'],
      ['Flechas', 'Mover 1 píxel (Mayús: 1 tile)'],
      ['[ y ]', 'Tamaño del pincel / enviar atrás y traer adelante'],
      ['R / F / Mayús + F', 'Tiles: girar / espejo horizontal / vertical'],
      ['Alt + clic', 'Tiles: tomar la pieza del mapa']
    ],
    pixel: [
      ['Alt + clic', 'Cuentagotas'],
      ['X', 'Intercambiar colores'],
      ['[ y ]', 'Tamaño de la punta'],
      [', y .', 'Cuadro anterior / siguiente'],
      ['Enter / Esc', 'Aplicar / cancelar la transformación']
    ],
    anim: [
      ['Ctrl + D / Ctrl + C / Ctrl + V', 'Duplicar / copiar / pegar cuadros'],
      ['Supr', 'Borrar cuadros'],
      ['Alt + ← / →', 'Mover el cuadro'],
      ['Espacio', 'Reproducir / pausar']
    ]
  };
  const atajos = () => {
    const id = CK.foco || CK.seccion_actual,
      sec = CK.secciones[id];
    // lo que tiene botón con atajo en la sección que se está usando
    const vistos = new Set(),
      propios = [];
    if (sec && sec.el)
      sec.el.querySelectorAll('[data-tecla]').forEach(b => {
        const k = b.dataset.tecla,
          t = b.dataset.tip;
        if (!k || !t || vistos.has(k + t)) return;
        vistos.add(k + t);
        propios.push([k, t]);
      });
    const delaSeccion = propios.concat((ATAJOS_EXTRA[id] || []).filter(([k, t]) => !vistos.has(k + t)));
    const grupos = [];
    if (delaSeccion.length) grupos.push([(sec ? sec.nombre : 'Esta sección') + ' (donde estás)', delaSeccion]);
    grupos.push(['En todo el editor', ATAJOS_EXTRA.general]);
    const lista = h('div.atajos-lista');
    const pintar = filtro => {
      CK.vaciar(lista);
      const f = (filtro || '').toLowerCase();
      grupos.forEach(([t, l]) => {
        const ls = l.filter(([k, d]) => !f || (k + ' ' + d).toLowerCase().includes(f));
        if (!ls.length) return;
        lista.append(
          h('h3.bloque-tit', { style: { marginTop: '12px' } }, t),
          h(
            'table.tabla',
            ls.map(([k, d]) => h('tr', h('td', { style: { width: '210px' } }, h('kbd', k)), h('td', d)))
          )
        );
      });
      if (!lista.children.length) lista.append(h('p.nota-txt', 'Ningún atajo coincide.'));
    };
    const buscar = h('input.in', { type: 'search', placeholder: 'Buscar un atajo…', oninput: e => pintar(e.target.value) });
    pintar('');
    CK.ventana({
      titulo: 'Atajos de teclado',
      ancho: 600,
      cuerpo: h(
        'div',
        buscar,
        lista,
        h(
          'p.nota-txt',
          { style: { marginTop: '12px' } },
          'Las mismas letras hacen lo mismo en todas las secciones: B pincel o lápiz, E goma, G balde, V seleccionar o mover, I cuentagotas.'
        )
      )
    });
  };

  // ------------------------------------------------------------ teclado general
  let resorte = null,
    apretado = false,
    volverLuego = null;
  const RESORTE_MS = 280;
  const volverA = r => {
    if (r.sec.herrActual() !== r.antes) r.sec.volverHerr(r.antes);
  };
  document.addEventListener('keyup', e => {
    const r = resorte;
    if (!r || e.key.toLowerCase() !== r.k) return;
    resorte = null;
    if (performance.now() - r.t < RESORTE_MS) return; // un toque: se queda en la herramienta
    if (apretado)
      volverLuego = r; // si está arrastrando, vuelve al soltar el mouse
    else volverA(r);
  });
  document.addEventListener('pointerdown', () => (apretado = true), true);
  document.addEventListener(
    'pointerup',
    () => {
      apretado = false;
      if (volverLuego) {
        const r = volverLuego;
        volverLuego = null;
        setTimeout(() => volverA(r), 0);
      }
    },
    true
  );
  window.addEventListener('blur', () => {
    resorte = null;
  });
  document.addEventListener('keydown', e => {
    if (document.querySelector('.ven-fondo')) return;
    const enCampo =
      /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) &&
      document.activeElement.type !== 'range' &&
      document.activeElement.type !== 'checkbox';
    const ctrl = e.ctrlKey || e.metaKey,
      k = e.key.toLowerCase();
    if (ctrl && k === 's') {
      e.preventDefault();
      CK.guardar();
      return;
    }
    if (e.key === 'F5') {
      e.preventDefault();
      CK.juego.probar();
      return;
    }
    if (ctrl && k === 'k') {
      e.preventDefault();
      CK.buscador.abrir();
      return;
    }
    if (enCampo) return;
    if (ctrl && k === 'z' && !e.shiftKey) {
      e.preventDefault();
      CK.hist.deshacer();
      return;
    }
    if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) {
      e.preventDefault();
      CK.hist.rehacer();
      return;
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      CK.volver();
      return;
    }
    if (e.key === '?') {
      atajos();
      return;
    }
    const destino = CK.foco && CK.flotantes.has(CK.foco) ? CK.secciones[CK.foco] : actual;
    // atajo de herramienta: tocarlo la deja puesta; mantenerlo apretado la usa un rato y al soltar vuelve a la de antes
    if (!ctrl && !e.altKey && destino && destino.herrTecla) {
      const id = destino.herrTecla(k);
      if (id) {
        if (e.repeat) {
          e.preventDefault();
          return;
        }
        const antes = destino.herrActual();
        resorte = id !== antes ? { k, antes, t: performance.now(), sec: destino } : null;
      }
    }
    if (destino && destino.tecla && destino.tecla(e, k, ctrl)) {
      e.preventDefault();
      return;
    }
    // + y − acercan o alejan la vista principal de cualquier sección que tenga una
    if (!ctrl && destino && destino.el && (k === '+' || k === '=' || k === '-')) {
      const v = (CK._vistas || [])
        .filter(x => x.c.isConnected && destino.el.contains(x.c) && x.c.offsetParent)
        .sort((a, b) => b.w * b.h - a.w * a.h)[0];
      if (v) {
        v.zoomEn(k === '-' ? -1 : 1);
        e.preventDefault();
      }
    }
  });

  // ------------------------------------------------------------ arranque
  window.addEventListener('DOMContentLoaded', async () => {
    riel();
    barra();
    await CK.fs.recordar(false);
    // siempre se arranca en Inicio: el proyecto se elige ahí y vuelve a la sección donde se lo dejó
    CK.ir('inicio');
    CK.on('proyecto', () => {
      Object.values(CK.secciones).forEach(s => {
        if (s.alCambiarProyecto) s.alCambiarProyecto();
      });
      const donde = CK.P && CK.P.ui.seccion;
      if (CK.seccion_actual === 'inicio' && donde && donde !== 'inicio' && CK.secciones[donde]) CK.ir(donde);
      else if (actual && actual.mostrar) actual.mostrar();
    });
    CK.lista = true;
    CK.emit('lista');
  });
})();
