import { isIP } from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';

export function clientIp(headers: IncomingHttpHeaders, fallback: string, header: string | null): string {
  if (header) {
    const raw = headers[header.toLowerCase()];
    const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0].trim();
    if (first && isIP(first)) return first;
  }
  return fallback;
}
