// src/components/Header.tsx
// 헤더 — 로고 점 + "patchgap" + 내비 3개(브리핑/대조표/방법론) + 우측 스냅샷 캡션.
// 프로토타입 `.site-header`/`.brand`/`.site-nav`/`.snapshot-caption` 1:1
// (docs/design/prototype/01-briefing-home.html). 현재 경로 강조에 usePathname이 필요해
// 클라이언트 컴포넌트로 둔다 — snapshotCaption은 서버(layout.tsx)가 data.ts로 미리 계산해
// prop으로 내려준다(이 컴포넌트 자신은 fs를 만지지 않는다).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "@/components/Container";

const NAV_ITEMS = [
  { href: "/", label: "브리핑" },
  { href: "/compare/", label: "대조표" },
  { href: "/methodology/", label: "방법론" },
] as const;

export interface HeaderProps {
  /** "2026-09-05 14:00 KST" 형태(fmtKst 출력). 산출 데이터가 아직 없으면 null. */
  snapshotCaption?: string | null;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href);
}

export default function Header({ snapshotCaption = null }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <Container className="flex items-center gap-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-pill bg-accent" aria-hidden="true" />
          <span className="font-display text-lg font-bold tracking-tight text-fg">patchgap</span>
        </Link>
        <nav className="flex gap-5" aria-label="주요 내비게이션">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 pb-1 text-sm font-bold ${
                  active
                    ? "border-accent text-fg"
                    : "border-transparent text-muted hover:text-fg-2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {snapshotCaption ? (
          <span className="ml-auto whitespace-nowrap font-mono text-xs tabular-nums text-muted">
            스냅샷 · {snapshotCaption}
          </span>
        ) : null}
      </Container>
    </header>
  );
}
