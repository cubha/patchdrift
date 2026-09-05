// src/pipeline/collect/patch-calendar.ts
// 패치별 KST 라이브 일자 캘린더 — 크롤러가 매치ID 조회 시간창(startTime/endTime)을 좁히는
// 데 쓰는 휴리스틱이다. 시간창은 후보 축소용일 뿐이며 최종 컷은 항상
// canonicalPatch(match.info.gameVersion) === patch로 한다(실제 배포는 수요일 새벽~오전이라
// 라이브 일자를 KST 00:00으로 가정해도 그 날짜 이전 매치를 취급하지 않는 한 안전하다).

import type { PatchId } from "../types";

export interface PatchCalendarEntry {
  /** 패치 라이브 일자(KST), "YYYY-MM-DD" 형식. */
  liveKst: string;
}

/** ST-03 배치 프롬프트 원문 캘린더. 새 패치가 추가되면 여기만 갱신한다. */
export const PATCH_CALENDAR: Record<PatchId, PatchCalendarEntry> = {
  "26.16": { liveKst: "2026-08-13" },
  "26.17": { liveKst: "2026-08-27" },
  "26.18": { liveKst: "2026-09-10" },
  "26.19": { liveKst: "2026-09-24" },
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 00:00 "YYYY-MM-DD" → epoch seconds(UTC). */
function kstMidnightToEpochSec(dateKst: string): number {
  const utcMs = Date.parse(`${dateKst}T00:00:00Z`) - KST_OFFSET_MS;
  return Math.floor(utcMs / 1000);
}

/** PATCH_CALENDAR 키를 정렬해 patch 바로 다음 패치 ID를 찾는다. 마지막 패치면 null. */
function nextPatchOf(patch: PatchId): PatchId | null {
  const keys = Object.keys(PATCH_CALENDAR).sort();
  const idx = keys.indexOf(patch);
  if (idx === -1 || idx === keys.length - 1) return null;
  return keys[idx + 1];
}

export interface PatchWindow {
  startTime: number;
  endTime: number;
}

/**
 * patch의 매치ID 조회 후보 시간창을 계산한다: startTime=해당 패치 라이브(KST 00:00),
 * endTime=다음 패치 라이브(캘린더에 다음 패치가 없으면 nowMs()). PATCH_CALENDAR에 없는
 * patch를 넘기면 throw한다(무근거 시간창을 임의로 만들지 않는다).
 */
export function patchWindow(patch: PatchId, nowMs: () => number = Date.now): PatchWindow {
  const entry = PATCH_CALENDAR[patch];
  if (!entry) {
    throw new Error(`patch-calendar: unknown patch "${patch}" — PATCH_CALENDAR에 등록 필요`);
  }
  const startTime = kstMidnightToEpochSec(entry.liveKst);
  const next = nextPatchOf(patch);
  const endTime = next ? kstMidnightToEpochSec(PATCH_CALENDAR[next].liveKst) : Math.floor(nowMs() / 1000);
  return { startTime, endTime };
}
