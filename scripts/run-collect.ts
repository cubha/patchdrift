// scripts/run-collect.ts
// F1 파이프라인 진입점 — dotenv 로드 후 crawlPatch 호출.
// 실행: npm run pipeline:collect -- --patch 26.17 --target 10000
//       [--tiers challenger,grandmaster] [--seed-limit N] [--dry-run]

import "dotenv/config";
import { loadEnv } from "../src/pipeline/shared/env";
import { createRiotClient, type LeagueTier } from "../src/pipeline/collect/riot-client";
import { crawlPatch } from "../src/pipeline/collect/crawler";
import { PATCH_CALENDAR } from "../src/pipeline/collect/patch-calendar";

const VALID_TIERS: readonly LeagueTier[] = ["challenger", "grandmaster", "master"];

interface CliArgs {
  patch: string;
  target: number;
  tiers?: LeagueTier[];
  seedLimit?: number;
  dryRun: boolean;
}

function parseTiers(raw: string): LeagueTier[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const tier = VALID_TIERS.find((valid) => valid === t);
      if (!tier) {
        throw new Error(`run-collect: invalid --tiers value "${t}" (challenger|grandmaster|master)`);
      }
      return tier;
    });
}

function parseArgs(argv: string[]): CliArgs {
  let patch: string | undefined;
  let target = 10000;
  let tiers: LeagueTier[] | undefined;
  let seedLimit: number | undefined;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--patch":
        patch = argv[++i];
        break;
      case "--target": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`run-collect: --target must be a positive number (got "${argv[i]}")`);
        }
        target = value;
        break;
      }
      case "--tiers":
        tiers = parseTiers(argv[++i] ?? "");
        break;
      case "--seed-limit": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`run-collect: --seed-limit must be a positive number (got "${argv[i]}")`);
        }
        seedLimit = value;
        break;
      }
      case "--dry-run":
        dryRun = true;
        break;
      default:
        throw new Error(`run-collect: unknown argument "${arg}"`);
    }
  }

  if (!patch) {
    throw new Error("run-collect: --patch <id> is required (예: --patch 26.17)");
  }
  if (!Object.prototype.hasOwnProperty.call(PATCH_CALENDAR, patch)) {
    throw new Error(
      `run-collect: --patch "${patch}" is not registered in PATCH_CALENDAR ` +
        `(${Object.keys(PATCH_CALENDAR).join(", ")}) — crawlPatch would throw on this patch anyway, ` +
        `checked here so --dry-run catches it too.`
    );
  }

  return { patch, target, tiers, seedLimit, dryRun };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `[run-collect] patch=${args.patch} target=${args.target}` +
      (args.tiers ? ` tiers=${args.tiers.join(",")}` : "") +
      (args.seedLimit !== undefined ? ` seedLimit=${args.seedLimit}` : "") +
      (args.dryRun ? " (dry-run)" : "")
  );

  if (args.dryRun) {
    console.log("[run-collect] --dry-run: 인자 검증만 수행하고 실제 수집은 건너뜁니다.");
    return;
  }

  const env = loadEnv();
  const client = createRiotClient({
    apiKey: env.RIOT_API_KEY,
    platform: "kr",
    region: "asia",
  });

  const abortController = new AbortController();
  const onSigint = (): void => {
    console.log("\n[run-collect] SIGINT 수신 — 현재 처리 중인 매치까지 마치고 정상 종료합니다.");
    abortController.abort();
  };
  process.on("SIGINT", onSigint);

  try {
    const result = await crawlPatch(client, {
      patch: args.patch,
      target: args.target,
      tiers: args.tiers,
      seedLimit: args.seedLimit,
      signal: abortController.signal,
      onProgress: (snapshot) => {
        console.log(
          `[run-collect] ${snapshot.collected}/${snapshot.target} · seen=${snapshot.seen} · ` +
            `${snapshot.rateMatchesPerMin.toFixed(1)} matches/min`
        );
      },
    });
    console.log(
      `[run-collect] 완료 — collected=${result.collected} skippedVersion=${result.skippedVersion} ` +
        `skippedSeen=${result.skippedSeen} errors=${result.errors}`
    );
  } finally {
    process.off("SIGINT", onSigint);
    await client.dispose();
  }
}

main().catch((error) => {
  console.error("run-collect 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
