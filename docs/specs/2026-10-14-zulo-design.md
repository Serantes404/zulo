# Zulo: inventario visual de material para clubs (spec de diseño)

- **Fecha:** 2026-10-14
- **Autor:** Santi
- **Estado:** pendiente de revisión
- **Plazo:** 1-2 semanas (MVP)
- **Nombre provisional:** Zulo

---

## 1. Problema y objetivo

Los clubs y grupos (scouts, deportes, teatro…) guardan su material en almacenes divididos en huecos o estanterías. Solo quien lo organizó sabe dónde está cada cosa, y nadie lleva un registro de quién se lleva qué ni en qué estado lo devuelve.

**Objetivo:** una web app mobile-first en la que cada grupo:

1. Sube una foto o boceto de su almacén y la IA genera un **plano interactivo** con una zona por hueco.
2. Asigna a cada zona una **etiqueta** y la **lista de material** que contiene.
3. Registra **préstamos con foto** al coger y al devolver, para ver el estado del material.

**Criterio de éxito:** alguien que nunca ha entrado al almacén encuentra un material en menos de un minuto usando solo la app, y cualquier préstamo activo muestra quién lo tiene y hasta cuándo.

## 2. Usuarios y roles

| Rol | Puede |
|---|---|
| **Admin** (monitores, junta) | Crear el grupo, invitar a otros, crear y editar almacenes, plano, zonas y material, y ver y cerrar cualquier préstamo |
| **Member** | Ver el plano y el material, coger material y devolver sus propios préstamos |

- Quien crea el grupo es admin. Un admin puede ascender a otro miembro a admin.
- Se entra en un grupo mediante el link `/join/<invite_code>`. El admin puede regenerar el código.
- Un usuario puede pertenecer a varios grupos.

## 3. Alcance

### Dentro del MVP

- Login con email y contraseña (Supabase Auth guarda la contraseña como hash bcrypt). Sin confirmación por email ni recuperación de contraseña en esta versión: el SMTP por defecto de Supabase solo permite unos pocos emails por hora.
- Crear grupo, link de invitación, roles admin/member.
- Varios almacenes por grupo.
- **IA:** foto o boceto → zonas propuestas (Qwen-VL vía Ollama).
- Editor de zonas: mover, redimensionar, renombrar, colorear, añadir y borrar.
- Plano interactivo: tocar una zona muestra su lista de material.
- CRUD de material: nombre, cantidad total, notas y foto opcional.
- Préstamo: quién, cuántas unidades, para qué, fecha de devolución y foto obligatoria.
- Devolución: foto obligatoria, estado (`ok` / `damaged` / `incomplete`) y notas, con comparación de fotos antes y después.
- Disponibilidad visible en el plano y la lista ("2 de 3 disponibles").
- Etiqueta "vencido" si el préstamo sigue activo pasada su fecha.
- Buscador de material que resalta la zona en el plano.

### Fuera del MVP

Notificaciones por email o push, historial y estadísticas avanzadas, app nativa, multi-idioma, mover material entre grupos, códigos QR.

## 4. Stack

| Capa | Tecnología |
|---|---|
| Frontend + backend | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Editor de zonas | `react-rnd` sobre la imagen del plano |
| Validación | `zod` |
| Compresión de fotos | `browser-image-compression` |
| BD, auth y archivos | Supabase (Postgres + RLS, Auth, Storage) |
| IA en desarrollo | Ollama local, modelo `qwen2.5vl:7b` |
| IA en producción | Ollama Cloud, modelo Qwen3-VL (el tag exacto se verifica el día 1) |
| Tests | Vitest |
| Código y despliegue | GitHub → Vercel (deploy automático en cada push a `main`) |

## 5. Arquitectura

```
Móvil / navegador ──► Next.js en Vercel ──► Supabase (Auth · Postgres+RLS · Storage)
                                         └─► Ollama (local en dev / Cloud en prod)
```

