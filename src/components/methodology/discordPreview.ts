// src/components/methodology/discordPreview.ts
// 방법론 페이지 "디스코드 미리보기"(ST-12 ④) — 실 데이터가 있으면 미공지 상위 5건으로 embed
// 필드를 만들고, 없으면(현재 미공지 0건인 26.17 자기쌍 등) 프로토타입 예시 문구로 폴백한다.
// 순수 함수(테스트 대상) — 정렬은 |q| 오름차순(가장 유의한 변화 우선), 동률이면 원본 순서 유지.

import { fmtDeltaInt, fmtDeltaSec, fmtPp } from "@/lib/format";
import type { DeltaRecord, PatchId } from "@/pipeline/types";
import { displayMetricLabel, metricKind } from "@/components/item/metricFormat";

export interface DiscordFieldView {
  label: string;
  value: string;
}

export interface DiscordPreviewView {
  title: string;
  fields: DiscordFieldView[];
  footer: string;
  /** true면 실 데이터가 없어 프로토타입 예시 문구를 쓰고 있다는 뜻(호출부가 muted 처리). */
  isExample: boolean;
}

const EXAMPLE_FIELDS: DiscordFieldView[] = [
  { label: "트런들 픽률", value: "+2.5%p" },
  { label: "말파이트 밴률", value: "+4.5%p" },
  { label: "정복자(탑) 채택률", value: "−7%p" },
  { label: "골드@14(탑)", value: "+320" },
  { label: "첫 용 처치 시각", value: "+22s" },
];

function fieldValue(delta: DeltaRecord): string {
  const kind = metricKind(delta.metric);
  const value = delta.delta ?? 0;
  if (kind === "pp") return fmtPp(value);
  if (kind === "sec") return fmtDeltaSec(value);
  return fmtDeltaInt(value);
}

export interface DiscordPreviewParams {
  from: PatchId | null;
  to: PatchId | null;
  rows: DeltaRecord[] | null;
  nBefore: number | null;
  nAfter: number | null;
  limit?: number;
}

export function buildDiscordPreview(params: DiscordPreviewParams): DiscordPreviewView {
  const { from, to, rows, nBefore, nAfter, limit = 5 } = params;
  const unannounced = (rows ?? []).filter((r) => r.status === "unannounced");

  const title = from && to ? `patchdrift · ${from} → ${to}` : "patchdrift · {from} → {to}";
  const footerPair = from && to ? `${from}→${to}` : "{from}→{to}";
  const footerN =
    nBefore !== null && nAfter !== null ? `n=${nBefore}/${nAfter}` : "n={before}/{after}";
  const footer = `patchdrift · ${footerPair} · ${footerN}`;

  if (unannounced.length === 0) {
    return { title: "patchdrift · 26.16 → 26.17", fields: EXAMPLE_FIELDS, footer: "patchdrift · 26.16→26.17 · n=10,240/10,118", isExample: true };
  }

  const sorted = [...unannounced].sort((a, b) => (a.q ?? 1) - (b.q ?? 1));
  const fields = sorted.slice(0, limit).map((delta) => ({
    label: `${delta.entityName} ${displayMetricLabel(delta)}`,
    value: fieldValue(delta),
  }));

  return { title, fields, footer, isExample: false };
}
