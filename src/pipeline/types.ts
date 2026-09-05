// src/pipeline/types.ts
// 파이프라인 핵심 도메인 타입. 구현은 각 모듈(collect/aggregate/match)에서 채운다 — 여기는
// 계약(contract)만 정의한다. SCOPE §2 F1~F4 참고. ST-01 확정본 — 다른 배치가 그대로 소비한다.
// 변경 시 반드시 docs/plan/PLAN-patchdrift.md ⑥을 함께 갱신한다.

/** 패치 번호. 정규형은 패치노트 표기(예: "26.17") — shared/patches.ts의 canonicalPatch()가 보장한다. */
export type PatchId = string;

/** [low, high] 형태의 신뢰구간(CI) 튜플. */
export type Interval = [number, number];

/** Riot teamPosition 원본 값. 빈 문자열은 미배정(아레나 잔재 등 비표준 케이스)을 뜻한다. */
export type TeamPosition = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";

/** teamPosition 중 실제 라인 집계에 쓰이는 5개 값(빈 문자열 제외). */
export type LanePosition = Exclude<TeamPosition, "">;

/** participant.challenges 중 파이프라인이 소비하는 필드 — 매치마다 존재 여부가 다르므로 전부 optional. */
export interface ParticipantChallenges {
  goldPerMinute?: number;
  laneMinionsFirst10Minutes?: number;
  damagePerMinute?: number;
}

/** collect 단계에서 reduce-on-ingest로 남기는 참가자 요약 레코드. MatchSlim.participants 1개 = 이 타입. */
export interface ParticipantSlim {
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: TeamPosition;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  /** item0..6 순서 그대로 7개 슬롯(빈 슬롯은 0). */
  items: number[];
  goldEarned: number;
  challenges: ParticipantChallenges;
}

/** 팀 단위 오브젝트 1종의 최초 획득 여부·횟수. */
export interface TeamObjectiveRecord {
  first: boolean;
  kills: number;
}

/** teams[].objectives — void 유충(grubs)은 패치에 따라 존재하지 않을 수 있어 optional. */
export interface TeamObjectives {
  baron: TeamObjectiveRecord;
  dragon: TeamObjectiveRecord;
  riftHerald: TeamObjectiveRecord;
  tower: TeamObjectiveRecord;
  grubs?: TeamObjectiveRecord;
}

/** collect 단계에서 reduce-on-ingest로 남기는 팀 요약 레코드. */
export interface TeamSlim {
  teamId: number;
  win: boolean;
  bans: number[];
  objectives: TeamObjectives;
}

/**
 * collect 단계에서 reduce-on-ingest로 남기는 매치 요약 레코드 (JSONL 1줄 = MatchSlim 1개).
 * 불변식(런타임에서 강제, 타입으로는 표현하지 않음 — 튜플 캐스팅보다 toMatchSlim()의 명시적
 * 검증이 실제 보장을 준다): participants.length === 10, teams.length === 2.
 */
export interface MatchSlim {
  matchId: string;
  gameVersion: string;
  patch: PatchId;
  gameCreationMs: number;
  gameDurationSec: number;
  queueId: number;
  participants: ParticipantSlim[];
  teams: TeamSlim[];
}

/** 라인 하나(블루/레드 한쪽)의 10분·14분 시점 골드 스냅샷. 표본에 해당 시점 프레임이 없으면 null. */
export interface LaneGoldSnapshot {
  goldAt10: number | null;
  goldAt14: number | null;
}

/** 라인 하나의 블루/레드 양쪽 골드 스냅샷. */
export interface TimelineLaneSplit {
  blue: LaneGoldSnapshot;
  red: LaneGoldSnapshot;
}

/** 매치 전체의 첫 오브젝트 획득 시각(초). 해당 이벤트가 없으면 null. */
export interface FirstObjectiveSeconds {
  dragonSec: number | null;
  heraldSec: number | null;
  baronSec: number | null;
  towerSec: number | null;
}

/** collect/timeline.ts가 남기는 타임라인 표본 요약 레코드 (JSONL 1줄 = TimelineSlim 1개). */
export interface TimelineSlim {
  matchId: string;
  patch: PatchId;
  lanes: Partial<Record<LanePosition, TimelineLaneSplit>>;
  firstObjectives: FirstObjectiveSeconds;
}

