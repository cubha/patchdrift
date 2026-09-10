// src/components/methodology/__tests__/AdapterMatrix.test.tsx
// 어댑터 매핑표(ST-L) 렌더 검증 — HANDOFF §4-4 요구사항: 계층 전부 렌더 · PUBG 수집
// 수치 0 명시 · 판정 엔진 게임 무관 고지 · 라인별 밴률 컬럼 등 §6 금지 항목이 섞여 들지 않음.
// 2026-09-10(verify-impl 축B): 4열이 "PUBG 상태" → "어댑터 인터페이스"로 바뀌고 판정 엔진이
// 표 밖 문단 → 9번째 행이 됐다(시안 구조). 어서션도 그 명세로 갱신한다.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AdapterMatrix from "../AdapterMatrix";
import { ADAPTER_MATRIX } from "../adapterMatrixData";

describe("AdapterMatrix", () => {
  it("9개 계층(어댑터 8 + 판정 엔진)을 모두 렌더한다", () => {
    const { container } = render(<AdapterMatrix />);
    expect(ADAPTER_MATRIX.length).toBe(9);
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

  it("PUBG 열 머리글이 '어댑터 확정 · 미연결'을 명시한다(§6 PUBG 실연결 금지)", () => {
    const { container } = render(<AdapterMatrix />);
    const heads = [...container.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(heads).toContain("PUBG (어댑터 확정 · 미연결)");
    expect(container.textContent).not.toContain("실연결 완료");
  });

  it("4번째 열은 어댑터 인터페이스이고 8계층 전부 인터페이스 이름을 노출한다", () => {
    const { container } = render(<AdapterMatrix />);
    const heads = [...container.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(heads[3]).toBe("어댑터 인터페이스");
    for (const iface of [
      "NoteSource.fetch()",
      "MatchSource.collect()",
      "Entity{type,key,name}",
      "Segment[]",
      "Metric.adoption",
      "Metric.outcome",
      "Metric.timeline",
      "AssetSource.icon()",
    ]) {
      expect(container.textContent).toContain(iface);
    }
  });

  it("판정 엔진은 표 밖 문단이 아니라 마지막 행이며 인터페이스가 '고정'이다", () => {
    const { container } = render(<AdapterMatrix />);
    const rows = [...container.querySelectorAll("tbody tr")];
    const last = rows[rows.length - 1];
    expect(last.textContent).toContain("판정 엔진");
    expect(last.textContent).toContain("고정");
    // 게임 무관이므로 LoL 셀이 PUBG 열까지 가로지른다 — 셀 4개가 아니라 3개.
    expect(last.querySelectorAll("td")).toHaveLength(3);
  });
});
