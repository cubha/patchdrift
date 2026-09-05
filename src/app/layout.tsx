import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Roboto_Mono } from "next/font/google";
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
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
