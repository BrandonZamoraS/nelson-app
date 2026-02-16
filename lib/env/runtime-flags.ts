export function isE2EAuthStubEnabled() {
  return process.env.E2E_AUTH_STUB === "true";
}

export function getE2EAdminEmail() {
  return process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
}

export function getE2EAdminPassword() {
  return process.env.E2E_ADMIN_PASSWORD ?? "password123";
}
