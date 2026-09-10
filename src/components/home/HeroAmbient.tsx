// src/components/home/HeroAmbient.tsx
// 히어로 앰비언트 — HANDOFF-redesign-2026-09-10.md §4-1: "챔피언 스플래시를 opacity:.30 +
// blur(2px) + saturate(.75)로 깔고 --game-wash→--bg 그라디언트로 페이드". 장식 전용이라
// aria-hidden + pointer-events:none(§4-1 UI 설계 명세) — 스크린리더·클릭 모두 관통.
//
// 구현 범위 축소(스코프 결정, 2026-09-10 구현 세션): 패치 대표 챔피언 스플래시 자산(§5 "전량
// 아님 — 패치 대표 챔피언 1~2장만") 선정·다운로드는 HANDOFF §8 일정 압박 하 절단 우선순위
// "①히어로 앰비언트"로 명시된 첫 candidate라 이번 구현에서는 보류한다. `splashUrl`을 optional
// prop으로 열어둬 나중에 자산이 준비되면 이 컴포넌트 수정 없이 바로 켤 수 있게 설계했다 —
// 미지정 시(현재) 그라디언트 워시만 렌더해 §6 "스플래시를 콘텐츠 배경으로(테이블·패널)" 위반
// 없이 HANDOFF가 요구한 --game-wash→--bg 배경 처리 자체는 지금 반영한다.

export interface HeroAmbientProps {
  /** 패치 대표 챔피언 스플래시 URL(`/dd/splash/{Key}_0.jpg`). 미지정이면 그라디언트만 렌더한다. */
  splashUrl?: string | null;
  className?: string;
}

export default function HeroAmbient({ splashUrl, className = "" }: HeroAmbientProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(to bottom, var(--game-wash), var(--bg))",
      }}
    >
      {splashUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={splashUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ opacity: 0.3, filter: "blur(2px) saturate(.75)" }}
        />
      ) : null}
    </div>
  );
}
