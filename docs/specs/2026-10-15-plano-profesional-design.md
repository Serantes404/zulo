# Plano profesional generado por IA

**Fecha:** 2026-10-15 · **Estado:** propuesta, pendiente de revisión de Santi

## Objetivo

Cuando el admin dibuja el almacén en la app (o sube un boceto en planta), el plano que se guarda y se ve **no es su dibujo a mano**, sino un plano limpio **tipo arquitecto**: muros, puerta con su arco, pasillo y zonas de color con su nombre. El dibujo solo sirve para que la IA entienda la sala.

**Éxito:**
- Con `ADS.png` y con un dibujo hecho en el lienzo, sale un plano en el que se reconoce la sala.
- Las zonas que se tocan coinciden exactamente con las dibujadas, porque son las mismas.
- Funciona con `gemini-3.5-flash-lite` (plan gratis) en menos de 10 s.

**Fuera de alcance (v1):**
- Editar muros o puertas a mano: si están mal, se redibuja.
- Salas que no sean rectangulares.
- Medidas en metros.
- Generar el plano como imagen con IA. Se descarta porque las zonas pintadas no coincidirían con las que se tocan.

## Prueba previa (spike, 2026-10-15)

Con `gemini-3.5-flash-lite`, en 3-5 s:
- **`ADS.png`:** 12 zonas con nombre en dos columnas, el pasillo en el centro y la puerta en la pared izquierda (en las 3 ejecuciones).
- **Boceto de líneas** del lienzo: detecta el hueco de la puerta en la pared inferior y las 5 zonas.

**Fallos observados:**
- "Puerta" aparece también como zona en 2 de 3 ejecuciones.
- A veces se inventa un pasillo encima de una zona.

Ambos se corrigen con el postproceso (ver abajo). Los modelos `3.7`/`3.8-flash` estaban saturados.

## Diseño

### 1. Origen del plano

El plano puede venir de un **dibujo/boceto** (`sketch`) o de una **foto** (`photo`).
- **Dibujo del lienzo:** siempre `sketch`.
- **Subida con "Subir foto o boceto":** pregunta "¿Es una foto o un boceto en planta?". Por defecto es foto.
- **Plano `sketch`:** se genera el plano profesional.
- **Plano `photo`:** se comporta como ahora (zonas sobre la foto).

### 2. Datos (migración)

```sql
alter table public.warehouses
  add column plan_source text check (plan_source in ('sketch', 'photo')),
  add column layout jsonb;
```

`layout` (solo si `plan_source = 'sketch'`). Coordenadas en 0-1 **relativas a la sala** (no a la imagen):

```json
{ "doors": [{ "wall": "left", "start": 0.80, "end": 0.86 }],
  "corridors": [{ "label": "Pasillo", "x": 0.30, "y": 0, "w": 0.40, "h": 1 }] }
```

- En planos `sketch`, las zonas (`zones.x/y/w/h`) también se guardan relativas a la sala.
- `warehouses.aspect_ratio` pasa a ser la proporción de la sala (ancho/alto en píxeles de la imagen).
- Los almacenes existentes tienen `layout = null` y se ven como ahora.
- Hay que regenerar `lib/database.types.ts`. Santi aplica la migración en Supabase (SQL Editor o `db push`).

### 3. IA

- `detectZonesFromImage` recibe el modo (`'sketch' | 'photo'`).
- **Modo `photo`:** prompt y respuesta actuales.
- **Modo `sketch`:** prompt de la spike. Pide `room`, `doors`, `corridors` y `zones` en formato nativo `box_2d` 0-1000. Exige etiqueta vacía si no hay nombre escrito y prohíbe que puertas o pasillos sean zonas.
- Tiempo límite y reintento como ahora.

### 4. Postproceso (`lib/ai/layout.ts`, puro y con tests)

