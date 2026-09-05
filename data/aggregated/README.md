# data/aggregated — 커밋 대상 집계 산출물

이 디렉토리는 웹(`src/lib/data.ts`)이 **빌드 타임에만** 읽는 유일한 데이터 소스다. 런타임(브라우저)
에서 이 디렉토리를 다시 fetch하지 않는다 — 새 패치 데이터가 필요하면 파이프라인을 다시 돌리고
Next.js를 재빌드해야 한다(F7 "정적 배포·상시 작동" 원칙).

`data/raw/`(원본 매치·타임라인 JSONL)와 `data/cache/`(LLM 캐시)는 이 디렉토리와 반대로
**커밋하지 않는다**(`.gitignore`). 이 디렉토리만 git에 커밋해 레포만 clone해도 즉시
`npm run build`가 성립하도록 한다(재현 가능한 빌드).

## 파일 레이아웃

```
data/aggregated/
├── {patch}/                    # 예: 26.17, 26.18 — ST-01 PatchId 표기(패치노트 표기, "26.NN")
│   ├── champions.json          # RowsFile<ChampionStat> — 포지션별 픽·밴·승률 + CI
│   ├── items.json              # RowsFile<ItemStat> — 완성템 채택률 + CI
│   ├── lanes.json              # RowsFile<LaneGoldStat> — 라인별 골드@10/@14
│   ├── objectives.json         # DataFile<ObjectiveStat> — 첫 오브젝트 시각(용/전령/바론/포탑)
│   └── summary.json            # DataFile<PatchSummary> — 매치 평균(경기 시간 등) + nMatches 등 메타
├── notes/
│   └── {patch}.json            # ST-07 패치노트 파서 출력 — {meta, summary, sections, items}
└── deltas/
    └── {from}_{to}.json        # ST-08/09 최종 판정 — {meta:{from,to,generatedAt,n,counts,qAlpha,llm?}, rows: DeltaRecord[]}
```

각 5종 집계 파일의 `meta`는 `AggregateMeta`(`patch, generatedAt, nMatches, nParticipants, nTimelines,
source`) 공통 포맷을 따른다. `deltas/*.json`만 별도 스키마(`DeltasFileMeta`)를 쓴다 —
`src/pipeline/types.ts`가 Ground Truth.

## 생성 명령

```bash
# 1) 상세 매치 수집 (F1) — data/raw/{patch}/matches.jsonl
npm run pipeline:collect -- --patch 26.18 --target 10000

# 2) 타임라인 표본 수집 (F8) — data/raw/{patch}/timelines.jsonl
npx tsx scripts/run-timeline.ts --patch 26.18 --sample 1500

# 3) 집계 (F2/F8) — 이 디렉토리에 5종 JSON 기록
npm run pipeline:aggregate -- --patch 26.18

# 4) Data Dragon 자산 갱신 — data/ddragon/{v}/*.json, public/dd/**
npm run pipeline:ddragon

# 5) 패치노트 파싱 + 짝짓기 + 판정 (F3/F4) — deltas/{from}_{to}.json 기록
npm run pipeline:match -- --from 26.17 --to 26.18
```

패치별 실행 순서·재개 규칙은 최상위 `README.md`("운영 절차") 참고. `scripts/collect-all.sh`가
1)·2)를 여러 패치에 대해 순차 실행하는 오케스트레이션 스크립트다.

## 커밋 규칙

- **커밋한다**: 이 디렉토리 전체(`{patch}/*.json`, `notes/*.json`, `deltas/{from}_{to}.json`).
  파이프라인 재실행 없이 `git clone` → `npm ci` → `npm run build`만으로 사이트가 재현돼야 한다.
- **커밋하지 않는다**: `data/raw/**`(원본, 용량·terms 이유), `data/cache/llm/**`(LLM 캐시는
  별도 gitignore 대상 — 예산 보호용 로컬/CI 재사용 캐시이지 웹이 읽는 계약이 아니다).
- **자기쌍 파일(`{patch}_{patch}.json`, 예 `26.17_26.17.json`) — 커밋하지 않는다.**
  같은 패치를 from/to에 동시에 넣어 `pipeline:match`를 실행하면 델타가 전부 0이 되는
  개발·스모크 테스트용 산출물이다(실제 두 패치를 비교하는 게 아니므로 미공지 판정이
  의미가 없다). 로컬에서 파이프라인 배선만 확인할 때 생기며, 실 서비스 데이터가 아니다.
  이미 레포에 남아 있다면 실제 패치 쌍(`{from}_{to}.json`, from≠to)이 생성된 뒤 정리 대상이다 —
  `src/lib/data.ts`의 `listPatchPairs()`가 `deltas/*.json` 파일명을 전부 패치 쌍 후보로 읽으므로
  자기쌍 파일이 남아 있으면 브리핑 화면에 무의미한 쌍이 노출된다.
- 커밋 시 메시지 규칙: GitHub Actions(`collect.yml`)의 자동 커밋은 `chore(data): auto-collect
  {from} -> {to}`. 로컬에서 수동으로 이 디렉토리를 갱신해 커밋할 때도 같은 접두(`chore(data): ...`)를
  따른다 — 코드 변경 커밋과 데이터 갱신 커밋을 diff에서 구분하기 위함이다.
