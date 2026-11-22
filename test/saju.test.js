import test from "node:test";
import assert from "node:assert/strict";
import { calculateChart, targetYear, todayInfo, yearFlow } from "../saju.js";

test("양력 1992-03-15 09:30 → 임신 계묘 경인 신사", () => {
  const c = calculateChart({ year: 1992, month: 3, day: 15, time: "09:30", calendar: "solar" });
  assert.equal(c.pillars.year.ganzhi, "임신(壬申)");
  assert.equal(c.pillars.month.ganzhi, "계묘(癸卯)");
  assert.equal(c.pillars.day.ganzhi, "경인(庚寅)");
  assert.equal(c.pillars.hour.ganzhi, "신사(辛巳)");
  assert.equal(c.dayMaster.element, "금");
  assert.equal(c.pillars.month.branch.tenGod, "정재");
  assert.equal(c.pillars.day.stem.tenGod, "일간(나)");
  assert.equal(c.pillars.year.branch.tenGod, "비견"); // 申의 본기 庚 = 일간과 같은 글자
  assert.equal(Object.values(c.elements).reduce((a, b) => a + b), 8);
});

test("음력 입력을 양력으로 바꿔 같은 사주를 낸다", () => {
  const c = calculateChart({ year: 1992, month: 2, day: 12, time: "09:30", calendar: "lunar" });
  assert.equal(c.solarDate, "1992-03-15");
  assert.equal(c.pillars.day.ganzhi, "경인(庚寅)");
});

test("태어난 시간을 모르면 시주를 비우고 6글자만 센다", () => {
  const c = calculateChart({ year: 1987, month: 8, day: 22, time: null, calendar: "solar" });
  assert.equal(c.pillars.hour, null);
  assert.equal(c.pillars.day.ganzhi, "계묘(癸卯)");
  assert.equal(Object.values(c.elements).reduce((a, b) => a + b), 6);
});

test("2027년 연운은 정미년, 경금 일간에게 정관", () => {
  const f = yearFlow("庚", 2027);
  assert.equal(f.ganzhi, "정미(丁未)");
  assert.equal(f.stemTenGod, "정관");
  assert.equal(f.months.length, 12);
  assert.equal(f.months[0].label, "2027년 2월");
  assert.equal(f.months[11].label, "2028년 1월");
});

test("11월부터는 다음 해를 본다", () => {
  assert.equal(targetYear(new Date(2026, 10, 22)), 2027);
  assert.equal(targetYear(new Date(2026, 4, 1)), 2026);
});

test("다음 달 월운: 2026년 11월 기준 12월은 경자월", () => {
  const t = todayInfo("庚", new Date(2026, 10, 22));
  assert.equal(t.date, "2026-11-22");
  assert.equal(t.nextMonth.label, "2026년 12월");
  assert.equal(t.nextMonth.ganzhi, "경자(庚子)");
});
