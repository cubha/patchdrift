// src/components/home/DiscordPanel.tsx
// 사이드: 디스코드로 공유 — 프로토타입 `.discord-panel` 1:1(docs/design/prototype/01-briefing-home.html).
// 실제 전송은 배치 스크립트(scripts/run-notify.ts, ST-13 소유) 몫이라 버튼은 방법론 페이지의
// 디스코드 미리보기 섹션으로 가는 링크일 뿐이다(ST-11 프롬프트 명시) — 정적 export라 서버 액션도
// 없다. 서버 컴포넌트.

import Link from "next/link";
import { fmtKst } from "@/lib/format";
import SectionCard from "@/components/SectionCard";

export interface DiscordPanelProps {
  /** deltas.meta.generatedAt(ISO) — "마지막 전송 시각"이 아니라 이 델타 파일이 마지막으로
   * 생성된 시각을 대신 표기한다(ST-11 프롬프트: "마지막 전송 시각은 deltas.meta.generatedAt
   * 표기"). 파일이 없으면 캡션 자체를 생략한다. */
  generatedAt: string | null;
}

export default function DiscordPanel({ generatedAt }: DiscordPanelProps) {
  return (
    <SectionCard title="디스코드로 공유">
      <div className="flex flex-col items-start gap-3 p-5">
        <p className="text-sm text-muted">
          미공지 변화·공지 불일치 항목을 요약해 서버로 전송합니다.
        </p>
        <Link
          href="/methodology/#discord"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-bold text-accent-on transition-colors hover:bg-[var(--accent-hover)]"
        >
          디스코드로 브리핑 보내기
        </Link>
        {generatedAt ? (
          <span className="text-xs text-muted">마지막 전송 {fmtKst(generatedAt)}</span>
        ) : null}
      </div>
    </SectionCard>
  );
}
