# 🌸 El jardín de Johana · 28

Una felicitación de cumpleaños interactiva: un jardín nocturno donde **las flores no se abren solas**.
Hay que sembrarlas una a una —veintiocho, una por cada año— y cada una devuelve un deseo.

Sin frameworks, sin build, sin dependencias: **HTML + CSS + JavaScript** puro, listo para GitHub Pages.

---

## Las cinco escenas

| # | Escena | Qué se hace |
|---|--------|-------------|
| 1 | **Portada** | El nombre, la edad y la puerta al jardín. |
| 2 | **El jardín** | Mantén pulsado sobre la tierra: el tallo crece mientras aguantas y florece al soltar. Cada flor es única (5 especies, 8 paletas, semilla aleatoria) y trae un deseo. Tocar una flor abierta la sacude y suelta pétalos. El ratón genera viento; aparecen mariposas y luciérnagas según crece el jardín. |
| 3 | **La tarta** | 28 velas encendidas. Se apagan **soplando de verdad al micrófono** (el medidor reacciona al volumen) o con el dedo/ratón arrastrando sobre ellas. Al apagarlas todas suena el cumpleaños feliz. |
| 4 | **Atrapa los pétalos** | Minijuego: mueve la cesta con el dedo, el ratón o las flechas ← →. Pétalos (+1), corazones (+2), pétalos dorados (+3). Meta: 28. |
| 5 | **El ramo** | Tus 28 flores, atadas con un lazo. Arrástralo para abrir el abanico, toca cualquier flor para releer su deseo, y ahí está la carta. |

Extras: música y efectos generados en tiempo real con **WebAudio** (ni un solo archivo de audio),
navegación por capítulos, pantalla completa, soporte táctil, `prefers-reduced-motion`,
y un huevo de pascua — escribe `johana` en cualquier momento.

---

## Verlo en marcha

**En local** (hace falta un servidor: el proyecto usa módulos ES):

```bash
python -m http.server 8000
# luego abre http://localhost:8000
```

**En GitHub Pages:** en el repositorio, `Settings → Pages → Source: GitHub Actions`.
Cada push a `main` se publica solo mediante [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

> Si prefieres *Deploy from a branch* (`main` / `root`), también funciona — el `.nojekyll` ya está puesto.
> En ese caso puedes borrar el workflow.

---

## Personalizarlo

Casi todo lo editable vive en [`js/messages.js`](js/messages.js):

```js
export const WISHES = [ /* los 28 deseos, uno por flor */ ];
export const LETTER = `la carta del final`;
export const NAME = 'Johana';
export const AGE   = 28;
```

Cambiar `NAME` y `AGE` ajusta el título de la pestaña y los textos.
Ojo: el número de velas, flores y pétalos es 28 por diseño — está en `TARGET` (`js/garden.js`),
`total` (`js/cake.js`) y `GOAL` (`js/game.js`).

Los colores de las flores están en `PALETTES` ([`js/flower.js`](js/flower.js)) y la paleta general
en las variables CSS de `:root` ([`css/styles.css`](css/styles.css)).

---

## Cómo está hecho

```
index.html          las cinco escenas
css/styles.css      paleta nocturna, HUD, tarta, tarjetas
js/
  main.js           director de escena: navegación, HUD, atajos
  flower.js         flores procedurales (tallo, hojas, pétalos por especie)
  garden.js         escena 2: sembrar, viento, mariposas, luciérnagas
  cake.js           escena 3: velas + micrófono
  game.js           escena 4: minijuego de pétalos
  final.js          escena 5: el ramo
  fx.js             capa global de pétalos, confeti y destellos
  audio.js          sintetizador WebAudio (ambiente, campanas, melodía)
  messages.js       los 28 deseos y la carta
```

Las flores se dibujan en canvas 2D a partir de una semilla: la misma semilla da siempre la misma flor,
así el ramo final está hecho exactamente de las flores que sembraste.

El micrófono solo se activa si lo pides con el botón, se usa únicamente para medir el volumen
y nunca sale del navegador. Requiere HTTPS, que es justo lo que da GitHub Pages.
