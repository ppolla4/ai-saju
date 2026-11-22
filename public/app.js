const $ = (id) => document.getElementById(id);
const form = $("form");
const ELEMENT_COLOR = { 목: "var(--wood)", 화: "var(--fire)", 토: "var(--earth)", 금: "var(--metal)", 수: "var(--water)" };

form.timeUnknown.addEventListener("change", () => {
  form.birthTime.disabled = form.timeUnknown.checked;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  $("error").hidden = true;
  const data = new FormData(form);
  const body = {
    name: data.get("name"),
    gender: data.get("gender"),
    birthDate: data.get("birthDate"),
    birthTime: form.timeUnknown.checked ? null : data.get("birthTime") || null,
    calendar: data.get("calendar"),
    job: data.get("job"),
    interests: data.getAll("interests"),
    concern: data.get("concern"),
  };

  $("submit").disabled = true;
  form.hidden = true;
  $("loading").hidden = false;
  try {
    const res = await fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "오류가 났어요.");
    render(json);
  } catch (err) {
    form.hidden = false;
    $("error").textContent = err.message;
    $("error").hidden = false;
  } finally {
    $("loading").hidden = true;
    $("submit").disabled = false;
  }
});

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render({ chart, reading }) {
  $("opening").textContent = reading.opening;
  $("summary").textContent = reading.summary;

  const table = $("pillars");
  table.replaceChildren();
  const order = [["hour", "시"], ["day", "일"], ["month", "월"], ["year", "년"]];
  const head = el("tr");
  order.forEach(([, label]) => head.append(el("th", label)));
  table.append(head);
  for (const part of ["stem", "branch"]) {
    const tr = el("tr");
    for (const [key] of order) {
      const p = chart.pillars[key];
      const td = el("td", null, key === "day" && part === "stem" ? "me" : "");
      if (p) {
        td.append(el("span", p[part].char, "char"), el("span", `${p[part].element} · ${p[part].tenGod}`, "god"));
      } else {
        td.append(el("span", "?", "char"), el("span", "시간 모름", "god"));
      }
      tr.append(td);
    }
    table.append(tr);
  }

  const elements = $("elements");
  elements.replaceChildren();
  for (const [name, count] of Object.entries(chart.elements)) {
    const chip = el("span", `${name} ${count}`);
    chip.style.background = ELEMENT_COLOR[name];
    elements.append(chip);
  }

  $("pv-wealth").textContent = reading.preview.wealth;
  $("pv-caution").textContent = reading.preview.caution;
  $("pv-start").textContent = reading.preview.startNow;

  renderReport(reading.report);
  $("report").hidden = true;
  $("unlock").hidden = false;
  $("result").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function section(title, pairs) {
  const frag = document.createDocumentFragment();
  frag.append(el("h3", title));
  const dl = el("dl");
  for (const [label, value] of pairs) {
    if (label) dl.append(el("dt", label));
    const dd = el("dd");
    if (Array.isArray(value)) {
      const ol = el("ol");
      value.forEach((item) => ol.append(el("li", item)));
      dd.append(ol);
    } else {
      dd.textContent = value;
    }
    dl.append(dd);
  }
  frag.append(dl);
  return frag;
}

function renderReport(r) {
  const report = $("report");
  report.replaceChildren(
    section("1. 한눈에 보는 나", [["", r.overview]]),
    section("2. 재물운", [
      ["돈이 들어오는 방식", r.wealth.howMoneyComes],
      ["올해 흐름", r.wealth.yearFlow],
      ["좋은 달", r.wealth.goodMonths],
      ["맞는 돈 불리기", r.wealth.howToGrow],
    ]),
    section("3. 특히 조심해야 할 일", [
      ["조심할 달", r.caution.months],
      ["돈", r.caution.money],
      ["사람", r.caution.people],
      ["습관", r.caution.habits],
    ]),
    section("4. 지금 당장 시작해야 할 일", [
      ["이번 주", r.startNow.thisWeek],
      ["이번 달", r.startNow.thisMonth],
      ["올해 안에", r.startNow.thisYear],
    ]),
    section("5. 내 고민에 대한 답", [["", r.concernAnswer]]),
    section("6. 행운 포인트", [
      ["색", r.lucky.color],
      ["방향", r.lucky.direction],
      ["숫자", r.lucky.numbers],
      ["도움 되는 사람", r.lucky.people],
    ]),
    section("7. 다음 달 미리보기", [["", r.nextMonth]]),
  );
  report.append(el("p", r.closing, "monk"));
}

$("unlock").addEventListener("click", () => {
  $("report").hidden = false;
  $("unlock").hidden = true;
  $("report").scrollIntoView({ behavior: "smooth" });
});

$("again").addEventListener("click", () => {
  $("result").hidden = true;
  form.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});
