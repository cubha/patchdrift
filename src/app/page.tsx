// src/app/page.tsx
// 브리핑 홈 — 프로토타입 01(docs/design/prototype/01-briefing-home.html) 구현. F5/ST-11.
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).
// 데이터 로드는 이 서버 컴포넌트에서만 한다(src/lib/data.ts, 빌드 타임 fs) — 하위 home/*
// 컴포넌트는 전부 props만 받는 순수 렌더(상태 없음, 서버/클라이언트 경계 없음).

import type { DeltaRecord } from "@/pipeline/types";
import { loadDdragonSafe } from "@/pipeline/match/ddragon";
import Container from "@/components/Container";
import FilterBar from "@/components/FilterBar";
import HeroSummary from "@/components/home/HeroSummary";
import ReleaseNoteStream, { type ReleaseStreamEntry } from "@/components/home/ReleaseNoteStream";
import SideMatchAverages from "@/components/home/SideMatchAverages";
import DiscordPanel from "@/components/home/DiscordPanel";
import LaneGapPanel from "@/components/home/LaneGapPanel";
import { computeHeadline } from "@/components/home/logic";
import { computeLaneDistribution } from "@/components/home/laneDistribution";
import { buildReleaseStream } from "@/components/home/releaseStream";
import { resolveStreamEntityIcon } from "@/components/home/releaseStreamEntity";
import { heroSplashUrl, resolveHeroSplashEntityKey } from "@/components/home/heroSplash";
import { lanesForEntityKey } from "@/lib/lane";
import {
  getDefaultPair,
  listPatchPairs,
  loadDeltas,
  loadNotes,
  loadObjectives,
  loadSpellIcons,
  loadSummary,
} from "@/lib/data";

export default function Home() {
  const pair = getDefaultPair();
  const pairs = listPatchPairs();

  const deltas = pair ? loadDeltas(pair.from, pair.to) : null;
  const notesTo = pair ? loadNotes(pair.to) : null;
  const summaryTo = pair ? loadSummary(pair.to) : null;
  const summaryFrom = pair ? loadSummary(pair.from) : null;
  const objectivesTo = pair ? loadObjectives(pair.to) : null;
  const objectivesFrom = pair ? loadObjectives(pair.from) : null;
  const spellIcons = loadSpellIcons();
  const ddragon = loadDdragonSafe();

  const headline = computeHeadline(deltas, notesTo, deltas?.meta.qAlpha);

  const streamGroups = buildReleaseStream(notesTo, deltas);
  const streamEntries: ReleaseStreamEntry[] = streamGroups.map((group) => {
    const icon = resolveStreamEntityIcon(group, ddragon);
    const lanes = icon.entityKey ? lanesForEntityKey(deltas?.rows ?? [], icon.entityKey) : [];
    return { group, icon, lanes };
  });

  // note.id → 그 노트를 근거로 매칭된 델타. 스트림 카드가 뱃지(status)뿐 아니라 관측 수치
  // (.rn-obs)와 판정 문장(.verdict .m)까지 그리므로 status가 아니라 레코드 전체를 넘긴다.
  const noteDeltas: Record<string, DeltaRecord> = {};
  for (const row of deltas?.rows ?? []) {
    for (const noteId of row.matchedNoteIds) noteDeltas[noteId] = row;
  }

  const unannouncedRows = (deltas?.rows ?? []).filter((row) => row.status === "unannounced");
  const laneDistribution = computeLaneDistribution(unannouncedRows);

  const ambientSplashUrl = heroSplashUrl(resolveHeroSplashEntityKey(deltas?.rows ?? []));

  return (
    <div className="flex flex-1 flex-col bg-bg">
      <FilterBar
        pairs={pairs}
        currentPair={pair}
        nBefore={summaryFrom?.data.matches ?? null}
        nAfter={summaryTo?.data.matches ?? null}
        aggregatedAt={summaryTo?.meta.generatedAt ?? null}
      />
      <main className="flex-1">
        <Container className="flex flex-col gap-6 py-8">
          <HeroSummary stats={headline} ambientSplashUrl={ambientSplashUrl} />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-6">
              <ReleaseNoteStream
                entries={streamEntries}
                spellIcons={spellIcons?.icons ?? null}
                noteDeltas={noteDeltas}
                patch={pair?.to ?? null}
                qAlpha={deltas?.meta.qAlpha}
              />
            </div>
            <div className="flex flex-col gap-6">
              <SideMatchAverages
                summaryTo={summaryTo?.data ?? null}
                summaryFrom={summaryFrom?.data ?? null}
                objectivesTo={objectivesTo?.data ?? null}
                objectivesFrom={objectivesFrom?.data ?? null}
              />
              <LaneGapPanel rows={laneDistribution} />
              <DiscordPanel generatedAt={deltas?.meta.generatedAt ?? null} />
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
