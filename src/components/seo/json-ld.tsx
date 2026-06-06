type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** JSON-LD — 검색·생성형 엔진(GEO) 구조화 데이터 */
export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  );
}
