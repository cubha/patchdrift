### VERIFY-SPEC — SubTask ST-G (라인 글리프·스펠 아이콘 공용 컴포넌트)
- 기준선 요구사항: PLAN §4 ST-G — "src/components/LaneGlyph.tsx, SpellIcon.tsx 신규. EntityIcon.tsx의 onError 폴백 패턴 재사용."
- 변경 파일: src/components/LaneGlyph.tsx(신규), src/components/SpellIcon.tsx(신규), src/__tests__/components.test.tsx(수정, 테스트 13개 추가)
- 관찰 가능한 계약: `LaneGlyph({lane, size, className})` → 6종(TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY/all) 각각 다른 `<title>` 라벨을 가진 인라인 SVG. `SpellIcon({filename, name, fallbackLabel, size})` → filename 있으면 `/dd/spell/{filename}` img, null이면 텍스트 폴백(onError 시에도 폴백 전환).
- 구현 결정: 하드코딩 없음(SVG path는 순수 장식 형태, 색은 currentColor로 호출부 위임). stub 없음.
- 인접 경계: LaneFilter.tsx·LaneGapPanel.tsx·DeltaTable.tsx(compare)가 LaneGlyph 소비. ReleaseNoteRow.tsx가 SpellIcon 소비.
- 미확인 사항: 없음(단위 테스트 13개로 렌더 계약 전수 확인).
