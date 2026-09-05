/* eslint-disable @next/next/no-img-element */
// src/components/EntityIcon.tsx
// 엔티티 아이콘 — public/dd/{champion,item}/*.png(빌드 타임 Data Dragon 다운로드, ST-08
// run-ddragon.ts 소유) 참조. next/image는 output:'export' + 외부 도메인 없음 조합에서 이점이
// 없고(images.unoptimized=true 이미 설정) onError 폴백 제어가 <img>가 더 단순해 미사용.
// objective/lane/summary 엔티티는 Data Dragon 자산이 없어 항상 폴백 박스(텍스트)로 렌더한다.
// 파일 로드 실패(404 등) 시에도 동일 폴백으로 전환 — 클라이언트 컴포넌트가 필요한 유일한 이유.
"use client";

import { useState } from "react";
import type { DeltaEntityType } from "@/pipeline/types";

export interface EntityIconProps {
  entityType: DeltaEntityType;
  /** champion → Data Dragon key(예: "Trundle"), item → itemId 문자열(예: "3047"). 그 외
   * entityType은 이미지가 없으므로 값이 있어도 무시된다. */
  entityKey: string;
  /** alt 텍스트이자 폴백 라벨(fallbackLabel 미지정 시 첫 글자)의 소스. */
  name: string;
  /** 폴백 박스에 표시할 텍스트를 직접 지정(오브젝트·라인 지표용, 예: "용"·"골"). 미지정 시
   * name의 첫 글자. */
  fallbackLabel?: string;
  /** 정사각 한 변(px). 기본 32(대조표·미공지 목록 행 크기). */
  size?: number;
  className?: string;
}

function ddragonSrc(entityType: DeltaEntityType, entityKey: string): string | null {
  if (entityType === "champion") return `/dd/champion/${entityKey}.png`;
  if (entityType === "item") return `/dd/item/${entityKey}.png`;
  return null;
}

export default function EntityIcon({
  entityType,
  entityKey,
  name,
  fallbackLabel,
  size = 32,
  className = "",
}: EntityIconProps) {
  const src = ddragonSrc(entityType, entityKey);
  const [errored, setErrored] = useState(false);
  const label = fallbackLabel ?? name.slice(0, 1);
  const boxClass = `flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-warm font-display text-xs font-bold text-fg-2 ${className}`;

  if (!src || errored) {
    return (
      <span style={{ width: size, height: size }} className={boxClass}>
        {label}
      </span>
    );
  }

  return (
    <span style={{ width: size, height: size }} className={boxClass}>
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
