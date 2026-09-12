// src/lib/__tests__/laneCamera.test.ts
// laneCameraTransform(laneCamera.ts) 단위 테스트 — 확정 시안(아티팩트 "협곡 앰비언트 배경" v5,
// LAYER 2)의 실측 초점(fx/fy)·줌(z) 표를 tx/ty/scale로 정확히 변환하는지 검증한다.

import { describe, expect, it } from "vitest";
import { laneCameraTransform } from "../laneCamera";

describe("laneCameraTransform", () => {
  it("all: 전체 라인은 이동 없이 scale 1.0", () => {
    expect(laneCameraTransform("all")).toEqual({ tx: 2, ty: 8, scale: 1.0 });
  });

  it("TOP: 시안 실측값(fx=.44,fy=.255,z=1.55) 그대로 변환", () => {
    expect(laneCameraTransform("TOP")).toEqual({ tx: 6, ty: 24.5, scale: 1.55 });
  });

  it("BOTTOM/UTILITY: 같은 봇 라인이지만 서로 다른 프레이밍(줌·초점 다름)", () => {
    const bottom = laneCameraTransform("BOTTOM");
    const utility = laneCameraTransform("UTILITY");
    expect(bottom).toEqual({ tx: -1.5, ty: -7.5, scale: 1.55 });
    expect(utility).toEqual({ tx: -10, ty: -1.5, scale: 1.66 });
    expect(bottom).not.toEqual(utility);
  });

  it("JUNGLE·MIDDLE: 시안 실측값 그대로", () => {
    expect(laneCameraTransform("JUNGLE")).toEqual({ tx: 9, ty: 10.5, scale: 1.62 });
    expect(laneCameraTransform("MIDDLE")).toEqual({ tx: 1.5, ty: 8, scale: 1.66 });
  });
});
