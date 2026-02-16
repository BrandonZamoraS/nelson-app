# WhatsApp Agent API (Supabase Edge Functions)

Base URL:

```text
https://<PROJECT_REF>.functions.supabase.co
```

Auth interna (sin JWT):

- Header `x-agent-key` debe ser igual a `AGENT_TOOL_KEY` (secret en Supabase).
- Identidad de usuario: teléfono E.164 desde `x-wa-phone` (preferido) o `body.phone`.
- Normalización: se conserva solo `+` y dígitos (ej: `" +1 (555) 123-4567 "` -> `+15551234567`).

Formato de respuesta:

- Éxito: `{ "ok": true, ... }`
- Error: `{ "ok": false, "error": { "code": "...", "message": "...", "detail": ... } }`

Códigos de error comunes:

- `401 unauthorized`: `x-agent-key` inválido.
- `400 invalid_phone`: falta `x-wa-phone` o `body.phone` (o no es parseable).
- `404 user_not_found`: no existe `public.users` para ese `whatsapp`.
- `403 forbidden`: usuario existe pero no tiene acceso por `subscriptions` + `app_settings.grace_days`.
- `500 db_error` / `500 internal_error`: error interno o de base de datos.

Headers requeridos en casi todos los requests:

```text
x-agent-key: <AGENT_TOOL_KEY>
x-wa-phone: +15551234567
content-type: application/json
```

Notas para n8n:

- Usar node **HTTP Request**.
- Method: `POST` (recomendado para consistencia, aunque algunos endpoints aceptan `GET`).
- Authentication: none.
- Headers: `x-agent-key`, `x-wa-phone`, `content-type: application/json`.
- Body: JSON (raw).

Importante:

- Estas funciones están desplegadas con `verify_jwt=false`. Si llamas por error a un endpoint que exige JWT, verás:
  `401 Missing authorization header`.
- Asegúrate de usar `https://<PROJECT_REF>.functions.supabase.co/<function>` (no `...supabase.co/functions/v1/...`).

## Endpoints

### 1) `POST /wa_user_context`

Devuelve contexto del usuario (existencia, subscription, acceso). No requiere `allowed=true`.

Request body (opcional si usas `x-wa-phone`):

- `phone` (string)

Response:

- `exists` (boolean)
- `phone` (string)
- `user` (opcional): `{ id, full_name, whatsapp, email }`
- `subscription` (opcional): `{ id, plan, status, next_billing_date, amount_cents, currency }`
- `access`: `{ allowed, reason, grace_until? }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_user_context" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_user_context" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "content-type: application/json" \
  -d "{\"phone\":\"$PHONE\"}"
```

### 2) `POST /wa_list_crops`

Lista cultivos del usuario (`crops.user = user.id`), ordenado por `created_at desc`.

Response:

- `crops`: array de `{ id, created_at, description, size, start_date, end_date }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_crops" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_crops" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"phone\":\"$PHONE\"}"
```

### 3) `POST /wa_create_crop`

Crea cultivo para el usuario (inserta con `user = user.id`).

Request body:

- `description` (string|null, opcional)
- `size` (number|null, opcional)
- `start_date` (YYYY-MM-DD|null, opcional)
- `end_date` (YYYY-MM-DD|null, opcional)

Response:

- `crop`: `{ id, created_at, description, size, start_date, end_date }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_create_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"description\":\"Maiz\",\"size\":1.5,\"start_date\":\"2026-02-01\"}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_create_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"description\":\"Tomate\",\"end_date\":\"2026-02-15\"}"
```

### 4) `POST /wa_update_crop`

Actualiza cultivo solo si pertenece al usuario.

Request body:

- `crop_id` (number|string, requerido)
- `description` (string|null, opcional)
- `size` (number|null, opcional)
- `start_date` (YYYY-MM-DD|null, opcional)
- `end_date` (YYYY-MM-DD|null, opcional)

Response:

- `crop`: `{ id, created_at, description, size, start_date, end_date }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_update_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"description\":\"Maiz (actualizado)\"}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_update_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"end_date\":\"2026-03-01\"}"
```

### 5) `POST /wa_delete_crop`

Elimina cultivo solo si pertenece al usuario. OJO: por FK en DB también eliminará gastos asociados al crop.

Request body:

- `crop_id` (number|string, requerido) o `id`

Response:

- `deleted`: `{ id }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_delete_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_delete_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"id\":1}"
```

### 6) `POST /wa_finalize_crop`

Finaliza cultivo: setea `end_date`. Si no viene `end_date`, usa hoy (UTC).

Request body:

- `crop_id` (number|string, requerido)
- `end_date` (YYYY-MM-DD, opcional)

Response:

- `crop`: `{ id, created_at, description, size, start_date, end_date }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_finalize_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_finalize_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"end_date\":\"2026-02-15\"}"
```

### 7) `POST /wa_list_expense_types`

Lista catálogo de tipos de gasto.

Response:

- `expense_types`: array de `{ id, created_at, description }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_expense_types" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_expense_types" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"phone\":\"$PHONE\"}"
```

### 8) `POST /wa_list_expenses`

Lista gastos del usuario. Si envías `crop_id`, valida pertenencia y filtra.
Incluye `expense_type_description` (join lógico contra `expenses_type`).

Request body:

- `crop_id` (number|string, opcional)

Response:

- `expenses`: array de `{ id, created_at, description, amount, crop_id, expense_type, expense_type_description }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_expenses" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_expenses" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

### 9) `POST /wa_create_expense`

Crea gasto. Valida:

- `amount > 0`
- `crop_id` pertenece al usuario (`crops.user = user.id`)
- `expense_type` existe en `expenses_type`

Request body:

- `crop_id` (number|string, requerido)
- `expense_type` (number|string, requerido)
- `amount` (number, requerido, > 0)
- `description` (string|null, opcional)

Response:

- `expense`: `{ id, created_at, description, amount, crop_id, expense_type }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_create_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"expense_type\":1,\"amount\":120.5,\"description\":\"Fertilizante\"}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_create_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"expense_type\":1,\"amount\":10}"
```

### 10) `POST /wa_update_expense`

Actualiza gasto solo si pertenece al usuario (pertenencia validada via crop).
Permite cambiar `description`, `amount`, `expense_type`, `crop_id` con validaciones.

Request body:

- `expense_id` (number|string, requerido)
- `description` (string|null, opcional)
- `amount` (number, opcional, > 0)
- `expense_type` (number|string|null, opcional; si es null se setea null)
- `crop_id` (number|string, opcional; debe pertenecer al usuario)

Response:

- `expense`: `{ id, created_at, description, amount, crop_id, expense_type }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_update_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1,\"amount\":150}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_update_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1,\"description\":\"Fertilizante (actualizado)\",\"crop_id\":1}"
```

### 11) `POST /wa_delete_expense`

Elimina gasto solo si pertenece al usuario.

Request body:

- `expense_id` (number|string, requerido) o `id`

Response:

- `deleted`: `{ id }`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_delete_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1}"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_delete_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"id\":1}"
```
