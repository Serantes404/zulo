# Rediseño del frontend de Zulo (spec de diseño)

- **Fecha:** 2026-10-19
- **Estado:** propuesta, pendiente de revisión de Santi
- **Alcance:** solo la capa visual y de navegación. No cambia datos, RPC, RLS ni la IA.
- **Relacionado:** `docs/specs/2026-10-14-zulo-design.md` (spec principal), `docs/specs/2026-10-15-plano-profesional-design.md` (plano tipo arquitecto).

> Según `CLAUDE.md`, el frontend bonito va al final. Este documento se puede aplicar después de T10–T12 o, para las pantallas que aún no existen (ficha del material, préstamos), servir como guía de estilo para construirlas directamente con el diseño nuevo.

---

## 1. Inventario actual

### 1.1 Rutas y pantallas

| Ruta | Archivo | Qué muestra | Problemas de aspecto |
|---|---|---|---|
| `/login` | `app/login/page.tsx`, `LoginForm.tsx` | Título "Entrar en Zulo", email, contraseña, alternar Entrar/Crear cuenta | Sin marca ni explicación de qué es Zulo. El enlace para cambiar de modo es un `<button class="underline">` pequeño. El error usa `text-red-700` fijo (no es un token). Botón de 32 px de alto. |
| `/welcome` | `app/welcome/page.tsx` | "¡Bienvenido!" y el campo "¿Cómo te llamas?" | Pantalla vacía, sin contexto ni progreso ("paso 1 de 1"). Misma estética genérica. |
| `/join/[code]` | `app/join/[code]/page.tsx` | "Te han invitado a un grupo" y botón "Unirme" | No dice **a qué grupo** se une (el nombre del grupo no se muestra). El error es texto rojo sin icono ni salida. |
| `/` | `app/page.tsx` | "Mis grupos" (lista con borde) y formulario "Crear un grupo nuevo" | Las filas son cajas de texto planas, sin icono, avatar ni contadores. El estado vacío es una línea gris. El fallback es "Cargando…" en texto. |
| `/g/[groupId]` | `app/g/[groupId]/page.tsx`, `InviteLink.tsx`, `DeleteWarehouseButton.tsx` | Almacenes (lista y "Nuevo almacén"), miembros ("Hacer admin") e invitación (copiar y regenerar link) | Todo en una columna larga sin jerarquía. "Eliminar" en rojo en cada fila compite con el enlace. Usa `confirm()` nativo. El link se muestra en crudo en `font-mono`. Ya hay un hueco para "Mis préstamos" (T12). |
| `/g/[groupId]/w/[whId]` | `app/g/[groupId]/w/[whId]/page.tsx` + `PlanView` + `ItemList` | "← Volver al grupo", nombre, "Editar plano", buscador, plano con zonas y lista de la zona elegida debajo | El plano, que es lo principal de la app, ocupa poco y queda entre el buscador y la lista. Los resultados de búsqueda son enlaces subrayados. La lista de la zona aparece **debajo** del plano, así que en el móvil hay que hacer scroll y se pierde el contexto. La cuadrícula del fondo tiene `#e5e7eb` fijo. |
| `/g/[groupId]/w/[whId]/edit` | `edit/page.tsx`, `PlanEditorClient.tsx` + `SketchPad`, `ZoneEditor`, `PhotoCapture` | Lienzo para dibujar o subir foto/boceto → "Detectando zonas…" → editor de zonas (arrastrar, cambiar tamaño, nombre, color) → Guardar | No hay sensación de pasos (dibujar → IA → retocar → guardar). El estado de la IA es una caja con texto, sin animación. Los botones de la barra inferior (Redibujar, Volver a detectar, Guardar) tienen todos el mismo peso. Las asas de `react-rnd` no se ven. Los colores se llaman "Color 1…8". Los errores salen en rojo aunque sean informativos ("Detección cancelada…"). |
| `/item/[itemId]` | *(no existe aún; T11/T12)* | Ficha del material, coger con foto, devolver con foto, historial | Se diseña aquí directamente (§5.8). |
| "Mis préstamos" | *(no existe aún; T12, sección del grupo)* | Préstamos activos del usuario | Se diseña aquí (§5.9). |
| 404 / errores | *(no hay `not-found.tsx` ni `error.tsx`; T15)* | Next por defecto | Pantalla en inglés y sin estilo. |

### 1.2 Componentes compartidos

| Componente | Qué hace | Problemas de aspecto |
|---|---|---|
| `components/Header.tsx` | Logo de texto "Zulo" y botón "Salir" | Sin selector de grupo, sin avatar y sin navegación. Ancho `max-w-3xl` distinto del de las páginas (`max-w-lg`). |
| `components/PlanView.tsx` | Buscador, resultados, zonas clicables sobre foto/cuadrícula y lista de la zona | Las zonas son rectángulos `color + 33` con una etiqueta blanca. "Prestado" y "Vencido" son chips sueltos. El anillo de búsqueda es un `boxShadow` del color de la zona. Las zonas atenuadas a 0,25 apenas se leen. **Aún no pinta `FloorPlan`** cuando el plano es `sketch` (solo lo hace el editor). |
| `components/FloorPlan.tsx` | SVG tipo arquitecto: suelo con baldosa, muros rayados, arcos de puerta y pasillos discontinuos | Es lo más bonito de la app, pero todos los colores están fijos en el código (`#FAFAF7`, `#2B2B2B`, `#B8B4AA`…), así que no se adapta al modo oscuro. Los textos usan Helvetica en vez de la fuente de la app. |
| `components/ZoneEditor.tsx` | Editor `react-rnd` y panel con nombre, color y "Eliminar zona" | No se ve qué zona está seleccionada (solo un `outline` discontinuo `#111`). No hay asas visibles. Las muestras de color miden 32 px. El panel queda debajo del plano. |
| `components/SketchPad.tsx` | Lienzo 4:3 con Deshacer, Borrar todo y "Listo, detectar zonas" | Lienzo blanco plano, sin guía (sin cuadrícula ni ejemplo). Los tres botones están en fila con poca diferencia visual. |
| `components/ItemList.tsx` | Lista del material de la zona y formulario "Añadir material" (admin) | El formulario de alta siempre está desplegado y ocupa más que la lista. Sin miniaturas. La disponibilidad es solo texto. |
| `components/PhotoCapture.tsx` | `<label>` como botón, `input file` oculto, vista previa y error | El botón es un `<label>` con estilo propio, no `Button`. Sin zona de cámara grande ni estado de subida visual. |
| `app/g/[groupId]/InviteLink.tsx` | Link de invitación, copiar y regenerar | Muestra la URL en crudo. "¡Copiado!" cambia el texto del botón, pero no lo anuncia un `aria-live`. `confirm()` nativo. |
| `app/g/[groupId]/DeleteWarehouseButton.tsx` | Botón destructivo con `confirm()` | Rojo visible en cada fila. `confirm()` nativo. |
| `components/ui/*` | shadcn `base-nova`: `button`, `input`, `label`, `textarea`, `card`, `badge` | **Botón por defecto `h-8` (32 px)**, por debajo de 44 px. `card` no se usa. Faltan sheet, dialog, menú, skeleton y toast. |

### 1.3 Problemas transversales

- **Tema neutro de shadcn sin tocar:** todo en grises `oklch(… 0 0)`. No hay color de marca.
- **Probable fallo de fuente:** `layout.tsx` define `--font-geist-sans`, pero `globals.css` hace `--font-sans: var(--font-sans)` (se apunta a sí misma). Probablemente la app **no está usando Geist**. Hay que comprobarlo en el navegador (DevTools → Computed → `font-family`).
- **El modo oscuro nunca se activa:** existen tokens `.dark`, pero nadie pone la clase.
- **Estados pobres:** "Cargando…" en texto, `confirm()` nativo, errores con `text-red-700` fijo, sin toasts y sin skeletons.
- **Tamaños táctiles:** botones `h-8`/`h-7`, inputs de 32-36 px y muestras de color de 32 px.
- **Sin iconos**, aunque `lucide-react` (`^1.57.0`) ya está instalado.

