import { Volume2, VolumeX } from 'lucide-react';
import type { GameApi } from '../game/useGame';
import { canSpeak } from './speech';

export function VoiceToggle({ g }: { g: GameApi }) {
  const { voice } = g;
  if (!canSpeak()) return null;
  const Icon = voice.on ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      className="voice-toggle"
      aria-pressed={voice.on}
      aria-label={voice.on ? 'Turn voices off' : 'Turn voices on'}
      title={voice.on ? 'Voices on' : 'Voices off'}
      onClick={() => voice.set(!voice.on)}
    >
      <Icon size={14} aria-hidden="true" />
      Voice
    </button>
  );
}
