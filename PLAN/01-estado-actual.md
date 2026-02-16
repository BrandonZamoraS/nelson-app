# 01 - Estado Actual del Repositorio

## Snapshot funcional

- Frontend actual: plantilla inicial de Next.js.
- Dominio producto (usuarios/suscripciones/auditoría/configuración): no implementado.
- Tests actuales Playwright:
  - `tests/example.spec.ts` apunta a `https://playwright.dev/` (no a la app).
  - `tests/seed.spec.ts` es placeholder.

## Estructura actual relevante

- `app/page.tsx`: home de plantilla.
- `app/layout.tsx`: layout base.
- `app/globals.css`: estilos base.
- `playwright.config.ts`: config estándar, sin `baseURL` local definida.
- `specs/README.md`: placeholder.

## Salud técnica observada (baseline)

- `npm run build`: OK.
- `npm run lint`: warnings en `tests/seed.spec.ts` por variables no usadas.
- `npx playwright test`: pasa, pero no valida producto real.

## Brechas principales

1. No existe modelo de datos de negocio.
2. No hay integración Supabase.
3. No hay auth de admin ni protección de rutas.
4. No hay CRUD de usuarios/suscripciones.
5. No hay auditoría.
6. No hay configuración operativa.
7. No existe suite de testing alineada al producto.

## Riesgos de implementación

- Empezar por UI sin contratos de datos definidos rompe consistencia.
- Implementar E2E antes de tener seeds confiables produce tests frágiles.
- No centralizar auditoría desde el inicio complica trazabilidad.

## Estrategia aplicada para mitigación

- Descomposición por fases ordenadas (`PLAN/03-roadmap-fases.md`).
- Contratos y DB definidos antes de flujos UI complejos.
- Tests por fase con smoke de regresión controlado.
