# F05 - Auditoria end-to-end

## Objetivo
Garantizar trazabilidad completa de mutaciones y consulta operativa en pantalla de auditoria.

## In scope

- `logAudit` central para mutaciones.
- Registro de eventos en:
  - crear/editar usuario
  - cambios de estado
  - terminar suscripcion
  - cambios de configuracion
- Pantalla `/auditoria` con filtros y paginacion.

## Out of scope

- Exportaciones complejas.
- SIEM u observabilidad externa.

## Dependencias de entrada

- `F03` y `F04` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `lib/audit/log-audit.ts`
- `lib/data/audit.ts`
- `app/(private)/auditoria/page.tsx`
- `app/api/audit/route.ts`

## Contratos afectados (DB/API/tipos)

- Tabla `audit_logs` en uso completo.
- `AuditFilterInput`.

## Plan de implementacion paso a paso

1. Crear helper unico de auditoria.
2. Integrar helper en cada mutacion de dominio.
3. Construir query de auditoria con filtros.
4. Implementar pantalla con tabla y paginacion.
5. Validar orden temporal descendente por defecto.

## Plan de testing de la fase

- Integration:
  - filtro y paginacion de auditoria.
  - contratos de endpoint de auditoria.
- E2E:
  - acceso a pantalla de login y proteccion de privadas.
- Smoke regresion:
  - flujo de suscripciones.

## Criterios de aceptacion

- Cobertura de auditoria en mutaciones criticas.
- Filtros de auditoria funcionales.
- Paginacion estable.

## Checklist de fase

- [x] Helper de auditoria implementado.
- [x] Integracion en mutaciones realizada.
- [x] Pantalla auditoria implementada.
- [x] Filtros y paginacion funcionando.
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: ruido de eventos o payloads inconsistentes.
- Rollback: normalizar esquema `detail` y reducir campos a minimos utiles.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `lib/audit/log-audit.ts`
  - `lib/data/audit.ts`
  - `app/(private)/auditoria/page.tsx`
  - `app/api/audit/route.ts`
- Verificaciones (2026-02-13):
  - `npm run test:integration` -> pass
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
