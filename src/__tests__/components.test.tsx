// src/__tests__/components.test.tsx
// StatusBadge·DeltaValue 렌더 스냅샷 최소 검증(ST-10 완료 조건). vitest.config.ts에
// setupFiles/globals가 없어(다른 SubTask 소유 파일이라 건드리지 않는다) jest-dom 매처
// (toBeInTheDocument 등)를 쓰지 않고 render()의 container를 직접 querying한다 — RTL 자동
// cleanup도 등록되어 있지 않으므로 매 테스트 render() 반환값의 container만 사용해 회피한다.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import StatusBadge from "../components/StatusBadge";
import DeltaValue from "../components/DeltaValue";

describe("StatusBadge", () => {
  it("공지-일치 상태를 렌더한다", () => {
    const { container } = render(<StatusBadge status="announced-consistent" />);
    expect(container.textContent).toContain("공지-일치");
  });

  it("미공지 상태는 accent 색 유틸을 포함한다", () => {
    const { container } = render(<StatusBadge status="unannounced" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("text-accent");
    expect(container.textContent).toContain("미공지");
  });

  it("변화 없음(no-change)을 muted로 렌더한다", () => {
    const { container } = render(<StatusBadge status="no-change" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("text-muted");
    expect(container.textContent).toContain("변화 없음");
  });

  it("알려지지 않은 상태값도 크래시 없이 원본 문자열로 렌더한다", () => {
    const { container } = render(<StatusBadge status="future-status" />);
    expect(container.textContent).toContain("future-status");
  });
});

describe("DeltaValue", () => {
  it("상승 델타는 success 색 + ▲ + CI 캡션을 렌더한다(pp)", () => {
    const { container } = render(<DeltaValue delta={0.025} ci={[0.021, 0.029]} kind="pp" />);
    expect(container.textContent).toContain("▲");
    expect(container.textContent).toContain("+2.5%p");
    expect(container.textContent).toContain("CI ±0.4");
    expect(container.querySelector("span")?.className).toContain("text-success");
  });

  it("하락 델타는 danger 색 + ▼(sec)", () => {
    const { container } = render(<DeltaValue delta={-22} ci={[-28, -16]} kind="sec" />);
    expect(container.textContent).toContain("▼");
    expect(container.textContent).toContain("−22s");
    expect(container.textContent).toContain("CI ±6s");
    expect(container.querySelector("span")?.className).toContain("text-danger");
  });

  it("delta가 null이면 대시(—)만 렌더한다", () => {
    const { container } = render(<DeltaValue delta={null} kind="gold" />);
    expect(container.textContent).toBe("—");
  });

  it("gold kind는 정수 델타를 부호+콤마로 렌더한다", () => {
    const { container } = render(<DeltaValue delta={320} ci={[235, 405]} kind="gold" />);
    expect(container.textContent).toContain("+320");
    expect(container.textContent).toContain("CI ±85");
  });
});
