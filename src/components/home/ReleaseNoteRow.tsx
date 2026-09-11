// src/components/home/ReleaseNoteRow.tsx
// 릴리즈노트 스트림 1개 그룹(엔티티)의 렌더 — HANDOFF-redesign-2026-09-10.md §4-1:
// "챔피언 카드(아이콘 56px) → 스킬 행(스펠 아이콘 40px) → `스탯: A ⇒ B` → 우측에 관측 판정 뱃지".
// 순수 프레젠테이션(서버 컴포넌트) — 상태·데이터 페칭은 page.tsx/ReleaseNoteStream이 소유한다.
// §1-2 불변식: 상태 색(--accent/--danger/--warn/--success)은 이 컴포넌트 안에서 재정의하지
// 않는다 — StatusBadge/DeltaValue가 이미 토큰을 바르게 쓰므로 그대로 위임.
//
// 2026-09-10 verify-impl 축B 반영 — 확정 시안 대비 3건:
//  1. `.rn-obs` 신설: 엔티티 이름 아래 대표 관측 1줄(지표·전/후·Δ·CI·q). 공지/미공지 공통.
//  2. `.verdict .m` 신설: 스킬 행마다 "노트=상향 · 관측=밴률 상승" 판정 근거 1줄.
//  3. `.gap-why`(추정 원인)를 metric 행 루프 **밖**으로 올렸다 — 시안은 엔티티당 1회이고,
//     행마다 반복하면 같은 문장이 카드 안에서 3~4번 되풀이된다.

import Link from "next/link";
import type { DeltaRecord, LanePosition } from "@/pipeline/types";
import EntityIcon from "@/components/EntityIcon";
import LaneGlyph from "@/components/LaneGlyph";
import SpellIcon from "@/components/SpellIcon";
import StatusBadge from "@/components/StatusBadge";
import DeltaValue from "@/components/DeltaValue";
import { itemHref, metricLabel } from "@/lib/format";
import { spellIconKey } from "@/pipeline/match/spell-icon";
import { excludeObservation, formatMetricValue, metricKind, resolveCause } from "./logic";
import { buildNoteVerdict, formatQ, selectEntityObservation } from "./streamVerdict";
import type { ReleaseStreamGroup } from "./releaseStream";
import type { StreamEntityIcon } from "./releaseStreamEntity";

export interface ReleaseNoteRowProps {
  group: ReleaseStreamGroup;
  icon: StreamEntityIcon;
  /** loadSpellIcons()?.icons — 없으면(자산 미보유·미실행) 전부 텍스트 폴백. */
  spellIcons: Record<string, string> | null;
  /** note.id → 그 노트를 근거로 매칭된 델타(deltas.rows의 matchedNoteIds 역색인, page.tsx가
   * 구성). 매칭된 델타가 없는 노트는 이 맵에 키가 없다 — 뱃지는 "관측 보류", 판정 문장은
   * 아예 만들지 않는다(무근거 문장 금지). */
  noteDeltas: Record<string, DeltaRecord>;
  /** 미공지 그룹의 "✕ {patch} 패치노트에 없음" 문구에 쓸 to-패치 번호. */
  patch: string | null;
  /** deltas.meta.qAlpha — 유의 판정 임계. 없으면 FDR_ALPHA 기본값(isSignificantDelta). */
  qAlpha?: number;
}

const FALLBACK_ICON_CLASS =
  "flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface-warm font-display text-sm font-bold text-fg-2";

/** 카드 엔티티 아이콘(56px) — 라인 엔티티(entityType="lane", 챔피언 자산 없음)는
 * DeltaTable.tsx의 RowIcon과 동형으로 LaneGlyph 박스를 쓴다(2026-09-10 verify-impl 축B 후속:
 * EntityIcon 기본 폴백이 "바텀"의 첫 글자 "바"로 렌더돼 대조표와 불일치했던 결함). */
function CardIcon({ icon, entity }: { icon: StreamEntityIcon; entity: string }) {
  if (icon.entityType === "lane" && icon.entityKey) {
    return (
      <span
        style={{ width: 56, height: 56 }}
        className="flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface-warm text-fg-2"
      >
        <LaneGlyph lane={icon.entityKey as LanePosition} size={34} labelled />
      </span>
    );
  }
  if (icon.entityType && icon.entityKey) {
    return <EntityIcon entityType={icon.entityType} entityKey={icon.entityKey} name={entity} size={56} />;
  }
  return (
    <span style={{ width: 56, height: 56 }} className={FALLBACK_ICON_CLASS}>
      {entity.slice(0, 1)}
    </span>
  );
}

/** 시안 `.rn-obs` — 엔티티 대표 관측 1줄. "밴률 26.8% → 42.4% ▲ +15.7%p CI ±1.3 · q<0.001" */
function ObservationLine({ record }: { record: DeltaRecord }) {
  const q = formatQ(record.q);
  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
      <span className="font-bold text-fg-2">{metricLabel(record.metric)}</span>
      <span className="font-mono tabular-nums">
        {formatMetricValue(record.before, record.metric)} →{" "}
        {formatMetricValue(record.after, record.metric)}
      </span>
      <DeltaValue delta={record.delta} ci={record.ci} kind={metricKind(record.metric)} />
      {q ? <span className="font-mono">· {q}</span> : null}
    </div>
  );
}

