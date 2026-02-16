# F08 - Hardening CI y E2E final

## Objetivo
Cerrar calidad tecnica del MVP, estabilizar CI y dejar evidencia de release.

## In scope

- Limpieza de deuda tecnica pendiente.
- Ajustes finales de DX y robustez.
- Scripts de test definitivos.
- Suite E2E del producto.
- Pipeline CI ejecutando lint/typecheck/tests.

## Out of scope

- Nuevas funcionalidades de negocio.
- Refactors grandes sin impacto directo en release.

## Dependencias de entrada

- `F03`, `F04`, `F05`, `F06`, `F07` en `done`.

## Cambios tecnicos concretos (archivos esperados)

- `package.json` scripts finales
- `playwright.config.ts` con `baseURL` y `webServer`
- `.github/workflows/ci.yml`
- `README.md` tecnico actualizado

## Contratos afectados (DB/API/tipos)

- Ningun contrato nuevo. Solo estabilizacion.

## Plan de implementacion paso a paso

1. Reemplazar tests Playwright de plantilla por flujos del producto.
2. Agregar scripts estandar:
   - `test:unit`
   - `test:integration`
   - `test:e2e`
   - `typecheck`
3. Configurar pipeline CI.
4. Ejecutar bateria completa.
5. Corregir flakes y cerrar documentacion final.

## Plan de testing de la fase

- Full suite:
  - lint
  - typecheck
  - unit
  - integration
  - e2e
- Re-ejecucion de E2E para detectar flakiness.

## Criterios de aceptacion

- CI completamente verde.
- Sin tests de plantilla apuntando a sitios externos.
- Documentacion lista para operacion y mantenimiento.

## Checklist de fase

- [x] Scripts de calidad finales definidos.
- [x] Tests plantilla reemplazados.
- [x] Workflow CI funcional.
- [x] Full suite en verde.
- [x] Documentacion final actualizada.

## Riesgos y rollback

- Riesgo: inestabilidad E2E por datos no deterministas.
- Rollback: reforzar seeds y aislar fixtures por test.

## Estado
`done`

## Evidencia
- Archivos implementados:
  - `package.json`
  - `playwright.config.ts`
  - `.github/workflows/ci.yml`
  - `tests/auth-and-shell.e2e.spec.ts`
  - `tests/unit/*`
  - `tests/integration/*`
- Verificaciones (2026-02-13):
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm test` -> pass
  - `npm run test:e2e` -> pass (3/3)
  - `npm run build` -> pass
