import { PrivateShell } from "@/components/layout/private-shell";
import { FlashMessage } from "@/components/ui/flash-message";
import { PasswordInput } from "@/components/ui/password-input";
import {
  updatePasswordAction,
  updateSettingsAction,
} from "@/lib/actions/private-actions";
import { getSettings } from "@/lib/data/settings";
import { formatDateTime } from "@/lib/utils/format";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const settings = await getSettings();
  const success = asString(params.success);
  const error = asString(params.error);

  return (
    <PrivateShell
      title="Configuracion"
      subtitle="Reglas operativas, seguridad y preferencias globales"
    >
      {success ? <FlashMessage kind="success" message={success} /> : null}
      {error ? <FlashMessage kind="error" message={error} /> : null}

      <section className="panel-block">
        <h2>Seguridad</h2>
        <p className="muted">
          La contraseña debe tener al menos 8 caracteres, una mayúscula, un número
          y un carácter especial.
        </p>
        <form action={updatePasswordAction} className="stack-form">
          <PasswordInput
            name="oldPassword"
            label="Contraseña anterior"
            required
            minLength={1}
            autoComplete="current-password"
          />
          <PasswordInput
            name="password"
            label="Nueva contraseña"
            required
            minLength={8}
            autoComplete="new-password"
            hint="Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial"
          />
          <PasswordInput
            name="confirmPassword"
            label="Confirmar contraseña"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button className="button button-primary" type="submit">
            Guardar contraseña
          </button>
        </form>
      </section>

      <section className="panel-block">
        <div className="row-between">
          <h2>Reglas del sistema</h2>
          <p className="muted">
            Ultima actualizacion: {formatDateTime(settings.updated_at)}
          </p>
        </div>
        <form action={updateSettingsAction} className="grid-2">
          <label className="field">
            <span>Dias de gracia</span>
            <input
              name="grace_days"
              type="number"
              min={0}
              max={30}
              defaultValue={settings.grace_days}
              required
            />
          </label>
          <label className="field field-full">
            <span>Plantilla recordatorio de pago</span>
            <textarea
              name="payment_reminder_template"
              rows={4}
              defaultValue={settings.payment_reminder_template}
              required
            />
          </label>
          <label className="field field-full">
            <span>Plantilla aviso de suspension</span>
            <textarea
              name="suspension_notice_template"
              rows={4}
              defaultValue={settings.suspension_notice_template}
              required
            />
          </label>
          <div className="field-full">
            <button type="submit" className="button button-primary">
              Guardar configuracion
            </button>
          </div>
        </form>
      </section>
    </PrivateShell>
  );
}
