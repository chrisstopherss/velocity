import { useCallback, useEffect, useReducer, useState } from 'react';
import { initialState, reducer, type GameState } from './state';

const TICK_SECONDS = 0.1;

export function hintFor(state: GameState): string {
  switch (state.phase) {
    case 'waiting':
      return 'Next call is coming in. Check the unit board while you wait.';
    case 'ringing':
      return 'Answer the call.';
    case 'call':
      return 'Ask for the location, what is happening and any weapons before you create the incident.';
    case 'incident':
      return state.incident?.dispatchedAt === null
        ? 'Select the nearest units and dispatch them.'
        : 'Wait for units to arrive, then clear the call.';
    case 'closed':
      return 'Call closed. Review your score.';
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick', dt: TICK_SECONDS }), TICK_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const sendSelected = useCallback(() => {
    if (!selected.length) return;
    dispatch({ type: 'dispatch', unitIds: selected });
    setSelected([]);
  }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        dispatch({ type: 'answer' });
      } else if (e.key === 'F5') {
        e.preventDefault();
        sendSelected();
      } else if (e.key === 'F12') {
        e.preventDefault();
        dispatch({ type: 'clear' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendSelected]);

  return { state, dispatch, selected, toggle, sendSelected, hint: hintFor(state) };
}

export type GameApi = ReturnType<typeof useGame>;
