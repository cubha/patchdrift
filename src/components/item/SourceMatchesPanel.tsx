// src/components/item/SourceMatchesPanel.tsx
// 항목 상세 "원천 매치"(ST-12 ⑥) — evidence.matchIds 칩(말줄임 없이, 칩 단위로만 줄바꿈) +
// aggregatePath 텍스트 + 데이터 스냅샷 해시.
//
// 렌더 결함 수정(코디네이터 지적, 2026-09-05): 고정 열 `grid`(`grid-cols-2 sm:grid-cols-3
// lg:grid-cols-5`) + `whitespace-normal break-all`을 쓰면 매치 ID 문자열이 칩 경계가 아니라
// **칩 내부에서** 줄바꿈돼("KR_835880612" / "2"처럼 ID 중간이 끊김) 정확한 ID를 읽거나
// 복사할 수 없었다. `flex flex-wrap`(칩마다 콘텐츠 폭만큼 차지, 줄이 차면 다음 칩째로 줄바꿈)
// + `whitespace-nowrap`(칩 내부 텍스트는 항상 한 줄)으로 교체해 ID가 항상 통째로 보이게 한다.

export interface SourceMatchesPanelProps {
  matchIds: string[];
  aggregatePath: string;
  /** deltas 파일 sha256 앞 12자(서버에서 snapshotHash로 계산해 전달). */
  snapshotHash: string;
}

export default function SourceMatchesPanel({
  matchIds,
  aggregatePath,
  snapshotHash,
}: SourceMatchesPanelProps) {
  return (
    <div>
      {matchIds.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-5">
          {matchIds.map((id) => (
            <span
              key={id}
              className="whitespace-nowrap rounded-sm border border-border-soft bg-surface-warm px-3 py-2 text-center font-mono text-xs tabular-nums text-fg-2"
            >
              {id}
            </span>
          ))}
        </div>
      ) : (
        <p className="p-5 text-sm text-muted">원천 매치 표본 없음</p>
      )}
      <div className="flex flex-col gap-2 px-5 pb-5 font-mono text-xs text-muted">
        <span>집계 경로: {aggregatePath}</span>
        <span>데이터 스냅샷 sha256:{snapshotHash}</span>
      </div>
    </div>
  );
}
