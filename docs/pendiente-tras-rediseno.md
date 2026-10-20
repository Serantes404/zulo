# Pendiente tras el rediseño "Plano técnico" (2026-10-20)

Rediseño completo (17 tareas + revisión final, commits ca42be6..HEAD). Lo que queda, por prioridad.

## Repaso en el móvil (hecho)
Santi hizo el repaso manual en el móvil (`docs/a11y-checklist.md`) el 2026-10-20.

## Auditoría de seguridad 2026-10-20 (hecha)
Migración `20261021090000_security_hardening.sql` aplicada y tests pasados (`security_hardening.sql`, `rls_check.sql`, `rls_extra.sql`, `ai_quota.sql`): Storage 5 MB solo JPEG con rutas estrictas, 500 fotos/día por grupo y DELETE para admins; topes (5 grupos por usuario, 20 almacenes y 2000 materiales por grupo); no se pueden mover almacenes/zonas/material entre grupos; tope global de IA 200/día; fotos de préstamo validadas; el total no baja de lo prestado. En la app: `safeNext` idempotente, `server-only` en Gemini, validación de rutas/cantidades/fechas/ids/roles en el servidor, mensajes neutros en el registro y mensajes claros para los topes.

## Pendiente de Santi (panel de Supabase y Google)
- ✅ Supabase → Authentication (2026-10-20): contraseña mínima 8; Rate Limits sign-in/sign-up 150 y token refresh 900 por 5 min (el login sale desde la IP del servidor).
- Decisión de Santi (2026-10-20): sin CAPTCHA. Riesgo aceptado: registros automáticos con cuentas falsas; lo frenan los topes de grupos, fotos e IA.
- Google AI Studio/Cloud: límite de gasto de la clave de Gemini.

## Antes de abrir Zulo a más clubs (backend)
- RGPD: `on delete set null` en `groups.created_by` y `loans.user_id` (y `return_loan` con `is distinct from`); protección del último admin; salir del grupo / quitar miembro; retención de fotos.
- Invitaciones: el código no caduca y cualquier miembro puede leerlo por REST.
- `revoke execute` de las funciones security definer para `anon`/`public`.
- Confirmación de email (SMTP propio) y recuperación de contraseña; nombre por defecto sin la parte local del email.
- Test SQL de "vencido" con un préstamo que venció ayer en Madrid.
- Informes completos de la auditoría: carpeta local `.superpowers/sdd/security-audit-2026-10-20/` (no versionada).

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
