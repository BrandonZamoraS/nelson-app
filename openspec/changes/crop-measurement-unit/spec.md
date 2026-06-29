# Crop Measurement Unit Molecular Spec

## Intent
Store a crop's measurement unit on the crop itself so WhatsApp reports and the n8n HTML report can label yield/price metrics with the crop-specific unit instead of hard-coded `kg`.

## Capability
- **Modified capability:** WhatsApp crop management/reporting.
- **External artifact:** n8n Code node script for crop HTML reports must be preserved in-repo and updated to use the crop unit for labels.

## Intended Behavior
- Nelson SHALL persist `crops.measurement_unit` as a required per-crop value.
- Nelson SHALL default `measurement_unit` to `kg` when crop creation omits it.
- Nelson SHALL accept `measurement_unit` only from the allowlist `kg | lb | quintal | cajuela` at crop creation.
- Nelson SHALL allow `measurement_unit` only at crop creation time.
- Nelson SHALL reject attempts to change a crop's `measurement_unit` after creation, with database enforcement as the source of truth.
- Crop list, create, finalize, budget-status, compare-costs, and report-data responses SHALL include the crop unit wherever crop/report data is returned.
- Report functions SHALL not perform unit conversion; existing money math remains unchanged.
- The n8n HTML report Code node script SHALL be saved under `docs/n8n/crop-html-report-code-node.js` and updated so visible `kg` labels use the report's `measurement_unit` fallbacking to `kg`.

## Acceptance Scenarios

### Scenario: Default unit on crop creation
- **GIVEN** a valid crop creation request without `measurement_unit`
- **WHEN** `wa_create_crop` inserts the crop
- **THEN** the database stores `measurement_unit = 'kg'`
- **AND** the response crop includes `measurement_unit: 'kg'`.

### Scenario: Custom unit on crop creation
- **GIVEN** a valid crop creation request with `measurement_unit = 'lb'`
- **WHEN** the crop is inserted
- **THEN** the stored and returned crop uses `lb`.

### Scenario: Unit cannot be changed
- **GIVEN** an existing crop with `measurement_unit = 'kg'`
- **WHEN** a caller sends `measurement_unit = 'lb'` to `wa_update_crop`
- **THEN** the function returns `400 measurement_unit_immutable`
- **AND** a direct database update is blocked by the immutable-unit trigger.

### Scenario: Reports expose unit for renderers
- **GIVEN** a crop with `measurement_unit = 'lb'`
- **WHEN** `wa_crop_report_data`, `wa_crop_budget_status`, or `wa_compare_finished_crops_costs` returns report data
- **THEN** the response includes the relevant crop unit(s)
- **AND** existing financial totals are unchanged.

### Scenario: n8n report labels are dynamic
- **GIVEN** report data with `measurement_unit = 'lb'`
- **WHEN** the saved n8n Code node script renders HTML
- **THEN** visible labels such as yield, price per unit, and cost per unit use `lb` instead of hard-coded `kg`.

## Minimal Affected Code Areas
- `supabase/migrations/*_add_crop_measurement_unit.sql`
- `supabase/functions/_shared/wa.ts`
- `supabase/functions/wa_create_crop/index.ts`
- `supabase/functions/wa_update_crop/index.ts`
- `supabase/functions/wa_list_crops/index.ts`
- `supabase/functions/wa_finalize_crop/index.ts`
- `supabase/functions/wa_crop_report_data/index.ts`
- `supabase/functions/wa_compare_finished_crops_costs/index.ts`
- `supabase/functions/wa_crop_budget_status/index.ts`
- `tests/integration/crops-budget-contract.test.ts`
- `tests/integration/wa-agent-edge-functions-contract.test.ts`
- `WA_API.md`, `DEPLOY.md`
- `docs/n8n/crop-html-report-code-node.js`

## Risks / Open Attention
- The current repo does not contain the user-provided n8n script; apply must save the provided script verbatim first, then update the copy.
- Comparing crops with different units should expose both units; do not imply a single shared yield unit.
- Forecast: likely near or above 400 changed lines if docs, tests, migration, functions, and full n8n script are in one PR. Chained PRs recommended unless owner accepts a size exception.
