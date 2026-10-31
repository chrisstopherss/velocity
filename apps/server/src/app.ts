import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAiConfig } from './ai/config.js';
import { registerCaller, type AiOptions } from './ai/routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultWebDir = path.resolve(here, '../../web/dist');

interface Options {
  webDir?: string;
  logger?: boolean;
  ai?: AiOptions | null;
}

export async function buildApp(options: Options = {}) {
  const webDir = options.webDir ?? defaultWebDir;
  const envHops = Number(process.env.TRUST_PROXY_HOPS);
  const hops = Number.isInteger(envHops) && envHops >= 0 ? envHops : 1;
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: (_address: string, hop: number) => hop < hops,
  });

  let ai = options.ai;
  if (ai === undefined) {
    const config = loadAiConfig();
    ai = config ? { config } : null;
  }

  app.get('/api/health', async () => ({ ok: true, name: 'velocity', ai: ai !== null }));
  if (ai) registerCaller(app, ai);

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
