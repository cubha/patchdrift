// src/pipeline/shared/significance.ts
// 델타 1건이 "통계적으로 유의한 변화"인지 판정하는 단일 구현(2026-09-05 리팩토링 — 기존에
// src/components/home/logic.ts(qAlpha 하드코딩 0.1)와 src/pipeline/discord/webhook.ts(qAlpha
// 파라미터 있음)에 사실상 동일한 로직이 두 번 구현돼 있었다). `status`만으로는 부족하다 —
// verdict.ts의 assignStatus는 "유의 + 노트 짝(방향 불일치/중립)"과 "비유의 + 노트 짝 있음"을
// 둘 다 `announced-inconsistent`로 합쳐 넣기 때문에, status 대신 q/CI/게이트를 직접 재판정한다.
//
// 클라이언트 번들에도 실린다("use client" CompareExplorer.tsx → compare/logic.ts →
// home/logic.ts가 이 모듈을 import) — fs 등 Node 전용 의존을 절대 들이지 않는다.

import type { DeltaRecord } from "../types";
import { FDR_ALPHA } from "../aggregate/stats";

/**
 * 판정 순서: `insufficient-sample`(승률 n 게이트 미달)은 무조건 제외 → q가 없거나 qAlpha 이상이면
 * 제외 → CI가 0을 포함하면 제외. `qAlpha` 기본값은 `FDR_ALPHA`(0.1)이며, 호출부는 보통
 * `deltas.meta.qAlpha`(실제 그 델타 파일을 만들 때 쓴 값)를 넘긴다.
 */
export function isSignificantDelta(record: DeltaRecord, qAlpha: number = FDR_ALPHA): boolean {
  if (record.status === "insufficient-sample") return false;
  if (record.q === null || record.q >= qAlpha) return false;
  const [lo, hi] = record.ci;
  if (lo <= 0 && hi >= 0) return false;
  return true;
}
