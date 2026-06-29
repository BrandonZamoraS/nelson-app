## Completed Slices

- [x] Slice 1 — Added `crops.measurement_unit` migration with default `kg`, non-blank constraint, immutable trigger, and contract coverage.
- [x] Slice 2 — Propagated `measurement_unit` through shared crop types and WA crop create/update/list/finalize flows; update now rejects changes with `measurement_unit_immutable`.
- [x] Slice 3 — Added crop unit metadata to report responses, saved the repo-reviewed n8n Code node script copy, and documented deploy/API expectations.
- [x] Verify-repair slice — Added executable runtime tests for create/update/report behavior, added an executable n8n Code-node script test, documented the API allowlist in spec/design, and corrected coverage claims.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1. Migration + source contracts | `tests/integration/crops-budget-contract.test.ts` | Integration contract | ✅ Baseline `npx tsx --test tests/integration/crops-budget-contract.test.ts` passed | ✅ Added failing migration/source expectations first in the original apply batch | ✅ `npx tsx --test tests/integration/crops-budget-contract.test.ts` | ✅ Covers migration text plus CRUD/report source contracts | ✅ Shared parser extraction kept contracts green |
| 2. Measurement-unit parser allowlist | `tests/unit/crop-measurement-unit.test.ts` | Unit | N/A (new helper in original apply batch) | ✅ Added parser tests first | ✅ `npx tsx --test tests/unit/crop-measurement-unit.test.ts` | ✅ Missing/default + normalized allowlist + rejection cases | ✅ Parser remained pure/reusable |
| 3. Report + script source contracts | `tests/integration/wa-agent-edge-functions-contract.test.ts` | Integration contract | ✅ Baseline `npx tsx --test tests/integration/wa-agent-edge-functions-contract.test.ts` passed | ✅ Added failing source/script expectations first in the original apply batch | ✅ `npx tsx --test tests/integration/wa-agent-edge-functions-contract.test.ts` | ✅ Confirms report fields and saved-script contract text | ➖ None needed |
| 4. Runtime behavior repair | `tests/integration/crop-measurement-runtime.test.ts` | Integration runtime | ✅ Baseline `npx tsx --test tests/unit/crop-measurement-unit.test.ts tests/integration/crops-budget-contract.test.ts tests/integration/wa-agent-edge-functions-contract.test.ts` passed before refactor | ✅ New runtime test file failed first because `lib/wa/crop-measurement-runtime.ts` did not exist | ✅ `npx tsx --test tests/integration/crop-measurement-runtime.test.ts` | ✅ Create default/custom, update immutability, trigger-behavior model, report metadata, and n8n `lb`/`kg` render paths | ✅ Extracted runtime helpers so edge-function behavior is executable with realistic doubles |

## Test Summary

- **Total tests written**: 17 cumulative change-specific tests across unit + integration files
- **Total tests passing**: 17 change-specific tests after verify-repair; full suite pending fresh verification command in this apply batch
- **Layers used**: Unit (3), Integration contract (8), Integration runtime (6), E2E (0)
- **Approval tests**: None — this batch added new runtime coverage instead of refactoring legacy behavior under approval tests
- **Pure functions created**: 2 (`parseCropMeasurementUnit`, `enforceMeasurementUnitImmutability`)

## Workload

- Delivery mode: `size:exception` accepted by maintainer
- Current batch: full `crop-measurement-unit` implementation cycle
