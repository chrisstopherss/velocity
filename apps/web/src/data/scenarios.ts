import file from '@velocity/scenarios/scenarios.json';
import type { Agency, IncidentTypeId, Priority, Scenario, ScenarioPick } from '../game/types';

export interface Variant {
  opening: string;
  nature: string;
  weapons: string;
  injuries: string;
  suspect: string;
  safety: string;
}

export interface Template {
  id: string;
  title: string;
  type: IncidentTypeId;
  priority: Priority;
  agencies: Agency[];
  minUnits: number;
  ringAfter: [number, number];
  places: number[];
  callers: { name: string; mood: string }[];
  variants: Variant[];
}

export const templates = file.templates as Template[];

export const templateById = new Map(templates.map((t) => [t.id, t]));

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function instantiate(template: Template, pick: ScenarioPick, ringAfter?: number): Scenario {
  const variant = template.variants[pick.variant];
  const caller = template.callers[pick.caller];
  const postal = template.places[pick.place];
  return {
    id: template.id,
    pick,
    title: template.title,
    caller: caller.name,
    ringAfter: ringAfter ?? template.ringAfter[0],
    opening: variant.opening,
    truth: {
      type: template.type,
      priority: template.priority,
      postal,
      agencies: template.agencies,
      minUnits: template.minUnits,
    },
    answers: {
      nature: variant.nature,
      weapons: variant.weapons,
      injuries: variant.injuries,
      suspect: variant.suspect,
      safety: variant.safety,
    },
  };
}

// a fixed call for tests and as the default starting state, the game picks its own
export function firstScenario(): Scenario {
  return instantiate(templates[0], { caller: 0, variant: 0, place: 0 });
}

export function chooseScenario(seed: number, callNumber: number, previousId?: string): Scenario {
  const rand = mulberry32(seed + callNumber * 9973);
  let index = Math.floor(rand() * templates.length);
  if (templates[index].id === previousId) index = (index + 1) % templates.length;
  const template = templates[index];
  const pick: ScenarioPick = {
    caller: Math.floor(rand() * template.callers.length),
    variant: Math.floor(rand() * template.variants.length),
    place: Math.floor(rand() * template.places.length),
  };
  const [lo, hi] = template.ringAfter;
  return instantiate(template, pick, lo + rand() * (hi - lo));
}
