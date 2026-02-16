# 03 - Roadmap por Fases

## Orden de ejecución obligatorio

1. `F00` base-proyecto-y-supabase
2. `F01` esquema-db-y-migraciones
3. `F02` auth-login-y-proteccion-rutas
4. `F03` usuarios-crud-y-modales
5. `F04` suscripciones-estados-y-reglas
6. `F05` auditoria-end-to-end
7. `F06` dashboard-metricas-y-actividad
8. `F07` configuracion-completa
9. `F08` hardening-ci-y-e2e-final

## Dependencias entre fases

- `F00` -> no depende.
- `F01` -> depende de `F00`.
- `F02` -> depende de `F00` y `F01`.
- `F03` -> depende de `F02` y `F01`.
- `F04` -> depende de `F03`.
- `F05` -> depende de `F03` y `F04`.
- `F06` -> depende de `F05`.
- `F07` -> depende de `F02` y `F05`.
- `F08` -> depende de `F03` a `F07`.

## Regla de avance

- No iniciar una fase si alguna dependencia no está `done`.
- No marcar `done` sin tests de fase en verde y evidencia registrada.

## Entregables por fase (resumen)

- `F00`: base técnica + clientes Supabase.
- `F01`: esquema DB + migraciones + seeds.
- `F02`: login + middleware protegido.
- `F03`: CRUD usuarios + modales.
- `F04`: operaciones de estado de suscripción.
- `F05`: auditoría funcional y consultable.
- `F06`: dashboard con datos reales.
- `F07`: configuración funcional completa.
- `F08`: calidad final, CI y suite E2E real.
