// HTML → PDF(A4). Playwright(Chromium)가 필요하다: npm i playwright && npx playwright install chromium
import { createRequire } from "node:module";

let browserPromise;

async function getBrowser() {
  const browser = await browserPromise;
  if (browser?.isConnected()) return browser;
  browserPromise = createRequire(import.meta.url)("playwright").chromium.launch();
  return browserPromise;
}

export async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
}
