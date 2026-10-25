# Lectoescritura Desde Cero

App web para enseñar a leer y escribir desde cero, basada en la metodología de *El Mundo del Aprendizaje*
(`guia-app-lectoescritura.md`).

**Regla de oro:** toda letra suena con su **fonema** (`/mmm/`, `/sss/`, `/p/`), nunca con su nombre ("eme", "ese", "pe").

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas (contenido, sílabas, progreso, regla de oro del audio)
npm run e2e      # recorridos en navegador de cada mecánica (requiere npm run dev en otra terminal)
npm run build    # versión de producción en dist/
```

## Estado del MVP

| Parte | Estado |
|---|---|
| Pantalla de inicio (mapa de módulos con iconos) | ✅ |
| Reproductor fonético (letra minúscula + sonido + gesto de boca + palabra ejemplo) | ✅ |
| Elevador de Sílabas (arrastre táctil y flechas, dictado, ayuda tras 2 intentos, 1 o 2 sílabas) | ✅ |
| Progreso guardado en el dispositivo + panel para adultos con puerta de acceso | ✅ |
| Bloques de Construcción (arrastrar o tocar, sílabas correctas quedan fijas, lectura sílaba a sílaba al final) | ✅ |
| Decodificador de color (clave color+forma, mensaje secreto, sílabas separadas y elección de imagen) | ✅ |
| Lupa mágica (trama roja, lente que la filtra, sílabas sobrantes que se apagan al tocarlas) | ✅ |
| Ruleta silábica (dos ruedas concéntricas, giro con el dedo o 🎲, álbum de palabras reales) | ✅ |
| Módulo 3: vocales · Módulo 4: m s l n f p + repasos con bloques · Módulo 5: familia (bloques), colores (decodificador), detective (lupa), ruleta y palabras (elevador) | ✅ |
| Módulo 1 · Motricidad: caminos con el dedo (izquierda → derecha), unir puntos, ¿cuál es diferente? (espejo, de cabeza, tamaño; incluye p/q) | ✅ |
| Módulo 2 · Conciencia fonológica: palmadas (sílabas con tambor), sonido inicial, rimas, sonidos parecidos (pino/vino, dos/tos) | ✅ |

## Estructura

```
public/audio/{fonemas,silabas,palabras,feedback}/   grabaciones MP3
src/content/        fonemas.json, ruta.json, lecciones/*.json  ← el contenido se edita aquí
src/types/          modelo de datos (TypeScript)
src/lib/audio/      AudioEngine (Web Audio API) y rutas de archivos
src/lib/            sílabas, carga/validación de contenido, desbloqueo
src/store/          progreso y ajustes (Zustand, guardado en localStorage)
src/mechanics/      una carpeta por mecánica + registro en index.tsx
src/pages/          Inicio, Módulo, Lección, Panel de adultos
tests/              Vitest
```

### Añadir una lección

Agrega un objeto a `src/content/lecciones/*.json` y su `id` al módulo en `ruta.json`. Cada paso declara su
`mecanica` (`presentacion_fonema`, `elevador_silabas`, `bloques_construccion`, `decodificador_color`, `lupa_magica`, `ruleta_silabica`, `trazo_guiado`, `unir_puntos`,
`encuentra_diferente`, `escucha_y_elige` o `palmadas`). `npm test` valida que los fonemas existan, que cada
objetivo se pueda formar con las tiras del elevador y que ningún distractor de los bloques sea parte de la palabra.

Ejemplo de bloques (`bloques` es opcional; si falta, la palabra se divide sola):

```json
{ "mecanica": "bloques_construccion", "objetivos": [
  { "texto": "mamá", "icono": "👩", "bloques": ["ma", "má"], "distractores": ["pa", "so"] }
] }
```

Ejemplo de decodificador (máximo 6 colores; cada uno recibe además una forma ● ▲ ■ ★ ♥ ◆):

```json
{ "mecanica": "decodificador_color",
  "clave": { "so": "#3B82F6", "pa": "#EF4444" },
  "objetivos": [
    { "texto": "sopa", "icono": "🍲", "distractores": [{ "texto": "sapo", "icono": "🐸" }] }
  ] }
```

Ejemplo de ruleta. **Importante:** `palabras` debe incluir TODAS las palabras reales que se pueden formar; si
falta una, la app le diría al niño que no es palabra. Ojo con el seseo: "maso" suena igual que "mazo".

```json
{ "mecanica": "ruleta_silabica", "primera": ["ma", "pa", "sa"], "segunda": ["pa", "no", "la", "fo"], "meta": 5,
  "palabras": [{ "texto": "mapa", "icono": "🗺️" }, { "texto": "mala" }] }
```

En `escucha_y_elige` con modo `sonido_inicial`, la prueba exige que las opciones correctas sean exactamente las que
empiezan con esa letra. Evita palabras con c, z o h al inicio: con el seseo, "cielo" suena /s/ pero no empieza con s.
En `palmadas` la división silábica se escribe a mano (`["e", "le", "fan", "te"]`).

### Añadir una mecánica

Crea `src/mechanics/MiMecanica/`, añade su tipo de paso en `src/types/content.ts` y regístrala en
`src/mechanics/index.tsx`. Recibe `paso` y llama `onTerminar({ aciertos, total })` al acabar.

## Audios

Todavía **no hay grabaciones**. Mientras falte un archivo:

- **vocales, sílabas, palabras y frases** usan la voz del sistema en español;
- **consonantes** usan un sonido sintético aproximado (zumbido para /mmm/, siseo para /sss/…). Nunca se usa la
  voz del sistema para una consonante suelta, porque diría su nombre. Una prueba automática lo verifica.

La lista exacta de archivos a grabar aparece en **Panel de adultos → Audios por grabar**, con la ruta
y lo que debe decir cada uno. Formato: MP3, voz humana clara, sin silencio al inicio. Los nombres van en
minúscula y conservan las tildes (`public/audio/palabras/mamá.mp3`).

## Cambios respecto a la guía y al esquema

- Ruta de consonantes sin repeticiones (la guía repetía N, F y D): `m s l n f p → t d → r → g j ñ w → c k q z v h rr x y`.
- `/p/` está en el bloque 1 pero marcada `continuo: false` (no se puede alargar).
- Los audios se movieron de `assets/audio/` a `public/audio/` y se añadieron sílabas y frases de refuerzo.
- Los bloques se encajan en horizontal (de izquierda a derecha, como se lee) en lugar de apilarse.
- En el decodificador cada color va acompañado de una forma, para niños con daltonismo. Tras descifrar, la app
  dice las sílabas separadas y el niño elige la imagen: la unión la hace él (lectura indirecta).
- En la lupa, el primer toque sobre una sílaba escondida solo la descubre; hay que verla antes de elegirla.
- En la ruleta, el anillo de afuera lleva la primera sílaba y la rueda de adentro la segunda, para que la ventana
  se lea en orden de arriba abajo.
- Módulo 1: si el dedo se sale del camino, el personaje se queda donde iba (no se pierde lo avanzado) y se toleran
  hasta 2 salidas sin bajar la puntuación.
- El arrastre usa Framer Motion en lugar de HTML5 Drag & Drop, que falla en tablets.
