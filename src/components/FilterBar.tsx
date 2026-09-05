// src/components/FilterBar.tsx
// 필터 바 — 패치 쌍·티어·지역·큐 선택 + 우측 n·집계 시각 캡션(UX-BRIEF §3 "01 브리핑 홈").
// 정적 export(next.config.ts output:'export')라 실질적인 서버 사이드 필터링은 없다 — 패치 쌍만
// "표시 + 변경 시 라우트 이동"이 의미 있고(멀티 패치 쌍 브라우징은 PLAN SCOPE C2 "티어·포지션
// 필터"처럼 Should 이후 범위), 티어·지역·큐는 현재 파이프라인이 KR·Master+·솔로/듀오 단일
// 표본만 수집하므로(SCOPE C2 미착수) 표시용 disabled 옵션 1개로 고정한다.
//
// 구현 결정: 패치 쌍 변경 시 라우트 이동 대상은 이 컴포넌트가 알 수 없다(ST-11/12가 실제 페이지
// 구조를 확정하기 전까지 "쌍별 정적 경로"가 존재하는지조차 미정 — PLAN ST-11/12에 쌍별
// generateStaticParams 언급 없음). 그래서 href 결정을 호출부에 위임하는 `pairHref` 콜백을
// 선택적으로 받는다 — 안 넘기면(현재 모든 소비처) 네비게이션은 no-op이고 select는 표시 전용으로
// 동작한다. 모든 prop이 optional이라 기존 `<FilterBar />` 스텁 호출부가 무수정으로 컴파일된다.
"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import { fmtInt, fmtKst } from "@/lib/format";

export interface PatchPairOption {
  from: string;
  to: string;
}

export interface FilterBarProps {
  pairs?: PatchPairOption[];
  currentPair?: PatchPairOption | null;
  /** 패치 쌍 select onChange 시 이동할 경로를 계산한다. 미지정 시 선택은 표시만 되고 이동하지
   * 않는다(쌍이 1개 이하일 때는 항상 disabled라 어차피 호출되지 않는다). */
  pairHref?: (pair: PatchPairOption) => string;
  tier?: string;
  region?: string;
  queue?: string;
  nBefore?: number | null;
  nAfter?: number | null;
  /** ISO 8601 — 집계 시각(요약 파일 meta.generatedAt). */
  aggregatedAt?: string | null;
  className?: string;
}

function pairLabel(pair: PatchPairOption): string {
  return `${pair.from} → ${pair.to}`;
}

export default function FilterBar({
  pairs = [],
  currentPair = null,
  pairHref,
  tier = "Master+",
  region = "KR",
  queue = "솔로/듀오",
  nBefore = null,
  nAfter = null,
  aggregatedAt = null,
  className = "",
}: FilterBarProps) {
  const router = useRouter();
  const pairDisabled = pairs.length <= 1;
  const currentIndex = currentPair
    ? pairs.findIndex((p) => p.from === currentPair.from && p.to === currentPair.to)
    : -1;

  function handlePairChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = pairs[Number(e.target.value)];
    if (!next || !pairHref) return;
    router.push(pairHref(next));
  }

  const captionParts: string[] = [];
  if (nBefore !== null && nAfter !== null) {
    captionParts.push(`n=${fmtInt(nBefore)} / ${fmtInt(nAfter)} 매치`);
  }
  if (aggregatedAt) {
    captionParts.push(`집계 ${fmtKst(aggregatedAt)}`);
  }
  const caption = captionParts.length > 0 ? captionParts.join(" · ") : null;

  return (
    <div className={`border-b border-border bg-surface-warm ${className}`}>
      <Container className="flex flex-wrap items-end gap-5 py-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">패치 쌍</span>
          <select
            className="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-bold text-fg disabled:cursor-not-allowed disabled:opacity-70"
            disabled={pairDisabled}
            defaultValue={currentIndex >= 0 ? currentIndex : 0}
            onChange={handlePairChange}
          >
            {pairs.length > 0 ? (
              pairs.map((pair, i) => (
                <option key={pairLabel(pair)} value={i}>
                  {pairLabel(pair)}
                </option>
              ))
            ) : (
              <option>데이터 없음</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">티어</span>
          <select
            className="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-bold text-fg disabled:cursor-not-allowed disabled:opacity-70"
            disabled
            defaultValue={tier}
          >
            <option>{tier}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">지역</span>
          <select
            className="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-bold text-fg disabled:cursor-not-allowed disabled:opacity-70"
            disabled
            defaultValue={region}
          >
            <option>{region}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted">큐</span>
          <select
            className="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm font-bold text-fg disabled:cursor-not-allowed disabled:opacity-70"
            disabled
            defaultValue={queue}
          >
            <option>{queue}</option>
          </select>
        </label>

        {caption ? (
          <span className="ml-auto self-center whitespace-nowrap font-mono text-xs tabular-nums text-muted">
            {caption}
          </span>
        ) : null}
      </Container>
    </div>
  );
}
