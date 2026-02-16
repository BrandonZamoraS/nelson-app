# Supabase Edge Functions Deploy (WhatsApp Agent)

Estas Edge Functions (Deno) implementan un agente de WhatsApp multi-usuario usando SOLO las tablas existentes:
`users`, `subscriptions`, `app_settings`, `crops`, `expenses`, `expenses_type`, `audit_logs`.

## Requisitos

- Supabase CLI instalado.
- Acceso al proyecto Supabase (project ref).
- Secrets configurados en Supabase: `AGENT_TOOL_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 1) Login y link del proyecto

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

## 2) Configurar secrets (una vez)

```bash
supabase secrets set \
  --project-ref <PROJECT_REF> \
  AGENT_TOOL_KEY="<AGENT_TOOL_KEY>" \
  SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<SUPABASE_SERVICE_ROLE_KEY>"
```

## 3) Deploy de todas las funciones

Funciones:

- `wa_user_context`
- `wa_list_crops`
- `wa_create_crop`
- `wa_update_crop`
- `wa_delete_crop`
- `wa_finalize_crop`
- `wa_list_expense_types`
- `wa_list_expenses`
- `wa_create_expense`
- `wa_update_expense`
- `wa_delete_expense`

### Opcion A: deploy una por una

```bash
supabase functions deploy wa_user_context --no-verify-jwt
supabase functions deploy wa_list_crops --no-verify-jwt
supabase functions deploy wa_create_crop --no-verify-jwt
supabase functions deploy wa_update_crop --no-verify-jwt
supabase functions deploy wa_delete_crop --no-verify-jwt
supabase functions deploy wa_finalize_crop --no-verify-jwt
supabase functions deploy wa_list_expense_types --no-verify-jwt
supabase functions deploy wa_list_expenses --no-verify-jwt
supabase functions deploy wa_create_expense --no-verify-jwt
supabase functions deploy wa_update_expense --no-verify-jwt
supabase functions deploy wa_delete_expense --no-verify-jwt
```

### Opcion B: deploy con loop (bash)

```bash
for f in \
  wa_user_context wa_list_crops wa_create_crop wa_update_crop wa_delete_crop wa_finalize_crop \
  wa_list_expense_types wa_list_expenses wa_create_expense wa_update_expense wa_delete_expense
do
  supabase functions deploy "$f" --no-verify-jwt
done
```

### Opcion C: deploy con loop (PowerShell)

```powershell
$funcs = @(
  "wa_user_context",
  "wa_list_crops","wa_create_crop","wa_update_crop","wa_delete_crop","wa_finalize_crop",
  "wa_list_expense_types","wa_list_expenses","wa_create_expense","wa_update_expense","wa_delete_expense"
)
foreach ($f in $funcs) { supabase functions deploy $f --no-verify-jwt }
```

## 4) Aplicar migration de compatibilidad (recomendado)

Hay una migration minima para corregir el tipo de `public.expenses.crop_id` a `bigint` (idempotente):

- `supabase/migrations/20260215093000_fix_expenses_crop_id_bigint.sql`

Aplicala con tu pipeline normal, o con Supabase CLI:

```bash
supabase db push
```

## Endpoints

URL base:

```text
https://<PROJECT_REF>.functions.supabase.co/<function-name>
```

Headers obligatorios:

- `x-agent-key: <AGENT_TOOL_KEY>`
- `x-wa-phone: +15551234567` (E.164, se normaliza a `+` + digitos)
- `content-type: application/json` (para requests con body)

## Smoke tests (curl)

Define variables:

```bash
export PROJECT_REF="<PROJECT_REF>"
export AGENT_TOOL_KEY="<AGENT_TOOL_KEY>"
export PHONE="+15551234567"
```

### 1) `wa_user_context`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_user_context" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE"
```

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_user_context" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "content-type: application/json" \
  -d "{\"phone\":\"$PHONE\"}"
```

### 2) `wa_list_crops`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_crops" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_list_crops" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

### 3) `wa_create_crop`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_create_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"description\":\"Maiz\",\"size\":1.5,\"start_date\":\"2026-02-01\"}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_create_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"description\":\"Tomate\",\"end_date\":\"2026-02-15\"}"
```

### 4) `wa_update_crop`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_update_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"description\":\"Maiz (actualizado)\"}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_update_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"end_date\":\"2026-03-01\"}"
```

### 5) `wa_finalize_crop`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_finalize_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_finalize_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"end_date\":\"2026-02-15\"}"
```

### 6) `wa_delete_crop`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_delete_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_delete_crop" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"id\":1}"
```

### 7) `wa_list_expense_types`

```bash
curl -sS "https://$PROJECT_REF.functions.supabase.co/wa_list_expense_types" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_list_expense_types" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

### 8) `wa_list_expenses`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_list_expenses" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_list_expenses" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1}"
```

### 9) `wa_create_expense`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_create_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"expense_type\":1,\"amount\":120.5,\"description\":\"Fertilizante\"}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_create_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"crop_id\":1,\"expense_type\":1,\"amount\":10}"
```

### 10) `wa_update_expense`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_update_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1,\"amount\":150}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_update_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1,\"description\":\"Fertilizante (actualizado)\",\"crop_id\":1}"
```

### 11) `wa_delete_expense`

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_delete_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"expense_id\":1}"
```

```bash
curl -sS -X POST "https://$PROJECT_REF.functions.supabase.co/wa_delete_expense" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/json" \
  -d "{\"id\":1}"
```
