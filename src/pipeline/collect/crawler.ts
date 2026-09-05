// src/pipeline/collect/crawler.ts
// 매치 상세 전량 수집기 — 시드 puuid 순회 → 매치ID(시간창 후보 축소) → 상세 조회 →
// gameVersion 접두 컷 → reduce-on-ingest(JSONL append) + seen-ids 인덱스 + collect-state 재개.
// PLAN F1: "패치당 목표 1만, 최소 2천 ... gameVersion 접두 컷, 파일 단위 idempotent 재개".
// console은 여기서 찍지 않는다(scripts만) — 진행 상황은 onProgress 콜백으로만 노출한다.
//
// 재개 커서 설계(scope-critic 결함 1 수정): collect-state.json은 puuid "인덱스"가 아니라
// puuid "값"(cursorPuuid)을 저장한다. 시드는 24시간 TTL로 재생성되고 티어 내 LP 순서가 바뀔 수
// 있어, 인덱스를 그대로 재사용하면 재생성 후 다른 puuid를 가리켜 앞쪽 puuid가 영구 스킵된다.
// 재개 시 현재 시드 배열에서 cursorPuuid의 위치를 찾아 그 지점부터 진행하고, 시드가
// 재생성됐거나(seedCreatedAtMs 불일치) cursorPuuid를 찾지 못하면 인덱스 0부터 다시 시작한다
// (seen-ids가 매치 단위 dedup을 보장하므로 안전 — 재조회 API 비용만 감수한다).
//
// 커서 전진 규칙: puuid 하나의 페이지 순회를 완전히 마쳤을 때만("소진" — 마지막 페이지 도달
// 또는 policy cap인 maxPagesPerPuuid 도달) 전진한다. target 도달·중단 신호·매치ID 조회 실패로
// 중간에 멈추면 그 puuid에서 다시 시작한다. 매치ID 조회가 실패한 puuid는 "frozen" 지점으로
// 기억해 — 이후 다른 puuid가 성공적으로 처리되더라도 커서가 그 지점을 넘어가지 않게 한다
// (그렇지 않으면 실패한 puuid가 영구히 재시도되지 못하고 스킵된다).

import type { PatchId } from "../types";
import type { LeagueTier, RiotClient, RiotMatchDto } from "./riot-client";
import { toMatchSlim } from "./riot-client";
import { canonicalPatch } from "../shared/patches";
import { collectSeedPuuids } from "./seed";
import { patchWindow, type PatchWindow } from "./patch-calendar";
import {
  appendJsonl,
  appendSeenId,
  countJsonlLines,
  loadCollectState,
  loadSeenIds,
  resolveMatchesJsonl,
  saveCollectState,
  type CheckpointPaths,
} from "./checkpoint";

/** 매치ID 조회(getMatchIdsByPuuid)가 이 횟수만큼 연속으로 throw하면 키/네트워크 문제로 보고
 * 전체 크롤을 중단한다(다음 puuid로 계속 넘어가며 조용히 에러만 쌓지 않는다). */
const DEFAULT_MAX_CONSECUTIVE_IDS_FAILURES = 10;

export interface CrawlWindow {
  startTime?: number;
  endTime?: number;
}

export interface CrawlProgressSnapshot {
  /** 이 패치의 누적 수집 매치 수(이전 실행분 포함, 이번 실행분도 반영). */
  collected: number;
  /** 누적 목표 매치 수. */
  target: number;
  /** seen-ids 집합 크기(수집 완료 + 컷 탈락 + 404 포함). */
  seen: number;
  /** 이번 실행 시작 이후 신규 수집 속도(분당 매치 수). */
  rateMatchesPerMin: number;
}

export type CrawlProgressCallback = (snapshot: CrawlProgressSnapshot) => void;

