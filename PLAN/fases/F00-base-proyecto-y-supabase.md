# F00 - Base proyecto y Supabase

## Objetivo
Preparar base tecnica para usar Supabase en app Next.js sin tocar aun logica de negocio.

## In scope

- Configuracion de variables de entorno.
- Clientes Supabase para server y client.
- Helpers base de auth/sesion.
- Estructura inicial de carpetas `lib/*`.

## Out of scope

- Migraciones de dominio.
- Pantallas de producto.
- Operaciones CRUD.

## Dependencias de entrada

- Ninguna.

## Cambios tecnicos concretos (archivos esperados)

- `.env.example`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/auth/session.ts`
- `proxy.ts` (equivalente moderno de middleware en Next.js 16)

## Contratos afectados (DB/API/tipos)

- Ninguno todavia.

## Plan de implementacion paso a paso

1. Definir variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Crear clientes Supabase separados (server/client).
3. Crear helper para leer sesion.
4. Anadir proteccion base con rutas publicas y privadas usando `proxy.ts`.
5. Validar que build sigue en verde.

## Plan de testing de la fase

- Smoke: carga de app sin crash.
- Unit: helper de sesion (si aplica).

## Criterios de aceptacion

- Clientes Supabase inicializados sin errores.
- Estructura base lista para fases siguientes.
- Build/lint sin errores nuevos.

## Checklist de fase

- [x] Variables de entorno definidas.
- [x] Cliente server creado.
- [x] Cliente client creado.
- [x] Middleware base creado (via `proxy.ts`).
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: configuracion erronea de env.
- Rollback: aislar cambios en `lib/supabase` y restaurar configuracion previa de proxy.

## Estado
`done`

## Evidencia
- Archivos creados:
  - `.env.example`
  - `lib/supabase/env.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/client.ts`
  - `lib/auth/session.ts`
  - `proxy.ts`
- Dependencias instaladas:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- Verificaciones ejecutadas (2026-02-13):
  - `node --test tests/f00-foundation-contract.test.mjs` -> pass (3/3)
  - `npm run lint` -> pass sin errores (warnings preexistentes en `tests/seed.spec.ts`)
  - `npm run build` -> pass