import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("state administrator remains in Florida after public state navigation", async ({ page }) => {
  const bytes = readFileSync("../backend/.local/demo-accounts.txt");
  const accounts = bytes.toString(bytes[0] === 255 ? "utf16le" : "utf8");
  const password = accounts.match(/state-admin-fl@demo.example\s+Password: (\S+)/)?.[1];
  if (!password)
    throw new Error(
      "Preserve first seed output in backend/.local/demo-accounts.txt for this test.",
    );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("state-admin-fl@demo.example");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "State administration", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Demo FL Caregiver 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Demo IN Caregiver 1", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Filter accessible records by state")).toHaveCount(0);
  await page.goto("/states/IN");
  await page.getByRole("link", { name: "Your portal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "State administration", exact: true }),
  ).toBeVisible();
  const result = await page.request.get("/api/v1/caregivers/?branch__state_code=IN");
  expect((await result.json()).count).toBe(0);
});
test("public job application creates portal access and survives logout/login", async ({ page }) => {
  const email = `browser-${Date.now()}@demo.example`;
  const password = "Synthetic-browser-passphrase!42";
  await page.goto("/states/FL");
  await page.getByRole("link", { name: "View job & apply" }).first().click();
  await page.getByLabel("Synthetic name", { exact: true }).fill("Synthetic Browser Applicant");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Create password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit demo application" }).click();
  await expect(page.getByRole("heading", { name: "Caregiver portal", exact: true })).toBeVisible();
  await expect(
    page.getByText("Application submitted. Your portal account is ready.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("submitted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Caregiver portal", exact: true })).toBeVisible();
  await page.goto("/portal/super-admin");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});
for (const width of [1440, 1024, 768, 390]) {
  test(`public page fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/states/FL");
    await expect(page.getByRole("heading", { name: "Home care, close to home." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/public-${width}.png`, fullPage: true });
  });
}