export interface CrawlPatchOptions {
  patch: PatchId;
  /** 이 패치의 누적 목표 매치 수(이미 수집된 분 포함) — 도달 시 종료. */
  target: number;
  /** 매치ID 조회 시간창(후보 축소용). 생략 시 patch-calendar에서 계산한다. */
  window?: CrawlWindow;
  /** puuid당 getMatchIdsByPuuid count. 기본 100. */
  idsPerPuuid?: number;
  /** puuid당 최대 페이지 수(각 페이지 = idsPerPuuid개 요청). 기본 3. */
  maxPagesPerPuuid?: number;
  /** match-v5 queue 필터. 기본 420(솔로랭크). */
  queue?: number;
  /** 시드 티어 순서. 기본 챌린저→GM→마스터. */
  tiers?: readonly LeagueTier[];
  /** 시드 puuid 개수 상한(테스트/디버깅용). */
  seedLimit?: number;
  /** 진행 로그 간격(신규 수집 매치 기준). 기본 50. */
  logEvery?: number;
  onProgress?: CrawlProgressCallback;
  /** 매치ID 조회 연속 실패 허용 횟수. 기본 10(테스트에서 낮춰 주입). */
  maxConsecutiveIdsFailures?: number;
  /** 테스트 주입용 dataRoot 오버라이드 — checkpoint.ts/seed.ts에 그대로 전달되며, 이들은
   * shared/paths.ts 헬퍼의 선택적 dataRoot 인자로 흡수한다(2026-09-05 리팩토링). */
  dataRoot?: string;
  /** 테스트 주입용 시계. */
  nowMs?: () => number;
  /** SIGINT 등 중단 신호 — 매치/페이지/puuid 경계에서 확인해 정상 종료한다(append 구조라
   * 별도 flush가 필요 없다 — 이미 쓴 줄까지는 그대로 유효하다). */
  signal?: AbortSignal;
}

export interface CrawlResult {
  /** 이번 실행에서 새로 수집한 매치 수. */
  collected: number;
  /** gameVersion 접두 컷 탈락 개수(이번 실행). */
  skippedVersion: number;
  /** seen-ids에 이미 있어 재조회 없이 건너뛴 개수(이번 실행). */
  skippedSeen: number;
  /** getMatchIdsByPuuid/getMatch/toMatchSlim 실패 건수(이번 실행). */
  errors: number;
}

type PuuidOutcome = "resolved" | "ids-failure" | "target" | "abort";

function resolveWindow(patch: PatchId, window: CrawlWindow | undefined, nowMs: () => number): PatchWindow {
  if (window?.startTime !== undefined) {
    return { startTime: window.startTime, endTime: window.endTime ?? Math.floor(nowMs() / 1000) };
  }
  return patchWindow(patch, nowMs);
}

/** collect-state.json의 cursorPuuid가 현재 시드 배열에서 재개 가능한지 판정해 시작 인덱스를 정한다. */
function resolveStartIndex(
  puuids: readonly string[],
  cursorPuuid: string | null,
  storedSeedCreatedAtMs: number,
  currentSeedCreatedAtMs: number
): number {
  if (cursorPuuid === null) return 0;
  if (storedSeedCreatedAtMs !== currentSeedCreatedAtMs) return 0; // 시드 재생성 — 순서 신뢰 불가
  const idx = puuids.indexOf(cursorPuuid);
  return idx === -1 ? 0 : idx; // 시드에서 사라진 puuid도 처음부터(seen-ids가 중복을 막는다)
}

