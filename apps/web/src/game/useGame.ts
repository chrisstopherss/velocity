import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { chooseScenario } from '../data/scenarios';
import { askCaller, fetchAiEnabled } from './ai';
import { initialState, MAX_TYPED, reducer, type GameState } from './state';

const TICK_SECONDS = 1 / 30;

export function hintFor(state: GameState): string {
  switch (state.phase) {
    case 'waiting':
      return 'Next call is coming in. Check the unit board while you wait.';
    case 'ringing':
      return 'Answer the call.';
    case 'call':
      return 'Ask for the location, what is happening and any weapons before you create the incident. Not every call needs units.';
    case 'incident':
      return state.incident?.dispatchedAt === null
        ? 'Select the nearest units and dispatch them.'
        : 'Wait for units to arrive, then clear the call.';
    case 'closed':
      return 'Call closed. Review your score.';
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    return initialState(seed, chooseScenario(seed, 0));
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [ai, setAi] = useState<{ enabled: boolean; left: number | null }>({ enabled: false, left: null });
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    let live = true;
    fetchAiEnabled().then((enabled) => live && setAi((cur) => ({ ...cur, enabled })));
    return () => {
      live = false;
    };
  }, []);

  const say = useCallback(
    (text: string) => {
      const s = latest.current;
      const message = text.trim();
      const open = s.phase === 'call' || s.phase === 'incident';
      if (!ai.enabled || ai.left === 0 || !message || !open || s.pending || s.typed >= MAX_TYPED) return;
      dispatch({ type: 'say', text: message });
      askCaller(s.scenario, message.slice(0, 140), s.transcript).then((res) => {
        dispatch({ type: 'reply', call: s.callNumber, text: res.text, told: res.told, system: res.system });
        setAi((cur) => ({ ...cur, left: res.left ?? cur.left }));
      });
    },
    [ai.enabled, ai.left],
  );

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

  return { state, dispatch, selected, toggle, sendSelected, say, ai, hint: hintFor(state) };
}

export type GameApi = ReturnType<typeof useGame>;
