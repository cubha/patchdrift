// src/components/home/streamVerdict.ts
// 릴리즈노트 스트림의 "판정 문장" 순수 로직 — 확정 시안(2026-09-10) 홈의 두 요소를 만든다:
//   .rn-obs   엔티티 레벨 대표 관측 1줄 ("밴률 26.8% → 42.4% ▲ +15.7%p · CI ±1.3")
//   .verdict .m  스킬 행별 판정 근거 1줄 ("노트=상향 · 관측=밴률 상승")
// verify-impl 축B(2026-09-10)에서 둘 다 부재로 확인돼 신설했다. 렌더는 ReleaseNoteRow 몫 —
// 이 모듈은 "어떤 델타를 대표로 쓰고 무슨 문장을 만들지"만 결정한다(부수효과 없음).
//
// 무근거 문장 금지 원칙: 짝지어진 델타가 없으면 문장을 만들지 않고 `null`을 돌려준다.
// 호출부는 그 자리에 아무것도 렌더하지 않는다(StatusBadge "관측 보류"가 이미 상태를 말한다).

import type { DeltaRecord, PatchNoteItem } from "@/pipeline/types";
import { metricLabel } from "@/lib/format";
import { absDelta, isSignificantDelta } from "./logic";

/** 노트 방향(direction) → 시안 표기. `unknown`은 방향을 지어내지 않고 "변경"으로 둔다. */
const DIRECTION_LABEL: Record<PatchNoteItem["direction"], string> = {
  buff: "상향",
  nerf: "하향",
  adjust: "조정",
  unknown: "변경",
};

/**
 * 엔티티 대표 관측 — |delta| 최대 1건. 시안 `.rn-obs`가 엔티티당 1줄이라 "무엇을 대표로
 * 보여줄지"를 결정해야 하는데, 스트림 정렬 기준(maxAbsDelta)과 같은 잣대를 써야 카드 순서와
 * 카드 안 대표 수치가 어긋나지 않는다. delta===null(측정 불가)뿐이면 null.
 */
export function selectEntityObservation(rows: readonly DeltaRecord[]): DeltaRecord | null {
  let best: DeltaRecord | null = null;
  for (const row of rows) {
    if (row.delta === null) continue;
    if (!best || absDelta(row) > absDelta(best)) best = row;
  }
  return best;
}

export interface NoteVerdict {
  /** "노트=상향" 좌변. */
  noteLabel: string;
  /** "밴률 상승" / "유의차 없음" 우변. */
  observedLabel: string;
  /** 우변 색 — DeltaValue와 같은 관례(up=success·down=danger·none=muted). */
  kind: "up" | "down" | "none";
}

/**
 * 스킬 행 1줄의 판정 근거 — 시안 `.verdict .m`("노트=상향 · 관측=밴률 폭증").
 * `record`가 없으면(그 노트에 짝지어진 델타 없음) `null` — 관측하지 않은 것을 관측했다고
 * 쓰지 않는다. 유의성은 `isSignificantDelta`(q·CI 직접 검사, status 라벨 아님)로 판정하며
 * 비유의면 방향어를 붙이지 않고 "유의차 없음"으로 끝낸다.
 *
 * 시안의 "폭증"·"급락" 같은 강도 부사는 쓰지 않는다 — 임계값을 새로 지어내야 하고 그 임계는
 * 어디에도 정의돼 있지 않다. 강도는 바로 옆 `.rn-obs`의 실수치가 이미 말한다.
 */
export function buildNoteVerdict(
  note: PatchNoteItem,
  record: DeltaRecord | undefined,
  qAlpha?: number
): NoteVerdict | null {
  if (!record) return null;
  const noteLabel = `노트=${DIRECTION_LABEL[note.direction]}`;
  if (!isSignificantDelta(record, qAlpha) || record.delta === null || record.delta === 0) {
    return { noteLabel, observedLabel: "유의차 없음", kind: "none" };
  }
  const up = record.delta > 0;
  return {
    noteLabel,
    observedLabel: `${metricLabel(record.metric)} ${up ? "상승" : "하락"}`,
    kind: up ? "up" : "down",
  };
}

/** q 표기 — 시안 `.rn-obs` 꼬리("· q<0.001" / "· q=0.14"). 0.001 미만은 유효숫자를 더 찍어도
 * 읽는 사람이 쓸 수 없으므로 부등호로 바꾼다(항목 상세 게이트 표기와 같은 관례). `q===null`
 * (계산 불가)이면 표기 자체를 생략한다 — 없는 값을 0으로 쓰지 않는다. */
export function formatQ(q: number | null): string | null {
  if (q === null) return null;
  if (q < 0.001) return "q<0.001";
  return `q=${q.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
}
