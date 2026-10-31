const sexual =
  /\b(porn\w*|nsfw|nude\w*|naked|sex|sexy|sexual\w*|rape\w*|rapist|molest\w*|pedo\w*|incest|fetish|erotic\w*|orgasm|genital\w*|penis|vagina|boobs?|blowjob|hentai|onlyfans|lingerie)\b/i;

const childWord = '(child|children|kids?|minors?|underage|teen\\w*|toddler|baby|boys?|girls?)';
const childHarm = '(abus\\w*|molest\\w*|nude|naked|sexual\\w*|porn\\w*)';
const childCombo = new RegExp(`\\b${childWord}\\b[^.!?]{0,40}\\b${childHarm}\\b|\\b${childHarm}\\b[^.!?]{0,40}\\b${childWord}\\b`, 'i');

const injection =
  /ignore (all |any )?(the )?(previous|prior|above|earlier)|system prompt|your (rules|instructions)|you are now|pretend (to be|you)|jailbreak|developer mode|act as (an? )?(ai|assistant|chatbot)/i;

export function unsafe(text: string): boolean {
  return sexual.test(text) || childCombo.test(text);
}

export function injecting(text: string): boolean {
  return injection.test(text);
}

export const deflection = 'I just need help with the emergency, can you send someone?';

export const unclear = 'Sorry, I did not catch that. Can you say it again?';
