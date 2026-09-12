// src/components/home/ReleaseNoteStream.tsx
// 릴리즈노트 스트림 — 홈 좌측 메인 콘텐츠. "use client" 경계는 라인 필터 선택 상태 하나만
// 소유한다(src/lib/data.ts가 "server-only"라 필터 상태를 page.tsx/서버 컴포넌트에 두면 안
// 된다 — CompareExplorer.tsx와 동일한 서버-로드/클라이언트-필터 분리 패턴).
// 데이터(그룹·아이콘·라인·스펠아이콘·노트상태)는 전부 page.tsx가 빌드 타임에 준비해 props로
// 내려준다 — 이 컴포넌트 자체는 fs를 읽지 않는다.
//
// 선택 라인 상태는 2026-09-12부터 로컬 useState가 아니라 AmbientContext(useAmbient)가 소유한다
// — 같은 값을 layout.tsx의 전역 배경(AmbientBackground)이 라인 카메라 이동에 그대로 쓴다
// (advisor 검토: 배경을 두 번 렌더해 상태를 동기화하는 대신 소유권을 한 곳에 둔다).
"use client";

import { useMemo } from "react";
import type { DeltaRecord, LanePosition } from "@/pipeline/types";
import LaneFilter from "@/components/LaneFilter";
import { useAmbient } from "@/components/AmbientContext";
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
  const { selectedLane, setSelectedLane } = useAmbient();

  const filtered = useMemo(() => {
    if (selectedLane === "all") return entries;
    return entries.filter((entry) => entry.lanes.includes(selectedLane));
  }, [entries, selectedLane]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <LaneFilter selected={selectedLane} onSelect={setSelectedLane} />
      {filtered.length === 0 ? (
        <p className="panel-surface rounded-lg p-5 text-sm text-muted">
          이 라인에서는 관측된 변화가 없습니다
        </p>
      ) : (
        // panel-surface(2026-09-12·3차)의 background는 border box 기준 고정(기본
        // background-attachment:scroll)이라 이 <ul> 자체가 스크롤 컨테이너여도 레일·채움이
        // 콘텐츠와 함께 스크롤해 사라지지 않는다 — 대신 채움이 스크롤 전체 높이가 아니라 보이는
        // 프레임 높이에 맞춰져 프레임 vignette처럼 읽힌다(의도된 부수효과, panel.css 주석 참고).
        <ul className="panel-surface min-h-0 flex-1 overflow-y-auto rounded-lg">
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
      )}
    </div>
  );
}
