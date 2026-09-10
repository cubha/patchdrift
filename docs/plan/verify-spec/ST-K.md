### VERIFY-SPEC — SubTask ST-K (항목 상세 CI 오차막대 + 레이아웃 재배치 + 헤더 아이콘 72px)
- 기준선 요구사항: PLAN §4 ST-K — "ST-E(chartData.ts storedCi 계약) 배선, 근거 패널을 차트보다 위로, 차트 폭 축소, 헤더 아이콘 48→72px, 범례 문구 수정."
- 변경 파일: src/app/item/[id]/page.tsx(수정), src/components/item/storedCi.ts(신규), src/components/item/__tests__/storedCi.test.ts(신규)
- 관찰 가능한 계약: `resolveStoredCi(delta, ddragon, championsBefore, championsAfter, itemsBefore, itemsAfter)` → champion pick/ban/win·item adoptionRate만 `{before, after}`(Interval|null) 반환, 그 외 metric은 undefined(buildChartData가 델타-CI 폴백). page.tsx가 loadChampions/loadItems(from/to 패치)로 조회해 buildChartData 5번째 인자로 배선.
- 구현 결정: 레이아웃 순서를 [선언 대조(근거) → 델타 차트 → 추정 원인]으로 재배치(기존 [차트 → 선언대조 → 원인]에서 앞의 둘을 swap). 차트는 `max-w-xl` wrapper로 폭 축소.
- 인접 경계: `ChampionStat.position`이 `LanePosition | ""` 타입이라 scope="all" 매칭 시 position=""로 조회 — delta.ts의 실제 생성 규약과 일치 확인(테스트 7건으로 champion all/position·item·매핑실패·행없음 케이스 전수 커버).
- 미확인 사항: 없음(RED 사이클은 아니었으나 storedCi.ts 자체가 순수 함수라 TDD 동등 수준으로 테스트 작성·통과 확인).
