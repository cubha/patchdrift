// src/pipeline/collect/checkpoint.ts
// 파일 단위 idempotent 재개 체크포인트 — 이미 수집된 matchId 집합을 기록/복원한다.
// TODO(F1): 체크포인트 파일 스키마 확정 + fs 구현

export interface Checkpoint {
  completedMatchIds: Set<string>;
}

export function loadCheckpoint(path: string): Checkpoint {
  throw new Error(`TODO(F1): loadCheckpoint(${path}) not implemented`);
}

export function saveCheckpoint(path: string, checkpoint: Checkpoint): void {
  throw new Error(
    `TODO(F1): saveCheckpoint(${path}, size=${checkpoint.completedMatchIds.size}) not implemented`
  );
}
