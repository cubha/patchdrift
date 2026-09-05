// src/components/item/snapshotHash.ts
// 원천 매치 패널(ST-12 ⑥) "데이터 스냅샷 해시" — deltas 파일의 원문 문자열을 받아 sha256 앞
// 12자를 반환하는 순수 함수(테스트 대상). 파일 읽기는 페이지(서버 컴포넌트)가 수행하고 이
// 함수엔 텍스트만 넘긴다 — node:crypto만 쓰므로 vitest(node 환경)에서도 그대로 동작한다.

import { createHash } from "node:crypto";

/** raw(파일 원문 문자열)의 sha256 hex 다이제스트 앞 12자. 프로토타입 `sha256:3f9a…c6d0` 표기의
 * "짧은 해시" 관례를 그대로 따른다. */
export function snapshotHash(raw: string): string {
  return createHash("sha256").update(raw, "utf-8").digest("hex").slice(0, 12);
}
