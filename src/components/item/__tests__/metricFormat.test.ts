import { describe, expect, it } from "vitest";
import { displayMetricLabel, formatCiRange, formatMetricValue, metricKind } from "../metricFormat";

describe("metricKind", () => {
  it("비율 지표는 pp", () => {
    expect(metricKind("pickRate")).toBe("pp");
    expect(metricKind("banRate")).toBe("pp");
    expect(metricKind("winRate")).toBe("pp");
    expect(metricKind("adoptionRate")).toBe("pp");
  });

  it("시간 지표는 sec", () => {
    expect(metricKind("firstSec")).toBe("sec");
    expect(metricKind("avgDurationSec")).toBe("sec");
  });

  it("골드 지표는 gold", () => {
    expect(metricKind("goldAt10")).toBe("gold");
    expect(metricKind("goldAt14")).toBe("gold");
  });

  it("알 수 없는 지표는 gold로 안전하게 폴백", () => {
    expect(metricKind("futureMetric")).toBe("gold");
  });
});

describe("formatMetricValue", () => {
  it("null은 대시", () => {
    expect(formatMetricValue(null, "pp")).toBe("—");
  });

  it("pp는 퍼센트로", () => {
    expect(formatMetricValue(0.046, "pp")).toBe("4.6%");
  });

  it("sec는 분:초로", () => {
    expect(formatMetricValue(352, "sec")).toBe("5:52");
  });

  it("gold는 천단위 콤마 정수로", () => {
    expect(formatMetricValue(10240, "gold")).toBe("10,240");
  });
});

describe("displayMetricLabel", () => {
  it("firstSec은 엔티티명과 조합해 '첫 {엔티티} 시각'", () => {
    expect(displayMetricLabel({ metric: "firstSec", entityName: "용" })).toBe("첫 용 시각");
  });

  it("그 외 metric은 format.ts metricLabel에 위임", () => {
    expect(displayMetricLabel({ metric: "pickRate", entityName: "트런들" })).toBe("픽률");
  });

  it("알려지지 않은 metric은 원본 문자열 그대로", () => {
    expect(displayMetricLabel({ metric: "unknownMetric", entityName: "x" })).toBe(
      "unknownMetric"
    );
  });
});

describe("formatCiRange", () => {
  it("비율 Interval을 퍼센트 소수 1자리 [lo, hi]로", () => {
    expect(formatCiRange([0.463, 0.482])).toBe("[46.3, 48.2]");
    expect(formatCiRange([0.333, 0.352])).toBe("[33.3, 35.2]");
  });
});
