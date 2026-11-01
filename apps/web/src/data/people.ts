import { postals } from './postals';

export interface Warrant {
  offence: string;
  court: string;
  bond: number;
  extradition: string;
}

export interface Person {
  id: string;
  first: string;
  middle: string;
  last: string;
  sex: 'M' | 'F';
  dob: string;
  address: { number: number; street: string; postal: number };
  licence: string;
  cls: string;
  endorsements: string[];
  restrictions: string[];
  issued: string;
  expires: string;
  height: number;
  weight: number;
  eyes: string;
  hair: string;
  photo: string;
  status: 'valid' | 'suspended';
  suspendedFor: string | null;
  warrant: Warrant | null;
  caution: string | null;
  alert: string | null;
}

export interface Vehicle {
  plate: string;
  year: number;
  make: string;
  model: string;
  color: string;
  body: string;
  ownerId: string;
  status: 'valid' | 'expired' | 'stolen';
  insured: boolean;
  expires: string;
  reportedBy: string | null;
}

type Rand = () => number;

export const TODAY = new Date(2026, 9, 31);

const maleNames = ['James', 'Daniel', 'Marcus', 'Tyler', 'Victor', 'Dominic', 'Cole', 'Ethan', 'Luis', 'Omar', 'Wesley', 'Nathan', 'Rafael', 'Grant', 'Calvin', 'Elias', 'Jordan', 'Mateo', 'Harold', 'Vincent', 'Derek', 'Andre', 'Simon', 'Russell', 'Trevor', 'Anthony', 'Raymond', 'Isaac', 'Felix', 'Dennis'];
const femaleNames = ['Dana', 'Maria', 'Priya', 'Hannah', 'Renee', 'Tasha', 'Colleen', 'Alicia', 'Naomi', 'Gloria', 'Brianna', 'Lena', 'Marissa', 'Joanne', 'Carmen', 'Whitney', 'Sasha', 'Teresa', 'Imani', 'Paige'];
const lastNames = ['Brennan', 'Delgado', 'Ferraro', 'Okafor', 'Whitfield', 'Nakamura', 'Castillo', 'Holloway', 'Prescott', 'Lindqvist', 'Moreau', 'Abernathy', 'Torres', 'Valdez', 'Kessler', 'Rourke', 'Baptiste', 'Hargrove', 'Sandoval', 'Pemberton', 'Calloway', 'Dunmore', 'Ellison', 'Fitzgerald', 'Garrity', 'Haddad', 'Iverson', 'Jessup', 'Kowalski', 'Lemaire', 'Marchetti', 'Novak', 'Oyelaran', 'Pruitt', 'Quimby', 'Radcliffe', 'Salazar', 'Thackeray', 'Underhill', 'Voss'];
const eyePool = ['BRN', 'BRN', 'BRN', 'BLU', 'GRN', 'HAZ', 'BLK'];
const hairPool = ['BRN', 'BRN', 'BLK', 'BLK', 'BLN', 'RED', 'GRY'];
const restrictionPool = ['Corrective lenses', 'Daylight driving only', 'Automatic transmission', 'No passengers under 18'];
const endorsementPool = ['Motorcycle', 'Commercial', 'Hazmat', 'Passenger'];
const offences = ['Failure to appear', 'Probation violation', 'Unpaid fines', 'Domestic assault', 'Driving while suspended', 'Theft'];
const suspensions = ['Unpaid fines', 'Failure to appear', 'Points exceeded', 'Insurance lapse'];
const courts = ['Liberty County Court', 'Queen Creek Municipal Court', 'Liberty County Superior Court'];

export interface Face {
  id: string;
  hair: string;
  age: [number, number];
}

// traits of each avatar, so a card never shows a bald man with brown hair on paper
export const faces: Face[] = [
  { id: '2606635731', hair: 'BAL', age: [38, 56] },
  { id: '2254002749', hair: 'BRN', age: [32, 50] },
  { id: '177707197', hair: 'GRY', age: [60, 78] },
  { id: '7537251021', hair: 'BLK', age: [26, 46] },
  { id: '2544552124', hair: 'RED', age: [18, 30] },
  { id: '1303323163', hair: 'BRN', age: [30, 52] },
];
export const NO_FACE = '4204483990';

const streets = [...new Set(postals.map((p) => p.street).filter((s): s is string => Boolean(s)))];
const streetPostals = postals.filter((p) => p.street);

