# 07 - Definición de Done y Release

## Definition of Done (global)

Una fase se considera `done` cuando:

1. Cumple todo su `In scope`.
2. No introduce funcionalidades fuera de alcance de fase.
3. Pasa los tests definidos en el archivo de fase.
4. Pasa smoke de regresión indicado.
5. Actualiza checklist global y evidencia de fase.

## Definition of Done (producto v1)

Se considera listo para release cuando:

1. Todas las fases `F00..F08` están en `done`.
2. Todas las pantallas de `design.pen` están funcionales.
3. Existe auth admin y rutas privadas protegidas.
4. Existe gestión completa de usuarios/suscripciones.
5. Existe auditoría de mutaciones y pantalla de consulta.
6. Existe configuración completa persistente.
7. `lint`, `typecheck`, unit, integration y e2e están en verde.

## Checklist de release

- Variables de entorno documentadas.
- Migraciones versionadas y reproducibles.
- Seed base disponible para test y demo.
- Scripts de CI estables.
- README técnico actualizado.
- Reporte final de pruebas generado.

## Política de cierre

- No cerrar release con fases `blocked` o `testing`.
- Cualquier excepción debe quedar documentada en un `Known issue` explícito.