export async function crawlPatch(client: RiotClient, options: CrawlPatchOptions): Promise<CrawlResult> {
  const idsPerPuuid = options.idsPerPuuid ?? 100;
  const maxPagesPerPuuid = options.maxPagesPerPuuid ?? 3;
  const queue = options.queue ?? 420;
  const logEvery = options.logEvery ?? 50;
  const maxConsecutiveIdsFailures = options.maxConsecutiveIdsFailures ?? DEFAULT_MAX_CONSECUTIVE_IDS_FAILURES;
  const nowMs = options.nowMs ?? Date.now;
  const checkpointPaths: CheckpointPaths = { patch: options.patch, dataRoot: options.dataRoot };
  const matchesFile = resolveMatchesJsonl(checkpointPaths);
  const window = resolveWindow(options.patch, options.window, nowMs);

  const seedResult = await collectSeedPuuids(client, {
    patch: options.patch,
    tiers: options.tiers,
    limit: options.seedLimit,
    dataRoot: options.dataRoot,
    nowMs,
  });
  const puuids = seedResult.puuids;

  const seenIds = loadSeenIds(checkpointPaths);
  const state = loadCollectState(checkpointPaths);
  let cumulativeCollected = countJsonlLines(matchesFile);

  const result: CrawlResult = { collected: 0, skippedVersion: 0, skippedSeen: 0, errors: 0 };
  const startedAtMs = nowMs();

  function isAborted(): boolean {
    return Boolean(options.signal?.aborted);
  }

  function reportProgress(): void {
    const elapsedMin = Math.max((nowMs() - startedAtMs) / 60_000, 1 / 60_000);
    options.onProgress?.({
      collected: cumulativeCollected,
      target: options.target,
      seen: seenIds.size,
      rateMatchesPerMin: result.collected / elapsedMin,
    });
  }

  /** puuid 1개의 페이지를 끝까지(또는 target/중단/실패까지) 순회한다. */
  async function processPuuidPages(puuid: string): Promise<PuuidOutcome> {
    for (let page = 0; page < maxPagesPerPuuid; page++) {
      if (isAborted()) return "abort";
      if (cumulativeCollected >= options.target) return "target";

      let ids: string[];
      try {
        ids = await client.getMatchIdsByPuuid(puuid, {
          startTime: window.startTime,
          endTime: window.endTime,
          queue,
          type: "ranked",
          start: page * idsPerPuuid,
          count: idsPerPuuid,
        });
      } catch {
        result.errors += 1;
        return "ids-failure"; // 이 puuid는 포기 — 커서를 전진시키지 않는다(다음 실행 재시도).
      }
      if (ids.length === 0) return "resolved"; // 매치 소진 — 실패가 아니라 정상 완료.

      for (const matchId of ids) {
        if (isAborted()) return "abort";
        if (cumulativeCollected >= options.target) return "target";

        if (seenIds.has(matchId)) {
          result.skippedSeen += 1;
          continue;
        }

        let match: RiotMatchDto | null;
        try {
          match = await client.getMatch(matchId);
        } catch {
          result.errors += 1;
          continue; // 매치 단위 네트워크 실패 — seen에 남기지 않아 다음 실행에서 재시도된다.
        }

        if (match === null) {
          // 404 — 매치 없음. 영구적 사실이므로 seen에 남겨 재조회를 막는다.
          seenIds.add(matchId);
          appendSeenId(checkpointPaths, matchId);
          continue;
        }

        if (canonicalPatch(match.info.gameVersion) !== options.patch) {
          result.skippedVersion += 1;
          seenIds.add(matchId);
          appendSeenId(checkpointPaths, matchId);
          continue;
        }

        try {
          const slim = toMatchSlim(match);
          appendJsonl(matchesFile, slim);
          seenIds.add(matchId);
          appendSeenId(checkpointPaths, matchId);
          cumulativeCollected += 1;
          result.collected += 1;
          if (result.collected % logEvery === 0) reportProgress();
        } catch {
          // 데이터 불변식 위반(참가자 10명/팀 2개가 아님) — 영구 결함으로 간주해 seen에 기록한다.
          result.errors += 1;
          seenIds.add(matchId);
          appendSeenId(checkpointPaths, matchId);
        }
      }

      if (ids.length < idsPerPuuid) return "resolved"; // 마지막 페이지 — 매치 소진.
    }
    return "resolved"; // maxPagesPerPuuid(policy cap) 도달 — 실패가 아니라 의도된 컷.
  }

  const startIndex = resolveStartIndex(puuids, state.cursorPuuid, state.seedCreatedAtMs, seedResult.createdAtMs);

  let i = startIndex;
  let frozenIndex: number | null = null;
  let consecutiveIdsFailures = 0;
  let stopReason: "target" | "abort" | "too-many-failures" | "exhausted" = "exhausted";

  for (;;) {
    if (isAborted()) {
      stopReason = "abort";
      break;
    }
    if (cumulativeCollected >= options.target) {
      stopReason = "target";
      break;
    }
    if (i >= puuids.length) {
      stopReason = "exhausted";
      break;
    }

    const outcome = await processPuuidPages(puuids[i]);

    if (outcome === "target") {
      stopReason = "target";
      break;
    }
    if (outcome === "abort") {
      stopReason = "abort";
      break;
    }
    if (outcome === "ids-failure") {
      if (frozenIndex === null) frozenIndex = i;
      consecutiveIdsFailures += 1;
      if (consecutiveIdsFailures >= maxConsecutiveIdsFailures) {
        stopReason = "too-many-failures";
        break;
      }
      i += 1;
      continue;
    }

    // outcome === "resolved"
    consecutiveIdsFailures = 0;
    i += 1;
  }

  const finalCursorIndex = stopReason === "exhausted" && frozenIndex === null ? null : (frozenIndex ?? i);

  saveCollectState(checkpointPaths, {
    cursorPuuid: finalCursorIndex !== null ? puuids[finalCursorIndex] : null,
    seedCreatedAtMs: seedResult.createdAtMs,
    updatedAtMs: nowMs(),
  });

  reportProgress();
  return result;
}
