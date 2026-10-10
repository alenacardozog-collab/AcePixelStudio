/* PIXEL ART: editor manual para arreglos y dibujo. Lápiz, borrador, balde, formas, selección, capas, cuadros con papel cebolla,
   paleta fija del proyecto y sombreado por tonos vecinos. Trabaja directo sobre la imagen del asset. */
'use strict';
(function () {
  const Px = (CK._pixel = CK._pixel || {});

  const h = CK.h;
  Px.el = undefined;
  Px.lienzo = undefined;
  Px.vista = undefined;
  Px.panel = undefined;
  Px.tira = undefined;
  Px.herrCol = undefined;
  Px.cuadrosEl = undefined;
  Px.tabs = undefined;
  Px.rueda = undefined;
  Px.S = {
    id: null,
    herr: 'lapiz',
    c1: '#1b1420',
    c2: '#f5f1e6',
    tam: 1,
    perfecto: true,
    relleno: false,
    contiguo: true,
    espH: false,
    espV: false,
    soloPaleta: false,
    cebolla: false,
    grilla: true,
    sombra: 1
  };
  Px.doc = null;
  Px.sel = null;
  Px.flot = null;
  Px.trazo = null;
  Px.previa = null;
  let porta = null;
  Px.vigia = null;
  Px.A = () => CK.P && CK.P.assets[Px.S.id];
  Px.FR = () => CK.asset.cuadro(Px.A(), Px.doc ? Px.doc.cuadro : 0);
  Px.capa = () => Px.doc.capas[Px.doc.activa];
  Px.pedir = () => Px.vista && Px.vista.pedir();

  Px.HERR = [
    {
      id: 'lapiz',
      ico: 'lapiz',
      tip: 'Lápiz',
      desc: 'Dibuja píxel a píxel con el color principal. Clic derecho usa el color secundario.',
      tecla: 'B',
      est: 'Arrastrar: dibujar · Clic derecho: color secundario · Mayús + clic: línea recta desde el último punto · Alt + clic: tomar color'
    },
    { id: 'borrador', ico: 'borrador', tip: 'Borrador', desc: 'Deja los píxeles transparentes.', tecla: 'E', est: 'Arrastrar: borrar' },
    {
      id: 'balde',
      ico: 'balde',
      tip: 'Balde',
      desc: 'Rellena una zona del mismo color. Con "Contiguo" apagado cambia ese color en todo el cuadro.',
      tecla: 'G',
      est: 'Clic: rellenar con el color principal · Clic derecho: con el secundario'
    },
    {
      id: 'gotero',
      ico: 'gotero',
      tip: 'Cuentagotas',
      desc: 'Toma un color del dibujo.',
      tecla: 'I',
      est: 'Clic: color principal · Clic derecho: color secundario'
    },
    {
      id: 'sombrear',
      ico: 'linterna',
      tip: 'Aclarar / oscurecer',
      desc: 'Pasa cada píxel al tono vecino de la paleta: clic izquierdo aclara, clic derecho oscurece. Sombrea sin salirte del estilo.',
      tecla: 'U',
      est: 'Arrastrar: aclarar · Clic derecho: oscurecer'
    },
    {
      id: 'reemplazar',
      ico: 'paleta',
      tip: 'Reemplazar color',
      desc: 'Clic sobre un color del dibujo y lo cambia por el color principal en todo el cuadro. Con Mayús, en todos los cuadros.',
      tecla: 'K',
      est: 'Clic sobre un color: cambiarlo por el principal · Mayús + clic: en toda la hoja'
    },
    '-',
    {
      id: 'linea',
      ico: 'linea',
      tip: 'Línea',
      desc: 'Línea recta entre dos puntos.',
      tecla: 'L',
      est: 'Arrastrar: trazar la línea · Mayús: horizontal, vertical o diagonal'
    },
    {
      id: 'rect',
      ico: 'rect',
      tip: 'Rectángulo',
      desc: 'Rectángulo vacío o lleno (según "Relleno").',
      tecla: 'R',
      est: 'Arrastrar: rectángulo · Mayús: cuadrado'
    },
    {
      id: 'elipse',
      ico: 'elipse',
      tip: 'Elipse',
      desc: 'Elipse vacía o llena (según "Relleno").',
      tecla: 'O',
      est: 'Arrastrar: elipse · Mayús: círculo'
    },
    '-',
    {
      id: 'selRect',
      ico: 'selRect',
      tip: 'Selección rectangular',
      desc: 'Marca un rectángulo. Lo que hagas después solo afecta ahí adentro.',
      tecla: 'S',
      est: 'Arrastrar: seleccionar · Arrastrar adentro: mover · Mayús: sumar · Esc: soltar'
    },
    { id: 'lazo', ico: 'lazo', tip: 'Lazo', desc: 'Selección a mano alzada.', tecla: 'Q', est: 'Arrastrar: rodear la zona' },
    {
      id: 'varita',
      ico: 'varita',
      tip: 'Varita',
      desc: 'Selecciona toda una zona del mismo color.',
      tecla: 'W',
      est: 'Clic: seleccionar ese color · Mayús: sumar'
    },
    {
      id: 'mover',
      ico: 'mover',
      tip: 'Mover',
      desc: 'Mueve la selección, o toda la capa si no hay nada seleccionado.',
      tecla: 'V',
      est: 'Arrastrar: mover · Flechas: de a 1 píxel'
    },
    {
      id: 'transformar',
      ico: 'escalar',
      tip: 'Transformar',
      desc: 'Rota, escala y voltea lo seleccionado (o toda la capa) con manijas. Sirve con Selección, Lazo y Varita.',
      tecla: 'T',
      est: 'Esquinas: escalar (Mayús: proporcional) · Bordes: estirar · Afuera o la manija de arriba: rotar (Mayús: de a 15°) · Adentro: mover · Enter: aplicar · Esc: cancelar · Clic derecho: más opciones'
    }
  ];

  // ---------------------------------------------------------------- documento
  Px.componer = () => {
    const a = Px.A();
    if (!a || !Px.doc) return;
    if (Px.doc.capas.length === 1) {
      CK.img[a.id] = Px.doc.capas[0].c;
      a.w = Px.doc.capas[0].c.width;
      a.h = Px.doc.capas[0].c.height;
    } else {
      const c = CK.lienzo(Px.doc.capas[0].c.width, Px.doc.capas[0].c.height),
        x = CK.ctx(c);
      Px.doc.capas.forEach(k => {
        if (!k.visible) return;
        x.globalAlpha = k.opacidad;
        x.drawImage(k.c, 0, 0);
      });
      CK.img[a.id] = c;
      a.w = c.width;
      a.h = c.height;
      Px.doc.capas.forEach(k => {
        if (k.asset) {
          CK.img[k.asset] = k.c;
          CK._imgSucias.add(k.asset);
          if (CK.P.assets[k.asset]) {
            CK.P.assets[k.asset].w = k.c.width;
            CK.P.assets[k.asset].h = k.c.height;
          }
        }
      });
    }
    a.modificado = Date.now();
    CK._imgSucias.add(a.id);
    Px.guardarMeta();
    CK.tocar();
    CK.emit('asset-img', a.id);
    Px.previa && Px.previa();
    Px.pintarCuadros();
  };
  Px.guardarMeta = () => {
    const a = Px.A();
    if (!a) return;
    if (Px.doc.capas.length === 1) {
      const viejo = CK.P.pixel[a.id];
      if (viejo)
        (viejo.capas || []).forEach(k => {
          if (k.asset && CK.P.assets[k.asset]) {
            delete CK.P.assets[k.asset];
            delete CK.img[k.asset];
            (CK._borradas = CK._borradas || []).push(k.asset);
          }
        });
      delete CK.P.pixel[a.id];
      Px.doc.capas[0].asset = null;
      return;
    }
    Px.doc.capas.forEach((k, i) => {
      if (!k.asset) {
        k.asset = a.id + '__capa_' + k.id;
        CK.P.assets[k.asset] = { id: k.asset, nombre: a.nombre + ' / ' + k.nombre, tipo: 'capa', w: k.c.width, h: k.c.height, de: a.id };
        CK.img[k.asset] = k.c;
        CK._imgSucias.add(k.asset);
      }
    });
    CK.P.pixel[a.id] = {
      activa: Px.doc.activa,
      sincronizado: a.modificado,
      capas: Px.doc.capas.map(k => ({
        id: k.id,
        nombre: k.nombre,
        visible: k.visible,
        opacidad: k.opacidad,
        asset: k.asset,
        carpeta: k.carpeta || undefined
      }))
    };
  };
  Px.abrir = id => {
    const a = CK.P.assets[id];
    if (!a) return;
    Px.soltarFlot();
    Px.S.id = id;
    Px.sel = null;
    Px.flot = null;
    const meta = CK.P.pixel[id],
      ok =
        meta &&
        meta.capas &&
        meta.capas.every(k => CK.img[k.asset]) &&
        (meta.sincronizado || 0) >= (a.modificado || 0) - 5 &&
        meta.capas.every(k => CK.img[k.asset].width === a.w);
    if (meta && !ok) {
      (meta.capas || []).forEach(k => {
        delete CK.P.assets[k.asset];
        delete CK.img[k.asset];
      });
      delete CK.P.pixel[id];
      CK.aviso('La imagen cambió fuera del editor de píxeles: se abre aplanada en una sola capa.', 'info', 4500);
    }
    Px.doc = {
      cuadro: 0,
      activa: ok ? CK.clamp(meta.activa || 0, 0, meta.capas.length - 1) : 0,
      capas: ok
        ? meta.capas.map(k => ({
            id: k.id,
            nombre: k.nombre,
            visible: k.visible,
            opacidad: k.opacidad,
            asset: k.asset,
            carpeta: k.carpeta,
            c: CK.img[k.asset]
          }))
        : [{ id: 'c1', nombre: 'Capa 1', visible: true, opacidad: 1, asset: null, c: CK.img[id] }]
    };
    CK.P.ui.pixel = id;
    Px.S.soloPaleta = !!CK.P.estilo.bloquearPaleta;
    const f = Px.FR();
    if (Px.vista) Px.vista.encuadrar(f.w, f.h, 40);
    Px.pintarTodo();
  };
  /** Copia de todo el documento, para deshacer cambios de estructura (capas, cuadros, tamaño). */
  const foto = () => ({
    cuadro: Px.doc.cuadro,
    activa: Px.doc.activa,
    cuadros: Px.A().cuadros ? CK.clone(Px.A().cuadros) : null,
    capas: Px.doc.capas.map(k => ({
      id: k.id,
      nombre: k.nombre,
      visible: k.visible,
      opacidad: k.opacidad,
      asset: k.asset,
      carpeta: k.carpeta,
      c: CK.copiaLienzo(k.c)
    }))
  });
  const restaurar = f => {
    const a = Px.A();
    Px.doc.cuadro = f.cuadro;
    Px.doc.activa = f.activa;
    Px.doc.capas = f.capas.map(k => Object.assign({}, k, { c: CK.copiaLienzo(k.c) }));
    if (f.cuadros) a.cuadros = CK.clone(f.cuadros);
    else delete a.cuadros;
    Px.sel = null;
    Px.flot = null;
    Px.componer();
    Px.pintarTodo();
  };
  Px.estructura = (nombre, fn) => {
    const id = Px.S.id,
      antes = foto();
    fn();
    Px.componer();
    const despues = foto();
    CK.hist.push({
      nombre,
      deshacer: () => {
        if (Px.S.id !== id || !Px.doc) Px.abrir(id);
        restaurar(antes);
      },
      rehacer: () => {
        if (Px.S.id !== id || !Px.doc) Px.abrir(id);
        restaurar(despues);
      }
    });
    Px.pintarTodo();
  };
  /** Deshacer de un cambio en los píxeles de la capa activa. */
  Px.cambioCapa = nombre => {
    const id = Px.S.id,
      ci = Px.doc.activa,
      antes = CK.copiaLienzo(Px.capa().c);
    return () => {
      const despues = CK.copiaLienzo(Px.doc.capas[ci].c);
      const poner = src => {
        if (Px.S.id !== id || !Px.doc) Px.abrir(id);
        const k = Px.doc.capas[ci];
        if (!k) return;
        if (k.c.width !== src.width || k.c.height !== src.height) {
          k.c.width = src.width;
          k.c.height = src.height;
        }
        const x = CK.ctx(k.c);
        x.clearRect(0, 0, k.c.width, k.c.height);
        x.drawImage(src, 0, 0);
        Px.componer();
        Px.pedir();
      };
      CK.hist.push({ nombre, deshacer: () => poner(antes), rehacer: () => poner(despues) });
      Px.componer();
    };
  };
})();
