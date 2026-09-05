# REF-RECON — 레퍼런스 관측
> 관측일: 2026-09-05 · 소스: `--source=catalog`(미학축 RECON 스킵 — 카탈로그 `trading-terminal` 확정) · 구조축 = 질문 ③ AI 탐색 위임 → 사용자 조합 승인
> 대상: metabot(https://metabot.gg/en/league/patch-breakdown) · deeplol(https://www.deeplol.gg/champions) · lol.ps(https://lol.ps/statistics) · 보조: tactics.tools(/trends) · lolalytics(/lol/tierlist/)
> 탈락: op.gg(CloudFront 403) · u.gg·mobalytics(Cloudflare 403) · dak.gg(404) · tools.blitz.gg(DNS 부재 — 경쟁 게이트 "blitz patch-analysis"는 **사이트 자체가 없음**으로 종결)
> 캡처: `docs/design/refs/{metabot,deeplol,lolps,tactics-tools,lolalytics}/desktop.png` (1440×900 뷰포트)

## 구조 관측 (경쟁/유사 시스템 — 질문 ③) — 화면별 역할 분담(사용자 승인)

### 홈 ← metabot Patch Breakdown
- 섹션 시퀀스: 페이지 제목("Patch 26.17 Breakdown") → **공유형 요약 카드 1장**(헤더: 패치 번호 강조 / 본문: 좌 2/3 + 우 1/3) → 산문 해설
- 카드 좌: "최대 버프 / 최대 너프" **2 히어로 타일**(초상+이름+큰 델타 수치+현재 승률) → 행 단위 **델타 칩 열**(Top performing / Top buffed / Top nerfed / items, 각 6칩: 아이콘+수치+라벨) — 위계는 크기(히어로) → 밀도(칩)
- 카드 우: **매치 평균 사이드**(경기 시간·골드·와드·CS·데스, 값 + 이전 패치 대비 ▼▲ 소수 델타) → 데미지 프로필 바
- 색 문법: 상승 green ▲ / 하락 red ▼ 만 유채색, 나머지 뉴트럴. 섹션 라벨은 소문자 eyebrow + 좌측 accent 바
- **채택**: 요약 카드 → 델타 칩 → 사이드 평균 구조를 브리핑 홈에 이식. **미채택**: "최대 버프/너프"를 승률로 잡는 것(우리 1차축은 픽·밴·아이템·골드·오브젝트, 승률은 n 게이트) — 히어로 타일은 "미공지 변화 Top"으로 치환. 다운로드 PNG 버튼 → 디스코드 전송

### 대조표 ← deeplol Champions
- 레이아웃: **2컬럼**(좌 ~1/3 내비게이터 / 우 ~2/3 테이블). 좌: 검색 → 포지션 탭 → A~Z 인덱스 → 엔티티 그리드. 우: 패널 헤더(제목 + 티어/지역/패치 드롭다운 3개) → 포지션 탭 바 → 테이블(Rank·변동·챔피언·티어 뱃지·Win·Pick·Ban·Counter)
- 위계: 티어를 **육각 뱃지 + 색**으로, 수치는 동일 굵기 — 상태가 색을 독점
- **채택**: 좌=패치노트 항목 내비게이터(섹션 필터·검색·항목 리스트), 우=짝지어진 델타 테이블, 티어 뱃지 → **상태 뱃지(공지-일치 / 공지-불일치 / 미공지 / 표본 부족)**. **미채택**: 엔티티 그리드(엔티티 우선 탐색은 "또 하나의 티어리스트"로 읽힘) → 항목 리스트로 대체, 광고 배너

### 필터 바 ← lol.ps Champion Tier
- **필터 바 1줄**: 포지션 텍스트 탭 좌측 + 드롭다운 3개(패치·티어·지역) 우측, 라운드 컨테이너. 테이블 헤더 정렬 화살표, 첫 열 **순위 변동 칩**(▲1 green / ▼1 red / —0 gray), 스냅샷 시각·최소 픽률 조건을 제목 옆 소문자 캡션으로
- **채택**: 패치 쌍 드롭다운("26.16 → 26.17")·티어·큐 + 스냅샷 캡션("n=10,240 매치 · 2026-09-05 14:00 KST 집계") + 변동 칩. **미채택**: 광고 사이드, 태그 클라우드, 라이트/다크 토글(다크 고정)

### 보조 관측
- tactics.tools Trends: 설명 카드(기간·티어 드롭다운 + 문장) → 카테고리 패널마다 **Trending Up / Down 2열** 리스트 → 홈 미공지 목록에 상승/하락 분할 아이디어 차용 가능(우선 1열)
- lolalytics: 극고밀도 숫자 테이블(Win에 +델타 서브텍스트, Delta 열 별도) → 상세 통계 패널 밀도 참조

## 미학 관측 (질문 ④)
- 스킵 — 미학 출처는 카탈로그 `open-design/trading-terminal`(Apache-2.0) 단독. 5개 레퍼런스 전부 다크 퍼스트·상승 green/하락 red·뉴트럴 표면이라 카탈로그 의도문("dark market panels, green-red status, compact data density")과 정합
