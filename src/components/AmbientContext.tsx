// src/components/AmbientContext.tsx
// 전역 앰비언트 배경(AmbientBackground.tsx)이 소비하는 공유 상태 — layout.tsx에 단 한 번
// 렌더되는 배경과, 페이지별로 그 배경을 갱신하는 소비자(홈 라인 필터·항목상세 스플래시)를
// 잇는 client context. advisor 검토(2026-09-12): 배경을 두 번 렌더해 각자 다른 selectedLane을
// 들고 동기화하는 대신, 상태를 한 곳에 올리고 배경은 그 상태의 유일한 구독자로 둔다.
"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LaneAxis } from "@/lib/lane";

export interface AmbientState {
  /** 홈 라인 카메라가 따라갈 현재 선택 라인. 홈을 벗어나면 배경은 이 값을 무시하고 "all"로 렌더한다
   * (AmbientBackground.tsx가 usePathname()으로 판단) — 다른 페이지가 굳이 리셋할 필요 없음. */
  selectedLane: LaneAxis;
  setSelectedLane: (lane: LaneAxis) => void;
  /** 항목상세(챔피언) 히어로 스플래시 URL. null이면 상세 스플래시 레이어를 렌더하지 않는다. */
  detailSplashUrl: string | null;
  setDetailSplashUrl: (url: string | null) => void;
}

const AmbientContext = createContext<AmbientState | null>(null);

export function AmbientProvider({ children }: { children: ReactNode }) {
  const [selectedLane, setSelectedLane] = useState<LaneAxis>("all");
  const [detailSplashUrl, setDetailSplashUrl] = useState<string | null>(null);

  const value = useMemo<AmbientState>(
    () => ({ selectedLane, setSelectedLane, detailSplashUrl, setDetailSplashUrl }),
    [selectedLane, detailSplashUrl]
  );

  return <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>;
}

export function useAmbient(): AmbientState {
  const ctx = useContext(AmbientContext);
  if (!ctx) {
    throw new Error("useAmbient는 AmbientProvider 하위에서만 호출할 수 있다 (layout.tsx 확인)");
  }
  return ctx;
}
