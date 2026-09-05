// scripts/run-ddragon.ts
// Data Dragon 최신 버전 챔피언/아이템 JSON + (집계에 등장한 엔티티만) 이미지를 다운로드한다.
// 실행: npx tsx scripts/run-ddragon.ts
//
// 1) https://ddragon.leagueoflegends.com/api/versions.json → 최신 버전(예 "16.17.1")
// 2) cdn/{v}/data/ko_KR/{champion,item}.json → data/ddragon/{v}/{champion,item}.json (커밋 대상 —
//    소형 JSON이고 src/pipeline/match/ddragon.ts가 빌드 타임 매핑에 그대로 읽는다)
// 3) data/aggregated/{patch}/{champions,items}.json 전 패치를 스캔해 등장한 championId/itemId만
//    cdn/{v}/img/{champion,item}/{...}.png → public/dd/{champion,item}/ 에 다운로드(이미 있으면 skip)
//
// 룬 아이콘(cdn/img/perk-images/...)은 현재 파이프라인에 룬 단위 집계 엔티티가 없어(패치노트
// subsection="rune" 분류는 있지만 통계 집계 대상은 챔피언/아이템뿐) 다운로드 대상이 없다 —
// 향후 룬 통계가 추가되면 이 스크립트에 별도 단계로 추가한다(미확인 사항).

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { DATA_ROOT } from "../src/pipeline/shared/paths";
import { loadDdragon } from "../src/pipeline/match/ddragon";
import { isMainModule } from "./shared/cli";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const PUBLIC_DD_DIR = path.resolve(process.cwd(), "public", "dd");
const DOWNLOAD_CONCURRENCY = 6;

