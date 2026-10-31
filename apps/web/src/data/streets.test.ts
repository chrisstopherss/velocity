import { describe, expect, it } from 'vitest';
import mapData from './erlc-map-data.json';
import { splitLine, streetLabels } from './streets';

describe('street labels', () => {
  it('has a label line for the named roads in the map data', () => {
    const names = new Set(streetLabels.map((s) => s.name));
    const missing = mapData.roads.map((r) => r.name).filter((n) => !names.has(n));
    expect(missing.length).toBeLessThan(6);
    expect(names.has('Freedom Avenue')).toBe(true);
    expect(names.has('Highway 55')).toBe(true);
    expect(streetLabels.length).toBeGreaterThan(90);
  });

  it('keeps every label line inside the map image', () => {
    for (const s of streetLabels) {
      expect(s.box[0]).toBeGreaterThanOrEqual(0);
      expect(s.box[2]).toBeLessThanOrEqual(1932);
      expect(s.box[1]).toBeGreaterThanOrEqual(0);
      expect(s.box[3]).toBeLessThanOrEqual(1932);
      expect(s.d.startsWith('M')).toBe(true);
    }
  });

  it('splits a long line into even pieces that join up', () => {
    const line: [number, number][] = [
      [0, 0],
      [1500, 0],
    ];
    const parts = splitLine(line, 650);
    expect(parts).toHaveLength(3);
    expect(parts[0][0]).toEqual([0, 0]);
    expect(parts[2].at(-1)).toEqual([1500, 0]);
    expect(parts[0].at(-1)).toEqual(parts[1][0]);
    expect(parts[1].at(-1)).toEqual(parts[2][0]);
    expect(parts[1][0][0]).toBeCloseTo(500);
  });

  it('keeps short lines whole', () => {
    expect(splitLine([[0, 0], [100, 40], [200, 0]], 650)).toHaveLength(1);
  });

  it('reads left to right or bottom to top', () => {
    for (const s of streetLabels) {
      const nums = s.d.match(/-?[\d.]+/g)!.map(Number);
      const dx = nums[nums.length - 2] - nums[0];
      const dy = nums[nums.length - 1] - nums[1];
      const upright = Math.abs(dx) < Math.abs(dy) * 0.25;
      if (upright) expect(dy).toBeLessThanOrEqual(0.5);
      else expect(dx).toBeGreaterThanOrEqual(-0.5);
    }
  });
});
