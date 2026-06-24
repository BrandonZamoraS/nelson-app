# Flujo de suscripciones proveedor-agnostico

Este documento define el flujo objetivo para suscripciones en Nelson. La integracion con proveedores de pago vive fuera de la app, en n8n. Nelson recibe eventos limpios, idempotentes y proveedor-agnosticos, y aplica cambios transaccionales sobre `subscriptions` y `payments`.

## Decision Principal

Nelson no se acopla a Stripe, Mercado Pago, bancos ni pasarelas especificas. n8n traduce cualquier proveedor externo a un contrato canonico. La base de datos y la app solo conocen eventos normalizados.

## Problemas A Blindar

| Problema | Por que rompe | Solucion recomendada | Estado |
| --- | --- | --- | --- |
| Cambios concurrentes de estado | Dos procesos pueden leer el mismo estado viejo y el ultimo update gana. | Una funcion transaccional bloquea la suscripcion y aplica eventos uno por uno. | Definido. |
| Webhooks o reintentos duplicados | El mismo pago puede registrarse dos veces y avanzar dos meses. | `idempotency_key` unica en eventos canonicos; duplicado devuelve exito sin efectos nuevos. | Definido. |
| Flujo manual separado del automatico | Admin y n8n pueden aplicar reglas distintas. | Toda accion entra como evento canonico y usa el mismo procesador. | Definido. |
| Pago atrasado o adelantado | Si se calcula desde `paid_at`, se deforma el ciclo del cliente. | Sumar un mes desde el `next_billing_date` anterior. | Definido. |
| Suscripcion terminada o vencida recibe pago | Si se usa el vencimiento anterior, el cliente podria pagar por un periodo ya perdido. | Permitir retomar, pero el nuevo vencimiento se calcula desde `paid_at` por un mes completo. | Definido. |
| Borrar usuario y recrear telefono | Se puede mezclar historial o perder trazabilidad financiera. | El WhatsApp retoma el historial anterior mediante soft delete/desactivacion y reactivacion controlada. | Definido. |
| Monto incorrecto | Se activa una cuenta con pago parcial o equivocado. | Crear pago como `pending_review` o evento rechazado; no avanzar vencimiento automaticamente. | Pendiente de decision. |
| Reembolso despues de renovar | Si se revierte automaticamente, se puede quitar acceso incorrectamente. | Registrar reembolso como hecho financiero; no revertir vencimiento sin decision manual. | Recomendado. |
| Eventos fuera de orden | Un evento viejo puede pisar estado nuevo. | Guardar `occurred_at`, procesar pagos idempotentes, y no permitir que eventos viejos cambien estados terminales. | Recomendado. |
| Suscripcion sin vencimiento | No hay base para sumar un mes. | Rechazar pago automatico y mandar a conciliacion; solo la creacion inicial puede establecer la primera fecha. | Recomendado. |
| Fechas 29, 30 y 31 | Algunos meses no tienen el mismo dia. | Usar regla calendario simple: caer al ultimo dia valido del mes siguiente. | Definido. |

## Politicas Recomendadas

| Area | Politica |
| --- | --- |
| Idempotencia | `idempotency_key` es obligatoria para eventos de n8n y manuales generados por UI. |
| Fuente | `source` describe el canal (`n8n`, `manual`, `system`), no el proveedor real. |
| Pago exitoso | Registra `payments`, pone `subscriptions.status = 'activa'` y calcula el vencimiento segun si continua ciclo o retoma servicio. |
| Monto esperado | Para alta automatica inicial usa `app_settings.initial_subscription_amount_cents`; para recurrencias manuales usa `subscriptions.amount_cents`. |
| Pago fallido | Registra evento/pago fallido, pero no suspende ni mueve a gracia por si solo. La gracia/suspension debe venir de una regla separada de vencimiento. |
| Reembolso | Registra un hecho financiero; no cambia vencimiento ni estado automaticamente. |
| Retomar servicio | Si la suscripcion esta `terminada` o vencida, un pago exitoso puede reactivarla por un mes desde `paid_at`. |
| Borrado | No hacer hard delete de usuarios con historial financiero; usar cuenta desactivada y reactivar el historial si vuelve el mismo WhatsApp. |
| Conciliacion | Casos ambiguos no se adivinan: quedan rechazados/auditados o pendientes de revision manual. |
| Precio inicial automatico | `app_settings.initial_subscription_amount_cents = 2000` (`USD 20.00`). |

