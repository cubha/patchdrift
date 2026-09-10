### VERIFY-SPEC — SubTask ST-B
- 기준선 요구사항(원문 인용): "notes.json의 items[](entity·skill·stat·before·after·direction)를 entity로 groupBy한다. 노트 그룹 순서는 notes.json 원본 순서(패치노트 문서 순서)를 유지한다. 같은 entity의 델타 레코드(data/aggregated/deltas)가 없는 노트 그룹은 '정상'. 미공지 삽입: 델타 레코드는 있는데 대응하는 노트 그룹이 없는 엔티티를, |delta|(변화폭) 내림차순 순서를 유지한 채 노트 그룹 사이에 균등 분산해 삽입한다. 각 스트림 항목은 kind: 'matched' | 'unannounced' 필드를 가져야 한다."
- 변경 파일: src/components/home/releaseStream.ts (신규), src/components/home/__tests__/releaseStream.test.ts (신규)
- 관찰 가능한 계약: `buildReleaseStream(notes: NotesFile | null, deltas: DeltasFile | null): ReleaseStreamGroup[]`
  - 입력 `notes.items`(NotesFile.items: PatchNoteItem[]) + `deltas.rows`(DeltasFile.rows: DeltaRecord[])
  - 출력: `MatchedStreamGroup[]`(kind:"matched", entity: PatchNoteItem.entity, notes: PatchNoteItem[] — notes.items 첫 등장 순서 그대로 groupBy)와 `UnannouncedStreamGroup[]`(kind:"unannounced", entity: DeltaRecord.entityName, deltas: DeltaRecord[] — status==="unannounced"인 행만, entityType:entityName으로 그룹핑, 그룹 내 max(|delta|) 내림차순 정렬)을 **교차 배치**한다 — 노트 그룹 M개 사이 M+1개 슬롯에 미공지 U건을 `floor((j+1)*U/(M+1)) - floor(j*U/(M+1))`개씩 분배(결정론적, 양쪽 상대 순서 보존)
  - notes===null 또는 deltas===null이어도 throw 없이 있는 쪽만으로 조립(빈 배열 폴백)
- 구현 결정: stub 없음(GREEN 구현 완료). fallback: `absDelta`에서 `delta===null`이면 `-Infinity`(정렬 최하위 취급, home/logic.ts의 absDelta를 import하지 않고 독립 구현 — 파일 간 결합 회피). 하드코딩 없음.
- 인접 경계:
  - 직접 호출부: 아직 없음(ST-H가 `src/app/page.tsx` + `src/components/home/ReleaseNoteStream.tsx`에서 소비 예정, `notes: NotesFile | null`(from `@/lib/data`의 `loadNotes`), `deltas: DeltasFile | null`(from `loadDeltas`)를 그대로 넘기면 됨).
  - 데이터 계약: `@/pipeline/types`의 `DeltaRecord`/`DeltasFile`/`PatchNoteItem`(읽기 전용, 미수정), `@/lib/data`의 `NotesFile`(읽기 전용, 미수정). 다른 SubTask 파일(logic.ts 등) import/수정 없음 — 완전 독립.
- 미확인 사항: entityType이 "lane"/"objective"/"summary"인 unannounced 델타도 이 모듈은 동일하게 미공지 그룹으로 편입한다 — HANDOFF §4-1은 "챔피언 카드" 위주로 서술하나 entityType 제한 문구는 없어 전 타입 포함으로 구현했다. ST-H 렌더 단계에서 챔피언/아이템 외 타입에 다른 시각 처리(또는 필터링)가 필요하다면 그건 ST-H의 결정 사항.

---

**2026-09-10 명세 갱신(verify-impl 축B)** — 최초 계약은 "미공지를 스트림 **상단에** 몰아 삽입"이었다. 확정 시안 아티팩트가 "아래는 노트 순서 그대로입니다 … 노트에 없는데 통계가 움직인 항목은 그 자리에 끼워 넣습니다"를 요구하고, 실데이터(노트 58그룹 vs 미공지 151그룹)에서 상단 몰림이 노트 스트림을 화면 밖으로 밀어내 "릴리즈노트를 괴리의 프레임으로 쓴다"는 설계 논지를 지웠기 때문에 **균등 분산**으로 바꿨다. 관련 커밋 `aceb391`(RED) → `42a7dab`(GREEN). 인과 앵커(`causes[].candidateNoteId` 위치 삽입)는 시안에 없는 메커니즘이라 채택하지 않았다(시안이 인라인 배치한 미공지 2건 모두 후보 노트 부재 케이스, 실데이터 앵커 보유 그룹은 151개 중 14개).
