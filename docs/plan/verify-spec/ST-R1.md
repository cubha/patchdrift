### VERIFY-SPEC — SubTask R1 (홈 라인 엔티티 아이콘)
- 기준선 요구사항: PLAN-ux-redesign-remainder-2026-09-10.md P1 — "icon.entityType === 'lane'일 때 LaneGlyph(labelled)로 렌더, DeltaTable.tsx RowIcon 패턴과 동형"
- 변경 파일:
  - src/components/home/ReleaseNoteRow.tsx — `CardIcon` 로컬 컴포넌트 신설(lane 분기 → LaneGlyph, 그 외 → 기존 EntityIcon/폴백), 기존 인라인 삼항 렌더를 대체
  - src/components/home/__tests__/render.test.tsx — 라인 엔티티 카드 렌더 시 svg(LaneGlyph, aria-hidden) 존재 + 첫글자("바") 텍스트 폴백 부재 확인 테스트 추가
- 관찰 가능한 계약: `icon.entityType === "lane" && icon.entityKey`면 56px 박스 안에 `<LaneGlyph lane={icon.entityKey} size={34} labelled />` svg를 렌더. champion/item은 기존 EntityIcon(ddragon 이미지/폴백) 그대로, entityType이 null이거나 objective/summary면 기존 첫글자 텍스트 박스 그대로(회귀 없음).
- 구현 결정: DeltaTable.tsx RowIcon과 동일 비율(56×0.6≈34px 글리프)로 동형화. 별도 공유 헬퍼로 추출하지 않음(두 파일의 크기·컨테이너 클래스가 달라 억지 공유 시 추상화가 더 복잡해짐).
- 인접 경계: `StreamEntityIcon`(releaseStreamEntity.ts) 계약 변경 없음 — entityType이 이미 "lane"을 포함하는 유니온이었고, 이번 수정은 소비 측(렌더)만 바뀐다. `LaneGlyph`는 기존 공유 컴포넌트 재사용(신규 prop 없음).
- 미확인 사항: 없음 — 기존 RowIcon 패턴을 그대로 복제.
