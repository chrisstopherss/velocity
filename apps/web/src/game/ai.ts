import { callerLocation } from '../data/content';
import type { Fact, Scenario, TranscriptLine } from './types';

export interface CallerAnswer {
  text: string;
  told: Fact[];
  left: number | null;
  system: boolean;
}

const facts: Fact[] = ['location', 'nature', 'weapons', 'injuries', 'suspect', 'safety'];

export async function fetchAiEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const data = (await res.json()) as { ai?: boolean };
    return data.ai === true;
  } catch {
    return false;
  }
}

function system(text: string, left: number | null = null): CallerAnswer {
  return { text, told: [], left, system: true };
}

export async function askCaller(scenario: Scenario, message: string, transcript: TranscriptLine[]): Promise<CallerAnswer> {
  const history = transcript
    .filter((t) => t.from !== 'system')
    .slice(-6)
    .map((t) => ({ from: t.from, text: t.text.slice(0, 200) }));

  try {
    const res = await fetch('/api/caller', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scenarioId: scenario.id,
        pick: scenario.pick,
        location: callerLocation(scenario.truth.postal),
        message,
        history,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = (await res.json()) as { say?: string; told?: string[]; left?: number; error?: string };
    const left = typeof data.left === 'number' ? data.left : null;

    if (res.status === 429) {
      return data.error === 'rate'
        ? system('Too many questions too fast. Wait a few seconds.', left)
        : system('Typed questions are used up for today. The quick questions below still work.', left);
    }
    if (!res.ok || typeof data.say !== 'string') {
      return system('The line is breaking up. Try again, or use the quick questions.', left);
    }
    return {
      text: data.say,
      told: (data.told ?? []).filter((k): k is Fact => facts.includes(k as Fact)),
      left,
      system: false,
    };
  } catch {
    return system('The line is breaking up. Try again, or use the quick questions.');
  }
}
