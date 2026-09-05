// src/components/item/noteContrast.ts
// 항목 상세 "패치노트 대조"(ST-12 ④) — DeltaRecord와 NotesFile을 대조해 원문 인용 대상을
// 결정하는 순수 함수(테스트 대상). 실제 fs 접근(loadNotes)은 페이지(서버 컴포넌트)가 하고,
// 이 함수는 이미 로드된 NotesFile만 받는다.

import type { DeltaRecord, PatchId, PatchNoteItem } from "@/pipeline/types";
import type { NotesFile } from "@/lib/data";

/** 짝 있는 노트 항목 1건 + 표시용 앵커 캡션. */
export interface MatchedNoteView {
  item: PatchNoteItem;
  /** anchorKind가 "entity"면 정밀 앵커라 캡션 없음(null). "section"/"page"는 폴백 앵커임을
   * 알리는 muted 캡션. */
  anchorCaption: "섹션 앵커" | "페이지 앵커" | null;
}

export type NoteContrastResult =
  | { status: "matched"; matched: MatchedNoteView[] }
  | { status: "unmatched"; message: string; adjacent: PatchNoteItem[] };

function anchorCaption(item: PatchNoteItem): MatchedNoteView["anchorCaption"] {
  if (item.anchorKind === "section") return "섹션 앵커";
  if (item.anchorKind === "page") return "페이지 앵커";
  return null;
}

/**
 * 델타의 matchedNoteIds를 NotesFile에서 조회해 원문 항목을 만든다. 짝 ID가 있어도 NotesFile에
 * 해당 id가 없으면(스키마 불일치 등 방어적 케이스) "짝 없음"으로 폴백한다.
 * 짝이 없으면 `"{toPatch} 패치노트에 {엔티티} 항목 없음"` 메시지 + 같은 엔티티명을 가진
 * other/system 섹션 항목(인접 항목, 참고용)을 함께 반환한다.
 */
export function resolveNoteContrast(
  delta: Pick<DeltaRecord, "matchedNoteIds" | "entityName">,
  notes: NotesFile | null,
  toPatch: PatchId
): NoteContrastResult {
  const byId = new Map((notes?.items ?? []).map((item) => [item.id, item] as const));

  if (delta.matchedNoteIds.length > 0) {
    const matched = delta.matchedNoteIds
      .map((id) => byId.get(id))
      .filter((item): item is PatchNoteItem => item !== undefined)
      .map((item) => ({ item, anchorCaption: anchorCaption(item) }));
    if (matched.length > 0) {
      return { status: "matched", matched };
    }
  }

  const adjacent = (notes?.items ?? []).filter(
    (item) =>
      item.entity === delta.entityName && (item.section === "other" || item.section === "system")
  );

  return {
    status: "unmatched",
    message: `${toPatch} 패치노트에 ${delta.entityName} 항목 없음`,
    adjacent,
  };
}
