import { useEffect, useRef } from 'react';
import type { GameApi } from '../game/useGame';
import { canSpeak, speak, stopSpeaking } from './speech';

// reads the caller and the units aloud as their lines arrive, nothing is rendered
export function VoiceController({ g }: { g: GameApi }) {
  const { state, voice } = g;
  const spoken = useRef({ call: state.callNumber, count: state.transcript.length });
  const lastRadio = useRef(state.radio.length ? state.radio[state.radio.length - 1].id : 0);

  useEffect(() => {
    if (!voice.on || !canSpeak()) {
      stopSpeaking();
      spoken.current = { call: state.callNumber, count: state.transcript.length };
      return;
    }
    if (spoken.current.call !== state.callNumber) {
      stopSpeaking();
      spoken.current = { call: state.callNumber, count: 0 };
    }
    for (const line of state.transcript.slice(spoken.current.count)) {
      if (line.from === 'caller') speak(line.text, state.scenario.caller);
    }
    spoken.current.count = state.transcript.length;
  }, [state.transcript, state.callNumber, state.scenario.caller, voice.on]);

  useEffect(() => {
    const fresh = state.radio.filter((l) => l.id > lastRadio.current);
    if (!fresh.length) return;
    lastRadio.current = fresh[fresh.length - 1].id;
    if (!voice.on || !canSpeak()) return;
    for (const line of fresh) {
      if (line.from !== 'DISP') speak(line.text, line.from, { radio: true });
    }
  }, [state.radio, voice.on]);

  useEffect(() => {
    if (state.phase === 'closed') stopSpeaking();
  }, [state.phase]);

  return null;
}
