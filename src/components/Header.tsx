// src/components/Header.tsx
// 헤더 — 로고 "patchdrift" + 내비 3개(브리핑/대조표/방법론). 토큰 클래스만 사용, 데이터 연결 없음(스텁).

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "브리핑" },
  { href: "/compare", label: "대조표" },
  { href: "/methodology", label: "방법론" },
] as const;

export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      {/* --container-max(1320px)는 @theme 유틸로 바인딩되지 않아 var() 참조로 토큰을 소비한다 */}
      <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg font-semibold text-fg">
          patchdrift
        </Link>
        <nav className="flex gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-fg-2 hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
