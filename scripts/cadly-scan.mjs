import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, '.cache');
const cacheFile = path.join(cacheDir, 'cadly-samples.jsonl');
const endpoint = 'https://api.cadly.me/api/public/maps/resolve';
const agent = 'velocity-trainer (github.com/chrisstopherss/velocity)';
const delayMs = 350;
const batchSize = 10;

function args() {
  const out = { x0: -4000, x1: 4000, z0: -4000, z1: 4000, step: 200 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = Number(argv[i + 1]);
  return out;
}

function loadCache() {
  const seen = new Set();
  if (!existsSync(cacheFile)) return seen;
  for (const line of readFileSync(cacheFile, 'utf8').split('\n')) {
    if (!line) continue;
    const s = JSON.parse(line);
    seen.add(`${s.x},${s.z}`);
  }
  return seen;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveBatch(positions) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': agent },
      body: JSON.stringify({ positions }),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? 5) * 1000;
      console.error(`rate limited, waiting ${wait}ms`);
      await sleep(wait + 500);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  }
  throw new Error('gave up after repeated rate limits');
}

async function main() {
  const { x0, x1, z0, z1, step } = args();
  mkdirSync(cacheDir, { recursive: true });
  const seen = loadCache();
  const todo = [];
  for (let x = x0; x <= x1; x += step) {
    for (let z = z0; z <= z1; z += step) {
      if (!seen.has(`${x},${z}`)) todo.push({ x, z });
    }
  }
  console.log(`${todo.length} positions to resolve in ${Math.ceil(todo.length / batchSize)} requests`);
  let done = 0;
  let hits = 0;
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const data = await resolveBatch(batch);
    const lines = batch.map((p, k) => {
      const r = data[k] ?? {};
      if (r.postal) hits++;
      return JSON.stringify({ x: p.x, z: p.z, postal: r.postal ?? null, street: r.street ?? null, location: r.location ?? null });
    });
    appendFileSync(cacheFile, lines.join('\n') + '\n');
    done += batch.length;
    if ((i / batchSize) % 20 === 0) console.log(`${done}/${todo.length} resolved, ${hits} with a postal`);
    await sleep(delayMs);
  }
  console.log(`finished: ${done} positions, ${hits} with a postal`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