## Flujo Feliz

1. n8n recibe o calcula un evento limpio de pago.
2. n8n envia el evento canonico a Nelson con una `idempotency_key` unica.
3. Nelson inserta el evento en una tabla de eventos con restriccion unica.
4. Nelson bloquea la suscripcion dentro de una transaccion.
5. Nelson registra el pago en `payments`.
6. Nelson actualiza `subscriptions.status` y `subscriptions.next_billing_date` si corresponde.
7. Si llega el mismo evento otra vez, Nelson no duplica efectos.

## Contrato Canonico De Entrada

| Campo | Requerido | Decision |
| --- | --- | --- |
| `idempotency_key` | Si | Identificador unico del evento ya normalizado por n8n. |
| `event_type` | Si | Tipo de evento canonico. |
| `subscription_id` | Preferido | Identifica directamente la suscripcion. |
| `user_id` | Alternativo | Se usa solo si no hay `subscription_id`. |
| `plan` | Opcional | Para alta automatica inicial puede omitirse si solo existe un precio fijo. |
| `amount_cents` | Para pagos | Monto limpio en centavos. |
| `currency` | Para pagos | Por ahora `USD`, consistente con el schema actual. |
| `occurred_at` | Si | Momento real del evento limpio. |
| `paid_at` | Para pago exitoso | Momento de pago confirmado. |
| `source` | Si | `n8n`, `manual` o `system`; no debe ser nombre de proveedor. |
| `metadata` | Opcional | JSONB con datos secundarios ya normalizados, nunca como fuente principal de reglas. |

## Tipos De Evento

| Evento | Efecto esperado |
| --- | --- |
| `payment_succeeded` | Registra pago, activa suscripcion y avanza vencimiento un mes. |
| `payment_failed` | Registra intento fallido; no cambia estado automaticamente. |
| `payment_refunded` | Registra reembolso; no debe borrar el pago original. |
| `subscription_cancelled` | Termina la suscripcion de forma terminal o programada segun decision pendiente. |
| `manual_status_change` | Cambia estado por decision administrativa, usando la misma validacion transaccional. |
| `account_deleted` | Cierra acceso y preserva historial financiero/auditable. |

## Regla De Renovacion

El proximo vencimiento se calcula desde el vencimiento anterior, no desde la fecha de pago, cuando la suscripcion sigue dentro de su ciclo activo. Si la suscripcion estaba terminada o vencida, retomar servicio crea un nuevo mes desde la fecha de pago.

| Caso | Resultado |
| --- | --- |
| Vence `2026-06-10`, paga `2026-06-10` | Nuevo vencimiento `2026-07-10`. |
| Vence `2026-06-10`, paga `2026-06-15` | Nuevo vencimiento `2026-07-10`. |
| Vence `2026-06-10`, paga `2026-06-01` | Nuevo vencimiento `2026-07-10`. |
| Terminada o vencida, paga `2026-06-15` | Nuevo vencimiento `2026-07-15`. |

Para fechas 29, 30 y 31 se acepta la regla calendario simple: si el mes siguiente no tiene el mismo dia, el vencimiento cae en el ultimo dia valido de ese mes. Ejemplo: `2026-01-31 + 1 month = 2026-02-28`.

## Regla De Monto Esperado

El monto esperado no lo decide n8n. n8n solo informa el monto pagado ya normalizado. Nelson resuelve el precio esperado de dos maneras:

- Para el primer pago automatico, cuando todavia no existe suscripcion, usa `app_settings.initial_subscription_amount_cents`.
- Para recurrencias manuales o suscripciones existentes, usa `subscriptions.amount_cents` leido dentro de la transaccion con la suscripcion bloqueada.

Esto evita que n8n pueda crear suscripciones con precios arbitrarios. Como el alta automatica inicial solo vende un mes a precio fijo para todos, no hace falta un catalogo de planes todavia. El precio vive en base de datos para que la RPC transaccional pueda validarlo sin depender de una constante de TypeScript.

Reglas:

