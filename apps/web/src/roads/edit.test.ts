import { describe, expect, it } from 'vitest';
import { addNode, check, components, moveNode, removeNode, serialize, toggleEdge, type Draft } from './edit';

const base: Draft = {
  nodes: [
    [0, 0],
    [100, 0],
    [200, 0],
  ],
  edges: [[0, 1]],
};

describe('road edits', () => {
  it('adds a node linked to the selected one', () => {
    const { draft, id } = addNode(base, 300, 40, 1);
    expect(id).toBe(3);
    expect(draft.edges).toContainEqual([1, 3]);
    expect(addNode(base, 5, 5, null).draft.edges).toEqual(base.edges);
  });

  it('toggles an edge on and off in either direction', () => {
    const on = toggleEdge(base, 1, 2);
    expect(on.edges).toHaveLength(2);
    expect(toggleEdge(on, 2, 1).edges).toEqual(base.edges);
    expect(toggleEdge(base, 1, 1)).toBe(base);
  });

  it('moves a node without touching the others', () => {
    const moved = moveNode(base, 2, 250.26, 9);
    expect(moved.nodes[2]).toEqual([250.3, 9]);
    expect(moved.nodes[0]).toEqual([0, 0]);
    expect(base.nodes[2]).toEqual([200, 0]);
  });

  it('removes a node and renumbers the edges', () => {
    const wired = toggleEdge(base, 1, 2);
    const res = removeNode(wired, 0);
    expect(res.nodes).toHaveLength(2);
    expect(res.edges).toEqual([[0, 1]]);
  });

  it('finds separate networks and postals cut off from the main one', () => {
    expect(components(base)).toEqual([0, 0, 1]);
    const res = check(base, [
      { id: 1, x: 10, y: 0 },
      { id: 2, x: 210, y: 0 },
    ]);
    expect(res.parts).toBe(2);
    expect(res.cutOff).toEqual([2]);
    expect(check({ nodes: [], edges: [] }, [{ id: 7, x: 0, y: 0 }]).cutOff).toEqual([7]);
  });

  it('serializes to a module that can be pasted back in', () => {
    const text = serialize(base);
    expect(text).toContain('export const rawRoads');
    expect(text).toContain('[100, 0],');
    expect(text).toContain('[0, 1],');
  });
});
