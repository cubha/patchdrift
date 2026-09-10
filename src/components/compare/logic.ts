// src/components/compare/logic.ts
// 대조표 순수 로직 — 상태 필터·정렬·좌 내비게이터 검색/섹션 필터·델타 셀 포맷·커버리지 집계.
// 렌더(CompareExplorer.tsx 등)와 분리해 단위 테스트한다(완료 조건 "상태 필터·정렬 로직(순수
// 함수)"). UX-BRIEF §3 "02 대조표" 기준.

import type { DeltaRecord, MatchStatus, PatchNoteItem, PatchNoteSection } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";
import { fmtCiHalf, fmtDeltaInt, fmtDeltaSec, fmtInt, fmtPp } from "@/lib/format";
import { absDelta, countRelevantNoteEntities, metricKind } from "@/components/home/logic";

/** 상태 필터 칩 5종(UX-BRIEF "02 대조표" 필터 바) — "no-change"는 칩이 없다(전체=필터 없음이라
 * no-change 행도 "전체"에서는 그대로 보인다, ST-11.md 구현 결정 참고). `key`를 `MatchStatus |
 * "all"`로 좁혀(2026-09-05 리팩토링) 오타로 존재하지 않는 상태값을 넣으면 컴파일 타임에 잡는다 —
 * `filterByStatus`/`CompareExplorer.tsx`의 `statusFilter` 상태는 URL 해시에서도 올 수 있어 여전히
 * `string`을 받는다(런타임 값이라 타입으로 좁힐 수 없음). */
export const STATUS_FILTERS: ReadonlyArray<{ key: MatchStatus | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "announced-consistent", label: "공지-일치" },
  { key: "announced-inconsistent", label: "공지-불일치" },
  { key: "unannounced", label: "미공지" },
  { key: "insufficient-sample", label: "표본 부족" },
];

export function filterByStatus(rows: DeltaRecord[], key: string): DeltaRecord[] {
  if (key === "all") return rows;
  return rows.filter((r) => r.status === key);
}

/** 헤더 정렬 3키(ST-11 프롬프트 "헤더 정렬(클라이언트, |Δ|·q·n)"). q는 낮을수록(더 유의할수록)
 * 우선이므로 오름차순, |Δ|·n은 클수록 우선이므로 내림차순이 기본 방향이다. */
export type SortKey = "absDelta" | "q" | "n";

function nOf(record: DeltaRecord): number {
  return record.n.before + record.n.after;
}

export function sortRows(rows: DeltaRecord[], key: SortKey, direction: "asc" | "desc" = "desc"): DeltaRecord[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    // |Δ|·n은 "값이 클수록 우선"이라 desc(기본값)가 -cmp(큰 값 먼저)다. q는 반대로 "값이 작을수록
    // (더 유의할수록) 우선"이므로 desc가 오히려 +cmp(작은 값 먼저)여야 세 키 모두 "desc = 더
    // 흥미로운/중요한 행이 먼저"라는 사용자 관점의 일관된 기본 방향을 유지한다.
    if (key === "q") {
      const cmp = (a.q ?? Infinity) - (b.q ?? Infinity);
      return direction === "desc" ? cmp : -cmp;
    }
    const cmp = key === "absDelta" ? absDelta(a) - absDelta(b) : nOf(a) - nOf(b);
    return direction === "asc" ? cmp : -cmp;
  });
  return copy;
}

/** 좌 내비게이터 섹션 탭 대상 — 프로토타입은 챔피언/아이템/시스템 3탭만 두고 "기타"는 없다. */
export const NAV_SECTIONS: ReadonlyArray<{ key: PatchNoteSection; label: string }> = [
  { key: "champion", label: "챔피언" },
  { key: "item", label: "아이템" },
  { key: "system", label: "시스템" },
];

export function filterNotesBySection(items: PatchNoteItem[], section: PatchNoteSection): PatchNoteItem[] {
  return items.filter((item) => item.section === section);
}

export function filterNotesBySearch(items: PatchNoteItem[], query: string): PatchNoteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.entity.toLowerCase().includes(q) ||
      (item.skill ?? "").toLowerCase().includes(q) ||
      (item.stat ?? "").toLowerCase().includes(q)
  );
}

/** 상태 우선순위(ST-08 verdict.sortDeltas와 동일 순서) — 노트 1건에 델타가 여럿 걸려 있을 때
 * "대표 상태"를 고르는 데 쓴다. */
const STATUS_PRIORITY: MatchStatus[] = [
  "unannounced",
  "announced-inconsistent",
  "announced-consistent",
  "insufficient-sample",
  "no-change",
];

/** 노트 id → 그 노트와 짝지어진 델타들의 "대표 상태"(우선순위 최상위 1개). 짝지어진 델타가 하나도
 * 없으면 null(호출부가 "관측 없음" muted로 렌더). */
