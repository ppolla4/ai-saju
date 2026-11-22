import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { calculateChart, targetYear, todayInfo, yearFlow } from "./saju.js";
import { generateReading, ReadingError } from "./reading.js";

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static("public"));

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const clip = (value, max) => String(value ?? "").trim().slice(0, max);

/** 입력 검증. 잘못된 값이면 사용자에게 보여줄 한국어 메시지를 던진다. */
export function parseInput(body) {
  const name = clip(body.name, 20);
  if (!name) throw new ReadingError("이름(또는 닉네임)을 적어 주세요.");
  const gender = body.gender === "male" ? "남성" : body.gender === "female" ? "여성" : null;
  if (!gender) throw new ReadingError("성별을 골라 주세요.");
  const match = DATE_RE.exec(body.birthDate ?? "");
  if (!match) throw new ReadingError("생년월일을 YYYY-MM-DD 형식으로 적어 주세요.");
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1920 || year > 2025) throw new ReadingError("1920년부터 2025년 사이의 생년만 볼 수 있어요.");
  const time = body.birthTime ? String(body.birthTime) : null;
  if (time && !TIME_RE.test(time)) throw new ReadingError("태어난 시간을 HH:MM 형식으로 적어 주세요.");
  const calendar = body.calendar === "lunar" ? "lunar" : "solar";

  return {
    birth: { year, month, day, time, calendar },
    profile: {
      name,
      gender,
      birth: `${body.birthDate} ${time ?? "(시간 모름)"} ${calendar === "lunar" ? "음력" : "양력"}`,
      job: clip(body.job, 30) || "적지 않음",
      interests: Array.isArray(body.interests) ? body.interests.map((i) => clip(i, 10)).slice(0, 5) : [],
      concern: clip(body.concern, 100) || "적지 않음",
    },
  };
}

const client = new Anthropic();

app.post("/api/reading", async (req, res) => {
  let input;
  let chart;
  try {
    input = parseInput(req.body);
    chart = calculateChart(input.birth);
  } catch (err) {
    const message = err instanceof ReadingError ? err.message : "날짜를 확인해 주세요. 없는 날짜일 수 있어요.";
    return res.status(400).json({ error: message });
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return res.status(500).json({ error: "서버에 Claude API 키가 설정되지 않았어요(ANTHROPIC_API_KEY)." });
  }
  const flow = yearFlow(chart._dayStem, targetYear());
  try {
    const today = todayInfo(chart._dayStem);
    const reading = await generateReading({ profile: input.profile, chart, flow, today }, client);
    const { _dayStem, ...publicChart } = chart;
    res.json({ chart: publicChart, flow, reading });
  } catch (err) {
    if (err instanceof ReadingError) return res.status(502).json({ error: err.message });
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "서버에 Claude API 키가 설정되지 않았어요(ANTHROPIC_API_KEY)." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "요청이 몰려 있어요. 잠시 후 다시 시도해 주세요." });
    }
    console.error(err);
    res.status(500).json({ error: "풀이 중 오류가 났어요. 다시 시도해 주세요." });
  }
});

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`노스님 사주 시제품: http://localhost:${port}`));
}

export default app;
