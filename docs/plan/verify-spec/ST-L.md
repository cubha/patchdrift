### VERIFY-SPEC — SubTask ST-L (방법론 어댑터 매핑표)
- 기준선 요구사항: PLAN §4 ST-L — "레이아웃 그대로, 어댑터 매핑표 신설(8계층 LoL↔PUBG), PUBG 열은 확인된 사실만·수집 수치 0, 판정 엔진은 게임 무관 고정 고지."
- 변경 파일: src/components/methodology/adapterMatrixData.ts(신규, 정적 데이터), src/components/methodology/AdapterMatrix.tsx(신규, 렌더), src/components/methodology/__tests__/AdapterMatrix.test.tsx(신규), src/app/methodology/page.tsx(수정, SectionCard 삽입)
- 관찰 가능한 계약: `ADAPTER_MATRIX`(8행 상수) 렌더 시 8개 계층 전부 텍스트로 노출, "PUBG 수집 수치: 0건" 고정 문구, "판정 엔진"+"게임 무관" 고지 문구, PUBG 상태 뱃지는 "미연결"만(실연결 문구 없음).
- 구현 결정: 순수 정적 데이터(I/O 없음) — PUBG 연결 여부와 무관하게 컴파일 타임에 고정. 파일명은 `adapterMatrixData.ts`(대소문자만 다른 `AdapterMatrix.tsx`와의 케이스 충돌을 피하려 `Data` 접미사로 rename — /mnt/d WSL drvfs 마운트에서 대소문자만 다른 파일명이 tsc casing 충돌 에러를 내는 것을 실측으로 확인 후 조치).
- 인접 경계: 없음(독립 신규 섹션, 다른 컴포넌트 미참조).
- 미확인 사항: 없음.
