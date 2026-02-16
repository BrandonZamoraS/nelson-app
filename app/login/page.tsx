import { redirect } from "next/navigation";

import { getAdminProfileByAuthUserId } from "@/lib/auth/admin-profile";
import { shouldRedirectAuthenticatedUserFromLogin } from "@/lib/auth/login-access";
import { isE2EAuthStubEnabled } from "@/lib/env/runtime-flags";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isE2EAuthStubEnabled()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminProfile = user
      ? await getAdminProfileByAuthUserId(user.id)
      : null;

    if (shouldRedirectAuthenticatedUserFromLogin(user, adminProfile)) {
      redirect("/");
    }
  }

  const params = await searchParams;
  const next = asString(params.next);
  const error = asString(params.error);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="panel-logo" />
          <div>
            <h1>ACME INC.</h1>
            <p>Panel de administracion</p>
          </div>
        </div>

        <h2>Inicia sesion</h2>
        <p className="muted">
          Usa tu cuenta de administrador para entrar al panel.
        </p>

        {error ? <p className="flash flash-error">{error}</p> : null}

        <form action="/auth/login" method="post" className="stack-form">
          <input type="hidden" name="next" value={next} />
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@empresa.com"
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="********"
            />
          </label>

          <button type="submit" className="button button-primary">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
