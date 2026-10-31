import type { FastifyInstance } from 'fastify';
import { scenarioIds } from './briefs.js';
import { Budget } from './budget.js';
import {
  buildMessages,
  deepseek,
  estimateTokens,
  parseReply,
  requestBody,
  type CallerRequest,
  type Complete,
} from './caller.js';
import type { AiConfig } from './config.js';
import { deflection, injecting, unsafe } from './safety.js';

export interface AiOptions {
  config: AiConfig;
  complete?: Complete;
  now?: () => number;
}

const bodySchema = {
  type: 'object',
  required: ['scenarioId', 'location', 'message'],
  additionalProperties: false,
  properties: {
    scenarioId: { type: 'string', enum: scenarioIds },
    location: { type: 'string', maxLength: 160, pattern: "^[A-Za-z0-9 .,'#&/-]*$" },
    message: { type: 'string', minLength: 1, maxLength: 140 },
    history: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        required: ['from', 'text'],
        additionalProperties: false,
        properties: {
          from: { type: 'string', enum: ['you', 'caller'] },
          text: { type: 'string', maxLength: 200 },
        },
      },
    },
  },
} as const;

export function registerCaller(app: FastifyInstance, ai: AiOptions): void {
  const { config } = ai;
  const complete = ai.complete ?? deepseek(config);
  const budget = new Budget(config, ai.now);

  app.post<{ Body: Omit<CallerRequest, 'history'> & { history?: CallerRequest['history'] } }>(
    '/api/caller',
    { schema: { body: bodySchema }, bodyLimit: 4096 },
    async (req, reply) => {
      const input: CallerRequest = { ...req.body, history: req.body.history ?? [] };
      const ip = req.ip;

      if (unsafe(input.message) || injecting(input.message)) {
        const verdict = budget.check(ip, 0);
        if (!verdict.ok) return reply.code(429).send({ error: verdict.reason, left: budget.left(ip) });
        return { say: deflection, told: [], left: budget.left(ip) };
      }

      const messages = buildMessages(input);
      const verdict = budget.check(ip, estimateTokens(messages, config.maxOutputTokens));
      if (!verdict.ok) return reply.code(429).send({ error: verdict.reason, left: budget.left(ip) });

      try {
        const done = await complete(requestBody(config, messages));
        budget.record(ip, done.tokens);
        const parsed = parseReply(done.text);
        if (!parsed || unsafe(parsed.say)) {
          return { say: deflection, told: [], left: budget.left(ip) };
        }
        return { ...parsed, left: budget.left(ip) };
      } catch (err) {
        req.log.warn({ err: err instanceof Error ? err.message : 'provider error' }, 'caller request failed');
        return reply.code(502).send({ error: 'provider', left: budget.left(ip) });
      }
    },
  );
}
