# F02 - Auth login y proteccion de rutas

## Objetivo
Habilitar acceso privado al panel con autenticacion de admin en Supabase.

## In scope

- Pantalla `/login` funcional.
- Login/logout con Supabase Auth.
- Proteccion de rutas privadas por proxy.
- Redirecciones segun sesion.

## Out of scope

- CRUD de negocio.
- Metricas dashboard reales.

## Dependencias de entrada

- `F00` y `F01` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `app/login/page.tsx`
- `app/(private)/layout.tsx`
- `proxy.ts`
- `lib/auth/*`

## Contratos afectados (DB/API/tipos)

- Supabase Auth session contract.

## Plan de implementacion paso a paso

1. Implementar form de login con validacion basica.
2. Conectar login/logout con Supabase Auth.
3. Definir rutas publicas (`/login`) y privadas.
4. Configurar proxy para redirigir no autenticados.
5. Verificar navegacion post-login y logout.

## Plan de testing de la fase

- E2E:
  - login invalido
  - acceso denegado a ruta privada sin sesion
  - pantalla login renderizada
- Smoke regresion:
  - build y lint.

## Criterios de aceptacion

- No autenticado no entra al panel.
- Flujo login/logout estable.

## Checklist de fase

- [x] Pantalla login implementada.
- [x] Acciones login/logout implementadas.
- [x] Proxy de proteccion activo.
- [x] E2E de auth en verde.

## Riesgos y rollback

- Riesgo: bucles de redireccion.
- Rollback: habilitar temporalmente solo `/login` y una ruta privada controlada para depurar.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `app/login/page.tsx`
  - `app/auth/login/route.ts`
  - `app/auth/logout/route.ts`
  - `app/(private)/layout.tsx`
  - `proxy.ts`
  - `lib/auth/guard.ts`
  - `lib/auth/require-api-session.ts`
- Verificaciones (2026-02-13):
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test:e2e` -> pass (3/3)
  - `npm run build` -> pass
