/* ANIMAR · arma la sección, teclas y registro. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});
  const h = CK.h;

  const crear = raiz => {
    An.el = raiz;
    An.el.style.gridTemplateColumns = '292px 1fr 318px';
    An.izq = h('aside.panel', { style: { borderLeft: 0, borderRight: '1px solid var(--linea)' } });
    An.der = h('aside.panel');
    An.vistaCv = h('canvas.lienzo');
    An.sobreVista = h('div.sobre');
    const tablero = h('div.tablero', An.vistaCv, An.sobreVista);
    An.vista = CK.vista(An.vistaCv, { pintar: An.pintarVista, herramienta: An.herramientaVista, zoom: 4 });
    tablero.append(h('div.sobre.abajo.der', CK.tiraZoom(An.vista, An.encuadre)));
    An.vistaCv.addEventListener('contextmenu', An.menuVista);
    An.cajaRep = h('div', { style: { position: 'relative', display: 'grid', minHeight: 0, overflow: 'hidden' } }, tablero);
    An.lineaEl = h('div.tl', {});
    An.centro = h(
      'div',
      { style: { display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0, minHeight: 0, background: 'var(--hueco)' } },
      An.cajaRep,
      An.lineaEl
    );
    An.prueba = h('canvas', {
      width: 620,
      height: 440,
      style: {
        display: 'none',
        borderRadius: '10px',
        border: '1px solid var(--linea)',
        maxWidth: 'calc(100% - 24px)',
        imageRendering: 'pixelated',
        justifySelf: 'center',
        alignSelf: 'center'
      }
    });
    An.cajaRep.append(An.prueba);
    An.pj.x = 310;
    An.pj.y = 300;
    An.prueba.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        An.pj.Z = Math.max(1, Math.min(8, An.pj.Z + (e.deltaY < 0 ? 1 : -1)));
      },
      { passive: false }
    );
    An.prueba.addEventListener('contextmenu', e =>
      CK.menu(e, [
        { titulo: 'Prueba del personaje' },
        ...[1, 2, 3, 4, 6, 8].map(z => ({
          txt: 'Zoom ×' + z,
          activo: An.pj.Z === z,
          on: () => {
            An.pj.Z = z;
          }
        })),
        '-',
        { txt: 'Importar sprites a las poses…', ico: 'importar', on: () => An.importarPoses() }
      ])
    );
    An.tabs = CK.pestanas(
      [
        {
          id: 'generar',
          txt: 'Generar',
          ico: 'varita',
          desc: 'Crear movimiento a partir de un dibujo quieto.',
          pintar: c => {
            An.pGenerar(c);
            An.pintarPrueba();
            An.encuadreLuego();
          }
        },
        {
          id: 'hoja',
          txt: 'Hoja',
          ico: 'hoja',
          desc: 'Ajustar, alinear, ordenar en la línea de tiempo y exportar una animación guardada.',
          pintar: c => {
            An.pHoja(c);
            An.pintarPrueba();
            An.encuadreLuego();
          }
        },
        {
          id: 'poses',
          txt: 'Personaje',
          ico: 'persona',
          desc: 'Las animaciones de un personaje en sus cuatro direcciones, con prueba de caminata. Se pueden importar sprites sueltos y se reparten solos.',
          pintar: An.pPoses
        },
        {
          id: 'juego',
          txt: 'Juego',
          ico: 'importar',
          desc: 'Traer animaciones del juego, retocar sus cuadros en Pixel art y devolverlas: se reemplazan solas en el juego.',
          pintar: c =>
            CK.animJuego.pintar(c, id => {
              An.st.hoja = id;
              An.tabs.ir('hoja');
              An.pintarIzq();
            })
        }
      ],
      'generar'
    );
    An.der.append(An.tabs);
    An.el.append(An.izq, An.centro, An.der);
    An.pintarSobre();
    CK.on('notas', () => {
      if (CK.seccionVisible('anim')) An.pintarIzq();
    });
    CK.on('asset-img', id => {
      if (CK.seccionVisible('anim') && id === An.st.hoja) {
        An.cacheKey = '';
        An.pintarLinea();
        An.vista.pedir();
      }
    });
    CK.on('datos', g => {
      if (CK.seccionVisible('anim') && g === 'assets') {
        An.cacheKey = '';
        An.pintarLinea();
        An.vista.pedir();
      }
    });
    An.raf = CK.raf(An.bucle);
  };
  let ultimoEnc = '';
  An.encuadreLuego = () =>
    setTimeout(() => {
      const fr = An.cuadrosCache()[0],
        k = An.st.modo + ':' + (An.st.modo === 'hoja' ? An.st.hoja : An.st.base) + ':' + (fr ? fr.width + 'x' + fr.height : '');
      if (k !== ultimoEnc && fr) {
        ultimoEnc = k;
        An.encuadre();
      }
    }, 30);
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && arg.asset && CK.P.assets[arg.asset]) {
      const a = CK.P.assets[arg.asset];
      if (a.cuadros && !arg.objeto && !arg.generar) {
        An.st.hoja = a.id;
        An.st.selC = new Set();
        An.tabs.ir('hoja');
      } else {
        An.st.base = a.id;
        An.st.origen = arg.objeto ? { objeto: arg.objeto, mapa: arg.mapa } : null;
        const o = arg.objeto && CK.mapa.buscarObj(arg.objeto);
        if (o && o.marca && PIX.ANIMS[o.marca.tipoAnim]) {
          An.st.tipo = o.marca.tipoAnim;
          An.st.params = {};
        }
        An.tabs.ir('generar');
      }
    } else if (arg && arg.pose) {
      An.st.pose = arg.pose;
      An.tabs.ir('poses');
    } else {
      if (An.st.base && !CK.P.assets[An.st.base]) An.st.base = null;
      if (An.st.hoja && !CK.P.assets[An.st.hoja]) An.st.hoja = null;
      An.tabs.refrescar();
    }
    An.pintarIzq();
    if (An.vista) An.vista.medir();
  };
  const tecla = (e, k, ctrl) => {
    if (An.st.modo === 'poses') return false;
    if (k === ' ') {
      An.ponerPlay(!An.rep.play);
      An.pintarLinea();
      return true;
    }
    if (k === ',' || k === '.') {
      An.irA(An.rep.i + (k === '.' ? 1 : -1));
      return true;
    }
    if (k === 'home') {
      An.irA(0);
      return true;
    }
    if (k === 'end') {
      An.irA(An.secuencia().fr.length - 1);
      return true;
    }
    if (k === '0') {
      An.encuadre();
      return true;
    }
    if (k === '+' || k === '=') {
      An.vista.zoomEn(1);
      return true;
    }
    if (k === '-') {
      An.vista.zoomEn(-1);
      return true;
    }
    if (An.st.modo !== 'hoja' || !An.hojaA()) return false;
    const n = CK.asset.nCuadros(An.hojaA());
    if (k === 'delete' || k === 'backspace') {
      An.ops.borrar();
      return true;
    }
    if (ctrl && k === 'd') {
      An.ops.duplicar();
      return true;
    }
    if (ctrl && k === 'c') {
      An.ops.copiar();
      return true;
    }
    if (ctrl && k === 'v') {
      An.ops.pegar();
      return true;
    }
    if (ctrl && k === 'a') {
      An.st.selC = new Set([...Array(n).keys()]);
      An.pintarPista();
      return true;
    }
    if (k === 'arrowleft' || k === 'arrowright') {
      const d = k === 'arrowright' ? 1 : -1,
        s = An.selOrden();
      if (e.altKey && s.length) {
        An.ops.mover(d > 0 ? s[s.length - 1] + 2 : Math.max(0, s[0] - 1));
        return true;
      }
      const cur = s.length ? (d > 0 ? s[s.length - 1] : s[0]) : An.fisico(An.rep.i),
        j = Math.max(0, Math.min(n - 1, cur + d));
      if (e.shiftKey) An.st.selC.add(j);
      else {
        An.st.selC = new Set([j]);
        An.st.ancla = j;
      }
      An.pintarPista();
      An.irA(j);
      return true;
    }
    if (k === 'enter') {
      const s = An.selOrden();
      if (s.length === 1) An.editarEnPixel(s[0]);
      return true;
    }
    return false;
  };
  CK.registrar({
    id: 'anim',
    nombre: 'Animaciones',
    corto: 'Animar',
    ico: 'anim',
    desc: 'Generá movimiento desde un dibujo quieto, ordená los cuadros en la línea de tiempo, probalos con efectos y exportá PNG, datos y GIF.',
    crear,
    mostrar,
    tecla,
    alCambiarProyecto: () => {
      An.st.base = An.st.hoja = An.st.origen = An.st.pose = null;
      An.st.frames = [];
      An.st.fxGen = [];
      An.st.selC = new Set();
      An.cacheFr = {};
      An.reiniciarFx();
    }
  });
})();
