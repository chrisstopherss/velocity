export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  ipDailyTokens: number;
  globalDailyTokens: number;
  perMinute: number;
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig | null {
  const apiKey = env.DEEPSEEK_API_KEY || env.AI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: env.AI_MODEL || 'deepseek-v4-flash',
    maxOutputTokens: int(env.AI_MAX_OUTPUT_TOKENS, 70),
    timeoutMs: int(env.AI_TIMEOUT_MS, 8000),
    ipDailyTokens: int(env.AI_IP_DAILY_TOKENS, 12000),
    globalDailyTokens: int(env.AI_GLOBAL_DAILY_TOKENS, 400000),
    perMinute: int(env.AI_PER_MINUTE, 5),
  };
}
