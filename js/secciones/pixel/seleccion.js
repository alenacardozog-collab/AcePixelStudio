/* PIXEL · recortes, copiar, pegar y borrar la selección. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});

  /** Lo seleccionado, recortado a su caja: { c: lienzo, b: caja, cd: píxeles del cuadro } (o null). */
  const recorteSel = () => {
    Px.soltarFlot();
    if (!Px.sel) {
      CK.aviso('Primero marcá la parte que querés separar: Selección (S), Lazo (Q) o Varita (W).', 'info', 4500);
      return null;
    }
    const f = Px.FR(),
      d = Px.leer(),
      cd = new ImageData(f.w, f.h);
    let n = 0;
    for (let p = 0; p < Px.sel.m.length; p++)
      if (Px.sel.m[p] && d.data[p * 4 + 3] > 0) {
        n++;
        for (let k = 0; k < 4; k++) cd.data[p * 4 + k] = d.data[p * 4 + k];
      }
    if (!n) {
      CK.aviso('En esa selección no hay nada dibujado en la capa activa.', 'info');
      return null;
    }
    return { f, d, cd };
  };
  /** Corta lo seleccionado de la capa activa y lo deja en una capa nueva, en el mismo lugar. */
  Px.selACapa = async copiarSolo => {
    const r = recorteSel();
    if (!r) return;
    const m = Px.sel.m.slice(),
      base = Px.capa();
    Px.estructura(copiarSolo ? 'Copiar a capa nueva' : 'Separar en capa nueva', () => {
      if (!copiarSolo) {
        for (let p = 0; p < m.length; p++) if (m[p]) r.d.data[p * 4 + 3] = 0;
        Px.escribir(r.d);
      }
      const nc = CK.lienzo(base.c.width, base.c.height);
      CK.ctx(nc).putImageData(r.cd, r.f.x, r.f.y);
      Px.doc.capas.splice(Px.doc.activa + 1, 0, {
        id: 'c' + Date.now().toString(36),
        nombre: 'Recorte ' + Px.doc.capas.length,
        visible: true,
        opacidad: 1,
        asset: null,
        c: nc
      });
      Px.doc.activa++;
      Px.sel = null;
    });
    if (Px.tabs.ir) Px.tabs.ir('capas');
    CK.aviso(copiarSolo ? 'Copiado a una capa nueva.' : 'Separado en una capa nueva. Doble clic en su nombre para renombrarla.');
  };
  /** Guarda lo seleccionado (o la capa activa entera) como un asset aparte, recortado justo. */
  Px.aAssetNuevo = async deCapa => {
    let im;
    if (deCapa) {
      Px.soltarFlot();
      im = CK.aPix(
        (() => {
          const f = Px.FR(),
            c = CK.lienzo(f.w, f.h);
          CK.ctx(c).putImageData(Px.leer(), 0, 0);
          return c;
        })()
      );
    } else {
      const r = recorteSel();
      if (!r) return;
      const c = CK.lienzo(r.f.w, r.f.h);
      CK.ctx(c).putImageData(r.cd, 0, 0);
      im = CK.aPix(c);
    }
    im = PIX.trim(im);
    if (!im.w || !im.h) {
      CK.aviso('No hay nada dibujado para guardar.', 'info');
      return;
    }
    const nombre = await CK.pedir(
      'Guardar como asset nuevo',
      'Nombre del asset',
      (Px.A().nombre + '_' + (deCapa ? Px.capa().nombre : 'parte')).toLowerCase()
    );
    if (!nombre) return;
    const a = CK.asset.crear({ nombre, tipo: 'sprite', lienzo: CK.aLienzo(im), origen: 'separado de ' + Px.A().nombre });
    CK.aviso('Asset creado: ' + a.nombre + ' (' + im.w + ' × ' + im.h + ' px). Ya está en Assets del mapa.', 'ok', 5000);
  };
  Px.portaSel = null;
  Px.copiar = cortar => {
    const f = Px.FR();
    if (Px.flot) {
      Px.portaSel = { c: CK.copiaLienzo(Px.flot.c), m: Px.flot.m.slice() };
      return;
    }
    if (!Px.sel) {
      CK.aviso('Primero seleccioná algo (S, Q o W).', 'info');
      return;
    }
    const d = Px.leer(),
      c = CK.lienzo(f.w, f.h),
      cd = new ImageData(f.w, f.h);
    for (let p = 0; p < Px.sel.m.length; p++) if (Px.sel.m[p]) for (let k = 0; k < 4; k++) cd.data[p * 4 + k] = d.data[p * 4 + k];
    CK.ctx(c).putImageData(cd, 0, 0);
    Px.portaSel = { c, m: Px.sel.m.slice() };
    if (cortar) Px.borrarSel();
    CK.estado(cortar ? 'Cortado' : 'Copiado');
  };
  Px.pegar = () => {
    if (!Px.portaSel) return;
    Px.soltarFlot();
    Px.flot = { c: CK.copiaLienzo(Px.portaSel.c), x: 0, y: 0, m: Px.portaSel.m.slice(), fin: Px.cambioCapa('Pegar'), todo: false };
    Px.S.herr = 'mover';
    Px.herrCol.elegir('mover');
    Px.pintarTira();
    Px.pedir();
    CK.estado('Pegado: arrastralo a su lugar y hacé clic afuera o Enter para fijarlo.');
  };
  Px.borrarSel = () => {
    if (Px.flot) {
      const fin = Px.flot.fin;
      Px.flot = null;
      Px.sel = null;
      fin();
      Px.pedir();
      return;
    }
    if (!Px.sel) return;
    const fin = Px.cambioCapa('Borrar selección'),
      d = Px.leer();
    for (let p = 0; p < Px.sel.m.length; p++) if (Px.sel.m[p]) d.data[p * 4 + 3] = 0;
    Px.escribir(d);
    fin();
    Px.pedir();
  };

  // ---------------------------------------------------------------- herramientas
  Px.P = m => ({ x: Math.floor(m.x), y: Math.floor(m.y) });
  Px.dentroSel = p => {
    if (Px.flot) {
      const sx = p.x - Px.flot.x,
        sy = p.y - Px.flot.y;
      return sx >= 0 && sy >= 0 && sx < Px.flot.c.width && sy < Px.flot.c.height && !!Px.flot.m[sy * Px.flot.c.width + sx];
    }
    const f = Px.FR();
    return !!(Px.sel && p.x >= 0 && p.y >= 0 && p.x < f.w && p.y < f.h && Px.sel.m[p.y * f.w + p.x]);
  };
})();
