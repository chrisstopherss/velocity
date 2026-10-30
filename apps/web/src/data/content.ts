import type { Agency, Fact, IncidentTypeId, Priority, Scenario, Unit } from '../game/types';
import { postalById } from './postals';

export const incidentTypes: { id: IncidentTypeId; label: string }[] = [
  { id: 'shots_fired', label: 'Shots fired' },
  { id: 'domestic', label: 'Domestic disturbance' },
  { id: 'suspicious_vehicle', label: 'Suspicious vehicle' },
  { id: 'traffic_collision', label: 'Traffic collision' },
  { id: 'burglary', label: 'Burglary' },
  { id: 'assault', label: 'Assault' },
  { id: 'welfare_check', label: 'Welfare check' },
  { id: 'alarm', label: 'Alarm' },
];

export const priorities: { id: Priority; label: string }[] = [
  { id: 1, label: '1 - Life threatening' },
  { id: 2, label: '2 - Urgent' },
  { id: 3, label: '3 - Routine' },
  { id: 4, label: '4 - Low' },
];

export const typeLabel = (id: IncidentTypeId) => incidentTypes.find((t) => t.id === id)?.label ?? id;

export const factQuestions: Record<Fact, string> = {
  location: 'What is your location? Give me a postal or an address.',
  nature: 'Tell me exactly what is happening.',
  weapons: 'Do you see any weapons?',
  injuries: 'Is anyone hurt?',
  suspect: 'Can you describe who is involved?',
  safety: 'Are you safe right now?',
};

export const factOrder: Fact[] = ['location', 'nature', 'weapons', 'injuries', 'suspect', 'safety'];

export const factLabels: Record<Fact, string> = {
  location: 'Location',
  nature: 'Nature of call',
  weapons: 'Weapons',
  injuries: 'Injuries',
  suspect: 'Suspect',
  safety: 'Caller safety',
};

export const scenarios: Scenario[] = [
  {
    id: 'shots-322',
    title: 'Shots fired at the plaza',
    caller: 'Jordan M.',
    ringAfter: 3,
    opening: 'Please help, I just heard gunshots right outside!',
    truth: { type: 'shots_fired', priority: 1, postal: 322, agencies: ['PD', 'SO', 'SP'], minUnits: 2 },
    answers: {
      location: 'I am at the plaza on Bulletin Avenue. I think the postal is 322.',
      nature: 'Three shots, really close. Then I heard somebody running.',
      weapons: 'I did not see a gun, but it sounded like a handgun.',
      injuries: 'I cannot see anyone hurt from my window.',
      suspect: 'A man in a dark hoodie ran toward the building next door.',
      safety: 'I am hiding in the back office with the door locked.',
    },
  },
  {
    id: 'domestic-405',
    title: 'Neighbors fighting',
    caller: 'Amara K.',
    ringAfter: 4,
    opening: 'My neighbors are screaming at each other again and it sounds bad.',
    truth: { type: 'domestic', priority: 2, postal: 405, agencies: ['PD', 'SO'], minUnits: 2 },
    answers: {
      location: 'I live on Emerson Road, postal 405. They are next door.',
      nature: 'Yelling and things being thrown. I heard something break.',
      weapons: 'I have not seen any weapons.',
      injuries: 'I heard a woman crying, I am not sure if she is hurt.',
      suspect: 'It is the couple in the grey house. The man has a loud voice.',
      safety: 'I am inside my house, I am fine.',
    },
  },
  {
    id: 'vehicle-1002',
    title: 'Van parked for hours',
    caller: 'Walt B.',
    ringAfter: 5,
    opening: 'There is a van that has been parked outside my house all afternoon.',
    truth: { type: 'suspicious_vehicle', priority: 4, postal: 1002, agencies: ['PD', 'SO', 'SP'], minUnits: 1 },
    answers: {
      location: 'Maple Street, postal 1002.',
      nature: 'A white van, nobody gets in or out. Somebody keeps looking at my house.',
      weapons: 'No weapons that I can see.',
      injuries: 'Nobody is hurt.',
      suspect: 'I only saw one person, medium build, wearing a cap.',
      safety: 'I feel safe, just uneasy.',
    },
  },
  {
    id: 'collision-209',
    title: 'Crash on Freedom Avenue',
    caller: 'Dana R.',
    ringAfter: 3,
    opening: 'There has been a crash at the intersection, one car is on its side!',
    truth: { type: 'traffic_collision', priority: 2, postal: 209, agencies: ['PD', 'SO', 'SP'], minUnits: 2 },
    answers: {
      location: 'Freedom Avenue near postal 209.',
      nature: 'Two cars hit head on. One flipped over, the other is smoking.',
      weapons: 'No weapons, it is a crash.',
      injuries: 'The driver of the flipped car is moving but cannot get out.',
      suspect: 'No suspect. A grey sedan and a red truck.',
      safety: 'I am on the sidewalk, traffic is backing up.',
    },
  },
];

const agencyNames: Record<Agency, string> = { PD: 'Police', SO: 'Sheriff', SP: 'State Patrol' };
export const agencyName = (a: Agency) => agencyNames[a];

const roster: [string, Agency, number][] = [
  ['1A-09', 'PD', 220],
  ['1A-12', 'PD', 230],
  ['1A-14', 'PD', 405],
  ['S-18', 'SO', 500],
  ['S-21', 'SO', 209],
  ['S-24', 'SO', 1011],
  ['SP-2', 'SP', 304],
  ['SP-4', 'SP', 504],
  ['SP-7', 'SP', 1210],
];

export function startingUnits(): Unit[] {
  return roster.map(([name, agency, postal]) => {
    const p = postalById.get(postal)!;
    return { id: name, name, agency, status: 'available', x: p.x, y: p.y, targetX: null, targetY: null };
  });
}
