import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const backend = "../backend/apps/operations/fixtures/demo";
const publicDir = "public/demo-fixtures";
await mkdir(backend, { recursive: true });
await mkdir(publicDir, { recursive: true });
const categories = {
  drivers_license: "Driver's license",
  cpr: "CPR certificate",
  cna_hha: "CNA/HHA certificate",
  tb_test: "TB test",
  physical_exam: "Physical exam",
  background_check: "Background check",
  social_security_card: "Social Security card",
  auto_insurance: "Auto insurance",
  drivers_insurance: "Driver's insurance",
  direct_deposit: "Direct deposit",
  caregiver_other: "Other onboarding documents",
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 480 } });
const manifest = [];
async function render(title, description) {
  await page.setContent(
    `<html><head><style>body{font:18px Arial;color:#263832;margin:48px}h1{font-size:32px}small{display:block;margin-top:36px}p{line-height:1.6}</style></head><body><h1>SYNTHETIC DEMO</h1><h2>${title}</h2><p>${description}</p><p>Placeholder only. No identity, health, financial or signature data.</p><small>Demo workflow - pending agency confirmation.</small></body></html>`,
  );
}
for (const [category, label] of Object.entries(categories)) {
  await render(label, "Generated fixture for prototype document review.");
  for (const [extension, media_type] of [
    ["pdf", "application/pdf"],
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
  ]) {
    const filename = `${category}.${extension}`;
    const bytes =
      extension === "pdf"
        ? await page.pdf({ format: "A4", printBackground: true })
        : await page.screenshot({ type: extension === "jpg" ? "jpeg" : "png" });
    await writeFile(`${backend}/${filename}`, bytes);
    await copyFile(`${backend}/${filename}`, `${publicDir}/${filename}`);
    manifest.push({
      fixture_id: `${category}-${extension}`,
      category,
      filename,
      media_type,
      byte_size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
for (const state of ["FL", "IN", "GA"]) {
  await render(
    `${state} employment packet - Form version 2`,
    "Illustrative caregiver onboarding packet. This is not work authorization or an employment agreement.",
  );
  await page.pdf({
    path: `${backend}/packet-${state}-v2.pdf`,
    format: "A4",
    printBackground: true,
  });
}
await page.screenshot({ path: "test-results/packet-preview.png" });
await writeFile(`${backend}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
await writeFile(`${publicDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
await browser.close();
