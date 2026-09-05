// src/pipeline/collect/checkpoint.ts
// 파일 단위 idempotent 재개 체크포인트 — seen-ids 인덱스(재조회 방지) + collect-state.json(puuid
// 순회 위치)을 fs로 로드/기록한다. 전부 동기 I/O(appendFileSync 등)로 원자성을 보장한다(PLAN F1).
// paths.ts는 수정하지 않는다 — 테스트가 요구하는 dataRoot 오버라이드는 이 파일이 자체적으로
// 흡수한다(crawler.ts와 동일한 패턴, timeline.ts도 동일 관례를 쓴다).

import fs from "node:fs";
import path from "node:path";
import type { PatchId } from "../types";
import { matchesJsonl, rawDir, seenIdsFile } from "../shared/paths";

/** 체크포인트 파일 경로 계산에 필요한 최소 정보. dataRoot 생략 시 shared/paths.ts의 DATA_ROOT를 쓴다. */
export interface CheckpointPaths {
  patch: PatchId;
  /** 테스트 주입용 데이터 루트 오버라이드(예: os.tmpdir() 하위). 생략 시 process.cwd()/data. */
  dataRoot?: string;
}

/**
 * data/raw/{patch}/collect-state.json — 재개 커서.
 * 인덱스가 아니라 puuid 값 자체를 저장한다: 시드는 24시간 TTL로 재생성되고 티어 내 LP 순서가
 * 바뀔 수 있어, 배열 인덱스를 그대로 재사용하면 재생성 후 다른 puuid를 가리켜 앞쪽 puuid가
 * 영구 스킵되는 결함이 생긴다(seen-ids는 matchId dedup만 할 뿐 puuid 자체를 건너뛰는 문제는
 * 막지 못한다 — scope-critic 결함 1). 재개 시 crawler.ts가 현재 시드 배열에서
 * `cursorPuuid`의 인덱스를 찾아 그 위치부터 진행하고, `seedCreatedAtMs`가 현재 시드 캐시의
 * 생성 시각과 다르면(시드 재생성) 또는 `cursorPuuid`를 찾지 못하면 인덱스 0부터 다시
 * 시작한다(seen-ids가 매치 단위 dedup을 보장하므로 안전 — 재조회 API 비용만 감수한다).
 */
export interface CollectState {
  /** 재개 시작점 puuid. null이면 처음부터(시드 전체를 새로 순회). */
  cursorPuuid: string | null;
  /** 이 상태를 저장할 때 사용한 시드 캐시(seed-puuids.json)의 createdAtMs. */
  seedCreatedAtMs: number;
  updatedAtMs: number;
}

function resolveRawDir({ patch, dataRoot }: CheckpointPaths): string {
  return dataRoot ? path.join(dataRoot, "raw", patch) : rawDir(patch);
}

export function resolveSeenIdsFile(paths: CheckpointPaths): string {
  return paths.dataRoot ? path.join(resolveRawDir(paths), "seen-ids.txt") : seenIdsFile(paths.patch);
}

export function resolveMatchesJsonl(paths: CheckpointPaths): string {
  return paths.dataRoot ? path.join(resolveRawDir(paths), "matches.jsonl") : matchesJsonl(paths.patch);
}

export function resolveCollectStateFile(paths: CheckpointPaths): string {
  return path.join(resolveRawDir(paths), "collect-state.json");
}

/** seen-ids.txt(1줄 1 matchId)를 로드해 Set으로 반환한다. 파일이 없으면 빈 Set. */
export function loadSeenIds(paths: CheckpointPaths): Set<string> {
  const file = resolveSeenIdsFile(paths);
  if (!fs.existsSync(file)) return new Set();
  const lines = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return new Set(lines);
}

/** matchId 1개를 seen-ids.txt에 원자적으로 append한다(동기 appendFileSync). */
export function appendSeenId(paths: CheckpointPaths, matchId: string): void {
  const file = resolveSeenIdsFile(paths);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${matchId}\n`, "utf8");
}

/** JSONL 파일의 현재 줄 수(=이미 수집된 레코드 수)를 반환한다. 파일이 없으면 0. */
export function countJsonlLines(file: string): number {
  if (!fs.existsSync(file)) return 0;
  const content = fs.readFileSync(file, "utf8");
  if (content.length === 0) return 0;
  return content.split("\n").filter((line) => line.trim().length > 0).length;
}

/** 임의의 JSON 직렬화 가능 레코드 1개를 JSONL 파일에 원자적으로 append한다. */
export function appendJsonl(file: string, record: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}

/** collect-state.json을 로드한다. 없으면 cursorPuuid=null(처음부터 순회)인 기본값. */
export function loadCollectState(paths: CheckpointPaths): CollectState {
  const file = resolveCollectStateFile(paths);
  if (!fs.existsSync(file)) return { cursorPuuid: null, seedCreatedAtMs: 0, updatedAtMs: 0 };
  return JSON.parse(fs.readFileSync(file, "utf8")) as CollectState;
}

/** collect-state.json을 저장한다 — 재개 커서(cursorPuuid)를 남겨 재실행 시 이어서 순회한다. */
export function saveCollectState(paths: CheckpointPaths, state: CollectState): void {
  const file = resolveCollectStateFile(paths);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
}
