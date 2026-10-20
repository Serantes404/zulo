# Zulo

**El material de tu club universitario, siempre localizado.**

Zulo ayuda a los responsables de material de clubs y asociaciones universitarias a saber qué hay en el almacén, dónde está y quién se lo ha llevado.

App en producción: https://zulo-nine.vercel.app

## Qué hace

1. **Creas el grupo de tu club** e invitas a los demás con un link.
2. **Haces una foto del almacén** (o lo dibujas): la IA propone el plano y las zonas (estantería, armario, cajas…).
3. **Apuntas el material por zona**, con foto y cantidad.
4. **Prestas con foto y fecha de devolución**: se ve quién lo tiene, qué está vencido y en qué estado vuelve.

Cada grupo es privado: solo sus miembros ven sus almacenes, material y préstamos.

## Stack

- Next.js 16 (App Router, Server Actions, `cacheComponents`), Tailwind CSS v4, componentes sobre Base UI.
- Supabase: Auth con email y contraseña, Postgres con Row Level Security en todas las tablas, Storage para las fotos.
- API de Gemini para detectar las zonas (solo en el servidor, con cuota diaria).
- Vercel para el despliegue.

## Ejecutarlo en local

1. Crea `.env.local` con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   GEMINI_API_KEY=...
   ```
2. Aplica las migraciones de `supabase/migrations/` en orden en el SQL Editor de Supabase.
3. `npm ci` y `npm run dev`, y abre http://localhost:3000.

Tests: `npm test` (Vitest). Las pruebas de seguridad de la base de datos están en `supabase/tests/` y se ejecutan en el SQL Editor.
