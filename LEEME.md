# Taller CastleKnight

Editor propio para CastleKnight (y para cualquier otro juego 2D en pixel art): mapas, assets, animaciones, efectos y diálogos, todo con una misma guía de estilo.

## Cómo abrirlo

Doble clic en **`editor.html`**. Tiene que abrirse con **Chrome o Edge** (son los que dejan guardar en carpetas). No hay que instalar nada.

Siempre abre en **Inicio**: ahí elegís el proyecto y vuelve a la sección donde lo dejaste.

La primera vez:

1. Creá el proyecto (por ejemplo "CastleKnight").
2. Arriba a la derecha, conectá las dos carpetas:
   - **Editor** → `D:\Editor` (acá se guardan los proyectos como archivos).
   - **Juego** → `D:\prueba` (para importar sus mapas y assets, y exportarle resultados).
3. En **Inicio** está el recorrido sugerido, paso a paso.

El navegador vuelve a pedir permiso para las carpetas cada vez que abrís el editor: es un clic en el chip que dice "reconectar".

## Secciones

| Sección | Para qué |
|---|---|
| **Estilo** | Tile, paleta, contorno y luz. Todas las demás secciones leen de acá. También arma el texto fijo para pedir arte a una IA. |
| **Mapa** | Capas (terreno con bordes automáticos, tiles, objetos), posicionar / escalar / rotar, jerarquía y grupos, zonas caminables, colisiones, luces, puntos (aparición, puertas, NPC), notas, marcas de animación, prearmados y caminata de prueba. |
| **Convertir** | Imagen de referencia → asset: quita el fondo, lo lleva al tamaño real, a la paleta, limpia y pone contorno. Una o muchas a la vez. |
| **Texturas** | Referencia de piedra / madera / pasto → tile repetible, variantes y las 16 piezas de borde para pintar suelos. |
| **Pixel art** | Dibujo y retoque a mano: lápiz, formas, selección, capas, cuadros con papel cebolla, rueda de color, paleta fija, sombreado por tonos. |
| **Animar** | Genera movimiento desde un dibujo quieto (ondear, mecer, flotar, titilar, agua…), alinea hojas de sprites y exporta PNG + JSON + GIF. La pestaña **Personaje** junta las animaciones de un personaje en sus 4 direcciones y las prueba caminando. La pestaña **Juego** trae cualquier animación del juego para retocarla cuadro a cuadro en Pixel art y la devuelve: se reemplaza sola en el juego, con respaldo. |
| **FX** | Partículas, luces, destellos y sacudidas por capas, con línea de tiempo. Se exportan como datos o "horneados" a hoja de sprites. |
| **NPC** | Ficha de cada personaje y sus temas de conversación (palabras clave → respuestas en su rol), con prueba de charla. |
| **Misiones** | Encargos por pasos (hablar, preguntar por un tema, llegar a un punto, vencer enemigos) con recompensa. Se encadenan con banderas. |
| **Interfaz** | Marcos, paneles y botones del juego: se ven aplicados en una maqueta, se editan, se tiñen y se llevan al juego con respaldo. |
| **Revisor** | Lista lo que desentona o falta, con arreglos de un clic. |
| **Notas** | Todo lo pendiente en un lugar. Es lo que lee Claude. |
| **Portfolio** | Lámina de presentación ampliada sin emborronar. |

Cada herramienta se resalta al pasar el mouse y, si te quedás quieto medio segundo, muestra su nombre, para qué sirve y su atajo. Se apagan con el botón ⓘ de arriba. La tecla **?** muestra todos los atajos.

## Espacio de trabajo

Los paneles se despegan arrastrando la barrita de puntitos que tienen arriba, se mueven y agrandan como ventanas, y se vuelven a pegar llevándolos a su costado o con doble clic en su barra. El borde interno de un panel pegado cambia su ancho. En el Mapa, las pestañas Capas, Propiedades, Assets y Mapa se despegan una por una (arrastrándolas o con doble clic). El botón **Espacio** de la barra de arriba lista todo y tiene **Restablecer todo**; de emergencia, **Ctrl + Mayús + 0**.

El manual completo con imágenes está en `Manual_Taller_CastleKnight.pdf`.

## Dónde queda cada cosa

```
D:\Editor\
  editor.html            el editor
  css\  js\              su código
  herramientas\          las mismas funciones como comandos (las usa Claude)
  trabajo\<proyecto>\
    proyecto.json        guía de estilo, mapas, NPC, efectos, notas
    assets\<id>.png      una imagen por asset
    versiones\           copias numeradas (botón del reloj)
    respaldo\            copia de cada archivo del juego antes de reescribirlo
```

Se guarda solo cada minuto y con **Ctrl + S**. "Guardar versión" (el reloj) deja una copia numerada a la que se puede volver.

## Exportar al juego

El botón **Exportar al juego** escribe en `D:\prueba`:

- `js\maps\data\editor_data.js` — mapas nuevos, NPC con diálogos, misiones, efectos, enemigos y sus rutas.
- `js\maps\data\editor_assets.js` — las imágenes nuevas (y el suelo ya dibujado de cada mapa), embebidas para que el juego siga abriendo con doble clic.
- Opcional: actualizar un mapa que ya existe (`ruins_map.js`, `castle_maps.js`). Reescribe solo las listas `items` y `cols`, y antes guarda una copia en `respaldo\`.

### El cargador

Para que CastleKnight lea esos dos archivos hace falta el **cargador**: `js\editor_loader.js` más un bloque de cinco líneas en `index.html`, entre los comentarios `<!-- Taller ... -->` y `<!-- /Taller -->`. Se instala desde la ventana de Exportar (botón "Instalar cargador"). No cambia ningún archivo del juego ni el modo dev; borrando ese bloque el juego queda como estaba.

Con el cargador, dentro del juego:

- **F7** muestra la lista de mapas del editor y lleva a cualquiera.
- **Probar** (F5 en el editor) exporta y abre el juego directamente en el mapa que estás editando.
- Los mapas se conectan con puntos **Puerta** (a otro mapa tuyo o de vuelta a la aldea) o con la "Entrada desde la aldea" de la pestaña Mapa.
- Los NPC con ficha conversan con texto libre (tecla T), los enemigos con ruta patrullan, las misiones aparecen bajo el objetivo.

### En el mapa

La herramienta **Punto** (O) tiene estos tipos: aparición, puerta, NPC (ficha + aspecto del juego o sprite propio), enemigo (tipo, radio, "solo de noche" y **Dibujar ruta** para la patrulla), efecto (uno de la sección FX encendido en ese lugar) y disparador (un lugar con nombre, para las misiones). En la pestaña **Mapa** están el título, la música, el sonido ambiente y la entrada desde la aldea.

## Trabajar con Claude

Claude lee y modifica los archivos de `trabajo\<proyecto>\` y usa los comandos de `herramientas\ck.js`:

```
node herramientas/ck.js info         trabajo/castleknight
node herramientas/ck.js revisar      trabajo/castleknight
node herramientas/ck.js notas        trabajo/castleknight
node herramientas/ck.js filtro       trabajo/castleknight --todos --paleta --duros --limpiar
node herramientas/ck.js convertir    trabajo/castleknight boceto.png --nombre barril --alto 24 --contorno color
node herramientas/ck.js textura      trabajo/castleknight foto_piedra.png --nombre camino --colores 4
node herramientas/ck.js transiciones trabajo/castleknight --terreno camino
node herramientas/ck.js animar       trabajo/castleknight --asset bandera --tipo ondear
node herramientas/ck.js lamina       trabajo/castleknight --salida lamina.png
node herramientas/ck.js ayuda
```

Después de que Claude trabaje sobre los archivos: **Proyecto → Recargar de la carpeta**.

Para pedirle algo: escribilo en **Notas**, clavá una nota en el mapa (tecla N) o marcá un objeto para animar (tecla M). Él contesta en la misma nota y la marca como resuelta.

## Límites conocidos

- El conversor **transforma** imágenes; no inventa arte a partir de un texto. Para algo totalmente nuevo hace falta un boceto, un asset existente o una base de PixelLab / SpriteLab.
- Las animaciones generadas mueven y recolorean los píxeles del dibujo. Sirven para ambiente, objetos y efectos. Las poses nuevas de un personaje (caminar, atacar) se dibujan cuadro a cuadro.
- Las casas y las salas del castillo se importan como **referencia**: se ven y se miden igual que en el juego, pero cambiarlas no reescribe su código. "Hacer una copia editable" (pestaña Mapa) las vuelve un mapa propio.
- La sección Interfaz cambia las imágenes de la interfaz, no su disposición: cada pieza conserva su tamaño y el ancho de sus bordes.
- Los conjuntos de poses (Animar → Personaje) sirven para revisar y armar la hoja; cambiar al héroe del juego por uno nuevo todavía es un paso aparte.
- "Editar en Aseprite" no abre el programa: muestra la ruta del PNG y, mientras tengas ese asset abierto, lo actualiza solo cuando guardás desde Aseprite.

## Retocar una animación del juego

1. Conectá la carpeta del juego (y la del editor, para que quede respaldo).
2. **Animar → Juego → Leer del juego.** Aparecen todas las hojas de sprites del juego (héroes, orcos, NPC, fuego, puertas, la casa…). "Mostrar también imágenes sueltas" suma el resto de las imágenes.
3. **Traer y editar** la copia al proyecto y la abre en **Pixel art**: abajo están sus cuadros; elegís uno, lo retocás y la animación se actualiza al instante (con papel cebolla para ver el anterior y el siguiente).
4. **Devolver al juego** (en Pixel art, abajo a la derecha, o en Animar → Juego) reemplaza la imagen en el mismo archivo `.js` del juego y en su PNG si existe. El original queda en `trabajo/<proyecto>/respaldo/`.

Si la hoja cambia de tamaño (cuadros agregados o quitados) el editor avisa antes: el juego corta los cuadros con el tamaño original.