---

## 2. Direcciones visuales

### A. "Campamento" (outdoor/scout)
- **Ambiente:** papel kraft, insignias, mapa topográfico.
- **Paleta:** verde bosque `#2F5D3A`, caqui `#C8B68A`, naranja fuego `#E2652B`, crema `#F4EEDF`.
- **Tipografía:** serif robusta para títulos (Bitter) y sans humanista para el texto.
- **Pros:** encaja con los scouts. **Contras:** se queda corta para clubs deportivos y asociaciones, y la textura de papel compite con el plano.

### B. "Plano técnico" (limpio moderno, tipo blueprint)
- **Ambiente:** mesa de arquitecto. Papel cálido, tinta casi negra, líneas finas, anotaciones en mono y un azul cobalto. En modo oscuro el plano se convierte en un **blueprint** (azul noche con líneas claras).
- **Paleta:** papel `#F7F6F2`, tinta `#14161F`, cobalto `#2747D6` y naranja señal `#FF6B35` para destacar.
- **Tipografía:** Geist (ya cargada) para la interfaz y Geist Mono en mayúsculas espaciadas para anotaciones ("PASILLO", "ZONA 3", "2/3 DISP.").
- **Pros:** el plano y la interfaz parecen del mismo mundo, sirve para cualquier club y no hace falta ninguna dependencia nueva. **Contras:** si no se cuida el acento, puede quedar algo sobrio.

### C. "Vibrante" (juvenil)
- **Ambiente:** app de consumo, con gradientes, esquinas muy redondas y emojis.
- **Paleta:** violeta `#7C3AED`, rosa `#EC4899`, lima `#A3E635` y fondo blanco.
- **Tipografía:** sans redonda (Nunito o Poppins) en pesos altos.
- **Pros:** gusta a los chavales y es muy expresiva. **Contras:** los colores de la interfaz chocan con los 8 colores de zona, el plano tipo arquitecto queda fuera de lugar y envejece rápido.

### Recomendación: **B, "Plano técnico"**

1. **El plano es la pieza principal.** `FloorPlan.tsx` ya tiene estética de arquitecto (rayado, arcos y discontinuas), y B lleva ese lenguaje a toda la app: líneas finas, anotaciones en mono y papel cálido. Con A o C el plano parecería un elemento ajeno.
2. **Los colores de zona necesitan una interfaz neutra.** Con 8 colores de zona sobre el plano, la interfaz tiene que ser casi monocroma (tinta y papel) y dejar un único azul de marca. Así las zonas son lo que más destaca.
3. **Modo oscuro que luce:** el "blueprint" nocturno es lo más llamativo del rediseño y sale casi gratis cambiando las variables del SVG.
4. **Coste cero en dependencias:** Geist y Geist Mono ya están en `layout.tsx`, lucide ya está instalado y los componentes nuevos salen de Base UI, que también está instalado.
5. **Neutra para todos:** vale para scouts, deportes y asociaciones. El guiño scout queda en el naranja señal (pañoleta) y en algún texto.

---

## 3. Sistema de diseño ("Plano técnico")

### 3.1 Tokens de color (shadcn, en `app/globals.css`)

Se dan en hex porque los contrastes se han calculado sobre hex (fórmula WCAG 2.1). Se pueden convertir a `oklch` si se prefiere, porque shadcn admite cualquier formato.

> Ojo: en shadcn, `--accent` **no** es el color de marca, sino el fondo de hover de menús y elementos fantasma. El naranja de marca va en un token aparte, `--signal`.

| Token shadcn | Claro | Oscuro (blueprint) | Uso / contraste |
|---|---|---|---|
| `--background` | `#F7F6F2` papel | `#0E1220` noche | Fondo de la app |
| `--foreground` | `#14161F` tinta | `#E8EAF2` | 16,7:1 / 15,5:1 |
| `--card` / `--popover` | `#FFFFFF` | `#161B2C` | Tarjetas, sheets y menús |
| `--card-foreground` / `--popover-foreground` | `#14161F` | `#E8EAF2` | |
| `--primary` | `#2747D6` cobalto | `#8EA6FF` | Texto primario sobre fondo: 6,56:1 / 8,04:1 |
| `--primary-foreground` | `#FFFFFF` | `#0E1220` | Sobre primario: 7,10:1 / 8,04:1 |
| `--secondary` | `#ECEBE5` | `#1E2438` | Botón secundario. Tinta encima: 15,1:1 |
| `--secondary-foreground` | `#14161F` | `#E8EAF2` | |
| `--muted` | `#EFEEE8` | `#1E2438` | Fondos suaves y skeleton |
| `--muted-foreground` | `#5B6070` | `#9AA3B8` | 5,79:1 sobre papel y 5,39:1 sobre muted / 7,38:1 y 6,09:1 |
| `--accent` (hover) | `#E9ECFB` | `#222B47` | Primario `#1E3AB8` encima: 7,59:1 / texto 11,6:1 |
| `--accent-foreground` | `#1E3AB8` | `#E8EAF2` | |
| `--destructive` | `#B91C1C` | `#F87171` | 5,98:1 sobre papel / 6,19:1 sobre card |
| `--border` | `#DEDCD5` | `#2A3147` | Solo separadores decorativos |
| `--input` | `#8A8F9C` | `#6B7490` | Borde de inputs (no texto, 1.4.11): 3,24:1 / 3,69:1 |
| `--ring` | `#2747D6` | `#8EA6FF` | Anillo de foco: 7,1:1 / 7,37:1 |
| `--chart-1..5` | Zonas 1-5 (§3.2) | Variantes oscuras | Por si acaso; no hay gráficos |
| `--sidebar*` | Igual que card/primary | Igual | No se usa (no hay sidebar) |
| `--radius` | `0.75rem` | | Ver §3.6 |

**Tokens propios** (se añaden a `:root` y a `@theme inline` como `--color-*`):

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--signal` | `#FF6B35` | `#FF8A5B` | Acento de marca: indicador de pestaña activa, punto del logo, resaltado puntual. **Solo como relleno.** Tinta encima: 6,36:1. Sobre papel solo da 2,62:1, así que **nunca como texto**. |
| `--signal-ink` | `#C2410C` | `#FF8A5B` | Cuando el acento tiene que ser texto: 4,79:1 / 8,03:1 |
| `--plan-paper` | `#FAFAF7` | `#111A2E` | Suelo del plano |
| `--plan-grid` | `#ECEAE4` | `#1A2540` | Baldosa (decorativa) |
| `--plan-ink` | `#1F2330` | `#C9D3EE` | Muros, puertas y hatch: 15,0:1 / 11,6:1 |
| `--plan-line` | `#B8B4AA` | `#6F7FA8` | Pasillo discontinuo |
| `--plan-label` | `#6E6A60` | `#8C9AC0` | Texto "PASILLO": 5,16:1 / 6,19:1 |
| `--success` / `--success-foreground` / `--success-ink` | `#DCFCE7` / `#14532D` / `#15803D` | `#14532D` / `#BBF7D0` / `#86EFAC` | Disponible |
| `--warning` / `--warning-foreground` | `#FEF3C7` / `#78350F` | `#713F12` / `#FDE68A` | Prestado |
| `--danger` / `--danger-foreground` | `#B91C1C` / `#FFFFFF` | `#B91C1C` / `#FFFFFF` | Vencido (chip sólido) |

