// src/pipeline/types.ts
// 파이프라인 핵심 도메인 타입. 구현은 각 모듈(collect/aggregate/match)에서 채운다 — 여기는
// 계약(contract)만 정의한다. SCOPE §2 F1~F4 참고.

/** 패치 번호. 예: "26.16" */
export type PatchId = string;

/** collect 단계에서 reduce-on-ingest로 남기는 매치 요약 레코드 (JSONL 1줄 = MatchSlim 1개). */
export interface MatchSlim {
  matchId: string;
  gameVersion: string;
  patch: PatchId;
  queueId: number;
  gameDurationSec: number;
}

/** 챔피언 단위 집계 지표 (포지션별). */
export interface ChampionStat {
  championId: number;
  championKey: string;
  position: string;
  patch: PatchId;
  n: number;
  pickRate: number;
  banRate: number;
  winRate: number;
}

/** 아이템 채택률 집계 지표 (완성템 6슬롯). */
export interface ItemStat {
  itemId: number;
  patch: PatchId;
  n: number;
  adoptionRate: number;
}

/** 오브젝트/라인 타임라인 집계 지표 (F8). */
export interface ObjectiveStat {
  patch: PatchId;
  lane: string;
  n: number;
  goldAt10: number;
  goldAt14: number;
  firstDragonSec: number | null;
  firstHeraldSec: number | null;
  firstBaronSec: number | null;
  firstTowerSec: number | null;
}

/** 패치노트 파서가 산출하는 항목 1건. */
export interface PatchNoteItem {
  id: string;
  entity: string;
  skill: string | null;
  stat: string | null;
  before: string | null;
  after: string | null;
  direction: "buff" | "nerf" | "adjust" | "unknown";
  summary: string;
  anchorUrl: string;
}

/** 델타(관측 변화)의 판정 상태 — UX-BRIEF의 4개 상태 뱃지에 대응한다. */
export type MatchStatus =
  | "announced-consistent"
  | "announced-inconsistent"
  | "unannounced"
  | "insufficient-sample";

/** 판정 근거. 무근거 문장은 sourceUrl=null·reasoning=null로 두어 프론트가 회색 처리한다. */
export interface Verdict {
  status: MatchStatus;
  confidence: number | null;
  sourceMatchIds: string[];
  sourceUrl: string | null;
  reasoning: string | null;
}

/** 패치노트 항목 ↔ 관측 델타 짝짓기 결과 1건. */
export interface DeltaRecord {
  id: string;
  patchFrom: PatchId;
  patchTo: PatchId;
  entity: string;
  metric: string;
  before: number | null;
  after: number | null;
  deltaAbs: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  n: number;
  patchNoteItemId: string | null;
  verdict: Verdict;
}
