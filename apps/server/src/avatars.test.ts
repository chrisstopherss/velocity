import { describe, expect, it, vi } from 'vitest';
import { buildApp } from './app.js';

function roblox(state: string) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('thumbnails.roblox.com')) {
      return new Response(JSON.stringify({ data: [{ state, imageUrl: 'https://tr.rbxcdn.com/abc/420/420/Image/Png' }] }));
    }
    return new Response(new Uint8Array([137, 80, 78, 71]));
  }) as unknown as typeof fetch;
}

describe('avatars', () => {
  it('serves an allowed avatar and caches it', async () => {
    const f = roblox('Completed');
    const app = await buildApp({ webDir: '/nonexistent', ai: null, avatarFetch: f });
    const a = await app.inject({ method: 'GET', url: '/api/avatar/177707197' });
    expect(a.statusCode).toBe(200);
    expect(a.headers['content-type']).toContain('image/png');
    await app.inject({ method: 'GET', url: '/api/avatar/177707197' });
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(2);
  });

  it('refuses ids that are not on the list without calling roblox', async () => {
    const f = roblox('Completed');
    const app = await buildApp({ webDir: '/nonexistent', ai: null, avatarFetch: f });
    const res = await app.inject({ method: 'GET', url: '/api/avatar/1' });
    expect(res.statusCode).toBe(404);
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(0);
  });

  it('answers 404 when the avatar is blocked', async () => {
    const app = await buildApp({ webDir: '/nonexistent', ai: null, avatarFetch: roblox('Blocked') });
    const res = await app.inject({ method: 'GET', url: '/api/avatar/4204483990' });
    expect(res.statusCode).toBe(404);
  });
});
