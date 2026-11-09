import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

function adminPassword() {
  const bytes = readFileSync("../backend/.local/demo-accounts.txt");
  const text = bytes.toString(bytes[0] === 255 ? "utf16le" : "utf8");
  const password = text.match(/state-admin-fl@demo.example\s+Password: (\S+)/)?.[1];
  if (!password) throw new Error("Local synthetic administrator credentials unavailable.");
  return password;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/portal\//);
}

for (const width of [390, 768, 1024, 1440]) {
  test(`synthetic application through explicit onboarding completion at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    page.setDefaultTimeout(10_000);
    await page.setViewportSize({ width, height: 900 });
    const email = `onboarding-${width}-${Date.now()}@demo.example`;
    const password = "Synthetic-browser-passphrase!42";
    await page.goto("/states/FL");
    const posting = page
      .locator("article")
      .filter({ hasText: "Extended demo caregiver opportunity" });
    await posting.getByRole("link", { name: "View job & apply" }).click();
    await page.getByLabel("Synthetic name", { exact: true }).fill("Synthetic Onboarding Applicant");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Create password").fill(password);
    await page.getByRole("combobox", { name: "Experience", exact: true }).selectOption("none");
    await page.getByLabel("Weekdays", { exact: true }).check();
    await page.getByLabel("Demo data acknowledgement", { exact: false }).check();
    const submitted = page.waitForResponse(
      (response) => response.url().endsWith("/apply/") && response.status() === 201,
    );
    await page.getByRole("button", { name: "Submit demo application" }).click();
    const applicationId = (await (await submitted).json()).application as string;
    await expect(
      page.getByRole("heading", { name: "Caregiver portal", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await login(page, "state-admin-fl@demo.example", adminPassword());
    await page.goto(`/applications/${applicationId}`);
    const detail = await page.request.get(`/api/v1/applications/${applicationId}/`);
    const caregiverId = (await detail.json()).caregiver as string;
    await page.getByRole("button", { name: "Save review", exact: true }).click();
    await expect(page.getByLabel("Review decision")).toHaveValue("approved");
    await page.getByRole("button", { name: "Save review", exact: true }).click();
    await expect(page.getByText("approved · Form version 2", { exact: true })).toBeVisible();
    const packetPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download synthetic employment packet" }).click();
    const packet = await packetPromise;
    expect(
      readFileSync((await packet.path())!)
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    await page.getByRole("button", { name: "Sign out" }).click();
    await login(page, email, password);
    await page.goto(`/caregivers/${caregiverId}/onboarding`);
    for (const code of ["drivers_license", "cpr", "cna_hha"]) {
      await page
        .getByRole("combobox", { name: "Document category", exact: true })
        .selectOption(code);
      await page
        .getByRole("combobox", { name: "Generated fixture", exact: true })
        .selectOption(`${code}-pdf`);
      await page.getByLabel("Expires on", { exact: true }).fill("2099-01-01");
      await page.getByLabel("Synthetic fixture acknowledgement", { exact: true }).check();
      await page.getByRole("button", { name: "Upload generated fixture", exact: true }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Fixture uploaded for review." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Upload generated fixture", exact: true }),
      ).toBeEnabled();
    }
    await page.getByRole("button", { name: "Sign out" }).click();
    await login(page, "state-admin-fl@demo.example", adminPassword());
    await page.goto(`/caregivers/${caregiverId}/onboarding`);
    for (const label of ["Driver's License", "CPR Certificate", "CNA/HHA Certificate"]) {
      const document = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: label, exact: true }) });
      await document.getByRole("button", { name: "Save review", exact: true }).click();
      await expect(document.getByText("This review is final.", { exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Complete demo onboarding", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Complete demo onboarding", exact: true }).click();
    await expect(page.getByText("FL · Demo onboarding complete", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/onboarding-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Sign out" }).click();
    await login(page, email, password);
    await page.goto(`/caregivers/${caregiverId}/onboarding`);
    await expect(page.getByText("FL · Demo onboarding complete", { exact: true })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    const documentDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download CPR Certificate version 1", exact: true })
      .click();
    const downloaded = await documentDownload;
    expect(
      readFileSync((await downloaded.path())!)
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
  });
}
