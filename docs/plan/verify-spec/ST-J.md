### VERIFY-SPEC — SubTask ST-J (대조표 아이콘 투입 + 라인 글리프 박스 + 라인 태그)
- 기준선 요구사항: PLAN §4 ST-J — "DeltaTable 엔티티 열 40px 아이콘, entityType='lane' 행은 라인 글리프로 교체(구 '골' 폴백 대체), NoteNavigator 40px 아이콘, 라인 태그(글리프+'탑·픽률'), 정렬 유지."
- 변경 파일: src/components/compare/{DeltaTable,NoteNavigator,CompareExplorer}.tsx(수정), src/app/compare/page.tsx(수정), src/components/home/releaseStreamEntity.ts(resolveEntityIconBySection 추출·일반화), src/pipeline/match/ddragon.ts(loadDdragonSafe/EMPTY_DDRAGON 공용화), src/app/page.tsx(loadDdragonSafe 재사용으로 리팩터), 테스트 파일
- 관찰 가능한 계약: `RowIcon`(DeltaTable) — entityType==="lane"이면 LaneGlyph(entityKey를 LanePosition으로 캐스트), 그 외 EntityIcon. `LaneTag` — entityType==="champion" && parseLaneAxis(id)가 특정 라인(≠all)이면 "{라벨} · {지표}" 캡션. NoteNavigator는 부모(compare/page.tsx)가 ddragon으로 빌드타임에 해석한 `icons: Record<noteId, StreamEntityIcon>`를 받아 렌더(클라이언트 컴포넌트라 fs 직접 접근 불가).
- 구현 결정: DeltaTable 정렬 로직(sortRows, 상태 우선순위)은 손대지 않음(요구사항대로 유지). RowIcon/LaneTag는 순수 프레젠테이션 헬퍼로 DeltaTable.tsx 내부에 로컬 정의(재사용처가 이 파일뿐이라 별도 파일 분리 안 함).
- 인접 경계: `resolveEntityIconBySection`을 홈(releaseStreamEntity.ts)에서 대조표로 재사용 — 두 화면이 동일 ddragon 역조회 로직을 공유(중복 방지). `entityKey as LanePosition` 캐스트는 delta.ts의 실제 생성 코드(`entityKey: afterLane.position`)로 근거 확인됨.
- 미확인 사항: 없음. 신규 테스트(DeltaTable 아이콘/라인태그 3건, NoteNavigator 아이콘 2건) 전부 통과 확인.
