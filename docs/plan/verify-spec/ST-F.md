### VERIFY-SPEC — SubTask ST-F (스펠 아이콘·스플래시 자산 파이프라인)
- 기준선 요구사항: PLAN §4 ST-F — "scripts/run-ddragon.ts 확장, ST-D(spell-icon.ts) 소비, data/aggregated/spell-icons.json slim 인덱스 산출, public/dd/spell/*.png 다운로드."
- 변경 파일: scripts/run-ddragon.ts(수정, collectSpellIconTargets+syncSpellIcons 추가), src/pipeline/types.ts(SpellIconIndexFile/SpellIconMap 추가), src/pipeline/shared/paths.ts(spellIconsFile 추가), src/lib/data.ts(loadSpellIcons 추가), src/pipeline/match/spell-icon.ts(parseSkillSlot/spellIconKey 추가 — ST-D 산출물에 이어붙임), data/aggregated/spell-icons.json(신규 산출), data/ddragon/16.18.1/*.json(신규, DDragon 버전 갱신), public/dd/spell/*.png(76개 신규).
- 관찰 가능한 계약: 노트(26.16+26.17)에서 section="champion" && skill!=null && parseSkillSlot 성공 항목만 대상(88건) → 76건 해석 성공(champion ddragon 매핑 실패 3건 "신규 아칼리/케넨/쉔"은 기존 한계, 회귀 아님) → public/dd/spell/*.png 76개 다운로드 + spell-icons.json.icons에 `entityskill` 키로 파일명 매핑.
- 구현 결정: 챔피언 상세 JSON(170개)은 fetch만 하고 디스크에 쓰지 않음(committed 방지, HANDOFF §5 "전량 커밋 안 함"). 다운로드 범위는 "노트에 등장한 것만"으로 좁힘(기존 collectAppearedEntities 패턴 재사용) — HANDOFF가 명시한 "약 850파일" 상한보다 훨씬 적은 76개.
- 인접 경계: ST-H(ReleaseNoteRow)가 loadSpellIcons()+spellIconKey로 소비. 스플래시 자산(히어로 앰비언트용)은 이 SubTask 범위에 포함하지 않았다 — ST-I에서 별도 스코프 결정(보류) 참고.
- 미확인 사항: item 3097 ddragon 매핑 실패 1건은 스펠 아이콘과 무관한 기존 아이템 파이프라인 이슈(회귀 아님, run-ddragon 로그에서 사전 확인). 실제 DDragon 스펠 파일 스키마와 ST-D 픽스처(학습 지식 기반 축약)의 정합은 이번 실행(76개 실다운로드 성공)으로 간접 검증됨.
