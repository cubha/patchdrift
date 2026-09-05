// scripts/run-match.ts
// F3~F4 파이프라인 진입점 — dotenv 로드 후 패치노트 로드(없으면 fetch+parse) → ddragon 로드 →
// 델타 계산(ST-08) → 1단 결정론 매칭(ST-08) → 판정(ST-08) → 2단 LLM 간접 추론(ST-09, --no-llm 시
// 스킵) → deltas/{from}_{to}.json 기록 → 콘솔 요약.
// 실행: npm run pipeline:match -- --from 26.16 --to 26.17 [--llm-max 50] [--no-llm] [--dry-run]

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fetchPatchNotesHtml, parsePatchNotes } from "../src/pipeline/match/patchnotes-parser";
import { notesFile } from "../src/pipeline/shared/paths";
import { loadDdragon } from "../src/pipeline/match/ddragon";
import { buildDeltas, loadAggregatedPatch, type AggregatedPatch } from "../src/pipeline/match/delta";
import type { DdragonData } from "../src/pipeline/match/ddragon";
import { matchDeterministic } from "../src/pipeline/match/entity-match";
import { applyVerdicts, indexNotesById, sortDeltas, writeDeltas } from "../src/pipeline/match/verdict";
import { inferIndirectCandidates, type LlmMatchOptions, type LlmRunSummary } from "../src/pipeline/match/llm-match";
import type { DeltaRecord, MatchStatus, PatchId, PatchNoteItem, PatchNoteSection } from "../src/pipeline/types";
import { isMainModule, parseCliArgs } from "./shared/cli";

export interface RunMatchArgs {
  from: PatchId;
  to: PatchId;
  llmMax: number;
  noLlm: boolean;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): RunMatchArgs {
  const raw = parseCliArgs("run-match", argv, [
    { name: "from", type: "string", required: true },
    { name: "to", type: "string", required: true },
    { name: "llmMax", type: "number", default: 50 },
    { name: "noLlm", type: "boolean", default: false },
    { name: "dryRun", type: "boolean", default: false },
  ]);

  const llmMax = raw.llmMax as number;
  if (llmMax < 0) {
    throw new Error(`run-match: --llm-max 값이 올바르지 않습니다: ${String(llmMax)}`);
  }

  return {
    from: raw.from as string,
    to: raw.to as string,
    llmMax,
    noLlm: raw.noLlm as boolean,
    dryRun: raw.dryRun as boolean,
  };
}

/** notes/{patch}.json이 있으면 그대로 로드, 없으면 fetch+parse 후 저장(run-fetch-notes.ts와 동일 스키마). */
export async function loadOrFetchNotes(patch: PatchId): Promise<PatchNoteItem[]> {
  const file = notesFile(patch);
  if (fs.existsSync(file)) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { items: PatchNoteItem[] };
    return parsed.items;
  }

  console.log(`[run-match] notes/${patch}.json 없음 — 라이브 fetch 시도`);
  const fetched = await fetchPatchNotesHtml(patch);
  const result = parsePatchNotes(fetched.html, { patch, sourceUrl: fetched.sourceUrl });

  const bySection = new Map<PatchNoteSection, number>();
  for (const item of result.items) bySection.set(item.section, (bySection.get(item.section) ?? 0) + 1);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        meta: {
          patch,
          sourceUrl: fetched.sourceUrl,
          fetchedAt: new Date().toISOString(),
          itemCount: result.items.length,
        },
        summary: result.summary,
        sections: result.sections,
        items: result.items,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`[run-match] ${file} 저장 (${result.items.length}건)`);
  return result.items;
}

function countByStatus(deltas: readonly DeltaRecord[]): Partial<Record<MatchStatus, number>> {
  const counts: Partial<Record<MatchStatus, number>> = {};
  for (const d of deltas) counts[d.status] = (counts[d.status] ?? 0) + 1;
  return counts;
}

export interface RunMatchPipelineParams {
  before: AggregatedPatch;
  after: AggregatedPatch;
  notes: PatchNoteItem[];
  ddragon: DdragonData;
  llmMax: number;
  noLlm: boolean;
  /** 테스트 주입용(Anthropic 클라이언트 모킹·캐시 디렉토리 격리 등) — 프로덕션 호출은 생략. */
  llmOptions?: Pick<LlmMatchOptions, "client" | "cacheDir" | "maxTotalCalls" | "model">;
  /** buildDeltas의 matches.jsonl 표본 추출 dataRoot(테스트 격리용). */
  dataRoot?: string;
}

export interface RunMatchPipelineResult {
  /** 최종 델타 배열 — **항상 정렬된 상태**(status 우선순위 → |delta| 내림차순)로 반환한다. */
  deltas: DeltaRecord[];
  mappingFailures: string[];
  /** LLM 2단 실행 전(1단 결정론 판정 직후, 이미 정렬된 상태) 상태 분포 — 로그용. */
  statusAfterVerdict: Partial<Record<MatchStatus, number>>;
  llmSummary?: LlmRunSummary;
}

