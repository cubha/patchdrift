// src/components/home/releaseStream.ts
// 릴리즈노트 스트림 조립 — notes.json의 items[]를 entity로 묶어(원본 문서 순서 유지) "정상"
// 그룹을 만들고, 노트가 없는데 통계적으로 유의한 델타만 관측된("status==='unannounced'")
// 엔티티를 |delta| 내림차순 순서를 유지한 채 **노트 그룹 사이에 균등 분산**해 끼워 넣는다.
// HANDOFF-redesign-2026-09-10.md §1-1 "짝 없는 관측(미공지)을 같은 스트림에 삽입해 accent
// 좌측 레일로 들어올린다" + §4-1 "챔피언 카드 → 스킬 행" groupBy 요구사항 구현. 렌더
// (ReleaseNoteStream 등)는 ST-H 몫 — 이 모듈은 순수 조립 로직만 담당한다(부수효과 없음).
//
// 2026-09-10 계약 변경(verify-impl 축B): 이전 계약은 "미공지를 스트림 상단에 몰아 삽입"
// 이었다. 확정 시안이 "아래는 노트 순서 그대로입니다 … 노트에 없는데 통계가 움직인 항목은
// 그 자리에 끼워 넣습니다"를 요구하고, 실데이터(노트 58그룹 vs 미공지 151그룹)에서 상단
// 몰림이 노트 스트림을 화면 밖으로 밀어내 설계 논지를 지웠기 때문이다.
// 인과 앵커(causes[].candidateNoteId 위치에 삽입)는 **의도적으로 쓰지 않는다** — 시안이
// 인라인 배치한 미공지 2건(로크·유나라) 모두 후보 노트가 없는 케이스라, 앵커링은 시안에
// 없는 메커니즘이다. 실데이터에서도 앵커 보유 그룹은 151개 중 14개뿐이다.

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
 * 미공지 U건을 노트 그룹 M개 사이 M+1개 슬롯에 균등 분배한다 — 슬롯 j의 개수는
 * `floor((j+1)*U/(M+1)) - floor(j*U/(M+1))`. 나머지를 특정 슬롯에 몰지 않고 흩는 표준
 * 배분식이라 결과가 결정론적이고(같은 입력 → 같은 순서) 그룹 수에 무관하게 성립한다.
 * 슬롯 0(첫 노트 그룹 앞)에도 배정하므로 스트림 최상단은 |delta| 최대 미공지로 시작한다 —
 * HANDOFF §1-1 수용 기준("상단 스크린샷만 보고 패치노트 요약 사이트로 오인되면 실패")을
 * 분산 배치에서도 유지하기 위한 것이다.
 *
 * ⚠️ U(미공지 그룹 수) < M+1(슬롯 수)이면 `floor(1*U/slots)`가 0이 되어 슬롯 0이 비고, 위 불변식이
 * 깨진다(2026-09-13 — 효과크기 바닥 도입으로 미공지 건수가 크게 줄면서 실측 확인). U>0이면
 * 슬롯 0에 최소 1건을 강제한다 — 이후 슬롯의 upTo는 그대로 공식값을 쓰므로(이미 배정된 taken을
 * 넘지 않으면 그 슬롯은 그냥 0건), 마지막 슬롯은 항상 `floor(slots*U/slots)=U`로 수렴해 총량은
 * 보존된다(승격이 항목을 잃거나 중복시키지 않음).
 */
function interleave(
  matched: MatchedStreamGroup[],
  unannounced: UnannouncedStreamGroup[]
): ReleaseStreamGroup[] {
  const slots = matched.length + 1;
  const total = unannounced.length;
  const out: ReleaseStreamGroup[] = [];
  let taken = 0;
  for (let slot = 0; slot < slots; slot += 1) {
    let upTo = Math.floor(((slot + 1) * total) / slots);
    if (slot === 0 && total > 0 && upTo === 0) upTo = 1;
    while (taken < upTo) {
      out.push(unannounced[taken]);
      taken += 1;
    }
    const group = matched[slot];
    if (group) out.push(group);
  }
  return out;
}

/**
 * 릴리즈노트 스트림 조립 — 공지 그룹은 패치노트 원본 순서를 유지하고, 미공지 그룹(|delta|
 * 내림차순)을 그 사이사이에 균등 분산해 같은 스트림에 넣는다. `notes`/`deltas` 어느 한쪽이
 * 없어도(`null`) throw하지 않고 있는 쪽만으로 조립한다(ST-11 빈 상태 카드 관례와 동일).
 */
export function buildReleaseStream(
  notes: NotesFile | null,
  deltas: DeltasFile | null
): ReleaseStreamGroup[] {
  const matched = groupNotesByEntity(notes?.items ?? []);
  const unannounced = groupUnannouncedDeltas(deltas?.rows ?? []);
  return interleave(matched, unannounced);
}
