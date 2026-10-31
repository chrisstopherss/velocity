import type { Postal } from '../game/types';
import { rawPostals } from './postals.data';

export const postals: Postal[] = rawPostals.map(([id, x, y, street]) => ({
  id,
  x,
  y,
  street: street ?? undefined,
}));

export const postalById = new Map(postals.map((p) => [p.id, p]));

export function postalLabel(id: number): string {
  const p = postalById.get(id);
  if (!p) return `Postal ${id}`;
  return p.street ? `${id} ${p.street}` : `Postal ${id}`;
}

export function postalDetail(id: number): string {
  const p = postalById.get(id);
  if (!p) return '';
  return p.street ?? '';
}
