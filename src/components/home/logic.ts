// src/components/home/logic.ts
// 브리핑 홈 순수 로직 — 요약 카드 수치·미공지 상위 5·공지 대조 미리보기 5·추정 원인 표기·노트
// id 인덱스. 렌더(page.tsx·home/*.tsx)와 분리해 단위 테스트한다(완료 조건 "순수 함수로 분리").
// UX-BRIEF §3 "01 브리핑 홈" + 코디네이터 지시(ST-11 프롬프트) 기준.

import type { DeltaKind } from "@/components/DeltaValue";
import type { DeltaRecord, DeltasFile, LlmCause, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import { fmtDeltaInt, fmtDeltaSec, fmtInt, fmtPct, fmtPp, fmtSec, metricLabel } from "@/lib/format";

/** 좌·아이템 노트만 "엔티티 단위"로 묶는다(시스템/기타는 챔피언·아이템 엔티티가 아니라 제외 —
 * ST-08 entity-match.ts의 블로킹 대상 정의와 동일). */
const ENTITY_NOTE_SECTIONS = new Set(["champion", "item"]);

/** 패치노트 항목(section champion|item)을 "entity" 단위로 묶어 몇 개의 서로 다른 엔티티가
 * 언급됐는지 센다 — ST-08 `matchedNoteIds`가 같은 엔티티의 노트 여러 줄을 한 묶음으로 취급하는
 * 기준과 일치시킨다(예: 아우렐리온 솔 스킬 2줄 변경 = 노트 항목 2건이지만 엔티티는 1개).
 * `section:entity`로 키를 만드는 이유: 이론상 챔피언명과 아이템명이 같은 문자열일 가능성을
 * 배제하기 위함(실제로 아직 충돌 사례는 없다 — ST-08 실측). */
export function countRelevantNoteEntities(notes: NotesFile | null): number {
  if (!notes) return 0;
  const keys = new Set<string>();
  for (const item of notes.items) {
    if (!ENTITY_NOTE_SECTIONS.has(item.section)) continue;
    keys.add(`${item.section}:${item.entity}`);
  }
  return keys.size;
}

/** CI [lo, hi]가 0을 포함하면 유의하지 않다(비중첩 판정과 동일한 관례 — ST-05 Newcombe CI가
 * 이 튜플을 만드는 방식과 일치). */
function ciContainsZero(ci: DeltaRecord["ci"]): boolean {
  return ci[0] <= 0 && ci[1] >= 0;
}

/** 델타 1건이 "통계적으로 유의한 변화"인지 — **상태 라벨이 아니라 q·CI를 직접 검사**한다
 * (코디네이터 정정, 2026-09-05). `status`만으로 세면 `announced-inconsistent`가 "방향이
 * 다른 유의한 변화"와 "노트는 있지만 통계적으로 변화 없음"(ST-08 verdict.assignStatus 3번
 * 분기) 두 경우를 한데 묶어 M을 부풀린다 — 실측: 자기쌍(26.17→26.17) `announced-inconsistent`
 * 212건은 전부 후자(델타 그 자체가 없는 자기비교)인데, status 기준으로 세면 M=212로 잘못
 * 나온다. `insufficient-sample`(승률 n 게이트 미달)은 q·CI가 있어도 무조건 비유의로 친다 —
 * PLAN ②의 "미달=insufficient-sample"과 동일한 무조건 우선순위. */
export function isSignificantDelta(record: DeltaRecord): boolean {
  if (record.status === "insufficient-sample") return false;
  if (record.q === null) return false;
  if (record.q >= 0.1) return false;
  if (ciContainsZero(record.ci)) return false;
  return true;
}

/** 요약 카드 헤드라인 3수치(+스탯 타일 3종이 그대로 이 수치를 쓴다 — 코디네이터 정정,
 * 2026-09-05: 타일 "공지된 변화"는 별도 델타 집계가 아니라 `noteItemCount`(N)를 그대로
 * 재사용한다). */
export interface HeadlineStats {
  /** "패치노트는 N개 엔티티를 말했고" + 스탯 타일 "공지된 변화" — 위 countRelevantNoteEntities. */
  noteItemCount: number;
  /** "통계는 M개 변화를 말합니다" + 스탯 타일 "유의 변화" — `isSignificantDelta` 통과 건수. */
  statCount: number;
  /** 스탯 타일 "미공지" — `status==="unannounced"` 건수. */
  unannouncedCount: number;
}

/** deltas/notes가 아직 없으면(ST-08 미착수 구간·빈 데이터 빌드) 전부 0을 반환한다(throw 없음 —
 * 빈 상태 카드 렌더 보장, ST-11 완료 조건). */
export function computeHeadline(
  deltas: DeltasFile | null,
  notes: NotesFile | null
): HeadlineStats {
  const noteItemCount = countRelevantNoteEntities(notes);
  const rows = deltas?.rows ?? [];
  let statCount = 0;
  let unannouncedCount = 0;
  for (const row of rows) {
    if (isSignificantDelta(row)) statCount++;
    if (row.status === "unannounced") unannouncedCount++;
  }
  return { noteItemCount, statCount, unannouncedCount };
}

/** delta===null은 "측정 불가"에 가까운 취급으로 정렬 맨 뒤로 보낸다(ST-08 verdict.sortDeltas와
 * 동일 관례). */
export function absDelta(record: DeltaRecord): number {
  return record.delta === null ? -Infinity : Math.abs(record.delta);
}

/** 미공지 변화 상위 N건 — ST-08 `writeDeltas`가 이미 상태 우선순위(unannounced 최우선) →
 * `|delta|` 내림차순으로 정렬해 기록하므로(verdict.sortDeltas), 여기서는 상태로 필터링만 하고
 * 파일 순서를 신뢰한다(재정렬하지 않음 — ST-11 프롬프트 "정렬은 파일 순서 신뢰"). */
export function selectTopUnannounced(deltas: DeltasFile | null, limit = 5): DeltaRecord[] {
  const rows = deltas?.rows ?? [];
  return rows.filter((r) => r.status === "unannounced").slice(0, limit);
}

/** 챔피언 델타 id가 "scope=all"(포지션 무관) 행인지 — `champion:{key}:{metric}`(3세그먼트)이면
 * all, `champion:{key}:{pos}:{metric}`(4세그먼트)이면 position(ST-08 id 네임스페이스 확정).
 * 다른 entityType은 이 구분이 없어 항상 true(우선순위 동점 처리 — 실질적으로 아래 dedupe에서
 * `|delta|` 비교로만 갈린다). */
function isAllScopeChampionRow(record: DeltaRecord): boolean {
  if (record.entityType !== "champion") return true;
  return record.id.split(":").length === 3;
}

/** 공지 대조 미리보기 상위 N건 — **엔티티 단위로 대표 1행만** 뽑아 `|delta|` 큰 순으로 정렬한다
 * (코디네이터 정정, 2026-09-05, 두 번째 라운드). 최초 구현은 `matchedNoteIds`가 있는 모든
 * **행**(픽률·밴률·승률·포지션별 픽/승 등 지표별로 별도 행)을 그대로 `|delta|`로 정렬해 상위
 * N개를 뽑았는데, 실측(26.17 자기쌍)에서 delta가 전부 0으로 동률이 되자 정렬이 안정 정렬로
 * 원본 파일 순서를 유지해 **같은 챔피언(예: 키아나)의 지표별 행 6개가 상위 5자리를 모두
 * 차지**했다 — 전부 같은 `matchedNoteId`를 공유하므로 미리보기 5행이 전부 동일한 노트 문장을
 * 반복해서 보여주는 결함으로 나타났다. 같은 엔티티는 하나만 대표로 뽑아야 5행이 서로 다른
 * 엔티티를 보여준다.
 *
 * 대표 선정 규칙: `entityType:entityKey`로 그룹핑 → 그룹 내에서 (1) 챔피언 scope=all 행 우선
 * (2) 그중(또는 scope 구분이 없으면 전체 중) `|delta|` 최댓값. */
export function selectAnnouncedPreview(deltas: DeltasFile | null, limit = 5): DeltaRecord[] {
  const matched = (deltas?.rows ?? []).filter((r) => r.matchedNoteIds.length > 0);

  const groups = new Map<string, DeltaRecord[]>();
  for (const row of matched) {
    const key = `${row.entityType}:${row.entityKey}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const representatives: DeltaRecord[] = [];
  for (const group of groups.values()) {
    const best = [...group].sort((a, b) => {
      const scopeDiff = Number(isAllScopeChampionRow(b)) - Number(isAllScopeChampionRow(a));
      if (scopeDiff !== 0) return scopeDiff;
      return absDelta(b) - absDelta(a);
    })[0];
    representatives.push(best);
  }

  return representatives.sort((a, b) => absDelta(b) - absDelta(a)).slice(0, limit);
}

/** 공지 대조 미리보기 행 텍스트 — "{엔티티명}[ · {스킬}] — {노트 stat 라인}[ 외 K건]"(코디네이터
 * 지시, 2026-09-05 — 프로토타입 "나서스 기본 지속 효과 생명력 흡수 12/18/24% ⇒ 10/15/20%"처럼
 * 엔티티명이 문장 맨 앞에 오도록). `matchedNoteCount`가 1보다 크면(같은 엔티티에 노트가 여럿
 * 걸림, 예: 스킬 변경 2줄) "외 K건"(K=matchedNoteCount-1)을 덧붙인다. `note`가 없으면(방어적
 * 케이스 — matchedNoteId가 있는데 notesById에서 못 찾는 경우) 엔티티명만 표시. */
export function formatNotePreviewText(
  note: PatchNoteItem | undefined,
  matchedNoteCount: number,
  fallbackEntityName: string
): string {
  if (!note) return fallbackEntityName;
  const skillPart = note.skill ? ` · ${note.skill}` : "";
  const extra = matchedNoteCount > 1 ? ` 외 ${matchedNoteCount - 1}건` : "";
  return `${note.entity}${skillPart} — ${note.summary}${extra}`;
}

/** DeltaRecord.metric → DeltaValue의 kind 3종. ST-08이 산출하는 metric 어휘(픽률·밴률·승률·
 * 채택률=pp / 경기시간·오브젝트 첫 시각=sec / 라인 골드=gold) 기준 — format.ts METRIC_LABELS와
 * 동일한 문서화된 사례 집합을 따른다. 알려지지 않은 metric은 "gold"(정수 그대로 표기)로
 * 폴백한다(pp처럼 ×100 스케일링하면 임의 단위를 왜곡할 위험이 더 크기 때문). */
const PP_METRICS = new Set(["pickRate", "banRate", "winRate", "adoptionRate"]);
const SEC_METRICS = new Set(["avgDurationSec", "firstSec"]);

export function metricKind(metric: string): DeltaKind {
  if (PP_METRICS.has(metric)) return "pp";
  if (SEC_METRICS.has(metric)) return "sec";
  return "gold";
}

/** 공지 대조 미리보기 ".note-observed" 텍스트 — "픽률 −1.8%p" 형태. delta===null이면 "관측
 * 불가"(레코드 자체가 없는 경우는 애초에 이 함수에 안 들어옴 — buildDeltas가 측정 불가 케이스는
 * 레코드를 생략하므로 null은 방어적 케이스). */
export function formatObservedSummary(record: DeltaRecord): string {
  if (record.delta === null) return `${metricLabel(record.metric)} 관측 불가`;
  const kind = metricKind(record.metric);
  const valueText =
    kind === "pp"
      ? fmtPp(record.delta)
      : kind === "sec"
        ? fmtDeltaSec(record.delta)
        : fmtDeltaInt(record.delta);
  return `${metricLabel(record.metric)} ${valueText}`;
}

/** DeltaRecord.before/after(절대값) 표시 — kind별 단위: pp=퍼센트(`fmtPct`, 분수 입력) ·
 * sec=`fmtSec`(mm:ss) · gold=`fmtInt`(천단위 콤마). `value===null`이면 "—"(측정 불가 방어). */
export function formatMetricValue(value: number | null, metric: string): string {
  if (value === null) return "—";
  const kind = metricKind(metric);
  if (kind === "pp") return fmtPct(value);
  if (kind === "sec") return fmtSec(value);
  return fmtInt(value);
}

/** id 문자열 → notes.json PatchNoteItem 조회 맵. */
export function indexNotesById(notes: NotesFile | null): Record<string, PatchNoteItem> {
  const map: Record<string, PatchNoteItem> = {};
  if (!notes) return map;
  for (const item of notes.items) map[item.id] = item;
  return map;
}

/** 추정 원인 1줄 표시 모드. "verified"는 accent 링크(`/item/{delta.id}/`), "unverified"는
 * muted 텍스트(있으면 후보 텍스트 + " — 근거 미확인", 없으면 "근거 미확인" 단독) — 프로토타입
 * `01-briefing-home.html`의 `.delta-cause` 5개 행 표기를 그대로 따른다(candidateNoteId 자체는
 * 검증 전까지 링크로 노출하지 않는다는 CLAUDE.md 원칙과 별개로, 여기 "링크"는 candidateNoteId가
 * 아니라 이 델타 자신의 항목 상세로 가는 "근거 보기" 성격의 링크다). */
export interface CauseDisplay {
  mode: "verified" | "unverified";
  text: string;
}

export function resolveCause(record: DeltaRecord): CauseDisplay {
  const cause: LlmCause | undefined = record.causes[0];
  if (!cause) return { mode: "unverified", text: "근거 미확인" };
  if (cause.verified) return { mode: "verified", text: cause.text };
  return { mode: "unverified", text: `${cause.text} — 근거 미확인` };
}

/** entityType이 champion/item이 아닌 행(objective·lane·summary)의 EntityIcon 폴백 글자 —
 * DdragonPicture가 없는 엔티티에 프로토타입처럼 의미 있는 한 글자를 준다(기본 동작은 이름
 * 첫 글자라 "첫 용 처치 시각"이 "첫"이 되어 버려 무의미하다). champion/item은 undefined를
 * 반환해 EntityIcon 기본 동작(ddragon 이미지 우선)에 맡긴다. */
export function entityFallbackLabel(record: Pick<DeltaRecord, "entityType" | "entityKey">): string | undefined {
  if (record.entityType === "objective") {
    const labels: Record<string, string> = { dragon: "용", herald: "전", baron: "바", tower: "포" };
    return labels[record.entityKey];
  }
  if (record.entityType === "lane") return "골";
  if (record.entityType === "summary") return "경";
  return undefined;
}
