# WhatsApp Agent API (Supabase Edge Functions)

Base URL:

`https://izhazpjzapckskkgayog.functions.supabase.co`

## Seguridad y contexto multiusuario

- Auth interna: header `x-agent-key` debe coincidir con secret `AGENT_TOOL_KEY`.
- Identidad de usuario: `x-wa-phone` (preferido) o `body.phone`.
- Normalizacion de telefono: se conserva `+` y digitos.
- Resolucion de usuario: `public.users.whatsapp = phone`.
- Acceso por suscripcion:
  - `activa`: permitido.
  - `gracia`: permitido si `hoy <= next_billing_date + app_settings.grace_days`.
  - `suspendida` o `terminada`: denegado (`403`).
- Aislamiento: solo cultivos propios (`public.crops.user = users.id`).
- Auditoria: `public.audit_logs` en todas las operaciones (`actor_admin_id = null`).

## Formato de respuesta

- Exito: `ok=true` con payload del endpoint.
- Error: `ok=false` con `error.code`, `error.message`, `error.detail` opcional.

## Headers recomendados

- `x-agent-key`
- `x-wa-phone`
- `content-type: application/json` para endpoints JSON.
- excepciones:
  - `wa_crop_budget_status`: `application/x-www-form-urlencoded` o `text/plain`.
  - `wa_compare_finished_crops_costs`: `application/x-www-form-urlencoded` o `text/plain`.
  - `wa_crop_report_data`: `application/x-www-form-urlencoded` o `text/plain`.

## Errores frecuentes

- `unauthorized`
- `invalid_phone`
- `user_not_found`
- `forbidden`
- `invalid_crop_id`
- `crop_not_found`
- `missing_budget`
- `crop_budget_missing`
- `invalid_budget`
- `invalid_crop_ids`
- `invalid_finished_crops`
- `missing_gross_profit`
- `invalid_gross_profit`
- `period_out_of_range`
- `db_error`
- `internal_error`

## Endpoints nuevos (reportes y presupuesto)

### `POST /wa_crop_budget_status`

Objetivo:

- Consultar presupuesto actual de un cultivo y su restante.
- Solo consulta estado de presupuesto por `crop_id`.

Body (campos):

- solo `crop_id` requerido.
- no usar JSON.

Response (campos):

- `crop`: `id`, `description`, `start_date`, `end_date`, `budget`.
- `spent_amount`: suma de `expenses.amount` del cultivo.
- `remaining_amount`: `budget - spent_amount`.
- `expense_summary`: lista por categoria con `expense_type.id`, `expense_type.description`, `total_amount`.

Reglas:

- Si el cultivo no pertenece al usuario: `crop_not_found`.
- Si el cultivo no tiene `budget`: `missing_budget`.

Smoke test:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_crop_budget_status" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id=<CROP_ID>"
```

Alternativa `text/plain`:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_crop_budget_status" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: text/plain" \
  --data "<CROP_ID>"
```

### `POST /wa_compare_finished_crops_costs`

Objetivo:

- Comparar costos de uno o dos cultivos terminados.
- No incluye presupuestos.

Body (campos):

- `crop_id_1` requerido.
- `crop_id_2` opcional.
- no usar JSON.

Response (campos):

- `items`: por cultivo `crop_id`, `description`, `end_date`, `total_spent`.
- `grand_total_spent`: suma global.

Reglas:

- Si algun id no pertenece al usuario o no esta terminado (`end_date` null), devuelve `400` sin parciales.
- `error.detail.failures` incluye ids y razon.

Smoke test:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_compare_finished_crops_costs" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id_1=<CROP_ID_1>&crop_id_2=<CROP_ID_2_OPCIONAL>"
```

Alternativa `text/plain`:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_compare_finished_crops_costs" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: text/plain" \
  --data "crop_id_1=<CROP_ID_1>&crop_id_2=<CROP_ID_2_OPCIONAL>"
```

### `POST /wa_crop_report_data`

Objetivo:

- Retornar toda la data para que n8n construya PDF.
- No genera PDF en la funcion.

Body (campos):

- solo `crop_id` requerido.
- no enviar `date_from`.
- no enviar `date_to`.

Response (campos):

- `report_type`: `partial` o `total`.
- `period`: `from`, `to` finales usados.
- `crop`: `id`, `description`, `size`, `start_date`, `end_date`, `budget`.
- `spent_amount`.
- `gross_profit`: valor bruto registrado al finalizar (o `null` si no existe).
- `net_profit`: `gross_profit - spent_amount` (o `null` si `gross_profit` no existe).
- `remaining_amount` si hay presupuesto.
- `category_totals`: lista por categoria de gasto.
- `expenses`: detalle con `created_at`, `description`, `amount`, `expense_type.id`, `expense_type.description`.

Reglas de periodo:

- Cultivo activo (`end_date` null): `partial`, rango `start_date..hoy`.
- Cultivo terminado: `total`, rango `start_date..end_date`.

Smoke test:

Importante de formato:

- para este endpoint no usar JSON.
- `content-type` permitido: `application/x-www-form-urlencoded` o `text/plain`.

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_crop_report_data" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id=<CROP_ID>"
```

Alternativa `text/plain`:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_crop_report_data" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: text/plain" \
  --data "<CROP_ID>"
```

## Endpoints existentes

- `POST /wa_user_context`
- `POST /wa_list_crops`
- `POST /wa_create_crop`
- `POST /wa_update_crop`
- `POST /wa_delete_crop`
- `POST /wa_finalize_crop`
- `POST /wa_list_expense_types`
- `POST /wa_list_expenses`
- `POST /wa_create_expense`
- `POST /wa_update_expense`
- `POST /wa_delete_expense`

### `POST /wa_finalize_crop`

Objetivo:

- Marcar cultivo como finalizado (`end_date`).
- Opcionalmente registrar `gross_profit` (ganancia bruta) al finalizar.

Body (JSON):

- `crop_id` requerido.
- `end_date` opcional (`YYYY-MM-DD`, por defecto hoy UTC).
- `gross_profit` requerido (numero `>= 0`).
- `ganancia_bruta` opcional (alias de `gross_profit`).

Smoke test:

```bash
curl -sS -X POST "https://izhazpjzapckskkgayog.functions.supabase.co/wa_finalize_crop" \
  -H "x-agent-key: <AGENT_TOOL_KEY>" \
  -H "x-wa-phone: <PHONE_E164>" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":<CROP_ID>,\"gross_profit\":125000.50}"
```

Tambien puedes usar el alias `ganancia_bruta`.

Notas para gastos (`wa_create_expense` y `wa_update_expense`):

- Si el cultivo no tiene presupuesto configurado, retorna `400 crop_budget_missing`.
- En exito, la respuesta incluye `budget_status` para informar al agente:
  - `crop_id`
  - `budget`
  - `total_spent`
  - `remaining_budget`
  - `over_budget`

Notas para finalizar cultivo (`wa_finalize_crop`):

- `end_date` sigue siendo opcional (`YYYY-MM-DD`, default: hoy UTC).
- `gross_profit` es obligatorio y debe ser numero `>= 0`.
- Tambien se acepta alias `ganancia_bruta` como entrada.
