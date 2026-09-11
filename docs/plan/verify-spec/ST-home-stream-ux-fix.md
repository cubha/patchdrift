# VERIFY-SPEC — 홈 릴리즈노트 스트림 UX 결함 3건

## 대상 파일
- `src/app/page.tsx` (StreamColumnLayout 배선)
- `src/components/home/StreamColumnLayout.tsx` (신규 — 우측 기준 좌측 높이 고정 + 내부 스크롤)
- `src/components/home/ReleaseNoteStream.tsx` (내부 스크롤 컨테이너로 전환)
- `src/components/home/ReleaseNoteRow.tsx` (details/summary 아코디언 + 중복 delta 제거 소비)
- `src/components/home/logic.ts` (`excludeObservation` 순수 함수, TDD)
- `src/components/home/__tests__/logic.test.ts` (`excludeObservation` 3케이스)

## 구현 결정
- 우측 컬럼 높이는 데이터에 따라 달라지는 동적 값이라 고정 px 대신 `ResizeObserver`로 실측해
  좌측에 `style.height`로 적용(StreamColumnLayout, client component). lg 미만(브레이크포인트
  `min-width:1024px`, Tailwind 기본값 — 이 값을 커스텀 토큰으로 정의한 파일 없어 매직넘버 아닌
  프레임워크 기본값 그대로 사용)에서는 `matchMedia`로 감지해 높이 제약을 걸지 않는다(두 컬럼이
  세로로 쌓이므로).
- 아코디언은 `<details>/<summary>` 네이티브 엘리먼트 — "use client" 전환 없이 서버 컴포넌트
  유지(ReleaseNoteRow.tsx는 여전히 상태 없는 순수 프레젠테이션). 기본 마커는
  `list-none` + `[&::-webkit-details-marker]:hidden`로 숨기고, `group-open:rotate-180` 커스텀
  화살표로 대체.
- `excludeObservation`은 `id` 동등성으로 필터링하는 단순 함수(관측이 null이면 원본 배열 그대로
  반환) — 과설계 배제.
- `remainingDeltas`가 0건이면(대표 관측이 유일한 delta였던 경우) 빈 `<ul>` 대신 아예 렌더하지
  않음(`null`).
- 미공지 전건 노출 자체(질문 1)는 releaseStream.ts 설계 의도 유지 — 변경하지 않음(PLAN X1).

## 미확인 사항
- StreamColumnLayout의 ResizeObserver 높이 동기화는 실제 브라우저(Playwright)로 lg 폭에서
  좌측이 내부 스크롤되고 하단이 우측과 맞춰지는지 시각 확인이 필요 — 정적 분석(verify.sh)만으로는
  런타임 레이아웃을 보증하지 못한다.
- `<details>` 기본 펼침 상태(요구사항상 기본 접힘)는 모든 브라우저에서 `open` 속성 미지정 시
  기본 닫힘이 표준 동작이라 별도 초기화 코드 불필요하다고 판단했으나, 스냅샷 테스트는 없음.
- lg 브레이크포인트 값(1024px)을 Tailwind 기본값 그대로 하드코딩했다 — 프로젝트가 커스텀
  브레이크포인트를 쓰는지 tailwind config를 전수 확인하지 않았다(globals.css에 breakpoint
  재정의 없음만 확인).
