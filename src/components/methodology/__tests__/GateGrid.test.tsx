// GateGrid 렌더 검증 — 방법론 페이지 통계 게이트 카드가 src/pipeline/aggregate/stats.ts의
// WIN_RATE_MIN_N·FDR_ALPHA를 하드코딩 없이 그대로 표시하는지 확인한다(완료 조건: "방법론 페이지
// 상수 표시" 테스트). 실제 stats.ts 상수를 import해서 검증 — 하드코딩된 기대값과 대조하는 게
// 아니라 "표시된 숫자가 상수와 일치하는지"를 검증하므로 stats.ts 값이 바뀌어도 테스트가 스스로
// 따라간다.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FDR_ALPHA, WIN_RATE_MIN_N } from "@/pipeline/aggregate/stats";
import GateGrid from "../GateGrid";

describe("GateGrid", () => {
  it("WIN_RATE_MIN_N·FDR_ALPHA를 화면에 그대로 표시한다", () => {
    const { container } = render(<GateGrid minN={WIN_RATE_MIN_N} alpha={FDR_ALPHA} />);
    expect(container.textContent).toContain(`n≥${WIN_RATE_MIN_N}`);
    expect(container.textContent).toContain(`q<${FDR_ALPHA}`);
  });

  it("4개 카드(1차축/2차축/신뢰구간/다중비교 보정)를 모두 렌더한다", () => {
    const { container } = render(<GateGrid minN={200} alpha={0.1} />);
    expect(container.textContent).toContain("1차축");
    expect(container.textContent).toContain("2차축");
    expect(container.textContent).toContain("신뢰구간");
    expect(container.textContent).toContain("다중비교 보정");
  });
});
