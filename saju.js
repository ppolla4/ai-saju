// 만세력 계산: 생년월일시 → 사주팔자, 오행 분포, 십성, 대상 연도의 연운·월운.
// AI는 이 결과만 받아서 풀이하고, 사주 자체를 계산하지 않는다.
import lunar from "lunar-javascript";

const { Solar, Lunar, LunarUtil } = lunar;

const STEM_KO = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const BRANCH_KO = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const ELEMENT_KO = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수" };
const TEN_GOD_KO = {
  比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재",
  正财: "정재", 七杀: "편관", 正官: "정관", 偏印: "편인", 正印: "정인",
};
const DAY_MASTER_IMAGE = {
  甲: "큰 나무", 乙: "풀과 꽃", 丙: "태양", 丁: "촛불", 戊: "큰 산",
  己: "논밭의 흙", 庚: "단단한 쇠", 辛: "보석", 壬: "큰 강", 癸: "빗물",
};

const ko = (char) => STEM_KO[char] ?? BRANCH_KO[char] ?? char;
const ganzhiKo = (gz) => `${ko(gz[0])}${ko(gz[1])}(${gz})`;
const tenGod = (dayStem, stem) => (stem === dayStem ? "비견" : TEN_GOD_KO[LunarUtil.SHI_SHEN[dayStem + stem]]);
const branchMainStem = (branch) => LunarUtil.ZHI_HIDE_GAN[branch][0];
const elementOfStem = (stem) => ELEMENT_KO[LunarUtil.WU_XING_GAN[stem]];
const elementOfBranch = (branch) => ELEMENT_KO[LunarUtil.WU_XING_ZHI[branch]];

/**
 * @param {object} input
 * @param {number} input.year
 * @param {number} input.month
 * @param {number} input.day
 * @param {string|null} input.time  "HH:MM" 또는 null(모름)
 * @param {"solar"|"lunar"} input.calendar
 */
export function calculateChart({ year, month, day, time, calendar = "solar" }) {
  const timeKnown = Boolean(time);
  const [hour, minute] = timeKnown ? time.split(":").map(Number) : [12, 0];
  const solar =
    calendar === "lunar"
      ? Lunar.fromYmdHms(year, month, day, hour, minute, 0).getSolar()
      : Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const eight = solar.getLunar().getEightChar();
  const dayStem = eight.getDayGan();

  const raw = {
    year: eight.getYear(),
    month: eight.getMonth(),
    day: eight.getDay(),
    hour: timeKnown ? eight.getTime() : null,
  };

  const pillars = {};
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const [name, gz] of Object.entries(raw)) {
    if (!gz) {
      pillars[name] = null;
      continue;
    }
    const [stem, branch] = gz;
    elements[elementOfStem(stem)] += 1;
    elements[elementOfBranch(branch)] += 1;
    pillars[name] = {
      ganzhi: ganzhiKo(gz),
      stem: { char: `${ko(stem)}(${stem})`, element: elementOfStem(stem), tenGod: tenGod(dayStem, stem) },
      branch: {
        char: `${ko(branch)}(${branch})`,
        element: elementOfBranch(branch),
        tenGod: tenGod(dayStem, branchMainStem(branch)),
      },
    };
  }
  pillars.day.stem.tenGod = "일간(나)";

  return {
    solarDate: solar.toYmd(),
    timeKnown,
    dayMaster: {
      char: `${ko(dayStem)}(${dayStem})`,
      element: elementOfStem(dayStem),
      image: DAY_MASTER_IMAGE[dayStem],
    },
    pillars,
    elements,
    _dayStem: dayStem,
  };
}

/** 풀이 대상 연도: 11월 이후면 다음 해를, 그 전이면 올해를 본다. */
export function targetYear(now = new Date()) {
  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
}

/** 대상 연도의 연운과 절기 기준 월운(양력 2월~다음 해 1월). */
export function yearFlow(dayStem, year) {
  const yearGz = Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhiExact();
  const months = [];
  for (let i = 0; i < 12; i += 1) {
    const m = ((1 + i) % 12) + 1; // 2,3,...,12,1
    const y = m === 1 ? year + 1 : year;
    const gz = Solar.fromYmd(y, m, 15).getLunar().getMonthInGanZhiExact();
    months.push({
      label: `${y}년 ${m}월`,
      ganzhi: ganzhiKo(gz),
      stemTenGod: tenGod(dayStem, gz[0]),
      branchTenGod: tenGod(dayStem, branchMainStem(gz[1])),
      element: `${elementOfStem(gz[0])}/${elementOfBranch(gz[1])}`,
    });
  }
  return {
    year,
    ganzhi: ganzhiKo(yearGz),
    stemTenGod: tenGod(dayStem, yearGz[0]),
    branchTenGod: tenGod(dayStem, branchMainStem(yearGz[1])),
    months,
  };
}

/** 오늘 날짜와 다음 달의 월운(다음 달 미리보기용). */
export function todayInfo(dayStem, now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const gz = Solar.fromYmd(next.getFullYear(), next.getMonth() + 1, 15).getLunar().getMonthInGanZhiExact();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    nextMonth: {
      label: `${next.getFullYear()}년 ${next.getMonth() + 1}월`,
      ganzhi: ganzhiKo(gz),
      stemTenGod: tenGod(dayStem, gz[0]),
      branchTenGod: tenGod(dayStem, branchMainStem(gz[1])),
    },
  };
}
