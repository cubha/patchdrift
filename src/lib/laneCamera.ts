// src/lib/laneCamera.ts
// 앰비언트 배경 카메라 — 협곡 확정 시안(아티팩트 "협곡 앰비언트 배경" v5, LAYER 2)의 "전체"
// 초점(fx=0.48, fy=0.42, z=1.0)을 고정 프레이밍으로 쓴다. AmbientBackground.tsx가 `--tx/--ty/--z`
// CSS 커스텀 프로퍼티로 그대로 꽂는다.
//
// 2026-09-13(6차 연속, 사용자 결정) — 라인 필터 선택에 따라 배경이 라인별 초점으로 확대·이동
// 하던 동작을 제거했다. 실사용 검증 후 "시점이동하는건 없는게 맞을거같다. 오히려 어지러워" —
// 세션 초반엔 "우선 유지, 다시 검증해보고 판단"이었는데 이번에 그 검증이 끝났다. 라인별 초점
// 표(TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY, fx/fy/z 실측값)는 전부 제거하고 "전체" 프레이밍만
// 고정값으로 남긴다 — 라인을 눌러도 배경은 움직이지 않는다.

export interface LaneCameraTransform {
  /** translateX 퍼센트 — cam-inner 자기 폭 기준(양수=오른쪽 이동). */
  tx: number;
  /** translateY 퍼센트 — cam-inner 자기 높이 기준(양수=아래 이동). */
  ty: number;
  /** scale 배율. */
  scale: number;
}

const BASE_CAMERA: LaneCameraTransform = { tx: 2, ty: 8, scale: 1.0 };

/** 고정 카메라 프레이밍("전체" 초점, fx=0.48/fy=0.42/z=1.0 그대로). */
export function laneCameraTransform(): LaneCameraTransform {
  return BASE_CAMERA;
}
