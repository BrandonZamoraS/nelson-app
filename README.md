# Nelson Admin

Panel administrativo MVP para gestion de usuarios, suscripciones, auditoria y configuracion sobre Next.js + Supabase.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Supabase (Auth + Postgres)
- Zod
- Playwright

## Variables de entorno

Define estas variables en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Para referencia, existe `.env.example`.

## Base de datos

Migraciones y seed versionados:

- `supabase/migrations/202602130001_initial_schema.sql`
- `supabase/seed.sql`

Consulta `supabase/README.md` para el flujo de aplicacion cuando tengas acceso a DB.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Detalle de tests:

- `npm run test:contracts`: contratos F00/F01
- `npm run test:unit`: reglas de dominio
- `npm run test:integration`: validadores y contratos de API
- `npm run test:e2e`: flujos de auth/rutas privadas en Playwright

## CI

Workflow principal: `.github/workflows/ci.yml`

Ejecuta:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e`

## Rutas principales

- Publica:
  - `/login`
- Privadas:
  - `/` (dashboard)
  - `/usuarios`
  - `/suscripciones`
  - `/auditoria`
  - `/configuracion`

## Notas operativas

- `proxy.ts` protege rutas privadas y APIs.
- Existe modo `E2E_AUTH_STUB=true` para pruebas E2E sin dependencia de una instancia real de Supabase.
- En ejecucion normal, todas las mutaciones relevantes registran auditoria via `lib/audit/log-audit.ts`.
