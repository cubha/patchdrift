// src/components/home/ReleaseNoteStream.tsx
// 릴리즈노트 스트림 — 홈 좌측 메인 콘텐츠(리스트 패널 본문만). "use client" 경계는 라인 필터
// 선택 상태 하나만 소비한다(src/lib/data.ts가 "server-only"라 필터 상태를 page.tsx/서버
// 컴포넌트에 두면 안 된다 — CompareExplorer.tsx와 동일한 서버-로드/클라이언트-필터 분리 패턴).
// 데이터(그룹·아이콘·라인·스펠아이콘·노트상태)는 전부 page.tsx가 빌드 타임에 준비해 props로
// 내려준다 — 이 컴포넌트 자체는 fs를 읽지 않는다.
//
// 선택 라인 상태는 2026-09-12부터 로컬 useState가 아니라 AmbientContext(useAmbient)가 소유한다
// — 같은 값을 layout.tsx의 전역 배경(AmbientBackground)이 라인 카메라 이동에 그대로 쓴다
// (advisor 검토: 배경을 두 번 렌더해 상태를 동기화하는 대신 소유권을 한 곳에 둔다).
//
// 2026-09-12(4차, R2): 라인 필터 뱃지 행은 StreamLaneFilter.tsx로 분리됐다 — 이 컴포넌트는
// 이제 리스트 패널 본문만 그린다(StreamColumnLayout의 그리드 row2). 필터-리스트 상단 정렬
// 결함의 원인이 이 컴포넌트가 필터와 패널을 한 flex 컬럼에 같이 갖고 있던 것이었다.
//
// 2026-09-12(5차, R6 — 사용자 재지적): 히어로 스탯·매치평균만 유리화하고 이 패널(홈에서 가장
// 눈에 띄는 좌측 메인 패널)을 불투명으로 남겨뒀더니 "왜 여기만 다르냐"는 지적을 받았다 —
// bg-visibility-proposal.html의 "옵션 B"(카메라 밴드 안 패널만 유리화)는 사용자가 실제 배치
// 화면을 보기 전 판단이었고, 실물을 보니 인접 패널 간 이질감이 진단보다 훨씬 크게 느껴진다는
// 것. 그래서 카메라 밴드 여부와 무관하게 홈의 모든 `.panel-surface`를 유리화하는 쪽으로
// 방향을 바꿨다(LaneGapPanel.tsx·DiscordPanel.tsx도 동일 라운드에 함께 수정 — 전부 같은
// 커밋 단위로 취급). 상세 근거·트레이드오프는 PLAN-deployed-ui-fix-2026-09-12.md R6 절 참고.
"use client";

import { useMemo } from "react";
import type { DeltaRecord, LanePosition } from "@/pipeline/types";
import { useAmbient } from "@/components/AmbientContext";
import { panelSurfaceClass } from "@/lib/panelSurface";
import ReleaseNoteRow from "./ReleaseNoteRow";
import type { ReleaseStreamGroup } from "./releaseStream";
import type { StreamEntityIcon } from "./releaseStreamEntity";

export interface ReleaseStreamEntry {
  group: ReleaseStreamGroup;
  icon: StreamEntityIcon;
  /** 이 엔티티의 position-scope 델타에서 도출한 라인 집합. 빈 배열이면 "전체" 필터에서만
   * 노출된다(라인을 추측하지 않음 — src/lib/lane.ts의 lanesForEntityKey 계약). */
  lanes: LanePosition[];
}

export interface ReleaseNoteStreamProps {
  entries: ReleaseStreamEntry[];
  spellIcons: Record<string, string> | null;
  /** note.id → 짝지어진 델타(page.tsx가 matchedNoteIds 역색인으로 구성). */
  noteDeltas: Record<string, DeltaRecord>;
  patch: string | null;
  /** deltas.meta.qAlpha — 판정 문장(streamVerdict)의 유의 임계. */
  qAlpha?: number;
}

function groupKey(group: ReleaseStreamGroup): string {
  return `${group.kind}:${group.entity}`;
}

export default function ReleaseNoteStream({ entries, spellIcons, noteDeltas, patch, qAlpha }: ReleaseNoteStreamProps) {
  const { selectedLane } = useAmbient();

  const filtered = useMemo(() => {
    if (selectedLane === "all") return entries;
    return entries.filter((entry) => entry.lanes.includes(selectedLane));
  }, [entries, selectedLane]);

  if (filtered.length === 0) {
    // 고정 높이 셀(StreamColumnLayout row2) 안에서 문구가 위에 붙지 않도록 중앙 배치한다.
    return (
      <div className={`${panelSurfaceClass("glass")} flex h-full min-h-0 flex-1 items-center justify-center rounded-lg`}>
        <p className="p-5 text-sm text-muted">이 라인에서는 관측된 변화가 없습니다</p>
      </div>
    );
  }

  // panel-surface(2026-09-12·3차)의 background는 border box 기준 고정(기본
  // background-attachment:scroll)이라 이 <ul> 자체가 스크롤 컨테이너여도 레일·채움이
  // 콘텐츠와 함께 스크롤해 사라지지 않는다 — 대신 채움이 스크롤 전체 높이가 아니라 보이는
  // 프레임 높이에 맞춰져 프레임 vignette처럼 읽힌다(의도된 부수효과, panel.css 주석 참고).
  return (
    <ul className={`${panelSurfaceClass("glass")} min-h-0 flex-1 overflow-y-auto rounded-lg`}>
      {filtered.map((entry) => (
        <ReleaseNoteRow
          key={groupKey(entry.group)}
          group={entry.group}
          icon={entry.icon}
          spellIcons={spellIcons}
          noteDeltas={noteDeltas}
          patch={patch}
          qAlpha={qAlpha}
        />
      ))}
    </ul>
  );
}
