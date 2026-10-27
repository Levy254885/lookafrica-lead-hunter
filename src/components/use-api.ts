'use client';
import { appCheckHeaders } from '@/lib/firebase/client';

export class ClientApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** JSON fetch helper for same-origin API routes. Cookies carry the session; App Check header is added when configured. */
export async function api<T = Record<string, unknown>>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...(await appCheckHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & T;
  if (!res.ok) throw new ClientApiError(res.status, json.error?.code ?? 'error', json.error?.message ?? 'Something went wrong.');
  return json;
}
