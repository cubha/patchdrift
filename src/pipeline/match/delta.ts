// src/pipeline/match/delta.ts
// F4 — 두 패치 집계(data/aggregated/{patch}/*.json) 사이의 통계 델타를 계산해 DeltaRecord[]로
// 만든다. 노트 짝짓기(entity-match.ts)·최종 판정(verdict.ts)은 이 파일 몫이 아니다 — 여기서
// 나오는 레코드의 `status`는 항상 `"no-change"`(자리표시자, verdict.assignStatus가 덮어쓴다),
// `matchedNoteId`/`matchedNoteIds`/`causes`도 항상 비어있다.
//
// 통계 스택: stats.ts(ST-05)의 newcombeDiffInterval/twoProportionPValue/benjaminiHochberg/
// meanDiffInterval/passesSampleGate를 그대로 쓴다. 단 "연속 지표(골드·초) 두 그룹 평균차 p값"은
// stats.ts에 없다(meanDiffInterval은 CI만 반환) — ST-05 소유 파일을 이번 배치 범위 밖에서 건드리지
// 않기 위해 se/z 계산을 이 파일에 로컬로 둔다(erf 근사는 stats.ts의 것과 동일한 방식, 의도적 중복
// — 아래 `normalCdfApprox` 참고).

import fs from "node:fs";
import path from "node:path";
import type {
  ChampionStat,
  DeltaEntityType,
  DeltaRecord,
  Interval,
  ItemStat,
  LaneGoldStat,
  LanePosition,
  MatchSlim,
  ObjectiveStat,
  PatchId,
  PatchSummary,
} from "../types";
import { DATA_ROOT } from "../shared/paths";
import {
  FDR_ALPHA,
  benjaminiHochberg,
  meanDiffInterval,
  newcombeDiffInterval,
  twoProportionPValue,
} from "../aggregate/stats";
import type { DdragonData } from "./ddragon";

/** 패치 1개의 집계 5종 — data/aggregated/{patch}/*.json을 그대로 메모리에 올린 형태. */
export interface AggregatedPatch {
  patch: PatchId;
  champions: ChampionStat[];
  items: ItemStat[];
  lanes: LaneGoldStat[];
  objectives: ObjectiveStat;
  summary: PatchSummary;
}

interface RowsFile<T> {
  rows: T[];
}
interface DataFile<T> {
  data: T;
}

function readRowsFile<T>(filePath: string, patch: PatchId): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `aggregated 파일이 없습니다: ${filePath} — 먼저 실행: npx tsx scripts/run-aggregate.ts --patch ${patch}`
    );
  }
  return (JSON.parse(fs.readFileSync(filePath, "utf8")) as RowsFile<T>).rows;
}

function readDataFile<T>(filePath: string, patch: PatchId): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `aggregated 파일이 없습니다: ${filePath} — 먼저 실행: npx tsx scripts/run-aggregate.ts --patch ${patch}`
    );
  }
  return (JSON.parse(fs.readFileSync(filePath, "utf8")) as DataFile<T>).data;
}

/** `data/aggregated/{patch}/*.json` 5종을 읽어 AggregatedPatch로 만든다. 파일이 없으면(아직
 * run-aggregate를 안 돌린 패치) 정확한 복구 명령을 담은 에러로 즉시 실패한다(파이프라인 중간에서
 * 애매하게 죽지 않도록). */
export function loadAggregatedPatch(patch: PatchId, dataRoot: string = DATA_ROOT): AggregatedPatch {
  const dir = path.join(dataRoot, "aggregated", patch);
  return {
    patch,
    champions: readRowsFile<ChampionStat>(path.join(dir, "champions.json"), patch),
    items: readRowsFile<ItemStat>(path.join(dir, "items.json"), patch),
    lanes: readRowsFile<LaneGoldStat>(path.join(dir, "lanes.json"), patch),
    objectives: readDataFile<ObjectiveStat>(path.join(dir, "objectives.json"), patch),
    summary: readDataFile<PatchSummary>(path.join(dir, "summary.json"), patch),
  };
}

