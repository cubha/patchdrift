#!/usr/bin/env bash
# 실수집 오케스트레이션: 지정 패치 목록(기본 26.17,26.16)에 대해 상세 수집(F1) 전체 →
# 타임라인 표본 수집(F8) 전체 순으로 실행한다. 재실행 안전(idempotent) — run-collect.ts/
# run-timeline.ts가 이미 받은 매치 ID·표본을 각자 스킵하므로 중단 후 재실행해도 처음부터
# 다시 받지 않는다.
#
# 사용법:
#   scripts/collect-all.sh [--patches 26.17,26.16] [--target 10000] [--sample 1500]
#
# 예: 도그푸딩 26.17→26.18만 다시 돌릴 때
#   scripts/collect-all.sh --patches 26.18 --target 10000 --sample 1500
#
# 실패 처리: 한 패치의 collect/timeline이 실패해도 나머지 패치는 계속 시도한다(장시간 배치
# 중 한 티어 조회가 일시 실패했다고 전체를 멈추지 않기 위함) — 대신 실패 건수를 누적해 마지막에
# 0이 아닌 exit code로 종료한다. GitHub Actions(collect.yml)나 cron이 이 스크립트를 직접 호출할
# 경우에도 실패를 놓치지 않는다.
set -u
cd "$(dirname "$0")/.."

PATCHES="26.17,26.16"
TARGET=10000
SAMPLE=1500

while [[ $# -gt 0 ]]; do
  case "$1" in
    --patches)
      PATCHES="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --sample)
      SAMPLE="$2"
      shift 2
      ;;
    *)
      echo "collect-all: unknown argument \"$1\"" >&2
      exit 2
      ;;
  esac
done

# KST 고정 — 러너(GH Actions)·로컬(WSL) 타임존이 다를 수 있어 로그 시각을 항상 KST로 통일한다
# (패치 라이브·D+1 게이트 판단 기준이 전부 KST이므로 로그도 같은 기준이어야 대조가 쉽다).
log() { echo "[$(TZ=Asia/Seoul date '+%F %T KST')] $*"; }

IFS=',' read -r -a PATCH_ARR <<<"$PATCHES"

FAILURES=0

log "start collect-all patches=${PATCHES} target=${TARGET} sample=${SAMPLE}"

for P in "${PATCH_ARR[@]}"; do
  log "collect $P (target=$TARGET)"
  npx tsx scripts/run-collect.ts --patch "$P" --target "$TARGET"
  rc=$?
  log "collect $P exit=$rc"
  if [[ $rc -ne 0 ]]; then
    FAILURES=$((FAILURES + 1))
  fi
done

for P in "${PATCH_ARR[@]}"; do
  log "timeline $P (sample=$SAMPLE)"
  npx tsx scripts/run-timeline.ts --patch "$P" --sample "$SAMPLE"
  rc=$?
  log "timeline $P exit=$rc"
  if [[ $rc -ne 0 ]]; then
    FAILURES=$((FAILURES + 1))
  fi
done

log "done collect-all — failures=$FAILURES"
if [[ $FAILURES -gt 0 ]]; then
  exit 1
fi
exit 0
