// src/lib/laneCamera.ts
// 라인 카메라 — 아이소메트릭 섬 배경 위에서 선택된 라인으로 확대 이동하기 위한 순수 좌표 변환.
// 초점(fx/fy)·줌(z)은 확정 시안(아티팩트 "협곡 앰비언트 배경" v5, LAYER 2 · 라인 카메라)이
// 1280×720 렌더 위에서 실측한 값을 그대로 승계한다 — 임의 조정 금지, 재실측이 필요하면 시안을
// 먼저 갱신한다. AmbientBackground.tsx가 `--tx/--ty/--z` CSS 커스텀 프로퍼티로 그대로 꽂는다.

import type { LaneAxis } from "./lane";

export interface LaneCameraTransform {
  /** translateX 퍼센트 — cam-inner 자기 폭 기준(양수=오른쪽 이동). */
  tx: number;
  /** translateY 퍼센트 — cam-inner 자기 높이 기준(양수=아래 이동). */
  ty: number;
  /** scale 배율. */
  scale: number;
}

interface FocalPoint {
  fx: number;
  fy: number;
  z: number;
}

const FOCAL_POINTS: Record<LaneAxis, FocalPoint> = {
  all: { fx: 0.48, fy: 0.42, z: 1.0 },
  TOP: { fx: 0.44, fy: 0.255, z: 1.55 },
  JUNGLE: { fx: 0.41, fy: 0.395, z: 1.62 },
  MIDDLE: { fx: 0.485, fy: 0.42, z: 1.66 },
  BOTTOM: { fx: 0.515, fy: 0.575, z: 1.55 },
  UTILITY: { fx: 0.6, fy: 0.515, z: 1.66 },
};

/** 라인 축 → 카메라 변환(tx/ty/scale). 소수점 둘째 자리까지 반올림(시안의 `.toFixed(2)`와 동일). */
export function laneCameraTransform(lane: LaneAxis): LaneCameraTransform {
  const { fx, fy, z } = FOCAL_POINTS[lane];
  return {
    tx: Math.round((0.5 - fx) * 100 * 100) / 100,
    ty: Math.round((0.5 - fy) * 100 * 100) / 100,
    scale: z,
  };
}
