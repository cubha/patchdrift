// src/lib/__tests__/laneCamera.test.ts
// laneCameraTransform(laneCamera.ts) 단위 테스트 — 2026-09-13(6차 연속) 라인별 카메라 이동
// 제거 후 항상 고정된 "전체" 프레이밍을 반환하는지만 검증한다(이전엔 라인별 초점 표를
// 검증했으나 그 표 자체가 삭제됐다 — 사용자 결정 근거는 laneCamera.ts 주석 참고).

import { describe, expect, it } from "vitest";
import { laneCameraTransform } from "../laneCamera";

describe("laneCameraTransform", () => {
  it("항상 고정된 전체 프레이밍(이동 없음, scale 1.0)을 반환한다", () => {
    expect(laneCameraTransform()).toEqual({ tx: 2, ty: 8, scale: 1.0 });
  });

  it("호출할 때마다 동일한 값(라인 선택과 무관)", () => {
    expect(laneCameraTransform()).toEqual(laneCameraTransform());
  });
});
