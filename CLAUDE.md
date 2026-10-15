@AGENTS.md

# Zulo: contexto para Claude Code

App de inventario visual para clubs: foto del almacén → la IA (API de Gemini) propone zonas → material por zona → préstamos con foto al coger y al devolver.

- **Spec:** `docs/specs/2026-10-14-zulo-design.md`
- **Plan:** `docs/plans/2026-10-14-zulo-plan.md`. Se ejecuta tarea por tarea, con TDD y un commit por tarea. Lee la sección "Rulings durante la ejecución" al final del plan y añade allí cualquier desviación nueva.
- **Estado (2026-10-15):** tareas 1-8 hechas. Tarea 9: editor de zonas con IA (Gemini), lienzo para dibujar el plano en la app (sustituye a la cuadrícula) y conversión HEIC. Probado en el ordenador: dibujo → zonas → guardar. Probado también en el móvil. Siguiente: Tarea 10.
- **Cambios respecto al plan** (detalle en "Rulings durante la ejecución"): IA con la API de Gemini en vez de Ollama; login con email+contraseña en vez de magic link ("Confirm email" desactivado en Supabase, sin recuperación de contraseña); todas las páginas leen sesión/params dentro de `<Suspense>` por `cacheComponents: true`.
- **Pendiente de decidir con Santi:** (1) migración para que `groups.created_by` y `loans.user_id` sean `on delete set null` (ahora impiden borrar usuarios; RGPD); (2) ~~aviso de `Date.now()`~~ resuelto con `connection()` en `lib/supabase/server.ts`; (3) la prueba de la IA con fotos reales (T3 paso 9) sigue pendiente y es el mayor riesgo.
- **Repo:** aún no hay repo en GitHub (sin remote, `gh` no instalado): todo está solo en local. Santi prefiere dejarlo para el final: `brew install gh`, `gh auth login` y, con el OK de Santi, `gh repo create zulo --private --source=. --push`.
- **Prioridades:** entrega hacia el 2026-10-21. Primero funcionalidad; el frontend bonito va al final. Adelantar el despliegue a Vercel (T14) a mitad de semana.
- **Ledger de ejecución:** `.superpowers/sdd/2026-10-14-zulo-plan/progress.md` (git-ignored).

## Reglas
- No uses `npm install <paquete>` (npm 11.6 rompe el lockfile; ver rulings).
- Next 16: usa `proxy.ts`, no `middleware.ts`. Consulta `node_modules/next/dist/docs/` antes de escribir APIs de Next.
- UI en español, mobile-first, con `<label>` en todos los inputs.
- Nunca uses la service role key en la app. La API key de Gemini solo se usa en el servidor.
- Antes de cada commit: `npm test && npm run build`.
- Tests de seguridad SQL: `supabase/tests/rls_check.sql` y `rls_extra.sql` (se ejecutan en el SQL Editor).
