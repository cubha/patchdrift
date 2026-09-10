// src/components/home/ReleaseNoteStream.tsx
// 릴리즈노트 스트림 — 홈 좌측 메인 콘텐츠. "use client" 경계는 라인 필터 선택 상태 하나만
// 소유한다(src/lib/data.ts가 "server-only"라 필터 상태를 page.tsx/서버 컴포넌트에 두면 안
// 된다 — CompareExplorer.tsx와 동일한 서버-로드/클라이언트-필터 분리 패턴).
// 데이터(그룹·아이콘·라인·스펠아이콘·노트상태)는 전부 page.tsx가 빌드 타임에 준비해 props로
// 내려준다 — 이 컴포넌트 자체는 fs를 읽지 않는다.
"use client";

import { useMemo, useState } from "react";
import type { DeltaRecord, LanePosition } from "@/pipeline/types";
import type { LaneAxis } from "@/lib/lane";
import LaneFilter from "./LaneFilter";
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
  const [selectedLane, setSelectedLane] = useState<LaneAxis>("all");

  const filtered = useMemo(() => {
    if (selectedLane === "all") return entries;
    return entries.filter((entry) => entry.lanes.includes(selectedLane));
  }, [entries, selectedLane]);

  return (
    <div className="flex flex-col gap-4">
      <LaneFilter selected={selectedLane} onSelect={setSelectedLane} />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
          이 라인에서는 관측된 변화가 없습니다
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface" style={{ boxShadow: "var(--elev-ring)" }}>
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
