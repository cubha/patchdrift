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

/** RED 게이트용 스텁 — TDD 사이클의 구현 단계에서 채운다. */
export function buildReleaseStream(
  _notes: NotesFile | null,
  _deltas: DeltasFile | null
): ReleaseStreamGroup[] {
  throw new Error("TODO(ST-B): buildReleaseStream 미구현");
}
