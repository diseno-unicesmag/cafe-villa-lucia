# Presentación 3D · Café Villa Lucía

Stand ferial modular: **la casa de tapia deconstruida**.
Ana María Villota Torres y Shamuel Woodcock Salomón · Diseño de exhibición · 10.º semestre.

## Cómo abrirla

Doble clic en `index.html` (Chrome o Edge). Funciona sin internet: Three.js está en `vendor/`. Las tipografías vienen de Google Fonts; si no hay red, se usan Georgia y Segoe UI.

| Tecla | Acción |
|---|---|
| → ← | Avanzar o retroceder diapositiva |
| 0 – 7 | Ir a una diapositiva |
| E | Explorador 3D a pantalla completa |
| F | Pantalla completa |
| M | Repetir el montaje (en la diapositiva 4) |

Sobre cualquier vista 3D: arrastrar para girar, rueda para acercar, clic derecho o Shift para desplazar y doble clic para volver a la cámara inicial.

## Diapositivas y requisitos del tablero

1. **Datos generales de la marca y organización**: el modelo se dibuja arista por arista y luego gira.
2. **Concepto**: moodboard, escrito narrativo, mapa de ideas de Shamy y retórica de la forma (metáfora, sinécdoque y deformación).
3. **Proceso formal**: recorrido de los bocetos al render madre. La tabla «de la casa al stand» resalta cada parte en el modelo 3D.
4. **Aspectos clave**: lo que se tuvo en cuenta para diseñar y construir (hogar y legado, lectura reconocible, color y marca, atención y cata, montaje en seco, transporte), el material y el montaje animado desde el empaque plano, con planos de encaje.
5. **Vistas 1 y 2**: isométrica con cotas y frontal de contacto, con producto y personas.
6. **Vistas 3 y 4**: lateral de circulación y detalle de la esquina en cremallera, con el mesón que se levanta y vuelve a encajar.

El botón **PNG** de cada vista exporta un render de 2400 px con los nombres que pedía `recursos_entrada/04_renders/`.

## El modelo (`stand3d.js`)

El modelo es paramétrico y está hecho con 24 tableros planos. Se reconstruyó a partir de dos referencias:

- `recursos_entrada/04_renders/render_madre.jpg`, la imagen del diseño;
- `recursos_entrada/04_renders/modelo_ia_tripo.glb`, el modelo 3D de referencia.

**Cómo se midió.** Se hicieron cortes en planta y sección del GLB. De ahí salieron los planos de cada tablero, la pendiente de 34,5° de ambas cubiertas y las posiciones de puerta, ventana, pilares, hastiales y labio.

**Escala.** El GLB no trae unidades. La escala real la fija `K` en `stand3d.js` (hoy 1/1,70): el stand ocupa ≈ 1,97 × 1,32 m, mide ≈ 1,48 m a la cumbrera, la losa (mostrador) queda a 1,02 m y el mesón a 0,54 m. El tablero es triplex de pino radiata de 18 mm (`E` se deriva de esa medida real). Las cámaras se encuadraron con la escala anterior y se ajustan solas con `K`. El plano de corte está en `plano_de_corte.html`: 19 tableros en 4 láminas de 1,22 × 2,44 m.

**Verificación.** Se compararon las siluetas ortogonales del modelo contra las del GLB con `_comparar.html` y `_diff.js`. La coincidencia (IoU) fue de 97 % de frente, 94 % de lado y 98 % en planta. La vista lateral baja porque el GLB tiene tirantes que, por decisión del diseño, se quitaron.

**Cámara del render.** Se resolvió por correspondencia de puntos (PnP): es un teleobjetivo de ≈ 10° a 19 m. El preset `render` reproduce el encuadre del render madre.

**Piezas continuas:** el frente y el costado de la bodega suben de una sola pieza hasta la losa y forman los postes de la vitrina. El mesón se recorta alrededor de ellos.

**Uniones:**

- **Esquinas de la bodega:** en cremallera.
- **Dientes que atraviesan mesón y losa:** caen en **muescas abiertas** del canto, sin ninguna tapa delante del hueco. Esto lo hace `edgeCuts`, que convierte en muesca toda mortaja que toque un borde.
- **Losas:** dos placas unidas con dientes sobre el muro.
- **Cumbreras:** se arman como prismas. Cada diente termina exactamente en la cara exterior del faldón opuesto y cada muesca en su cara interior, ambos cortados al ángulo real de 34,5°, así que el encaje queda al ras.
- **Hastiales:** triángulos exactos bajo las dos caras inferiores, sin tirante, encajados con dientes en los faldones.
- **Alero:** su faldón va dentado contra el labio.
- **Pilar en T:** la punta del alma sube por una muesca abierta en el borde superior del labio y queda a ras; la T entra de frente al final.

**Color:** paleta Villa Lucía (`PAL` en `stand3d.js`), sacada del boceto de color, la casa de tapia y la marca: muros de cal, zócalo vino tinto (el uniforme), pilar en T y postes de la bodega en barro rojo (la tetera de cerámica), cubiertas y losas en café tostado. El zócalo y los postes se pintan con un shader según la altura de cada pieza ya montada (`SCHEME`), así cada tablero sigue siendo una sola pieza. El logo va como calcomanía sobre el frente y el costado de la bodega (`addBrand`, logo embebido en `assets/logo_data.js` para que funcione desde file://). En el explorador, «Acabado → Color / Marca» activa y desactiva ambas cosas; por API: `Stand3D.color(bool)` y `Stand3D.brand(bool)`.
