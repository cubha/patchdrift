// src/components/methodology/adapterMatrix.ts
// 어댑터 매핑표 — HANDOFF-redesign-2026-09-10.md §4-4 "확장성의 증명은 셀렉터가 아니라
// 어댑터 매핑표". LoL↔PUBG 계층별 대응을 정적 데이터로 선언한다(순수 데이터, I/O 없음 —
// PUBG는 미연결이라 실제 조회할 데이터 자체가 없다).
//
// PUBG 열은 "확인된 사실만" 적는다(HANDOFF §5·§6 — 수집 수치 0, 실연결은 이번 릴리즈 범위 밖):
// - 관측소스: PUBG 공식 API 실측 완료·키 즉시 발급·텔레메트리 무제한(사실 확인됨)
// - 그 외 계층: 어댑터 매핑 "설계"는 확정했으나 "연결"은 안 했다는 상태(status)로 구분한다.

export type AdapterStatus = "designed" | "verified-unconnected";

export interface AdapterMatrixRow {
  layer: string;
  lol: string;
  pubg: string;
  pubgStatus: AdapterStatus;
}

export const ADAPTER_MATRIX: readonly AdapterMatrixRow[] = [
  {
    layer: "선언 소스",
    lol: "패치노트 (A ⇒ B 구조)",
    pubg: "패치노트 (A ⇒ B 구조, 동일 파서 문법)",
    pubgStatus: "designed",
  },
  {
    layer: "관측 소스",
    lol: "Riot Match-V5 · Timeline API",
    pubg: "PUBG 공식 API — 실측 완료 · 키 즉시 발급 · 텔레메트리 무제한",
    pubgStatus: "verified-unconnected",
  },
  {
    layer: "주 엔티티",
    lol: "챔피언",
    pubg: "무기",
    pubgStatus: "designed",
  },
  {
    layer: "공간 축",
    lol: "라인 5종(탑·정글·미드·원딜·서포터)",
    pubg: "맵 / 낙하 구역",
    pubgStatus: "designed",
  },
  {
    layer: "채택률",
    lol: "픽률 · 밴률",
    pubg: "픽업률",
    pubgStatus: "designed",
  },
  {
    layer: "성과",
    lol: "승률",
    pubg: "순위(placement)",
    pubgStatus: "designed",
  },
  {
    layer: "시계열",
    lol: "패치 단위 전/후",
    pubg: "패치 단위 전/후(동일 구조)",
    pubgStatus: "designed",
  },
  {
    layer: "자산 소스",
    lol: "Data Dragon",
    pubg: "미확정",
    pubgStatus: "designed",
  },
] as const;

/** 판정 엔진(Wilson/Newcombe/BH-FDR)은 게임 무관 고정 — 계층 매핑표와 분리해 별도 강조한다
 * (HANDOFF §4-4 "판정 엔진은 게임 무관 고정"). 어댑터가 바뀌어도 이 레이어는 그대로다. */
export const JUDGMENT_ENGINE_NOTE =
  "판정 엔진(Wilson/Newcombe 구간·BH-FDR)은 게임 무관 — 어댑터 계층이 데이터를 표준 형태로 변환해 넘기면, 이후 통계 판정은 LoL·PUBG 구분 없이 동일 엔진을 그대로 쓴다.";