- Todo el acceso a datos pasa por el cliente de Supabase **con la sesión del usuario**, así que RLS se aplica siempre. No se usa la service role key en la app.
- La llamada a la IA se hace **solo en el servidor** (server action), porque la API key de Ollama nunca llega al navegador.
- Las operaciones que necesitan atomicidad o saltarse RLS de forma controlada son **funciones RPC de Postgres** (sección 6.3).

### Estructura de carpetas

```
app/
  login/                          entrar / crear cuenta con email y contraseña
  welcome/                        pedir el nombre en el primer login
  join/[code]/                    unirse a un grupo
  page.tsx                        mis grupos + crear grupo
  g/[groupId]/                    almacenes del grupo, miembros, invitación
  g/[groupId]/w/[whId]/           plano interactivo + buscador
  g/[groupId]/w/[whId]/edit/      subir foto → IA → editor (solo admin)
  item/[itemId]/                  detalle, coger, devolver, historial de préstamos
components/
  PlanView.tsx      plano de solo lectura con zonas clicables
  ZoneEditor.tsx    plano editable (react-rnd)
  ItemList.tsx      lista de material de una zona
  LoanSheet.tsx     formulario de coger / devolver
  PhotoCapture.tsx  input de cámara + compresión + subida
lib/
  supabase/client.ts, server.ts
  ai/detectZones.ts    llamada a Ollama + validación + normalización
  ai/normalize.ts      conversión de cajas a 0-1 (función pura, testeada)
  availability.ts      helpers de disponibilidad
supabase/migrations/   SQL de tablas, vistas, RPC y políticas
```

## 6. Datos (Supabase)

### 6.1 Tablas

Todas las tablas tienen `id uuid pk default gen_random_uuid()` y `created_at timestamptz default now()`.

**profiles**: `id uuid pk → auth.users`, `full_name text not null`. Se crea con un trigger al registrarse el usuario, con la parte del email antes de la @ como nombre provisional. En el primer login, la página `/welcome` pide el nombre real. Solo se guarda el nombre (el email lo gestiona Auth).

**groups**: `name text not null`, `invite_code text unique not null` (12 caracteres aleatorios), `created_by uuid → profiles`.

**group_members**: `group_id → groups`, `user_id → profiles`, `role text check in ('admin','member')`. PK `(group_id, user_id)`.

**warehouses**: `group_id → groups`, `name text not null`, `plan_image_path text null` (null = plano sobre cuadrícula vacía), `aspect_ratio numeric not null default 1.333`.

**zones**: `warehouse_id → warehouses on delete cascade`, `label text not null`, `color text not null` (uno de una paleta fija de 8 colores), `x, y, w, h numeric not null check between 0 and 1` (proporción respecto a la imagen).

**items**: `zone_id → zones on delete restrict`, `name text not null`, `quantity_total int not null check > 0`, `notes text`, `photo_path text`. Por el `restrict`, no se puede borrar una zona ni un almacén con material dentro: primero hay que mover o borrar el material. Un item con préstamos activos tampoco se puede borrar.

**loans**:

| Campo | Tipo |
|---|---|
| `item_id` | → items |
| `user_id` | → profiles (quién lo tiene) |
| `quantity` | int > 0 |
| `purpose` | text not null (p. ej. "Campamento de verano") |
| `due_date` | date not null |
| `checkout_photo_path` | text not null |
| `checked_out_at` | timestamptz default now() |
| `status` | text check in ('active','returned') default 'active' |
| `return_photo_path` | text null |
| `return_condition` | text check in ('ok','damaged','incomplete') null |
| `return_notes` | text null |
| `returned_at` | timestamptz null |

Restricción: si `status = 'returned'`, entonces `return_photo_path`, `return_condition` y `returned_at` no pueden ser null.

### 6.2 Vista de disponibilidad

`item_availability (item_id, quantity_total, quantity_out, quantity_available)` = total − suma de `quantity` de los préstamos `active`. No se guarda en ninguna columna, así nunca se desincroniza.

### 6.3 Funciones RPC (`security definer`, validan `auth.uid()`)