- Si `event.amount_cents = subscriptions.amount_cents`, el pago puede aplicar normalmente.
- Si `event.amount_cents < subscriptions.amount_cents`, el evento queda `pending_review` y no avanza vencimiento automaticamente.
- Si `event.amount_cents > subscriptions.amount_cents`, el evento queda `pending_review` y no avanza vencimiento automaticamente hasta definir si es adelanto, error o ajuste manual.
- Si hubo cambio de plan, se usa el monto de la suscripcion bloqueada al momento de procesar el evento.
- Si no existe suscripcion y `event.amount_cents` no coincide con el precio fijo inicial, el evento queda `pending_review` y no crea suscripcion automaticamente.
- Si se necesita congelar precio por periodo en el futuro, se debe agregar un concepto de factura/cargo esperado antes de aceptar pagos contra montos historicos.
- Si en el futuro existen varios precios automaticos, recien ahi conviene agregar `subscription_plans`.

## Alta Automatica Por Primer Pago

El primer pago automatico puede crear usuario y suscripcion si el evento trae datos suficientes y validos. Nelson debe seguir siendo la autoridad de precio y estado.

Datos minimos para alta automatica:

| Campo | Uso |
| --- | --- |
| `whatsapp` | Identidad de continuidad del usuario. |
| `full_name` | Nombre inicial del usuario si no existe. |
| `plan` | Opcional; puede fijarse internamente como `manual` o `initial_month`. |
| `amount_cents` | Monto pagado, validado contra el plan. |
| `paid_at` | Base para el primer `start_date` y `next_billing_date`. |
| `idempotency_key` | Evita doble alta por reintento de n8n. |

Flujo:

1. Insertar evento con `idempotency_key` unica.
2. Buscar usuario por `whatsapp`.
3. Si existe desactivado, reactivarlo y retomar historial.
4. Si no existe, crearlo con los datos limpios del evento.
5. Buscar suscripcion existente del usuario.
6. Si no existe, validar `amount_cents` contra el precio fijo inicial de Nelson.
7. Crear suscripcion con `status = 'activa'`, `start_date = paid_at::date`, `next_billing_date = paid_at::date + 1 month`, `amount_cents` igual al precio fijo inicial y `source = 'n8n'`.
8. Crear pago asociado al evento.
9. Marcar evento como `processed`.

Si el usuario ya existe con suscripcion vigente, el evento no crea otra suscripcion: se procesa como pago de renovacion normal.

## Modelo De Concurrencia

La operacion de aplicar eventos debe ser una funcion transaccional en Postgres o una RPC equivalente. No alcanza con hacer `read -> validate -> update` desde TypeScript, porque dos procesos concurrentes pueden validar contra el mismo estado viejo.

Reglas minimas:

- Insertar primero el evento con `idempotency_key` unica.
- Si la insercion indica duplicado, devolver el resultado previo o un exito idempotente sin efectos nuevos.
- Bloquear la fila de `subscriptions` antes de calcular el nuevo estado.
- Crear o actualizar `payments` dentro de la misma transaccion.
- Actualizar `subscriptions` dentro de la misma transaccion.
- Auditar el resultado del evento, incluyendo duplicados e intentos rechazados.

## Cambios De Schema Propuestos

| Area | Cambio |
| --- | --- |
| Eventos | Crear `subscription_events` o `billing_events` con `idempotency_key` unica. |
| Eventos | Guardar `event_type`, `source`, `subscription_id`, `user_id`, `amount_cents`, `currency`, `occurred_at`, `processed_at`, `status`, `error_code`, `metadata`. |
| Configuracion | Agregar `app_settings.initial_subscription_amount_cents` como precio fijo de alta automatica inicial. |
| Pagos | Agregar `event_id` nullable con referencia al evento procesado. |
| Pagos | Agregar unicidad para pagos normalizados, idealmente `unique(event_id)` y mantener `external_ref` solo como referencia limpia opcional. |
| Suscripciones | Mantener `status` y `next_billing_date` como estado actual derivado. |
| Usuarios | Agregar soporte para soft delete/desactivacion y reactivacion por WhatsApp. |
| Auditoria | Registrar accion, resultado, estado previo y estado final sin guardar payloads sensibles. |
| Borrado de cuenta | Usar soft delete o estado desactivado; no borrar historiales financieros. |

