# 팀 리서치 보고서 — patchdrift

> 생성일: 2026-09-05
> 프로젝트: patchdrift — LoL 패치 선언·관측 괴리 감지 (원티드 AI 챔피언십 2026)
> 리서치 깊이: 기본 (tech / architecture / market(게이트 검증 한정) / 제약사항=팀 리더)
> 참여 에이전트: 3명 (sonnet) + 팀 리더 Context7·WebFetch 직접 실측

---

## 1. 프로젝트 개요

- 목적: 패치 전후 매치 통계 델타를 공식 패치노트 `Before ⇒ After` 항목과 자동 짝짓기하고, **짝 없는 델타 = 미공지 변화**로 판정해 브리핑한다
- 타겟: LoL KR 코치·클랜장·분석 스트리머 (사용 순간: 패치 배포 후 24~72h)
- 차별 문장(고정): "op.gg·tactics.tools는 패치 *후* 통계를 보여준다. 우리는 패치노트가 *말한 것*과 통계가 *말하는 것*의 괴리를 보여준다"
- 핵심 제약: 1인+Claude Code 구현 창 9/5~9/13 · 배포 9/20 · 예선 9/21~10/5 상시 작동 · **런타임 외부 API 0**(사전 인덱싱+정적 서빙) · LLM 배치·상한·캐시 폴백 · 모든 판정문에 원천 링크 · 라이엇 Personal 키 20/1s·100/120s