- `create_group(name)`: crea el grupo, genera `invite_code` e inserta al creador como admin.
- `join_group(code)`: busca el grupo por código e inserta al usuario como member (si ya está, no hace nada). Es necesaria porque un no-miembro no puede leer `groups` por RLS.
- `regenerate_invite(group_id)`: solo para admins.
- `checkout_item(item_id, quantity, purpose, due_date, photo_path)`: bloquea la fila del item (`for update`), comprueba que `quantity ≤ disponible` y crea el préstamo. Si no hay suficientes unidades, lanza el error `NOT_ENOUGH_AVAILABLE`.
- `return_loan(loan_id, photo_path, condition, notes)`: solo el que lo cogió o un admin del grupo. Si el préstamo ya está devuelto, lanza `ALREADY_RETURNED`.

### 6.4 RLS

Funciones auxiliares: `is_member(group_id)` e `is_admin(group_id)`. Para llegar desde zones, items y loans hasta su `group_id` se hacen joins.

| Tabla | select | insert / update / delete |
|---|---|---|
| groups | miembros | solo vía RPC; update del nombre solo admin |
| group_members | miembros del grupo | admin (cambiar roles, expulsar); entrar solo vía RPC |
| warehouses, zones, items | miembros | admin |
| loans | miembros | solo vía RPC |
| profiles | uno mismo y los que comparten grupo contigo | uno mismo |

### 6.5 Storage

- Un solo bucket privado: `photos`.
- Rutas: `{group_id}/plans/{uuid}.jpg`, `{group_id}/items/{uuid}.jpg`, `{group_id}/loans/{uuid}.jpg`.
- Política: lectura y escritura si `is_member` del primer segmento de la ruta. Los planos solo los suben admins.
- Las fotos se muestran con URLs firmadas (1 hora).
- Antes de subir, el cliente comprime a 1600 px de lado máximo, JPEG con calidad 0.8.

## 7. Flujo de la IA (detección de zonas)

1. El admin sube la foto o boceto en `/edit`. Se comprime, se sube a Storage y se guarda `plan_image_path` y `aspect_ratio`.
2. La server action `detectZones(warehouseId)`:
   - descarga la imagen de Storage y la pasa a base64;
   - llama a `POST {OLLAMA_BASE_URL}/api/chat` con el modelo `OLLAMA_MODEL`, la imagen y `format` (JSON schema) para forzar una salida estructurada;
   - **prompt (resumen):** "Esta imagen es un almacén o estantería visto de frente o un boceto en planta. Detecta cada compartimento o hueco separado. Para cada uno devuelve una caja delimitadora y, si se lee un rótulo o se reconoce claramente el contenido, una etiqueta corta en español; si no, deja `label` vacío. Responde solo con JSON.";
   - schema esperado: `{ "zones": [ { "label": string, "box": [x1, y1, x2, y2] } ] }`.
3. `normalize.ts` convierte las cajas a proporción 0-1 según `AI_BOX_FORMAT`:
   - `relative1000` (Qwen3-VL): dividir entre 1000;
   - `pixels` (Qwen2.5-VL): dividir entre el ancho y el alto de la imagen enviada.
   Después: recortar al rango [0,1], descartar cajas con área < 1 %, limitar a 30 zonas y poner "Zona N" a las que no tengan etiqueta.
4. Las zonas propuestas se cargan en el `ZoneEditor` **sin guardar**. El admin las ajusta y pulsa "Guardar plano".
5. Guardar plano: reemplaza las zonas del almacén (inserta las nuevas, actualiza las existentes y borra las eliminadas). Si una zona que se borra tiene material, el guardado falla con un aviso: "Mueve o borra el material de «X» antes de eliminarla".

**Alternativa sin IA:** el botón "Dibujar a mano" abre el editor vacío (sobre la foto o sobre una cuadrícula).

## 8. Flujo de préstamo

**Coger** (`/item/[id]` → "Coger"):

1. Elegir cantidad (máximo = disponible), motivo y fecha de devolución (por defecto, dentro de 7 días).
2. Hacer la foto (obligatoria) con `<input type="file" accept="image/*" capture="environment">`.
3. Subir la foto y llamar a `checkout_item`.

