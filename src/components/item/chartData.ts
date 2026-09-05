// src/components/item/chartData.ts
// 항목 상세 델타 차트(ST-12) 데이터 변환 — 순수 함수, 부수효과 없음(테스트 대상).
//
// 편차(ST-12 지시 반영): 프로토타입 03의 주 차트는 "일별 시계열"이지만 집계는 패치 단위라
// 일별 값이 데이터에 없다 — 그래서 이 함수는 "전/후 2점 + CI 오차 막대" 데이터만 만든다.
// DeltaRecord에는 전/후 각각의 Wilson CI가 아니라 "차이(delta)"의 CI(`ci`) 하나만 있으므로,
// 오차 막대는 "전(before)"이 아니라 "후(after)" 막대에 (delta의 CI 반영한) 폭으로 붙인다 —
// before+ci[0] ~ before+ci[1] 구간을 after 막대 기준 offset [errLow, errHigh]로 환산한다
// (self-pair 실측: delta=0, ci=[-0.014,0.014] → errLow=errHigh=0.014, 대칭 확인).

import type { DeltaRecord, Interval } from "@/pipeline/types";
import { type MetricKind, metricKind } from "./metricFormat";

/** 차트 막대 1개(전 또는 후) — recharts에 그대로 넘기는 행. */
export interface ChartBarDatum {
  key: "before" | "after";
  label: string;
  /** 원시 단위(비율 0~1 / 초 / 골드) — 라벨 텍스트 포맷팅용. */
  rawValue: number | null;
  /** 차트에 실제로 그릴 값 — kind="pp"는 ×100(퍼센트 스케일), 그 외는 원시값 그대로. */
  chartValue: number | null;
  /** recharts ErrorBar dataKey용 [하한 오프셋, 상한 오프셋](chartValue와 동일 스케일). */
  error: [number, number];
}

export interface ItemChartData {
  kind: MetricKind;
  /** before/after 둘 다 null이 아니어야 true — false면 차트 대신 빈 상태 문구를 렌더한다. */
  hasData: boolean;
  /** true면 오차 막대를 일부러 생략했다는 뜻(표본 부족 — 아래 참고). 차트가 hasData=true로
   * 값 막대는 그리되 CI를 신뢰할 수 없어 숨겼음을 호출부가 캡션으로 알릴 수 있게 한다. */
  errorSuppressed: boolean;
  bars: [ChartBarDatum, ChartBarDatum];
}

function scaleFor(kind: MetricKind): number {
  return kind === "pp" ? 100 : 1;
}

/**
 * DeltaRecord → 전/후 막대 차트 데이터. beforeLabel/afterLabel은 보통 패치 번호("26.16"/
 * "26.17")를 넘기고, 미지정 시 "전"/"후"로 표시한다.
 *
 * `suppressError`(기본 false): true면 오차 막대를 강제로 [0,0]으로 만든다 — UX-BRIEF §1
 * 불변 원칙 "승률은 n 게이트 미달 시 '표본 부족' 라벨(델타 미제시)"에 따라 `status ===
 * "insufficient-sample"`인 델타는 표본이 너무 작아(예: n=8) CI가 무의미하게 넓어지는 문제가
 * 실측 있었다(LeeSin TOP winRate: ci=[-0.398,0.398] → 62.5% 막대에 ±39.8pp 오차 막대) — 그런
 * 경우 호출부가 이 플래그를 넘겨 오차 막대를 숨긴다.
 */
export function buildChartData(
  delta: DeltaRecord,
  beforeLabel = "전",
  afterLabel = "후",
  suppressError = false
): ItemChartData {
  const kind = metricKind(delta.metric);
  const scale = scaleFor(kind);
  const hasData = delta.before !== null && delta.after !== null;

  const bars: [ChartBarDatum, ChartBarDatum] = [
    {
      key: "before",
      label: beforeLabel,
      rawValue: delta.before,
      chartValue: delta.before === null ? null : delta.before * scale,
      error: [0, 0],
    },
    {
      key: "after",
      label: afterLabel,
      rawValue: delta.after,
      chartValue: delta.after === null ? null : delta.after * scale,
      error: [0, 0],
    },
  ];

  let errorSuppressed = false;
  if (hasData && delta.delta !== null) {
    if (suppressError) {
      errorSuppressed = true;
    } else {
      const [lo, hi]: Interval = delta.ci;
      const errLow = Math.max(0, (delta.delta - lo) * scale);
      const errHigh = Math.max(0, (hi - delta.delta) * scale);
      bars[1] = { ...bars[1], error: [errLow, errHigh] };
    }
  }

  return { kind, hasData, errorSuppressed, bars };
}
