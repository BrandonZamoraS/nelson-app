# Provider-Agnostic Subscriptions Design

## Architecture
- **Database-first transaction:** add `subscription_events` plus a Postgres RPC `apply_subscription_event` as the single write gate for billing-state changes.
- **Canonical API:** add `POST /api/subscription-events` for n8n/manual callers after Zod validation; keep provider names out of the contract.
- **Shared rule engine:** manual status actions stop updating `subscriptions` directly and instead build canonical events consumed by the same RPC.

## Database / RPC Shape
- `subscription_events`: `id`, `idempotency_key unique`, `event_type`, `source`, `subscription_id?`, `user_id?`, `amount_cents?`, `currency`, `occurred_at`, `paid_at?`, `status`, `error_code?`, `metadata jsonb`, `processed_at?`.
- `payments`: add nullable `event_id` FK and `unique(event_id)` for normalized payment events.
- `app_settings`: add `initial_subscription_amount_cents` with positive constraint and seed `2000`.
- `users`: add account lifecycle field(s) needed for deactivate/reactivate without losing unique WhatsApp continuity.
- RPC flow: insert event attempt -> short-circuit duplicate -> resolve/recover user/subscription -> `select ... for update` on target subscription -> validate amount/status/date rule -> write payment if applicable -> update subscription -> mark event `processed|ignored|pending_review|rejected` -> audit outcome.

## Transactional / Idempotency Rules
- Idempotency lives in the DB, not in route handlers.
- Payment renewals compute from locked `next_billing_date`; reactivation computes from `paid_at`.
- Amount mismatches never auto-activate; they persist audit evidence for reconciliation.
- Refunded and failed payments are recorded facts; they do not auto-rewind lifecycle state.
- Manual cancel/status changes must go through the same event processor to avoid last-write-wins races.

## API and App Integration
- New route: `app/api/subscription-events/route.ts` validates canonical payload and calls `lib/data/subscription-events.ts`.
- Existing admin routes/server actions become event producers, not direct row mutators.
- `/suscripciones` can later surface pending-review outcomes, but UI expansion is secondary to invariant safety.

## Test-First Strategy
- **RED first, always:** write failing tests before RPC/domain code.
- **Unit:** new `tests/unit/subscription-events.test.ts` for renewal-date math, restart-from-paid-at, amount classification, and month-end rollover.
- **Validator/integration:** extend `tests/integration/validators-and-rules.test.ts` with canonical payload acceptance/rejection.
- **Migration contracts:** add schema tests for `subscription_events`, `event_id`, `initial_subscription_amount_cents`, indexes, and uniqueness.
- **RPC contracts:** add integration tests proving duplicate events are no-op, concurrent renewals serialize, first payment can auto-provision, and amount mismatch yields `pending_review`.
- **API contracts:** extend route existence coverage for `app/api/subscription-events/route.ts`.

## Implementation Slices
1. **Schema + contracts** — migrations, generated DB types, schema tests.
2. **Pure domain rules** — event types, renewal calculator, event outcome classifier, unit tests.
3. **RPC** — transactional function, idempotency, audit/payment/subscription writes, RPC contract tests.
4. **TypeScript gateway** — validator + data wrapper + API route.
5. **Admin reroute** — private actions and subscription data layer emit canonical manual events.
6. **Account continuity** — deactivate/reactivate by WhatsApp with tests.
7. **UI follow-up** — pending-review visibility only if still within review budget.

## Risks
- Soft-delete on `users` may require revisiting existing FK/delete behavior from `subscriptions` and audits.
- RPC contract shape must stay simple enough for Next.js server routes and n8n callers.
- Full UI reconciliation tools likely exceed the 400-line review budget and should be deferred unless owner approves a chained PR.
