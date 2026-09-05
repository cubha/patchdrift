import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import DiscordEmbedPreview from "../DiscordEmbedPreview";
import { buildDiscordPreview } from "../discordPreview";

describe("DiscordEmbedPreview", () => {
  it("예시 데이터(isExample)일 때 안내 문구와 예시 필드를 렌더한다", () => {
    const preview = buildDiscordPreview({ from: null, to: null, rows: null, nBefore: null, nAfter: null });
    const { container } = render(<DiscordEmbedPreview preview={preview} />);
    expect(container.textContent).toContain("예시 문구로 표시합니다");
    expect(container.textContent).toContain("트런들 픽률");
  });

  it("실 데이터가 있으면 안내 문구 없이 실제 필드를 렌더한다", () => {
    const preview = buildDiscordPreview({
      from: "26.16",
      to: "26.17",
      rows: [
        {
          id: "champion:Trundle:pickRate",
          entityType: "champion",
          entityKey: "Trundle",
          entityName: "트런들",
          metric: "pickRate",
          before: 0.021,
          after: 0.046,
          delta: 0.025,
          ci: [0.021, 0.029],
          n: { before: 10240, after: 10118 },
          q: 0.004,
          status: "unannounced",
          matchedNoteId: null,
          matchedNoteIds: [],
          causes: [],
          evidence: { matchIds: [], aggregatePath: "x", noteAnchor: null },
        },
      ],
      nBefore: 10240,
      nAfter: 10118,
    });
    const { container } = render(<DiscordEmbedPreview preview={preview} />);
    expect(container.textContent).not.toContain("예시 문구로 표시합니다");
    expect(container.textContent).toContain("트런들 픽률");
    expect(container.textContent).toContain("+2.5%p");
  });
});
