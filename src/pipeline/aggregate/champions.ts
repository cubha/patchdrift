// src/pipeline/aggregate/champions.ts
// F2: 챔피언 픽률·밴률·승률(포지션별 + 포지션 합산) 집계. 순수 함수 — 부수효과 없음.
//
// 계약 노트: `ChampionStat.scope`("all"|"position"|"unknown")로 포지션 합산 행(all)·명명된
// 포지션 행(position)·미배정(teamPosition==="") 행(unknown)을 명시적으로 구분한다(types.ts 정식
// 계약, 2026-09-05 ST-06 실장 중 발견해 승격). `banRate`/`ci.ban`은 포지션과 무관한 챔피언 단위
// 지표라 scope==="all" 행에만 값이 있고 나머지는 null — ST-08이 같은 밴을 여러 행에서 중복
// 합산하는 것을 계약으로 차단한다.

import type { ChampionRateCi, ChampionStat, LanePosition, MatchSlim, PatchId, TeamPosition } from "../types";
import { WIN_RATE_MIN_N, wilsonInterval } from "./stats";

const LANE_POSITIONS: readonly LanePosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

interface PositionAgg {
  picks: number;
  wins: number;
}

interface ChampionAgg {
  championName: string;
  /** 키: LanePosition 5종 + "" (미배정). */
  byPosition: Map<TeamPosition, PositionAgg>;
  allPicks: number;
  allWins: number;
}

function bump(agg: Map<TeamPosition, PositionAgg>, key: TeamPosition, win: boolean): void {
  const current = agg.get(key) ?? { picks: 0, wins: 0 };
  current.picks += 1;
  if (win) current.wins += 1;
  agg.set(key, current);
}

function makeRow(
  championId: number,
  championName: string,
  patch: PatchId,
  position: LanePosition | "",
  scope: ChampionStat["scope"],
  n: number,
  wins: number,
  totalMatches: number,
  banCount: number
): ChampionStat {
  const pickRate = totalMatches === 0 ? 0 : n / totalMatches;
  const winRate = n === 0 ? 0 : wins / n;
  const isAll = scope === "all";
  const ci: ChampionRateCi = {
    pick: wilsonInterval(n, totalMatches),
    ban: isAll ? wilsonInterval(banCount, totalMatches) : null,
    win: n >= WIN_RATE_MIN_N ? wilsonInterval(wins, n) : null,
  };
  return {
    championId,
    championKey: championName, // Data Dragon slug 매핑은 ST-08 몫 — 현재는 raw championName을 그대로 키로 둔다.
    championName,
    position,
    patch,
    scope,
    totalMatches,
    n,
    pickRate,
    banRate: isAll ? (totalMatches === 0 ? 0 : banCount / totalMatches) : null,
    winRate,
    ci,
  };
}

/**
 * MatchSlim[] → 챔피언 단위 픽/밴/승률 집계. 명명된 포지션 행(scope="position", n>0인 것만) +
 * 미배정 등장 행(scope="unknown", teamPosition==="" 등장이 있을 때만) + 챔피언당 정확히 1개인
 * 포지션 합산 행(scope="all")을 함께 반환한다.
 * 정렬: pickRate 내림차순, 동률은 championName → position → scope 오름차순으로 결정론을 보장한다.
 */
export function aggregateChampions(matches: MatchSlim[], patch: PatchId): ChampionStat[] {
  const totalMatches = matches.length;
  const champions = new Map<number, ChampionAgg>();
  const banCounts = new Map<number, number>();

  for (const match of matches) {
    for (const participant of match.participants) {
      let agg = champions.get(participant.championId);
      if (!agg) {
        agg = { championName: participant.championName, byPosition: new Map(), allPicks: 0, allWins: 0 };
        champions.set(participant.championId, agg);
      }
      bump(agg.byPosition, participant.teamPosition, participant.win);
      agg.allPicks += 1;
      if (participant.win) agg.allWins += 1;
    }

    const bannedInMatch = new Set<number>();
    for (const team of match.teams) {
      for (const championId of team.bans) {
        if (championId > 0) bannedInMatch.add(championId);
      }
    }
    for (const championId of bannedInMatch) {
      banCounts.set(championId, (banCounts.get(championId) ?? 0) + 1);
    }
  }

  const allChampionIds = new Set<number>([...champions.keys(), ...banCounts.keys()]);
  const rows: ChampionStat[] = [];

  for (const championId of allChampionIds) {
    const agg = champions.get(championId);
    // 픽 기록이 전혀 없이 밴만 된 챔피언은 이름을 알 방법이 없다 — 빈 문자열로 두어 "미해결"임을
    // 표시한다(ST-08이 championId로 Data Dragon에서 복원 가능, "UNKNOWN" 같은 표시 문자열을
    // UI에 그대로 흘리지 않기 위한 결정).
    const championName = agg?.championName ?? "";
    const banCount = banCounts.get(championId) ?? 0;

    for (const position of LANE_POSITIONS) {
      const stat = agg?.byPosition.get(position);
      if (!stat || stat.picks === 0) continue;
      rows.push(makeRow(championId, championName, patch, position, "position", stat.picks, stat.wins, totalMatches, banCount));
    }

    const unassigned = agg?.byPosition.get("");
    if (unassigned && unassigned.picks > 0) {
      rows.push(
        makeRow(championId, championName, patch, "", "unknown", unassigned.picks, unassigned.wins, totalMatches, banCount)
      );
    }

    const allPicks = agg?.allPicks ?? 0;
    const allWins = agg?.allWins ?? 0;
    rows.push(makeRow(championId, championName, patch, "", "all", allPicks, allWins, totalMatches, banCount));
  }

  rows.sort((a, b) => {
    if (b.pickRate !== a.pickRate) return b.pickRate - a.pickRate;
    if (a.championName !== b.championName) return a.championName.localeCompare(b.championName);
    if (a.position !== b.position) return a.position.localeCompare(b.position);
    return a.scope.localeCompare(b.scope);
  });

  return rows;
}
