# Lectoescritura Desde Cero

App web para enseñar a leer y escribir desde cero, basada en la metodología de *El Mundo del Aprendizaje*
(`guia-app-lectoescritura.md`).

**Regla de oro:** toda letra suena con su **fonema** (`/mmm/`, `/sss/`, `/p/`), nunca con su nombre ("eme", "ese", "pe").

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas (contenido, sílabas, progreso, regla de oro del audio)
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
| Módulo 3: vocales · Módulo 4: m s l n f p + repasos con bloques · Módulo 5: familia (bloques), colores (decodificador) y palabras (elevador) | ✅ |
| Ruleta, Lupa mágica | Pendiente |
| Módulo 1 (motricidad) y Módulo 2 (conciencia fonológica) | Pendiente (bloqueados en el inicio) |

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
`mecanica` (`presentacion_fonema`, `elevador_silabas`, `bloques_construccion` o `decodificador_color`). `npm test` valida que los fonemas existan, que cada
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
- El arrastre usa Framer Motion en lugar de HTML5 Drag & Drop, que falla en tablets.
