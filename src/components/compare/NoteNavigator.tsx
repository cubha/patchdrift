// src/components/compare/NoteNavigator.tsx
// 좌 내비게이터(1/3) — 프로토타입 `.tab-row`/`.nav-search`/`.note-item-list` 1:1
// (docs/design/prototype/02-comparison-table.html). 순수 프레젠테이션 — 상태는 부모
// CompareExplorer가 소유(섹션 탭·검색어·선택 항목 전부 콜백으로 위임).

import type { DeltaRecord, PatchNoteItem, PatchNoteSection } from "@/pipeline/types";
import StatusBadge from "@/components/StatusBadge";
import { NAV_SECTIONS, filterNotesBySearch, filterNotesBySection, representativeStatus } from "./logic";

export interface NoteNavigatorProps {
  notes: PatchNoteItem[];
  rows: DeltaRecord[];
  activeSection: PatchNoteSection;
  onSectionChange: (section: PatchNoteSection) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedNoteId: string | null;
  onSelect: (noteId: string) => void;
}

export default function NoteNavigator({
  notes,
  rows,
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  selectedNoteId,
  onSelect,
}: NoteNavigatorProps) {
  const sectionFiltered = filterNotesBySection(notes, activeSection);
  const visible = filterNotesBySearch(sectionFiltered, searchQuery);

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      style={{ boxShadow: "var(--elev-ring)" }}
    >
      <div className="border-b border-border-soft px-5 py-5">
        <h2 className="font-display text-lg font-bold text-fg">패치노트 항목</h2>
      </div>
      <div className="flex gap-2 px-5 pt-4" role="tablist" aria-label="패치노트 섹션">
        {NAV_SECTIONS.map((section) => {
          const count = filterNotesBySection(notes, section.key).length;
          const isActive = section.key === activeSection;
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSectionChange(section.key)}
              className={`border-b-2 px-1 py-2 text-xs font-bold ${
                isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg-2"
              }`}
            >
              {section.label} {count}
            </button>
          );
        })}
      </div>
      <div className="px-5 pt-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="챔피언·아이템 검색"
          aria-label="패치노트 항목 검색"
          className="min-h-9 w-full rounded-sm border border-border bg-surface-warm px-3 text-sm font-bold text-fg placeholder:font-normal placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <ul className="max-h-[640px] overflow-y-auto py-3"> {/* design-lint-ignore: 프로토타입 .note-item-list{max-height:640px} 하드코딩값, 대응 토큰 없음 */}
        {visible.length === 0 ? (
          <li className="px-5 py-4 text-sm text-muted">검색 결과가 없습니다</li>
        ) : (
          visible.map((item) => {
            const isSelected = item.id === selectedNoteId;
            const status = representativeStatus(item.id, rows);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex w-full flex-col items-start gap-1 border-l-2 px-5 py-3 text-left ${
                    isSelected ? "border-accent bg-surface-warm" : "border-transparent"
                  }`}
                >
                  <span className="text-sm font-bold text-fg">{item.entity}</span>
                  <span className="line-clamp-2 font-mono text-xs tabular-nums text-muted">
                    {item.skill ? `${item.skill} ` : ""}
                    {item.before && item.after ? `${item.before}⇒${item.after}` : item.summary}
                  </span>
                  {status ? (
                    <StatusBadge status={status} className="mt-1 w-fit" />
                  ) : (
                    <span className="mt-1 w-fit text-xs text-muted">관측 없음</span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
