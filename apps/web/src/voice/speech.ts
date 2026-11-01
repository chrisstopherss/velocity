const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

// plates and unit ids are read out one character at a time
export function speakable(text: string): string {
  return text
    .replace(/\b([A-Z]{3})\s?(\d{3})\b/g, (_, l: string, d: string) => `${[...l].join(' ')} ${[...d].join(' ')}`)
    .replace(/\b([0-9]?[A-Z]{1,2})-(\d+)\b/g, (_, a: string, b: string) => `${[...a].join(' ')} ${[...b].join(' ')}`)
    .replace(/\bDISP\b/g, 'dispatch');
}

export interface VoiceChoice {
  voice: number;
  pitch: number;
  rate: number;
}

// the same name always gets the same voice, so a caller sounds like one person for the whole call
export function choiceFor(name: string, voices: number): VoiceChoice {
  const h = Math.abs(hash(name));
  return { voice: voices ? h % voices : 0, pitch: 0.85 + (Math.abs(hash(`${name}p`)) % 30) / 100, rate: 1 + (Math.abs(hash(`${name}r`)) % 12) / 100 };
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const englishVoices = () => {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const us = all.filter((v) => v.lang.toLowerCase() === 'en-us');
  return us.length >= 2 ? us : all;
};

let backlog = 0;

export function speak(text: string, who: string, options: { radio?: boolean } = {}) {
  if (!canSpeak()) return;
  if (options.radio && backlog >= 2) return;
  const voices = englishVoices();
  const pick = choiceFor(who, voices.length);
  const u = new SpeechSynthesisUtterance(speakable(text));
  if (voices[pick.voice]) u.voice = voices[pick.voice];
  u.pitch = pick.pitch;
  u.rate = options.radio ? pick.rate + 0.1 : pick.rate;
  u.volume = options.radio ? 0.7 : 1;
  backlog++;
  const done = () => {
    backlog = Math.max(0, backlog - 1);
  };
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  backlog = 0;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canListen = () => recognitionCtor() !== null;

export interface Listener {
  stop: () => void;
}

export function listen(onText: (text: string) => void, onEnd: (error: string | null) => void): Listener | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let failure: string | null = null;
  rec.onresult = (e) => {
    const heard = e.results[0]?.[0]?.transcript?.trim();
    if (heard) onText(heard);
  };
  rec.onerror = (e) => {
    failure = e.error;
  };
  rec.onend = () => onEnd(failure);
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}
