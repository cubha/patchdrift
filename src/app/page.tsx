// src/app/page.tsx
// 브리핑 홈 — "patchdrift" 한 줄 스텁. F5에서 요약 카드·미공지 목록·공지 대조 미리보기로 채운다.
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main className="flex flex-1 items-center justify-center">
        <p className="font-display text-2xl text-fg">patchdrift</p>
      </main>
    </div>
  );
}
