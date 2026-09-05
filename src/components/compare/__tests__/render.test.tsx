// src/components/compare/__tests__/render.test.tsx
// 대조표 컴포넌트 빈 상태 렌더 검증(ST-11 완료 조건 "빈 상태 렌더"). 프로젝트 관례대로
// jest-dom 매처 없이 render()의 container를 직접 querying한다.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import DeltaTable from "../DeltaTable";
import NoteNavigator from "../NoteNavigator";
import CoverageBar from "../CoverageBar";
import CompareExplorer from "../CompareExplorer";

describe("DeltaTable — 빈 상태(rows=[])", () => {
  it("델타가 없다는 문구를 렌더하고 헤더는 그대로 보인다", () => {
    const { container } = render(
      <DeltaTable pair={null} rows={[]} highlightNoteId={null} sortKey="absDelta" sortDir="desc" onSort={() => {}} />
    );
    expect(container.textContent).toContain("표시할 델타가 없습니다");
    expect(container.querySelectorAll("th")).toHaveLength(10);
  });
});

describe("NoteNavigator — 빈 상태(notes=[])", () => {
  it("검색 결과 없음 문구를 렌더한다", () => {
    const { container } = render(
      <NoteNavigator
        notes={[]}
        rows={[]}
        activeSection="champion"
        onSectionChange={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
        selectedNoteId={null}
        onSelect={() => {}}
      />
    );
    expect(container.textContent).toContain("검색 결과가 없습니다");
    expect(container.textContent).toContain("챔피언 0");
  });
});

describe("CoverageBar — 전부 0", () => {
  it("0을 그대로 렌더한다", () => {
    const { container } = render(
      <CoverageBar stats={{ noteItemCount: 0, matchedCount: 0, unannouncedCount: 0, lowSampleCount: 0 }} />
    );
    expect(container.textContent).toContain("노트 0항목 중 관측 짝 0");
  });
});

describe("CompareExplorer — 데이터 없음(쌍 0개) 전체 통합 빈 상태", () => {
  it("크래시 없이 상태 필터·내비게이터·테이블·커버리지 바를 모두 렌더한다", () => {
    const { container } = render(
      <CompareExplorer
        pair={null}
        notes={[]}
        rows={[]}
        coverage={{ noteItemCount: 0, matchedCount: 0, unannouncedCount: 0, lowSampleCount: 0 }}
      />
    );
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(5);
    expect(container.textContent).toContain("표시할 델타가 없습니다");
    expect(container.textContent).toContain("노트 0항목");
  });
});
