// src/components/methodology/adapterMatrixData.ts
// 어댑터 매핑표 — HANDOFF-redesign-2026-09-10.md §4-4 "확장성의 증명은 셀렉터가 아니라
// 어댑터 매핑표". LoL↔PUBG 계층별 대응을 정적 데이터로 선언한다(순수 데이터, I/O 없음 —
// PUBG는 미연결이라 실제 조회할 데이터 자체가 없다).
//
// PUBG 열은 "확인된 사실만" 적는다(HANDOFF §5·§6 — 수집 수치 0, 실연결은 이번 릴리즈 범위 밖).
//
// 2026-09-10 verify-impl 축B: 4번째 열이 "PUBG 상태"였으나 확정 시안은 **"어댑터 인터페이스"**
// (NoteSource.fetch() … AssetSource.icon())를 요구한다 — 이 열이 없으면 "바뀌는 것은 어댑터
// 8줄뿐"이라는 확장성 논증이 화면에서 사라진다. 상태(어댑터 확정·미연결)는 시안처럼 PUBG 열
// **머리글**로 옮겼고, 관측 소스의 "API 실측 완료"는 원래 셀 본문에 있으므로 정보 손실이 없다.
// 판정 엔진도 표 밖 문단이 아니라 **마지막 행**으로 넣는다(시안: "마지막 행이 핵심입니다").

export interface AdapterMatrixRow {
  layer: string;
  lol: string;
  /** null이면 PUBG 열이 없는 행 — 판정 엔진처럼 게임 무관이라 lol 셀이 두 열을 가로지른다. */
  pubg: string | null;
  /** 이 계층에서 게임별로 갈아끼우는 인터페이스. 판정 엔진은 갈아끼우지 않으므로 "고정". */
  iface: string;
}

export const ADAPTER_MATRIX: readonly AdapterMatrixRow[] = [
  {
    layer: "선언 소스",
    lol: "공식 패치노트 HTML — {스킬키} {스탯}: A ⇒ B",
    pubg: "공식 패치노트 — 동일한 A ⇒ B 구조",
    iface: "NoteSource.fetch()",
  },
  {
    layer: "관측 소스",
    lol: "Riot Match-V5 · Timeline",
    pubg: "PUBG Developer API 텔레메트리 — 실측 완료 · 키 즉시 발급 · 무제한",
    iface: "MatchSource.collect()",
  },
  {
    layer: "주 엔티티",
    lol: "챔피언 (173)",
    pubg: "무기 · 차량 · 소모품",
    iface: "Entity{type,key,name}",
  },
  {
    layer: "공간 축",
    lol: "라인 5종 (탑·정글·미드·원딜·서포터)",
    pubg: "맵 · 낙하 구역",
    iface: "Segment[]",
  },
  {
    layer: "채택률 지표",
    lol: "픽률 · 밴률",
    pubg: "픽업률 · 초반 교전 사용률",
    iface: "Metric.adoption",
  },
  {
    layer: "성과 지표",
    lol: "승률 (n≥200 게이트)",
    pubg: "순위 · 생존 시간",
    iface: "Metric.outcome",
  },
  {
    layer: "시계열 지표",
    lol: "골드@10/14 · 첫 오브젝트 시각",
    pubg: "첫 교전 시각 · 자기장 단계별 생존",
    iface: "Metric.timeline",
  },
  {
    layer: "엔티티 자산",
    lol: "Data Dragon (아이콘·스펠)",
    pubg: "PUBG 자산 CDN",
    iface: "AssetSource.icon()",
  },
  {
    layer: "판정 엔진",
    lol: "게임 무관 — BH-FDR q<0.10 · Newcombe CI · 표본 게이트 · 짝짓기 · LLM 2단 인용검증",
    pubg: null,
    iface: "고정",
  },
] as const;

/** PUBG 열 머리글의 상태 표기 — 시안 "PUBG (어댑터 확정 · 미연결)". 행마다 뱃지를 붙이던
 * 것을 머리글 1회로 접었다(4번째 열을 어댑터 인터페이스에 내줬기 때문). */
export const PUBG_COLUMN_HEADER = "PUBG (어댑터 확정 · 미연결)";

/** 표 아래 강조 문단 — 시안 `.note-blocked`. 마지막 행(판정 엔진)이 왜 핵심인지 말한다. */
export const JUDGMENT_ENGINE_NOTE =
  "마지막 행이 핵심이다 — 게임을 갈아끼울 때 바뀌는 것은 어댑터 8줄이고 판정 엔진은 고정이다. PUBG 열은 확인된 사실(API 실측 완료 · 패치노트가 동일한 A ⇒ B 구조)과 설계 제안을 구분해 적었다.";
