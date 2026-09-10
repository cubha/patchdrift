// src/components/LaneGlyph.tsx
// 라인(포지션) 글리프 — DDragon에 라인 전용 아이콘 자산이 없어(HANDOFF §4-1 "DDragon에 라인 자산
// 없음") 인라인 SVG로 자체 제작한다. currentColor를 써서 색은 호출부(CSS)가 제어한다.
// 접근성: 글리프는 라인의 유일한 시각 구분 수단이므로(색·모양만으로 라인을 전달하지 않는다는
// 원칙, HANDOFF §4-1 UI 설계 명세) 기본값은 <title> 라벨이다.
// 2026-09-10 개정 — `labelled`: 바로 옆 텍스트가 이미 라인 이름을 말하는 호출부(필터 버튼의
// "탑", 라인 태그의 "탑 · 승률", 델타 테이블 엔티티명 "바텀")에서는 <title>이 그 텍스트와
// 겹쳐 접근명이 "탑탑"·"원딜바텀"으로 중복 낭독된다. 그런 자리에서는 글리프가 장식이 되므로
// aria-hidden으로 감춘다 — "유일한 시각 구분 수단"이라는 전제가 텍스트 동반 시엔 성립하지
// 않기 때문이고, 텍스트가 없는 호출부의 기본 동작(<title> 필수)은 그대로다.

import type { LaneAxis } from "@/lib/lane";
import { positionLabel } from "@/lib/format";

export interface LaneGlyphProps {
  lane: LaneAxis;
  size?: number;
  className?: string;
  /** 바로 옆 텍스트가 이미 라인 이름을 말하는가. true면 글리프를 장식으로 처리해 접근명
   * 중복("탑탑")을 막는다. 기본 false(<title> 라벨). */
  labelled?: boolean;
}

const LANE_LABELS: Record<LaneAxis, string> = {
  TOP: positionLabel("TOP"),
  JUNGLE: positionLabel("JUNGLE"),
  MIDDLE: positionLabel("MIDDLE"),
  BOTTOM: positionLabel("BOTTOM"),
  UTILITY: positionLabel("UTILITY"),
  all: "전체",
};

/** 각 라인의 최소 식별 형태 — 24x24 viewBox, stroke 기반(fill 없음)이라 currentColor 하나로
 * 배경·상태색 어디에 놓여도 대비가 유지된다. */
function GlyphPath({ lane }: { lane: LaneAxis }) {
  switch (lane) {
    case "TOP":
      // 상단 방벽 형태 — 위쪽 가로선 + 짧은 세로 지지대 2개.
      return (
        <>
          <path d="M4 7h16" />
          <path d="M8 7v10" />
          <path d="M16 7v10" />
        </>
      );
    case "JUNGLE":
      // 사각 경계 안의 다이아몬드 — 정글 캠프 순환 동선을 추상화.
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M12 8l4 4-4 4-4-4z" />
        </>
      );
    case "MIDDLE":
      // 중앙 교차선 — 단일 대각 라인.
      return (
        <>
          <path d="M5 19L19 5" />
          <circle cx="12" cy="12" r="2" />
        </>
      );
    case "BOTTOM":
      // 하단 방벽 형태(TOP 대칭) — 원거리 딜러 라인.
      return (
        <>
          <path d="M4 17h16" />
          <path d="M8 17V7" />
          <path d="M16 17V7" />
        </>
      );
    case "UTILITY":
      // 방패 형태 — 서포터의 보호 역할을 추상화.
      return <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />;
    case "all":
    default:
      // 격자(전체 라인을 아우름) — 2x2 점 배열.
      return (
        <>
          <circle cx="7" cy="7" r="1.6" />
          <circle cx="17" cy="7" r="1.6" />
          <circle cx="7" cy="17" r="1.6" />
          <circle cx="17" cy="17" r="1.6" />
        </>
      );
  }
}

export default function LaneGlyph({ lane, size = 16, className = "", labelled = false }: LaneGlyphProps) {
  const label = LANE_LABELS[lane];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={labelled ? undefined : "img"}
      aria-hidden={labelled || undefined}
      className={className}
    >
      {labelled ? null : <title>{label}</title>}
      <GlyphPath lane={lane} />
    </svg>
  );
}