1. Valida la respuesta con zod. Si `room` no es válido, toma la imagen entera como sala.
2. Convierte todo de `box_2d` 0-1000 (sobre la imagen) a 0-1 relativo a la sala, recortando a la sala.
3. **Descarta zonas** cuya etiqueta sea "puerta"/"entrada"/"door" (sin tildes ni mayúsculas). Si en esa pared no había puerta, la convierte en puerta.
4. **Descarta pasillos** que se solapen más de un 20 % con alguna zona.
5. **Puertas:**
   - Ancho mínimo del 6 % de la pared y máximo del 40 %.
   - Paredes válidas: `top`, `bottom`, `left`, `right`.
6. Zonas: las mismas reglas que ahora (`normalizeZones`: área mínima, máximo 30, "Zona N").
7. Devuelve `{ zones, layout, aspectRatio }`.

### 5. Dibujo (`components/FloorPlan.tsx`)

SVG con `viewBox` según `aspectRatio`, a todo el ancho:
- **Suelo:** gris muy claro con cuadrícula sutil.
- **Muros:** grosor fijo, rayado diagonal y borde oscuro, con huecos donde hay puertas.
- **Puerta:** hoja (línea) y arco discontinuo de apertura hacia dentro, con el texto "Entrada".
- **Pasillo:** contorno discontinuo y texto en mayúsculas espaciadas, en vertical si es más alto que ancho.
- La geometría (huecos de muro, arcos) va en funciones puras con test (`lib/floorPlanGeometry.ts`).

**Dónde se usa:**
- **`PlanView`** (vista del almacén): si hay `layout`, `FloorPlan` de fondo en vez de la imagen. Las zonas encima con estilo de plano: relleno suave, borde del color y nombre centrado. El estado (Prestado, Vencido), el buscador y el tocar siguen igual.
- **`ZoneEditor`:** el mismo fondo `FloorPlan` y las zonas editables encima como ahora. Hay un botón **"Redibujar"** que vuelve al lienzo.

### 6. Flujo en el editor

1. **Dibujar → "Listo":**
   - se sube el PNG;
   - `setPlanImage(..., source: 'sketch')`;
   - `detectZonesAction(mode: 'sketch')` → `{ zones, layout, aspectRatio }`;
   - el editor muestra el plano profesional con las zonas propuestas (sin guardar).
2. **"Guardar plano":** guarda zonas, `layout` y `aspect_ratio` juntos con `savePlan`, que amplía `saveZones` con `layout` y `aspectRatio` opcionales.
3. **"Volver a detectar con IA":** usa el `plan_source` guardado.
4. **Si la IA falla:** se genera un `layout` por defecto (sala = imagen entera, sin puertas ni pasillo) y el admin dibuja las zonas a mano sobre él.

### 7. Errores

Los mensajes de la IA son los mismos (`NO_ZONES`, `TIMEOUT`, `UNAVAILABLE`). Un `layout` inválido nunca rompe la página: se ignora y se pinta solo la sala.

### 8. Pruebas

- **Unitarias:**
  - `lib/ai/layout.ts`: conversión a coordenadas de sala, descartar "Puerta", pasillos solapados, límites de puertas y respuesta inválida.
  - `lib/floorPlanGeometry.ts`: huecos de muro y arcos.
  - Esquema de la respuesta en modo sketch.
- **Manual (ordenador y móvil):**
  - dibujar → plano profesional → nombrar → guardar → ver en la página del almacén → buscar;
  - subir `ADS.png` como boceto;
  - subir una foto como foto (como ahora);
  - IA apagada → layout por defecto.

## Archivos

- **Nuevos:**
  - `supabase/migrations/<fecha>_warehouse_layout.sql`
  - `lib/ai/layout.ts` (+test)
  - `lib/floorPlanGeometry.ts` (+test)
  - `components/FloorPlan.tsx`
- **Cambian:**
  - `lib/ai/gemini.ts` (modo sketch)
  - `lib/ai/detectZones.ts`
  - `app/g/[groupId]/w/[whId]/edit/actions.ts` (`setPlanImage` con `source`, `detectZonesAction` con modo, `savePlan`)
  - `PlanEditorClient.tsx`
  - `ZoneEditor.tsx`
  - `PlanView.tsx`
  - `app/g/[groupId]/w/[whId]/page.tsx` (leer `layout`)
  - `lib/database.types.ts`
