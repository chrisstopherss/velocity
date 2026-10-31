export const factKeys = ['location', 'nature', 'weapons', 'injuries', 'suspect', 'safety'] as const;
export type FactKey = (typeof factKeys)[number];

export interface Brief {
  name: string;
  mood: string;
  facts: Record<Exclude<FactKey, 'location'>, string>;
}

export const briefs: Record<string, Brief> = {
  'shots-322': {
    name: 'Jordan',
    mood: 'scared and whispering, hiding in a back office',
    facts: {
      nature: 'Three shots right outside, then someone running.',
      weapons: 'Saw no gun, it sounded like a handgun.',
      injuries: 'Cannot see anyone hurt from the window.',
      suspect: 'A man in a dark hoodie ran toward the building next door.',
      safety: 'Hiding in the back office with the door locked.',
    },
  },
  'domestic-405': {
    name: 'Amara',
    mood: 'worried and a little embarrassed to be calling about neighbors',
    facts: {
      nature: 'Neighbors screaming, things thrown, something broke.',
      weapons: 'Has not seen any weapons.',
      injuries: 'Heard a woman crying, not sure if she is hurt.',
      suspect: 'The couple in the grey house, the man has a loud voice.',
      safety: 'Inside her own house, fine.',
    },
  },
  'vehicle-1002': {
    name: 'Walt',
    mood: 'older, calm, talkative, a bit suspicious',
    facts: {
      nature: 'White van parked outside all afternoon, nobody gets in or out, someone keeps looking at his house.',
      weapons: 'No weapons that he can see.',
      injuries: 'Nobody is hurt.',
      suspect: 'One person, medium build, wearing a cap.',
      safety: 'Feels safe, just uneasy.',
    },
  },
  'collision-209': {
    name: 'Dana',
    mood: 'shaken and talking fast',
    facts: {
      nature: 'Two cars hit head on, one flipped, the other is smoking.',
      weapons: 'No weapons, it is a crash.',
      injuries: 'The driver of the flipped car is moving but cannot get out.',
      suspect: 'No suspect. A grey sedan and a red truck.',
      safety: 'On the sidewalk, traffic is backing up.',
    },
  },
};

export const scenarioIds = Object.keys(briefs);
