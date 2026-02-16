# 05 - Playbook del Agente

## Objetivo
Ejecutar desarrollo por fases de manera predecible, con mínimo contexto en memoria y sin saltos de dependencia.

## Protocolo obligatorio (token-optimized)

1. Leer `PLAN/04-checklist-global.md`.
2. Identificar la primera fase en `todo` cuyas dependencias estén `done`.
3. Leer solo `PLAN/fases/FXX-*.md` de esa fase.
4. Implementar exclusivamente `In scope` de la fase.
5. Ejecutar únicamente:
   - tests de fase
   - smoke mínimo de regresión indicado.
6. Actualizar:
   - archivo de fase (`Estado`, `Evidencia`)
   - `PLAN/04-checklist-global.md`.
7. Si fase no pasa tests:
   - dejar estado `testing` o `blocked`
   - explicar bloqueo con precisión.
8. Repetir ciclo.

## Qué NO hacer

- No editar fases futuras.
- No adelantar features fuera de `In scope`.
- No marcar `done` sin evidencia.
- No correr suite completa en todas las fases (solo cuando la fase lo exige).

## Qué leer solo si hace falta

- `PLAN/00-contexto-general.md` para reglas de negocio.
- `PLAN/02-arquitectura-y-contratos.md` para contratos.
- `PLAN/06-estrategia-testing.md` para criterios globales.

## Definición de avance

- Avance real = código + pruebas en verde + checklist actualizado.
