import { describe, it, expect } from "vitest";
import { patchWindow, PATCH_CALENDAR } from "../patch-calendar";

function epochSecOfKstMidnight(dateKst: string): number {
  return Math.floor((Date.parse(`${dateKst}T00:00:00Z`) - 9 * 60 * 60 * 1000) / 1000);
}

describe("patchWindow", () => {
  it("startTime은 해당 패치 라이브(KST 00:00), endTime은 다음 패치 라이브다", () => {
    const window = patchWindow("26.17");
    expect(window.startTime).toBe(epochSecOfKstMidnight(PATCH_CALENDAR["26.17"].liveKst));
    expect(window.endTime).toBe(epochSecOfKstMidnight(PATCH_CALENDAR["26.18"].liveKst));
  });

  it("다음 패치가 캘린더에 없으면 endTime은 now()다", () => {
    const nowMs = () => Date.parse("2026-09-30T12:00:00Z");
    const window = patchWindow("26.19", nowMs);
    expect(window.startTime).toBe(epochSecOfKstMidnight(PATCH_CALENDAR["26.19"].liveKst));
    expect(window.endTime).toBe(Math.floor(nowMs() / 1000));
  });

  it("캘린더에 없는 patch는 throw한다(무근거 시간창을 만들지 않는다)", () => {
    expect(() => patchWindow("99.99")).toThrow(/unknown patch/);
  });
});
