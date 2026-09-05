import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  DATA_ROOT,
  rawDir,
  matchesJsonl,
  timelinesJsonl,
  seenIdsFile,
  aggregatedDir,
  deltasFile,
  notesFile,
  llmCacheDir,
} from "../paths";

// cwd 의존을 피하기 위해 DATA_ROOT로부터의 상대 suffix만 검증한다(오케스트레이터 실행 위치 무관).
function suffix(p: string): string {
  return path.relative(DATA_ROOT, p);
}

describe("paths", () => {
  it("DATA_ROOT는 cwd 기준 data/ 디렉토리다", () => {
    expect(DATA_ROOT).toBe(path.resolve(process.cwd(), "data"));
  });

  it("rawDir(patch) → data/raw/{patch}", () => {
    expect(suffix(rawDir("26.17"))).toBe(path.join("raw", "26.17"));
  });

  it("matchesJsonl(patch) → data/raw/{patch}/matches.jsonl", () => {
    expect(suffix(matchesJsonl("26.17"))).toBe(path.join("raw", "26.17", "matches.jsonl"));
  });

  it("timelinesJsonl(patch) → data/raw/{patch}/timelines.jsonl", () => {
    expect(suffix(timelinesJsonl("26.17"))).toBe(path.join("raw", "26.17", "timelines.jsonl"));
  });

  it("seenIdsFile(patch) → data/raw/{patch}/seen-ids.txt", () => {
    expect(suffix(seenIdsFile("26.17"))).toBe(path.join("raw", "26.17", "seen-ids.txt"));
  });

  it("aggregatedDir(patch) → data/aggregated/{patch}", () => {
    expect(suffix(aggregatedDir("26.17"))).toBe(path.join("aggregated", "26.17"));
  });

  it("deltasFile(from,to) → data/aggregated/deltas/{from}_{to}.json", () => {
    expect(suffix(deltasFile("26.16", "26.17"))).toBe(
      path.join("aggregated", "deltas", "26.16_26.17.json")
    );
  });

  it("notesFile(patch) → data/aggregated/notes/{patch}.json", () => {
    expect(suffix(notesFile("26.17"))).toBe(path.join("aggregated", "notes", "26.17.json"));
  });

  it("llmCacheDir() → data/cache/llm", () => {
    expect(suffix(llmCacheDir())).toBe(path.join("cache", "llm"));
  });
});