/**
 * F4 1~2단 핵심 파이프라인(순수 계산 — 파일 I/O는 buildDeltas의 matches.jsonl 표본 추출 1건뿐,
 * notes/ddragon/aggregated 로드는 호출부(main)가 이미 끝내고 넘겨준다) — 테스트가 실제 디스크
 * 경로·Anthropic API 없이도 전체 흐름을 검증할 수 있도록 `main()`에서 분리했다.
 *
 * **B4 후속 수정(2) — 상위 N 정렬**: `applyVerdicts` 직후 곧바로 `sortDeltas`를 적용한 뒤에야
 * `inferIndirectCandidates`를 호출한다 — LLM 2단 세션 상한(`--llm-max`)이 "패치노트 항목 순회
 * 순서상 상위 N건"이 아니라 "상태 우선순위(unannounced 최우선) → |delta| 내림차순 기준 진짜
 * 중요도 상위 N건"이 되도록 보장한다.
 */
export async function runMatchPipeline(params: RunMatchPipelineParams): Promise<RunMatchPipelineResult> {
  const rawDeltas = buildDeltas(params.before, params.after, {
    ddragon: params.ddragon,
    dataRoot: params.dataRoot,
  });
  const matchOutcome = matchDeterministic(params.notes, rawDeltas, params.ddragon);
  let deltas = applyVerdicts(rawDeltas, matchOutcome, indexNotesById(params.notes));

  // ← 정렬을 LLM 호출보다 먼저: inferIndirectCandidates의 `.slice(0, maxDeltas)`가 이 순서를
  // 그대로 신뢰하므로, 여기서 정렬해야 "상위 N건"이 실제로 중요도 상위가 된다.
  deltas = sortDeltas(deltas);
  const statusAfterVerdict = countByStatus(deltas);

  let llmSummary: LlmRunSummary | undefined;
  if (!params.noLlm) {
    const result = await inferIndirectCandidates(deltas, params.notes, params.ddragon, {
      maxDeltas: params.llmMax,
      ...params.llmOptions,
    });
    // inferIndirectCandidates는 입력 배열 순서를 보존한 채 대상 델타만 갱신하므로(map 기반),
    // 이미 정렬된 상태가 그대로 유지된다 — 재정렬 불필요.
    deltas = result.deltas;
    llmSummary = result.summary;
  }

  return { deltas, mappingFailures: matchOutcome.mappingFailures, statusAfterVerdict, llmSummary };
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[run-match] from=${args.from} to=${args.to} llmMax=${args.llmMax} noLlm=${args.noLlm}`);

  const notes = await loadOrFetchNotes(args.to);
  console.log(`[run-match] notes: ${notes.length}건 (patch=${args.to})`);

  const ddragon = loadDdragon();
  console.log(`[run-match] ddragon version=${ddragon.version}`);

  const before = loadAggregatedPatch(args.from);
  const after = loadAggregatedPatch(args.to);

  const pipelineResult = await runMatchPipeline({
    before,
    after,
    notes,
    ddragon,
    llmMax: args.llmMax,
    noLlm: args.noLlm,
  });

  if (pipelineResult.mappingFailures.length > 0) {
    console.log(
      `[run-match] ddragon 매핑 실패 엔티티(${pipelineResult.mappingFailures.length}건): ${pipelineResult.mappingFailures.join(", ")}`
    );
  }
  console.log(`[run-match] 1단 결정론 판정 후 상태 분포(정렬 완료):`, pipelineResult.statusAfterVerdict);

  if (pipelineResult.llmSummary) {
    const s = pipelineResult.llmSummary;
    console.log(
      `[run-match] LLM 2단: calls=${s.calls} cacheHits=${s.cacheHits} skipped=${s.skipped} ` +
        `usage(input=${s.usage.inputTokens} cacheRead=${s.usage.cacheReadInputTokens} ` +
        `cacheCreate=${s.usage.cacheCreationInputTokens} output=${s.usage.outputTokens})`
    );
  } else {
    console.log(`[run-match] --no-llm — 2단 스킵`);
  }

  console.log(`[run-match] 최종 상태 분포:`, countByStatus(pipelineResult.deltas));

  if (args.dryRun) {
    console.log(`[run-match] --dry-run — 파일 기록 생략`);
    return;
  }

  const result = writeDeltas({
    from: args.from,
    to: args.to,
    deltas: pipelineResult.deltas,
    llm: pipelineResult.llmSummary
      ? {
          calls: pipelineResult.llmSummary.calls,
          cacheHits: pipelineResult.llmSummary.cacheHits,
          skipped: pipelineResult.llmSummary.skipped,
          usage: pipelineResult.llmSummary.usage,
        }
      : undefined,
  });
  console.log(`[run-match] 완료 — ${result.filePath} (${result.sorted.length}건)`);
}

// run-aggregate.ts/run-ddragon.ts와 동일한 가드(scripts/shared/cli.ts) — 이 파일을 테스트가
// import만 해도(예: runMatchPipeline/parseArgs 단위 테스트) main()이 실행되지 않게 한다(가드
// 없으면 테스트 프로세스의 실제 argv로 main()이 즉시 실행돼 --from/--to 누락 에러가 나고
// process.exitCode=1이 세팅되는 실측 결함이 있었다 — B4 후속 수정 중 발견).
if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error("run-match 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
