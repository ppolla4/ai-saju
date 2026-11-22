// 풀이 결과 → PDF용 리포트 HTML, 결제 후 발송 이메일 HTML.
// 두 함수 모두 순수 함수라서 서버, 이메일 발송, 미리보기 스크립트에서 같이 쓴다.

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ELEMENT_COLOR = { 목: "#4f7a43", 화: "#b8432b", 토: "#a7792b", 금: "#7d7f86", 수: "#2f5f8a" };
const ORDER = [["hour", "시"], ["day", "일"], ["month", "월"], ["year", "년"]];

function pillarTable(chart) {
  const head = ORDER.map(([, label]) => `<th>${label}주</th>`).join("");
  const row = (part) =>
    ORDER.map(([key]) => {
      const p = chart.pillars[key];
      if (!p) return `<td><b>?</b><small>시간 모름</small></td>`;
      const me = key === "day" && part === "stem" ? ' class="me"' : "";
      return `<td${me}><b>${esc(p[part].char)}</b><small>${esc(p[part].element)} · ${esc(p[part].tenGod)}</small></td>`;
    }).join("");
  return `<table class="pillars"><tr>${head}</tr><tr>${row("stem")}</tr><tr>${row("branch")}</tr></table>`;
}

function elementChips(chart) {
  return Object.entries(chart.elements)
    .map(([name, count]) => `<span style="background:${ELEMENT_COLOR[name]}">${name} ${count}</span>`)
    .join("");
}

const dl = (pairs) =>
  `<dl>${pairs
    .map(([label, value]) => {
      const body = Array.isArray(value) ? `<ol>${value.map((v) => `<li>${esc(v)}</li>`).join("")}</ol>` : `<p>${esc(value)}</p>`;
      return `${label ? `<dt>${esc(label)}</dt>` : ""}<dd>${body}</dd>`;
    })
    .join("")}</dl>`;

/**
 * A4 PDF용 리포트. Playwright 등으로 page.pdf()를 돌리면 그대로 PDF가 된다.
 * @param {{name: string, chart: object, flow: object, reading: object, issuedAt?: string}} data
 */