// ─── 연속 지표(골드·초) 평균차 p값 — stats.ts erf 근사와 동일 방식(의도적 중복, 위 헤더 참고) ───

function erfApprox(x: number): number {
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (ax > 4) return sign;
  let term = ax;
  let sum = term;
  for (let n = 1; n < 300; n++) {
    term *= (-ax * ax * (2 * n - 1)) / (n * (2 * n + 1));
    sum += term;
    if (Math.abs(term) < 1e-18) break;
  }
  return sign * (2 / Math.sqrt(Math.PI)) * sum;
}

function normalCdfApprox(x: number): number {
  return 0.5 * (1 + erfApprox(x / Math.SQRT2));
}

/** 두 그룹 평균차(mean2-mean1)의 양측 p값 — z = diff/se, se = sqrt(sd1²/n1 + sd2²/n2). */
export function meanDiffPValue(
  mean1: number,
  sd1: number,
  n1: number,
  mean2: number,
  sd2: number,
  n2: number
): number {
  const se = Math.sqrt((sd1 * sd1) / n1 + (sd2 * sd2) / n2);
  if (se === 0) return mean1 === mean2 ? 1 : 0;
  const z = (mean2 - mean1) / se;
  return 2 * (1 - normalCdfApprox(Math.abs(z)));
}

// ─── 원천 매치 ID 표본(엔티티별 최대 10개) — matches.jsonl 단일 스트리밍 패스 ───

const MATCH_ID_SAMPLE_SIZE = 10;

export interface EntityMatchIdSamples {
  /** championId → 표본 matchId 배열(최대 10개). */
  championMatchIds: Map<number, string[]>;
  /** itemId → 표본 matchId 배열(최대 10개). */
  itemMatchIds: Map<number, string[]>;
}

/**
 * `matches.jsonl`을 한 번만 스트리밍해 관심 championId/itemId별 표본 matchId(최대 10개)를 모은다.
 * 엔티티 수백 개마다 파일을 재스캔하면 수천 매치 × 수백 엔티티로 느려지므로(실측 26.17 기준
 * 3,405줄·15MB, 계속 증가 중 — advisor 지적) 반드시 단일 패스로 처리한다. 파일이 없으면 빈 결과
 * (에러 아님 — 크롤러가 아직 만들지 않았을 수 있음).
 */
export function sampleMatchIdsByEntity(
  matchesJsonlPath: string,
  championIds: ReadonlySet<number>,
  itemIds: ReadonlySet<number>
): EntityMatchIdSamples {
  const championMatchIds = new Map<number, string[]>();
  const itemMatchIds = new Map<number, string[]>();
  if (!fs.existsSync(matchesJsonlPath)) return { championMatchIds, itemMatchIds };

  const lines = fs.readFileSync(matchesJsonlPath, "utf8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    let match: MatchSlim;
    try {
      match = JSON.parse(line) as MatchSlim;
    } catch {
      continue; // 크롤러가 append 중이라 마지막 줄이 잘려 있을 수 있음 — skip
    }

    const seenChampionsThisMatch = new Set<number>();
    const seenItemsThisMatch = new Set<number>();
    for (const participant of match.participants) {
      if (championIds.has(participant.championId) && !seenChampionsThisMatch.has(participant.championId)) {
        seenChampionsThisMatch.add(participant.championId);
        const bucket = championMatchIds.get(participant.championId) ?? [];
        if (bucket.length < MATCH_ID_SAMPLE_SIZE) {
          bucket.push(match.matchId);
          championMatchIds.set(participant.championId, bucket);
        }
      }
      for (const itemId of participant.items) {
        if (itemId <= 0 || !itemIds.has(itemId) || seenItemsThisMatch.has(itemId)) continue;
        seenItemsThisMatch.add(itemId);
        const bucket = itemMatchIds.get(itemId) ?? [];
        if (bucket.length < MATCH_ID_SAMPLE_SIZE) {
          bucket.push(match.matchId);
          itemMatchIds.set(itemId, bucket);
        }
      }
    }
  }
  return { championMatchIds, itemMatchIds };
}