**Devolver** (desde "Mis préstamos" en el grupo o desde el item):

1. Hacer la foto (obligatoria), elegir el estado (`ok` / `damaged` / `incomplete`) y escribir notas si hace falta.
2. Llamar a `return_loan`.
3. La pantalla de resultado muestra las fotos **antes | después** lado a lado.

En el plano, cada zona muestra un indicador si alguno de sus items tiene unidades prestadas o algún préstamo vencido.

## 9. Gestión de errores

| Caso | Comportamiento |
|---|---|
| La IA devuelve JSON inválido o vacío | 1 reintento; si vuelve a fallar → editor vacío + aviso "No he podido detectar zonas, dibújalas tú" |
| La IA tarda | Spinner con botón cancelar; `maxDuration = 60` en la ruta; timeout de 55 s en el fetch → mismo fallback |
| Ollama no responde o la key no es válida | Mensaje "La IA no está disponible ahora" + opción de dibujar a mano; se registra en el log del servidor |
| `NOT_ENOUGH_AVAILABLE` | Mensaje "Solo quedan N disponibles" y se refresca la disponibilidad |
| `ALREADY_RETURNED` | Se refresca la vista |
| Falla la subida de la foto | No se llama a la RPC; botón de reintentar |
| Link de invitación no válido | Página "Este link no es válido o ha caducado" |
| Usuario sin permiso | RLS devuelve vacío → página 404 genérica |

## 10. Privacidad y accesibilidad

- **Minimización:** solo se guarda nombre y email. Las fotos son de material, y la app avisa con un texto bajo la cámara: "Haz la foto al material, no a personas".
- Cada grupo solo ve sus datos (RLS + Storage por carpeta de grupo).
- Las zonas no se distinguen solo por color: siempre muestran su etiqueta. Contraste AA, inputs con label y la app se puede usar con teclado.

## 11. Variables de entorno

| Variable | Dev | Prod (Vercel) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | proyecto Supabase | igual |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | proyecto Supabase | igual |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `https://ollama.com` |
| `OLLAMA_API_KEY` | vacío | key de Ollama Cloud |
| `OLLAMA_MODEL` | `qwen2.5vl:7b` | tag de Qwen3-VL en la nube |
| `AI_BOX_FORMAT` | `pixels` | `relative1000` |

`.env.local` va en `.gitignore`. En GitHub solo se sube `.env.example`.

## 12. Testing

- **Vitest (unitarios):**
  - `normalize.ts`: ambos formatos, recorte, descarte de cajas pequeñas, límite de 30, etiquetas por defecto;
  - parseo y validación con zod de respuestas de la IA buenas y malas.
- **SQL (manual con el editor de Supabase):** dos usuarios en grupos distintos no ven los datos del otro; un member no puede editar zonas; `checkout_item` rechaza cantidades mayores que las disponibles.
- **Checklist manual antes de entregar:** crear grupo → invitar desde otro navegador → subir foto → IA → ajustar → añadir material → coger con foto → ver en el plano → devolver con foto → ver antes y después. Todo en móvil.

## 13. Despliegue

1. Repo en GitHub (`main` protegido; el trabajo se hace en ramas).
2. Proyecto en Supabase. Las migraciones se aplican con la CLI de Supabase (`supabase db push`).
3. Vercel conectado al repo y variables de entorno configuradas.
4. En Supabase Auth, comprobar que *Confirm email* está desactivado (Authentication → Sign In / Providers → Email).

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| La IA detecta mal los bocetos a mano | El editor siempre permite corregir; probar con 5 fotos reales del zulo el día 1-2 y ajustar el prompt |
| El modelo o los límites de Ollama Cloud cambian | Modelo y URL en variables de entorno; verificar el tag y el plan gratuito el día 1 |
| Timeout de Vercel con un modelo grande | Imagen comprimida, `maxDuration`, fallback manual |
| Plazo corto | Orden de construcción (la IA va pronto, como se decidió): datos y auth → subida de foto + IA + editor → material → préstamos → pulido. Si falta tiempo, se recorta el pulido, no el flujo principal |
