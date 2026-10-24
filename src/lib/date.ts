const pad = (n: number) => String(n).padStart(2, '0');

/** 오늘 날짜를 YYYY-MM-DD로 */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD → YYYY.MM.DD */
export function formatDate(value: string | null | undefined): string {
  return value ? value.replaceAll('-', '.') : '';
}

/** 타임스탬프 → YYYY.MM.DD */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / 86_400_000);
}

/** 파일 이름용 YYYYMMDD */
export function compactToday(): string {
  return todayStr().replaceAll('-', '');
}
