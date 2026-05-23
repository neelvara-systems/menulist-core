type JsonLdData = Record<string, unknown> | Array<unknown>;

function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLdScript({
  data,
  id,
}: {
  data: JsonLdData;
  id: string;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
