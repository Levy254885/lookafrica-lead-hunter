import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

/**
 * SSRF-safe outbound HTTP for the website audit engine.
 *
 * Defences, in order:
 * 1. Only http and https URLs, no credentials, a small port allow-list, no obvious internal hostnames.
 * 2. IP-literal hosts are checked against private, loopback, link-local, multicast and reserved ranges.
 * 3. Every DNS answer is checked at connect time inside a custom `lookup`. Because the socket connects
 *    to the very address that was checked, DNS rebinding between check and use is not possible.
 * 4. Redirects are followed manually and every hop is revalidated.
 * 5. Response size, total time and redirect count are capped. Compression is disabled so a small
 *    transfer cannot expand into a large body.
 */

export class SafeFetchError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

// ---- IP classification --------------------------------------------------------------------

export function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 169 && b === 254) return true; // link-local, includes cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF protocol assignments, TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // 6to4 relay anycast
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function parseIPv6Bytes(input: string): number[] | null {
  let s = input.split('%')[0].toLowerCase();
  if (s.includes('.')) {
    const lastColon = s.lastIndexOf(':');
    const v4 = s.slice(lastColon + 1).split('.').map(Number);
    if (v4.length !== 4 || v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const toWords = (str: string): number[] => (str === '' ? [] : str.split(':').map((h) => parseInt(h, 16)));
  const head = toWords(halves[0]);
  let words: number[];
  if (halves.length === 2) {
    const tail = toWords(halves[1]);
    if (head.length + tail.length > 7) return null;
    words = [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail];
  } else {
    if (head.length !== 8) return null;
    words = head;
  }
  if (words.some((w) => !Number.isInteger(w) || w < 0 || w > 0xffff)) return null;
  return words.flatMap((w) => [w >> 8, w & 0xff]);
}

export function isBlockedIPv6(ip: string): boolean {
  const b = parseIPv6Bytes(ip);
  if (!b) return true;
  const v4 = (i: number) => `${b[i]}.${b[i + 1]}.${b[i + 2]}.${b[i + 3]}`;
  const firstTenZero = b.slice(0, 10).every((x) => x === 0);
  if (firstTenZero && b[10] === 0xff && b[11] === 0xff) return isBlockedIPv4(v4(12)); // ::ffff:a.b.c.d
  if (b.slice(0, 12).every((x) => x === 0)) return true; // ::, ::1 and IPv4-compatible
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && b.slice(4, 12).every((x) => x === 0)) {
    return isBlockedIPv4(v4(12)); // 64:ff9b::/96 NAT64
  }
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedIPv4(v4(2)); // 6to4 embeds an IPv4 address
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true; // Teredo
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // documentation
  if (b[0] === 0x01 && b[1] === 0x00 && b.slice(2, 8).every((x) => x === 0)) return true; // discard prefix
  // Only global unicast 2000::/3 is allowed; this excludes fc00::/7, fe80::/10, ff00::/8 and the rest.
  return (b[0] & 0xe0) !== 0x20;
}

export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIPv4(ip);
  if (family === 6) return isBlockedIPv6(ip);
  return true;
}

// ---- URL validation -----------------------------------------------------------------------

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.lan', '.home.arpa', '.intranet'];

export function validatePublicUrl(raw: string): UrlCheck {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, reason: 'Enter a website address.' };
  if (trimmed.length > 2048) return { ok: false, reason: 'The address is too long.' };
  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: 'That does not look like a valid web address.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https addresses can be audited.' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'Addresses containing credentials are not allowed.' };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: 'Only standard web ports (80, 443, 8080, 8443) can be audited.' };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return { ok: false, reason: 'The address has no hostname.' };
  if (host === 'localhost' || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: 'Internal hostnames cannot be audited.' };
  }
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  if (net.isIP(bare)) {
    if (isBlockedIp(bare)) return { ok: false, reason: 'Private and internal IP addresses cannot be audited.' };
  } else if (!host.includes('.')) {
    return { ok: false, reason: 'Use a fully qualified domain name such as example.co.ke.' };
  }
  url.hash = '';
  return { ok: true, url };
}