function cdnBase(version: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}`;
}

export async function fetchLatestVersion(fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(VERSIONS_URL);
  if (!res.ok) {
    throw new Error(`ddragon versions.json fetch failed: HTTP ${res.status}`);
  }
  const versions = (await res.json()) as unknown;
  if (!Array.isArray(versions) || versions.length === 0 || typeof versions[0] !== "string") {
    throw new Error("ddragon versions.json: unexpected response shape");
  }
  return versions[0];
}

async function downloadJsonFile(
  url: string,
  destPath: string,
  fetchImpl: typeof fetch
): Promise<void> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`fetch failed (HTTP ${res.status}): ${url}`);
  }
  const text = await res.text();
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, text, "utf8");
}

type DownloadResult = "downloaded" | "skipped" | "failed";

async function downloadImageIfMissing(
  url: string,
  destPath: string,
  fetchImpl: typeof fetch
): Promise<DownloadResult> {
  if (fs.existsSync(destPath)) return "skipped";
  const res = await fetchImpl(url);
  if (!res.ok) return "failed";
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  return "downloaded";
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function runOne(): Promise<void> {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runOne());
  await Promise.all(workers);
}

interface AggregatedChampionsFile {
  rows: Array<{ championId: number }>;
}
interface AggregatedItemsFile {
  rows: Array<{ itemId: number }>;
}

/**
 * `data/aggregated/{patch}/{champions,items}.json` 전 패치 디렉토리를 스캔해 등장한
 * championId/itemId 집합을 모은다. `deltas/`·`notes/`(패치 디렉토리가 아님)는 제외한다.
 */
export function collectAppearedEntities(dataRoot: string = DATA_ROOT): {
  championIds: Set<number>;
  itemIds: Set<number>;
} {
  const aggregatedDir = path.join(dataRoot, "aggregated");
  const championIds = new Set<number>();
  const itemIds = new Set<number>();
  if (!fs.existsSync(aggregatedDir)) return { championIds, itemIds };

  for (const entry of fs.readdirSync(aggregatedDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "deltas" || entry.name === "notes") continue;
    const patchDir = path.join(aggregatedDir, entry.name);

    const championsPath = path.join(patchDir, "champions.json");
    if (fs.existsSync(championsPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(championsPath, "utf8")
      ) as AggregatedChampionsFile;
      for (const row of parsed.rows) championIds.add(row.championId);
    }

    const itemsPath = path.join(patchDir, "items.json");
    if (fs.existsSync(itemsPath)) {
      const parsed = JSON.parse(fs.readFileSync(itemsPath, "utf8")) as AggregatedItemsFile;
      for (const row of parsed.rows) itemIds.add(row.itemId);
    }
  }
  return { championIds, itemIds };
}

export async function main(): Promise<void> {
  const fetchImpl = fetch;
  const version = await fetchLatestVersion(fetchImpl);
  console.log(`[run-ddragon] latest version=${version}`);

  const versionDir = path.join(DATA_ROOT, "ddragon", version);
  await downloadJsonFile(
    `${cdnBase(version)}/data/ko_KR/champion.json`,
    path.join(versionDir, "champion.json"),
    fetchImpl
  );
  await downloadJsonFile(
    `${cdnBase(version)}/data/ko_KR/item.json`,
    path.join(versionDir, "item.json"),
    fetchImpl
  );
  console.log(`[run-ddragon] saved champion.json / item.json → ${versionDir}`);

  const ddragon = loadDdragon(version);
  const { championIds, itemIds } = collectAppearedEntities();
  console.log(
    `[run-ddragon] appeared entities (all aggregated patches): champions=${championIds.size} items=${itemIds.size}`
  );

  let champDownloaded = 0;
  let champSkipped = 0;
  let champFailed = 0;
  const missingChampionMapping: number[] = [];

  await mapWithConcurrency(Array.from(championIds), DOWNLOAD_CONCURRENCY, async (championId) => {
    const champion = ddragon.champions.byKey(championId);
    if (!champion) {
      missingChampionMapping.push(championId);
      return;
    }
    const url = `${cdnBase(version)}/img/champion/${champion.id}.png`;
    const dest = path.join(PUBLIC_DD_DIR, "champion", `${champion.id}.png`);
    const result = await downloadImageIfMissing(url, dest, fetchImpl);
    if (result === "downloaded") champDownloaded += 1;
    else if (result === "skipped") champSkipped += 1;
    else champFailed += 1;
  });

  let itemDownloaded = 0;
  let itemSkipped = 0;
  let itemFailed = 0;
  const missingItemMapping: number[] = [];

  await mapWithConcurrency(Array.from(itemIds), DOWNLOAD_CONCURRENCY, async (itemId) => {
    const item = ddragon.items.byId(itemId);
    if (!item) {
      missingItemMapping.push(itemId);
      return;
    }
    const url = `${cdnBase(version)}/img/item/${itemId}.png`;
    const dest = path.join(PUBLIC_DD_DIR, "item", `${itemId}.png`);
    const result = await downloadImageIfMissing(url, dest, fetchImpl);
    if (result === "downloaded") itemDownloaded += 1;
    else if (result === "skipped") itemSkipped += 1;
    else itemFailed += 1;
  });

  const completedCount = Array.from(itemIds).filter((id) => ddragon.items.isCompleted(id)).length;

  console.log(
    `[run-ddragon] champion images: downloaded=${champDownloaded} skipped=${champSkipped} failed=${champFailed} missing-mapping=${missingChampionMapping.length}`
  );
  console.log(
    `[run-ddragon] item images: downloaded=${itemDownloaded} skipped=${itemSkipped} failed=${itemFailed} missing-mapping=${missingItemMapping.length}`
  );
  console.log(
    `[run-ddragon] completed items among appeared: ${completedCount}/${itemIds.size}`
  );
  if (missingChampionMapping.length > 0) {
    console.log(
      `[run-ddragon] missing champion ddragon mapping (championId): ${missingChampionMapping.join(", ")}`
    );
  }
  if (missingItemMapping.length > 0) {
    console.log(
      `[run-ddragon] missing item ddragon mapping (itemId): ${missingItemMapping.join(", ")}`
    );
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`[run-ddragon] fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
