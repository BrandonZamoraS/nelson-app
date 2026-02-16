# 06 - Estrategia de Testing

## Principios

- Pirámide balanceada: unit + integration + e2e.
- Cada fase define pruebas mínimas propias.
- Cada fase ejecuta smoke breve de regresión.
- Suite completa solo en fase final o hitos de release.

## Niveles de prueba

## 1) Unit

Cobertura objetivo:

- validadores Zod
- reglas de transición de estado
- funciones puras de métricas

Comando objetivo:

- `npm run test:unit`

## 2) Integration

Cobertura objetivo:

- operaciones DB (create/update/query)
- transacciones críticas
- registro de auditoría en mutaciones

Comando objetivo:

- `npm run test:integration`

## 3) E2E (Playwright)

Cobertura objetivo:

- login/logout
- CRUD usuario con suscripción
- cambios de estado de suscripción
- auditoría filtrable
- configuración persistente

Comando objetivo:

- `npm run test:e2e`

## Gate por fase

- Fases tempranas: unit + integration del módulo en foco.
- Fases UI: integration + e2e de flujo puntual.
- `F08`: ejecución completa.

## Criterios de paso

- `lint`: sin errores.
- `typecheck`: sin errores.
- tests requeridos de fase: `pass`.
- smoke regresión: `pass`.

## Evidencia mínima a registrar

- comandos ejecutados
- resultado resumen (pass/fail)
- número de tests y fallos
- enlace/ruta a reportes si aplica
