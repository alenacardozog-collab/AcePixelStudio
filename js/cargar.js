/* Lista única de scripts del editor, en orden. La usan editor.html, index.html y pruebas.html,
   así un archivo nuevo se agrega en un solo lugar. Funciona abriendo el HTML con doble clic (file://). */
(function () {
  const ARCHIVOS = [
    // núcleo
    'core/pix', 'core/gif', 'core/dialogo', 'core/fxsim', 'core/base', 'core/tema', 'core/proyecto', 'core/comun', 'core/espacio', 'core/juego',
    'core/exportar', 'core/interiores', 'core/animjuego', 'core/menu', 'core/capas', 'core/marca_anim', 'core/tiles',
    // secciones
    'secciones/inicio', 'secciones/biblioteca', 'secciones/estilo', 'secciones/mapa', 'secciones/mapa_ui', 'secciones/convertir', 'secciones/texturas',
    'secciones/pixel/base', 'secciones/pixel/primitivas', 'secciones/pixel/transformar', 'secciones/pixel/seleccion', 'secciones/pixel/herramientas',
    'secciones/pixel/cuadros', 'secciones/pixel/paneles', 'secciones/pixel/seccion',
    'secciones/anim/base', 'secciones/anim/efectos', 'secciones/anim/vista', 'secciones/anim/linea', 'secciones/anim/paneles', 'secciones/anim/poses',
    'secciones/anim/seccion',
    'secciones/fx', 'secciones/npc', 'secciones/misiones', 'secciones/interfaz', 'secciones/revisor', 'secciones/portfolio',
    // arranque
    'app'
  ];
  const extra = (document.currentScript && document.currentScript.dataset.extra) || '';
  ARCHIVOS.concat(extra ? extra.split(',') : []).forEach(a => document.write('<script src="js/' + a + '.js"><\/script>'));
})();
