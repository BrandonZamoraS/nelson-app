# 04 - Checklist Global de Ejecucion

Estados validos: `todo`, `in_progress`, `testing`, `done`, `blocked`.

| Fase | Estado | Dependencias satisfechas | Tests de fase | Smoke regresion | Evidencia | Ultima actualizacion |
|---|---|---|---|---|---|---|
| F00 - Base proyecto y Supabase | done | n/a | pass | pass | `PLAN/fases/F00-base-proyecto-y-supabase.md` | 2026-02-13 |
| F01 - Esquema DB y migraciones | done | si | pass (contrato) | pass | `PLAN/fases/F01-esquema-db-y-migraciones.md` | 2026-02-13 |
| F02 - Auth login y proteccion de rutas | done | si | pass | pass | `PLAN/fases/F02-auth-login-y-proteccion-rutas.md` | 2026-02-13 |
| F03 - Usuarios CRUD y modales | done | si | pass | pass | `PLAN/fases/F03-usuarios-crud-y-modales.md` | 2026-02-13 |
| F04 - Suscripciones, estados y reglas | done | si | pass | pass | `PLAN/fases/F04-suscripciones-estados-y-reglas.md` | 2026-02-13 |
| F05 - Auditoria end-to-end | done | si | pass | pass | `PLAN/fases/F05-auditoria-end-to-end.md` | 2026-02-13 |
| F06 - Dashboard metricas y actividad | done | si | pass | pass | `PLAN/fases/F06-dashboard-metricas-y-actividad.md` | 2026-02-13 |
| F07 - Configuracion completa | done | si | pass | pass | `PLAN/fases/F07-configuracion-completa.md` | 2026-02-13 |
| F08 - Hardening CI y E2E final | done | si | pass | pass | `PLAN/fases/F08-hardening-ci-y-e2e-final.md` | 2026-02-13 |

## Reglas de actualizacion

1. Solo una fase puede estar `in_progress` al mismo tiempo.
2. Al pasar a `testing`, se deben listar comandos ejecutados en evidencia de fase.
3. `done` requiere:
   - tests de fase `pass`
   - smoke regresion `pass`
   - evidencia escrita en el archivo de fase.
4. Si algo bloquea avance, usar `blocked` y documentar causa y plan de salida.
