// src/pipeline/collect/crawler.ts
// 매치 상세 전량 수집기 — gameVersion 접두 컷 + reduce-on-ingest(JSONL) 기록.
// TODO(F1): riot-client·checkpoint 연결, 파일 단위 idempotent 재개

import type { MatchSlim, PatchId } from "../types";

export interface CrawlOptions {
  patch: PatchId;
  matchIds: string[];
  outFile: string;
}

export async function crawlMatches(options: CrawlOptions): Promise<MatchSlim[]> {
  throw new Error(
    `TODO(F1): crawlMatches(patch=${options.patch}, n=${options.matchIds.length}, out=${options.outFile}) not implemented`
  );
}
