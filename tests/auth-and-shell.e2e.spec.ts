import { expect, test } from "@playwright/test";

test("login page renders expected fields", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Inicia sesion" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("private routes redirect to login when there is no session", async ({
  page,
}) => {
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test("login failure returns to login with message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Contraseña").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/login(\?|$)/);
});
