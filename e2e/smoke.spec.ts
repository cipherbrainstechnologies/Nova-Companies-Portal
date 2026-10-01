import { test, expect } from "@playwright/test";

test("public marketing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /portal login/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /nova workforce/i }).first()).toBeVisible();
});

test("public business pages render", async ({ page }) => {
  for (const path of ["/about", "/companies", "/services", "/how-we-work", "/pricing", "/who-we-serve", "/faq", "/contact", "/careers", "/privacy"]) {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("verify document page is public and minimal", async ({ page }) => {
  await page.goto("/verify-document");
  await expect(page.getByText(/verify/i).first()).toBeVisible();
});
