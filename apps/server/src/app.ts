import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultWebDir = path.resolve(here, '../../web/dist');

export async function buildApp(options: { webDir?: string; logger?: boolean } = {}) {
  const webDir = options.webDir ?? defaultWebDir;
  const app = Fastify({ logger: options.logger ?? false });

  app.get('/api/health', async () => ({ ok: true, name: 'velocity' }));

  if (existsSync(webDir)) {
    await app.register(fastifyStatic, { root: webDir });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
