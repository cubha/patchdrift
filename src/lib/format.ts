// src/lib/format.ts
// 표시 포맷 유틸(퍼센트·델타·타임스탬프·라벨 등). 컴포넌트·페이지가 공통으로 소비한다.
// 음수는 하이픈(-)이 아니라 유니코드 마이너스(U+2212, −)로 표기한다 — 타이포그래피 관례이자
// 표에서 하이픈/마이너스 혼용을 없애기 위함(UX-BRIEF 델타 표기 전반에 일관 적용).

import type { Interval, LanePosition, MatchStatus, TeamPosition } from "@/pipeline/types";

const MINUS = "−";

/** 부호 문자열(+/−/"")을 반환한다. 0은 부호 없음. */
function sign(n: number): string {
  if (n > 0) return "+";
  if (n < 0) return MINUS;
  return "";
}

/** 절대값을 고정 소수점 문자열로. 유니코드 마이너스 부호와 조합해 쓴다. */
function fixedAbs(n: number, digits: number): string {
  return Math.abs(n).toFixed(digits);
}

/** 비율(0~1 분수)을 퍼센트 문자열로. fmtPct(0.046) => "4.6%". */
export function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 퍼센트포인트 델타(분수 단위 입력)를 부호 포함 문자열로. fmtPp(0.025) => "+2.5%p",
 * fmtPp(-0.018) => "−1.8%p". */
export function fmtPp(delta: number, digits = 1): string {
  return `${sign(delta)}${fixedAbs(delta * 100, digits)}%p`;
}

/** CI [lo, hi]의 반폭(half-width)을 "±X" 문자열로. 단위 변환(퍼센트포인트 등)은 호출부가
 * 미리 스케일링한 interval을 넘긴다 — fmtCiHalf([0.021, 0.029]) => "±0.4"(퍼센트 스케일 전제 시
 * 호출부가 *100 해서 넘긴다는 뜻이 아니라, 이 함수 자체는 단위 불문 반폭만 계산한다). */
export function fmtCiHalf(ci: Interval, digits = 1): string {
  const [lo, hi] = ci;
  const half = Math.abs(hi - lo) / 2;
  return `±${half.toFixed(digits)}`;
}

/** 초를 "분:초" 문자열로. fmtSec(352) => "5:52". 음수는 지원하지 않는다(절대 시각용). */
export function fmtSec(s: number): string {
  const total = Math.round(Math.abs(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** 초 단위 델타를 부호 포함 "+Ns" 문자열로. fmtDeltaSec(22) => "+22s", fmtDeltaSec(-11) => "−11s". */
export function fmtDeltaSec(d: number): string {
  return `${sign(d)}${Math.round(Math.abs(d))}s`;
}

/** 정수를 천 단위 콤마로. fmtInt(10240) => "10,240". */
export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** 부호 포함 정수(골드 델타 등). fmtDeltaInt(320) => "+320", fmtDeltaInt(-85) => "−85". */
export function fmtDeltaInt(n: number): string {
  return `${sign(n)}${fmtInt(Math.abs(n))}`;
}

/** ISO 8601(UTC) 문자열을 KST(UTC+9) "YYYY-MM-DD HH:mm KST"로. fmtKst("2026-09-05T05:00:00.000Z")
 * => "2026-09-05 14:00 KST". Intl.DateTimeFormat의 Asia/Seoul 타임존으로 실제 오프셋을
 * 계산한다(고정 +9 가산이 아님 — 서머타임 없는 KST라 동일하지만 실 오프셋 계산이 더 안전). */
export function fmtKst(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const mo = get("month");
  const d = get("day");
  const h = get("hour") === "24" ? "00" : get("hour");
  const mi = get("minute");
  return `${y}-${mo}-${d} ${h}:${mi} KST`;
}

/** MatchStatus 4종 + 미래 확장값("no-change" 등)을 수용하는 상태 라벨. 알려지지 않은 값은
 * 크래시 대신 원본 문자열을 그대로 반환한다(ST-08/09가 아직 만들지 않은 상태값이 와도 안전). */
const STATUS_LABELS: Record<MatchStatus, string> = {
  "announced-consistent": "공지-일치",
  "announced-inconsistent": "공지-불일치",
  unannounced: "미공지",
  "insufficient-sample": "표본 부족",
  "no-change": "변화 없음",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as MatchStatus] ?? status;
}

/** DeltaRecord.metric(문자열 키) → 한글 라벨. 알려지지 않은 metric은 원본 문자열을 그대로
 * 반환한다(ST-08 산출 metric 어휘가 아직 확정되지 않았으므로 목록은 문서화된 사례 위주). */
const METRIC_LABELS: Record<string, string> = {
  pickRate: "픽률",
  banRate: "밴률",
  winRate: "승률",
  adoptionRate: "채택률",
  goldAt10: "골드@10",
  goldAt14: "골드@14",
  firstDragonSec: "첫 용 시각",
  firstHeraldSec: "첫 전령 시각",
  firstBaronSec: "첫 바론 시각",
  firstTowerSec: "첫 포탑 시각",
  avgDurationSec: "경기 시간",
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}

/** LanePosition(+빈 문자열 "미배정") → 한글 라벨. 알려지지 않은 값은 원본을 반환한다. */
const POSITION_LABELS: Record<TeamPosition, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서포터",
  "": "미배정",
};

export function positionLabel(position: LanePosition | TeamPosition | string): string {
  return POSITION_LABELS[position as TeamPosition] ?? position;
}
