// src/pipeline/aggregate/stats.ts
// 통계 게이트 — Wilson CI, Newcombe 차이 CI, BH-FDR 다중비교 보정. 외부 통계 라이브러리 의존 0
// (SCOPE §3 "통계" 채택 근거: 함수 4개 수준, 판정 로직 투명성).
// TODO(F2): 자체 구현

export interface ConfidenceInterval {
  low: number;
  high: number;
}

/** Wilson score interval — 단일 비율(픽률·밴률·승률)의 95% CI. */
export function wilsonInterval(successes: number, n: number, z = 1.96): ConfidenceInterval {
  throw new Error(`TODO(F2): wilsonInterval(${successes}/${n}, z=${z}) not implemented`);
}

/** Newcombe method — 두 독립 비율 차이(patchA vs patchB)의 95% CI. */
export function newcombeDiffInterval(
  a: { successes: number; n: number },
  b: { successes: number; n: number }
): ConfidenceInterval {
  throw new Error(
    `TODO(F2): newcombeDiffInterval(${a.successes}/${a.n}, ${b.successes}/${b.n}) not implemented`
  );
}

/** Benjamini-Hochberg FDR 보정 — p-value 배열 → 보정된 q-value 배열(동일 순서). */
export function benjaminiHochberg(pValues: number[]): number[] {
  throw new Error(`TODO(F2): benjaminiHochberg(n=${pValues.length}) not implemented`);
}
