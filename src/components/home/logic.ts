// src/components/home/logic.ts
// 브리핑 홈 순수 로직 — 요약 카드 수치·미공지 상위 5·공지 대조 미리보기 5·추정 원인 표기·노트
// id 인덱스. 렌더(page.tsx·home/*.tsx)와 분리해 단위 테스트한다(완료 조건 "순수 함수로 분리").
// UX-BRIEF §3 "01 브리핑 홈" + 코디네이터 지시(ST-11 프롬프트) 기준.

import type { DeltaKind } from "@/components/DeltaValue";
import type { DeltaMetric, DeltaRecord, DeltasFile, LlmCause, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import { METRIC_KIND, fmtDeltaInt, fmtDeltaSec, fmtInt, fmtPct, fmtPp, fmtSec, metricLabel } from "@/lib/format";
import { countRelevantNoteEntities as countRelevantNoteEntitiesInFile } from "@/pipeline/shared/notes-count";
import { isSignificantDelta } from "@/pipeline/shared/significance";
import { FDR_ALPHA } from "@/pipeline/aggregate/stats";

/** 패치노트 항목(section champion|item)을 "entity" 단위로 묶어 몇 개의 서로 다른 엔티티가
 * 언급됐는지 센다 — ST-08 `matchedNoteIds`가 같은 엔티티의 노트 여러 줄을 한 묶음으로 취급하는
 * 기준과 일치시킨다(예: 아우렐리온 솔 스킬 2줄 변경 = 노트 항목 2건이지만 엔티티는 1개).
 * 실제 계산은 `pipeline/shared/notes-count.ts`(scripts/run-notify.ts의 `countEntityNotes`와도
 * 공유하는 단일 구현, 2026-09-05 리팩토링)에 있다 — 이 함수는 `NotesFile | null` 래퍼를 벗겨
 * items 배열만 넘기는 얇은 어댑터다. */
export function countRelevantNoteEntities(notes: NotesFile | null): number {
  if (!notes) return 0;
  return countRelevantNoteEntitiesInFile(notes.items);
}

/**
 * 델타 1건이 "통계적으로 유의한 변화"인지 — **상태 라벨이 아니라 q·CI를 직접 검사**한다
 * (코디네이터 정정, 2026-09-05). `status`만으로 세면 `announced-inconsistent`가 "방향이
 * 다른 유의한 변화"와 "노트는 있지만 통계적으로 변화 없음"(ST-08 verdict.assignStatus 3번
 * 분기) 두 경우를 한데 묶어 M을 부풀린다 — 실측: 자기쌍(26.17→26.17) `announced-inconsistent`
 * 212건은 전부 후자(델타 그 자체가 없는 자기비교)인데, status 기준으로 세면 M=212로 잘못
 * 나온다. `insufficient-sample`(승률 n 게이트 미달)은 q·CI가 있어도 무조건 비유의로 친다 —
 * PLAN ②의 "미달=insufficient-sample"과 동일한 무조건 우선순위.
 *
 * 실제 판정 로직은 `pipeline/shared/significance.ts`(`discord/webhook.ts`와 공유, 2026-09-05
 * 리팩토링으로 단일화)에 있다 — 이 재export는 기존 호출부(`compare/logic.ts`·`page.tsx`·이
 * 파일의 `computeHeadline`)의 import 경로를 그대로 보존한다. `qAlpha` 기본값은 `FDR_ALPHA`
 * (0.1, 이전 하드코딩 값과 동일)이며, `computeHeadline`은 `deltas.meta.qAlpha`를 넘겨 실제 그
 * 델타 파일이 만들어질 때 쓴 값을 재사용한다.
 */
export { isSignificantDelta };

/** 요약 카드 헤드라인 수치(+스탯 타일이 그대로 이 수치를 쓴다 — 코디네이터 정정, 2026-09-05:
 * 타일 "공지된 변화"는 별도 델타 집계가 아니라 `noteEntityCount`(N)를 그대로 재사용한다).
 *
 * `noteEntityCount`/`noteItemCount` 리네임(HANDOFF-redesign-2026-09-10.md §4-1, 2026-09-10):
 * 기존 필드명 `noteItemCount`가 실제로는 "노트 **항목** 수"가 아니라 "노트 **엔티티** 수"를
 * 담고 있어 오라벨이었다 — `src/components/methodology/pipelineSteps.ts`(ST-07)는 이미
 * `noteEntityCount`/`noteItemCount`(=`NotesFile.meta.itemCount`)로 올바르게 분리해 썼으므로,
 * 그 기존 컨벤션에 홈을 맞춘다. 소비처 3곳(`page.tsx`·`HeroSummary.tsx`·이 파일의 테스트)
 * 전수 확인 후 리네임 — 외부 공개 API가 아니므로 `tsc --noEmit`가 누락을 전부 잡는다. */
export interface HeadlineStats {
  /** "패치노트는 N개 엔티티를 말했고" + 스탯 타일 "공지된 변화" — countRelevantNoteEntities. */
  noteEntityCount: number;
  /** 원문 패치노트 "항목" 수(`NotesFile.meta.itemCount`) — HANDOFF §4-1 "35 엔티티 / 215 항목"
   * 분리 표기에 쓰는 참고 병기 수치. */
  noteItemCount: number;
  /** "통계는 M개 변화를 말합니다" + 스탯 타일 "유의 변화" — `isSignificantDelta` 통과 건수. */
  statCount: number;
  /** 스탯 타일 "미공지" — `status==="unannounced"` 건수. */
  unannouncedCount: number;
}

/** deltas/notes가 아직 없으면(ST-08 미착수 구간·빈 데이터 빌드) 전부 0을 반환한다(throw 없음 —
 * 빈 상태 카드 렌더 보장, ST-11 완료 조건). `qAlpha` 기본값은 `FDR_ALPHA` — 호출부(`page.tsx`)가
 * `deltas?.meta.qAlpha`를 명시적으로 넘기면 그 값을 우선한다(2026-09-05 리팩토링, 기존엔
 * `isSignificantDelta` 내부에 0.1이 하드코딩돼 있었다). */
export function computeHeadline(
  deltas: DeltasFile | null,
  notes: NotesFile | null,
  qAlpha: number = FDR_ALPHA
): HeadlineStats {
  const noteEntityCount = countRelevantNoteEntities(notes);
  const noteItemCount = notes?.meta.itemCount ?? 0;
  const rows = deltas?.rows ?? [];
  let statCount = 0;
  let unannouncedCount = 0;
  for (const row of rows) {
    if (isSignificantDelta(row, qAlpha)) statCount++;
    if (row.status === "unannounced") unannouncedCount++;
  }
  return { noteEntityCount, noteItemCount, statCount, unannouncedCount };
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

/** `lib/format.ts`의 `"seconds"` → 이 파일(및 DeltaValue)이 쓰는 `"sec"` 표기로 옮긴다 — 하위
 * 소비처(DeltaValue.tsx의 `DeltaKind`, compare/logic.ts 등)가 전부 "sec"를 쓰므로 여기서만
 * 흡수한다(2026-09-05 리팩토링, `DeltaKind` 리네임은 범위 밖). */
const SHARED_KIND_TO_UI: Record<"pp" | "seconds" | "gold", DeltaKind> = {
  pp: "pp",
  seconds: "sec",
  gold: "gold",
};

/** DeltaRecord.metric → DeltaValue의 kind 3종. 분류 자체는 `lib/format.ts`의 `METRIC_KIND`
 * (`DeltaMetric` 전수 `Record`, 2026-09-05 리팩토링으로 단일화)에 위임한다. 알려지지 않은
 * metric은 "gold"(정수 그대로 표기)로 폴백한다(pp처럼 ×100 스케일링하면 임의 단위를 왜곡할
 * 위험이 더 크기 때문) — `METRIC_KIND`는 `DeltaMetric` 전수라 폴백이 없으므로, 이 폴백은
 * 여기 얇은 어댑터가 계속 책임진다. */
export function metricKind(metric: string): DeltaKind {
  const shared = METRIC_KIND[metric as DeltaMetric] as "pp" | "seconds" | "gold" | undefined;
  return shared ? SHARED_KIND_TO_UI[shared] : "gold";
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