/** 노트 그룹의 노트들에 짝지어진 델타 — 같은 델타가 노트 여러 줄에 매칭될 수 있어(ST-08
 * matchedNoteIds) id로 중복을 제거한다. */
function matchedRecords(
  noteIds: readonly string[],
  noteDeltas: Record<string, DeltaRecord>
): DeltaRecord[] {
  const seen = new Set<string>();
  const out: DeltaRecord[] = [];
  for (const id of noteIds) {
    const record = noteDeltas[id];
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    out.push(record);
  }
  return out;
}

export default function ReleaseNoteRow({
  group,
  icon,
  spellIcons,
  noteDeltas,
  patch,
  qAlpha,
}: ReleaseNoteRowProps) {
  const isUnannounced = group.kind === "unannounced";
  const observation = isUnannounced
    ? selectEntityObservation(group.deltas)
    : selectEntityObservation(matchedRecords(group.notes.map((n) => n.id), noteDeltas));
  // 미공지 카드의 추정 원인 — 대표 관측 1건 기준으로 엔티티당 한 번만 렌더한다(시안 .gap-why).
  const gapCause = isUnannounced && observation ? resolveCause(observation) : null;
  // 헤더(ObservationLine)가 이미 보여준 대표 관측을 하단 리스트에서 제외 — 안 그러면 같은
  // 델타 행이 카드 안에서 두 번 렌더된다(2026-09-11 결함).
  const remainingDeltas = isUnannounced ? excludeObservation(group.deltas, observation) : [];

  return (
    <li
      className={
        isUnannounced
          ? "border-b border-l-4 border-border-soft border-l-accent bg-surface-warm last:border-b-0"
          : "border-b border-border-soft last:border-b-0"
      }
    >
      {/* 기본 접힘 아코디언 — 카드 전체가 항상 펼쳐져 화면을 뒤덮던 문제(2026-09-11) 수정.
          네이티브 <details>/<summary>라 서버 컴포넌트 그대로 유지할 수 있다(JS 상태 불필요). */}
      <details className="group px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
          <CardIcon icon={icon} entity={group.entity} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-bold text-fg">{group.entity}</div>
            {observation ? <ObservationLine record={observation} /> : null}
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 text-xs text-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>

        {isUnannounced ? (
          <>
            {patch ? (
              <div className="mt-3 text-xs font-bold text-accent">
                ✕ {patch} 패치노트에 {group.entity} 항목 없음 — 짝지을 선언이 존재하지 않습니다
              </div>
            ) : null}
            {gapCause && observation ? (
              <p className={`mt-2 text-xs ${gapCause.mode === "verified" ? "text-fg-2" : "text-muted"}`}>
                추정 원인: {gapCause.text}{" "}
                <Link href={itemHref(observation.id)} className="font-bold text-accent hover:underline">
                  관측 근거 보기 →
                </Link>
              </p>
            ) : null}
            {remainingDeltas.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-3">
                {remainingDeltas.map((row) => (
                  <li key={row.id} className="grid grid-cols-[1fr_1.4fr_1.4fr_auto] items-center gap-4">
                    <div className="text-xs text-muted">{metricLabel(row.metric)}</div>
                    <div className="text-xs text-muted">
                      {formatMetricValue(row.before, row.metric)} ⇒{" "}
                      <span className="font-mono tabular-nums text-fg">
                        {formatMetricValue(row.after, row.metric)}
                      </span>
                    </div>
                    <DeltaValue delta={row.delta} ci={row.ci} kind={metricKind(row.metric)} />
                    <Link href={itemHref(row.id)} className="text-xs font-bold text-accent hover:underline">
                      근거 보기 →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {group.notes.map((note) => {
            const filename = note.skill ? (spellIcons?.[spellIconKey(note.entity, note.skill)] ?? null) : null;
            const record = noteDeltas[note.id];
            const verdict = buildNoteVerdict(note, record, qAlpha);
            return (
              <li key={note.id} className="flex items-center gap-3">
                {note.skill ? <SpellIcon filename={filename} name={note.skill} size={40} /> : null}
                <div className="min-w-0 flex-1">
                  {note.skill ? <div className="text-xs font-bold text-fg-2">{note.skill}</div> : null}
                  <div className="text-sm text-fg-2">
                    {note.stat ? (
                      <>
                        {note.stat}:{" "}
                        <span className="font-mono tabular-nums text-fg">
                          {note.before ?? "—"} ⇒ {note.after ?? "—"}
                        </span>
                      </>
                    ) : (
                      note.summary
                    )}
                  </div>
                  {verdict ? (
                    <div className="mt-0.5 text-xs text-muted">
                      {verdict.noteLabel} · 관측=
                      <span
                        className={
                          verdict.kind === "up"
                            ? "font-bold text-success"
                            : verdict.kind === "down"
                              ? "font-bold text-danger"
                              : "font-bold text-muted"
                        }
                      >
                        {verdict.observedLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
                <StatusBadge status={record?.status ?? "관측 보류"} />
              </li>
            );
          })}
          </ul>
        )}
      </details>
    </li>
  );
}
