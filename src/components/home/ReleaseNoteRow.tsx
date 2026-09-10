// src/components/home/ReleaseNoteRow.tsx
// 릴리즈노트 스트림 1개 그룹(엔티티)의 렌더 — HANDOFF-redesign-2026-09-10.md §4-1:
// "챔피언 카드(아이콘 56px) → 스킬 행(스펠 아이콘 40px) → `스탯: A ⇒ B` → 우측에 관측 판정 뱃지".
// 순수 프레젠테이션(서버 컴포넌트) — 상태·데이터 페칭은 page.tsx/ReleaseNoteStream이 소유한다.
// §1-2 불변식: 상태 색(--accent/--danger/--warn/--success)은 이 컴포넌트 안에서 재정의하지
// 않는다 — StatusBadge/DeltaValue가 이미 토큰을 바르게 쓰므로 그대로 위임.

import Link from "next/link";
import type { MatchStatus } from "@/pipeline/types";
import EntityIcon from "@/components/EntityIcon";
import SpellIcon from "@/components/SpellIcon";
import StatusBadge from "@/components/StatusBadge";
import DeltaValue from "@/components/DeltaValue";
import { itemHref, metricLabel } from "@/lib/format";
import { spellIconKey } from "@/pipeline/match/spell-icon";
import { formatMetricValue, metricKind, resolveCause } from "./logic";
import type { ReleaseStreamGroup } from "./releaseStream";
import type { StreamEntityIcon } from "./releaseStreamEntity";

export interface ReleaseNoteRowProps {
  group: ReleaseStreamGroup;
  icon: StreamEntityIcon;
  /** loadSpellIcons()?.icons — 없으면(자산 미보유·미실행) 전부 텍스트 폴백. */
  spellIcons: Record<string, string> | null;
  /** note.id → 그 노트를 근거로 매칭된 델타의 status(deltas.rows의 matchedNoteIds 역색인,
   * page.tsx가 구성). 매칭된 델타가 없는 노트는 이 맵에 키가 없다 — "관측 보류"로 표시하고
   * 근거 없는 상태를 지어내지 않는다. */
  noteStatus: Record<string, MatchStatus>;
  /** 미공지 그룹의 "✕ {patch} 패치노트에 없음" 문구에 쓸 to-패치 번호. */
  patch: string | null;
}

const FALLBACK_ICON_CLASS =
  "flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface-warm font-display text-sm font-bold text-fg-2";

export default function ReleaseNoteRow({ group, icon, spellIcons, noteStatus, patch }: ReleaseNoteRowProps) {
  const isUnannounced = group.kind === "unannounced";

  return (
    <li
      className={
        isUnannounced
          ? "border-b border-l-4 border-border-soft border-l-accent bg-surface-warm px-5 py-4 last:border-b-0"
          : "border-b border-border-soft px-5 py-4 last:border-b-0"
      }
    >
      <div className="flex items-center gap-4">
        {icon.entityType && icon.entityKey ? (
          <EntityIcon entityType={icon.entityType} entityKey={icon.entityKey} name={group.entity} size={56} />
        ) : (
          <span style={{ width: 56, height: 56 }} className={FALLBACK_ICON_CLASS}>
            {group.entity.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold text-fg">{group.entity}</div>
          {isUnannounced && patch ? (
            <div className="mt-1 text-xs font-bold text-accent">
              ✕ {patch} 패치노트에 {group.entity} 항목 없음
            </div>
          ) : null}
        </div>
      </div>

      {isUnannounced ? (
        <ul className="mt-3 flex flex-col gap-3">
          {group.deltas.map((row) => {
            const cause = resolveCause(row);
            return (
              <li key={row.id} className="grid grid-cols-[1fr_1fr_1fr_1.6fr_auto] items-center gap-4">
                <div className="text-xs text-muted">{metricLabel(row.metric)}</div>
                <div className="text-xs text-muted">
                  {formatMetricValue(row.before, row.metric)} ⇒{" "}
                  <span className="font-mono tabular-nums text-fg">
                    {formatMetricValue(row.after, row.metric)}
                  </span>
                </div>
                <DeltaValue delta={row.delta} ci={row.ci} kind={metricKind(row.metric)} />
                <div className="text-xs text-muted">
                  추정 원인:{" "}
                  {cause.mode === "verified" ? (
                    <Link href={itemHref(row.id)} className="text-accent hover:underline">
                      {cause.text}
                    </Link>
                  ) : (
                    cause.text
                  )}
                </div>
                <Link href={itemHref(row.id)} className="text-xs font-bold text-accent hover:underline">
                  근거 보기 →
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {group.notes.map((note) => {
            const filename = note.skill ? (spellIcons?.[spellIconKey(note.entity, note.skill)] ?? null) : null;
            const status = noteStatus[note.id];
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
                </div>
                <StatusBadge status={status ?? "관측 보류"} />
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
