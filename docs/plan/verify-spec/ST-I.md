### VERIFY-SPEC — SubTask ST-I (헤드라인 엔티티/항목 분리 + 라인별 미공지 패널 + 히어로 앰비언트)
- 기준선 요구사항: PLAN §4 ST-I + 사용자 승인 3건 — "HeadlineStats.noteEntityCount/noteItemCount 분리(리네임), compare CoverageStats 동봉, LaneGapPanel/HeroAmbient 신규."
- 변경 파일: src/components/home/{logic,HeroSummary}.ts/tsx(수정), src/components/home/{HeroAmbient,LaneGapPanel}.tsx(신규), src/components/compare/{logic,CoverageBar}.ts/tsx(수정), src/app/page.tsx(수정), 관련 테스트 6개 파일
- 관찰 가능한 계약: `computeHeadline` → `{noteEntityCount, noteItemCount, statCount, unannouncedCount}`(과거 `noteItemCount` 단일 필드가 실제로는 엔티티 수였던 오라벨을 분리). `computeCoverage` 동일 패턴. `HeroSummary` 헤드라인 텍스트 "N 엔티티 / M 항목". `HeroAmbient`는 splashUrl prop 없으면 그라디언트만(스플래시 아트는 스코프 결정으로 보류).
- 구현 결정: HeroAmbient가 스플래시 아트 없이 그라디언트만 렌더 — HANDOFF §8 절단 우선순위 1순위로 명시된 항목이라 이번 릴리즈에서 의도적으로 축소. `splashUrl` optional prop으로 향후 연결 경로만 열어둠(컴포넌트 재작성 불필요).
- 인접 경계: `HeadlineStats`/`CoverageStats` 타입 변경은 외부 공개 API가 아니라 소비처(page.tsx·HeroSummary·CoverageBar·각 테스트) 전수 확인 — tsc --noEmit로 누락 검증 완료.
- 미확인 사항: LaneGapPanel이 소비하는 `computeLaneDistribution(unannouncedRows)` 입력이 "미공지 상태 델타 전체"인데, HANDOFF §4-1 실집계 수치(탑22 등)와 값이 다를 수 있음(그 수치는 특정 스냅샷 참고치일 뿐 — ST-C VERIFY-SPEC에서 이미 명시된 사항, 재확인 불요).
