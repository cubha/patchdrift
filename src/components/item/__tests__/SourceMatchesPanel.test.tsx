// SourceMatchesPanel 렌더 검증 — 칩이 whitespace-nowrap(ID 내부에서 줄바꿈되지 않음) +
// font-mono tabular-nums로 렌더되는지, 빈 매치 목록일 때 안내 문구를 보여주는지 확인한다.
// 코디네이터 지적(2026-09-05): 기존 고정 열 grid + whitespace-normal break-all 조합이 매치 ID
// 문자열 중간을 줄바꿈시키는 렌더 결함을 냈다 — flex flex-wrap + whitespace-nowrap으로 수정.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SourceMatchesPanel from "../SourceMatchesPanel";

describe("SourceMatchesPanel", () => {
  it("매치 ID 칩은 whitespace-nowrap + font-mono tabular-nums 클래스를 갖는다(ID 내부 줄바꿈 방지)", () => {
    const { container } = render(
      <SourceMatchesPanel
        matchIds={["KR_8358806122", "KR_8357570754"]}
        aggregatePath="data/aggregated/26.17/champions.json#rows[championId=246,scope=all]"
        snapshotHash="3f9ac6d0abcd"
      />
    );
    const chips = container.querySelectorAll("span");
    const idChips = Array.from(chips).filter((el) => el.textContent?.startsWith("KR_"));
    expect(idChips).toHaveLength(2);
    for (const chip of idChips) {
      expect(chip.className).toContain("whitespace-nowrap");
      expect(chip.className).toContain("font-mono");
      expect(chip.className).toContain("tabular-nums");
      expect(chip.className).not.toContain("break-all");
    }
    // 컨테이너는 고정 열 grid가 아니라 flex flex-wrap이어야 칩 단위로만 줄바꿈된다.
    const wrapper = idChips[0].parentElement;
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).toContain("flex-wrap");
    expect(wrapper?.className).not.toContain("grid");
  });

  it("매치 ID가 통째로(중간이 끊기지 않고) 텍스트로 존재한다", () => {
    const { container } = render(
      <SourceMatchesPanel
        matchIds={["KR_8358806122"]}
        aggregatePath="x"
        snapshotHash="abc123def456"
      />
    );
    expect(container.textContent).toContain("KR_8358806122");
  });

  it("매치 ID가 없으면 안내 문구를 렌더한다", () => {
    const { container } = render(
      <SourceMatchesPanel matchIds={[]} aggregatePath="x" snapshotHash="abc123def456" />
    );
    expect(container.textContent).toContain("원천 매치 표본 없음");
  });

  it("집계 경로·스냅샷 해시를 표시한다", () => {
    const { container } = render(
      <SourceMatchesPanel matchIds={[]} aggregatePath="data/x.json#rows[id=1]" snapshotHash="3f9ac6d0abcd" />
    );
    expect(container.textContent).toContain("data/x.json#rows[id=1]");
    expect(container.textContent).toContain("3f9ac6d0abcd");
  });
});
