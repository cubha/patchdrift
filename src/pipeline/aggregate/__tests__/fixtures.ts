// src/pipeline/aggregate/__tests__/fixtures.ts
// ST-06 테스트 공용 합성 데이터 빌더 — vitest가 `*.test.ts`만 수집하므로 이 파일은 테스트로
// 실행되지 않고 헬퍼로만 import된다.

import type {
  FirstObjectiveSeconds,
  LaneGoldSnapshot,
  MatchSlim,
  ParticipantSlim,
  TeamPosition,
  TeamSlim,
  TimelineLaneSplit,
  TimelineSlim,
} from "../../types";

interface ParticipantSpec {
  puuid: string;
  championId: number;
  championName: string;
  teamId: 100 | 200;
  teamPosition: TeamPosition;
  win: boolean;
  items?: number[];
}

export function makeParticipant(spec: ParticipantSpec): ParticipantSlim {
  return {
    puuid: spec.puuid,
    championId: spec.championId,
    championName: spec.championName,
    teamId: spec.teamId,
    teamPosition: spec.teamPosition,
    win: spec.win,
    kills: 0,
    deaths: 0,
    assists: 0,
    items: spec.items ?? [0, 0, 0, 0, 0, 0, 0],
    goldEarned: 0,
    challenges: {},
  };
}

function makeTeam(teamId: 100 | 200, win: boolean, bans: number[]): TeamSlim {
  return {
    teamId,
    win,
    bans,
    objectives: {
      baron: { first: false, kills: 0 },
      dragon: { first: false, kills: 0 },
      riftHerald: { first: false, kills: 0 },
      tower: { first: false, kills: 0 },
    },
  };
}

interface MatchSpec {
  matchId: string;
  patch?: string;
  gameVersion?: string;
  gameCreationMs?: number;
  gameDurationSec?: number;
  queueId?: number;
  /** 미지정 시 makeStandardParticipants()(표준 5x2 포지션 배치)를 사용한다. */
  participants?: ParticipantSlim[];
  blueBans?: number[];
  redBans?: number[];
  blueWin?: boolean;
}

/** 10명 참가자 스펙으로 MatchSlim 1건을 만든다. blueWin이 주어지면 teams[].win을 덮어쓴다
 * (참가자별 win 플래그와 별개로 팀 단위 승패를 명시하고 싶을 때 사용). */
export function makeMatch(spec: MatchSpec): MatchSlim {
  const participants = spec.participants ?? makeStandardParticipants();
  if (participants.length !== 10) {
    throw new Error(`makeMatch(${spec.matchId}): expected 10 participants, got ${participants.length}`);
  }
  const blueWin = spec.blueWin ?? participants.find((p) => p.teamId === 100)?.win ?? true;
  return {
    matchId: spec.matchId,
    gameVersion: spec.gameVersion ?? "16.17.1.1",
    patch: spec.patch ?? "26.17",
    gameCreationMs: spec.gameCreationMs ?? 1_700_000_000_000,
    gameDurationSec: spec.gameDurationSec ?? 1800,
    queueId: spec.queueId ?? 420,
    participants,
    teams: [makeTeam(100, blueWin, spec.blueBans ?? []), makeTeam(200, !blueWin, spec.redBans ?? [])],
  };
}

/** 표준 5x2 포지션 배치(TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY, 블루/레드 각 1명)로 참가자 10명을
 * 만든다. overrides로 특정 슬롯(0=blue TOP..4=blue UTILITY, 5=red TOP..9=red UTILITY)만 바꿀 수
 * 있다. */
export function makeStandardParticipants(
  overrides: Partial<Record<number, Partial<ParticipantSpec>>> = {}
): ParticipantSlim[] {
  const positions: TeamPosition[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  const base: ParticipantSpec[] = [];
  for (const teamId of [100, 200] as const) {
    for (const position of positions) {
      base.push({
        puuid: `${teamId}-${position}`,
        championId: 1,
        championName: "FillerChamp",
        teamId,
        teamPosition: position,
        win: teamId === 100,
      });
    }
  }
  return base.map((spec, index) => makeParticipant({ ...spec, ...overrides[index] }));
}

interface TimelineSpec {
  matchId: string;
  patch?: string;
  lanes?: Partial<Record<string, TimelineLaneSplit>>;
  firstObjectives?: Partial<FirstObjectiveSeconds>;
}

const NULL_SNAPSHOT: LaneGoldSnapshot = { goldAt10: null, goldAt14: null };
const NULL_OBJECTIVES: FirstObjectiveSeconds = {
  dragonSec: null,
  heraldSec: null,
  baronSec: null,
  towerSec: null,
};

export function makeTimeline(spec: TimelineSpec): TimelineSlim {
  return {
    matchId: spec.matchId,
    patch: spec.patch ?? "26.17",
    lanes: (spec.lanes as TimelineSlim["lanes"]) ?? {},
    firstObjectives: { ...NULL_OBJECTIVES, ...spec.firstObjectives },
  };
}

export function laneSplit(blue: Partial<LaneGoldSnapshot>, red: Partial<LaneGoldSnapshot>): TimelineLaneSplit {
  return {
    blue: { ...NULL_SNAPSHOT, ...blue },
    red: { ...NULL_SNAPSHOT, ...red },
  };
}
