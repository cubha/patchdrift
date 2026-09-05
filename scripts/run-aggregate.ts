// scripts/run-aggregate.ts
// F2/F8 파이프라인 진입점 — matches.jsonl/timelines.jsonl 스트리밍 로드 →
// champions/items/lanes/objectives/summary 5종 JSON을 data/aggregated/{patch}/에 기록한다.
// 실행: npx tsx scripts/run-aggregate.ts --patch 26.17 [--data-root <dir>]

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { MatchSlim, PatchId, TimelineSlim } from "../src/pipeline/types";
import { aggregatedDir, matchesJsonl, timelinesJsonl } from "../src/pipeline/shared/paths";
import { aggregateChampions } from "../src/pipeline/aggregate/champions";
import { aggregateItems } from "../src/pipeline/aggregate/items";
import { aggregateLanes } from "../src/pipeline/aggregate/lanes";
import { aggregateObjectives } from "../src/pipeline/aggregate/objectives";
import { summarizePatch } from "../src/pipeline/aggregate/summary";

export interface RunAggregateArgs {
  patch: PatchId;
  dataRoot?: string;
}

export function parseArgs(argv: string[]): RunAggregateArgs {
  let patch: string | undefined;
  let dataRoot: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--patch") {
      patch = argv[++i];
    } else if (arg === "--data-root") {
      dataRoot = argv[++i];
    }
  }

  if (!patch) {
    throw new Error("run-aggregate: --patch <PatchId> is required (예: --patch 26.17)");
  }

  return { patch, dataRoot };
}

function resolveMatchesPath(patch: PatchId, dataRoot?: string): string {
  return dataRoot ? path.join(dataRoot, "raw", patch, "matches.jsonl") : matchesJsonl(patch);
}

function resolveTimelinesPath(patch: PatchId, dataRoot?: string): string {
  return dataRoot ? path.join(dataRoot, "raw", patch, "timelines.jsonl") : timelinesJsonl(patch);
}

function resolveAggregatedDir(patch: PatchId, dataRoot?: string): string {
  return dataRoot ? path.join(dataRoot, "aggregated", patch) : aggregatedDir(patch);
}

export interface JsonlLoadResult<T> {
  rows: T[];
  /** JSON.parse에 실패한 줄 수(카운트 후 skip — 크롤러가 append 중일 때 마지막 줄이 잘려 있을 수
   * 있음). */
  skipped: number;
}

/** JSONL 스트리밍 로드 — 라인 단위로 파싱하고 깨진 라인은 세어서 건너뛴다. 파일이 없으면 빈
 * 결과(스텁 데이터/미수집 패치를 에러 없이 다루기 위함). */
export function loadJsonl<T>(jsonlPath: string): JsonlLoadResult<T> {
  if (!fs.existsSync(jsonlPath)) return { rows: [], skipped: 0 };

  const rows: T[] = [];
  let skipped = 0;
  const lines = fs.readFileSync(jsonlPath, "utf8").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    try {
      rows.push(JSON.parse(line) as T);
    } catch {
      skipped += 1;
    }
  }

  return { rows, skipped };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function main(): Promise<void> {
  const { patch, dataRoot } = parseArgs(process.argv.slice(2));

  const matchesPath = resolveMatchesPath(patch, dataRoot);
  const timelinesPath = resolveTimelinesPath(patch, dataRoot);
  const outDir = resolveAggregatedDir(patch, dataRoot);

  const matchesLoad = loadJsonl<MatchSlim>(matchesPath);
  const timelinesLoad = loadJsonl<TimelineSlim>(timelinesPath);
  const nParticipants = matchesLoad.rows.reduce((acc, m) => acc + m.participants.length, 0);

  console.log(
    `[run-aggregate] patch=${patch} matches=${matchesLoad.rows.length}(skip ${matchesLoad.skipped}) ` +
      `timelines=${timelinesLoad.rows.length}(skip ${timelinesLoad.skipped})`
  );

  const meta = {
    patch,
    generatedAt: new Date().toISOString(),
    nMatches: matchesLoad.rows.length,
    nParticipants,
    nTimelines: timelinesLoad.rows.length,
    source: "riot-match-v5" as const,
  };

  const champions = aggregateChampions(matchesLoad.rows, patch);
  const items = aggregateItems(matchesLoad.rows, patch);
  const lanes = aggregateLanes(timelinesLoad.rows, patch);
  const objectives = aggregateObjectives(timelinesLoad.rows, patch);
  const summary = summarizePatch(matchesLoad.rows, timelinesLoad.rows, patch);

  writeJson(path.join(outDir, "champions.json"), { meta, rows: champions });
  writeJson(path.join(outDir, "items.json"), { meta, rows: items });
  writeJson(path.join(outDir, "lanes.json"), { meta, rows: lanes });
  writeJson(path.join(outDir, "objectives.json"), { meta, data: objectives });
  writeJson(path.join(outDir, "summary.json"), { meta, data: summary });

  const top3 = champions
    .filter((c) => c.scope === "all")
    .slice()
    .sort((a, b) => b.pickRate - a.pickRate)
    .slice(0, 3)
    .map((c) => `${c.championName || `#${c.championId}`} ${(c.pickRate * 100).toFixed(2)}%`)
    .join(", ");

  console.log(
    `[run-aggregate] done — champions=${champions.length} items=${items.length} lanes=${lanes.length} ` +
      `top3PickRate(ALL)=[${top3}] → ${outDir}`
  );
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(`[run-aggregate] fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
