// 리포트 저장소(시제품용 파일 저장). 실제 서비스에서는 DB로 바꾼다.
// 리포트 id는 추측할 수 없는 UUID라서, 링크를 아는 사람만 열 수 있다.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DIR = process.env.DATA_DIR || "data/reports";
const ID_RE = /^[0-9a-f-]{36}$/;
const file = (id) => path.join(DIR, `${id}.json`);

export async function saveReport(record) {
  await fs.mkdir(DIR, { recursive: true });
  const id = randomUUID();
  const full = { id, createdAt: new Date().toISOString(), ...record };
  await fs.writeFile(file(id), JSON.stringify(full));
  return full;
}

export async function loadReport(id) {
  if (!ID_RE.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(file(id), "utf8"));
  } catch {
    return null;
  }
}
