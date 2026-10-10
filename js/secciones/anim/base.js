/* ANIMACIONES: genera movimiento a partir de un asset quieto (ondear, mecer, flotar, titilar…), ordena y alinea hojas de
   sprites, y exporta PNG + datos + GIF. La lista de pendientes sale de las marcas "a animar" que dejaste en los mapas.
   La vista tiene zoom (rueda) y desplazamiento (barra espaciadora, botón del medio o arrastrar). Abajo, la línea de tiempo:
   cada cuadro se puede reordenar arrastrando, alargar (duración propia), duplicar, borrar, y tiene menú con clic derecho.
   Se le pueden superponer efectos (FX del proyecto, plantillas u hojas de efecto) para ver cómo quedan juntos. */
'use strict';
(function () {
  const An = (CK._anim = CK._anim || {});

  const h = CK.h;
  An.el = undefined;
  An.izq = undefined;
  An.der = undefined;
  An.centro = undefined;
  An.tabs = undefined;
  An.cajaRep = undefined;
  An.lineaEl = undefined;
  An.vistaCv = undefined;
  An.vista = undefined;
  An.sobreVista = undefined;
  An.st = {
    base: null,
    tipo: 'ondear',
    params: {},
    usarPaleta: true,
    fps: 8,
    frames: [],
    hoja: null,
    origen: null,
    fondo: 'cuadros',
    modo: 'generar',
    cebolla: false,
    grilla: true,
    verFx: true,
    fxSel: 0,
    moverFx: false,
    tamCuadro: 64,
    selC: new Set(),
    ancla: 0,
    fxGen: []
  };
  An.rep = { t: 0, play: true, u: 0, i: -1 };
  const pal = () => (An.st.usarPaleta ? CK.P.estilo.paleta : []);

  /** Marcas "a animar" de todos los mapas. */
  An.pendientes = () => {
    const out = [];
    Object.values(CK.P.mapas).forEach(m =>
      CK.mapa.objetosDe(m).forEach(o => {
        if (o.marca) out.push({ mapa: m, o });
      })
    );
    return out.sort((a, b) => (a.o.marca.estado === 'hecha') - (b.o.marca.estado === 'hecha'));
  };
  CK.animPendientes = An.pendientes;

  const pixBase = () => {
    const a = CK.P.assets[An.st.base];
    if (!a || !CK.img[An.st.base]) return null;
    const f = CK.asset.cuadro(a, 0),
      im = CK.asset.pix(An.st.base);
    return a.cuadros ? PIX.crop(im, f.x, f.y, f.w, f.h) : im;
  };
  /** Zona pintada con "Marcar para animar": la de la marca del mapa, o una pintada acá para este dibujo. null = se mueve todo. */
  An.marcaOrigen = () => {
    const og = An.st.origen,
      o = og && CK.mapa && CK.mapa.buscarObj(og.objeto);
    return o && o.marca ? o : null;
  };
  An.zonaActual = im => {
    if (An.st.soloZona === false || !im) return null;
    const o = An.marcaOrigen();
    if (o) return CK.marcaAnim.leer(o.marca, im.w, im.h);
    const z = An.st.zonaLibre;
    return z && z.base === An.st.base ? CK.marcaAnim.leer({ mascara: z.mascara }, im.w, im.h) : null;
  };
  An.pintarZona = async () => {
    const im = pixBase();
    if (!im) return;
    const o = An.marcaOrigen();
    const r = await CK.marcaAnim.editar({
      titulo: 'Zona que se mueve',
      im,
      marca: o ? o.marca : An.st.zonaLibre && An.st.zonaLibre.base === An.st.base ? { mascara: An.st.zonaLibre.mascara } : null,
      soloZona: true
    });
    if (!r || r === 'quitar') return;
    if (o) {
      const m = CK.P.mapas[An.st.origen.mapa],
        fin = CK.hist.datos('Zona a animar', 'mapas', m.id);
      if (r.mascara) o.marca.mascara = r.mascara;
      else delete o.marca.mascara;
      fin();
      CK.emit('notas');
    } else An.st.zonaLibre = r.mascara ? { base: An.st.base, mascara: r.mascara } : null;
    An.st.soloZona = true;
    An.tabs.refrescar();
    An.generar();
  };
  An.pixBase = pixBase;
  An.generar = CK.debounce(() => {
    const im = pixBase();
    if (!im) {
      An.st.frames = [];
      An.pintarCentro();
      return;
    }
    try {
      An.st.frames = PIX.animate(im, An.st.tipo, Object.assign({}, An.st.params, { paleta: pal(), mascara: An.zonaActual(im) }));
    } catch (e) {
      console.error(e);
      An.st.frames = [];
      CK.aviso(e.message, 'error');
    }
    An.pintarCentro();
  }, 40);
  An.hojaA = () => (An.st.modo === 'hoja' ? CK.P.assets[An.st.hoja] : null);
  An.cuadrosVista = () => {
    if (An.st.modo === 'generar') return An.st.frames.map(CK.aLienzo);
    const a = CK.P.assets[An.st.hoja];
    if (!a || !a.cuadros) return [];
    const n = CK.asset.nCuadros(a),
      ord = a.cuadros.orden || [...Array(n).keys()],
      l = ord.map(i => {
        const g = CK.asset.cuadro(a, i),
          c = CK.lienzo(g.w, g.h);
        CK.ctx(c).drawImage(CK.img[a.id], g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
        return c;
      });
    return a.cuadros.vaiven && l.length > 2 ? l.concat(l.slice(1, -1).reverse()) : l;
  };
  let cache = [];
  An.cacheKey = '';
  An.cuadrosCache = () => {
    const a = CK.P.assets[An.st.hoja],
      k =
        An.st.modo +
        '|' +
        (An.st.modo === 'generar'
          ? An.st.frames.length + ':' + An.st._v
          : a
            ? a.id + ':' + (a.modificado || 0) + ':' + JSON.stringify(a.cuadros)
            : '');
    if (k !== An.cacheKey) {
      An.cacheKey = k;
      cache = An.cuadrosVista();
    }
    return cache;
  };
  An.fpsAct = () => (An.st.modo === 'generar' ? An.st.fps : ((CK.P.assets[An.st.hoja] || {}).cuadros || {}).fps || 8);
  An.baseMs = () => 1000 / Math.max(1, An.fpsAct());
  /** Cuadros a mostrar y cuánto dura cada uno (ms). */
  An.secuencia = () => {
    const fr = An.st.modo === 'poses' ? [] : An.cuadrosCache(),
      a = An.hojaA();
    let ms;
    if (a && a.cuadros) {
      const n = CK.asset.nCuadros(a),
        ord = a.cuadros.orden || [...Array(n).keys()],
        d = a.cuadros.dur || [];
      ms = ord.map(i => d[i] || An.baseMs());
      if (a.cuadros.vaiven && ms.length > 2) ms = ms.concat(ms.slice(1, -1).reverse());
    } else ms = fr.map(() => An.baseMs());
    return { fr, ms };
  };
  /** Cuadro de la hoja (en su orden guardado) que se ve en la posición i de la reproducción. */
  An.fisico = i => {
    const a = An.hojaA();
    if (!a || !a.cuadros) return i;
    const n = CK.asset.nCuadros(a),
      ord = a.cuadros.orden || [...Array(n).keys()];
    if (i >= ord.length) i = 2 * ord.length - 2 - i;
    return ord[Math.max(0, Math.min(ord.length - 1, i))];
  };
  An.inicioDe = (ms, i) => {
    let s = 0;
    for (let k = 0; k < i; k++) s += ms[k];
    return s / 1000;
  };
})();
