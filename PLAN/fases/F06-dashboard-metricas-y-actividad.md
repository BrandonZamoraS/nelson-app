# F06 - Dashboard metricas y actividad

## Objetivo
Construir dashboard de inicio con metricas operativas y actividad reciente basadas en datos reales.

## In scope

- Pantalla `/` alineada al diseno.
- KPIs:
  - suscripciones activas
  - en gracia
  - suspendidas
  - terminadas
- Panel de actividad reciente desde `audit_logs`.
- Alertas operativas basicas.

## Out of scope

- BI avanzada.
- Graficos complejos fuera del diseno objetivo.

## Dependencias de entrada

- `F05` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `app/(private)/page.tsx`
- `lib/domain/dashboard-metrics.ts`
- `lib/data/dashboard.ts`
- `app/api/dashboard/metrics/route.ts`

## Contratos afectados (DB/API/tipos)

- Lecturas agregadas de `subscriptions` y `audit_logs`.
- `GET /api/dashboard/metrics`.

## Plan de implementacion paso a paso

1. Definir funciones agregadas de metricas.
2. Construir seccion de alertas desde reglas simples.
3. Integrar actividad reciente con limite de registros.
4. Reemplazar home de plantilla por dashboard final.
5. Ajustar estados empty.

## Plan de testing de la fase

- Unit:
  - funciones de calculo de metricas.
- Integration:
  - contrato del endpoint de dashboard.
- E2E:
  - login y proteccion de rutas.
- Smoke regresion:
  - usuarios/suscripciones/auditoria accesibles.

## Criterios de aceptacion

- Dashboard util para operacion diaria.
- Datos coherentes con DB.
- Carga estable en escenarios sin datos.

## Checklist de fase

- [x] Home convertida a dashboard.
- [x] Metricas implementadas.
- [x] Actividad reciente implementada.
- [x] Alertas operativas implementadas.
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: queries pesadas.
- Rollback: consultas simplificadas y limite de ventana temporal.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `app/(private)/page.tsx`
  - `lib/domain/dashboard-metrics.ts`
  - `lib/data/dashboard.ts`
  - `app/api/dashboard/metrics/route.ts`
- Verificaciones (2026-02-13):
  - `npm run test:unit` -> pass
  - `npm run test:integration` -> pass
  - `npm run lint` -> pass
  - `npm run build` -> pass
