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
  | 'alarm'
  | 'robbery'
  | 'reckless_driver'
  | 'hit_and_run'
  | 'noise_disturbance'
  | 'vehicle_theft'
  | 'trespass'
  | 'suspicious_person'
  | 'disabled_vehicle'
  | 'theft'
  | 'false_report';

export interface Postal {
  id: number;
  x: number;
  y: number;
  street?: string;
}

export interface ScenarioPick {
  caller: number;
  variant: number;
  place: number;
}

export interface Scenario {
  id: string;
  pick: ScenarioPick;
  questions: Fact[];
  label: string;
  locationOverride?: string;
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

export type UnitStatus = 'available' | 'enroute' | 'onscene' | 'onstop';

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
  wait: number;
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
  reveal: string;
  lines: ScoreLine[];
}

export type Phase = 'waiting' | 'ringing' | 'call' | 'incident' | 'closed';

export type StopOutcome = 'routine' | 'expired' | 'warrant' | 'stolen' | 'felony';

export interface Stop {
  id: string;
  unitId: string;
  x: number;
  y: number;
  postal: number;
  vehicle: string;
  plate: string;
  outcome: StopOutcome;
  startedAt: number;
  duration: number;
  ackAt: number | null;
  plateAskedAt: number | null;
  plateAt: number | null;
  plateResult: string | null;
  backupAskedAt: number | null;
  backupIds: string[];
  backupSentAt: number | null;
  backupArrivedAt: number | null;
  reminded: boolean;
  escalated: boolean;
  closedAt: number | null;
}

export interface StopResult {
  id: string;
  unitId: string;
  total: number;
  notes: string[];
}
