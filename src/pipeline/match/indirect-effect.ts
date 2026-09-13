// src/pipeline/match/indirect-effect.ts
// F4 3단(신규, 2026-09-13) — LLM 2단이 붙인 원인 후보를 근거로 `unannounced` 델타 중
// "간접 영향"(다른 조항의 파급효과로 설명되는 변화)을 분리한다.
//
// **왜 verdict.ts가 아니라 별도 단계인가 (구조적 제약)**: `verdict.assignStatus`가 실행되는
// 시점에는 `DeltaRecord.causes`가 **항상 비어 있다** — `run-match.ts`는 buildDeltas →
// matchDeterministic(1단) → applyVerdicts → sortDeltas → inferIndirectCandidates(2단 LLM)
// 순서로 돌고, causes는 마지막 단계에서야 채워진다(verdict.ts 헤더 주석이 명시하는 계약).
// 따라서 재분류는 LLM 이후의 post-hoc 단계일 수밖에 없고, 이 파일은 그 단계를 순수 함수로
// 격리해 "status가 LLM 산출물에 의존하는 유일한 지점"을 파일 경계로 드러낸다.
//
// **판정 규칙**(docs/plan/PLAN-indirect-effect-status-2026-09-13.md ③):
//   status==="unannounced" AND causes 중 (verified && candidateNoteId!==null &&
//   confidence >= INDIRECT_EFFECT_MIN_CONFIDENCE)인 후보가 1건 이상
//
// 임계값이 medium인 근거(실측): 두 패치쌍(26.16→17, 26.17→18) 모두 confidence="high"가 **0건**
// 이라 high 전용 안은 구조적으로 무효다. low까지 포함하면 대상이 2배 이상 늘지만(9→21, 5→15)
// 늘어나는 건 전부 저신뢰 픽/밴률 추론이라 차별 지표를 오염시킨다.

import type { DeltaRecord, LlmCause, PatchNoteItem } from "../types";

/** LLM 신뢰도 순위 — 비교 가능하게 수치화. */
const CONFIDENCE_RANK: Record<LlmCause["confidence"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** 간접 영향 재분류 최소 신뢰도(조정 가능하도록 상수로 노출 — 위 헤더의 실측 근거 참고). */
export const INDIRECT_EFFECT_MIN_CONFIDENCE: LlmCause["confidence"] = "medium";

/** 주어진 신뢰도가 재분류 임계값 이상인가. */
export function meetsIndirectEffectConfidence(
  confidence: LlmCause["confidence"],
  min: LlmCause["confidence"] = INDIRECT_EFFECT_MIN_CONFIDENCE
): boolean {
  return CONFIDENCE_RANK[confidence] >= CONFIDENCE_RANK[min];
}

/** 재분류 근거가 되는 후보(검증됨 + 노트 id 존재 + 임계 신뢰도 이상) 중 첫 번째. 없으면 null. */
function findQualifyingCause(
  record: DeltaRecord,
  min: LlmCause["confidence"]
): LlmCause | null {
  for (const cause of record.causes) {
    if (!cause.verified) continue;
    if (cause.candidateNoteId === null) continue; // 링크 걸 대상이 없음
    if (!meetsIndirectEffectConfidence(cause.confidence, min)) continue;
    return cause;
  }
  return null;
}

export interface ReclassifyResult {
  deltas: DeltaRecord[];
  reclassifiedCount: number;
}

/**
 * `unannounced` 델타 중 판정 규칙을 만족하는 것을 `indirect-effect`로 재분류한다(입력 불변).
 *
 * `evidence.noteAnchor`는 판정 근거가 된 후보 노트의 `anchorUrl`로 채운다 — CLAUDE.md
 * "모든 판정문은 원천 링크를 가진다" 원칙을 이 상태에서도 지키기 위함이다. 반면
 * `matchedNoteId`/`matchedNoteIds`는 **절대 채우지 않는다**: 1단 결정론 매칭 결과가 아니므로,
 * 채우면 `compare/logic.ts`의 `representativeStatus`와 `home/logic.ts`의
 * `selectAnnouncedPreview`가 이 행을 "패치노트와 짝지어진 행"으로 오인한다.
 *
 * 호출부(`run-match.ts`)는 이 함수 직후 `sortDeltas`를 다시 호출해야 한다 — status가 바뀌면
 * 정렬 우선순위도 바뀌므로, 그러지 않으면 "항상 정렬된 상태로 반환한다"는 `runMatchPipeline`
 * 계약이 깨진다.
 */
export function reclassifyIndirectEffects(
  deltas: readonly DeltaRecord[],
  notesById: ReadonlyMap<string, PatchNoteItem>,
  min: LlmCause["confidence"] = INDIRECT_EFFECT_MIN_CONFIDENCE
): ReclassifyResult {
  let reclassifiedCount = 0;
  const out = deltas.map((record) => {
    if (record.status !== "unannounced") return record;
    const cause = findQualifyingCause(record, min);
    if (!cause) return record;

    reclassifiedCount += 1;
    const anchor = cause.candidateNoteId ? (notesById.get(cause.candidateNoteId)?.anchorUrl ?? null) : null;
    return {
      ...record,
      status: "indirect-effect" as const,
      evidence: { ...record.evidence, noteAnchor: anchor },
    };
  });
  return { deltas: out, reclassifiedCount };
}
