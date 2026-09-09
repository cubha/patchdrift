import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendJsonl,
  appendSeenId,
  countJsonlLines,
  loadCollectState,
  loadSeenIds,
  resolveCollectStateFile,
  resolveMatchesJsonl,
  resolveSeenIdsFile,
  saveCollectState,
  type CheckpointPaths,
} from "../checkpoint";

let dataRoot: string;
let paths: CheckpointPaths;

beforeEach(() => {
  dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patchgap-checkpoint-"));
  paths = { patch: "26.17", dataRoot };
});

afterEach(() => {
  fs.rmSync(dataRoot, { recursive: true, force: true });
});

describe("resolve*File — dataRoot 오버라이드", () => {
  it("dataRoot가 있으면 data/raw/{patch}/ 아래로 경로를 계산한다", () => {
    expect(resolveSeenIdsFile(paths)).toBe(path.join(dataRoot, "raw", "26.17", "seen-ids.txt"));
    expect(resolveMatchesJsonl(paths)).toBe(path.join(dataRoot, "raw", "26.17", "matches.jsonl"));
    expect(resolveCollectStateFile(paths)).toBe(path.join(dataRoot, "raw", "26.17", "collect-state.json"));
  });
});

describe("seen-ids", () => {
  it("파일이 없으면 빈 Set을 반환한다", () => {
    expect(loadSeenIds(paths)).toEqual(new Set());
  });

  it("appendSeenId로 기록한 matchId를 loadSeenIds가 Set으로 복원한다", () => {
    appendSeenId(paths, "KR_1");
    appendSeenId(paths, "KR_2");
    appendSeenId(paths, "KR_1"); // 중복 append도 허용 — Set이 흡수한다.

    const loaded = loadSeenIds(paths);
    expect(loaded).toEqual(new Set(["KR_1", "KR_2"]));
  });

  it("append는 동기 appendFileSync로 즉시 디스크에 반영된다(원자성)", () => {
    appendSeenId(paths, "KR_1");
    const raw = fs.readFileSync(resolveSeenIdsFile(paths), "utf8");
    expect(raw).toBe("KR_1\n");
  });
});

describe("JSONL", () => {
  it("countJsonlLines — 파일 없으면 0", () => {
    expect(countJsonlLines(resolveMatchesJsonl(paths))).toBe(0);
  });

  it("appendJsonl로 기록한 줄 수를 countJsonlLines가 정확히 센다", () => {
    const file = resolveMatchesJsonl(paths);
    appendJsonl(file, { matchId: "KR_1" });
    appendJsonl(file, { matchId: "KR_2" });
    expect(countJsonlLines(file)).toBe(2);

    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    expect(JSON.parse(lines[0])).toEqual({ matchId: "KR_1" });
    expect(JSON.parse(lines[1])).toEqual({ matchId: "KR_2" });
  });
});

describe("collect-state", () => {
  it("파일이 없으면 cursorPuuid=null 기본값을 반환한다", () => {
    expect(loadCollectState(paths)).toEqual({ cursorPuuid: null, seedCreatedAtMs: 0, updatedAtMs: 0 });
  });

  it("saveCollectState → loadCollectState 왕복이 값을 보존한다", () => {
    saveCollectState(paths, { cursorPuuid: "p7", seedCreatedAtMs: 999, updatedAtMs: 12345 });
    expect(loadCollectState(paths)).toEqual({ cursorPuuid: "p7", seedCreatedAtMs: 999, updatedAtMs: 12345 });
  });

  it("재저장 시 이전 값을 덮어쓴다", () => {
    saveCollectState(paths, { cursorPuuid: "p1", seedCreatedAtMs: 100, updatedAtMs: 100 });
    saveCollectState(paths, { cursorPuuid: "p2", seedCreatedAtMs: 200, updatedAtMs: 200 });
    expect(loadCollectState(paths)).toEqual({ cursorPuuid: "p2", seedCreatedAtMs: 200, updatedAtMs: 200 });
  });
});
