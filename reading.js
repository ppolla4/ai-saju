// 노스님 풀이: 만세력 결과 + 사용자 상황 → Claude가 무료 맛보기와 유료 리포트를 한 번에 쓴다.
import Anthropic from "@anthropic-ai/sdk";

// 무료 서비스는 건당 비용이 광고 수익보다 낮아야 한다. MODEL 환경 변수로 바꿀 수 있다.
export const MODEL = process.env.MODEL || "claude-opus-5-5";

export const SYSTEM_PROMPT = `당신은 산사에서 40년 넘게 사주를 봐온 "노스님"입니다. AI 맞춤 사주 서비스의 상담가로서, 이미 계산된 사주 원국과 연운·월운 데이터를 받아 그 사람만을 위한 실용적인 풀이를 씁니다.

[역할]
- 사주는 직접 계산하지 않습니다. 주어진 데이터(일간, 오행 분포, 십성, 연운·월운)만 근거로 씁니다.
- 핵심 주제는 세 가지입니다: 재물운, 특히 조심해야 할 일, 지금 당장 시작해야 할 일.

[말투: 정중하면서도 날카롭게]
- "~합니다", "~하십시오", "~예요" 존댓말. 돌려 말하지 않고 핵심을 먼저 말합니다.
- 단정 대신 가능성으로 말하되 흐리지 않습니다. 예: "지수 님 돈이 새는 곳은 분명합니다. 9월, 가까운 사람과의 돈 거래예요."
- 가끔 짧은 비유를 섞습니다(물, 그릇, 문, 길 같은 자연의 비유).
- 사용자는 "이름 + 님"으로 부릅니다. "시주"라는 호칭은 쓰지 않습니다(사주 용어 시주와 헷갈림).

[근거와 맞춤]
- 조언마다 어떤 기운 때문인지 짧게 밝힙니다(예: "편재가 들어오는 해라").
- 사용자가 적은 직업, 관심사, 고민을 본문에 반드시 반영합니다. 일반론 대신 그 사람의 상황에 맞는 행동을 씁니다.
- 좋은 달과 조심할 달은 주어진 월운 목록의 실제 달 이름(예: "2027년 3월")으로 씁니다.
- 태어난 시간을 모르면 시주 없이 풀었다고 한 번만 밝힙니다.

[금지]
- 죽음·질병 단정, "반드시 망한다" 같은 공포 조성.
- 특정 주식·코인·종목 추천, 의료·법률 판단.
- 부적·굿·추가 상품 구매 권유, 불교 교리 설교.

[필드 규칙]
- summary: 이 사람을 한 줄로 요약한 30자 이내의 문구. 예: "아이디어를 돈으로 바꾸는 사람"
- opening: 노스님의 여는 말 2~3문장.
- nextMonth: [오늘]에 적힌 다음 달의 월운으로 씁니다.

[무료 맛보기]
- preview의 세 줄은 각각 한 문장으로 핵심을 하나 알려주고, 뒤에 "…" 로 끝나는 미완성 문장을 붙여 궁금하게 만듭니다.
  예: "2027년은 연봉이 오르는 방식으로 돈이 늘기 좋은 해입니다. 가장 좋은 달은…"

[분량]
- 리포트 전체는 한국어 3,000~4,000자. 재물운·조심할 일·시작할 일이 분량의 절반 이상.`;

const str = { type: "string" };
const strList = { type: "array", items: str };
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const READING_SCHEMA = obj({
  summary: str, // 한 줄 요약
  opening: str, // 노스님 여는 말
  preview: obj({ wealth: str, caution: str, startNow: str }),
  report: obj({
    overview: str,
    wealth: obj({ howMoneyComes: str, yearFlow: str, goodMonths: str, howToGrow: str }),
    caution: obj({ months: str, money: str, people: str, habits: str }),
    startNow: obj({ thisWeek: strList, thisMonth: strList, thisYear: str }),
    concernAnswer: str,
    lucky: obj({ color: str, direction: str, numbers: str, people: str }),
    nextMonth: str,
    closing: str,
  }),
});

/** 사용자 메시지: 계산 결과와 입력 상황을 그대로 넘긴다. */
export function buildUserMessage({ profile, chart, flow, today }) {
  const { _dayStem, ...chartForModel } = chart;
  return [
    "아래 사람의 맞춤 사주 풀이를 써 주십시오.",
    "",
    "[오늘]",
    JSON.stringify(today, null, 2),
    "",
    "[사용자]",
    JSON.stringify(profile, null, 2),
    "",
    "[사주 원국]",
    JSON.stringify(chartForModel, null, 2),
    "",
    `[${flow.year}년 연운·월운]`,
    JSON.stringify(flow, null, 2),
  ].join("\n");
}

export class ReadingError extends Error {}

/**
 * Claude에게 풀이를 요청한다. 거절 시 서버 측 fallback이 다른 모델로 이어 쓴다.
 * @returns {Promise<object>} READING_SCHEMA 모양의 객체
 */
export async function generateReading({ profile, chart, flow, today }, client = new Anthropic()) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: READING_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage({ profile, chart, flow, today }) }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new ReadingError("풀이를 만들 수 없는 요청이에요. 입력 내용을 바꿔 다시 시도해 주세요.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new ReadingError("풀이가 너무 길어져 중간에 끊겼어요. 다시 시도해 주세요.");
  }
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new ReadingError("풀이 결과를 읽지 못했어요. 다시 시도해 주세요.");
  }
}
