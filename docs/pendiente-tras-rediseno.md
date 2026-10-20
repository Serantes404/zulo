# Pendiente tras el rediseño "Plano técnico" (2026-10-20)

Rediseño completo (17 tareas + revisión final, commits ca42be6..HEAD). Lo que queda, por prioridad.

## Antes de desplegar (Vercel)
- Repaso manual en el móvil con modo oscuro (iOS y Android): `docs/a11y-checklist.md`, sobre todo los puntos 1-5, 7, 10 y 13 (foco inicial en "Cancelar", foco que vuelve a la zona al cerrar la hoja, enlace "Saltar al contenido").
- "Mis préstamos" con un usuario que esté en dos grupos: solo deben salir los del grupo actual.
- Editor del plano en el móvil: arrastrar y redimensionar zonas, asas, "Crear las zonas a mano".

## Antes de abrir Zulo a un segundo club (backend)
- Permisos de UPDATE por columna también en `warehouses.group_id`, `zones.warehouse_id` e `items.zone_id` (hoy, alguien admin de dos grupos podría mover filas entre ellos). Mismo patrón que `supabase/migrations/20261020100000_column_grants.sql`.
- Test SQL de "vencido" con un préstamo que venció ayer en Madrid (el actual no distingue la vista antigua).
- `return_loan` no valida que la foto esté en la carpeta del grupo.
- RGPD: `on delete set null` en `groups.created_by` y `loans.user_id`; protección del último admin; salir del grupo / quitar miembro.

## Mejoras pequeñas aparcadas
- Pestaña "Buscar" en la página del grupo: con un solo almacén podría ir directa a su buscador (necesita pasar el dato al layout).
- Títulos de pestaña con el nombre del grupo/almacén (hoy son estáticos).
- Miniatura del plano en las tarjetas de almacén (hoy un icono; `PlanView` ya tiene la prop `static`).
- Arrastrar hacia abajo para cerrar la hoja; ilustración de "almacén sin plano".
- Tests de interacción del editor del plano y de las server actions nuevas (`makeAdmin`, `renameWarehouse`, `loadHistoryAction`, `loadReturnedAction`).

## Decisiones tomadas durante el rediseño (por si hay que revisarlas)
- "Vencido" = fecha de vencimiento anterior a hoy en Europe/Madrid (SQL y JS).
- `profiles` solo deja cambiar `full_name`; `groups` solo `name`; `group_members` solo `role`.
- La barra inferior se oculta en el editor del plano.
- Solo la zona seleccionada se puede redimensionar; teclado: flechas mueven, Mayús+Alt+flechas cambian el tamaño.
- `/join` sigue sin mostrar el nombre del grupo (decisión §9.5).
- El arte del login usa los colores del plano: papel en claro, blueprint en oscuro.
- `--plan-line` claro oscurecido a `#928e86` (3,12:1) para cumplir el contraste de §6.
- Los avisos de error duran 8 s y se anuncian una sola vez (región polite).
