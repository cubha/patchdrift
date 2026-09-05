// src/components/home/NotePreviewList.tsx
// 공지 대조 미리보기 — 프로토타입 `.note-preview-row` 1:1(docs/design/prototype/01-briefing-home.html
// "우선 2 · 검증"). 서버 컴포넌트.

import Link from "next/link";
import type { DeltaRecord, PatchNoteItem } from "@/pipeline/types";
import SectionCard from "@/components/SectionCard";
import StatusBadge from "@/components/StatusBadge";
import { formatNotePreviewText, formatObservedSummary } from "./logic";

export interface NotePreviewListProps {
  rows: DeltaRecord[];
  notesById: Record<string, PatchNoteItem>;
}

export default function NotePreviewList({ rows, notesById }: NotePreviewListProps) {
  return (
    <SectionCard
      eyebrow="우선 2 · 검증"
      title="공지 대조 미리보기"
      action={
        <Link href="/compare/" className="text-sm font-bold text-accent hover:underline">
          전체 보기 →
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          이 패치 쌍에서는 패치노트와 짝지어진 관측 항목이 아직 없습니다
        </p>
      ) : (
        <ul>
          {rows.map((row) => {
            const note = row.matchedNoteId ? notesById[row.matchedNoteId] : undefined;
            return (
              <li
                key={row.id}
                className="grid grid-cols-[2fr_1.6fr_auto] items-center gap-4 border-b border-border-soft px-5 py-4 last:border-b-0"
              >
                <div className="text-sm text-fg-2">
                  {formatNotePreviewText(note, row.matchedNoteIds.length, row.entityName)}
                </div>
                <div className="text-xs text-muted">{formatObservedSummary(row)}</div>
                <StatusBadge status={row.status} />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
