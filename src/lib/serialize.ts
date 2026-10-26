/**
 * Converts Firestore documents into plain JSON-safe objects: Timestamps become ISO strings.
 * Used before passing server-read data to client components.
 */
type Timestampish = { toDate: () => Date };

function isTimestamp(v: unknown): v is Timestampish {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Timestampish).toDate === 'function' &&
    '_seconds' in (v as object)
  );
}

export function toPlain<T = Record<string, unknown>>(value: unknown): T {
  return convert(value) as T;
}

function convert(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(convert);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = convert(v);
    return out;
  }
  return value;
}

export function toMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (isTimestamp(value)) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}
