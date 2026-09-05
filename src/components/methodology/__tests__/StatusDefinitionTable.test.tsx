import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import StatusDefinitionTable from "../StatusDefinitionTable";

describe("StatusDefinitionTable", () => {
  it("5개 상태(no-change 포함)를 모두 렌더하고 게이트 값을 조건 열에 반영한다", () => {
    const { container } = render(<StatusDefinitionTable minN={200} alpha={0.1} />);
    expect(container.textContent).toContain("공지-일치");
    expect(container.textContent).toContain("공지-불일치");
    expect(container.textContent).toContain("미공지");
    expect(container.textContent).toContain("표본 부족");
    expect(container.textContent).toContain("변화 없음");
    expect(container.textContent).toContain("n<200");
    expect(container.textContent).toContain("q<0.1");
  });
});