## Procesador Transaccional

El procesador debe vivir en Postgres como funcion RPC o en una capa que garantice una unica transaccion real. La opcion recomendada es RPC porque permite `select ... for update` sobre `subscriptions` y evita que la aplicacion arme una pseudo-transaccion con varias llamadas HTTP.

Pseudoflujo:

1. Validar payload canonico antes de llamar la RPC.
2. Insertar `subscription_events` con `idempotency_key` unica.
3. Si ya existe, devolver resultado idempotente sin efectos nuevos.
4. Resolver `subscription_id` desde `subscription_id` o `user_id`.
5. Bloquear la fila de `subscriptions` con `for update`.
6. Validar reglas del evento contra estado actual bloqueado.
7. Insertar `payments` si el evento representa un hecho financiero.
8. Actualizar `subscriptions` si el evento tiene efecto de estado o vencimiento.
9. Marcar evento como `processed`, `ignored`, `rejected` o `pending_review`.
10. Escribir auditoria de exito o rechazo.

## Estados Y Transiciones

| Desde | Hacia permitido | Observacion |
| --- | --- | --- |
| `activa` | `gracia`, `suspendida`, `terminada` | Pago exitoso conserva o vuelve a `activa`. |
| `gracia` | `activa`, `suspendida`, `terminada` | Pago exitoso vuelve a `activa`. |
| `suspendida` | `activa`, `terminada` | Pago exitoso puede reactivar. |
| `terminada` | `activa` | Pago exitoso puede retomar servicio con nuevo ciclo desde `paid_at`. |

## Reglas Por Evento

| Evento | Si estado actual | Resultado |
| --- | --- | --- |
| `payment_succeeded` | `activa`, `gracia`, `suspendida` | Registrar pago, poner `activa`, sumar un mes desde vencimiento anterior. |
| `payment_succeeded` | `terminada` o vencida | Registrar pago, poner `activa`, sumar un mes desde `paid_at`. |
| `payment_succeeded` | Sin suscripcion, con usuario/WhatsApp y monto inicial correcto | Crear o reactivar usuario, crear suscripcion y registrar primer pago. |
| `payment_succeeded` | Monto distinto al esperado | Marcar `pending_review`; no cambiar vencimiento ni estado automaticamente. |
| `payment_failed` | Cualquiera no terminal | Registrar intento fallido; no cambiar estado por si solo. |
| `payment_refunded` | Cualquiera | Registrar reembolso y auditar; no revertir vencimiento ni estado automaticamente. |
| `subscription_cancelled` | `activa`, `gracia`, `suspendida` | Pasar a `terminada` y limpiar `next_billing_date`. |
| `subscription_cancelled` | `terminada` | Idempotente; sin efectos nuevos. |
| `manual_status_change` | Segun matriz | Aplicar solo si la transicion es valida. |
| `account_deleted` | Cualquiera | Desactivar cuenta y terminar suscripcion sin borrar historial. |

## Casos Edge A Resolver

