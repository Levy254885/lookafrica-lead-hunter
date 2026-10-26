type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = /(secret|token|password|authorization|cookie|private_?key|api_?key|consumer)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}...`;
  return value;
}

/** Structured JSON logs, one object per line, with sensitive keys redacted. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    event,
    ...(redact(fields) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorFields(err: unknown): Record<string, unknown> {
  if (err instanceof Error) return { errorName: err.name, errorMessage: err.message };
  return { errorMessage: String(err) };
}
