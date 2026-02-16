# 02 - Arquitectura y Contratos

## Stack objetivo

- `Next.js` (App Router, TypeScript)
- `Supabase` (Postgres + Auth)
- `Zod` para validación de entrada
- `Playwright` para E2E

## Módulos recomendados

- `lib/supabase/server.ts`: cliente server-side.
- `lib/supabase/client.ts`: cliente browser-side.
- `lib/auth/*`: helpers de sesión y guardas.
- `lib/validators/*`: schemas Zod por caso de uso.
- `lib/audit/*`: helper central `logAudit`.
- `lib/domain/*`: lógica de reglas (transiciones, métricas).

## Esquema de datos (v1)

### Tabla `users`

- `id uuid primary key`
- `full_name text not null`
- `whatsapp text not null unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Tabla `subscriptions`

- `id uuid primary key`
- `user_id uuid not null unique references users(id) on delete cascade`
- `plan text not null`
- `status text not null check (status in ('activa','gracia','suspendida','terminada'))`
- `start_date date not null`
- `next_billing_date date null`
- `source text not null default 'manual'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Tabla `audit_logs`

- `id bigserial primary key`
- `occurred_at timestamptz not null default now()`
- `actor_user_id uuid null`
- `entity_type text not null`
- `entity_id text not null`
- `action text not null`
- `detail jsonb not null`
- `result text not null check (result in ('ok','error'))`

### Tabla `app_settings`

- `id int primary key default 1`
- `grace_days int not null`
- `payment_reminder_template text not null`
- `suspension_notice_template text not null`
- `currency text not null`
- `timezone text not null`
- `date_format text not null`
- `updated_at timestamptz not null default now()`

## Tipos de dominio

```ts
export type SubscriptionStatus = "activa" | "gracia" | "suspendida" | "terminada";
```

## Endpoints / operaciones objetivo

- `POST /auth/login`
- `POST /auth/logout`
- `GET /api/dashboard/metrics`
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `GET /api/subscriptions`
- `PATCH /api/subscriptions/:id/status`
- `POST /api/subscriptions/:id/terminate`
- `GET /api/audit`
- `GET /api/settings`
- `PATCH /api/settings`

## Contratos de errores

- `400`: validación.
- `401`: no autenticado.
- `403`: no autorizado (reservado si luego hay roles).
- `404`: entidad no encontrada.
- `409`: conflicto de negocio (ej: WhatsApp duplicado, transición inválida).
- `500`: error interno.

## Seguridad base

- Middleware protege rutas privadas.
- Sesión admin obligatoria para mutaciones.
- Auditoría obligatoria en toda mutación.
- RLS o control server-side equivalente para impedir acceso anónimo.
