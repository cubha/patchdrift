// src/app/page.tsx
// 브리핑 홈 — 프로토타입 01(docs/design/prototype/01-briefing-home.html) 구현. F5/ST-11.
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).
// 데이터 로드는 이 서버 컴포넌트에서만 한다(src/lib/data.ts, 빌드 타임 fs) — 하위 home/*
// 컴포넌트는 전부 props만 받는 순수 렌더(상태 없음, 서버/클라이언트 경계 없음).

import Container from "@/components/Container";
import FilterBar from "@/components/FilterBar";
import HeroSummary from "@/components/home/HeroSummary";
import UnannouncedList from "@/components/home/UnannouncedList";
import NotePreviewList from "@/components/home/NotePreviewList";
import SideMatchAverages from "@/components/home/SideMatchAverages";
import DiscordPanel from "@/components/home/DiscordPanel";
import {
  computeHeadline,
  indexNotesById,
  selectAnnouncedPreview,
  selectTopUnannounced,
} from "@/components/home/logic";
import {
  getDefaultPair,
  listPatchPairs,
  loadDeltas,
  loadNotes,
  loadObjectives,
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

  const headline = computeHeadline(deltas, notesTo);
  const unannouncedRows = selectTopUnannounced(deltas, 5);
  const announcedRows = selectAnnouncedPreview(deltas, 5);
  const notesById = indexNotesById(notesTo);

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
          <HeroSummary stats={headline} />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-6">
              <UnannouncedList rows={unannouncedRows} />
              <NotePreviewList rows={announcedRows} notesById={notesById} />
            </div>
            <div className="flex flex-col gap-6">
              <SideMatchAverages
                summaryTo={summaryTo?.data ?? null}
                summaryFrom={summaryFrom?.data ?? null}
                objectivesTo={objectivesTo?.data ?? null}
                objectivesFrom={objectivesFrom?.data ?? null}
              />
              <DiscordPanel generatedAt={deltas?.meta.generatedAt ?? null} />
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