| Caso | Riesgo | Regla propuesta |
| --- | --- | --- |
| Webhook duplicado | Doble pago y doble avance de vencimiento. | `idempotency_key` unica y efecto idempotente. |
| Dos pagos al mismo tiempo | Avance incorrecto del vencimiento. | Lock transaccional de la suscripcion; procesar uno por vez. |
| Pago atrasado | El ciclo se corre si se usa fecha de pago. | Sumar un mes desde `next_billing_date` anterior. |
| Pago adelantado | El usuario podria perder dias si se usa fecha actual. | Sumar un mes desde `next_billing_date` anterior. |
| Pago de monto incorrecto | Activacion indebida o deuda mal calculada. | Comparar contra `subscriptions.amount_cents`; si no coincide, marcar `pending_review`. |
| Pago sin suscripcion | Puede ser alta automatica legitima o evento incompleto. | Crear suscripcion solo si trae WhatsApp y monto fijo inicial correcto; si no, marcar `pending_review`. |
| Suscripcion sin `next_billing_date` | No hay base para renovar. | Requerir fecha o usar `start_date` solo en creacion inicial. |
| Suscripcion terminada recibe pago | Si se usa fecha vieja, el usuario paga por tiempo vencido. | Reactivar con nuevo vencimiento de un mes desde `paid_at`. |
| Cancelar y luego retomar | Puede romper historial si se reutiliza mal. | Mantener la misma suscripcion, registrar evento de retoma y calcular desde `paid_at`. |
| Borrar cuenta y recrear mismo numero | Si se crea otra identidad, se fragmenta historial financiero y auditoria. | El mismo WhatsApp debe reactivar la cuenta previa y retomar historial anterior. |
| Cambio manual mientras entra pago | Last-write-wins. | Todas las acciones pasan por el mismo procesador transaccional. |
| Reembolso despues de renovar | El vencimiento ya avanzo. | Registrar reembolso y auditar; no revertir estado/vencimiento automaticamente. |
| Falla de n8n y reintento | Duplicados parciales. | n8n debe reintentar con la misma `idempotency_key`. |
| Evento fuera de orden | Pago viejo llega despues de uno nuevo. | Guardar `occurred_at` y decidir si eventos viejos pueden afectar estado actual. |
| Cambio de plan antes del pago | Monto esperado cambia. | El evento debe compararse contra una version o monto esperado. |
| Zona horaria | Vencimientos cambian por conversiones. | Guardar fechas de vencimiento como `date`; timestamps solo para ocurrencia. |

## Decisiones Pendientes

No quedan decisiones de negocio abiertas para la primera implementacion. Si aparecen nuevos casos durante la implementacion, deben agregarse aqui antes de codificar reglas nuevas.

## Handoff Para Otro Agente

El agente que implemente debe aplicar cambios en slices pequenos y verificables. No debe empezar por UI. Primero se blinda el dominio y la base de datos.

### Slice 1: Contrato Y Tests De Dominio

**Archivos:**

- Crear: `lib/domain/subscription-events.ts`
- Crear: `lib/validators/subscription-events.ts`
- Crear: `tests/unit/subscription-events.test.ts`

**Pasos:**

1. Crear tipos canonicos de evento.
2. Crear funcion pura para calcular siguiente vencimiento desde vencimiento anterior o desde `paid_at` cuando retoma servicio.
3. Crear funcion pura para clasificar efectos esperados por evento y estado actual.
4. Agregar tests para pago exitoso, pago duplicado conceptual, terminada con pago, pago fallido y reembolso.
5. Agregar tests para fechas 29, 30 y 31 usando la regla de ultimo dia valido.
6. Ejecutar `npm run test:unit`.

### Slice 2: Migracion De Eventos E Idempotencia

**Archivos:**

- Crear: `supabase/migrations/<timestamp>_subscription_events.sql`
- Modificar: `lib/types/database.ts`
- Crear o modificar: `tests/integration/subscription-events-migration-contract.test.ts`

**Pasos:**

1. Crear tabla `subscription_events` con `idempotency_key` unica.
2. Agregar campos de estado de procesamiento: `processed`, `ignored`, `rejected`, `pending_review`.
3. Agregar `initial_subscription_amount_cents` a `app_settings` con constraint positivo y valor inicial `2000`.
4. Agregar FK opcional a `subscriptions` y `users`.
5. Agregar `event_id` a `payments` con FK opcional y `unique(event_id)`.
6. Agregar indices para `subscription_id`, `user_id`, `occurred_at` y eventos pendientes.
7. Ejecutar `npm run test:integration`.

### Slice 3: RPC Transaccional

**Archivos:**

- Modificar: migracion del Slice 2 o crear una nueva migracion RPC.
- Crear: `tests/integration/subscription-event-rpc-contract.test.ts`

**Pasos:**

1. Implementar funcion Postgres para aplicar evento canonico.
2. Usar `insert ... on conflict` o manejo de unique violation para idempotencia.
3. Usar `select ... for update` sobre `subscriptions`.
4. Insertar `payments` dentro de la misma transaccion.
5. Actualizar `subscriptions` dentro de la misma transaccion.
6. Crear usuario/suscripcion desde primer pago automatico cuando el evento tenga WhatsApp y monto inicial correcto.
7. Marcar eventos ambiguos como `pending_review` o `rejected`.
8. Agregar tests de contrato SQL para asegurar que existen locks, constraints e indices.