// ─── aggregatePath 프래그먼트(구현 결정 — PLAN이 "#rows[...]" 형식만 지정, 세부는 이 배치가 확정) ─

function aggPath(after: PatchId, file: string, fragment: string): string {
  return `data/aggregated/${after}/${file}.json#${fragment}`;
}

const LANE_KO_NAME: Record<LanePosition, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "바텀",
  UTILITY: "서포터",
};

const OBJECTIVE_KO_NAME: Record<"dragon" | "herald" | "baron" | "tower", string> = {
  dragon: "용",
  herald: "전령",
  baron: "바론",
  tower: "포탑",
};

const LANE_POSITIONS: readonly LanePosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const OBJECTIVE_NAMES = ["dragon", "herald", "baron", "tower"] as const;

/** q 보정 전 원자료 1건 — buildDeltas 내부에서만 쓰는 중간 표현. */
interface RawDeltaDraft {
  id: string;
  entityType: DeltaEntityType;
  entityKey: string;
  entityName: string;
  metric: string;
  before: number;
  after: number;
  delta: number;
  ci: Interval;
  n: { before: number; after: number };
  p: number;
  aggregatePath: string;
  /** matchIds 표본 조회용 원시 키 — champion=championId(숫자), item=itemId(숫자), 그 외 없음. */
  sampleKey: { kind: "champion"; championId: number } | { kind: "item"; itemId: number } | null;
}

export interface BuildDeltasOptions {
  ddragon: DdragonData;
  /** 테스트 격리용 — 기본은 shared/paths.ts의 DATA_ROOT. matches.jsonl 표본 추출에만 쓰인다. */
  dataRoot?: string;
}

/**
 * 두 패치 집계의 통계 델타를 계산한다. 반환 레코드는 아직 패치노트와 짝지어지지 않은 상태 —
 * `status`는 전부 `"no-change"`(자리표시자), `matchedNoteId(s)`/`causes`는 비어 있다. 실제 판정은
 * entity-match.ts(1단) → verdict.ts(assignStatus)가 채운다.
 *
 * 측정 불가 케이스는 레코드 자체를 생략한다(0으로 얼버무리지 않는다 — CLAUDE.md "무근거 문장은
 * 회색" 원칙의 연장): 라인 골드@14는 `n14===0`인 쪽이 있으면 스킵, 오브젝트는 `mean===null`인
 * 쪽이 있으면 스킵, 매치 평균은 `matches===0`인 쪽이 있으면 스킵. 반대로 픽률/밴률/채택률/승률은
 * 분모(totalMatches/totalParticipants)가 항상 존재해 n=0이어도 "진짜 0%"라는 유효한 값이므로
 * 항상 레코드를 만든다(승률의 표본 부족 여부는 verdict.assignStatus가 `insufficient-sample`로
 * 판정한다 — 여기서 생략하지 않는다).
 */
