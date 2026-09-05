// src/components/item/NoteContrastPanel.tsx
// 항목 상세 "패치노트 대조"(ST-12 ④) — resolveNoteContrast 결과를 렌더한다.
// 짝 있음: 원문 인용(들여쓰기 quote) + 외부 앵커 링크(+section/page 캡션) 전부.
// 짝 없음: "{to} 패치노트에 {엔티티} 항목 없음" + 인접(other/system) 항목이 있으면 참고로 표시.

import type { NoteContrastResult } from "./noteContrast";

export interface NoteContrastPanelProps {
  result: NoteContrastResult;
}

export default function NoteContrastPanel({ result }: NoteContrastPanelProps) {
  if (result.status === "matched") {
    return (
      <div className="flex flex-col gap-3 p-5">
        {result.matched.map(({ item, anchorCaption }) => (
          <div key={item.id} className="flex flex-col gap-2">
            <blockquote className="border-l-2 border-border pl-4 text-sm text-fg-2">
              {item.summary}
            </blockquote>
            <div className="flex items-center gap-2">
              <a href={item.anchorUrl} className="text-sm font-bold text-accent hover:underline">
                패치노트 원문 보기 →
              </a>
              {anchorCaption ? (
                <span className="text-xs text-muted">({anchorCaption})</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-5">
      <p className="text-sm text-muted">{result.message}</p>
      {result.adjacent.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-muted">같은 엔티티의 인접 항목</span>
          {result.adjacent.map((item) => (
            <div key={item.id} className="flex flex-col gap-1">
              <blockquote className="border-l-2 border-border pl-4 text-sm text-muted">
                {item.summary}
              </blockquote>
              <a href={item.anchorUrl} className="text-xs font-bold text-accent hover:underline">
                패치노트 원문 보기 →
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
