import { CircleCheck, Info, TriangleAlert, UserRound } from 'lucide-react';
import { useState } from 'react';
import { fullName, inches, plateText, type Person, type Vehicle } from '../data/people';
import { ownerOf, vehiclesOf, type Records } from '../game/records';

type Tone = 'ok' | 'warn' | 'bad' | 'mute';

function Mark({ tone, children }: { tone: Tone; children: string }) {
  const Icon = tone === 'ok' ? CircleCheck : tone === 'mute' ? Info : TriangleAlert;
  return (
    <span className={`mark ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

function Photo({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="photo">
      {failed ? (
        <UserRound size={56} aria-label="No photo on file" />
      ) : (
        <img src={`/api/avatar/${person.photo}`} alt="" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

interface PersonProps {
  person: Person;
  records: Records;
  onVehicle: (v: Vehicle) => void;
}

export function PersonRecord({ person, records, onVehicle }: PersonProps) {
  const cars = vehiclesOf(records, person.id);
  return (
    <article className="record">
      <header className="rec-top">
        <Photo key={person.id} person={person} />
        <div>
          <h3>
            {person.last.toUpperCase()}, {person.first} {person.middle}
          </h3>
          <span className="mono muted">{person.licence}</span>
          <div className="marks">
            {person.warrant ? <Mark tone="bad">Active warrant</Mark> : null}
            {person.status === 'suspended' ? <Mark tone="warn">Licence suspended</Mark> : null}
            {!person.warrant && person.status === 'valid' ? <Mark tone="ok">No wants, licence valid</Mark> : null}
          </div>
        </div>
      </header>
      <dl className="rec-kv">
        <dt>Born</dt>
        <dd>{person.dob}</dd>
        <dt>Height, weight</dt>
        <dd>
          {inches(person.height)}, {person.weight} lb
        </dd>
        <dt>Eyes, hair</dt>
        <dd>
          {person.eyes}, {person.hair}
        </dd>
        <dt>Address</dt>
        <dd>
          {person.address.number} {person.address.street}, postal {person.address.postal}
        </dd>
        <dt>Class</dt>
        <dd>
          {person.cls}, issued {person.issued}, expires {person.expires}
        </dd>
        <dt>Restrictions</dt>
        <dd>{person.restrictions.length ? person.restrictions.join(', ') : 'None'}</dd>
        {person.endorsements.length ? (
          <>
            <dt>Endorsements</dt>
            <dd>{person.endorsements.join(', ')}</dd>
          </>
        ) : null}
        {person.suspendedFor ? (
          <>
            <dt>Suspended for</dt>
            <dd className="warn">{person.suspendedFor}</dd>
          </>
        ) : null}
      </dl>
      {person.warrant ? (
        <section>
          <h4>Warrant</h4>
          <dl className="rec-kv">
            <dt>Offence</dt>
            <dd>{person.warrant.offence}</dd>
            <dt>Court</dt>
            <dd>{person.warrant.court}</dd>
            <dt>Bond, extradition</dt>
            <dd>
              ${person.warrant.bond}, {person.warrant.extradition}
            </dd>
            <dt className="bad">Hit not confirmed</dt>
            <dd>Contact the issuing court before acting.</dd>
          </dl>
        </section>
      ) : null}
      {person.caution ? (
        <p className="mark warn caution">
          <TriangleAlert size={14} aria-hidden="true" />
          {person.caution}
        </p>
      ) : null}
      <section>
        <h4>Vehicles</h4>
        {cars.length === 0 ? <p className="muted">None on record.</p> : null}
        {cars.map((v) => (
          <button key={v.plate} type="button" className="link-row" onClick={() => onVehicle(v)}>
            <span className="mono">{plateText(v.plate)}</span>
            <span>
              {v.year} {v.make} {v.model}, {v.color}
            </span>
          </button>
        ))}
      </section>
    </article>
  );
}

interface VehicleProps {
  vehicle: Vehicle;
  records: Records;
  onPerson: (p: Person) => void;
}

export function VehicleRecord({ vehicle, records, onPerson }: VehicleProps) {
  const owner = ownerOf(records, vehicle);
  return (
    <article className="record">
      <header className="rec-top">
        <span className="plate big">
          <i>LIBERTY COUNTY</i>
          <b>{plateText(vehicle.plate)}</b>
        </span>
        <div>
          <h3>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <span className="muted">
            {vehicle.color} {vehicle.body}
          </span>
          <div className="marks">
            {vehicle.status === 'stolen' ? <Mark tone="bad">Stolen vehicle</Mark> : null}
            {vehicle.status === 'expired' ? <Mark tone="warn">Registration expired</Mark> : null}
            {vehicle.status === 'valid' ? <Mark tone="ok">Registration valid</Mark> : null}
          </div>
        </div>
      </header>
      <dl className="rec-kv">
        <dt>Registered to</dt>
        <dd>
          {owner ? (
            <button type="button" className="link" onClick={() => onPerson(owner)}>
              {fullName(owner)}
            </button>
          ) : (
            'Unknown'
          )}
        </dd>
        {owner ? (
          <>
            <dt>Address</dt>
            <dd>
              {owner.address.number} {owner.address.street}, postal {owner.address.postal}
            </dd>
          </>
        ) : null}
        <dt>{vehicle.status === 'expired' ? 'Expired' : 'Expires'}</dt>
        <dd className={vehicle.status === 'expired' ? 'warn' : ''}>{vehicle.expires}</dd>
        {vehicle.reportedBy ? (
          <>
            <dt className="bad">Reported by</dt>
            <dd>{vehicle.reportedBy}</dd>
            <dt>Hit not confirmed</dt>
            <dd>Confirm with the agency and check the make and model before acting.</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}
