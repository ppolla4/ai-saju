# 노스님의 맞춤 사주 (시제품)

생년월일시와 지금 상황을 넣으면 만세력으로 사주를 계산하고, "노스님" 캐릭터가 재물운, 특히 조심해야 할 일, 지금 당장 시작해야 할 일을 풀어 주는 웹 시제품입니다.

- 전부 무료: 사주 원국 표 + 핵심 세 마디 + 7개 섹션 상세 리포트, PDF 저장, 다시 보기 링크
- 수익: 광고(애드센스 승인 후 `data-ad-slot` 자리에 광고 코드 삽입)
- AI 비용 보호: IP당 하루 풀이 횟수 제한(`DAILY_LIMIT`, 기본 3)

## 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # Claude API 키
npm start                             # http://localhost:3000
# 선택: MODEL=claude-haiku-5-5  DAILY_LIMIT=3  TRUST_PROXY=1
```

테스트: `npm test`

PDF 리포트와 결제 후 이메일 미리보기: `node scripts/preview.js <결과.json> <이름>` (Playwright 필요, `preview/`에 report.pdf · email.html 생성)

## 구조

| 파일 | 하는 일 |
| --- | --- |
| `saju.js` | 만세력 계산(`lunar-javascript`): 사주팔자, 오행 분포, 십성, 대상 연도의 연운·월운 |
| `reading.js` | 노스님 시스템 프롬프트와 출력 스키마, Claude API 호출 |
| `render.js` | PDF용 리포트 HTML(A4, 표지 + 7개 섹션)과 결제 후 발송 이메일 HTML |
| `server.js` | `POST /api/reading` 입력 검증 → 계산 → 풀이 → 저장, `GET /report/:id`(.pdf) 리포트 다시 보기·PDF, IP당 하루 횟수 제한 |
| `store.js` | 리포트 저장(시제품은 `data/reports/*.json`, 실서비스는 DB로 교체) |
| `pdf.js` | HTML → A4 PDF (Playwright 필요) |
| `public/` | 입력 화면, 무료 맛보기, 상세 리포트 화면 |

## 설계 원칙

- **사주는 코드가 계산하고, AI는 풀이만 합니다.** 같은 사람은 항상 같은 원국을 받습니다.
- 풀이 대상 연도는 11월부터 다음 해, 그 전에는 올해입니다.
- 태어난 시간을 모르면 시주 없이 6글자로 풉니다.
- 말투와 금지 표현은 `reading.js`의 `SYSTEM_PROMPT`에 있습니다(정중하면서도 날카롭게, 공포 조성·종목 추천·부적 권유 금지).
- Claude가 응답을 거절하면 서버 측 fallback이 다른 모델로 이어서 씁니다.

## 다음 단계

- 구글 애드센스 신청·승인 후 광고 코드 삽입
- 리포트 이메일로 받기(선택, `render.js`의 `emailHtml`)
- 실제 구매 후기 수집 후 랜딩 후기 칸 채우기
