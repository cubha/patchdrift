// scripts/run-timeline.ts
// F8 파이프라인 진입점 — matches.jsonl 표본에서 타임라인을 수집해 timelines.jsonl에 append한다.
// 실행: npx tsx scripts/run-timeline.ts --patch 26.17 --sample 1500 [--dry-run]
// 키 값은 절대 로깅하지 않는다(riot-client.ts가 이미 보장, 여기서도 env 값을 출력하지 않는다).

import { loadEnv } from "../src/pipeline/shared/env";
import { createRiotClient } from "../src/pipeline/collect/riot-client";
import { collectTimelines } from "../src/pipeline/collect/timeline";

interface RunTimelineArgs {
  patch: string;
  sample: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): RunTimelineArgs {
  let patch: string | undefined;
  let sample = 1500;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--patch") {
      patch = argv[++i];
    } else if (arg === "--sample") {
      const raw = argv[++i];
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`run-timeline: --sample must be a positive number, got "${raw}"`);
      }
      sample = parsed;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (!patch) {
    throw new Error("run-timeline: --patch <PatchId> is required (예: --patch 26.17)");
  }

  return { patch, sample, dryRun };
}

async function main(): Promise<void> {
  const { patch, sample, dryRun } = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  console.log(`[run-timeline] patch=${patch} sample=${sample} dryRun=${dryRun}`);

  if (dryRun) {
    console.log("[run-timeline] --dry-run: 네트워크 호출 생략, 인자 확인만 수행");
    return;
  }

  const client = createRiotClient({
    apiKey: env.RIOT_API_KEY,
    platform: "kr",
    region: "asia",
  });

  try {
    const result = await collectTimelines(client, {
      patch,
      sample,
      onProgress: (event) => {
        const prefix = `[run-timeline] ${event.index + 1}/${event.total} ${event.matchId}`;
        if (event.status === "error") {
          console.error(`${prefix} error: ${event.error}`);
        } else {
          console.log(`${prefix} ${event.status}`);
        }
      },
    });
    console.log(
      `[run-timeline] done — written=${result.written} skipped=${result.skipped} nulls=${result.nulls} errors=${result.errors}`
    );
  } finally {
    await client.dispose();
  }
}

main().catch((error) => {
  console.error(`[run-timeline] fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
