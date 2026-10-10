import { test, expect } from "@playwright/test";

test.describe("client EOR smoke", () => {
  test("login chooser exposes client portal", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Client portal")).toBeVisible();
  });

  test("unknown client slug returns not found for protected API", async ({ request }) => {
    const res = await request.get("/api/client/nonexistent-slug-xyz/onboarding");
    expect([401, 403, 404]).toContain(res.status());
  });
});