export function reportHtml({ name, chart, flow, reading, issuedAt }) {
  const r = reading.report;
  const sections = [
    ["한눈에 보는 나", dl([["", r.overview]])],
    ["재물운", dl([["돈이 들어오는 방식", r.wealth.howMoneyComes], ["올해 흐름", r.wealth.yearFlow], ["좋은 달", r.wealth.goodMonths], ["맞는 돈 불리기", r.wealth.howToGrow]])],
    ["특히 조심해야 할 일", dl([["조심할 달", r.caution.months], ["돈", r.caution.money], ["사람", r.caution.people], ["습관", r.caution.habits]])],
    ["지금 당장 시작해야 할 일", dl([["이번 주", r.startNow.thisWeek], ["이번 달", r.startNow.thisMonth], ["올해 안에", r.startNow.thisYear]])],
    ["내 고민에 대한 답", dl([["", r.concernAnswer]])],
    ["행운 포인트", dl([["색", r.lucky.color], ["방향", r.lucky.direction], ["숫자", r.lucky.numbers], ["도움 되는 사람", r.lucky.people]])],
    ["다음 달 미리보기", dl([["", r.nextMonth]])],
  ];

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(name)} 님의 ${flow.year}년 맞춤 사주</title>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #23201b; font: 10.5pt/1.75 "Noto Sans KR", sans-serif; }
  h1, h2, .quote, .summary, .pillars b { font-family: "Nanum Myeongjo", serif; }
  .cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; text-align: center;
           background: #f4efe4; border: 1px solid #ddd4c2; padding: 0 18mm; break-after: page; }
  .eyebrow { color: #a7792b; letter-spacing: .3em; font-size: 9pt; margin: 0; }
  h1 { font-size: 30pt; font-weight: 800; margin: 6mm 0 3mm; }
  .cover .sub { color: #6d665a; margin: 0 0 12mm; }
  .summary { font-size: 15pt; font-weight: 700; margin: 8mm 0 4mm; }
  .pillars { width: 100%; border-collapse: collapse; table-layout: fixed; text-align: center; background: #fbf8f1; }
  .pillars th { font-weight: 500; font-size: 9pt; color: #6d665a; padding: 2mm; }
  .pillars td { border: 1px solid #ddd4c2; padding: 3mm 1mm; }
  .pillars td.me { background: #efe3c8; }
  .pillars b { display: block; font-size: 17pt; }
  .pillars small { font-size: 8pt; color: #6d665a; }
  .chips { margin-top: 4mm; }
  .chips span { display: inline-block; color: #fff; font-size: 8.5pt; padding: 1mm 3mm; border-radius: 9mm; margin: 0 1mm; }
  .meta { margin-top: 14mm; font-size: 8.5pt; color: #6d665a; }
  .quote { font-size: 12pt; border-left: 3px solid #a7792b; padding: 1mm 0 1mm 5mm; margin: 0 0 8mm; }
  h2 { font-size: 15pt; margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 1px solid #ddd4c2; break-after: avoid; }
  h2 .no { color: #8a2f1d; margin-right: 2mm; }
  dt { font-weight: 700; margin-top: 3mm; break-after: avoid; }
  dd { margin: 0; }
  dd p { margin: 1mm 0 0; }
  ol { margin: 1mm 0 0; padding-left: 6mm; }
  li { margin-bottom: 1mm; }
  dd { break-inside: avoid; }
  .closing { margin-top: 10mm; }
  .disclaimer { margin-top: 8mm; font-size: 8pt; color: #6d665a; text-align: center; }
</style></head>
<body>
  <section class="cover">
    <p class="eyebrow">노스님의 맞춤 사주</p>
    <h1>${esc(name)} 님의<br>${flow.year}년 사주 풀이</h1>
    <p class="sub">${esc(chart.dayMaster.image)}, ${esc(chart.dayMaster.char)} 일간 · ${esc(flow.ganzhi)}년</p>
    ${pillarTable(chart)}
    <div class="chips">${elementChips(chart)}</div>
    <p class="summary">"${esc(reading.summary)}"</p>
    <p class="meta">양력 ${esc(chart.solarDate)}${chart.timeKnown ? "" : " · 태어난 시간 모름(시주 제외)"}${issuedAt ? ` · 발행 ${esc(issuedAt)}` : ""}</p>
  </section>
  <p class="quote">${esc(reading.opening)}</p>
  ${sections.map(([title, body], i) => `<h2><span class="no">${i + 1}</span>${esc(title)}</h2>${body}`).join("\n  ")}
  <p class="quote closing">${esc(r.closing)}</p>
  <p class="disclaimer">사주 풀이는 참고용이며, 중요한 결정은 스스로 판단하세요.</p>
</body></html>`;
}

/**
 * 결제 후 발송 이메일. 메일 프로그램 호환을 위해 표 레이아웃 + 인라인 스타일만 쓴다.
 * 본문에는 요약과 핵심 세 가지만 넣고, 전체 리포트는 PDF 첨부 + 웹 링크로 준다.
 * @param {{name: string, chart: object, flow: object, reading: object, reportUrl: string}} data
 */
export function emailHtml({ name, chart, flow, reading, reportUrl }) {
  const r = reading.report;
  const firstLine = (text) => esc(String(text).split(/(?<=[.!?。])\s/)[0]);
  const block = (tag, color, title, text) => `
        <tr><td style="padding:14px 0;border-bottom:1px dashed #ddd4c2;">
          <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:4px;">${tag}</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${esc(title)}</div>
          <div style="font-size:14px;line-height:1.7;color:#3c3830;">${text}</div>
        </td></tr>`;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} 님, 노스님의 풀이가 도착했습니다</title></head>
<body style="margin:0;padding:0;background:#f4efe4;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(reading.summary)} — ${flow.year}년 재물운과 조심할 달을 확인하세요.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe4;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f1;border:1px solid #ddd4c2;border-radius:12px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#23201b;">
      <tr><td style="padding:28px 28px 8px;text-align:center;">
        <div style="font-size:12px;letter-spacing:4px;color:#a7792b;">노스님의 맞춤 사주</div>
        <h1 style="font-family:Georgia,'Nanum Myeongjo',serif;font-size:24px;margin:10px 0 6px;">${esc(name)} 님, 풀이가 도착했습니다</h1>
        <div style="font-size:13px;color:#6d665a;">${esc(chart.dayMaster.image)}(${esc(chart.dayMaster.char)}) 일간 · ${flow.year}년 ${esc(flow.ganzhi)}</div>
      </td></tr>
      <tr><td style="padding:16px 28px;">
        <div style="font-family:Georgia,'Nanum Myeongjo',serif;font-size:18px;font-weight:700;text-align:center;padding:16px;background:#f4efe4;border-radius:8px;">"${esc(reading.summary)}"</div>
      </td></tr>
      <tr><td style="padding:0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${block("재물운", "#a7792b", "좋은 달", firstLine(r.wealth.goodMonths))}
          ${block("조심할 일", "#8a2f1d", "조심할 달", firstLine(r.caution.months))}
          ${block("시작할 일", "#2f5f8a", "이번 주에 할 일", `<ol style="margin:0;padding-left:18px;">${r.startNow.thisWeek.map((t) => `<li style="margin-bottom:4px;">${firstLine(t)}</li>`).join("")}</ol>`)}
        </table>
      </td></tr>
      <tr><td style="padding:24px 28px;text-align:center;">
        <a href="${esc(reportUrl)}" style="display:inline-block;background:#8a2f1d;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:8px;">전체 리포트 보기</a>
        <div style="font-size:12px;color:#6d665a;margin-top:10px;">전체 리포트는 PDF로도 첨부해 드렸습니다.</div>
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <div style="font-family:Georgia,'Nanum Myeongjo',serif;font-size:14px;border-left:3px solid #a7792b;padding-left:12px;color:#3c3830;">${esc(r.closing)}</div>
      </td></tr>
    </table>
    <div style="max-width:560px;font-size:11px;color:#6d665a;line-height:1.6;padding:14px 8px;font-family:sans-serif;">
      사주 풀이는 참고용이며, 중요한 결정은 스스로 판단하세요.<br>
      이 메일은 노스님의 맞춤 사주 결제 고객에게 발송되었습니다.
    </div>
  </td></tr>
</table>
</body></html>`;
}
