# F01 - Esquema DB y migraciones

## Objetivo
Crear el modelo de datos v1 en Supabase y dejar seeds reproducibles para desarrollo y pruebas.

## In scope

- Migraciones SQL de tablas v1.
- Indices y constraints de negocio.
- Seed inicial (`app_settings` y datos demo minimos).

## Out of scope

- UI de negocio.
- Flujo de login.
- Endpoints de aplicacion.

## Dependencias de entrada

- `F00` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `supabase/migrations/*_initial_schema.sql`
- `supabase/seed.sql`
- `supabase/README.md`

## Contratos afectados (DB/API/tipos)

- Creacion de `users`, `subscriptions`, `audit_logs`, `app_settings`.

## Plan de implementacion paso a paso

1. Crear migracion inicial con 4 tablas.
2. Agregar constraints:
   - `users.whatsapp` unico.
   - `subscriptions.user_id` unico.
   - check de estados de suscripcion.
3. Agregar indices para listados/filtros principales.
4. Crear seed con defaults operativos.
5. Probar migracion desde base vacia.

## Plan de testing de la fase

- Integration:
  - Insercion de usuario valido.
  - Rechazo de WhatsApp duplicado.
  - Rechazo de estado invalido.
- Smoke:
  - migracion + seed ejecutan sin error.

## Criterios de aceptacion

- DB reproducible desde cero.
- Constraints criticas aplicadas.
- Seed funcional para siguientes fases.

## Checklist de fase

- [x] Migracion inicial creada.
- [x] Constraints aplicadas.
- [x] Indices aplicados.
- [x] Seed creada.
- [x] Tests de contrato de esquema en verde.

## Riesgos y rollback

- Riesgo: migracion incompatible con entornos existentes.
- Rollback: nueva migracion correctiva (no editar migracion aplicada).

## Estado
`done`

## Evidencia
- Archivos creados:
  - `supabase/migrations/202602130001_initial_schema.sql`
  - `supabase/migrations/202602130002_admin_profiles_and_audit_actor.sql`
  - `supabase/seed.sql`
  - `supabase/README.md`
  - `tests/f01-schema-contract.test.mjs`
  - `tests/integration/admin-profiles-migration-contract.test.ts`
- Verificaciones (2026-02-13):
  - `node --test tests/f01-schema-contract.test.mjs` -> pass (2/2)
  - `npm run lint` -> pass
- Nota operativa:
  - No se aplico migracion en una instancia real porque no hay acceso DB en esta sesion.
  - Se tomo la migracion como baseline real, segun instruccion del usuario, para continuar F02-F08.
