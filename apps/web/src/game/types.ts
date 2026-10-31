export type Agency = 'PD' | 'SO' | 'SP';
export type Priority = 1 | 2 | 3 | 4;
export type Fact = 'location' | 'nature' | 'weapons' | 'injuries' | 'suspect' | 'safety';
export type IncidentTypeId =
  | 'shots_fired'
  | 'domestic'
  | 'suspicious_vehicle'
  | 'traffic_collision'
  | 'burglary'
  | 'assault'
  | 'welfare_check'
  | 'alarm';

export interface Postal {
  id: number;
  x: number;
  y: number;
  street?: string;
}

export interface Scenario {
  id: string;
  title: string;
  caller: string;
  ringAfter: number;
  opening: string;
  truth: {
    type: IncidentTypeId;
    priority: Priority;
    postal: number;
    agencies: Agency[];
    minUnits: number;
  };
  answers: Record<Exclude<Fact, 'location'>, string>;
}

export type UnitStatus = 'available' | 'enroute' | 'onscene';

export interface Point {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  name: string;
  agency: Agency;
  status: UnitStatus;
  x: number;
  y: number;
  route: Point[];
  trail: Point[];
}

export interface RadioLine {
  id: number;
  t: number;
  from: string;
  text: string;
  emergency?: boolean;
}

export interface TranscriptLine {
  from: 'caller' | 'you' | 'system';
  text: string;
}

export interface Incident {
  id: string;
  type: IncidentTypeId;
  priority: Priority;
  postal: number;
  narrative: string;
  createdAt: number;
  unitIds: string[];
  dispatchedAt: number | null;
}

export interface IncidentDraft {
  type: IncidentTypeId;
  priority: Priority;
  postal: number;
  narrative: string;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface Score {
  total: number;
  lines: ScoreLine[];
}

export type Phase = 'waiting' | 'ringing' | 'call' | 'incident' | 'closed';
