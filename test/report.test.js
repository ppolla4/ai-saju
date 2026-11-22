import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "saju-"));
const { default: app } = await import("../server.js");
const { saveReport } = await import("../store.js");
const { calculateChart, yearFlow } = await import("../saju.js");

const sample = JSON.parse(fs.readFileSync(new URL("./fixtures/reading.json", import.meta.url), "utf8"));
const chart = calculateChart({ year: 1992, month: 3, day: 15, time: "09:30" });
const { _dayStem, ...publicChart } = chart;

const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;
test.after(() => server.close());

test("저장된 리포트는 링크로 바로 열린다", async () => {
  const saved = await saveReport({ name: "지수", chart: publicChart, flow: yearFlow(_dayStem, 2027), reading: sample });

  const page = await fetch(`${base}/report/${saved.id}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /지수 님의<br>2027년 사주 풀이/);
  assert.match(html, /경\(庚\)/);
});

test("없는 리포트나 이상한 id는 404", async () => {
  assert.equal((await fetch(`${base}/report/00000000-0000-0000-0000-000000000000`)).status, 404);
  assert.equal((await fetch(`${base}/report/..%2F..%2Fpackage`)).status, 404);
});

test("하루 횟수 제한: 3번까지 허용하고 다음 날 초기화", async () => {
  const { createDailyLimit } = await import("../limit.js");
  let now = new Date("2026-11-22T10:00:00Z");
  const limit = createDailyLimit(3, () => now);
  assert.deepEqual([1, 2, 3, 4].map(() => limit.take("1.2.3.4")), [true, true, true, false]);
  assert.equal(limit.take("5.6.7.8"), true);
  now = new Date("2026-11-23T10:00:00Z");
  assert.equal(limit.take("1.2.3.4"), true);
});