export function representativeStatus(noteId: string, rows: DeltaRecord[]): MatchStatus | null {
  let best: MatchStatus | null = null;
  let bestRank = Infinity;
  for (const row of rows) {
    if (!row.matchedNoteIds.includes(noteId)) continue;
    const rank = STATUS_PRIORITY.indexOf(row.status);
    if (rank < bestRank) {
      bestRank = rank;
      best = row.status;
    }
  }
  return best;
}

/** 변동 칩(▲▼•) — insufficient-sample은 판정 보류라 delta 부호와 무관하게 항상 "•"(회색)로
 * 표시한다(프로토타입 `.delta-flat` 대응). */
export function directionSymbol(record: DeltaRecord): { symbol: string; colorClass: string } {
  if (record.status === "insufficient-sample" || record.delta === null || record.delta === 0) {
    return { symbol: "•", colorClass: "text-muted" };
  }
  return record.delta > 0
    ? { symbol: "▲", colorClass: "text-success" }
    : { symbol: "▼", colorClass: "text-danger" };
}

/** Δ 셀 텍스트 — insufficient-sample은 프로토타입처럼 "—"(승률 n 게이트 미달 상태에서는 델타
 * 수치 자체를 신뢰할 수 없다는 뜻, ST-11.md 구현 결정). */
export function formatDeltaCell(record: DeltaRecord): string {
  if (record.status === "insufficient-sample" || record.delta === null) return "—";
  const kind = metricKind(record.metric);
  if (kind === "pp") return fmtPp(record.delta);
  if (kind === "sec") return fmtDeltaSec(record.delta);
  return fmtDeltaInt(record.delta);
}

/** 95% CI 셀 텍스트 — DeltaValue.tsx의 kind별 스케일링 규칙과 동일(pp는 ×100, sec/gold는 그대로). */
export function formatCiCell(record: DeltaRecord): string {
  if (record.status === "insufficient-sample") return "—";
  const kind = metricKind(record.metric);
  if (kind === "pp") return fmtCiHalf([record.ci[0] * 100, record.ci[1] * 100], 1);
  if (kind === "sec") return `${fmtCiHalf(record.ci, 0)}s`;
  return fmtCiHalf(record.ci, 0);
}

/** n 셀 텍스트 — insufficient-sample은 실제 카운트 대신 "n<200"(게이트 조건 자체를 표기, 프로토타입
 * `02-comparison-table.html` 그대로). */
export function formatNCell(record: DeltaRecord): string {
  if (record.status === "insufficient-sample") return "n<200";
  return `${fmtInt(record.n.before)}/${fmtInt(record.n.after)}`;
}

/** 짝 셀 텍스트 — matchedNoteId(예: "note:26.17:champion:qiyana:5a6d587d")를 그대로 쓰기엔 너무
 * 길어 마지막 콜론 세그먼트(해시)만 남겨 짧게 표기한다("—"는 짝 없음). */
export function shortNoteId(matchedNoteId: string | null): string {
  if (!matchedNoteId) return "—";
  const parts = matchedNoteId.split(":");
  return parts[parts.length - 1] ?? matchedNoteId;
}

/** 하단 커버리지 바 집계 — "노트 N엔티티(M항목) 중 관측 짝 K · 미공지 U · 표본 부족 I". N은 홈
 * 헤드라인과 동일 정의(엔티티 단위 묶음, countRelevantNoteEntities)를 재사용해 두 화면 수치를
 * 일치시킨다.
 *
 * `noteEntityCount`/`noteItemCount` 리네임(HANDOFF-redesign-2026-09-10.md §4-1, 2026-09-10):
 * 기존 `noteItemCount`가 실제 값은 엔티티 수인데 `CoverageBar.tsx`가 "노트 N**항목** 중"으로
 * 렌더해 홈(`home/logic.ts` `HeadlineStats`)과 정확히 같은 클래스의 오라벨이었다 — HANDOFF
 * 명시 범위는 홈뿐이었으나 사용자 승인으로 함께 고친다(같은 결함을 한쪽만 고치면 화면 간 수치
 * 해석이 갈린다). */
export interface CoverageStats {
  noteEntityCount: number;
  noteItemCount: number;
  matchedCount: number;
  unannouncedCount: number;
  lowSampleCount: number;
}

export function computeCoverage(rows: DeltaRecord[], notes: NotesFile | null): CoverageStats {
  let matchedCount = 0;
  let unannouncedCount = 0;
  let lowSampleCount = 0;
  for (const row of rows) {
    if (row.status === "announced-consistent" || row.status === "announced-inconsistent") matchedCount++;
    else if (row.status === "unannounced") unannouncedCount++;
    else if (row.status === "insufficient-sample") lowSampleCount++;
  }
  return {
    noteEntityCount: countRelevantNoteEntities(notes),
    noteItemCount: notes?.meta.itemCount ?? 0,
    matchedCount,
    unannouncedCount,
    lowSampleCount,
  };
}