**Modo oscuro sin dependencias:** se sigue el sistema operativo. Se cambia `@custom-variant dark (&:is(.dark *));` por `@custom-variant dark (@media (prefers-color-scheme: dark));` y los tokens oscuros pasan de `.dark { … }` a `@media (prefers-color-scheme: dark) { :root { … } }`. Así no hace falta `next-themes` ni un script en el `<head>`. Un interruptor manual queda como pregunta abierta (§8).

### 3.2 Paleta de zonas (8 colores)

**Importante:** `zones.color` guarda el hex y `validateZones` lo compara con `PALETTE` (`lib/zones.ts`). Para no tener que migrar datos ni romper los almacenes existentes, **los valores guardados no cambian**: funcionan como identificadores estables. Un mapa nuevo (`lib/zoneColors.ts`) traduce cada hex guardado al color que se pinta. `PALETTE` y sus tests no se tocan.

| # | Nombre | Hex guardado (no cambia) | Claro: color | Texto en chip | Contraste chip | Borde vs papel | Oscuro: color | Texto en chip oscuro | Contraste |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Teja | `#E4572E` | `#C2410C` | blanco | 5,18:1 | 4,79:1 | `#FB923C` | tinta `#14161F` | 7,97:1 |
| 2 | Cobalto | `#2E86AB` | `#1D4ED8` | blanco | 6,70:1 | 6,20:1 | `#7DA2FF` | tinta | 7,29:1 |
| 3 | Lima | `#3BB273` | `#4D7C0F` | blanco | 4,99:1 | 4,62:1 | `#A3E635` | tinta | 11,96:1 |
| 4 | Mostaza | `#F2A541` | `#EAB308` (borde `#A16207`) | **tinta** | 9,40:1 | 4,55:1 (con borde `#A16207`) | `#FACC15` | tinta | 11,78:1 |
| 5 | Uva | `#8E5DB8` | `#7C3AED` | blanco | 5,70:1 | 5,27:1 | `#C4B5FD` | tinta | 9,77:1 |
| 6 | Frambuesa | `#D64C8C` | `#BE185D` | blanco | 6,04:1 | 5,58:1 | `#F9A8D4` | tinta | 9,95:1 |
| 7 | Cian | `#1B998B` | `#0E7490` | blanco | 5,36:1 | 4,95:1 | `#67E8F9` | tinta | 12,44:1 |
| 8 | Pizarra | `#6C757D` | `#475569` | blanco | 7,58:1 | 7,01:1 | `#CBD5E1` | tinta | 12,15:1 |

- **Todas las etiquetas cumplen 4,5:1** (texto de 12-13 px) y **todos los bordes ≥ 3:1** contra el suelo del plano, en claro y en oscuro. En oscuro, todas pasan de 7:1 contra `#111A2E`.
- **Se distinguen bien:** los tonos están repartidos por el círculo cromático (naranja, azul, verde-amarillo, amarillo, violeta, rosa, cian y gris). Lima y Cian se separan a propósito para que no se confundan como verde y verde azulado. Con daltonismo, el nombre de la zona siempre se ve en el chip, así que el color nunca es la única pista.
- **Cómo se pinta una zona:** relleno del color al 14 % en claro (al 18 % en oscuro), borde de 2 px del color, chip de etiqueta sólido arriba a la izquierda (texto en blanco o en tinta, según la tabla) y nombre en Geist 600 de 12-13 px. Sobre un relleno al 14 %, la tinta tiene más de 13:1.
- El selector de color del editor muestra el **nombre** ("Teja", "Cobalto"…) en el `aria-label` y en un tooltip, en vez de "Color 1".

### 3.3 Colores de estado

Nunca solo con color: siempre **icono + texto**.

| Estado | Chip claro | Chip oscuro | Icono lucide | Texto |
|---|---|---|---|---|
| Disponible | `#DCFCE7` / `#14532D` (8,30:1) | `#14532D` / `#BBF7D0` (7,52:1) | `CircleCheck` | "3 de 3 disponibles" |
| Prestado | `#FEF3C7` / `#78350F` (8,15:1) | `#713F12` / `#FDE68A` (6,96:1) | `Clock` | "Prestado" / "1 de 3 disponibles" |
| Vencido | `#B91C1C` / blanco (6,47:1) | igual (6,47:1) | `TriangleAlert` | "Vencido" |
| Devuelto con daños / incompleto | Prestado (warning) | igual | `PackageX` | "Con daños" / "Incompleto" |

En el plano, una zona con préstamos lleva una **marca en la esquina** (círculo de 20 px con el icono) además del chip de texto. Una zona con vencidos lleva un borde punteado rojo **además** del icono.

### 3.4 Tipografía

- **Interfaz:** Geist Sans (ya en `next/font/google`, sin `npm install`). **Hay que arreglar el mapeo:** `--font-sans: var(--font-geist-sans)`.
- **Anotaciones y datos:** Geist Mono en mayúsculas con `tracking-[0.12em]` para "PASILLO", códigos, "2/3", fechas cortas y etiquetas de sección ("ALMACENES"). También en el SVG (`fontFamily="var(--font-geist-mono)"`).
- **Escala** (mobile-first; entre paréntesis, desde `md`):

| Token | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `display` | 28/32 (36/40) | 650, tracking −0,02em | Título de login y bienvenida |
| `h1` | 22/28 (28/34) | 600 | Título de página |
| `h2` | 17/24 | 600 | Sección y título del sheet |
| `body` | 16/24 | 400 | Texto e inputs (16 px evita el zoom de iOS) |
| `small` | 14/20 | 400-500 | Metadatos y ayudas |
| `overline` | 12/16 mono, mayúsculas, +0,12em | 500 | Etiquetas de sección y anotaciones |
| `chip` | 12/16 (13 en ≥ md) | 600 | Etiquetas de zona y badges |

### 3.5 Espaciado

Escala de Tailwind en múltiplos de 4. Gutter móvil de **16 px** (`px-4`). Separación entre secciones de 24-32 px. Contenedores: `max-w-md` en formularios, `max-w-2xl` en listas y `max-w-6xl` en el almacén y el editor en escritorio.

### 3.6 Radios y sombras

- `--radius: 0.75rem` (12 px). Tarjetas `rounded-xl` (≈17 px), inputs y botones `rounded-lg` (12 px), chips `rounded-md` y **zonas del plano `rounded-[3px]`** (en un plano, las esquinas tienen que ser casi rectas).
- Sombras suaves y cálidas, con tinta al 6-10 % (se definen en `@theme`):
  - `--shadow-xs: 0 1px 0 rgb(20 22 31 / .06)` para tarjetas en reposo, junto con un borde fino.
  - `--shadow-md: 0 4px 16px -4px rgb(20 22 31 / .12)` para hover y elementos flotantes (buscador fijo).
  - `--shadow-sheet: 0 -8px 32px -8px rgb(20 22 31 / .20)` para el sheet inferior.
  - En oscuro, las sombras casi no se ven, así que se sustituyen por un borde `--border` y un `ring-1 ring-white/5`.

### 3.7 Iconografía

`lucide-react` ya es dependencia (`^1.57.0`). Trazo de 1,75 y tamaño de 20 px (24 px en la navegación inferior). Iconos: `Warehouse` (almacén), `Map` (plano), `Search`, `PackageOpen` (material), `HandCoins` o `ArrowUpFromLine` (coger), `ArrowDownToLine` (devolver), `Camera`, `Users`, `Link2` (invitar), `Copy`, `RefreshCw`, `PencilRuler` (editar plano), `Sparkles` (IA), `Undo2`, `Eraser`, `Trash2`, `ChevronLeft`, `ChevronsUpDown` (cambiar de grupo), `LogOut`, `CircleCheck`, `Clock` y `TriangleAlert`. Los iconos decorativos llevan `aria-hidden`. Los botones con solo icono llevan `aria-label` y, además, un tooltip.

