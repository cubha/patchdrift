// src/app/methodology/page.tsx
// 방법론/About(ST-12) — 파이프라인 4단·상태 정의·통계 게이트(id="gates")·디스코드 미리보기
// (id="discord")·라이엇 고지(UX-BRIEF §3 "04 방법론/About",
// 프로토타입 `docs/design/prototype/04-methodology.html`).
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).
//
// 편차: 프로토타입 04는 id="gates"를 "데이터 파이프라인" 패널(가장 위)에 붙였지만, ST-12 지시
// 원문은 "③ 통계 게이트 카드 ... id="gates""로 명시한다 — "판정 규칙 보기 →"(항목 상세)가
// 실제로 원하는 앵커는 게이트 설명 쪽이 자연스러워 프로토타입의 배치를 오타/템플릿 잔재로 보고
// 지시 원문을 따랐다(ST-12.md 기록).

import fs from "node:fs";
import path from "node:path";
import Container from "@/components/Container";
import SectionCard from "@/components/SectionCard";
import { getDefaultPair, loadDeltas, loadNotes, loadSummary } from "@/lib/data";
import { fmtKst } from "@/lib/format";
import { FDR_ALPHA, WIN_RATE_MIN_N } from "@/pipeline/aggregate/stats";
import { countRelevantNoteEntities } from "@/pipeline/shared/notes-count";
import DiscordEmbedPreview from "@/components/methodology/DiscordEmbedPreview";
import GateGrid from "@/components/methodology/GateGrid";
import PipelineDiagram from "@/components/methodology/PipelineDiagram";
import StatusDefinitionTable from "@/components/methodology/StatusDefinitionTable";
import { buildDiscordPreview } from "@/components/methodology/discordPreview";
import { buildPipelineSteps } from "@/components/methodology/pipelineSteps";

/** data/ddragon/{version}/ 디렉토리 이름(내림차순 최신)에서 Data Dragon 버전을 읽는다.
 * data.ts 미소유라 같은 "로컬 레이아웃 재구현" 관례(ST-06/ST-10 선례)를 따른다. 디렉토리가
 * 없으면(빈 빌드) null. */
function latestDdragonVersion(dataRoot: string = path.resolve(process.cwd(), "data")): string | null {
  const dir = path.join(dataRoot, "ddragon");
  if (!fs.existsSync(dir)) return null;
  const versions = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (versions.length === 0) return null;
  versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return versions[0];
}

export default function MethodologyPage() {
  const pair = getDefaultPair();

  const summaryFrom = pair ? loadSummary(pair.from) : null;
  const summaryTo = pair ? loadSummary(pair.to) : null;
  const notes = pair ? loadNotes(pair.to) : null;
  const deltas = pair ? loadDeltas(pair.from, pair.to) : null;
  const ddragonVersion = latestDdragonVersion();

  const significantCount = deltas
    ? deltas.rows.filter((row) => row.q !== null && row.q < FDR_ALPHA).length
    : null;

  const steps = buildPipelineSteps({
    from: pair?.from ?? null,
    to: pair?.to ?? null,
    matchesFrom: summaryFrom?.data.matches ?? null,
    matchesTo: summaryTo?.data.matches ?? null,
    collectedAt: summaryTo?.meta.generatedAt ?? null,
    // 코디네이터 정정(2026-09-05): 홈 헤드라인("패치노트는 N개 엔티티를 말했고")과 동일 기준
    // (champion/item 섹션 고유 엔티티 수)으로 세야 두 화면의 숫자가 일치한다 — 원문 항목 수
    // (`meta.itemCount`)는 참고용으로만 병기한다.
    noteEntityCount: notes ? countRelevantNoteEntities(notes.items) : null,
    noteItemCount: notes?.meta.itemCount ?? null,
    notesFetchedAt: notes?.meta.fetchedAt ?? null,
    matchedAt: deltas?.meta.generatedAt ?? null,
    significantCount,
    judgedAt: deltas?.meta.generatedAt ?? null,
  });

  const discordPreview = buildDiscordPreview({
    from: pair?.from ?? null,
    to: pair?.to ?? null,
    rows: deltas?.rows ?? null,
    nBefore: summaryFrom?.data.matches ?? null,
    nAfter: summaryTo?.data.matches ?? null,
  });

  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main>
        <Container className="flex flex-col gap-6 py-8">
          <SectionCard eyebrow="우선 1 · 신뢰" title="데이터 파이프라인">
            <PipelineDiagram steps={steps} />
          </SectionCard>

          <SectionCard eyebrow="우선 1 · 해석" title="상태 정의">
            <StatusDefinitionTable minN={WIN_RATE_MIN_N} alpha={FDR_ALPHA} />
          </SectionCard>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-6">
              <div id="gates">
                <SectionCard eyebrow="우선 2 · 투명성" title="통계 게이트">
                  <GateGrid minN={WIN_RATE_MIN_N} alpha={FDR_ALPHA} />
                </SectionCard>
              </div>

              <div id="discord">
                <SectionCard title="디스코드 미리보기">
                  <DiscordEmbedPreview preview={discordPreview} />
                </SectionCard>
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              <SectionCard title="고지">
                <div className="flex flex-col gap-3 p-5">
                  <p className="text-xs leading-relaxed text-muted">
                    patchgap isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views
                    or opinions of Riot Games or anyone officially involved in producing or
                    managing Riot Games properties. Riot Games, and all associated properties are
                    trademarks or registered trademarks of Riot Games, Inc.
                  </p>
                  <p className="text-xs text-muted">
                    데이터 출처: Riot Games Match-V5 · Timeline API
                    {ddragonVersion ? `, Data Dragon ${ddragonVersion}` : ""}, KR 서버, Master+
                    티어
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-2 w-2 rounded-pill bg-success" aria-hidden="true" />
                    정상 운영 · 빌드 {fmtKst(new Date().toISOString())}
                  </div>
                </div>
              </SectionCard>
            </aside>
          </div>
        </Container>
      </main>
    </div>
  );
}
