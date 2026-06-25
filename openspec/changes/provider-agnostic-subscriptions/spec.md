# Provider-Agnostic Subscriptions Molecular Spec

## Intent
Move subscription state changes to a provider-agnostic billing event flow. n8n normalizes provider webhooks; Nelson accepts canonical events, applies them idempotently, and keeps `subscriptions`/`payments` consistent.

## Capability
- **New capability:** `subscription-events` — canonical billing events, first-payment auto-provisioning, and shared processing for manual and automated changes.
- **Modified capability:** `subscriptions-admin` — manual status changes stop mutating rows directly and instead emit canonical events through the same rule engine.

## Intended Behavior
- Nelson SHALL accept canonical events with `idempotency_key`, `event_type`, `occurred_at`, `source`, and provider-neutral payload fields only.
- Nelson SHALL process events transactionally so one logical event can update event audit, payment records, subscription state, and auto-provisioning atomically.
- Nelson SHALL treat duplicate `idempotency_key` values as idempotent success with no duplicated financial or billing effects.
- Nelson SHALL advance renewals from the previous `next_billing_date` when the subscription is still in-cycle.
- Nelson SHALL restart service from `paid_at` when a terminated or expired subscription is reactivated by payment.
- Nelson SHALL send amount mismatches and incomplete first-payment events to reconciliation (`pending_review`) instead of guessing.
- Nelson SHALL preserve financial history on account deletion/reactivation via soft-delete style account status, keyed by WhatsApp continuity.

## Acceptance Scenarios

### Scenario: Duplicate payment webhook
- **GIVEN** a processed `payment_succeeded` event with idempotency key `evt-1`
- **WHEN** the same canonical event is submitted again
- **THEN** Nelson returns idempotent success
- **AND** no second `payments` row or extra billing-date advance is created

### Scenario: Renewal inside current cycle
- **GIVEN** an active subscription with `next_billing_date = 2026-06-10`
- **WHEN** a successful payment arrives on `2026-06-15`
- **THEN** the subscription remains `activa`
- **AND** the new `next_billing_date` becomes `2026-07-10`

### Scenario: Reactivation after termination
- **GIVEN** a terminated subscription
- **WHEN** a successful payment arrives with `paid_at = 2026-06-15`
- **THEN** the subscription becomes `activa`
- **AND** the new cycle ends on `2026-07-15`

### Scenario: First automated payment creates access
- **GIVEN** no subscription exists and the event carries valid WhatsApp identity plus the configured initial amount
- **WHEN** `payment_succeeded` is processed
- **THEN** Nelson creates or reactivates the user, creates one subscription, and records one payment

### Scenario: Amount mismatch
- **GIVEN** a subscription exists and the incoming payment amount differs from the expected amount
- **WHEN** the event is processed
- **THEN** the event is marked `pending_review`
- **AND** subscription state and billing date do not advance automatically

## Risks / Open Attention
- Existing direct admin mutations in `lib/data/subscriptions.ts` and `lib/actions/private-actions.ts` can bypass the new invariants unless fully rerouted.
- Soft-delete/reactivation introduces schema and uniqueness changes around `users.whatsapp`.
- Out-of-order events must be audited even if they become ignored.

## Minimal Affected Code Areas
- `supabase/migrations/*` — event table, payment linkage, app settings, account lifecycle fields, RPC
- `lib/types/database.ts`, `lib/types/domain.ts`
- `lib/domain/subscription-status.ts`, new `lib/domain/subscription-events.ts`
- `lib/validators/subscription-events.ts`, `lib/validators/users.ts`, `lib/validators/subscriptions.ts`
- `lib/data/subscription-events.ts`, `lib/data/subscriptions.ts`, `lib/data/users.ts`
- `lib/actions/private-actions.ts`
- `app/api/subscription-events/route.ts`, existing subscription admin routes
- `tests/unit/*.test.ts`, `tests/integration/*.test.ts`, schema contract coverage
