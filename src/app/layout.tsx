import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Roboto_Mono } from "next/font/google";
import Header from "@/components/Header";
import { listPatches, loadSummary } from "@/lib/data";
import { fmtKst } from "@/lib/format";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "patchdrift",
  description: "패치노트가 말한 것 vs 통계가 말하는 것 — LoL 패치 미공지 변화 브리핑",
};

// 실측(2026-09-05): create-next-app 기본 `LayoutProps<"/">`는 `.next/types`가 생성된 뒤에만
// 존재하는 앰비언트 타입이라, verify.sh 순서(tsc --noEmit → build)상 최초 실행 시 `next build`가
// 아직 안 돌아 `.next/types`가 없으면 `tsc`가 항상 실패한다(Cannot find name 'LayoutProps'). 이
// 순서 의존을 없애기 위해 명시 타입으로 대체한다.

/** 헤더 우측 "스냅샷 · YYYY-MM-DD HH:mm KST" 캡션 — 가장 최신 패치 summary.json의
 * meta.generatedAt에서 계산한다. 빌드 타임 fs 호출(data.ts)은 서버 컴포넌트인 이 레이아웃에서만
 * 하고, 클라이언트 컴포넌트인 Header에는 계산된 문자열만 prop으로 내려준다. 집계 산출물이
 * 하나도 없으면(빈 데이터 빌드) null — Header는 null이면 캡션을 렌더하지 않는다. */
function getSnapshotCaption(): string | null {
  const latestPatch = listPatches()[0];
  if (!latestPatch) return null;
  const summary = loadSummary(latestPatch);
  if (!summary) return null;
  return fmtKst(summary.meta.generatedAt);
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const snapshotCaption = getSnapshotCaption();
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${robotoMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <Header snapshotCaption={snapshotCaption} />
        {children}
      </body>
    </html>
  );
}
