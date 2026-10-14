@AGENTS.md

# Zulo: contexto para Claude Code

App de inventario visual para clubs: foto del almacén → la IA (Ollama, Qwen-VL) propone zonas → material por zona → préstamos con foto al coger y al devolver.

- **Spec:** `docs/specs/2026-10-14-zulo-design.md`
- **Plan:** `docs/plans/2026-10-14-zulo-plan.md`. Se ejecuta tarea por tarea, con TDD y un commit por tarea. Lee la sección "Rulings durante la ejecución" al final del plan y añade allí cualquier desviación nueva.
- **Estado (fin del 2026-10-14):** tareas 1-8 hechas y con commit. Tarea 9 (editor de zonas) escrita y con commit, pero **sin probar a mano**: lo primero es que Santi haga el paso 4 de la Tarea 9 (necesita abrir la app de Ollama; `ollama list` debe mostrar `qwen2.5vl:7b`). Si funciona, seguir por la Tarea 10. Si falla, depurar antes de seguir.
- **Cambios respecto al plan** (detalle en "Rulings durante la ejecución"): login con email+contraseña en vez de magic link ("Confirm email" desactivado en Supabase, sin recuperación de contraseña); todas las páginas leen sesión/params dentro de `<Suspense>` por `cacheComponents: true`.
- **Pendiente de decidir con Santi:** (1) migración para que `groups.created_by` y `loans.user_id` sean `on delete set null` (ahora impiden borrar usuarios; RGPD); (2) aviso de `Date.now()` en `components/Header.tsx` en la consola de `next dev`; (3) la prueba de la IA con fotos reales (T3 paso 9) sigue pendiente y es el mayor riesgo.
- **Prioridades:** entrega hacia el 2026-10-21. Primero funcionalidad; el frontend bonito va al final. Adelantar el despliegue a Vercel (T14) a mitad de semana.
- **Ledger de ejecución:** `.superpowers/sdd/2026-10-14-zulo-plan/progress.md` (git-ignored).

## Reglas
- Next 16: usa `proxy.ts`, no `middleware.ts`. Consulta `node_modules/next/dist/docs/` antes de escribir APIs de Next.
- UI en español, mobile-first, con `<label>` en todos los inputs.
- Nunca uses la service role key en la app. La API key de Ollama solo se usa en el servidor.
- Antes de cada commit: `npm test && npm run build`.
- Tests de seguridad SQL: `supabase/tests/rls_check.sql` y `rls_extra.sql` (se ejecutan en el SQL Editor).
