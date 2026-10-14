@AGENTS.md

# Zulo: contexto para Claude Code

App de inventario visual para clubs: foto del almacén → la IA (Ollama, Qwen-VL) propone zonas → material por zona → préstamos con foto al coger y al devolver.

- **Spec:** `docs/specs/2026-10-14-zulo-design.md`
- **Plan:** `docs/plans/2026-10-14-zulo-plan.md`. Se ejecuta tarea por tarea, con TDD y un commit por tarea. Lee la sección "Rulings durante la ejecución" al final del plan y añade allí cualquier desviación nueva.
- **Estado:** tareas 1-4 hechas (scaffold, IA, base de datos aplicada en Supabase con tipos en `lib/database.types.ts`). Tareas 5 (login con email+contraseña) y 6 hechas. Continúa por la Tarea 7. Pendiente de decidir: migración para que `groups.created_by` y `loans.user_id` sean `on delete set null` (ahora impiden borrar usuarios).

## Reglas
- Next 16: usa `proxy.ts`, no `middleware.ts`. Consulta `node_modules/next/dist/docs/` antes de escribir APIs de Next.
- UI en español, mobile-first, con `<label>` en todos los inputs.
- Nunca uses la service role key en la app. La API key de Ollama solo se usa en el servidor.
- Antes de cada commit: `npm test && npm run build`.
- Tests de seguridad SQL: `supabase/tests/rls_check.sql` y `rls_extra.sql` (se ejecutan en el SQL Editor).
