import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from './app.js';

function fakeWebDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'velocity-web-'));
  writeFileSync(path.join(dir, 'index.html'), '<html><body>velocity</body></html>');
  return dir;
}

describe('server', () => {
  it('answers the health check', async () => {
    const app = await buildApp({ webDir: fakeWebDir(), ai: null });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, name: 'velocity', ai: false });
  });

  it('serves the app for unknown paths', async () => {
    const app = await buildApp({ webDir: fakeWebDir(), ai: null });
    const res = await app.inject({ method: 'GET', url: '/some/page' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('velocity');
  });

  it('returns 404 json for unknown api routes', async () => {
    const app = await buildApp({ webDir: fakeWebDir(), ai: null });
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
  });
});
