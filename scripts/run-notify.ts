// scripts/run-notify.ts
// F6 파이프라인 진입점 — dotenv 로드 후 deltas 파일을 읽어 디스코드 웹훅 브리핑을 전송한다.
// 실행: npm run pipeline:notify -- --from 26.16 --to 26.17 [--top 5] [--site https://…] [--dry-run]

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DATA_ROOT, aggregatedDir, deltasFile, notesFile } from "../src/pipeline/shared/paths";
import { buildBriefingEmbeds, sendWebhook } from "../src/pipeline/discord/webhook";
import { countRelevantNoteEntities } from "../src/pipeline/shared/notes-count";
import type { DeltasFile, PatchId, PatchNoteItem } from "../src/pipeline/types";
import { isMainModule, parseCliArgs } from "./shared/cli";

/** `src/pipeline/shared/notes-count.ts`(ST-11 `home/logic.ts`의 `countRelevantNoteEntities`와
 * 동일 규칙을 공용화, 2026-09-05 리팩토링)의 별칭 — 기존 export 이름을 그대로 유지한다(테스트가
 * `countEntityNotes`로 import함). */
export const countEntityNotes = countRelevantNoteEntities;

/** 확정된 프로덕션 도메인(2026-09-09 Vercel 배포). `patchdrift.vercel.app`은 **타인 소유의
 * 별개 프로젝트**라 Vercel이 우리 프로젝트에 `-three` 접미사를 붙여 배정했다(실측: 그 도메인은
 * "Shopify breaks something every 90 days" 사이트를 서빙한다) — 자리표시로도 쓰면 브리핑
 * 링크가 남의 사이트를 가리킨다. 도메인이 바뀌면 이 상수와 GH Actions Variable
 * `PATCHDRIFT_SITE_URL`을 함께 갱신한다. */
const DEFAULT_SITE_URL = "https://patchdrift-three.vercel.app";

export interface RunNotifyArgs {
  from: PatchId;
  to: PatchId;
  top: number;
  site: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): RunNotifyArgs {
  const raw = parseCliArgs("run-notify", argv, [
    { name: "from", type: "patch", required: true },
    { name: "to", type: "patch", required: true },
    { name: "top", type: "number", default: 5 },
    { name: "site", type: "string", default: DEFAULT_SITE_URL },
    { name: "dryRun", type: "boolean", default: false },
  ]);

  const top = raw.top as number;
  const site = raw.site as string;

  if (top <= 0) {
    throw new Error(`run-notify: --top 값이 올바르지 않습니다: ${String(top)}`);
  }
  // 기본값(DEFAULT_SITE_URL)은 항상 이 검사를 통과하므로 --site 미지정 시엔 영향 없다 —
  // 사용자가 명시적으로 넘긴 값만 걸러낸다(코디네이터 후속 지시, 2026-09-05).
  if (site.trim().length === 0) {
    throw new Error("run-notify: --site 값이 비어 있습니다");
  }
  if (!/^https?:\/\//i.test(site)) {
    throw new Error(`run-notify: --site 값은 http(s):// 스킴이 필요합니다: "${site}"`);
  }

  return { from: raw.from as string, to: raw.to as string, top, site, dryRun: raw.dryRun as boolean };
}

/**
 * `DISCORD_WEBHOOK_URL` 하나만 검증하는 소형 스키마 — `src/pipeline/shared/env.ts`(ST-01 소유)의
 * `loadEnv()`는 `RIOT_API_KEY`를 필수로 요구해 "디스코드 알림만 보내고 싶다"는 이 스크립트의
 * 실전 전송 분기에 불필요한 결합을 만든다(코디네이터 후속 지시, 2026-09-05 — `--dry-run`이
 * `RIOT_API_KEY` 없이는 아예 실행되지 않던 결함 수정). `loadEnv()`를 호출하지 않는다.
 */
const discordWebhookEnvSchema = z.object({
  DISCORD_WEBHOOK_URL: z.string().min(1, "DISCORD_WEBHOOK_URL is required"),
});