/** 비율 지표(픽률·밴률·승률) 각각의 CI. 승률은 최소 n 게이트 미달 시 null. */
export interface ChampionRateCi {
  pick: Interval;
  ban: Interval;
  win: Interval | null;
}

/** 챔피언 단위 집계 지표 (포지션별). */
export interface ChampionStat {
  championId: number;
  championKey: string;
  championName: string;
  position: LanePosition | "";
  patch: PatchId;
  n: number;
  pickRate: number;
  banRate: number;
  winRate: number;
  ci: ChampionRateCi;
}

/** 아이템 채택률 집계 지표 (완성템 6슬롯). */
export interface ItemStat {
  itemId: number;
  patch: PatchId;
  n: number;
  adoptionRate: number;
  ci: Interval;
}

/** 오브젝트(용·전령·바론·포탑) 최초 획득 시각 평균 — 라인 골드는 LaneGoldStat으로 분리(F8). */
export interface ObjectiveStat {
  patch: PatchId;
  n: number;
  firstDragonSecAvg: number | null;
  firstHeraldSecAvg: number | null;
  firstBaronSecAvg: number | null;
  firstTowerSecAvg: number | null;
}

/** 라인별 10분/14분 시점 평균 골드 집계 (F8). */
export interface LaneGoldStat {
  patch: PatchId;
  position: LanePosition;
  n: number;
  goldAt10Avg: number;
  goldAt14Avg: number;
}

/** 패치 단위 요약 지표(브리핑 홈 카드용). */
export interface PatchSummary {
  patch: PatchId;
  matches: number;
  avgDurationSec: number;
  firstDragonSecAvg: number | null;
  firstHeraldSecAvg: number | null;
  firstBaronSecAvg: number | null;
  firstTowerSecAvg: number | null;
}

/** 패치노트 항목 섹션 분류. */
export type PatchNoteSection = "champion" | "item" | "system" | "other";

/** 패치노트 파서가 산출하는 항목 1건. */
export interface PatchNoteItem {
  id: string;
  patch: PatchId;
  section: PatchNoteSection;
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

/** F4 2단(LLM)이 제시하는 간접 영향 후보 원인 1건. candidateNoteId는 후보셋 검증(verified) 전까지 링크로 노출하지 않는다. */
export interface LlmCause {
  text: string;
  candidateNoteId: string | null;
  verified: boolean;
}

/**
 * 판정 근거. 무근거 문장은 sourceUrl=null·reasoning=null로 두어 프론트가 회색 처리한다.
 * DeltaRecord.status/evidence와 개념적으로 겹친다 — ST-08에서 verdict.ts가 이 타입을
 * DeltaRecord에 어떻게 매핑/통합할지 확정한다(미확인 사항, 아래 DeltaRecord 주석 참고).
 */
export interface Verdict {
  status: MatchStatus;
  confidence: number | null;
  sourceMatchIds: string[];
  sourceUrl: string | null;
  reasoning: string | null;
}

/** DeltaRecord.id가 가리키는 엔티티 종류. */
export type DeltaEntityType = "champion" | "item" | "objective" | "lane";

/** 판정에 첨부하는 원천 증거 — 모든 판정문은 이 링크를 가져야 한다(무근거=null 필드로 표시). */
export interface DeltaEvidence {
  matchIds: string[];
  aggregatePath: string;
  noteAnchor: string | null;
}

/**
 * 패치 간 관측 변화 1건 — 통계 델타 + 판정 + (있으면) 패치노트 짝짓기 + LLM 간접 후보.
 * id 포맷: `champion:{championKey}:{metric}` | `item:{itemId}:{metric}` | `objective:{name}`
 *         | `lane:{position}:{metric}`
 */
export interface DeltaRecord {
  id: string;
  entityType: DeltaEntityType;
  entityKey: string;
  entityName: string;
  metric: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  ci: Interval;
  n: { before: number; after: number };
  q: number | null;
  status: MatchStatus;
  matchedNoteId: string | null;
  causes: LlmCause[];
  evidence: DeltaEvidence;
}
