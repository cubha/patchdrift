/* eslint-disable @next/next/no-img-element */
// src/components/SpellIcon.tsx
// 스펠 아이콘 — public/dd/spell/*.png(scripts/run-ddragon.ts의 syncSpellIcons가 다운로드) 참조.
// 파일명 조회(entity+skill → filename)는 서버 측(src/lib/data.ts의 loadSpellIcons +
// src/pipeline/match/spell-icon.ts의 spellIconKey)에서 끝내고, 이 컴포넌트는 이미 해석된
// filename만 받는다 — EntityIcon.tsx와 동일하게 onError 폴백 제어를 위해 클라이언트 컴포넌트.
"use client";

import { useState } from "react";

export interface SpellIconProps {
  /** src/lib/data.ts의 loadSpellIcons()로 조회한 파일명(예: "VorpalSpikes.png"). 조회 실패(자산
   * 미보유·미공지 슬롯 등)면 null — 이 경우 텍스트 폴백만 렌더한다(무근거 아이콘을 지어내지 않음). */
  filename: string | null;
  /** alt 텍스트이자 폴백 라벨(fallbackLabel 미지정 시 첫 글자)의 소스 — 보통 스킬 표기 원문. */
  name: string;
  fallbackLabel?: string;
  /** 정사각 한 변(px). 기본 40(HANDOFF §4-1 스킬 행 스펠 아이콘 크기). */
  size?: number;
  className?: string;
}

export default function SpellIcon({
  filename,
  name,
  fallbackLabel,
  size = 40,
  className = "",
}: SpellIconProps) {
  const [errored, setErrored] = useState(false);
  const label = fallbackLabel ?? name.slice(0, 1);
  const boxClass = `flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border-soft bg-surface-warm font-display text-xs font-bold text-fg-2 ${className}`;

  if (!filename || errored) {
    return (
      <span style={{ width: size, height: size }} className={boxClass}>
        {label}
      </span>
    );
  }

  return (
    <span style={{ width: size, height: size }} className={boxClass}>
      <img
        src={`/dd/spell/${filename}`}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
