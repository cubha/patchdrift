// src/pipeline/shared/status-order.ts
// MatchStatus 정렬 우선순위 단일 소스 — verdict.ts(node, sortDeltas)와 compare/logic.ts(클라이언트,
// representativeStatus)가 이 파일 하나만 본다.
//
// 신설 이유(2026-09-13, below-threshold 도입): `compare/logic.ts`의 기존 `STATUS_PRIORITY`는
// 평범한 `MatchStatus[]` 배열 + `indexOf`였다 — 배열에 없는 상태값은 `indexOf`가 -1을 반환하고,
// `-1 < 다른 모든 순위`이므로 그 상태가 최우선으로 오판정된다(신규 상태를 배열에 추가하는 걸
// 깜빡해도 tsc가 못 잡는 조용한 결함). `Record<MatchStatus, number>`는 유니온을 전수 요구하는
// exhaustive 타입이라, 새 status가 `types.ts`에 추가되고 여기 누락되면 tsc가 컴파일 타임에 잡는다
// (verdict.ts의 기존 STATUS_SORT_PRIORITY·format.ts STATUS_LABELS와 동일한 SSOT 관례).
//
// fs 등 Node 전용 의존 없음 — significance.ts와 동일 원칙으로 클라이언트 번들에도 실린다
// (compare/logic.ts가 "use client" CompareExplorer.tsx에서 소비).
//
// 순위 근거: unannounced(0) > indirect-effect(1) > announced-inconsistent(2) >
// announced-consistent(3) > below-threshold(4) > insufficient-sample(5) > no-change(6).
// below-threshold는 통계적으로는 실재하는 유의 변화이지만(insufficient-sample=판정 유보와 다름)
// 실무상 무시 가능한 규모라 아래쪽에 둔다. indirect-effect(2026-09-13 신규)는 "노트에 직접
// 조항은 없지만 다른 조항의 파급효과로 설명되는 변화"라 순수 미공지 바로 다음 — 원인 체인이
// 붙어 있어 정보량은 높지만 "노트가 말하지 않은 미지의 변화"라는 차별 지표에서는 한 단계 아래다.

import type { MatchStatus } from "../types";

export const STATUS_SORT_PRIORITY: Record<MatchStatus, number> = {
  unannounced: 0,
  "indirect-effect": 1,
  "announced-inconsistent": 2,
  "announced-consistent": 3,
  "below-threshold": 4,
  "insufficient-sample": 5,
  "no-change": 6,
};
