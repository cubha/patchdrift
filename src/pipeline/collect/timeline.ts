// src/pipeline/collect/timeline.ts
// F8: 패치당 1~2천 매치 타임라인 표본 수집·축약 — 상세 수집(ST-03)과 별도 큐, reduce-on-ingest(JSONL).
// 라이브 실측(docs/plan/verify-spec/ST-02.md, 2026-09-05): 22프레임(1분 간격, frameInterval=60000),
// 용/전령/바론 = ELITE_MONSTER_KILL 이벤트(monsterType: "DRAGON"|"RIFTHERALD"|"BARON_NASHOR"),
// 첫 포탑 = BUILDING_KILL(buildingType==="TOWER_BUILDING"). DRAGON_KILL 단독 이벤트는 없다.
// 참가자→포지션 매핑: match.participants[i].teamPosition, participantId = i + 1(라이브 실측 일치).

import fs from "node:fs";
import path from "node:path";
import type {
  FirstObjectiveSeconds,
  LaneGoldSnapshot,
  LanePosition,
  MatchSlim,
  PatchId,
  TimelineLaneSplit,
  TimelineSlim,
} from "../types";
import type { RiotClient, RiotMatchTimelineDto } from "./riot-client";
import { matchesJsonl, timelinesJsonl } from "../shared/paths";

const TEN_MIN_MS = 600_000;
const FOURTEEN_MIN_MS = 840_000;

const LANE_POSITIONS: readonly LanePosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/** sampleMatchIds/collectTimelines 기본 시드 — 재실행해도 동일 표본이 나오도록 고정한다. */
export const DEFAULT_TIMELINE_SAMPLE_SEED = 20260917;

type RiotTimelineFrame = RiotMatchTimelineDto["info"]["frames"][number];
type RiotTimelineEvent = RiotTimelineFrame["events"][number];

