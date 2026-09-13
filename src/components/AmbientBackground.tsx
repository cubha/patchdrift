// src/components/AmbientBackground.tsx
// 전역 앰비언트 배경 — layout.tsx에 단 한 번 렌더되는 sitewide 고정 레이어(src/styles/ambient.css).
// 확정 시안(아티팩트 "협곡 앰비언트 배경" v5)의 4개 레이어 중 이 프로젝트가 채택한 것만 구현한다:
//   LAYER 1(전역 배경·상단 앵커) — 모든 페이지 공통, 색 번짐+선명 플레이트+글로우+스크림+그레인.
//   LAYER 2(라인 카메라) — 홈(pathname === "/")에서만 useAmbient().selectedLane을 따라간다.
//   LAYER 3(인트로 리빌) — 사이트 최초 진입 1회, 홈에서만 재생(영상 실패해도 정지 이미지가
//     항상 그 아래 깔려 있어 배경이 비지 않는다).
//   LAYER 4(상세 스플래시) — /item/[id] 경로 + useAmbient().detailSplashUrl이 있을 때만.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { laneCameraTransform } from "@/lib/laneCamera";
import { useAmbient } from "./AmbientContext";

const INTRO_SEEN_KEY = "patchgap:ambient-intro-seen";

function useReducedMotion(): boolean {
  // 초기값은 lazy initializer로 즉시 계산(StreamColumnLayout.tsx와 동일 패턴) — 빌드
  // 타임(SSR)엔 window가 없어 항상 false, 클라이언트 첫 렌더는 matchMedia로 즉시 판단한다.
  // effect는 이후 변경(OS 설정 토글)만 구독한다.
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * 최초 진입 1회 재생 여부. SSR/최초 클라이언트 렌더는 항상 false(정지 상태)로 시작하고,
 * mount 이후 effect에서 localStorage를 확인해 갱신한다 — lazy initializer로 즉시 읽으면
 * 서버 렌더(항상 false)와 클라이언트 첫 렌더가 갈라져 hydration mismatch가 난다. 이 setState는
 * "마운트 후 브라우저 전용 값(localStorage)으로 한 번만 동기화"하는 CompareExplorer.tsx와
 * 동일한 외부 시스템 구독 케이스라 set-state-in-effect를 의도적으로 허용한다.
 */
function useIntroReveal(enabled: boolean): boolean {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.localStorage.getItem(INTRO_SEEN_KEY)) return;
      window.localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 매번 재생되는 정도는 허용 가능한 폴백.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaying(true);
  }, [enabled]);
  return playing;
}

export default function AmbientBackground() {
  const pathname = usePathname();
  const { detailSplashUrl } = useAmbient();
  const reducedMotion = useReducedMotion();

  const isHome = pathname === "/";
  const isItemDetail = pathname?.startsWith("/item/") ?? false;
  const showDetailSplash = isItemDetail && detailSplashUrl !== null;

  // 라인 카메라(2026-09-13·6차 연속, 사용자 결정) — 라인 필터 선택에 따라 배경이 확대·이동하던
  // 동작을 제거했다. 실사용 검증 후 "시점이동하는건 없는게 맞을거같다. 오히려 어지러워" —
  // 코드는 유지 초반 "우선 유지, 다시 검증해보고 판단" 상태였는데 이번에 그 검증이 끝났다.
  // laneCamera.ts는 이제 "전체" 프레이밍(고정값)만 반환한다.
  const { tx, ty, scale } = laneCameraTransform();

  const introPlaying = useIntroReveal(isHome && !reducedMotion);
  const [introEnded, setIntroEnded] = useState(false);

  // 마커(바론/드래곤 둥지)는 2026-09-12 /verify-impl 실측으로 **제거**했다.
  // 시안 v5에서 마커가 보였던 것은 그 데모의 리스트가 라인 필터로 짧아지면서 아래 지형이
  // 드러나는 레이아웃이었기 때문이다. 구현의 좌측 스트림은 2026-09-11 사용자 지시로 우측 컬럼
  // 높이에 맞춘 **고정 높이 + 내부 스크롤**(StreamColumnLayout)이라 필터를 걸어도 리스트가
  // 짧아지지 않는다 → 마커가 들어설 빈 지형이 구조적으로 생기지 않는다. 실측: 마커가 켜지는
  // 세 라인(탑·원딜·서포터) 전부에서 마커 중심점의 elementFromPoint가 스트림 카드였다(즉
  // opacity .95로 켜져 있으나 화면에는 한 번도 보이지 않음). 좌표를 옮기면 "바론 둥지"가
  // 바론 둥지가 아닌 곳을 가리키게 되고, z를 콘텐츠 위로 올리면 "배경은 콘텐츠 뒤"라는 이
  // 레이어의 전제가 깨진다. 어느 쪽도 택하지 않고 제거한다 —
  // **라인 카메라의 어포던스 자체는 마커 없이도 전달된다**: 라인 전환 시 상단 배너 밴드의
  // 픽셀이 22~28% 바뀌는 것을 실측했다(전체↔탑 22.8% / 전체↔원딜 27.2% / 탑↔원딜 28.2%).
  // 자산 public/bg/{baron,drake}.png는 되살릴 때를 위해 남겨둔다(합계 96KB).

  return (
    <div className="ambient-root" aria-hidden="true">
      <div
        className="ambient-wash"
        style={{ backgroundImage: "url(/bg/island-wash.jpg)" }}
      />

      {showDetailSplash ? (
        <div
          className="ambient-terrain-corner"
          style={{ backgroundImage: "url(/bg/island.webp)" }}
        />
      ) : (
        <div className="ambient-camera">
          <div
            className="ambient-cam-inner"
            style={
              {
                "--z": scale,
                "--tx": `${tx}%`,
                "--ty": `${ty}%`,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ambient-island" src="/bg/island.webp" alt="" />
          </div>
        </div>
      )}

      {showDetailSplash ? (
        <div className="ambient-duo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detailSplashUrl} alt="" />
          <div className="ambient-duo-tint" />
        </div>
      ) : null}

      {introPlaying && !introEnded ? (
        <div className="ambient-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bg/intro-still.jpg" alt="" />
          <video
            muted
            playsInline
            autoPlay
            preload="auto"
            src="/bg/intro.webm"
            onEnded={() => setIntroEnded(true)}
          />
        </div>
      ) : null}

      <div className="ambient-glow" />
      <div className="ambient-scrim" />
      <div className="ambient-grain" />
    </div>
  );
}