// ---- Guarded fetch ------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function guardedLookup(hostname: string, options: any, callback: (...args: any[]) => void): void {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses || addresses.length === 0) return callback(new Error('dns_no_records'));
    for (const a of addresses) {
      if (isBlockedIp(a.address)) return callback(new Error('blocked_address'));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface FetchHop {
  url: string;
  status: number;
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  truncated: boolean;
  redirects: FetchHop[];
  elapsedMs: number;
}

export interface SafeFetchOptions {
  method?: 'GET' | 'HEAD';
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const AUDIT_USER_AGENT =
  'LookAfricaLeadHunterBot/1.0 (website audit requested by a signed-in user; contact via the product site)';

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  truncated: boolean;
}

function requestOnce(
  url: URL,
  method: 'GET' | 'HEAD',
  headers: Record<string, string>,
  timeoutMs: number,
  maxBytes: number,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    let settled = false;
    const chunks: Buffer[] = [];
    let total = 0;
    let truncated = false;

    const finish = (res: http.IncomingMessage) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve({
        status: res.statusCode ?? 0,
        headers: res.headers,
        body: Buffer.concat(chunks),
        truncated,
      });
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      reject(err);
    };

    const req = lib.request(
      url,
      {
        method,
        headers: { 'user-agent': AUDIT_USER_AGENT, 'accept-encoding': 'identity', ...headers },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lookup: guardedLookup as any,
        agent: false,
        timeout: timeoutMs,
      },
      (res) => {
        if (method === 'HEAD') {
          res.resume();
          res.on('end', () => finish(res));
          res.on('error', fail);
          return;
        }
        res.on('data', (chunk: Buffer) => {
          if (truncated) return;
          total += chunk.length;
          if (total > maxBytes) {
            truncated = true;
            chunks.push(chunk.subarray(0, chunk.length - (total - maxBytes)));
            res.destroy();
            finish(res);
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => finish(res));
        res.on('close', () => finish(res));
        res.on('error', (e) => (truncated ? finish(res) : fail(e)));
      },
    );

    const deadline = setTimeout(() => req.destroy(new Error('timeout')), timeoutMs);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', fail);
    req.end();
  });
}

function describeError(err: unknown): SafeFetchError {
  if (err instanceof SafeFetchError) return err;
  const e = err as NodeJS.ErrnoException;
  if (e?.message === 'blocked_address') {
    return new SafeFetchError('blocked_address', 'The site resolves to a private or internal address.');
  }
  if (e?.message === 'timeout') return new SafeFetchError('timeout', 'The site did not respond in time.');
  const code = e?.code ?? 'network_error';
  return new SafeFetchError(String(code), `Connection failed (${String(code)}).`);
}

export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const method = opts.method ?? 'GET';
  const maxBytes = opts.maxBytes ?? 1_500_000;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxRedirects = opts.maxRedirects ?? 5;
  const started = Date.now();

  const first = validatePublicUrl(rawUrl);
  if (!first.ok) throw new SafeFetchError('invalid_url', first.reason);
  let url = first.url;
  const redirects: FetchHop[] = [];

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining <= 0) throw new SafeFetchError('timeout', 'The site did not respond in time.');
    let res: RawResponse;
    try {
      res = await requestOnce(url, method, opts.headers ?? {}, remaining, maxBytes);
    } catch (err) {
      throw describeError(err);
    }

    const location = res.headers.location;
    if (REDIRECT_STATUSES.has(res.status) && typeof location === 'string') {
      redirects.push({ url: url.toString(), status: res.status });
      if (hop === maxRedirects) throw new SafeFetchError('too_many_redirects', 'The site redirects too many times.');
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        throw new SafeFetchError('bad_redirect', 'The site sent an invalid redirect.');
      }
      const check = validatePublicUrl(next.toString());
      if (!check.ok) throw new SafeFetchError('blocked_redirect', `Redirect refused: ${check.reason}`);
      url = check.url;
      continue;
    }

    return {
      finalUrl: url.toString(),
      status: res.status,
      headers: res.headers,
      body: res.body.toString('utf8'),
      truncated: res.truncated,
      redirects,
      elapsedMs: Date.now() - started,
    };
  }
  throw new SafeFetchError('too_many_redirects', 'The site redirects too many times.');
}
