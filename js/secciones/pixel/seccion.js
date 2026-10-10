/* PIXEL · arma la sección, teclas y registro. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});
  const h = CK.h;

  const crear = raiz => {
    Px.el = raiz;
    Px.el.style.gridTemplateColumns = '52px 1fr 292px';
    Px.el.style.gridTemplateRows = '1fr auto';
    Px.herrCol = CK.herramientas(Px.HERR, Px.S.herr, id => Px.ponerHerr(id));
    Px.herrCol.style.gridRow = '1 / 3';
    Px.lienzo = h('canvas.lienzo');
    Px.tira = h('div.sobre');
    const tablero = h('div.tablero', Px.lienzo, Px.tira);
    Px.cuadrosEl = h('div.cuadros');
    Px.panel = h('aside.panel', { style: { gridRow: '1 / 3' } });
    Px.el.append(Px.herrCol, tablero, Px.panel, Px.cuadrosEl);
    Px.herrCol.style.gridColumn = '1';
    tablero.style.gridColumn = '2';
    tablero.style.gridRow = '1';
    Px.panel.style.gridColumn = '3';
    Px.cuadrosEl.style.gridColumn = '2';
    Px.cuadrosEl.style.gridRow = '2';
    Px.vista = CK.vista(Px.lienzo, { pintar: Px.pintar, herramienta: Px.herramienta, zoom: 8 });
    tablero.append(
      h(
        'div.sobre.abajo.der',
        CK.tiraZoom(Px.vista, () => {
          const f = Px.FR();
          Px.vista.encuadrar(f.w, f.h, 40);
        })
      )
    );
    Px.tabs = CK.pestanas(
      [
        {
          id: 'color',
          txt: 'Color',
          ico: 'estilo',
          desc: 'Rueda de color, paleta del proyecto y colores de la imagen.',
          pintar: c => {
            if (Px.A()) Px.pColor(c);
          }
        },
        {
          id: 'capas',
          txt: 'Capas',
          ico: 'capas',
          desc: 'Capas del dibujo con opacidad.',
          pintar: c => {
            if (Px.A()) Px.pCapas(c);
          }
        },
        {
          id: 'vista',
          txt: 'Vista',
          ico: 'ojo',
          desc: 'El asset a tamaño real y su animación.',
          pintar: c => {
            if (Px.A()) Px.pVista(c);
          }
        }
      ],
      'color',
      { despegable: true, apilable: true, apilado: true, id: 'pixel', nombre: 'Pixel art' }
    );
    Px.panel.append(Px.tabs);
    CK.soltarEn(tablero, async fs => {
      const as = await CK.importarImagenes('sprite', fs);
      if (as.length) Px.abrir(as[0].id);
    });
    Px.lienzo.addEventListener('contextmenu', e => {
      if (!Px.A() || !['selRect', 'lazo', 'varita', 'mover', 'transformar'].includes(Px.S.herr)) return;
      Px.menuLienzo(e);
    });
    CK.on('estilo', () => {
      if (CK.seccionVisible('pixel') && Px.tabs.visible('color')) Px.tabs.refrescar();
    });
  };
  Px.ponerHerr = id => {
    if (Px.tr && id !== 'transformar') Px.terminarTr();
    if (Px.flot && !['mover', 'selRect', 'lazo', 'varita', 'transformar'].includes(id)) Px.soltarFlot();
    if (id === 'transformar' && Px.A() && !Px.tr) setTimeout(Px.empezarTr, 0);
    Px.S.herr = id;
    Px.herrCol.elegir(id);
    const t = Px.HERR.find(x => x.id === id);
    document.getElementById('estado-herr').textContent = 'Pixel art · ' + t.tip;
    CK.estado(t.est);
    Px.pedir();
  };
  const mostrar = arg => {
    if (!CK.P) return;
    if (arg && CK.P.assets[arg]) Px.abrir(arg);
    else if (Px.S.id && CK.P.assets[Px.S.id]) {
      if (!Px.doc || CK.img[Px.S.id] !== (Px.doc.capas.length === 1 ? Px.doc.capas[0].c : CK.img[Px.S.id])) Px.abrir(Px.S.id);
    } else if (CK.P.ui.pixel && CK.P.assets[CK.P.ui.pixel]) Px.abrir(CK.P.ui.pixel);
    else {
      Px.S.id = null;
      Px.doc = null;
    }
    Px.pintarTodo();
    Px.vista.medir();
  };
  const tecla = (e, k, ctrl) => {
    if (!Px.A()) return false;
    if (ctrl) {
      if (k === 't') {
        Px.ponerHerr('transformar');
        return true;
      }
      if (k === 'j' && e.shiftKey) {
        Px.selACapa(false);
        return true;
      }
      if (k === 'c') {
        Px.copiar();
        return true;
      }
      if (k === 'x') {
        Px.copiar(true);
        return true;
      }
      if (k === 'v') {
        Px.pegar();
        return true;
      }
      if (k === 'a') {
        Px.soltarFlot();
        const f = Px.FR();
        Px.ponerSel(new Uint8Array(f.w * f.h).fill(1));
        return true;
      }
      if (k === 'd') {
        Px.soltarFlot();
        Px.sel = null;
        Px.pintarTira();
        Px.pedir();
        return true;
      }
      return false;
    }
    if (k === 'escape') {
      if (Px.tr) {
        Px.cancelarTr();
        return true;
      }
      Px.soltarFlot();
      Px.sel = null;
      Px.trazo = null;
      Px.pintarTira();
      Px.pedir();
      return true;
    }
    if (k === 'enter') {
      if (Px.tr) {
        Px.terminarTr();
        return true;
      }
      Px.soltarFlot();
      return true;
    }
    if (k === 'delete' || k === 'backspace') {
      Px.borrarSel();
      return true;
    }
    if (k === 'x') {
      [Px.S.c1, Px.S.c2] = [Px.S.c2, Px.S.c1];
      Px.pintarColor();
      return true;
    }
    if (k === '[' || k === ']') {
      Px.S.tam = CK.clamp(Px.S.tam + (k === ']' ? 1 : -1), 1, 24);
      Px.pintarTira();
      return true;
    }
    if (k === ',' || k === '.') {
      Px.irCuadro(Px.doc.cuadro + (k === '.' ? 1 : -1));
      return true;
    }
    if (k === '0') {
      const f = Px.FR();
      Px.vista.encuadrar(f.w, f.h, 40);
      return true;
    }
    if (k === '+' || k === '=') {
      Px.vista.zoomEn(1);
      return true;
    }
    if (k === '-') {
      Px.vista.zoomEn(-1);
      return true;
    }
    if (k.startsWith('arrow') && Px.tr) {
      const d = e.shiftKey ? 8 : 1;
      Px.tr.cx += k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0;
      Px.tr.cy += k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0;
      Px.aplicarTr();
      return true;
    }
    if (k.startsWith('arrow') && (Px.sel || Px.flot)) {
      Px.levantar();
      const d = e.shiftKey ? 8 : 1;
      Px.flot.x += k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0;
      Px.flot.y += k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0;
      Px.pedir();
      return true;
    }
    const t = Px.HERR.find(x => x.tecla && x.tecla.toLowerCase() === k);
    if (t) {
      Px.ponerHerr(t.id);
      return true;
    }
    return false;
  };
  CK.pixel = {
    abrir: Px.abrir,
    S: Px.S,
    doc: () => Px.doc,
    soltar: Px.soltarFlot,
    vista: () => Px.vista,
    irCuadro: i => {
      if (Px.doc) Px.irCuadro(i);
    }
  };
  CK.on('antes-guardar', () => {
    if (Px.doc && Px.flot) Px.soltarFlot();
  });
  CK.on('asset-img', id => {
    if (Px.doc && id === Px.S.id && !CK.seccionVisible('pixel')) {
      Px.doc = null;
    }
  });
  CK.registrar({
    id: 'pixel',
    nombre: 'Pixel art',
    ico: 'pixel',
    desc: 'Dibujo y retoque a mano, píxel a píxel, con la paleta del proyecto.',
    crear,
    mostrar,
    tecla,
    ocultar: () => {
      Px.soltarFlot();
      clearInterval(Px.vigia);
    },
    alCambiarProyecto: () => {
      Px.S.id = null;
      Px.doc = null;
      Px.sel = null;
      Px.flot = null;
      Px.tr = null;
    }
  });
})();
