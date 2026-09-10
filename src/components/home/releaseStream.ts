// src/components/home/releaseStream.ts
// 릴리즈노트 스트림 조립 — notes.json의 items[]를 entity로 묶어(원본 문서 순서 유지) "정상"
// 그룹을 만들고, 노트가 없는데 통계적으로 유의한 델타만 관측된("status==='unannounced'")
// 엔티티를 |delta| 내림차순으로 스트림 상단에 끼워 넣는다. HANDOFF-redesign-2026-09-10.md
// §1-1 "짝 없는 관측(미공지)을 같은 스트림에 삽입해 accent 좌측 레일로 들어올린다" + §4-1
// "챔피언 카드 → 스킬 행" groupBy 요구사항 구현. 렌더(ReleaseNoteStream 등)는 ST-H 몫 —
// 이 모듈은 순수 조립 로직만 담당한다(부수효과 없음).

import type { DeltaRecord, DeltasFile, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";

export interface MatchedStreamGroup {
  kind: "matched";
  entity: string;
  notes: PatchNoteItem[];
}

export interface UnannouncedStreamGroup {
  kind: "unannounced";
  entity: string;
  deltas: DeltaRecord[];
}

export type ReleaseStreamGroup = MatchedStreamGroup | UnannouncedStreamGroup;

/** delta===null은 "측정 불가"로 취급해 정렬 우선순위를 가장 낮춘다(ST-08 verdict.sortDeltas·
 * home/logic.ts의 absDelta와 동일 관례 — 이 파일은 독립 SubTask 파일이라 재사용 대신 동일
 * 규칙을 로컬로 둔다). */
function absDelta(record: DeltaRecord): number {
  return record.delta === null ? -Infinity : Math.abs(record.delta);
}

/** notes.json items를 entity로 묶는다 — 그룹 순서는 각 entity가 items 배열에서 처음 등장한
 * 순서(=패치노트 문서 순서)를 그대로 유지한다. */
function groupNotesByEntity(items: PatchNoteItem[]): MatchedStreamGroup[] {
  const order: string[] = [];
  const byEntity = new Map<string, PatchNoteItem[]>();
  for (const item of items) {
    const group = byEntity.get(item.entity);
    if (group) {
      group.push(item);
    } else {
      byEntity.set(item.entity, [item]);
      order.push(item.entity);
    }
  }
  return order.map((entity) => ({ kind: "matched" as const, entity, notes: byEntity.get(entity)! }));
}

/** 그룹 내 |delta| 최댓값 — 미공지 그룹 정렬 기준. */
function maxAbsDelta(records: DeltaRecord[]): number {
  return records.reduce((max, r) => Math.max(max, absDelta(r)), -Infinity);
}

/**
 * `status==='unannounced'` 델타 행을 `entityType:entityName`으로 묶는다. 파이프라인의
 * `status`가 이미 "짝 없음+유의"를 보장하므로(MatchStatus 주석 참고) 여기서 노트와의 재매칭은
 * 하지 않는다 — `matchedNoteIds`가 비어 있다는 전제를 그대로 신뢰한다.
 */
function groupUnannouncedDeltas(rows: DeltaRecord[]): UnannouncedStreamGroup[] {
  const order: string[] = [];
  const byEntity = new Map<string, DeltaRecord[]>();
  for (const row of rows) {
    if (row.status !== "unannounced") continue;
    const key = `${row.entityType}:${row.entityName}`;
    const group = byEntity.get(key);
    if (group) {
      group.push(row);
    } else {
      byEntity.set(key, [row]);
      order.push(key);
    }
  }
  const groups: UnannouncedStreamGroup[] = order.map((key) => {
    const deltas = byEntity.get(key)!;
    return { kind: "unannounced" as const, entity: deltas[0].entityName, deltas };
  });
  return groups.sort((a, b) => maxAbsDelta(b.deltas) - maxAbsDelta(a.deltas));
}

/**
 * 릴리즈노트 스트림 조립 — 미공지 그룹(|delta| 내림차순)을 상단에, 이어서 공지 그룹(패치노트
 * 원본 순서)을 배치한다. `notes`/`deltas` 어느 한쪽이 없어도(`null`) throw하지 않고 있는
 * 쪽만으로 조립한다(ST-11 빈 상태 카드 관례와 동일).
 */
export function buildReleaseStream(
  notes: NotesFile | null,
  deltas: DeltasFile | null
): ReleaseStreamGroup[] {
  const matched = groupNotesByEntity(notes?.items ?? []);
  const unannounced = groupUnannouncedDeltas(deltas?.rows ?? []);
  return [...unannounced, ...matched];
}