**Logo:** marca tipográfica "zulo" en Geist 700 con un punto `--signal` (como la cabeza de un alfiler en un plano). Sin archivos nuevos: se hace con un `<span>`.

### 3.8 Movimiento

- **Duraciones:** `--dur-fast: 120ms` (hover, pulsado), `--dur: 200ms` (chips, foco de zona) y `--dur-slow: 320ms` (sheet, toasts). **Curva:** `cubic-bezier(.2,.8,.2,1)`.
- **Momentos:**
  1. Las zonas encontradas en una búsqueda hacen un "pulso" (dos anillos que se expanden una vez, 600 ms) y las demás bajan al 35 % de opacidad.
  2. Al tocar una zona, el plano hace un zoom suave hacia ella (`transform: scale` en el contenedor, solo en móvil) y se abre el sheet.
  3. **Estado IA:** una línea de escaneo recorre el boceto de arriba abajo y las zonas detectadas aparecen una a una con un fade de 40 ms de desfase.
  4. Skeleton con un brillo suave.
- **`prefers-reduced-motion: reduce`:** regla global en `globals.css` que pone animaciones y transiciones a `0.01ms`. El pulso se cambia por un anillo estático y la línea de escaneo por un spinner sin movimiento ("Detectando… 3 s"). `tw-animate-css` ya está importado; sus clases (`animate-in`, `fade-in`, `slide-in-from-bottom`) se usan para sheets y toasts.

---

## 4. Estructura y navegación

### 4.1 Estructura de la app

- **Cabecera (todas las pantallas con sesión), 56 px:** logo · **selector de grupo** (nombre del grupo + `ChevronsUpDown`, que abre un menú con la lista de grupos y "Crear grupo") · avatar con iniciales (menú: nombre, "Cambiar nombre" → `/welcome`, "Salir"). Fondo `background/80` con `backdrop-blur` y borde inferior fino. Fija arriba.
- **Barra inferior (solo móvil y solo dentro de `/g/[groupId]/…`), 64 px más `safe-area-inset-bottom`:**

  | Pestaña | Icono | Destino |
  |---|---|---|
  | Almacenes | `Warehouse` | `/g/[id]` (o el último almacén visitado) |
  | Buscar | `Search` | Abre el buscador del almacén actual (o, si hay varios, un buscador del grupo; ver §8) |
  | Préstamos | `HandCoins` | "Mis préstamos" (`/g/[id]/prestamos`, ver §8) |
  | Grupo | `Users` | Miembros e invitación (`/g/[id]/grupo`) |

  La pestaña activa lleva un indicador `--signal` de 3 px arriba, icono y texto en `--foreground` y `aria-current="page"`. Las inactivas usan `--muted-foreground`. Cada pestaña mide al menos 64×56 px.
- **Escritorio (≥ md):** no hay barra inferior. Las pestañas pasan a la cabecera como enlaces de texto con icono, y el contenido se centra.
- **Implementación:** `app/g/[groupId]/layout.tsx` monta `<BottomNav />`, un client component que usa `useParams()` y `usePathname()`. Por `cacheComponents`, todo lo que lea sesión o params va dentro de `<Suspense>`. La barra no lee la sesión, solo la ruta.

### 4.2 Cambio de grupo y de almacén

- **Grupo:** desde el selector de la cabecera (Base UI `Menu`). La consulta de grupos se hace en `Header` (ya es server component y ya lee el usuario). Si el usuario tiene un solo grupo, se muestra el nombre sin el chevron.
- **Almacén:** en la pantalla del almacén, el título es un botón con chevron que abre un menú con los almacenes del grupo. En la página del grupo, los almacenes son tarjetas.

### 4.3 Estados vacíos

Componente `EmptyState`: icono lucide de 40 px dentro de un círculo `--muted`, título `h2`, una línea de ayuda y un CTA.

| Lugar | Texto | CTA |
|---|---|---|
| Sin grupos | "Aún no estás en ningún grupo" / "Crea el de tu club o pide el link a tu monitor." | "Crear grupo" |
| Grupo sin almacenes | "Todavía no hay almacenes" | Admin: "Crear almacén" · Miembro: "Pide a un admin que lo cree" |
| Almacén sin plano | Mini-ilustración SVG de plano vacío (muros rayados de `FloorPlan` con `DEFAULT_LAYOUT`) + "Este almacén aún no tiene plano" | Admin: "Dibujar el plano" |
| Zona sin material | "No hay material en esta zona" | Admin: "Añadir material" |
| Búsqueda sin resultados | "No hay nada llamado «x»" / "Prueba con otra palabra o toca una zona." | — |
| Sin préstamos | "No tienes nada prestado" | — |

### 4.4 Carga (skeletons)

Cada `<Suspense fallback>` que hoy dice "Cargando…" pasa a un skeleton con la forma de la pantalla (`components/ui/skeleton.tsx`, sin dependencias):
- **Lista de grupos o almacenes:** 3 tarjetas de 72 px.
- **Almacén:** barra de búsqueda + rectángulo con la proporción del plano + 4 rectángulos de zona en `--muted`.
- **Página del grupo:** título + 2 tarjetas + 3 filas de miembro.

Los botones en espera muestran un spinner (`Loader2` con `animate-spin`, estático con *reduced-motion*) y el texto de acción ("Guardando…"). No cambian de ancho.

### 4.5 Toasts

`components/ui/toaster.tsx` hecho a mano sobre **Base UI `Toast`** (`@base-ui/react/toast`, ya instalado). **No se usa** el `sonner` de shadcn, que necesitaría `npm install sonner` (§7). Aparecen abajo en el centro en móvil (encima de la barra inferior) y abajo a la derecha en escritorio. Duran 4 s y llevan `role="status"` (y `role="alert"` en los de error). Se usan para: "Link copiado", "Plano guardado", "Material añadido", "Préstamo registrado", "Devuelto", "Ahora es admin".

### 4.6 Errores

- **Errores de formulario:** debajo del campo, con `--destructive`, icono `CircleAlert`, `role="alert"` y `aria-describedby` en el input. Se acabó `text-red-700` fijo.
- **Avisos de la IA** ("La IA ha tardado demasiado…"): banner informativo `--warning` con un CTA ("Dibujar zonas a mano"), **no rojo**, porque el usuario puede seguir. "Detección cancelada" pasa a ser un toast neutro.
- **Confirmaciones destructivas:** `AlertDialog` (Base UI) en lugar de `confirm()`. Título, consecuencia ("No se puede deshacer"), "Cancelar" (con el foco por defecto) y botón destructivo con el verbo concreto ("Eliminar almacén").
- **Página de error y 404:** `app/not-found.tsx` y `app/error.tsx` (coordinar con T15) con `EmptyState`, icono `MapPinOff` y los botones "Volver a mis grupos" y "Reintentar".

---

## 5. Pantallas

Los wireframes están hechos a unos 360 px (unos 40 caracteres). `▓` indica un botón primario y `░` un relleno de zona.

### 5.1 Login / crear cuenta (`/login`)

