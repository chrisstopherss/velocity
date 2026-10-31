import type { FastifyInstance } from 'fastify';

export const AVATAR_IDS = ['2606635731', '2254002749', '177707197', '7537251021', '2544552124', '1303323163', '4204483990'];

const TTL = 60 * 60 * 1000;
const API = 'https://thumbnails.roblox.com/v1/users/avatar-headshot';

type Fetch = typeof fetch;

interface Entry {
  at: number;
  body: Buffer | null;
}

export function registerAvatars(app: FastifyInstance, doFetch: Fetch = fetch) {
  const cache = new Map<string, Entry>();
  const loading = new Map<string, Promise<Entry>>();

  async function load(id: string): Promise<Entry> {
    try {
      const meta = await doFetch(`${API}?userIds=${id}&size=420x420&format=Png&isCircular=false`);
      if (!meta.ok) return { at: Date.now(), body: null };
      const json = (await meta.json()) as { data?: { state?: string; imageUrl?: string }[] };
      const item = json.data?.[0];
      if (item?.state !== 'Completed' || !item.imageUrl) return { at: Date.now(), body: null };
      const url = new URL(item.imageUrl);
      if (!url.hostname.endsWith('.rbxcdn.com')) return { at: Date.now(), body: null };
      const img = await doFetch(url);
      if (!img.ok) return { at: Date.now(), body: null };
      return { at: Date.now(), body: Buffer.from(await img.arrayBuffer()) };
    } catch {
      return { at: Date.now(), body: null };
    }
  }

  app.get<{ Params: { id: string } }>('/api/avatar/:id', async (req, reply) => {
    const { id } = req.params;
    if (!AVATAR_IDS.includes(id)) return reply.code(404).send({ error: 'not found' });

    let entry = cache.get(id);
    if (!entry || Date.now() - entry.at > TTL) {
      let pending = loading.get(id);
      if (!pending) {
        pending = load(id).finally(() => loading.delete(id));
        loading.set(id, pending);
      }
      entry = await pending;
      cache.set(id, entry);
    }
    if (!entry.body) return reply.code(404).send({ error: 'no image' });
    return reply.header('cache-control', 'public, max-age=3600').type('image/png').send(entry.body);
  });
}
