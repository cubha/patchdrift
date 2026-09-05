// src/components/methodology/DiscordEmbedPreview.tsx
// 방법론 페이지 "디스코드 미리보기"(ST-12 ④, id="discord") — 웹훅 embed 목업. 실 데이터가
// 없으면(isExample=true) muted로 "예시" 문구임을 표시한다.

import type { DiscordPreviewView } from "./discordPreview";

export interface DiscordEmbedPreviewProps {
  preview: DiscordPreviewView;
}

export default function DiscordEmbedPreview({ preview }: DiscordEmbedPreviewProps) {
  return (
    <div className="p-5">
      {preview.isExample ? (
        <p className="mb-3 text-xs text-muted">
          실 데이터에 미공지 변화가 없어 예시 문구로 표시합니다.
        </p>
      ) : null}
      <div className="flex max-w-[520px] overflow-hidden rounded-sm bg-surface-warm">
        <div className="w-1 shrink-0 bg-accent" aria-hidden="true" />
        <div className="flex flex-col gap-3 p-4">
          <div className={`text-sm font-bold ${preview.isExample ? "text-muted" : "text-fg"}`}>
            {preview.title}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {preview.fields.map((field) => (
              <div key={field.label}>
                <div className="text-xs font-bold text-muted">{field.label}</div>
                <div className={`num mt-1 text-xs ${preview.isExample ? "text-muted" : "text-fg-2"}`}>
                  {field.value}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border-soft pt-2 text-xs text-muted">
            {preview.footer}
          </div>
        </div>
      </div>
    </div>
  );
}