```
┌──────────────────────────────────────┐
│                                      │
│   [mini plano SVG decorativo:        │
│    muros rayados + 3 zonas color]    │
│                                      │
│   zulo•                              │
│   El almacén de tu club,             │
│   en un plano.                       │
│                                      │
│  ┌ Entrar ─────┬─ Crear cuenta ┐     │  ← Tabs (Base UI)
│  └═════════════┴───────────────┘     │
│  Email                               │
│  ┌──────────────────────────────┐    │
│  │ tu@email.com                 │    │  44px
│  └──────────────────────────────┘    │
│  Contraseña                          │
│  ┌──────────────────────────┬───┐    │
│  │ ••••••••                 │ 👁│    │  ← mostrar/ocultar (aria-label)
│  └──────────────────────────┴───┘    │
│  Mínimo 8 caracteres.                │
│  ⚠ Email o contraseña incorrectos    │
│  ▓▓▓▓▓▓▓▓▓▓▓ Entrar ▓▓▓▓▓▓▓▓▓▓▓▓▓    │  48px
│                                      │
└──────────────────────────────────────┘
```
- El cambio Entrar/Crear cuenta pasa a ser `Tabs` en lugar del enlace subrayado. Se mantiene el `key={mode}` que reinicia el formulario.
- El mini plano decorativo es `FloorPlan` con un layout fijo y tres zonas estáticas (`aria-hidden`). Así el primer vistazo ya es la pieza principal de la app.
- **Escritorio:** dos columnas. A la izquierda el plano grande en modo blueprint con el lema; a la derecha el formulario (`max-w-sm`).

### 5.2 Bienvenida (`/welcome`)

```
┌──────────────────────────────────────┐
│  zulo•                               │
│                                      │
│  OVERLINE: PRIMER PASO               │
│  ¡Hola! ¿Cómo te llamas?             │
│  Lo verán los demás miembros         │
│  de tus grupos.                      │
│                                      │
│  Tu nombre                           │
│  ┌──────────────────────────────┐    │
│  │ Mowgli                       │    │
│  └──────────────────────────────┘    │
│  ▓▓▓▓▓▓▓▓▓▓ Continuar → ▓▓▓▓▓▓▓▓▓    │
└──────────────────────────────────────┘
```
- La etiqueta visible es "Tu nombre" y la pregunta va en el título. Se mantienen `autoComplete="name"` y el texto de ayuda enlazado con `aria-describedby`.

### 5.3 Unirse (`/join/[code]`)

```
┌──────────────────────────────────────┐
│  zulo•                               │
│        ┌────┐                        │
│        │ 👥 │                        │
│        └────┘                        │
│  Te han invitado a                   │
│  Scouts Seeonee                      │  ← nombre del grupo (ver §8)
│  Podrás ver el almacén y coger       │
│  material.                           │
│  ▓▓▓▓▓▓▓▓▓ Unirme al grupo ▓▓▓▓▓▓▓    │
└──────────────────────────────────────┘
```
- En el estado de error: `EmptyState` con `LinkBreak`/`Unlink`, el texto actual y el CTA "Ir a mis grupos".

### 5.4 Mis grupos (`/`)

```
┌──────────────────────────────────────┐
│ zulo•                       (SS)     │  header
├──────────────────────────────────────┤
│ Mis grupos                           │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [SS]  Scouts Seeonee          ›  │ │  tarjeta 72px
│ │       ADMIN · 2 almacenes        │ │  overline mono
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ [CB]  Club Baloncesto         ›  │ │
│ │       MIEMBRO · 1 almacén        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── o ─────────────────────────────── │
│ Crear un grupo nuevo                 │
│ ┌────────────────────────┐┌───────┐  │
│ │ Scouts Seeonee         ││ Crear │  │
│ └────────────────────────┘└───────┘  │
└──────────────────────────────────────┘
```
- Avatar del grupo: dos iniciales sobre un color de la paleta de zonas elegido por hash del id (decorativo).
- El número de almacenes es opcional (una consulta más; ver §8). Si no se añade, solo se muestra el rol.
- Si el usuario tiene **un solo grupo**, se le lleva directamente a él (redirección opcional, en §8).
- **Escritorio:** cuadrícula de 2 columnas de tarjetas y "Crear grupo" como tarjeta discontinua (`border-dashed`) con `+`.

### 5.5 Grupo (`/g/[groupId]`)

```
┌──────────────────────────────────────┐
│ zulo•  Scouts Seeonee ⇅      (SS)    │
├──────────────────────────────────────┤
│ ALMACENES                    + Nuevo │  overline + botón ghost (admin)
│ ┌──────────────────────────────────┐ │
│ │ ┌──────┐ Zulo del local       ⋯  │ │  ⋯ = menú (admin): Editar plano,
│ │ │mini  │ 12 zonas · 3 prestados  │ │      Renombrar, Eliminar
│ │ │plano │                         │ │
│ │ └──────┘                         │ │  miniatura = PlanView estático
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ┌──────┐ Trastero parroquia   ⋯  │ │
│ │ └──────┘ Sin plano               │ │
│ └──────────────────────────────────┘ │
│                                      │
│ MIS PRÉSTAMOS                Ver todo│
│ ┌──────────────────────────────────┐ │
│ │ Cuerda 10 m ×2   ⏱ Vence 21 oct  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ MIEMBROS (8)                         │
│ ┌──────────────────────────────────┐ │
│ │ (AK) Akela            ADMIN      │ │
│ │ (BG) Baguira          MIEMBRO  ⋯ │ │ ⋯ → "Hacer admin"
│ └──────────────────────────────────┘ │
│ ┌ 🔗 Invitar ──────────────────────┐ │  tarjeta (admin)
│ │ zulo.app/join/••••3f9a           │ │  link truncado
│ │ [⧉ Copiar link] [↻ Nuevo link]   │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  ▣ Almacenes  ⌕ Buscar  ⇅ Préstamos  👥 Grupo │  bottom nav
└──────────────────────────────────────┘
```
- "Eliminar" sale de la fila y pasa al menú `⋯`. Al pulsarlo se abre un `AlertDialog`.
- "Nuevo almacén" abre un `Dialog` pequeño con el campo "Nombre del almacén", en lugar de un formulario siempre visible.
- Copiar el link da un toast "Link copiado". "Nuevo link" pide confirmación con `AlertDialog`. Botón adicional "Compartir" (`navigator.share`, solo si existe), que en el móvil abre WhatsApp directamente.
- **Escritorio:** dos columnas. A la izquierda los almacenes (tarjetas con miniatura grande); a la derecha "Mis préstamos", miembros e invitación.

### 5.6 Almacén: plano, búsqueda y sheet de zona (`/g/[groupId]/w/[whId]`)

Es la pantalla principal.

```
┌──────────────────────────────────────┐
│ ‹  Zulo del local ⇅      ✎ Editar    │  sub-header (admin ve Editar)
│ ┌──────────────────────────────────┐ │
│ │ ⌕ Buscar material…           ✕  │ │  sticky, shadow-md
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │  muro rayado
│ │▒┌─────────┐  ┆      ┆ ┌────────┐▒│ │
│ │▒│[TIENDAS]│  ┆  P   ┆ │[MENAJE]│▒│ │  chip sólido
│ │▒│░░░░░░░⏱│  ┆  A   ┆ │░░░░░░░░│▒│ │  ⏱ = marca "prestado"
│ │▒└─────────┘  ┆  S   ┆ └────────┘▒│ │
│ │▒┌─────────┐  ┆  I   ┆ ┌────────┐▒│ │
│ │ ╲│[FUEGOS] │  ┆  L   ┆ │[CUERDAS│▒│ │  puerta con arco
│ │  │░░░░░░░░░│  ┆  L   ┆ │░░░░░⚠ │▒│ │  ⚠ = vencido + borde punteado
│ │▒└─────────┘  ┆  O   ┆ └────────┘▒│ │
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │
│ └──────────────────────────────────┘ │
│ LEYENDA: ⏱ prestado  ⚠ vencido       │  overline
│ Toca una zona para ver su material.  │
├──────────────────────────────────────┤
│  bottom nav                          │
└──────────────────────────────────────┘
```

**Buscando** ("lin"):

