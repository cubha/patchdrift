// src/pipeline/discord/webhook.ts
// F6: 디스코드 웹훅 브리핑 — 상위 미공지 5건 + 링크를 embed(≤10개·6,000자)로 전송, 429 재시도.
// TODO(F6): fetch 기반 웹훅 전송 구현

import type { DeltaRecord } from "../types";

export interface DiscordWebhookOptions {
  webhookUrl: string;
  topN: number;
}

export async function sendBriefing(
  deltas: DeltaRecord[],
  options: DiscordWebhookOptions
): Promise<void> {
  throw new Error(
    `TODO(F6): sendBriefing(n=${deltas.length}, topN=${options.topN}) not implemented`
  );
}
