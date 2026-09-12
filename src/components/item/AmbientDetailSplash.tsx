// src/components/item/AmbientDetailSplash.tsx
// 항목상세(서버 컴포넌트)가 계산한 스플래시 URL을 전역 배경(AmbientContext)에 알리기만 하는
// 얇은 client 브릿지. 렌더하는 DOM은 없다 — AmbientBackground.tsx(layout.tsx, 단일 인스턴스)가
// 실제 스플래시 레이어를 그린다. 페이지를 벗어나면(언마운트) null로 되돌려 다른 페이지에
// 이전 챔피언 스플래시가 남지 않게 한다.
"use client";

import { useEffect } from "react";
import { useAmbient } from "@/components/AmbientContext";

export default function AmbientDetailSplash({ url }: { url: string | null }) {
  const { setDetailSplashUrl } = useAmbient();

  useEffect(() => {
    setDetailSplashUrl(url);
    return () => setDetailSplashUrl(null);
  }, [url, setDetailSplashUrl]);

  return null;
}
