// src/pipeline/collect/timeline.ts
// F8: 패치당 1~2천 매치 타임라인 표본 수집 — 상세 수집과 별도 큐, reduce-on-ingest(JSONL).
// TODO(F8): riot-client 타임라인 엔드포인트 연결

import type { PatchId } from "../types";

export interface TimelineSampleOptions {
  patch: PatchId;
  matchIds: string[];
  outFile: string;
}

export async function collectTimelineSample(options: TimelineSampleOptions): Promise<void> {
  throw new Error(
    `TODO(F8): collectTimelineSample(patch=${options.patch}, n=${options.matchIds.length}, out=${options.outFile}) not implemented`
  );
}
