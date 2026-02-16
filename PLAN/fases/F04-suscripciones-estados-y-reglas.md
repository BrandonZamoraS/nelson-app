# F04 - Suscripciones, estados y reglas

## Objetivo
Implementar gestion de suscripciones con cambios de estado manuales y terminacion confirmada.

## In scope

- Pantalla `/suscripciones` con listado y busqueda.
- Cambio manual de estado:
  - `activa`, `gracia`, `suspendida`, `terminada`
- Accion `terminar` con confirmacion.
- Validacion de transiciones permitidas.

## Out of scope

- Integraciones externas.
- Automatizaciones de cobro.

## Dependencias de entrada

- `F03` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `app/(private)/suscripciones/page.tsx`
- `lib/domain/subscription-status.ts`
- `lib/data/subscriptions.ts`
- `app/api/subscriptions/route.ts`
- `app/api/subscriptions/[id]/status/route.ts`
- `app/api/subscriptions/[id]/terminate/route.ts`

## Contratos afectados (DB/API/tipos)

- `PATCH /api/subscriptions/:id/status`.
- `POST /api/subscriptions/:id/terminate`.

## Plan de implementacion paso a paso

1. Construir listado de suscripciones con datos de usuario.
2. Implementar reglas de transicion en modulo unico.
3. Implementar operacion cambiar estado.
4. Implementar confirmacion de terminar.
5. Manejar errores `409` en transiciones invalidas.

## Plan de testing de la fase

- Unit:
  - matriz de transiciones validas/invalidas.
- Integration:
  - validacion de cambio de estado.
- E2E:
  - acceso a rutas privadas sin sesion.
- Smoke regresion:
  - CRUD usuarios basico.

## Criterios de aceptacion

- Estados cambian correctamente en DB y UI.
- Transiciones invalidas se bloquean.
- Terminacion requiere confirmacion.

## Checklist de fase

- [x] Listado suscripciones implementado.
- [x] Reglas de transicion implementadas.
- [x] Cambio de estado implementado.
- [x] Terminacion confirmada implementada.
- [x] Tests de fase en verde.

## Riesgos y rollback

- Riesgo: estados inconsistentes por validacion duplicada.
- Rollback: centralizar validacion de transicion en una sola funcion.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `app/(private)/suscripciones/page.tsx`
  - `lib/domain/subscription-status.ts`
  - `lib/data/subscriptions.ts`
  - `app/api/subscriptions/route.ts`
  - `app/api/subscriptions/[id]/status/route.ts`
  - `app/api/subscriptions/[id]/terminate/route.ts`
- Verificaciones (2026-02-13):
  - `npm run test:unit` -> pass
  - `npm run test:integration` -> pass
  - `npm run lint` -> pass
  - `npm run build` -> pass
