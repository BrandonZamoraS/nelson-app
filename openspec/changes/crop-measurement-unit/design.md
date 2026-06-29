# Crop Measurement Unit Design

## Technical Approach
Add `measurement_unit` as a database-owned crop invariant, flow it through existing WA edge-function response contracts, and let n8n render labels dynamically. No unit conversion or new yield math is introduced.

## Architecture Decisions
| Topic | Choice | Alternatives | Rationale |
|---|---|---|---|
| Immutability | DB trigger blocks updates to `crops.measurement_unit`; `wa_update_crop` also rejects the field. | App-only validation. | Service-role functions can bypass RLS; the invariant belongs in Postgres. |
| Data type | `text not null default 'kg'` with trimmed non-empty/length check, while the API allowlist currently permits `kg`, `lb`, `quintal`, `cajuela`. | Postgres enum or fully open text input. | Keeps DB storage simple while documenting the safer API-level allowlist explicitly requested by the owner. |
| Report math | Add labels/metadata only. | Convert quantities. | Existing report functions are money-based; conversion would invent domain rules. |
| n8n artifact | Save user script at `docs/n8n/crop-html-report-code-node.js`. | Keep script outside repo. | User explicitly wants PR-visible preservation. |

## Data Flow
```text
wa_create_crop body.measurement_unit? ──→ crops.measurement_unit default kg
                                           │
getCropOwnedByUser/list/finalize/report ──┴──→ WA JSON responses ──→ n8n HTML labels
```

## File Changes
| File | Action | Description |
|---|---|---|
| `supabase/migrations/*_add_crop_measurement_unit.sql` | Create | Add column, check constraint, immutable trigger/function. |
| `supabase/functions/_shared/wa.ts` | Modify | Extend `CropRow`, shared select, optional unit parser helper if reused. |
| `supabase/functions/wa_create_crop/index.ts` | Modify | Parse optional `measurement_unit`, default `kg`, insert/select/audit it. |
| `supabase/functions/wa_update_crop/index.ts` | Modify | Return `400 measurement_unit_immutable` if field is present. |
| `supabase/functions/wa_list_crops/index.ts` | Modify | Include unit in select/response. |
| `supabase/functions/wa_finalize_crop/index.ts` | Modify | Include unit in final crop response. |
| `supabase/functions/wa_crop_report_data/index.ts` | Modify | Include `crop.measurement_unit` and top-level `measurement_unit`. |
| `supabase/functions/wa_crop_budget_status/index.ts` | Modify | Include crop id/unit in budget status response. |
| `supabase/functions/wa_compare_finished_crops_costs/index.ts` | Modify | Include per-crop units; do not collapse to one unit. |
| `tests/integration/*.test.ts` | Modify | Add contract coverage for migration, immutability, function fields. |
| `WA_API.md`, `DEPLOY.md` | Modify | Document unit input/output and migration/deploy notes. |
| `docs/n8n/crop-html-report-code-node.js` | Create | Save and update the provided Code node script. |

## Interfaces / Contracts
```ts
type CropMeasurementUnit = "kg" | "lb" | "quintal" | "cajuela";

// create crop body
{ measurement_unit?: CropMeasurementUnit } // default: "kg"

// report payload convenience
{ crop: { measurement_unit: string }, measurement_unit: string }
```

SQL invariant: column default `kg`; check `length(trim(measurement_unit)) between 1 and 32`; `before update` trigger raises if `old.measurement_unit is distinct from new.measurement_unit`.

## Testing Strategy
| Layer | What to Test | Approach |
|---|---|---|
| Integration contracts | Migration adds default/check/trigger; WA functions expose unit. | Extend existing file-text contract tests. |
| Function behavior | Create defaults/custom unit; update rejects unit change. | Existing edge-function contracts or focused tests if harness exists. |
| n8n script | Visible labels interpolate `measurement_unit ?? 'kg'`. | Executable script test with mocked `$input` plus saved-script contract checks. |

## Implementation Handoff
1. Add migration + contract tests first (`tests/integration/crops-budget-contract.test.ts`).
2. Update shared crop type/select and crop CRUD functions.
3. Update report functions to emit unit metadata without changing totals.
4. Save provided n8n script to `docs/n8n/crop-html-report-code-node.js`; replace visible hard-coded `kg` labels with a sanitized `measurementUnit` fallback.
5. Update WA/deploy docs and run `npm test`.

### Apply Slices
| Slice | Goal | Files | Acceptance | Verification |
|---|---|---|---|---|
| 1 | DB invariant | migration, `tests/integration/crops-budget-contract.test.ts` | default/custom/immutable are specified | `npm test -- tests/integration/crops-budget-contract.test.ts` |
| 2 | WA CRUD | `_shared/wa.ts`, create/update/list/finalize | unit created, returned, not updated | `npm test -- tests/integration/wa-agent-edge-functions-contract.test.ts` |
| 3 | Reports+n8n | report functions, `docs/n8n/...`, docs | report labels can use unit | `npm test` + manual n8n diff review |

## Review Workload Forecast
- Estimated changed lines: 450-700, mainly because the full n8n script is new.
- 400-line budget risk: High.
- Chained PRs recommended: Yes — slice 1+2 first, n8n/docs second.
- Decision needed before apply: Yes, unless owner accepts `size:exception`.

## Migration / Rollout
Run `supabase db push`, deploy affected WA functions, then update the n8n workflow with the saved Code node script.

## Open Questions
- [x] Unit allowlist documented for this change: `kg`, `lb`, `quintal`, `cajuela`.