function readStringField(event: RiotTimelineEvent, key: string): string | undefined {
  const value = (event as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function findFrameGold(
  frames: RiotTimelineFrame[],
  participantId: number,
  minTimestampMs: number
): number | null {
  const frame = frames.find((f) => f.timestamp >= minTimestampMs);
  if (!frame) return null;
  const participantFrame = frame.participantFrames[String(participantId)];
  return participantFrame ? participantFrame.totalGold : null;
}

function reduceLaneGold(
  frames: RiotTimelineFrame[],
  participantIndex: number
): LaneGoldSnapshot {
  if (participantIndex === -1) {
    return { goldAt10: null, goldAt14: null };
  }
  const participantId = participantIndex + 1;
  return {
    goldAt10: findFrameGold(frames, participantId, TEN_MIN_MS),
    goldAt14: findFrameGold(frames, participantId, FOURTEEN_MIN_MS),
  };
}

function reduceFirstObjectives(frames: RiotTimelineFrame[]): FirstObjectiveSeconds {
  let dragonSec: number | null = null;
  let heraldSec: number | null = null;
  let baronSec: number | null = null;
  let towerSec: number | null = null;

  for (const frame of frames) {
    for (const event of frame.events) {
      if (event.type === "ELITE_MONSTER_KILL") {
        const monsterType = readStringField(event, "monsterType");
        const sec = Math.floor(event.timestamp / 1000);
        if (monsterType === "DRAGON" && dragonSec === null) {
          dragonSec = sec;
        } else if (monsterType === "RIFTHERALD" && heraldSec === null) {
          heraldSec = sec;
        } else if (monsterType === "BARON_NASHOR" && baronSec === null) {
          baronSec = sec;
        }
      } else if (event.type === "BUILDING_KILL" && towerSec === null) {
        const buildingType = readStringField(event, "buildingType");
        if (buildingType === "TOWER_BUILDING") {
          towerSec = Math.floor(event.timestamp / 1000);
        }
      }
    }
  }

  return { dragonSec, heraldSec, baronSec, towerSec };
}

/**
 * raw match-v5 timeline 응답 → TimelineSlim reduce-on-ingest. 순수 함수(부수효과 없음).
 * 10/14분 프레임이 없는 매치(경기 시간 미달)는 해당 값이 null로 남는다 — TimelineSlim 계약이
 * 이미 이를 허용하므로 매치를 skip하지 않는다.
 */
export function reduceTimeline(match: MatchSlim, raw: RiotMatchTimelineDto): TimelineSlim {
  const frames = raw.info.frames;
  const lanes: Partial<Record<LanePosition, TimelineLaneSplit>> = {};

  for (const position of LANE_POSITIONS) {
    const blueIndex = match.participants.findIndex(
      (p) => p.teamId === 100 && p.teamPosition === position
    );
    const redIndex = match.participants.findIndex(
      (p) => p.teamId === 200 && p.teamPosition === position
    );
    if (blueIndex === -1 && redIndex === -1) continue;

    lanes[position] = {
      blue: reduceLaneGold(frames, blueIndex),
      red: reduceLaneGold(frames, redIndex),
    };
  }

  return {
    matchId: match.matchId,
    patch: match.patch,
    lanes,
    firstObjectives: reduceFirstObjectives(frames),
  };
}

/** mulberry32 — 결정론적 시드 PRNG(외부 의존성 없이 표본 셔플용으로 충분). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededSample<T>(items: readonly T[], k: number, seed: number): T[] {
  const shuffled = [...items];
  const rng = mulberry32(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(0, Math.min(k, shuffled.length)));
}

function readJsonlLines(jsonlPath: string): string[] {
  if (!fs.existsSync(jsonlPath)) return [];
  return fs
    .readFileSync(jsonlPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function loadMatchSlims(jsonlPath: string): MatchSlim[] {
  return readJsonlLines(jsonlPath).map((line) => JSON.parse(line) as MatchSlim);
}

function loadTimelineMatchIds(jsonlPath: string): Set<string> {
  const ids = new Set<string>();
  for (const line of readJsonlLines(jsonlPath)) {
    const parsed = JSON.parse(line) as TimelineSlim;
    ids.add(parsed.matchId);
  }
  return ids;
}

/**
 * matches.jsonl에서 결정론적 표본 k개를 선택한다(seed 기반 셔플). k가 전체 개수보다 크면
 * 전체를 반환한다. 파일이 없으면 빈 배열.
 */
export function sampleMatchIds(
  jsonlPath: string,
  k: number,
  seed: number = DEFAULT_TIMELINE_SAMPLE_SEED
): string[] {
  const matchIds = loadMatchSlims(jsonlPath).map((m) => m.matchId);
  return seededSample(matchIds, k, seed);
}

export type TimelineProgressStatus = "written" | "skipped" | "null" | "error";

export interface TimelineProgressEvent {
  matchId: string;
  /** 0-based 표본 내 순번. */
  index: number;
  total: number;
  status: TimelineProgressStatus;
  /** status === "error"일 때만 채워진다. */
  error?: string;
}

export interface CollectTimelinesOptions {
  patch: PatchId;
  /** 표본 크기(PLAN F8: 패치당 1~2천). */
  sample: number;
  seed?: number;
  /** 테스트 주입용 — 기본값은 shared/paths.ts의 DATA_ROOT(process.cwd()/data). */
  dataRoot?: string;
  /** console 사용 금지(scripts 전용) — 진행 상황은 이 콜백으로만 노출한다. */
  onProgress?: (event: TimelineProgressEvent) => void;
}

export interface CollectTimelinesResult {
  written: number;
  skipped: number;
  nulls: number;
  errors: number;
}

function resolveMatchesJsonlPath(patch: PatchId, dataRoot?: string): string {
  return matchesJsonl(patch, dataRoot);
}

function resolveTimelinesJsonlPath(patch: PatchId, dataRoot?: string): string {
  return timelinesJsonl(patch, dataRoot);
}

/**
 * matches.jsonl에서 표본을 뽑아 타임라인을 수집·축약해 timelines.jsonl에 append한다.
 * 이미 timelines.jsonl에 있는 matchId는 재호출 없이 스킵한다(재개, idempotent).
 * 상세 수집(ST-03 crawler)과 별도 큐 — 이 함수는 matches.jsonl을 읽기 전용으로만 소비한다.
 */
export async function collectTimelines(
  client: RiotClient,
  options: CollectTimelinesOptions
): Promise<CollectTimelinesResult> {
  const matchesPath = resolveMatchesJsonlPath(options.patch, options.dataRoot);
  const timelinesPath = resolveTimelinesJsonlPath(options.patch, options.dataRoot);
  const seed = options.seed ?? DEFAULT_TIMELINE_SAMPLE_SEED;

  const matches = loadMatchSlims(matchesPath);
  const matchById = new Map(matches.map((m) => [m.matchId, m] as const));
  const sampledIds = seededSample(
    matches.map((m) => m.matchId),
    options.sample,
    seed
  );
  const alreadyCollected = loadTimelineMatchIds(timelinesPath);

  fs.mkdirSync(path.dirname(timelinesPath), { recursive: true });

  const result: CollectTimelinesResult = { written: 0, skipped: 0, nulls: 0, errors: 0 };

  for (let i = 0; i < sampledIds.length; i++) {
    const matchId = sampledIds[i];
    const total = sampledIds.length;

    if (alreadyCollected.has(matchId)) {
      result.skipped += 1;
      options.onProgress?.({ matchId, index: i, total, status: "skipped" });
      continue;
    }

    const match = matchById.get(matchId);
    if (!match) {
      result.errors += 1;
      options.onProgress?.({
        matchId,
        index: i,
        total,
        status: "error",
        error: "matchId not found in matches.jsonl",
      });
      continue;
    }

    try {
      const raw = await client.getMatchTimeline(matchId);
      if (!raw) {
        result.nulls += 1;
        options.onProgress?.({ matchId, index: i, total, status: "null" });
        continue;
      }
      const slim = reduceTimeline(match, raw);
      fs.appendFileSync(timelinesPath, `${JSON.stringify(slim)}\n`, "utf8");
      alreadyCollected.add(matchId);
      result.written += 1;
      options.onProgress?.({ matchId, index: i, total, status: "written" });
    } catch (error) {
      result.errors += 1;
      options.onProgress?.({
        matchId,
        index: i,
        total,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
