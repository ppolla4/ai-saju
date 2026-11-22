// IP당 하루 횟수 제한(메모리). 서버를 재시작하면 초기화된다. 여러 대로 늘리면 Redis 등으로 바꾼다.
export function createDailyLimit(max, now = () => new Date()) {
  let day = "";
  let counts = new Map();
  return {
    take(key) {
      const today = now().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        counts = new Map();
      }
      const used = counts.get(key) ?? 0;
      if (used >= max) return false;
      counts.set(key, used + 1);
      return true;
    },
  };
}
