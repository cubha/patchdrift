// src/components/home/StreamColumnLayout.tsx
// 홈 2컬럼 레이아웃 — 우측 컬럼(매치 평균·라인별 괴리·디스코드)의 렌더 높이를 기준으로 좌측
// 컬럼(라인 필터+릴리즈노트 스트림)도 같은 높이로 고정하고, 좌측 내부만 스크롤되게 한다.
// 이전에는 좌측 스트림이 선택 라인의 미공지 엔티티 전건을 렌더해(개수 제한은 의도된 설계 —
// releaseStream.ts) 페이지 전체가 과도하게 길어졌다(2026-09-11 사용자 지적).
//
// 우측 컬럼 높이는 데이터에 따라 달라지는 동적 값이라(고정 px 아님) ResizeObserver로 실측한다.
// lg 미만(좁은 화면)에서는 두 컬럼이 세로로 쌓이므로 높이 고정을 걸면 안 된다 — matchMedia로
// lg 이상일 때만 좌측에 height를 적용한다.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const LG_QUERY = "(min-width: 1024px)"; // Tailwind 기본 lg 브레이크포인트(DESIGN-TOKENS.md 미정의 — Tailwind 기본값 그대로 사용)

export interface StreamColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export default function StreamColumnLayout({ left, right }: StreamColumnLayoutProps) {
  const rightRef = useRef<HTMLDivElement>(null);
  const [rightHeight, setRightHeight] = useState<number | null>(null);
  // 초기값은 lazy initializer로 즉시 계산 — effect 본문에서 동기 setState를 호출하면
  // 불필요한 캐스케이드 렌더를 유발한다(react-hooks/set-state-in-effect). effect는 이후
  // 변경(리사이즈로 브레이크포인트 전환)을 구독하는 용도로만 쓴다.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(LG_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(LG_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setRightHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const leftHeight = isDesktop && rightHeight ? rightHeight : undefined;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex min-h-0 flex-col" style={leftHeight ? { height: leftHeight } : undefined}>
        {left}
      </div>
      <div ref={rightRef} className="flex flex-col gap-6">
        {right}
      </div>
    </div>
  );
}
