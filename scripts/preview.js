// 풀이 결과 JSON으로 PDF 리포트와 이메일 미리보기를 만든다.
// 사용법: node scripts/preview.js <결과.json> <이름> [출력 폴더]
// 결과.json은 POST /api/reading 응답 그대로({chart, flow, reading}).
// PDF 생성에는 Playwright(Chromium)가 필요하다: npm i -D playwright && npx playwright install chromium
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { emailHtml, reportHtml } from "../render.js";

const [jsonPath, name, outDir = "preview"] = process.argv.slice(2);
if (!jsonPath || !name) {
  console.error("사용법: node scripts/preview.js <결과.json> <이름> [출력 폴더]");
  process.exit(1);
}

const data = { ...JSON.parse(fs.readFileSync(jsonPath, "utf8")), name };
fs.mkdirSync(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

const report = reportHtml({ ...data, issuedAt: today });
const email = emailHtml({ ...data, reportUrl: "https://example.com/report/sample" });
fs.writeFileSync(path.join(outDir, "report.html"), report);
fs.writeFileSync(path.join(outDir, "email.html"), email);

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(report, { waitUntil: "networkidle" });
await page.pdf({ path: path.join(outDir, "report.pdf"), format: "A4", printBackground: true });
await browser.close();

console.log(`만들었어요: ${outDir}/report.pdf, ${outDir}/report.html, ${outDir}/email.html`);
