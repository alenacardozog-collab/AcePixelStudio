# 🎨 AcePixelStudio

> **Suite integral para diseño y desarrollo de videojuegos 2D en pixel art.**
> Editor visual interactivo de mapas, tilesets, animaciones de sprites, efectos visuales FX, árboles de diálogo NPC, misiones y coherencia estética.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/es/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🚀 Inicio Rápido

No requiere instalación de librerías ni compiladores. Funciona de manera nativa en el navegador mediante el **File System Access API**.

1. Abre **`index.html`** (o `editor.html`) en **Google Chrome** o **Microsoft Edge** (requeridos para permisos directos de guardado en disco local).
2. Conecta tus carpetas de trabajo desde la barra superior:
   - **Editor / Trabajo:** Directorio donde se guardan los proyectos y assets (`trabajo/<proyecto>`).
   - **Juego:** Directorio raíz de tu videojuego (por ejemplo, para exportar mapas y datos directamente a motores como Phaser / CastleKnight).
3. ¡Crea o abre tu proyecto y empieza a crear!

---

## 🛠️ Módulos y Secciones

| Sección | Descripción |
|---|---|
| **🎨 Estilo** | Define tamaño de tile, paleta de colores fija, contorno y esquema de luz global. Asegura coherencia en todo el juego y genera prompts artísticos para IA. |
| **🗺️ Mapa** | Editor multicapa (terreno con auto-tiling, objetos decorativos, colisiones, zonas caminables, iluminación, puntos de spawn, puertas y NPCs). Incluye modo de prueba de caminata en tiempo real. |
| **🔄 Convertir** | Transforma imágenes de referencia o bocetos en assets pixel art limpios: remueve fondos, escala al tamaño del grid, ajusta a la paleta activa y agrega contornos. |
| **🧱 Texturas** | Generador de tiles repetibles a partir de referencias de texturas y cálculo de las 16 piezas de autotile para bordes de terreno. |
| **✏️ Pixel Art** | Editor manual de dibujo con lápiz, formas, selecciones, capas, papel cebolla, rueda cromática y sombreado tonal. |
| **🎬 Animar** | Generador procedimental de animaciones (flotar, ondear, balanceo, titilar, agua), alineador de spritesheets y exportador a PNG, JSON y GIF. Pestaña de personajes con 4 direcciones. |
| **✨ FX** | Sistema de partículas, destellos, sacudidas y luces con línea de tiempo multicapa. Exportación de datos o spritesheets pre-renderizadas. |
| **💬 NPC** | Fichas de personajes con ramas de conversación basadas en palabras clave y respuestas con rol. Incluye simulador de charla. |
| **📜 Misiones** | Sistema de misiones por objetivos (hablar con NPC, investigar zona, derrotar enemigos) con recompensas y banderas (*flags*). |
| **🖼️ Interfaz** | Maquetación y previsualización de marcos, ventanas, botones y componentes UI integrados en el juego. |
| **🔍 Revisor** | Auditor de calidad visual: detecta automáticamente píxeles fuera de paleta, inconsistencias de escala, assets faltantes o problemas de división en spritesheets. |
| **📝 Notas** | Gestor de tareas pendientes y anotaciones vinculadas al mapa y a los assets. |
| **📁 Portfolio** | Exportación de láminas de presentación en alta resolución sin desenfoque bilineal. |

---

## 📂 Estructura del Proyecto

```text
AcePixelStudio/
├── index.html                   # Punto de entrada principal
├── editor.html                  # Acceso directo alternativo al editor
├── package.json                 # Metadatos del proyecto y scripts auxiliares
├── README.md                    # Documentación principal
├── LEEME.md                     # Guía rápida en español
├── css/
│   └── editor.css               # Estilos y diseño visual de la suite
├── js/
│   ├── app.js                   # Inicialización y navegación de la interfaz
│   ├── core/                    # Módulos centrales (canvas, proyectos, exportación, simulación)
│   └── secciones/               # Controladores de cada sección del editor
├── herramientas/
│   ├── ck.js                    # CLI para automatización y procesamiento masivo con Node.js
│   └── png.js                   # Parser y codificador PNG sin dependencias externas
├── juego/
│   └── editor_loader.js         # Cargador puente para integrar mapas y assets con el juego
├── docs/
│   └── Manual_Taller_CastleKnight.pdf # Manual ilustrado detallado
└── trabajo/                     # Directorio local de proyectos de usuario
```

---

## ⚡ Herramientas CLI (`herramientas/ck.js`)

Para procesar múltiples assets o integrarse con flujos automatizados / agentes de IA, AcePixelStudio incluye herramientas de línea de comandos en Node.js:

```bash
# Consultar información del proyecto
node herramientas/ck.js info trabajo/mi_proyecto

# Revisión de calidad y paleta de todos los assets
node herramientas/ck.js revisar trabajo/mi_proyecto

# Aplicar corrección de paleta y limpieza
node herramientas/ck.js filtro trabajo/mi_proyecto --todos --paleta --duros --limpiar

# Convertir un boceto a sprite
node herramientas/ck.js convertir trabajo/mi_proyecto boceto.png --nombre cofre --alto 24

# Generar textura y bordes
node herramientas/ck.js textura trabajo/mi_proyecto foto.png --nombre camino --colores 4

# Ver ayuda completa de comandos
node herramientas/ck.js ayuda
```

---

## 📖 Documentación Completa

Para una guía paso a paso con capturas de pantalla, consulta el [Manual de AcePixelStudio](docs/Manual_Taller_CastleKnight.pdf).

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo de licencia para más detalles.
