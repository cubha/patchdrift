// src/components/methodology/__tests__/AdapterMatrix.test.tsx
// 어댑터 매핑표(ST-L) 렌더 검증 — HANDOFF §4-4 요구사항: 8개 계층 전부 렌더 · PUBG 수집
// 수치 0 명시 · 판정 엔진 게임 무관 고지 · 라인별 밴률 컬럼 등 §6 금지 항목이 섞여 들지 않음.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AdapterMatrix from "../AdapterMatrix";
import { ADAPTER_MATRIX } from "../adapterMatrixData";

describe("AdapterMatrix", () => {
  it("8개 계층을 모두 렌더한다", () => {
    const { container } = render(<AdapterMatrix />);
    expect(ADAPTER_MATRIX.length).toBe(8);
    for (const row of ADAPTER_MATRIX) {
      expect(container.textContent).toContain(row.layer);
    }
  });

  it("주 엔티티 행은 챔피언↔무기를 매핑한다", () => {
    const { container } = render(<AdapterMatrix />);
    expect(container.textContent).toContain("챔피언");
    expect(container.textContent).toContain("무기");
  });

  it("PUBG 수집 수치 0건과 판정 엔진 게임 무관 고지를 렌더한다", () => {
    const { container } = render(<AdapterMatrix />);
    expect(container.textContent).toContain("PUBG 수집 수치: 0건");
    expect(container.textContent).toContain("판정 엔진");
    expect(container.textContent).toContain("게임 무관");
  });

  it("PUBG 상태 뱃지는 '미연결'을 명시한다(§6 PUBG 실연결 금지)", () => {
    const { container } = render(<AdapterMatrix />);
    expect(container.textContent).toContain("미연결");
    expect(container.textContent).not.toContain("실연결 완료");
  });
});
