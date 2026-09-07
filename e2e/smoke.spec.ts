import { test, expect } from "@playwright/test";

test("public marketing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Nova Salary Portal|Secure multi-company/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /log in|login/i }).first()).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("verify document page is public and minimal", async ({ page }) => {
  await page.goto("/verify-document");
  await expect(page.getByText(/verify/i).first()).toBeVisible();
});
