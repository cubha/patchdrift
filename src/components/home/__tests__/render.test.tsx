// src/components/home/__tests__/render.test.tsx
// 브리핑 홈 컴포넌트 빈 상태 렌더 검증(ST-11 완료 조건 "빈 상태 렌더"). 프로젝트 관례대로
// jest-dom 매처 없이 render()의 container를 직접 querying한다(src/__tests__/components.test.tsx
// 참고 — setupFiles는 RTL cleanup 등록에만 쓰고 매처는 붙이지 않는다, vitest.setup.ts).
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import HeroSummary from "../HeroSummary";
import UnannouncedList from "../UnannouncedList";
import NotePreviewList from "../NotePreviewList";
import SideMatchAverages from "../SideMatchAverages";
import DiscordPanel from "../DiscordPanel";

describe("HeroSummary — 빈 상태(모든 수치 0)", () => {
  it("0을 그대로 렌더하고 크래시하지 않는다", () => {
    const { container } = render(
      <HeroSummary stats={{ noteItemCount: 0, statCount: 0, unannouncedCount: 0 }} />
    );
    expect(container.textContent).toContain("0개 엔티티");
    expect(container.textContent).toContain("0개");
  });
});

describe("UnannouncedList — 빈 상태", () => {
  it("행이 없으면 지정된 빈 상태 문구를 렌더한다", () => {
    const { container } = render(<UnannouncedList rows={[]} />);
    expect(container.textContent).toContain(
      "이 패치 쌍에서는 통계 게이트를 통과한 미공지 변화가 없습니다"
    );
  });
});

describe("NotePreviewList — 빈 상태", () => {
  it("행이 없으면 빈 상태 문구를 렌더한다", () => {
    const { container } = render(<NotePreviewList rows={[]} notesById={{}} />);
    expect(container.textContent).toContain("패치노트와 짝지어진 관측 항목이 아직 없습니다");
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