const makes: [string, string[], string][] = [
  ['Ford', ['F-150', 'Fusion', 'Explorer', 'Mustang'], 'pickup truck'],
  ['Chevrolet', ['Silverado', 'Malibu', 'Tahoe', 'Camaro'], 'SUV'],
  ['Toyota', ['Camry', 'Corolla', 'RAV4', 'Tacoma'], 'sedan'],
  ['Honda', ['Civic', 'Accord', 'CR-V'], 'sedan'],
  ['Nissan', ['Altima', 'Sentra', 'Rogue'], 'sedan'],
  ['Dodge', ['Charger', 'Durango', 'Ram 1500'], 'sedan'],
  ['Jeep', ['Wrangler', 'Cherokee'], 'SUV'],
  ['Subaru', ['Outback', 'Impreza'], 'hatchback'],
];
const colors = ['white', 'black', 'silver', 'red', 'blue', 'grey', 'green', 'tan'];

const pick = <T,>(rand: Rand, list: T[]): T => list[Math.floor(rand() * list.length)];
const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pad = (n: number) => String(n).padStart(2, '0');
export const dateText = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

export const fullName = (p: Pick<Person, 'first' | 'middle' | 'last'>) => `${p.first} ${p.middle}. ${p.last}`;
export const inches = (n: number) => `${Math.floor(n / 12)} ft ${n % 12} in`;

export function makePerson(rand: Rand, n: number): Person {
  const sex: 'M' | 'F' = rand() < 0.78 ? 'M' : 'F';
  const face = sex === 'M' ? pick(rand, faces) : null;
  const age = face ? between(rand, face.age[0], face.age[1]) : between(rand, 19, 66);
  const dob = new Date(TODAY.getFullYear() - age, between(rand, 0, 11), between(rand, 1, 28));
  const issuedYear = TODAY.getFullYear() - between(rand, 0, 4);
  const issued = new Date(issuedYear, dob.getMonth(), dob.getDate());
  const expires = new Date(issuedYear + 5, dob.getMonth(), dob.getDate());
  const spot = pick(rand, streetPostals);

  const suspended = rand() < 0.08;
  const warrant = rand() < 0.06;
  return {
    id: `P${String(n).padStart(4, '0')}`,
    first: pick(rand, sex === 'M' ? maleNames : femaleNames),
    middle: String.fromCharCode(65 + between(rand, 0, 25)),
    last: pick(rand, lastNames),
    sex,
    dob: dateText(dob),
    address: { number: between(rand, 100, 1900), street: spot.street ?? pick(rand, streets), postal: spot.id },
    licence: `QC${String(between(rand, 10000000, 99999999))}`,
    cls: rand() < 0.9 ? 'C' : 'M',
    endorsements: rand() < 0.15 ? [pick(rand, endorsementPool)] : [],
    restrictions: rand() < 0.45 ? [pick(rand, restrictionPool)] : [],
    issued: dateText(issued),
    expires: dateText(expires),
    height: sex === 'M' ? between(rand, 65, 76) : between(rand, 60, 70),
    weight: sex === 'M' ? between(rand, 150, 235) : between(rand, 110, 190),
    eyes: face ? 'BRN' : pick(rand, eyePool),
    hair: face ? face.hair : pick(rand, hairPool),
    photo: face ? face.id : NO_FACE,
    status: suspended ? 'suspended' : 'valid',
    suspendedFor: suspended ? pick(rand, suspensions) : null,
    warrant: warrant ? makeWarrant(rand) : null,
    caution: warrant && rand() < 0.4 ? 'Prior weapons contact, use caution' : null,
    alert: null,
  };
}

export function makeWarrant(rand: Rand): Warrant {
  return { offence: pick(rand, offences), court: pick(rand, courts), bond: pick(rand, [500, 1000, 2500, 5000]), extradition: 'In county only' };
}

export function makeVehicle(rand: Rand, ownerId: string, plate?: string): Vehicle {
  const [make, models, body] = pick(rand, makes);
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + between(rand, 0, 25))).join('');
  const expires = new Date(TODAY.getFullYear() + between(rand, 0, 1), between(rand, 0, 11), between(rand, 1, 28));
  return {
    plate: plate ?? `${letters}${between(rand, 100, 999)}`,
    year: between(rand, 2008, 2025),
    make,
    model: pick(rand, models),
    color: pick(rand, colors),
    body,
    ownerId,
    status: expires < TODAY ? 'expired' : 'valid',
    insured: rand() > 0.04,
    expires: dateText(expires),
    reportedBy: null,
  };
}

export const plateText = (plate: string) => `${plate.slice(0, 3)} ${plate.slice(3)}`;
