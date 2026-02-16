# F07 - Configuracion completa

## Objetivo
Implementar pantalla de configuracion con persistencia para reglas y preferencias del sistema.

## In scope

- Pantalla `/configuracion`.
- Seccion Integraciones (placeholder funcional).
- Reglas del sistema (`grace_days`, plantillas).
- Seguridad basica (cambio de password admin).
- Preferencias (`currency`, `timezone`, `date_format`).

## Out of scope

- Gestion de multiples administradores.
- Integracion real con APIs externas.

## Dependencias de entrada

- `F02` y `F05` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `app/(private)/configuracion/page.tsx`
- `lib/data/settings.ts`
- `lib/validators/settings.ts`
- `app/api/settings/route.ts`

## Contratos afectados (DB/API/tipos)

- `GET/PATCH /api/settings`.
- `UpdateSettingsInput`.

## Plan de implementacion paso a paso

1. Crear query de carga de settings actuales.
2. Implementar edicion y guardado con validacion.
3. Implementar flujo de cambio de password (Supabase Auth).
4. Registrar auditoria de cambios en configuracion.
5. Mostrar feedback de guardado y errores.

## Plan de testing de la fase

- Integration:
  - validacion de settings.
  - contrato de endpoint de settings.
- E2E:
  - login y navegacion a rutas privadas.
- Smoke regresion:
  - login + dashboard + usuarios.

## Criterios de aceptacion

- Configuracion persiste correctamente.
- Validaciones y errores visibles.
- Auditoria registra cambios de settings.

## Checklist de fase

- [x] Pantalla configuracion implementada.
- [x] Persistencia settings implementada.
- [x] Cambio contraseña implementado.
- [x] Auditoria de configuracion implementada.
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: settings inconsistentes por faltas de validacion.
- Rollback: defaults seguros y validacion estricta en server.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `app/(private)/configuracion/page.tsx`
  - `lib/data/settings.ts`
  - `lib/validators/settings.ts`
  - `app/api/settings/route.ts`
- Verificaciones (2026-02-13):
  - `npm run test:integration` -> pass
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
