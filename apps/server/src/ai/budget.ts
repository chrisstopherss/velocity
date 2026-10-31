export interface Limits {
  ipDailyTokens: number;
  globalDailyTokens: number;
  perMinute: number;
}

export type Verdict = { ok: true } | { ok: false; reason: 'rate' | 'daily' | 'global' };

const MINUTE = 60_000;

export class Budget {
  private day = '';
  private perIp = new Map<string, number>();
  private global = 0;
  private recent = new Map<string, number[]>();

  constructor(
    private limits: Limits,
    private now: () => number = Date.now,
  ) {}

  private roll(): void {
    const today = new Date(this.now()).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.perIp.clear();
      this.recent.clear();
      this.global = 0;
    }
  }

  check(ip: string, estimate: number): Verdict {
    this.roll();
    const t = this.now();
    const hits = (this.recent.get(ip) ?? []).filter((x) => t - x < MINUTE);
    if (hits.length >= this.limits.perMinute) return { ok: false, reason: 'rate' };
    if (this.global + estimate > this.limits.globalDailyTokens) return { ok: false, reason: 'global' };
    if ((this.perIp.get(ip) ?? 0) + estimate > this.limits.ipDailyTokens) return { ok: false, reason: 'daily' };
    hits.push(t);
    this.recent.set(ip, hits);
    return { ok: true };
  }

  record(ip: string, tokens: number): void {
    this.roll();
    this.perIp.set(ip, (this.perIp.get(ip) ?? 0) + tokens);
    this.global += tokens;
  }

  left(ip: string): number {
    this.roll();
    return Math.max(0, this.limits.ipDailyTokens - (this.perIp.get(ip) ?? 0));
  }
}
