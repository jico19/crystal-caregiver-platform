import { expect, test } from "@playwright/test";

const job = {
  public_id: "synthetic-job",
  title: "Demo caregiver opportunity",
  description: "Synthetic demonstration only.",
  state_code: "FL",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.includes("auth/me")
      ? null
      : path.endsWith("jobs/synthetic-job/")
        ? job
        : { count: 1, results: [job], next: null, previous: null };
    if (path.endsWith("staff/onboarding/")) {
      await route.fulfill({
        json: {
          count: 0,
          results: [],
          next: null,
          previous: null,
          counts: { total: 0, completed: 0, missing: 0, expired: 0, expiring: 0 },
        },
      });
      return;
    }
    if (path.endsWith("clients/")) {
      await route.fulfill({ json: { count: 0, results: [], next: null, previous: null } });
      return;
    }
    await route.fulfill({ json: data });
  });
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`public, account, application and portal layouts fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/states/FL", "/login", "/jobs/synthetic-job"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const section = page.locator("main section").first();
      expect(
        await section.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)),
      ).toBeGreaterThanOrEqual(24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }

    await page.route("**/api/v1/auth/me/", (route) =>
      route.fulfill({
        json: {
          email: `${"synthetic".repeat(10)}@demo.example`,
          roles: ["super-admin"],
          branches: [{ public_id: "demo-branch", state_code: "FL", display_name: "Demo Florida" }],
        },
      }),
    );
    await page.route("**/api/v1/caregivers/**", (route) =>
      route.fulfill({
        json: {
          count: 26,
          next: "?page=2",
          previous: null,
          results: [{ public_id: "demo-person", name: "Synthetic".repeat(30), state_code: "FL" }],
        },
      }),
    );
    await page.goto("/portal/super-admin");
    await expect(page.getByRole("heading", { name: "Agency overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/portal-styles-${width}.png`, fullPage: true });
  });
}

test("keyboard skip link focuses main and controls have a visible focus outline", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveCSS("outline-style", "solid");
  await expect(page.getByLabel("Email", { exact: true })).toHaveCSS("outline-width", "3px");
});

test("reduced motion disables button transitions and disabled buttons retain their color", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const button = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(button).toHaveCSS("transition-property", "none");
  await button.evaluate((el: HTMLButtonElement) => {
    el.disabled = true;
  });
  const background = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  await button.hover({ force: true });
  await expect(button).toHaveCSS("background-color", background);
  await expect(button).toHaveCSS("cursor", "not-allowed");
});