### Slice 4: Capa De Datos Y Endpoint n8n

**Archivos:**

- Crear: `lib/data/subscription-events.ts`
- Crear: `app/api/subscription-events/route.ts`
- Modificar: `lib/actions/private-actions.ts`

**Pasos:**

1. Crear wrapper TypeScript que valida payload y llama RPC.
2. Crear endpoint POST proveedor-agnostico para n8n.
3. Cambiar acciones manuales para generar eventos canonicos en vez de mutar estado directo.
4. Mantener compatibilidad UI minima sin agregar pantallas nuevas todavia.
5. Ejecutar `npm run typecheck` y `npm run test`.

### Slice 4.5: Reactivacion Por WhatsApp

**Archivos:**

- Modificar: `lib/data/users.ts`
- Modificar: `lib/validators/users.ts` si se agregan estados de cuenta.
- Modificar: `lib/types/database.ts`
- Crear o modificar: tests de usuarios correspondientes.

**Pasos:**

1. Cambiar el modelo de baja para desactivar usuario en vez de borrarlo cuando tenga historial financiero.
2. Mantener `users.whatsapp` como identidad unica de continuidad.
3. Si se intenta crear un usuario con WhatsApp desactivado, reactivar ese usuario en vez de crear uno nuevo.
4. Registrar auditoria de reactivacion.
5. Crear o retomar suscripcion segun regla de retoma: nuevo ciclo desde `paid_at` si entra pago exitoso.
6. Ejecutar `npm run test:unit`, `npm run test:integration` y `npm run typecheck`.

### Slice 5: UI Y Conciliacion Minima

**Archivos:**

- Modificar: `app/(private)/suscripciones/page.tsx`
- Crear o modificar componentes si hace falta.

**Pasos:**

1. Mostrar estado de eventos pendientes o rechazados si existe informacion suficiente.
2. No exponer payloads tecnicos de n8n.
3. Permitir accion manual solo mediante eventos canonicos.
4. Ejecutar `npm run lint`, `npm run typecheck` y `npm run test`.

## Plan De Implementacion Propuesto

1. Crear contrato y validadores para eventos canonicos.
2. Agregar migracion con tabla de eventos e indices de idempotencia.
3. Implementar funcion transaccional de aplicacion de eventos.
4. Cambiar endpoints manuales para usar el mismo procesador.
5. Crear endpoint proveedor-agnostico para n8n.
6. Ajustar UI para mostrar pagos/eventos relevantes sin exponer ruido tecnico.
7. Agregar tests de idempotencia, concurrencia simulada y casos edge.

## Criterios De Aceptacion

- [ ] El mismo evento enviado dos veces no duplica pagos ni avanza dos veces el vencimiento.
- [ ] Dos eventos concurrentes sobre la misma suscripcion se aplican de forma deterministica.
- [ ] Un pago exitoso dentro del ciclo avanza el vencimiento desde la fecha anterior de vencimiento.
- [ ] Un pago exitoso sobre suscripcion terminada o vencida reactiva por un mes desde `paid_at`.
- [ ] Un pago con monto distinto a `subscriptions.amount_cents` queda en `pending_review` y no avanza vencimiento automaticamente.
- [ ] Un primer pago automatico solo crea suscripcion si trae WhatsApp y el monto coincide con el precio fijo inicial de Nelson.
- [ ] El precio fijo inicial migrado es `2000` centavos USD.
- [ ] Las fechas 29, 30 y 31 usan el ultimo dia valido si el mes siguiente no tiene ese dia.
- [ ] Una cuenta desactivada que vuelve con el mismo WhatsApp retoma el historial anterior.
- [ ] Los reembolsos quedan auditados y no revierten estado/vencimiento automaticamente.
- [ ] Los pagos fallidos quedan registrados y no mueven automaticamente a gracia.
- [ ] Eventos incompletos quedan `pending_review` y no crean entidades automaticamente.
- [ ] Acciones manuales y automatizadas usan el mismo motor de reglas.
- [ ] El contrato de n8n no contiene campos especificos de proveedores de pago.
- [ ] Los casos ambiguos quedan en estado de conciliacion o son rechazados con auditoria.
