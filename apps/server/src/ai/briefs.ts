import file from '@velocity/scenarios/scenarios.json' with { type: 'json' };

export const factKeys = ['location', 'nature', 'weapons', 'injuries', 'suspect', 'safety'] as const;
export type FactKey = (typeof factKeys)[number];

export interface Pick {
  caller: number;
  variant: number;
  place: number;
}

export interface Brief {
  name: string;
  mood: string;
  facts: Record<Exclude<FactKey, 'location'>, string>;
}

interface Template {
  id: string;
  places: number[];
  callers: { name: string; mood: string }[];
  variants: ({ opening: string } & Brief['facts'])[];
}

const templates = file.templates as Template[];
const byId = new Map(templates.map((t) => [t.id, t]));

export const scenarioIds = templates.map((t) => t.id);
export const maxPick = Math.max(...templates.flatMap((t) => [t.callers.length, t.variants.length, t.places.length]));

export function briefFor(id: string, pick: Pick): Brief | null {
  const template = byId.get(id);
  if (!template) return null;
  const caller = template.callers[pick.caller];
  const variant = template.variants[pick.variant];
  if (!caller || !variant || template.places[pick.place] === undefined) return null;
  const { nature, weapons, injuries, suspect, safety } = variant;
  return { name: caller.name, mood: caller.mood, facts: { nature, weapons, injuries, suspect, safety } };
}