/**
 * 실전 전송 직전(dry-run이 아닐 때)에만 호출한다 — `--dry-run`은 이 함수를 아예 호출하지 않으므로
 * `RIOT_API_KEY`는 물론 `DISCORD_WEBHOOK_URL`도 없이 동작한다. `source` 기본값은 `process.env`지만
 * 테스트는 임의 객체를 주입해 실제 프로세스 환경변수를 건드리지 않는다(`loadEnv({...})` 테스트
 * 주입 패턴과 동일, `src/pipeline/shared/__tests__/env.test.ts` 참고).
 */
export function loadDiscordWebhookUrl(source: Partial<NodeJS.ProcessEnv> = process.env): string {
  const parsed = discordWebhookEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("run-notify: DISCORD_WEBHOOK_URL 미설정 — .env에 값을 채우거나 --dry-run으로 실행");
  }
  return parsed.data.DISCORD_WEBHOOK_URL;
}

/** data/aggregated/deltas/{from}_{to}.json 로드 — 없으면 run-match.ts 실행을 안내하는 에러로
 * 즉시 실패한다(delta.ts loadAggregatedPatch와 동일한 "애매하게 죽지 않기" 원칙). `dataRoot`는
 * 테스트 격리용 오버라이드(기본 DATA_ROOT) — `shared/paths.ts`의 `deltasFile` 헬퍼가 이제
 * dataRoot를 직접 받으므로(2026-09-05 리팩토링) 경로를 로컬로 재조립하지 않는다. */
