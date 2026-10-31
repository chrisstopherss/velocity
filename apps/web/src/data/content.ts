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
  { id: 'robbery', label: 'Robbery' },
  { id: 'reckless_driver', label: 'Reckless driver' },
  { id: 'hit_and_run', label: 'Hit and run' },
  { id: 'noise_disturbance', label: 'Noise disturbance' },
  { id: 'vehicle_theft', label: 'Vehicle theft' },
  { id: 'trespass', label: 'Trespassing' },
  { id: 'suspicious_person', label: 'Suspicious person' },
  { id: 'disabled_vehicle', label: 'Disabled vehicle' },
  { id: 'theft', label: 'Theft' },
  { id: 'false_report', label: 'False report, no response' },
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

export function callerLocation(postal: number): string {
  const p = postalById.get(postal);
  if (!p) return `The postal is ${postal}.`;
  const where = p.street ?? 'the area';
  return `I am on ${where}. The postal is ${postal}.`;
}

export function locationFor(scenario: Scenario): string {
  return scenario.locationOverride ?? callerLocation(scenario.truth.postal);
}

export function answerFor(scenario: Scenario, fact: Fact): string {
  return fact === 'location' ? locationFor(scenario) : scenario.answers[fact];
}

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
    return { id: name, name, agency, status: 'available', x: p.x, y: p.y, route: [], trail: [] };
  });
}
