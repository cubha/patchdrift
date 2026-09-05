// src/app/page.tsx
// 브리핑 홈 — 헤더 + "patchdrift" 한 줄 스텁. F5에서 요약 카드·미공지 목록·공지 대조 미리보기로 채운다.

import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <p className="font-display text-2xl text-fg">patchdrift</p>
      </main>
    </div>
  );
}
