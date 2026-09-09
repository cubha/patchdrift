// vitest.setup.ts
// React Testing Library의 자동 cleanup을 명시적으로 등록한다.
//
// RTL 16.x는 "전역 afterEach가 있을 때만" cleanup을 자동 등록한다
// (node_modules/@testing-library/react/dist/index.js — `if (typeof afterEach === 'function')`).
// 이 프로젝트는 vitest `globals`를 켜지 않아(기본값 false) 전역 afterEach가 없으므로 자동 등록이
// 조용히 건너뛰어졌고, render()로 마운트한 React 루트가 파일 종료 후에도 언마운트되지 않았다.
// 그 상태로 jsdom 환경이 해체되면 react-dom 스케줄러의 지연 콜백이 뒤늦게 실행되며
// `ReferenceError: window is not defined`를 uncaught exception으로 던진다 — 단언은 전부 통과하는데
// vitest는 exit 1이 되는 형태라, 코어 수가 적어 스케줄이 밀리는 CI(2코어)에서만 재현됐다
// (실측 2026-09-09: 2코어 제한 시 4회 중 3회 실패, 로컬 다중코어에서는 0회).
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