export function loadDeltasFile(from: PatchId, to: PatchId, dataRoot: string = DATA_ROOT): DeltasFile {
  const file = deltasFile(from, to, dataRoot);
  if (!fs.existsSync(file)) {
    throw new Error(
      `run-notify: ${file} 없음 — 먼저 실행: npx tsx scripts/run-match.ts --from ${from} --to ${to}`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as DeltasFile;
}

/**
 * notes/{patch}.json에서 "패치노트가 언급한 고유 엔티티 수"를 센다(헤드라인 "패치노트는 N개
 * 엔티티를 말했고"용, `countEntityNotes` 참고). **`meta.itemCount`(전체 노트 줄 수, system/other
 * 포함)를 그대로 쓰지 않는다** — ST-11 `countRelevantNoteEntities`와 동일 규칙(코디네이터 후속
 * 지시로 통일, 2026-09-05). 파일이 없으면 null — buildBriefingEmbeds가 이 구간을 생략하고 계속
 * 진행한다(무근거로 지어내지 않음). 파일은 있지만 항목이 없거나 champion/item 항목이 0건이면
 * 0(유효한 실측값). `dataRoot`는 `loadDeltasFile`과 동일한 테스트 격리용 오버라이드.
 */
export function loadNoteCount(patch: PatchId, dataRoot: string = DATA_ROOT): number | null {
  const file = notesFile(patch, dataRoot);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { items?: PatchNoteItem[] };
  return countEntityNotes(parsed.items ?? []);
}

/** aggregated/{patch}/summary.json에서 매치 수를 읽는다(footer "n={nFrom}/{nTo}"용). 파일이
 * 없으면 null. `dataRoot`는 위와 동일한 테스트 격리용 오버라이드. */
export function loadMatchCount(patch: PatchId, dataRoot: string = DATA_ROOT): number | null {
  const file = path.join(aggregatedDir(patch, dataRoot), "summary.json");
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { data?: { matches?: number } };
  return typeof parsed.data?.matches === "number" ? parsed.data.matches : null;
}

/** data/aggregated/deltas/{from}_{to}.notify.json — 전송 결과 로그. 웹훅 URL은 절대 담지 않는다. */
function notifyLogFile(from: PatchId, to: PatchId, dataRoot: string): string {
  return path.join(dataRoot, "aggregated", "deltas", `${from}_${to}.notify.json`);
}

interface NotifyLog {
  from: PatchId;
  to: PatchId;
  sentAt: string;
  status: number;
  retries: number;
}

function writeNotifyLog(log: NotifyLog, dataRoot: string): string {
  const file = notifyLogFile(log.from, log.to, dataRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return file;
}

/** 디스코드가 실제로 세는 방식(title+description+footer.text+Σ(name+value))으로 embed 본문
 * 문자수를 계산한다 — `JSON.stringify(embeds).length`는 따옴표·콤마·이스케이프까지 포함해
 * 부풀려진 숫자라 6,000자 상한과 직접 비교할 수 없다(로그 확인용 숫자가 실제 제한과 다른 값이면
 * 오해를 부른다). */
function countEmbedChars(embeds: ReturnType<typeof buildBriefingEmbeds>): number {
  return embeds.reduce(
    (sum, e) =>
      sum +
      e.title.length +
      e.description.length +
      e.footer.text.length +
      e.fields.reduce((fieldSum, f) => fieldSum + f.name.length + f.value.length, 0),
    0
  );
}

export interface RunNotifyDeps {
  /** sendWebhook에 그대로 전달 — 테스트 주입용(기본 전역 fetch). */
  fetchImpl?: typeof fetch;
  /** DISCORD_WEBHOOK_URL 조회 소스 — 테스트 주입용(기본 process.env). dry-run이면 아예 읽지 않는다. */
  env?: Partial<NodeJS.ProcessEnv>;
  /** data/ 루트 오버라이드 — 테스트 격리용 임시 디렉토리(기본 DATA_ROOT). */
  dataRoot?: string;
}

export interface RunNotifyResult {
  dryRun: boolean;
  embeds: ReturnType<typeof buildBriefingEmbeds>;
  /** dry-run이면 undefined(전송 자체를 안 함). */
  send?: { status: number; retries: number; logFile: string };
}

/**
 * `main()`의 핵심 로직 — CLI 인자 파싱(`process.argv`)·`main()` 자체의 콘솔 헤더 로그와 분리해
 * 순수 입력(`args`)과 주입 가능한 의존성(`deps`)만으로 동작하게 한다(코디네이터 후속 지시,
 * 2026-09-05 — 전송 성공 경로가 한 번도 테스트되지 않은 문제 해결). dry-run 분기는 `deps.env`를
 * 전혀 읽지 않는다 — 위 `loadDiscordWebhookUrl` 관련 지시와 함께, `--dry-run`이 어떤 환경변수도
 * 없이 동작함을 이 함수 구조 자체가 보장한다.
 */
export async function runNotify(args: RunNotifyArgs, deps: RunNotifyDeps = {}): Promise<RunNotifyResult> {
  const dataRoot = deps.dataRoot ?? DATA_ROOT;
  const deltas = loadDeltasFile(args.from, args.to, dataRoot);
  const noteCount = loadNoteCount(args.to, dataRoot);
  const matchCounts = { from: loadMatchCount(args.from, dataRoot), to: loadMatchCount(args.to, dataRoot) };

  const embeds = buildBriefingEmbeds(deltas, {
    siteUrl: args.site,
    topN: args.top,
    noteCount,
    matchCounts,
  });
  const payload = { username: "patchdrift", embeds };

  console.log(
    `[run-notify] embeds=${embeds.length} fields=${embeds[0]?.fields.length ?? 0} (본문 ${countEmbedChars(embeds)}/6000자)`
  );

  if (args.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    console.log("[run-notify] --dry-run — 전송 생략");
    return { dryRun: true, embeds };
  }

  const webhookUrl = loadDiscordWebhookUrl(deps.env ?? process.env);
  const result = await sendWebhook(webhookUrl, payload, deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : undefined);
  const logFile = writeNotifyLog(
    {
      from: args.from,
      to: args.to,
      sentAt: new Date().toISOString(),
      status: result.status,
      retries: result.retries,
    },
    dataRoot
  );
  console.log(`[run-notify] 전송 완료 status=${result.status} retries=${result.retries} → ${logFile}`);
  return { dryRun: false, embeds, send: { status: result.status, retries: result.retries, logFile } };
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[run-notify] from=${args.from} to=${args.to} top=${args.top} site=${args.site} dryRun=${args.dryRun}`);
  await runNotify(args);
}

// run-match.ts/run-aggregate.ts와 동일한 가드(scripts/shared/cli.ts) — import만으로(예: parseArgs
// 단위 테스트) main()이 실행되지 않게 한다.
if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error("run-notify 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
