// src/components/home/__tests__/render.test.tsx
// 브리핑 홈 컴포넌트 빈 상태 렌더 검증(ST-11 완료 조건 "빈 상태 렌더"). 프로젝트 관례대로
// jest-dom 매처 없이 render()의 container를 직접 querying한다(src/__tests__/components.test.tsx
// 참고 — setupFiles는 RTL cleanup 등록에만 쓰고 매처는 붙이지 않는다, vitest.setup.ts).
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import HeroSummary from "../HeroSummary";
import HeroAmbient from "../HeroAmbient";
import LaneGapPanel from "../LaneGapPanel";
import ReleaseNoteStream from "../ReleaseNoteStream";
import SideMatchAverages from "../SideMatchAverages";
import DiscordPanel from "../DiscordPanel";

describe("HeroSummary — 빈 상태(모든 수치 0)", () => {
  it("0을 그대로 렌더하고 크래시하지 않는다", () => {
    const { container } = render(
      <HeroSummary stats={{ noteEntityCount: 0, noteItemCount: 0, statCount: 0, unannouncedCount: 0 }} />
    );
    expect(container.textContent).toContain("0 엔티티 / 0 항목");
    expect(container.textContent).toContain("0개");
  });
});

describe("ReleaseNoteStream — 빈 상태", () => {
  it("그룹이 없으면 라인 필터만 남기고 빈 상태 문구를 렌더한다", () => {
    const { container } = render(
      <ReleaseNoteStream entries={[]} spellIcons={null} noteDeltas={{}} patch={null} />
    );
    expect(container.textContent).toContain("이 라인에서는 관측된 변화가 없습니다");
    // 라인 필터 6종(전체/탑/정글/미드/원딜/서포터)은 데이터가 없어도 항상 렌더된다.
    expect(container.querySelectorAll('button[role="button"], button').length).toBeGreaterThanOrEqual(6);
  });
});

describe("SideMatchAverages — 데이터 없음(전부 null)", () => {
  it("크래시 없이 대시(—)로 렌더한다", () => {
    const { container } = render(
      <SideMatchAverages summaryTo={null} summaryFrom={null} objectivesTo={null} objectivesFrom={null} />
    );
    expect(container.textContent).toContain("경기 시간");
    expect(container.querySelectorAll("span").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("—");
  });
});

describe("DiscordPanel — generatedAt 없음", () => {
  it("마지막 전송 캡션을 생략한다", () => {
    const { container } = render(<DiscordPanel generatedAt={null} />);
    expect(container.textContent).not.toContain("마지막 전송");
    expect(container.textContent).toContain("디스코드로 브리핑 보내기");
  });

  it("generatedAt이 있으면 KST로 포맷한 캡션을 렌더한다", () => {
    const { container } = render(<DiscordPanel generatedAt="2026-09-05T05:00:00.000Z" />);
    expect(container.textContent).toContain("마지막 전송 2026-09-05 14:00 KST");
  });
});

describe("HeroAmbient — 장식 배경", () => {
  it("splashUrl 없이도 크래시 없이 그라디언트 워시만 렌더한다(무근거 아이콘/아트 금지)", () => {
    const { container } = render(<HeroAmbient />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("splashUrl이 있으면 img를 추가로 렌더한다", () => {
    const { container } = render(<HeroAmbient splashUrl="/dd/splash/Chogath_0.jpg" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/dd/splash/Chogath_0.jpg");
  });
});

describe("LaneGapPanel — 빈 상태", () => {
  it("전부 0이면 빈 상태 문구를 렌더한다", () => {
    const rows = (["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", "all"] as const).map((lane) => ({
      lane,
      label: lane === "all" ? "전체" : lane,
      count: 0,
    }));
    const { container } = render(<LaneGapPanel rows={rows} />);
    expect(container.textContent).toContain("라인별로 집계할 미공지 변화가 없습니다");
  });

  it("count가 있으면 라인별 글리프+수치를 렌더한다", () => {
    const { container } = render(
      <LaneGapPanel rows={[{ lane: "TOP", label: "탑", count: 22 }, { lane: "all", label: "전체", count: 0 }]} />
    );
    expect(container.textContent).toContain("탑");
    expect(container.textContent).toContain("22");
    // 라벨("탑")이 글리프 바로 옆에 있어 labelled(장식) 처리 — <title> 중복 낭독 방지.
    const glyph = container.querySelector("svg");
    expect(glyph).not.toBeNull();
    expect(glyph?.getAttribute("aria-hidden")).toBe("true");
  });
});
