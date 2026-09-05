#!/usr/bin/env bash
# 실수집 오케스트레이션: 26.17 → 26.16 상세(각 1만 목표) → 타임라인 표본(각 1,500). 재실행 안전(idempotent).
set -u
cd "$(dirname "$0")/.."
log(){ echo "[$(date '+%F %T')] $*"; }
log "start collect-all"
for P in 26.17 26.16; do
  log "collect $P"; npx tsx scripts/run-collect.ts --patch "$P" --target 10000; log "collect $P exit=$?"
done
for P in 26.17 26.16; do
  log "timeline $P"; npx tsx scripts/run-timeline.ts --patch "$P" --sample 1500; log "timeline $P exit=$?"
done
log "done collect-all"
