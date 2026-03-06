# Deploy Supabase Edge Functions (WhatsApp Agent)

Este documento deja listo el deploy de:

- `wa_crop_budget_status`
- `wa_compare_finished_crops_costs`
- `wa_crop_report_data`

## Requisitos

- Supabase CLI instalado.
- Proyecto Supabase linkeado.
- Secrets configurados:
  - `AGENT_TOOL_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 1) Login y link

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

## 2) Set de secrets

```bash
supabase secrets set \
  --project-ref <PROJECT_REF> \
  AGENT_TOOL_KEY="<AGENT_TOOL_KEY>" \
  SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<SUPABASE_SERVICE_ROLE_KEY>"
```

## 3) Aplicar migrations

Incluye:

- `supabase/migrations/20260215093000_fix_expenses_crop_id_bigint.sql`
- `supabase/migrations/20260216083000_drop_crops_budget_amount_use_budget.sql`

Comando:

```bash
supabase db push
```

## 4) Deploy de funciones

```bash
supabase functions deploy wa_crop_budget_status --no-verify-jwt
supabase functions deploy wa_compare_finished_crops_costs --no-verify-jwt
supabase functions deploy wa_crop_report_data --no-verify-jwt
```

## 5) Smoke tests (curl)

Variables:

```bash
export PROJECT_REF="<PROJECT_REF>"
export AGENT_TOOL_KEY="<AGENT_TOOL_KEY>"
export PHONE="+15551234567"
export BASE_URL="https://$PROJECT_REF.functions.supabase.co"
```

Headers requeridos:

- `x-agent-key: $AGENT_TOOL_KEY`
- `x-wa-phone: $PHONE`

### A) `wa_crop_budget_status` (no JSON)

```bash
curl -sS -X POST "$BASE_URL/wa_crop_budget_status" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id=<CROP_ID>"
```

Campos a enviar en body:

- `crop_id` (requerido)

### B) `wa_compare_finished_crops_costs` (no JSON)

```bash
curl -sS -X POST "$BASE_URL/wa_compare_finished_crops_costs" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id_1=<CROP_ID_1>&crop_id_2=<CROP_ID_2_OPCIONAL>"
```

Campos a enviar en body:

- `crop_id_1` (requerido)
- `crop_id_2` (opcional)

### C) `wa_crop_report_data` (no JSON)

```bash
curl -sS -X POST "$BASE_URL/wa_crop_report_data" \
  -H "x-agent-key: $AGENT_TOOL_KEY" \
  -H "x-wa-phone: $PHONE" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data "crop_id=<CROP_ID>"
```

Campos a enviar en body:

- `crop_id` (requerido)
