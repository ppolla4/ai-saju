# 노스님의 맞춤 사주 (시제품)

생년월일시와 지금 상황을 넣으면 만세력으로 사주를 계산하고, "노스님" 캐릭터가 재물운, 특히 조심해야 할 일, 지금 당장 시작해야 할 일을 풀어 주는 웹 시제품입니다.

- 무료 맛보기: 사주 원국 표 + 핵심 세 줄
- 유료 상세 리포트(9,900원): 7개 섹션. 시제품에서는 결제 없이 바로 열립니다.

## 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # Claude API 키
npm start                             # http://localhost:3000
```

테스트: `npm test`

PDF 리포트와 결제 후 이메일 미리보기: `node scripts/preview.js <결과.json> <이름>` (Playwright 필요, `preview/`에 report.pdf · email.html 생성)

## 구조

| 파일 | 하는 일 |
| --- | --- |
| `saju.js` | 만세력 계산(`lunar-javascript`): 사주팔자, 오행 분포, 십성, 대상 연도의 연운·월운 |
| `reading.js` | 노스님 시스템 프롬프트와 출력 스키마, Claude API 호출 |
| `render.js` | PDF용 리포트 HTML(A4, 표지 + 7개 섹션)과 결제 후 발송 이메일 HTML |
| `server.js` | `POST /api/reading` 입력 검증 → 계산 → 풀이 → 저장(무료 맛보기만 응답), `POST /api/reports/:id/unlock` 결제 완료 처리, `GET /report/:id`(.pdf) 결제된 리포트 보기·PDF |
| `store.js` | 리포트 저장(시제품은 `data/reports/*.json`, 실서비스는 DB로 교체) |
| `pdf.js` | HTML → A4 PDF (Playwright 필요) |
| `public/` | 입력 화면, 무료 맛보기, 상세 리포트 화면 |

## 설계 원칙

- **사주는 코드가 계산하고, AI는 풀이만 합니다.** 같은 사람은 항상 같은 원국을 받습니다.
- 풀이 대상 연도는 11월부터 다음 해, 그 전에는 올해입니다.
- 태어난 시간을 모르면 시주 없이 6글자로 풉니다.
- 말투와 금지 표현은 `reading.js`의 `SYSTEM_PROMPT`에 있습니다(정중하면서도 날카롭게, 공포 조성·종목 추천·부적 권유 금지).
- 전체 리포트는 결제 전에는 브라우저로 보내지 않습니다. 서버에 저장해 두고, 결제가 확인된 뒤에만 엽니다.
- Claude가 응답을 거절하면 서버 측 fallback이 다른 모델로 이어서 씁니다.

## 다음 단계

- 결제 연동(토스페이먼츠 등): `unlock`을 결제 승인 확인 뒤에만 부르도록 교체
- 결제 후 리포트 이메일 발송(`render.js`의 `emailHtml` + PDF 첨부)
- 실제 구매 후기 수집 후 랜딩 후기 칸 채우기