```
│ ┌──────────────────────────────────┐ │
│ │ ⌕ lin                         ✕  │ │
│ └──────────────────────────────────┘ │
│ 2 resultados                         │  aria-live
│ ┌──────────────────────────────────┐ │
│ │ ● Linternas    FUEGOS   2/5 ⏱  › │ │  ● = color de la zona
│ │ ● Lindes       CUERDAS  1/1 ✓  › │ │
│ └──────────────────────────────────┘ │
│ [plano: FUEGOS y CUERDAS con pulso,  │
│  el resto al 35 %]                   │
```
- Al tocar un resultado se selecciona la zona y se abre el sheet con ese material resaltado.

**Sheet de zona** (`Sheet side="bottom"` de shadcn base-nova sobre Base UI Dialog; altura inicial ≈ 60 % de la pantalla):

```
┌──────────────────────────────────────┐
│ [plano visible arriba, zona elegida  │
│  con relleno 28 % y borde 3 px]      │
├══════════════ ─── ═══════════════════┤  asa del sheet
│ ● TIENDAS                       ✕    │  chip del color + título h2
│ 6 materiales · 1 prestado            │
│ ┌──────────────────────────────────┐ │
│ │ [foto] Tienda canadiense 4p   ›  │ │  64px
│ │        ✓ 3 de 3 disponibles      │ │
│ ├──────────────────────────────────┤ │
│ │ [foto] Toldo 3×3              ›  │ │
│ │        ⏱ 0 de 1 · Vencido ⚠      │ │
│ └──────────────────────────────────┘ │
│ [＋ Añadir material]   (admin)       │  abre Dialog con el formulario
└──────────────────────────────────────┘
```
- El sheet es **modal en móvil** (con foco atrapado; `Esc` o arrastrar hacia abajo lo cierra y el foco vuelve a la zona) y **panel lateral fijo en escritorio**.
- El formulario "Añadir material" sale de la lista y pasa a un `Dialog`: Nombre, Cantidad (con stepper −/+ de 44 px) y Notas. Cada campo tiene su `<label>`.
- **Escritorio (≥ lg):** a la izquierda el plano, en unas 2/3 partes y tan alto como permita la pantalla; a la derecha un panel de 380 px con el buscador fijo arriba, los resultados o la zona elegida debajo y, si no hay nada elegido, la lista de zonas con su número de materiales.
- **Técnico:** `PlanView` dibuja `FloorPlan` cuando `plan_source = 'sketch'` y `layout` existe, igual que ya hace `ZoneEditor`. Así los dos usan la misma capa de zonas (`components/ZoneOverlay.tsx`).

### 5.7 Editor del plano (`/g/[groupId]/w/[whId]/edit`)

Indicador de pasos arriba (`ol` con `aria-current="step"`): **1 Dibujar → 2 IA → 3 Retocar → 4 Guardar**.

**Paso 1, dibujar:**

```
┌──────────────────────────────────────┐
│ ✕  Plano de Zulo del local           │  ✕ = salir (confirma si hay cambios)
│ ●━━━━○────○────○                     │  stepper
│ DIBUJAR                              │
│ Dibuja el almacén visto desde arriba:│
│ paredes, estanterías, armarios…      │
│ ┌──────────────────────────────────┐ │
│ │ · · · · · · · · · · · · · · · · ·│ │  lienzo con puntos guía
│ │ ·  ┌──────┐     ┌──────┐       · │ │  (solo en pantalla; el PNG
│ │ ·  │      │     │      │       · │ │   exportado sale limpio)
│ │ ·  └──────┘     └──────┘       · │ │
│ │ · · · · · · · · · · · · · · · · ·│ │
│ └──────────────────────────────────┘ │
│ [↶ Deshacer] [⌫ Borrar todo]         │  toolbar: icono + texto, 44px
│                                      │
│ ¿Ya tienes un boceto o una foto?     │
│ [📷 Subir imagen]                    │  abre Dialog: ¿foto o boceto?
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓ ✨ Listo, detectar zonas ▓▓▓▓▓ │  barra de acción fija abajo
└──────────────────────────────────────┘
```

**Paso 2, la IA detectando** (`role="status"`, `aria-live="polite"`):

```
┌──────────────────────────────────────┐
│ ○────●━━━━○────○                     │
│ ┌──────────────────────────────────┐ │
│ │  [boceto al 40 % de opacidad]    │ │
│ │══════════════════════════════════│ │  ← línea de escaneo cobalto
│ │                                  │ │    (estática con reduced-motion)
│ └──────────────────────────────────┘ │
│ ✨ Detectando zonas…                 │
│ Suele tardar menos de 10 segundos.   │
│ [Cancelar]                           │
└──────────────────────────────────────┘
```
- Si falla, banner `--warning` con el mensaje de `AI_MESSAGES` y los botones "Dibujar zonas a mano" y "Reintentar".

**Paso 3, retocar:**

```
┌──────────────────────────────────────┐
│ ○────○────●━━━━○                     │
│ RETOCAR · 5 zonas detectadas         │
│ ┌──────────────────────────────────┐ │
│ │ FloorPlan + zonas                │ │
│ │ ┌[ZONA 1]──┐  ┆PASILLO┆           │ │
│ │ │░░░░░░░░░░◢ │                    │ │  ◢ asa visible 24px (área 44)
│ │ └──────────┘                     │ │  zona elegida: borde 3px + sombra
│ └──────────────────────────────────┘ │
│ [＋ Zona]  [↻ Redibujar]  [✨ Volver a detectar] │  ghost/outline
│ ┌ Zona seleccionada ───────────────┐ │  panel (sheet no modal en móvil)
│ │ Nombre de la zona                │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │ Tiendas                      │ │ │
│ │ └──────────────────────────────┘ │ │
│ │ Color                            │ │
│ │ (●)(●)(●)(●)(●)(●)(●)(●)         │ │  44px, ✓ en la elegida, nombre
│ │ [🗑 Eliminar zona]               │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓ Guardar plano ▓▓▓▓▓▓▓▓▓▓▓▓ │  fija; paso 4 = toast + redirect
└──────────────────────────────────────┘
```
- Las asas de cambio de tamaño de `react-rnd` (`resizeHandleComponent`) se ven como un triángulo en la esquina inferior derecha y un punto en cada lado, con un área táctil de 44 px.
- **Alternativa accesible al arrastre** (en el panel, plegada bajo "Posición y tamaño"): flechas para mover y ± para el tamaño en pasos del 2 %. Hace falta para WCAG 2.1.1 (teclado).
- **Escritorio:** a la izquierda el lienzo o el plano; a la derecha un panel fijo de 320 px con los pasos, la zona elegida y el botón Guardar.

### 5.8 Ficha del material + coger y devolver con foto (`/item/[itemId]`, T11-T12)

```
┌──────────────────────────────────────┐
│ ‹  TIENDAS                           │  back a la zona (abre su sheet)
│ ┌──────────────────────────────────┐ │
│ │        [foto del material]       │ │  aspect 4:3, o placeholder
│ └──────────────────────────────────┘ │  con icono PackageOpen
│ Tienda canadiense 4p                 │  h1
│ ● Tiendas · Zulo del local           │
│ ┌────────────┐┌────────────────────┐ │
│ │ ✓ 2 de 3   ││ ⏱ 1 prestada       │ │  stat tiles
│ │ DISPONIBLES││   vence 21 oct     │ │
│ └────────────┘└────────────────────┘ │
│ Notas: falta una piqueta.            │
│                                      │
│ PRÉSTAMOS ACTIVOS                    │
│ (AK) Akela ×1 · Campamento · 21 oct ⏱│
│      [Devolver]   (si es suyo o admin)│
│                                      │
│ HISTORIAL                    Ver más │
│ (BG) Baguira ×2 · devuelto ✓ ok      │
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓ ↑ Coger material ▓▓▓▓▓▓▓▓▓ │  fija; disabled si 0 disponibles
└──────────────────────────────────────┘     ("No quedan unidades libres")
```

**Coger** (`Sheet` inferior a pantalla casi completa, con un formulario de 3 pasos en una sola vista):

