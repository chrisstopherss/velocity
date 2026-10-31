import { makePerson, makeVehicle, type Person, type Vehicle } from '../data/people';
import { mulberry32 } from '../data/scenarios';
import type { Stop } from './types';

export interface Records {
  people: Person[];
  vehicles: Vehicle[];
}

export interface Results {
  people: Person[];
  vehicles: Vehicle[];
}

const FILLER = 60;
const LIMIT = 8;

export function buildRecords(seed: number, stops: Stop[]): Records {
  const rand = mulberry32(seed + 77);
  const people: Person[] = [];
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < FILLER; i++) {
    const p = makePerson(rand, i + 1);
    people.push(p);
    vehicles.push(makeVehicle(rand, p.id));
  }
  for (const s of stops) {
    people.push(s.driver);
    if (s.owner.id !== s.driver.id) people.push(s.owner);
    vehicles.push(s.car);
  }
  return { people, vehicles };
}

// plates get misread over the radio, so letters and digits that look alike are folded together
const fold = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');

const digits = (text: string) => text.replace(/\D/g, '');

export function search(records: Records, query: string): Results {
  const q = query.trim();
  if (q.length < 2) return { people: [], vehicles: [] };

  const tokens = q.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const folded = fold(q);
  const numeric = digits(q);
  const looksLikeDate = /^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(q) || /^(19|20)\d{2}$/.test(q);

  const vehicles = folded.length >= 3 ? records.vehicles.filter((v) => fold(v.plate).includes(folded)) : [];

  const people = records.people.filter((p) => {
    if (p.licence.toLowerCase().includes(q.toLowerCase().replace(/\s/g, ''))) return true;
    if (looksLikeDate) {
      const [m, d, y] = p.dob.split('/');
      const parts = q.split(/[/-]/);
      if (parts.length === 1) return y === parts[0];
      const [qm, qd, qy] = parts;
      return Number(qm) === Number(m) && Number(qd) === Number(d) && (!qy || y.endsWith(qy));
    }
    if (numeric.length >= 4 && !/[a-z]/i.test(q)) return p.licence.includes(numeric);
    const parts = [p.first, p.middle, p.last].map((x) => x.toLowerCase());
    return tokens.every((t) => parts.some((part) => part.startsWith(t)) || (t.length >= 3 && p.last.toLowerCase().includes(t)));
  });

  return { people: people.slice(0, LIMIT), vehicles: vehicles.slice(0, LIMIT) };
}

export const vehiclesOf = (records: Records, personId: string) => records.vehicles.filter((v) => v.ownerId === personId);
export const ownerOf = (records: Records, v: Vehicle) => records.people.find((p) => p.id === v.ownerId) ?? null;
