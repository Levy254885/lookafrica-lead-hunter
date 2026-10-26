import { describe, expect, it } from 'vitest';
import { isBlockedIp, safeFetch, validatePublicUrl } from '@/lib/audit/ssrf';

describe('isBlockedIp', () => {
  it('blocks private, loopback, link-local and metadata IPv4', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255']) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });
  it('allows public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '41.90.1.1']) expect(isBlockedIp(ip)).toBe(false);
  });
  it('blocks internal IPv6 forms, including IPv4-mapped', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fd00::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254', '64:ff9b::7f00:1', '2002:7f00:1::1', 'ff02::1', '2001:db8::1']) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });
  it('allows public IPv6', () => {
    expect(isBlockedIp('2001:4860:4860::8888')).toBe(false);
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });
  it('treats unparseable input as blocked', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
});

describe('validatePublicUrl', () => {
  it('accepts ordinary public sites and adds https when missing', () => {
    const r = validatePublicUrl('example.co.ke');
    expect(r.ok && r.url.toString()).toBe('https://example.co.ke/');
    expect(validatePublicUrl('http://example.com/path?x=1').ok).toBe(true);
  });
  it('rejects non-http protocols', () => {
    for (const u of ['ftp://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'gopher://example.com']) expect(validatePublicUrl(u).ok).toBe(false);
  });
  it('rejects credentials in the URL', () => {
    expect(validatePublicUrl('https://user:pass@example.com').ok).toBe(false);
  });
  it('rejects internal hostnames and IP literals', () => {
    for (const u of ['http://localhost', 'http://app.localhost', 'http://printer.local', 'http://db.internal', 'http://127.0.0.1', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5', 'http://intranet']) {
      expect(validatePublicUrl(u).ok).toBe(false);
    }
  });
  it('rejects obfuscated IPv4 forms because the URL parser normalizes them', () => {
    for (const u of ['http://2130706433', 'http://0x7f.0.0.1', 'http://0177.0.0.1', 'http://127.1']) expect(validatePublicUrl(u).ok).toBe(false);
  });
  it('rejects unusual ports', () => {
    expect(validatePublicUrl('http://example.com:22').ok).toBe(false);
    expect(validatePublicUrl('https://example.com:8443').ok).toBe(true);
  });
  it('rejects empty and oversized input', () => {
    expect(validatePublicUrl('').ok).toBe(false);
    expect(validatePublicUrl(`https://example.com/${'a'.repeat(3000)}`).ok).toBe(false);
  });
});

describe('safeFetch', () => {
  it('refuses internal targets before any network call', async () => {
    await expect(safeFetch('http://127.0.0.1:8080/')).rejects.toThrow();
    await expect(safeFetch('http://169.254.169.254/')).rejects.toThrow();
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow();
  });
});