```
┌──────────────────────────────────────┐
│ Coger: Tienda canadiense 4p     ✕    │
│ 1 · FOTO DEL MATERIAL                │
│ ┌──────────────────────────────────┐ │
│ │           📷                     │ │  zona grande 4:3 = <label> del
│ │   Hacer foto al material         │ │  input file (capture=environment)
│ │   (no a personas)                │ │
│ └──────────────────────────────────┘ │
│ 2 · DETALLES                         │
│ Cantidad        [ − ] 1 [ + ]        │  máx = disponibles
│ Para qué                             │
│ ┌──────────────────────────────────┐ │
│ │ Campamento de verano             │ │
│ └──────────────────────────────────┘ │
│ Devolver antes del                   │
│ ┌──────────────────────────────────┐ │
│ │ 26/10/2026                    📅 │ │  input date nativo
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓ Confirmar préstamo ▓▓▓▓▓▓▓▓ │  disabled hasta tener foto
└──────────────────────────────────────┘
```
- Una vez subida, la foto sustituye a la zona de cámara (miniatura, `✓ Foto subida` y "Repetir").
- **Devolver:** el mismo patrón. Foto obligatoria, luego "Estado" como `RadioGroup` de tarjetas con icono (✓ Bien / ⚠ Con daños / ◐ Incompleto) y "Notas". Debajo, una comparación **Antes | Después** (dos fotos lado a lado, con el texto "Antes · 14 oct" y "Después · hoy").
- **Escritorio:** foto y datos en dos columnas; coger y devolver en un `Dialog` centrado de 480 px.

### 5.9 Mis préstamos

```
┌──────────────────────────────────────┐
│ Mis préstamos                        │
│ ┌ Activos (2) ─┬─ Devueltos ┐        │  Tabs
│ ┌──────────────────────────────────┐ │
│ │ ⚠ VENCIDO                        │ │  chip sólido + icono + texto
│ │ [foto] Cuerda 10 m ×2            │ │
│ │ ● Cuerdas · venció el 17 oct     │ │
│ │ [↓ Devolver]                     │ │
│ ├──────────────────────────────────┤ │
│ │ ⏱ PRESTADO                       │ │
│ │ [foto] Linterna ×1               │ │
│ │ ● Fuegos · vence el 26 oct       │ │
│ │ [↓ Devolver]                     │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  bottom nav (Préstamos activo)       │
└──────────────────────────────────────┘
```
- Se ordena por vencidos primero y después por fecha. "Devolver" lleva a `/item/[id]` con el sheet de devolver abierto (`?devolver=<loanId>`).
- Si "Mis préstamos" sigue siendo una sección del grupo (como en T12), se usa la misma tarjeta, limitada a 3, con "Ver todo".

---

## 6. Accesibilidad (WCAG 2.1 AA y European Accessibility Act)

| Criterio | Cómo se cumple |
|---|---|
| 1.3.1 / 3.3.2 Etiquetas | **Todo input con `<label>` visible** (regla del proyecto), incluido el buscador (hoy es `sr-only`; puede seguir así porque tiene icono y placeholder, pero mejor con una etiqueta visible "Buscar material" en escritorio). Los radios del tipo de subida y del estado de devolución van dentro de `fieldset` + `legend`. Ayudas y errores con `aria-describedby`. |
| 1.4.1 Uso del color | Los estados siempre llevan **icono + texto**. Las zonas, chip con su nombre. Los resultados, nombre de zona en texto además del punto de color. Los vencidos en el plano, icono ⚠ + borde punteado. |
| 1.4.3 Contraste de texto | Todo texto ≥ 4,5:1. Valores en §3.1-3.3 (el menor es Lima con blanco, 4,99:1). `--signal` nunca va como texto sobre papel (2,62:1); se usa `--signal-ink` (4,79:1). |
| 1.4.11 Contraste no textual | Bordes de input ≥ 3:1 (3,24 / 3,69). Bordes de zona ≥ 3:1 contra el suelo (el menor es Mostaza, 4,55 con borde `#A16207`). Anillo de foco ≥ 3:1 (7,1). `--border` es solo decorativo. |
| 2.4.7 Foco visible | Anillo de 3 px `--ring` con `ring-offset-2` (offset del color del fondo) en botones, enlaces, zonas, pestañas y muestras de color. Se elimina el `focus-visible:outline-black` fijo de `PlanView`. |
| 2.5.5 / objetivo táctil | **≥ 44×44 px**: `Button` default `h-11` en móvil (`md:h-10`), `sm` a `h-9` con un área táctil ampliada con `after:absolute after:-inset-1`, inputs `h-11`, muestras de color de 44 px, asas de `react-rnd` con área de 44 px y pestañas inferiores de 64×56. Las zonas muy pequeñas del plano (< 44 px) se pueden abrir también desde la lista de zonas o el buscador. |
| 2.1.1 Teclado | Zonas como `<button>` (ya lo son). Editor con alternativa a arrastrar (§5.7). Sheet y diálogos con foco atrapado y `Esc`; el foco vuelve a quien los abrió (lo hace Base UI). |
| 4.1.3 Mensajes de estado | Toasts con `role="status"`, conteo de resultados del buscador con `aria-live="polite"`, estado de la IA con `role="status"` y "Link copiado" anunciado. |
| 2.3.3 / movimiento | `prefers-reduced-motion` desactiva el pulso, el escaneo, el zoom del plano y las transiciones del sheet. |
| 3.1.1 Idioma | `<html lang="es">` (ya está). |
| Otros | Títulos de página por ruta (`metadata` o `generateMetadata`: "Zulo del local · Zulo"). Enlace "Saltar al contenido". El `SketchPad` tiene `role="img"`, pero hay que añadir una alternativa: "¿No puedes dibujar? Sube una imagen o crea las zonas a mano". |

**Comprobación:** Lighthouse/axe en cada pantalla, VoiceOver en el iPhone de Santi y navegación solo con teclado en el editor.

---

## 7. Plan de implementación

Reglas: **un commit por tarea**, `npm test && npm run build` antes de cada commit y tests cuando haya lógica (`lib/`). **Nada de `npm install <paquete>`.**

**Cómo añadir componentes de shadcn sin romper el lockfile:** `npx shadcn@<versión local> add <c>` usa el paquete `shadcn` ya instalado. Para `base-nova`, los componentes que se listan abajo solo dependen de `@base-ui/react`, `cn`, `class-variance-authority` y `lucide-react`, que **ya están**. Aun así, el CLI puede lanzar `npm install`. Después de cada `add`: `git diff --stat package.json package-lock.json`. Si ha cambiado algo, `git checkout package.json package-lock.json && npm ci`. Alternativa más segura: copiar el fuente del componente (estilo base-nova) a mano en `components/ui/`.

