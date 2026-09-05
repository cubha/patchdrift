// src/lib/data.ts
// 빌드 타임 JSON 로더 — data/aggregated/**만 읽어 정적 페이지에 임베드한다(런타임 외부 API 0,
// SCOPE §2 F7 "사전 인덱싱" 원칙). 서버 전용(fs 직접 사용) — 클라이언트 컴포넌트에서 import 금지.
//
// 경로 상수는 src/pipeline/shared/paths.ts와 같은 레이아웃을 따르되, 테스트 격리를 위해
// dataRoot를 매개변수로 받는 로컬 헬퍼로 재구현한다(ST-06 run-aggregate.ts --data-root와 동일한
// 선례 — shared/paths.ts는 다른 배치 소유라 건드리지 않는다).

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  ChampionStat,
  DeltasFile as PipelineDeltasFile,
  ItemStat,
  LaneGoldStat,
  ObjectiveStat,
  PatchId,
  PatchNoteItem,
  PatchSummary,
} from "@/pipeline/types";

/** run-aggregate.ts가 각 산출 파일에 공통으로 얹는 메타 블록. */
export interface AggregateMeta {
  patch: PatchId;
  generatedAt: string;
  nMatches: number;
  nParticipants: number;
  nTimelines: number;
  source: string;
}

/** 배열형 산출 파일({meta, rows: T[]}) 공통 래퍼 — champions/items/lanes.json. */
export interface RowsFile<T> {
  meta: AggregateMeta;
  rows: T[];
}

/** 단일 객체형 산출 파일({meta, data: T}) 공통 래퍼 — objectives/summary.json. */
export interface DataFile<T> {
  meta: AggregateMeta;
  data: T;
}

/** data/aggregated/notes/{patch}.json — ST-07 패치노트 파서 출력. */
export interface NotesFile {
  meta: {
    patch: PatchId;
    sourceUrl: string;
    fetchedAt: string;
    itemCount: number;
  };
  summary: string;
  sections: string[];
  items: PatchNoteItem[];
}

/**
 * data/aggregated/deltas/{from}_{to}.json 래퍼 — `src/pipeline/types.ts`의 `DeltasFile`을 그대로
 * 재export한다(2026-09-05 후속 수정). meta가 ST-06 5개 집계 파일의 `AggregateMeta`와 다른
 * 별도 스키마({from, to, generatedAt, n, counts, qAlpha, llm?})라 `RowsFile<DeltaRecord>`로
 * 뭉뚱그릴 수 없다 — `src/pipeline/match/verdict.ts`의 `writeDeltas`가 실제로 기록하는 타입과
 * types.ts에서 동일 인터페이스(`DeltasFileMeta`/`DeltasFile`)를 공유해 스키마 드리프트를 컴파일
 * 타임에 잡는다.
 */
export type DeltasFile = PipelineDeltasFile;

/** 패치 쌍(from → to). */
export interface PatchPair {
  from: PatchId;
  to: PatchId;
}

function defaultDataRoot(): string {
  return path.resolve(process.cwd(), "data");
}

function aggregatedPatchDir(dataRoot: string, patch: PatchId): string {
  return path.join(dataRoot, "aggregated", patch);
}

function deltasDir(dataRoot: string): string {
  return path.join(dataRoot, "aggregated", "deltas");
}

function notesFilePath(dataRoot: string, patch: PatchId): string {
  return path.join(dataRoot, "aggregated", "notes", `${patch}.json`);
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/** "26.17" 같은 점(.) 구분 패치 번호를 내림차순(최신 우선) 비교한다. 세그먼트 수가 달라도
 * 없는 세그먼트는 0으로 취급한다. */
function comparePatchDesc(a: PatchId, b: PatchId): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** data/aggregated/{patch}/summary.json이 존재하는 패치 목록(내림차순 = 최신 우선). "deltas"·
 * "notes"는 패치 디렉토리가 아니라 별도 네임스페이스라 제외한다. */
export function listPatches(dataRoot: string = defaultDataRoot()): PatchId[] {
  const aggRoot = path.join(dataRoot, "aggregated");
  if (!fs.existsSync(aggRoot)) return [];
  const patches = fs
    .readdirSync(aggRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "deltas" && entry.name !== "notes")
    .map((entry) => entry.name)
    .filter((patch) => fs.existsSync(path.join(aggRoot, patch, "summary.json")));
  return patches.sort(comparePatchDesc);
}

/** data/aggregated/deltas/*.json 파일명("{from}_{to}.json")에서 패치 쌍 목록을 뽑는다
 * (내림차순 = 최신 쌍 우선). 디렉토리가 없으면 빈 배열(빈 데이터 빌드 보장). */
export function listPatchPairs(dataRoot: string = defaultDataRoot()): PatchPair[] {
  const dir = deltasDir(dataRoot);
  if (!fs.existsSync(dir)) return [];
  const pairs: PatchPair[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const [from, to] = file.replace(/\.json$/, "").split("_");
    if (!from || !to) continue;
    pairs.push({ from, to });
  }
  return pairs.sort((a, b) => comparePatchDesc(a.to, b.to) || comparePatchDesc(a.from, b.from));
}

/** 가장 최신 패치 쌍. 쌍이 하나도 없으면(ST-08 미착수·빈 빌드 등) null. */
export function getDefaultPair(dataRoot: string = defaultDataRoot()): PatchPair | null {
  return listPatchPairs(dataRoot)[0] ?? null;
}

export function loadSummary(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): DataFile<PatchSummary> | null {
  return readJsonFile(path.join(aggregatedPatchDir(dataRoot, patch), "summary.json"));
}

export function loadChampions(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): RowsFile<ChampionStat> | null {
  return readJsonFile(path.join(aggregatedPatchDir(dataRoot, patch), "champions.json"));
}

export function loadItems(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): RowsFile<ItemStat> | null {
  return readJsonFile(path.join(aggregatedPatchDir(dataRoot, patch), "items.json"));
}

export function loadLanes(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): RowsFile<LaneGoldStat> | null {
  return readJsonFile(path.join(aggregatedPatchDir(dataRoot, patch), "lanes.json"));
}

export function loadObjectives(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): DataFile<ObjectiveStat> | null {
  return readJsonFile(path.join(aggregatedPatchDir(dataRoot, patch), "objectives.json"));
}

export function loadNotes(
  patch: PatchId,
  dataRoot: string = defaultDataRoot()
): NotesFile | null {
  return readJsonFile(notesFilePath(dataRoot, patch));
}

/** data/aggregated/deltas/{from}_{to}.json — 파일이 없으면 null(ST-08 미착수 구간·빈 데이터
 * 빌드 모두 이 경로로 안전하게 처리된다). */
export function loadDeltas(
  from: PatchId,
  to: PatchId,
  dataRoot: string = defaultDataRoot()
): DeltasFile | null {
  return readJsonFile(path.join(deltasDir(dataRoot), `${from}_${to}.json`));
}