### ⚠️ 팀 리더 실측으로 정정된 전제 (2026-09-05)
| 항목 | 이전 메모리 | 실측 | 출처 |
|---|---|---|---|
| 구축·게이트 패치 쌍 | 26.17→26.18 | **26.16→26.17** — 26.18은 **9/10(목) 배포 예정**이라 아직 없음 | [lolnow.gg](https://lolnow.gg/patch-notes/), [sheepesports](https://www.sheepesports.com/en/articles/lol-patch-26-18-preview-master-yi-buffed-cassiopeia-rebalanced/en) |
| 도그푸딩 9/14~18 | 과거 아카이브 | **26.17→26.18 라이브 데이터**로 실전 리허설 가능 | 위 동일 |
| 패치노트 URL | 미확인 | `https://www.leagueoflegends.com/{ko-kr\|en-us}/news/game-updates/league-of-legends-patch-26-17-notes/` (단축형 `patch-26-17-notes`는 404). 목록 `/ko-kr/news/tags/patch-notes/` | WebFetch 실측 |
| ko-kr 패치노트 렌더 | 미확인 | **정적 HTML**(JS 불필요). 헤더: 패치 하이라이트/챔피언/아이템/클래식/무작위 총력전/아레나/… 항목 형식 `{스킬키} - {스킬명}: {스탯} A ⇒ B`, 아이템 `폭풍갈퀴 공격 속도: 20% ⇒ 25%`, 요약문 존재 | WebFetch 실측 |

---

## 2. 기술 스택 리서치 (tech-researcher)

### 2-1. 라이엇 API 클라이언트 + 레이트 리밋
| 기술 | 최신 | 장점 | 단점 | 추천 | 출처 |
|---|---|---|---|---|---|
| 직접 fetch + **bottleneck** | wk DL ≈3M | 압도적 안정성. `reservoir`+`chain()`으로 20/1s·100/120s 2단을 정확히 표현(Personal 키라 고정값·동적 감지 불필요). 429 Retry-After는 wrapper 수 줄 | Riot 응답 타입 직접 정의 | ★4 | [npm-compare](https://npm-compare.com/p-limit,p-queue,p-throttle), Context7 `/sgrondin/bottleneck` |
| twisted | v1.72.2 | 완전 타입, 헤더 파싱 자동 리밋, 429 자동 재시도, zero-dep | 다운로드 극소·포크 난립(활성 메인테이너 미확인) | ★3 | [npm](https://www.npmjs.com/package/twisted), Context7 `/sansossio/twisted` |
| @fightmegg/riot-rate-limiter | 0.0.23(1y) | Riot 헤더 실시간 파싱 | 유지보수 중단(Snyk Inactive) | ★2 | [Snyk](https://snyk.io/advisor/npm-package/@fightmegg/riot-rate-limiter) |

**예산 계산**: 병목 = 100/120s = **0.83 req/s**. 상세 1콜/매치 → 2,000매치 40분 · 10,000매치 3.3h. 타임라인 추가 시 ×2.

### 2-2. 집계 저장 형식
| 기술 | 장점 | 단점 | 추천 | 출처 |
|---|---|---|---|---|
| **순수 TS + reduce-on-ingest**(매치당 필요 필드만 JSONL 저장) | 네이티브 의존 0, GH Actions·Vercel 호환 무관, 집계=group-by 수준이라 충분 | ad-hoc SQL 탐색 불편 | ★5 (교차분석 채택) | 아키텍처 리서처 reduce-on-ingest 권고 |
| DuckDB (`@duckdb/node-api`) | `read_json_auto` glob 집계, SQL 윈도우, Parquet export | 구 `duckdb`→`@duckdb/node-api` 전환기, 네이티브 바이너리 GH Actions 호환 미확인 | ★3 | [duckdb docs](https://duckdb.org/docs/lts/clients/nodejs/overview), Context7 `/duckdb/duckdb-node-neo` |
| better-sqlite3 v13 | 성숙·동기 API | JSON flatten 선행 필요 | ★3 | [npm trends](https://npmtrends.com/better-sqlite3-vs-node-sqlite3-vs-sqlite3) |
| Polars | 벡터화 속도 | TS 하네스 불일치·별도 런타임 | ★2 | [pola.rs](https://pola.rs/) |

### 2-3. 패치노트 파서
| 기술 | 최신 | 판정 | 추천 | 출처 |
|---|---|---|---|---|
| **cheerio** | 1.2.0 (wk 28.8M) | ko-kr·en-us 모두 정적 HTML 실측 → 브라우저 불필요 | ★5 | 팀 리더 WebFetch 실측, [npm trends](https://npmtrends.com/cheerio-vs-jsdom-vs-linkedom) |
| linkedom | 0.18.13 | SSR용, 이점 없음 | ★2 | 동일 |
| Playwright | — | 불필요(정적 확인) | ★1 | — |

### 2-4. 웹 브리핑 프론트
| 기술 | 장점 | 단점 | 추천 | 출처 |
|---|---|---|---|---|
| **Next.js 16 App Router `output:'export'`** | 완전 정적, Vercel 무료 최적, 빌드 시 JSON import 임베드, 생태계 | RSC 학습곡선(export 모드라 API routes 불필요) | ★4 | [Vercel changelog](https://vercel.com/changelog/vercel-functions-for-hobby-can-now-run-up-to-60-seconds) |
| Astro | 최소 JS | 차트 island 설정, 하네스 스킬(ui-plan·verify) 경험치 Next 편중 | ★4→3(교차) | [astro-vs-nextjs](https://tech-insider.org/astro-vs-nextjs-2026/) |
| Vite+React SPA | 가장 가벼움 | 라우팅·메타 수작업 | ★3 | — |

차트: **recharts**(wk 46~50M) — [pkgpulse](https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026)

### 2-5. 디스코드 웹훅 + 배치 실행 환경
| 기술 | 판정 | 추천 | 출처 |
|---|---|---|---|
| **fetch 기반 Discord Webhook** | embed ≤10/메시지·총 6,000자, 429 `retry_after` 재시도만 구현. discord.js 불필요 | ★5 | [embed limits](https://discord-webhook.com/en/blog/discord-webhook-embed-limits/) |
| **GitHub Actions cron** | 퍼블릭 무제한/프라이빗 2,000분·job 6h. 수집 배치(3~7h)에 적합, `workflow_dispatch` 수동 백업 | ★5 | [cicdcalculator](https://cicdcalculator.com/github-actions-free-tier) |
| Vercel Cron(Hobby) | 1일 1회·함수 60~300s → 장시간 수집 부적합. 서빙 전용 | ★2 | [runhooks](https://runhooks.app/blog/vercel-hobby-cron-job-limits-explained/) |
| 로컬 WSL cron | 개발·초기 수집용. 상시 요건엔 부적합 | ★2 | — |

---

## 3. 아키텍처 패턴 리서치 (architecture-researcher)

### 3-1. 수집 파이프라인
| 패턴 | 적합 | 복잡도 | 출처 |
|---|---|---|---|
| 챌린저/GM/마스터 시드 → puuid → 매치ID | 상위 티어 대량 확보, 유저 DB 불필요 | 低 | [LolCrawler](https://github.com/christophM/LolCrawler) |
| `data/raw/{patch}/{matchId}.json` + 존재 체크 스킵 (idempotent) | 중단·재개 잦은 1인 배치 | 低 | [Incremental Ingestion](https://unstructured.io/insights/incremental-data-ingestion-strategies-for-continuous-pipelines) |
| `startTime/endTime`로 ID 조회 축소 + `info.gameVersion` 접두(major.minor)로 **패치 경계 확정** | 롤아웃 시차 대응 — 시간창은 휴리스틱, 컷은 필드값 | 中 | [RiotWatcher MatchApiV5](https://riot-watcher.readthedocs.io/en/latest/riotwatcher/LeagueOfLegends/MatchApiV5.html) |
| reduce-on-ingest(필요 필드만 추출, 타임라인 원본 미보관) | 타임라인 매치당 수백 KB~MB | 中 | 설계 권고(미확인 실측) |

### 3-2. 델타 유의성 판정 — **핵심 리스크**
2,000매치 × 10슬롯 / ~170챔피언 ≈ 챔피언당 **100~120게임** → 승률 95% CI 반폭 **±9~10%p**. 밸런스 패치 변동 폭은 1~3%p → **승률 델타만으로 미공지 판정 불가**. 2%p 차이를 80% 검정력으로 잡으려면 챔피언당 ≈9,800게임/그룹.

| 패턴 | 용도 | 복잡도 | 출처 |
|---|---|---|---|
| Wilson score interval | 분모=전체매치 지표(픽률·밴률) | 低 | [MetricGate](https://metricgate.com/docs/wilson-score-interval/) |
| Newcombe(Wilson) 두 비율 차이 CI | 패치 전/후 델타 검정 | 中 | [Newcombe-Wilson](https://fangya.medium.com/newcombe-wilson-confidence-interval-1939dc8fa8d7) |
| Beta-binomial 경험적 베이즈 축소 | 저픽률 챔피언 승률 왜곡 완화 | 中 | [Empirical Bayes](https://andrewpwheeler.com/2018/07/23/sorting-rates-using-empirical-bayes/) |
| 최소 n 게이트 + BH-FDR | 170챔피언×다지표 동시검정 거짓양성 통제 | 中 | 통계 일반 관행 |

**권고**: 1차 판정축 = **픽률·밴률·아이템 채택률·라인 골드@10/@14·첫 오브젝트 시각**(n=전체매치, CI ±1%p). 승률 = n≥게이트 + Newcombe CI 비중첩 + FDR 통과 시만 "관측된 변화", 미만은 "표본 부족" 라벨.

### 3-3. 선언↔관측 짝짓기 — 레코드 링키지 구조
| 패턴 | 용도 | 복잡도 | 출처 |
|---|---|---|---|
| Blocking(엔티티명 후보 축소) | 1단 결정론 — 패치노트 챔피언/아이템명 ↔ 델타 엔티티 | 低 | [Data Ladder](https://dataladder.com/record-linkage-techniques-for-incomplete-data/) |
| Candidate scoring + 임계값 | 델타 방향·크기 정합성 점수 | 中 | [PuppyGraph](https://www.puppygraph.com/blog/entity-resolution) |
| LLM 보조(2단, 짝 없는 델타 전용) | 간접 영향 후보 추론. **반환 ID는 입력 후보셋 내 존재 검증 후 아니면 폐기** → 인용 보존을 구조로 강제 | 中 | 자체 설계 |

안정 ID 네임스페이스: `champion:{key}:{metric}`, `item:{id}:{metric}`, 패치노트 항목도 동일 ID. 미공지 = 1단·2단 모두 실패 + 원천 매치ID·집계 링크 첨부.

### 3-4. 정적 서빙
**SSG 빌드타임 임베드** 채택 — `data/aggregated/*.json`만 커밋 → 순수 정적. 신규 패치 = 수집→집계→커밋→재빌드(GH Actions). 업타임: UptimeRobot 무료 5분 간격 ([uptimerobot](https://uptimerobot.com/cron-job-monitoring/)).

### 3-5. 디렉토리 구조 — 단일 패키지(모노레포 기각: 4.2일 공수 대비 오버헤드)
```
patchdrift/
├── data/raw/{patch}/…            # .gitignore
├── data/aggregated/{patch}/{champions,items,lanes,objectives}.json
├── data/aggregated/deltas/{from}_{to}.json   # 짝짓기·미공지 판정(근거 링크)
├── src/collect/  (seed·crawler·checkpoint·limiter)
├── src/aggregate/ (winrate·pickban·items·lanes·objectives·stats)
├── src/match/    (patchnotes-parser·entity-match·llm-match)
├── src/discord/  (webhook)
├── app/          (Next.js App Router, static export)
├── scripts/      (run-collect·run-aggregate·run-match·run-notify)
└── .github/workflows/ (collect.yml cron · rebuild)
```

---

## 4. 경쟁 분석 (market-researcher — 접속 실패 11곳 검증 한정)

일반 경쟁 지도는 메모리 실측 재사용(tactics.tools=델타만·u.gg=사람 해설·op.gg=드롭다운·lolalytics=단일 패치·HSReplay=아티클·overbuff=종료).

| 사이트 | (a) 전후 비교 | (b) 패치노트 자동 대조 | (c) 미공지 추출 | 신뢰도 |
|---|---|---|---|---|
| blitz.gg `tools.blitz.gg/lol/patch-analysis` | 있음 | **미확인**(DNS 실패) — (b) 최유력 후보 | 미확인 | 낮음 |
| mobalytics.gg | 있음 | 없음(사람 해설) | 없음 | 중간 |
| metatft.com | 미확인(JS) | 미확인 | 미확인 | 낮음 |
| **valking.gg**(발로란트) | 있음 | **부분** — "12 buffs, 0 nerfs, Harbor +2pp" 헤드라인 병기. 항목 단위 매칭인지 미확인(403) | 없음/미확인 | 중간 |
| metabot.gg | 있음(Winners & Losers) | 미확인 | 미확인 | 낮~중 |
| dak.gg / op.gg/pubg | 랜딩만 | 미확인 | 미확인 | 중간 |
| dotabuff / stratz | 있음(Trends) | 없음/미확인 | 없음/미확인 | 낮~중 |
| fc-data | 상충 | 없음/미확인 | — | 낮음 |
| 로아차트 | 대상 외(시세) | — | — | 높음 |

**결론**: (b)+(c) 결합을 확인한 곳 **0**. (c)는 11곳 어디에도 등장 안 함(unfalsified). (b)는 valking.gg가 헤드라인 수준 부분 구현 → **차별의 무게중심을 (c) 미공지 추출에 둔다**. 배포 전 Playwright로 blitz patch-analysis·valking 패치 페이지 원문 재확인(잔여 게이트).

---

## 5. UI/UX 트렌드 — 해당 없음 (--deep 아님)

---

## 6. 라이브러리 최신 정보 (Context7, 팀 리더)
- **bottleneck** `/sgrondin/bottleneck`: `limiterA.chain(limiterG)` 계층 리밋. 20/1s = `{reservoir:20, reservoirRefreshAmount:20, reservoirRefreshInterval:1000, minTime:50, maxConcurrent:4}` ⟶ chain ⟵ 100/120s = `{reservoir:100, reservoirRefreshAmount:100, reservoirRefreshInterval:120000}`. 경고: reservoir 단독은 refresh 순간 버스트 → minTime·maxConcurrent 병용
- **twisted** `/sansossio/twisted`: `new LolApi({rateLimitRetry:true, rateLimitRetryAttempts, concurrency, key})`. 문서 스니펫 7개(얇음) → 2순위
- **DuckDB node-neo** `/duckdb/duckdb-node-neo`: `DuckDBInstance.create()`→`connect()`→`runAndRead(sql)`→`getRowObjectsJson()`. ad-hoc 탐색 시 선택 사용

---

## 7. 종합 분석 및 권장안

### 크로스 분석
1. **표본 수 ↔ 레이트 리밋**: 통계적 유의성엔 상세 1만+ 매치가 필요하고, 상세만이면 3.3h/패치로 GH Actions 6h 안에 든다. 타임라인은 표본(1~2천)만 → **상세 전량·타임라인 표본** 2층 수집이 유일한 정합점
2. **reduce-on-ingest ↔ DuckDB**: 매치당 필요 필드만 저장하면 집계는 순수 TS group-by로 끝난다 → 네이티브 의존 제거(GH Actions·Vercel 호환 미확인 리스크 소멸)
3. **정적 HTML 패치노트 ↔ cheerio**: Playwright 없이 GH Actions에서 파싱 가능 → 배치 하나로 수집·파싱·판정·알림 전부 실행
4. **경쟁 (c) 공백 ↔ 판정 설계**: 미공지 판정이 노이즈면 차별이 곧 약점이 된다 → 3-2 통계 게이트·FDR은 선택이 아니라 차별의 전제

### 기술 스택 권장안
| 카테고리 | 1순위 | 2순위 | 근거 |
|---|---|---|---|
| 언어·런타임 | TypeScript / Node 22 | — | 하네스 verify.sh(tsc+eslint) 정합 |
| Riot 클라이언트 | fetch + bottleneck chain | twisted | 안정성·고정 리밋 |
| 저장·집계 | JSONL reduce-on-ingest + 순수 TS | DuckDB node-api | 의존 0 |
| 패치노트 파서 | cheerio | linkedom | 정적 HTML 실측 |
| 통계 | 자체 구현(Wilson·Newcombe·BH) | simple-statistics | 함수 3개 수준 |
| LLM 짝짓기 | Claude API(배치·캐시·상한, 구현 시 claude-api 스킬 참조) | — | 요구사항 3 자체 에이전트 파이프라인 |
| 프론트 | Next.js 16 App Router static export + recharts + Tailwind | Astro | Vercel 무료·하네스 경험치 |
| 배치 실행 | GitHub Actions cron + workflow_dispatch | 로컬 WSL(초기 수집) | 6h·무료 |
| 알림 | fetch Discord Webhook | — | 의존 0 |
| 배포·모니터링 | Vercel(정적) + UptimeRobot | Cloudflare Pages | 무료 |

### 아키텍처 권장안
단일 패키지 `src/{collect,aggregate,match,discord}` + `app/`(Next). 데이터 흐름: `collect`(시드→ID→상세 전량·타임라인 표본, idempotent) → `aggregate`(패치별 지표 JSON + CI) → `match`(패치노트 파서 → 1단 결정론 → 2단 LLM(후보셋 검증) → 델타 JSON with 근거 링크) → `app`(빌드 임베드) / `discord`(브리핑 전송). 런타임 서버 0.

### 차별화 전략
데모 첫 컷 = **미공지 변화**(c). (b)는 valking.gg 부분 선점 가능성 → "항목 단위 1:1 대조 + 짝 없는 것 추출"을 한 화면에서 보여주는 **형태**로 차별.

### 리스크 및 주의사항
| 리스크 | 대응 |
|---|---|
| 승률 델타 노이즈 → 오탐 미공지 | 1차축 픽·밴·아이템·골드·오브젝트, 승률 n 게이트+CI+FDR |
| 수집 시간(1만 매치 3.3h/패치) | 착수 즉시 로컬 수집 시작, 이후 GH Actions |
| `gameVersion` 포맷·`startTime` 파라미터 | D+1 게이트에서 실매치 1건으로 확인 |
| 패치노트 마크업 변경 | 파서 fixture 테스트 + 실패 시 이전 파싱 캐시 폴백 |
| LLM 예산 소진 | 세션 상한·캐시·폴백(요구사항 고정) |
| 라이엇 terms | 표시 허용·유료화 금지·아레나 Augments 승률 금지 |
| 경쟁 (b) 선점 미확인 4곳 | 배포 전 Playwright 재확인 |

---

## 8. 출처 통합
### 기술 스택
- https://www.npmjs.com/package/twisted · https://npm-compare.com/p-limit,p-queue,p-throttle · https://duckdb.org/docs/lts/clients/nodejs/overview · https://npmtrends.com/cheerio-vs-jsdom-vs-linkedom · https://tech-insider.org/astro-vs-nextjs-2026/ · https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026 · https://discord-webhook.com/en/blog/discord-webhook-embed-limits/ · https://cicdcalculator.com/github-actions-free-tier · https://runhooks.app/blog/vercel-hobby-cron-job-limits-explained/
### 아키텍처
- https://riot-api-libraries.readthedocs.io/en/latest/collectingdata.html · https://riot-watcher.readthedocs.io/en/latest/riotwatcher/LeagueOfLegends/MatchApiV5.html · https://github.com/christophM/LolCrawler · https://metricgate.com/docs/wilson-score-interval/ · https://fangya.medium.com/newcombe-wilson-confidence-interval-1939dc8fa8d7 · https://andrewpwheeler.com/2018/07/23/sorting-rates-using-empirical-bayes/ · https://dataladder.com/record-linkage-techniques-for-incomplete-data/ · https://uptimerobot.com/cron-job-monitoring/
### 경쟁 제품·일정
- https://tools.blitz.gg/lol/patch-analysis · https://valking.gg/en/patches/13-00 · https://metabot.gg/en/data-methodology · https://mobalytics.gg/lol/guides/patch-notes-breakdown · https://lolnow.gg/patch-notes/ · https://www.leagueoflegends.com/ko-kr/news/tags/patch-notes/

---

> 이 보고서는 Claude Code `/team-research` 스킬로 자동 생성되었습니다.
> 다음 단계: `/scope`(범위·스택 확정)
