// src/pipeline/aggregate/__tests__/run-aggregate.test.ts
// scripts/run-aggregate.ts는 CLI 진입점이지만 `main()` 실행은 isMainModule 가드로 막혀 있어
// (node:url pathToFileURL 비교) import만으로는 부수효과가 없다 — loadJsonl/parseArgs를 그대로
// 단위 테스트한다. vitest include는 src/**/*.test.ts만 수집하므로 이 파일이 위치는
// aggregate/__tests__ 이지만 scripts/를 상대경로로 import한다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadJsonl, parseArgs } from "../../../../scripts/run-aggregate";

describe("run-aggregate: parseArgs", () => {
  it("--patch가 없으면 에러를 던진다", () => {
    expect(() => parseArgs([])).toThrow(/--patch/);
  });

  it("--patch와 --data-root를 파싱한다", () => {
    expect(parseArgs(["--patch", "26.17", "--data-root", "/tmp/x"])).toEqual({
      patch: "26.17",
      dataRoot: "/tmp/x",
    });
  });
});

describe("run-aggregate: loadJsonl", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patchdrift-run-aggregate-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("존재하지 않는 파일은 빈 결과를 반환한다", () => {
    const result = loadJsonl(path.join(tmpDir, "nope.jsonl"));
    expect(result).toEqual({ rows: [], skipped: 0 });
  });

  it("정상 라인만 파싱하고 깨진 라인은 카운트 후 skip한다", () => {
    const file = path.join(tmpDir, "matches.jsonl");
    const lines = [
      JSON.stringify({ a: 1 }),
      "{ broken json,,,",
      JSON.stringify({ a: 2 }),
      "", // 빈 줄(트리밍 후 무시)
      "{ incomplete: true", // 크롤러 append 도중 잘린 마지막 줄 시뮬레이션
    ];
    fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");

    const result = loadJsonl<{ a: number }>(file);
    expect(result.rows).toEqual([{ a: 1 }, { a: 2 }]);
    expect(result.skipped).toBe(2);
  });
});