| # | Tarea | Archivos | Notas |
|---|---|---|---|
| 1 | **Tokens y tema:** paleta clara y oscura, tokens propios (`--signal`, `--plan-*`, estados), arreglo de `--font-sans` y `--font-mono`, radios, sombras, duraciones, regla global de `prefers-reduced-motion` y dark mode por `prefers-color-scheme` | `app/globals.css`, `app/layout.tsx` | Comprobar que Geist se aplica. Sin dependencias. |
| 2 | **Colores de zona:** `zoneSwatch(stored)` → `{ name, fill, border, chipBg, chipText, dark… }` y test (incluye un test que calcula el contraste ≥ 4,5:1 de cada chip y ≥ 3:1 de cada borde) | `lib/zoneColors.ts`, `lib/zoneColors.test.ts` | No toca `PALETTE` ni los datos. TDD. |
| 3 | **Primitivas táctiles:** tamaños de `Button` (default `h-11 md:h-10`, área táctil en `sm`/`icon`), `Input` `h-11`, `text-base`, foco con offset y `Badge` con variantes `success`/`warning`/`danger` | `components/ui/button.tsx`, `input.tsx`, `badge.tsx`, `textarea.tsx` | Sin dependencias. |
| 4 | **Componentes nuevos de shadcn:** `skeleton`, `separator`, `avatar`, `sheet`, `dialog`, `alert-dialog`, `dropdown-menu`, `tabs`, `tooltip`, `radio-group` | `components/ui/*.tsx` (nuevos) | Todos sobre Base UI, sin dependencias nuevas. Revisar el lockfile después. **No añadir `drawer`** (shadcn usa `vaul`) **ni `sonner`** (dependencia `sonner`): ver la tarea 5. |
| 5 | **Toaster** sobre `@base-ui/react/toast` y hook `useToast` | `components/ui/toaster.tsx`, `app/layout.tsx` | Sustituye a `sonner`, que necesitaría `npm install`. |
| 6 | **Estructura:** cabecera con logo, selector de grupo y menú de avatar; `BottomNav`; layout del grupo | `components/Header.tsx`, `components/Logo.tsx`, `components/GroupSwitcher.tsx`, `components/BottomNav.tsx`, `app/g/[groupId]/layout.tsx` | Patrón `<Suspense>` por `cacheComponents`. |
| 7 | **Estados compartidos:** `EmptyState`, skeletons por pantalla, `FormError`; sustituir los "Cargando…" | `components/EmptyState.tsx`, `components/skeletons.tsx`, `app/page.tsx`, `app/g/[groupId]/page.tsx`, `…/w/[whId]/page.tsx`, `…/edit/page.tsx` | |
| 8 | **Login, bienvenida y unirse:** tabs, mostrar contraseña, mini plano decorativo y nombre del grupo en `/join` | `app/login/page.tsx`, `LoginForm.tsx`, `app/welcome/page.tsx`, `app/join/[code]/page.tsx` | El nombre del grupo en `/join` necesita leer el grupo antes de ser miembro: lo impide RLS → §8. Sin él, se deja el texto genérico. |
| 9 | **Mis grupos:** tarjetas con avatar y rol, estado vacío y crear grupo | `app/page.tsx` | |
| 10 | **Página del grupo:** tarjetas de almacén con menú `⋯`, `Dialog` para nuevo almacén, `AlertDialog` en eliminar y regenerar, invitación con copiar, compartir y toast | `app/g/[groupId]/page.tsx`, `DeleteWarehouseButton.tsx`, `InviteLink.tsx` | Se quitan los `confirm()`. |
| 11 | **FloorPlan con tema:** colores por variables CSS (`--plan-*`), textos en Geist Mono y blueprint en oscuro | `components/FloorPlan.tsx` | Comprobar `lib/floorPlanGeometry.test.ts` (no debería cambiar). |
| 12 | **Capa de zonas compartida:** `ZoneOverlay` (chip, relleno, marcas de estado, pulso de búsqueda) usada por `PlanView` y `ZoneEditor`; `PlanView` pinta `FloorPlan` en planos `sketch` | `components/ZoneOverlay.tsx`, `components/PlanView.tsx`, `components/ZoneEditor.tsx`, `…/w/[whId]/page.tsx` (seleccionar `plan_source, layout`) | |
| 13 | **Pantalla del almacén:** buscador fijo, lista de resultados, sheet de zona (panel lateral en `lg`), `ItemList` con miniaturas y "Añadir material" en `Dialog`, cambio de almacén | `components/PlanView.tsx`, `components/ItemList.tsx`, `…/w/[whId]/page.tsx` | |
| 14 | **Editor del plano:** stepper, barra de acción fija, toolbar del `SketchPad` con iconos y puntos guía, estado IA con escaneo, banner de aviso, asas visibles, muestras con nombre, alternativa de teclado y diálogo "¿foto o boceto?" | `…/edit/PlanEditorClient.tsx`, `components/SketchPad.tsx`, `components/ZoneEditor.tsx`, `components/PhotoCapture.tsx` | Los puntos guía se dibujan solo en una capa CSS, **no** en el canvas, para que el PNG que recibe la IA no cambie. |
| 15 | **Ficha del material, coger y devolver:** aplicar §5.8 (si T11-T12 ya están hechas, restyle; si no, construirlas así). `PhotoCapture` como zona de cámara grande | `app/item/[itemId]/*`, `components/PhotoCapture.tsx` | |
| 16 | **Mis préstamos:** tarjetas con estado y tabs Activos/Devueltos | `app/g/[groupId]/page.tsx` (sección) o `app/g/[groupId]/prestamos/page.tsx` (según §8) | |
| 17 | **Repaso de accesibilidad y pulido:** axe/Lighthouse, teclado, VoiceOver, `prefers-reduced-motion`, títulos por ruta, `not-found` y `error` | `app/not-found.tsx`, `app/error.tsx`, metadata de páginas | Coordinar con T15. |

**Dependencias nuevas: ninguna.** Las que se descartan y su alternativa:
- `sonner` (toast de shadcn) → Base UI `Toast` (tarea 5).
- `vaul` (drawer de shadcn) → `Sheet side="bottom"` sobre Base UI Dialog (tarea 4). Si hace falta arrastrar para cerrar, está `@base-ui/react/drawer`, que ya está instalado.
- `next-themes` → dark mode por `prefers-color-scheme` en CSS (tarea 1).
- Fuentes nuevas → no hacen falta (Geist y Geist Mono ya están). Si se quisiera una fuente de títulos, `next/font/google` no requiere npm.
- Iconos → `lucide-react`, ya instalado.

> Infraestructura: como el despliegue de Zulo va a Vercel con Supabase, puede venir bien una revisión rápida con **IE Cloud Services** antes de publicar (es un consejo, no bloquea nada).

---

## 8. Preguntas abiertas para Santi

1. **¿"Mis préstamos" como pestaña con ruta propia** (`/g/[groupId]/prestamos`) o como sección dentro de la página del grupo, como dice T12? La barra inferior funciona mejor con una ruta propia.
2. **¿Modo oscuro automático (según el sistema) o también un interruptor en el menú del avatar?** Un interruptor necesita guardar la preferencia (cookie o `localStorage`) y un script mínimo en el `<head>` para evitar el parpadeo.
3. **¿Mostrar el nombre del grupo en `/join/[code]`?** Hoy RLS no deja leer el grupo antes de unirse. Haría falta una RPC `group_name_for_invite(code)` (`security definer`, que devuelva solo el nombre). Es un cambio en la base de datos, fuera del alcance visual.
4. **¿El buscador de la barra inferior busca en el almacén actual o en todos los del grupo?** Buscar en todos es más útil cuando un club tiene varios almacenes, pero necesita otra consulta y una vista de resultados del grupo.
5. **¿Prioridad antes del 21?** Propuesta mínima si hay poco tiempo: tareas 1-3, 11-13 (tokens, primitivas, plano y pantalla del almacén). Son las que más se notan en la demo; el resto, después.

## 9. Decisiones de Santi (2026-10-19)

1. Dirección visual: **B, "Plano técnico"**.
2. Alcance: **las 17 tareas** de la sección 7.
3. "Mis préstamos": **pestaña con ruta propia** `/g/[groupId]/prestamos`, enlazada desde la barra inferior.
4. Modo oscuro: **automático según el sistema** (`prefers-color-scheme`), sin interruptor.
5. Por defecto (sin cambio de base de datos): `/join/[code]` mantiene el texto genérico, sin nombre del grupo; el buscador busca solo en el almacén actual.
6. Estado al empezar: T11 y T12 del plan principal ya están hechas (la tarea 15 es un restyle) y `PlanView` ya pinta `FloorPlan` en planos `sketch` (la tarea 12 solo extrae `ZoneOverlay` y aplica el estilo).
