// src/pipeline/shared/paths.ts
// 데이터 레이아웃 경로 상수/헬퍼. PLAN ⑥ "데이터 계약"의 경로를 그대로 구현한다.
// data/raw/*는 gitignore(수집 원본), data/aggregated/*는 커밋 대상(빌드 재현용).

import path from "node:path";
import type { PatchId } from "../types";

/** 데이터 루트. cwd 기준(파이프라인 스크립트는 항상 repo 루트에서 실행된다). */
export const DATA_ROOT = path.resolve(process.cwd(), "data");

/** data/raw/{patch}/ — 패치 1개의 원본 수집 산출물 디렉토리. */
export function rawDir(patch: PatchId): string {
  return path.join(DATA_ROOT, "raw", patch);
}

/** data/raw/{patch}/matches.jsonl — MatchSlim 1행/매치. */
export function matchesJsonl(patch: PatchId): string {
  return path.join(rawDir(patch), "matches.jsonl");
}

/** data/raw/{patch}/timelines.jsonl — TimelineSlim 1행/매치. */
export function timelinesJsonl(patch: PatchId): string {
  return path.join(rawDir(patch), "timelines.jsonl");
}

/** data/raw/{patch}/seen-ids.txt — idempotent 재개용 수집 완료 matchId 인덱스. */
export function seenIdsFile(patch: PatchId): string {
  return path.join(rawDir(patch), "seen-ids.txt");
}

/** data/aggregated/{patch}/ — champions/items/lanes/objectives/summary.json이 위치하는 디렉토리. */
export function aggregatedDir(patch: PatchId): string {
  return path.join(DATA_ROOT, "aggregated", patch);
}

/** data/aggregated/deltas/{from}_{to}.json — 패치 쌍 델타 판정 결과. */
export function deltasFile(from: PatchId, to: PatchId): string {
  return path.join(DATA_ROOT, "aggregated", "deltas", `${from}_${to}.json`);
}

/** data/aggregated/notes/{patch}.json — 패치노트 파서 출력. */
export function notesFile(patch: PatchId): string {
  return path.join(DATA_ROOT, "aggregated", "notes", `${patch}.json`);
}

/** data/cache/llm/ — LLM 2단 짝짓기 캐시 디렉토리(gitignore). */
export function llmCacheDir(): string {
  return path.join(DATA_ROOT, "cache", "llm");
}
