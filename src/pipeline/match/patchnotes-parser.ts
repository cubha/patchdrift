// src/pipeline/match/patchnotes-parser.ts
// F3: 패치노트 파서 — ko-kr 정적 HTML(cheerio) → PatchNoteItem[] 구조화 + 원문 anchor 링크.
// TODO(F3): cheerio 셀렉터 확정, fixture 테스트로 마크업 변경 대비

import type { PatchNoteItem, PatchId } from "../types";

export function parsePatchNotes(html: string, patch: PatchId): PatchNoteItem[] {
  throw new Error(`TODO(F3): parsePatchNotes(len=${html.length}, patch=${patch}) not implemented`);
}
