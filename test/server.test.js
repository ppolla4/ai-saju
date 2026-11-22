import test from "node:test";
import assert from "node:assert/strict";
import { parseInput } from "../server.js";
import { generateReading, buildUserMessage, ReadingError, READING_SCHEMA } from "../reading.js";
import { calculateChart, yearFlow } from "../saju.js";

const valid = {
  name: "지수", gender: "female", birthDate: "1992-03-15", birthTime: "09:30",
  calendar: "solar", job: "직장인", interests: ["돈", "이직"], concern: "내년에 이직해도 될까요?",
};

test("정상 입력을 프로필과 생년 정보로 나눈다", () => {
  const { birth, profile } = parseInput(valid);
  assert.deepEqual(birth, { year: 1992, month: 3, day: 15, time: "09:30", calendar: "solar" });
  assert.equal(profile.gender, "여성");
  assert.deepEqual(profile.interests, ["돈", "이직"]);
});

test("잘못된 입력은 한국어 메시지로 거절한다", () => {
  assert.throws(() => parseInput({ ...valid, name: "" }), ReadingError);
  assert.throws(() => parseInput({ ...valid, gender: "x" }), /성별/);
  assert.throws(() => parseInput({ ...valid, birthDate: "1992/03/15" }), /YYYY-MM-DD/);
  assert.throws(() => parseInput({ ...valid, birthTime: "25:00" }), /HH:MM/);
});

function fakeClient(message) {
  const calls = [];
  return {
    calls,
    beta: { messages: { stream: (params) => { calls.push(params); return { finalMessage: async () => message }; } } },
  };
}

const chart = calculateChart({ year: 1992, month: 3, day: 15, time: "09:30" });
const flow = yearFlow(chart._dayStem, 2027);
const profile = parseInput(valid).profile;

test("Claude 요청에 스키마, fallback, 사주 데이터를 담는다", async () => {
  const client = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: '{"summary":"x"}' }] });
  const out = await generateReading({ profile, chart, flow }, client);
  assert.deepEqual(out, { summary: "x" });
  const params = client.calls[0];
  assert.equal(params.model, "claude-opus-5-5");
  assert.equal(params.fallbacks, "default");
  assert.equal(params.output_config.format.schema, READING_SCHEMA);
  assert.match(params.messages[0].content, /경인\(庚寅\)/);
  assert.match(params.messages[0].content, /정미\(丁未\)/);
  assert.doesNotMatch(buildUserMessage({ profile, chart, flow }), /_dayStem/);
});

test("거절, 잘림, 깨진 JSON은 ReadingError로 바꾼다", async () => {
  for (const message of [
    { stop_reason: "refusal", content: [] },
    { stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] },
  ]) {
    await assert.rejects(generateReading({ profile, chart, flow }, fakeClient(message)), ReadingError);
  }
});
