import { describe, expect, it } from 'vitest';
import { choiceFor, speakable } from './speech';

describe('speech', () => {
  it('reads plates and unit ids one character at a time', () => {
    expect(speakable('plate HCB825 for SP-4')).toBe('plate H C B 8 2 5 for S P 4');
    expect(speakable('1A-09 copy, S-24 on scene')).toBe('1 A 0 9 copy, S 2 4 on scene');
    expect(speakable('C-1003 cleared')).toBe('C 1 0 0 3 cleared');
    expect(speakable('KRT 482')).toBe('K R T 4 8 2');
  });

  it('says dispatch instead of the short name', () => {
    expect(speakable('DISP to S-21')).toBe('dispatch to S 2 1');
  });

  it('gives the same voice to the same name every time', () => {
    expect(choiceFor('Maria', 6)).toEqual(choiceFor('Maria', 6));
    const picks = new Set(['Maria', 'Dan', 'S-21', '1A-09', 'Priya', 'Omar'].map((n) => choiceFor(n, 6).voice));
    expect(picks.size).toBeGreaterThan(1);
  });

  it('keeps pitch and rate in a believable range and survives no voices', () => {
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      const c = choiceFor(name, 4);
      expect(c.pitch).toBeGreaterThanOrEqual(0.85);
      expect(c.pitch).toBeLessThan(1.15);
      expect(c.rate).toBeGreaterThanOrEqual(1);
      expect(c.rate).toBeLessThan(1.12);
    }
    expect(choiceFor('x', 0).voice).toBe(0);
  });
});
