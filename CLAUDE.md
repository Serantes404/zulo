@AGENTS.md

# Zulo: contexto para Claude Code

App de inventario visual para clubs: foto del almacén → la IA (API de Gemini) propone zonas → material por zona → préstamos con foto al coger y al devolver.

- **Spec:** `docs/specs/2026-10-14-zulo-design.md`
- **Plan:** `docs/plans/2026-10-14-zulo-plan.md`. Se ejecuta tarea por tarea, con TDD y un commit por tarea. Lee la sección "Rulings durante la ejecución" al final del plan y añade allí cualquier desviación nueva.
- **Estado (2026-10-19):** tareas 1-13 hechas y probadas por Santi en el móvil (incluye ficha del material, coger/devolver con foto y "Mis préstamos"). Plano profesional (boceto → plano tipo arquitecto) hecho; ver ruling del 2026-10-16 (su revisión final de rama quedó en pausa). Seguridad previa al despliegue hecha (auditoría tareas 1, 2, 3, 4 y 7: safeNext, cabeceras, comprobaciones del plano, límite de 5 MB y cuota de IA; migraciones aplicadas en Supabase). Tests RLS reescritos como un bloque DO que termina en `OK: …` (pegar el contenido, no la ruta). **Rediseño del frontend "Plano técnico" terminado (2026-10-20):** 17 tareas + revisión final (`docs/specs/2026-10-19-frontend-redesign-design.md`). Backend del rediseño: permisos de UPDATE por columna y "vencido" con la fecha de Madrid (migraciones `20261020100000_column_grants.sql` y `20261020100100_overdue_madrid.sql`, aplicadas; tests RLS pasados). Auditoría de seguridad 2026-10-20 hecha y migración `20261021090000_security_hardening.sql` aplicada (tests OK). Lo pendiente está en `docs/pendiente-tras-rediseno.md` y la checklist manual en `docs/a11y-checklist.md`. Repaso en el móvil hecho por Santi. Siguiente: Tarea 14 (Vercel, adaptada a Gemini).
- **Ledgers:** `.superpowers/sdd/<plan>/progress.md` para cada plan (zulo-plan, plano-profesional-plan, security-pre-deploy, frontend-redesign-design). Auditoría de seguridad: `.superpowers/sdd/security-audit/` (8 tareas pendientes: Storage, grants por columna, RGPD, CAPTCHA, etc.).
- **Cambios respecto al plan** (detalle en "Rulings durante la ejecución"): IA con la API de Gemini en vez de Ollama; login con email+contraseña en vez de magic link ("Confirm email" desactivado en Supabase, sin recuperación de contraseña); todas las páginas leen sesión/params dentro de `<Suspense>` por `cacheComponents: true`.
- **Pendiente de decidir con Santi:** (1) migración para que `groups.created_by` y `loans.user_id` sean `on delete set null` (ahora impiden borrar usuarios; RGPD); (2) ~~aviso de `Date.now()`~~ resuelto con `connection()` en `lib/supabase/server.ts`; (3) la prueba de la IA con fotos reales (T3 paso 9) sigue pendiente y es el mayor riesgo.
- **Repo:** GitHub privado https://github.com/Serantes404/zulo (remote `origin`, rama `main`; `gh` instalado y autenticado). Subido el 2026-10-20 tras la auditoría de seguridad.
- **Prioridades:** entrega hacia el 2026-10-21. Primero funcionalidad; el frontend bonito va al final. Adelantar el despliegue a Vercel (T14) a mitad de semana.

## Reglas
- No uses `npm install <paquete>` (npm 11.6 rompe el lockfile; ver rulings).
- Next 16: usa `proxy.ts`, no `middleware.ts`. Consulta `node_modules/next/dist/docs/` antes de escribir APIs de Next.
- UI en español, mobile-first, con `<label>` en todos los inputs.
- Nunca uses la service role key en la app. La API key de Gemini solo se usa en el servidor.
- Antes de cada commit: `npm test && npm run build`.
- Tests de seguridad SQL: `supabase/tests/rls_check.sql` y `rls_extra.sql` (se ejecutan en el SQL Editor).
