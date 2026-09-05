// src/app/item/[id]/page.tsx
// 항목 상세 — 판정 헤더·델타 차트·통계 패널·선언 대조·LLM 추정 원인 스텁(UX-BRIEF §3 "03 항목 상세").
// output:'export' 정적 배포이므로 generateStaticParams가 필수 — 실제 항목 ID 목록은 F5에서 채운다.
// 실측(2026-09-05): output:'export'에서 generateStaticParams가 빈 배열을 반환하면
// `next build`가 즉시 실패한다("at least one route must be generated") — 그래서 F5 이전까지는
// 자리표시자 1건만 반환한다. loadDeltas() 연결 후 이 자리표시자는 실제 ID 목록으로 교체한다.
// TODO(F5): loadDeltas() 기반 params 생성 + 상세 렌더
// 헤더는 ST-10부터 src/app/layout.tsx가 전역 렌더한다(여기서 다시 렌더하면 중복).

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams(): Array<{ id: string }> {
  return [{ id: "_placeholder" }];
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { id } = await params;
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main className="flex flex-1 items-center justify-center text-muted">
        TODO: 항목 상세 ({id})
      </main>
    </div>
  );
}