export function buildDeltas(
  before: AggregatedPatch,
  after: AggregatedPatch,
  options: BuildDeltasOptions
): DeltaRecord[] {
  const { ddragon } = options;
  const dataRoot = options.dataRoot ?? DATA_ROOT;
  const drafts: RawDeltaDraft[] = [];

  // ─── 챔피언 ───
  const beforeChampByKey = new Map<string, ChampionStat>();
  for (const row of before.champions) {
    beforeChampByKey.set(`${row.championId}:${row.scope}:${row.position}`, row);
  }
  const afterAllRows = after.champions.filter((r) => r.scope === "all");

  const relevantChampionIds = new Set<number>();

  for (const afterAll of afterAllRows) {
    const beforeAll = beforeChampByKey.get(`${afterAll.championId}:all:`);
    if (!beforeAll) continue; // 이전 패치에 아예 없던 챔피언(신규) — 비교 기준이 없어 스킵

    const ddragonChamp = ddragon.champions.byKey(afterAll.championId);
    if (!ddragonChamp) continue; // ddragon 매핑 실패(챔피언 id는 numeric join이라 실무상 거의 없음)

    relevantChampionIds.add(afterAll.championId);
    const entityKey = ddragonChamp.id;
    const entityName = ddragonChamp.name;

    // pickRate (scope=all, 항상 계산 가능 — totalMatches가 분모)
    {
      const ci = newcombeDiffInterval(beforeAll.n, beforeAll.totalMatches, afterAll.n, afterAll.totalMatches);
      const p = twoProportionPValue(beforeAll.n, beforeAll.totalMatches, afterAll.n, afterAll.totalMatches);
      drafts.push({
        id: `champion:${entityKey}:pickRate`,
        entityType: "champion",
        entityKey,
        entityName,
        metric: "pickRate",
        before: beforeAll.pickRate,
        after: afterAll.pickRate,
        delta: afterAll.pickRate - beforeAll.pickRate,
        ci,
        n: { before: beforeAll.totalMatches, after: afterAll.totalMatches },
        p,
        aggregatePath: aggPath(after.patch, "champions", `rows[championId=${afterAll.championId},scope=all]`),
        sampleKey: { kind: "champion", championId: afterAll.championId },
      });
    }

    // banRate (scope=all만 값이 있음 — types.ts 계약). 원시 밴 횟수는 저장돼 있지 않아
    // banRate*totalMatches를 반올림해 역산한다(구현 결정 — VERIFY-SPEC 참고).
    if (beforeAll.banRate !== null && afterAll.banRate !== null) {
      const banBefore = Math.round(beforeAll.banRate * beforeAll.totalMatches);
      const banAfter = Math.round(afterAll.banRate * afterAll.totalMatches);
      const ci = newcombeDiffInterval(banBefore, beforeAll.totalMatches, banAfter, afterAll.totalMatches);
      const p = twoProportionPValue(banBefore, beforeAll.totalMatches, banAfter, afterAll.totalMatches);
      drafts.push({
        id: `champion:${entityKey}:banRate`,
        entityType: "champion",
        entityKey,
        entityName,
        metric: "banRate",
        before: beforeAll.banRate,
        after: afterAll.banRate,
        delta: afterAll.banRate - beforeAll.banRate,
        ci,
        n: { before: beforeAll.totalMatches, after: afterAll.totalMatches },
        p,
        aggregatePath: aggPath(after.patch, "champions", `rows[championId=${afterAll.championId},scope=all]`),
        sampleKey: { kind: "champion", championId: afterAll.championId },
      });
    }

    // winRate (scope=all) — n 게이트 통과 여부와 무관하게 항상 계산(게이트 판정은 verdict.ts 몫).
    {
      const winsBefore = Math.round(beforeAll.winRate * beforeAll.n);
      const winsAfter = Math.round(afterAll.winRate * afterAll.n);
      const ci = newcombeDiffInterval(winsBefore, beforeAll.n, winsAfter, afterAll.n);
      const p = twoProportionPValue(winsBefore, beforeAll.n, winsAfter, afterAll.n);
      drafts.push({
        id: `champion:${entityKey}:winRate`,
        entityType: "champion",
        entityKey,
        entityName,
        metric: "winRate",
        before: beforeAll.winRate,
        after: afterAll.winRate,
        delta: afterAll.winRate - beforeAll.winRate,
        ci,
        n: { before: beforeAll.n, after: afterAll.n },
        p,
        aggregatePath: aggPath(after.patch, "champions", `rows[championId=${afterAll.championId},scope=all]`),
        sampleKey: { kind: "champion", championId: afterAll.championId },
      });
    }

    // 포지션별 픽률/승률 — 명명된 포지션 5종 전부 순회. 한쪽에 행이 없으면(그 포지션에서 n=0)
    // 해당 챔피언이 그 패치에 존재했다는 전제(all 행 존재) 하에 진짜 0으로 간주한다(위 함수
    // 주석 참고) — totalMatches는 그 패치 all 행 값을 공유해서 쓴다.
    for (const position of LANE_POSITIONS) {
      const beforePos = beforeChampByKey.get(`${afterAll.championId}:position:${position}`);
      const afterPos = after.champions.find(
        (r) => r.championId === afterAll.championId && r.scope === "position" && r.position === position
      );
      const beforeN = beforePos?.n ?? 0;
      const beforeWinRate = beforePos?.winRate ?? 0;
      const afterN = afterPos?.n ?? 0;
      const afterWinRate = afterPos?.winRate ?? 0;
      if (beforeN === 0 && afterN === 0) continue; // 그 포지션은 양쪽 다 아예 안 나온 조합 — 델타 무의미

      const posEntityKeyBase = `champion:${entityKey}:${position}`;

      // pickRate(포지션 비중) = n/totalMatches
      {
        const ci = newcombeDiffInterval(beforeN, beforeAll.totalMatches, afterN, afterAll.totalMatches);
        const p = twoProportionPValue(beforeN, beforeAll.totalMatches, afterN, afterAll.totalMatches);
        drafts.push({
          id: `${posEntityKeyBase}:pickRate`,
          entityType: "champion",
          entityKey,
          entityName,
          metric: "pickRate",
          before: beforeAll.totalMatches === 0 ? 0 : beforeN / beforeAll.totalMatches,
          after: afterAll.totalMatches === 0 ? 0 : afterN / afterAll.totalMatches,
          delta:
            (afterAll.totalMatches === 0 ? 0 : afterN / afterAll.totalMatches) -
            (beforeAll.totalMatches === 0 ? 0 : beforeN / beforeAll.totalMatches),
          ci,
          n: { before: beforeAll.totalMatches, after: afterAll.totalMatches },
          p,
          aggregatePath: aggPath(
            after.patch,
            "champions",
            `rows[championId=${afterAll.championId},scope=position,position=${position}]`
          ),
          sampleKey: { kind: "champion", championId: afterAll.championId },
        });
      }

      // winRate(포지션)
      {
        const winsBefore = Math.round(beforeWinRate * beforeN);
        const winsAfter = Math.round(afterWinRate * afterN);
        const ci = newcombeDiffInterval(winsBefore, beforeN, winsAfter, afterN);
        const p = twoProportionPValue(winsBefore, beforeN, winsAfter, afterN);
        drafts.push({
          id: `${posEntityKeyBase}:winRate`,
          entityType: "champion",
          entityKey,
          entityName,
          metric: "winRate",
          before: beforeWinRate,
          after: afterWinRate,
          delta: afterWinRate - beforeWinRate,
          ci,
          n: { before: beforeN, after: afterN },
          p,
          aggregatePath: aggPath(
            after.patch,
            "champions",
            `rows[championId=${afterAll.championId},scope=position,position=${position}]`
          ),
          sampleKey: { kind: "champion", championId: afterAll.championId },
        });
      }
    }
  }

  // ─── 아이템(완성템만) ───
  const beforeItemById = new Map<number, ItemStat>();
  for (const row of before.items) beforeItemById.set(row.itemId, row);

  const relevantItemIds = new Set<number>();

  for (const afterItem of after.items) {
    if (!ddragon.items.isCompleted(afterItem.itemId)) continue;
    const beforeItem = beforeItemById.get(afterItem.itemId);
    if (!beforeItem) continue; // 이전 패치에 등장 이력 없음 — 비교 기준 없음

    const ddragonItem = ddragon.items.byId(afterItem.itemId);
    if (!ddragonItem) continue; // 실무상 발생하지 않음(afterItem.itemId가 ddragon에 있어야 isCompleted가 true를 냄)

    relevantItemIds.add(afterItem.itemId);
    const entityKey = String(afterItem.itemId);
    const ci = newcombeDiffInterval(
      beforeItem.n,
      beforeItem.totalParticipants,
      afterItem.n,
      afterItem.totalParticipants
    );
    const p = twoProportionPValue(
      beforeItem.n,
      beforeItem.totalParticipants,
      afterItem.n,
      afterItem.totalParticipants
    );
    drafts.push({
      id: `item:${entityKey}:adoptionRate`,
      entityType: "item",
      entityKey,
      entityName: ddragonItem.name,
      metric: "adoptionRate",
      before: beforeItem.adoptionRate,
      after: afterItem.adoptionRate,
      delta: afterItem.adoptionRate - beforeItem.adoptionRate,
      ci,
      n: { before: beforeItem.totalParticipants, after: afterItem.totalParticipants },
      p,
      aggregatePath: aggPath(after.patch, "items", `rows[itemId=${afterItem.itemId}]`),
      sampleKey: { kind: "item", itemId: afterItem.itemId },
    });
  }

  // ─── 라인 골드 ───
  const beforeLaneByPos = new Map<LanePosition, LaneGoldStat>();
  for (const row of before.lanes) beforeLaneByPos.set(row.position, row);

  for (const afterLane of after.lanes) {
    const beforeLane = beforeLaneByPos.get(afterLane.position);
    if (!beforeLane) continue; // 표본 없음(n=0인 포지션은 애초에 행 자체가 없음 — ST-06 계약)

    // goldAt10 — 행이 존재하면 n>0 보장(ST-06 계약: n=0 포지션은 행 생략)
    {
      const ci = meanDiffInterval(
        beforeLane.goldAt10Avg,
        beforeLane.goldAt10Sd,
        beforeLane.n,
        afterLane.goldAt10Avg,
        afterLane.goldAt10Sd,
        afterLane.n
      );
      const p = meanDiffPValue(
        beforeLane.goldAt10Avg,
        beforeLane.goldAt10Sd,
        beforeLane.n,
        afterLane.goldAt10Avg,
        afterLane.goldAt10Sd,
        afterLane.n
      );
      drafts.push({
        id: `lane:${afterLane.position}:goldAt10`,
        entityType: "lane",
        entityKey: afterLane.position,
        entityName: LANE_KO_NAME[afterLane.position],
        metric: "goldAt10",
        before: beforeLane.goldAt10Avg,
        after: afterLane.goldAt10Avg,
        delta: afterLane.goldAt10Avg - beforeLane.goldAt10Avg,
        ci,
        n: { before: beforeLane.n, after: afterLane.n },
        p,
        aggregatePath: aggPath(after.patch, "lanes", `rows[position=${afterLane.position}]`),
        sampleKey: null,
      });
    }

    // goldAt14 — n14 게이트: 한쪽이라도 0이면 스킵(types.ts 경고: n14=0이면 goldAt14Avg가 실측
    // 없는 0일 수 있음 — 델타로 만들면 가짜 변화가 된다).
    if (beforeLane.n14 > 0 && afterLane.n14 > 0) {
      const ci = meanDiffInterval(
        beforeLane.goldAt14Avg,
        beforeLane.goldAt14Sd,
        beforeLane.n14,
        afterLane.goldAt14Avg,
        afterLane.goldAt14Sd,
        afterLane.n14
      );
      const p = meanDiffPValue(
        beforeLane.goldAt14Avg,
        beforeLane.goldAt14Sd,
        beforeLane.n14,
        afterLane.goldAt14Avg,
        afterLane.goldAt14Sd,
        afterLane.n14
      );
      drafts.push({
        id: `lane:${afterLane.position}:goldAt14`,
        entityType: "lane",
        entityKey: afterLane.position,
        entityName: LANE_KO_NAME[afterLane.position],
        metric: "goldAt14",
        before: beforeLane.goldAt14Avg,
        after: afterLane.goldAt14Avg,
        delta: afterLane.goldAt14Avg - beforeLane.goldAt14Avg,
        ci,
        n: { before: beforeLane.n14, after: afterLane.n14 },
        p,
        aggregatePath: aggPath(after.patch, "lanes", `rows[position=${afterLane.position}]`),
        sampleKey: null,
      });
    }
  }

  // ─── 오브젝트 첫 획득 시각 ───
  for (const name of OBJECTIVE_NAMES) {
    const beforeDetail = before.objectives[name];
    const afterDetail = after.objectives[name];
    if (beforeDetail.mean === null || afterDetail.mean === null) continue; // 실측 없음 — 스킵

    const ci = meanDiffInterval(
      beforeDetail.mean,
      beforeDetail.sd,
      beforeDetail.n,
      afterDetail.mean,
      afterDetail.sd,
      afterDetail.n
    );
    const p = meanDiffPValue(
      beforeDetail.mean,
      beforeDetail.sd,
      beforeDetail.n,
      afterDetail.mean,
      afterDetail.sd,
      afterDetail.n
    );
    drafts.push({
      id: `objective:${name}`,
      entityType: "objective",
      entityKey: name,
      entityName: OBJECTIVE_KO_NAME[name],
      metric: "firstSec",
      before: beforeDetail.mean,
      after: afterDetail.mean,
      delta: afterDetail.mean - beforeDetail.mean,
      ci,
      n: { before: beforeDetail.n, after: afterDetail.n },
      p,
      aggregatePath: aggPath(after.patch, "objectives", `data.${name}`),
      sampleKey: null,
    });
  }

  // ─── 매치 평균(경기 시간) ───
  if (before.summary.matches > 0 && after.summary.matches > 0) {
    const ci = meanDiffInterval(
      before.summary.avgDurationSec,
      before.summary.avgDurationSecSd,
      before.summary.matches,
      after.summary.avgDurationSec,
      after.summary.avgDurationSecSd,
      after.summary.matches
    );
    const p = meanDiffPValue(
      before.summary.avgDurationSec,
      before.summary.avgDurationSecSd,
      before.summary.matches,
      after.summary.avgDurationSec,
      after.summary.avgDurationSecSd,
      after.summary.matches
    );
    drafts.push({
      id: "summary:avgDurationSec",
      entityType: "summary",
      entityKey: "avgDurationSec",
      entityName: "평균 경기 시간",
      metric: "avgDurationSec",
      before: before.summary.avgDurationSec,
      after: after.summary.avgDurationSec,
      delta: after.summary.avgDurationSec - before.summary.avgDurationSec,
      ci,
      n: { before: before.summary.matches, after: after.summary.matches },
      p,
      aggregatePath: aggPath(after.patch, "summary", "data.avgDurationSec"),
      sampleKey: null,
    });
  }

  // ─── BH-FDR 다중비교 보정(전체 델타 공통) ───
  const { q } = benjaminiHochberg(
    drafts.map((d) => d.p),
    FDR_ALPHA
  );

  // ─── 원천 매치 ID 표본(챔피언/아이템만 — 단일 스트리밍 패스) ───
  const matchesPath = path.join(dataRoot, "raw", after.patch, "matches.jsonl");
  const { championMatchIds, itemMatchIds } = sampleMatchIdsByEntity(
    matchesPath,
    relevantChampionIds,
    relevantItemIds
  );

  return drafts.map((draft, index) => {
    let matchIds: string[] = [];
    if (draft.sampleKey?.kind === "champion") {
      matchIds = championMatchIds.get(draft.sampleKey.championId) ?? [];
    } else if (draft.sampleKey?.kind === "item") {
      matchIds = itemMatchIds.get(draft.sampleKey.itemId) ?? [];
    }

    const record: DeltaRecord = {
      id: draft.id,
      entityType: draft.entityType,
      entityKey: draft.entityKey,
      entityName: draft.entityName,
      metric: draft.metric,
      before: draft.before,
      after: draft.after,
      delta: draft.delta,
      ci: draft.ci,
      n: draft.n,
      q: q[index],
      status: "no-change", // 자리표시자 — verdict.assignStatus가 최종 판정으로 덮어쓴다.
      matchedNoteId: null,
      matchedNoteIds: [],
      causes: [],
      evidence: {
        matchIds,
        aggregatePath: draft.aggregatePath,
        noteAnchor: null,
      },
    };
    return record;
  });
}
