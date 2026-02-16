# F03 - Usuarios CRUD y modales

## Objetivo
Implementar la gestion completa de usuarios con modales de crear, ver y editar.

## In scope

- Pantalla `/usuarios` con listado y busqueda.
- Modal crear usuario (incluye suscripcion inicial).
- Modal ver usuario.
- Modal editar usuario.
- Persistencia en DB via Supabase.

## Out of scope

- Reglas avanzadas de transicion de estado.
- Dashboard agregado.

## Dependencias de entrada

- `F02` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `app/(private)/usuarios/page.tsx`
- `lib/actions/private-actions.ts`
- `lib/data/users.ts`
- `lib/validators/users.ts`
- `app/api/users/route.ts`
- `app/api/users/[id]/route.ts`

## Contratos afectados (DB/API/tipos)

- `users` y `subscriptions` (alta y edicion base).
- DTO `CreateUserInput`, `UpdateUserInput`.

## Plan de implementacion paso a paso

1. Crear query de listado y busqueda por nombre/WhatsApp.
2. Implementar modal de alta:
   - crear user
   - crear subscription inicial (1:1)
3. Implementar detalle de usuario.
4. Implementar edicion de datos de user + campos de suscripcion.
5. Manejar errores de conflicto (`409`) por WhatsApp.

## Plan de testing de la fase

- Integration:
  - validacion de payloads de usuario
  - contratos de endpoints de usuarios
- E2E:
  - validacion de acceso por auth
- Smoke regresion:
  - login/logout.

## Criterios de aceptacion

- CRUD base operativo en UI.
- Integridad 1:1 respetada.
- Errores de validacion visibles en UI.

## Checklist de fase

- [x] Listado con busqueda implementado.
- [x] Crear usuario implementado.
- [x] Ver usuario implementado.
- [x] Editar usuario implementado.
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: inconsistencias entre user y subscription.
- Rollback: compensacion en alta (eliminar user si falla la subscription).

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `app/(private)/usuarios/page.tsx`
  - `lib/actions/private-actions.ts`
  - `lib/data/users.ts`
  - `lib/validators/users.ts`
  - `app/api/users/route.ts`
  - `app/api/users/[id]/route.ts`
- Verificaciones (2026-02-13):
  - `npm run test:integration` -> pass
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
