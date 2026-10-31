import type { Postal } from '../game/types';
import { rawPostals } from './postals.data';

export const postals: Postal[] = rawPostals.map(([id, x, y, street, near]) => ({
  id,
  x,
  y,
  street: street ?? undefined,
  near: near ?? undefined,
}));

export const postalById = new Map(postals.map((p) => [p.id, p]));

export function postalLabel(id: number): string {
  const p = postalById.get(id);
  if (!p) return `Postal ${id}`;
  const name = p.street ?? p.near;
  return name ? `${id} ${name}` : `Postal ${id}`;
}

export function postalDetail(id: number): string {
  const p = postalById.get(id);
  if (!p) return '';
  if (p.street && p.near) return `${p.street}, near ${p.near}`;
  return p.street ?? (p.near ? `near ${p.near}` : '');
}
