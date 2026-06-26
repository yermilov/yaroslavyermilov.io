import { pino, type Logger } from 'pino';
import type { Env } from './env';

// Minimal pino JSON logger to stdout. Timestamp under `dt` to match juggernaut's
// BetterStack convention. (BetterStack shipping can be added later, copying
// juggernaut's multistream BetterStackStream — kept out of the skeleton.)
export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'yaroslavyermilov-api', env: env.NODE_ENV },
    timestamp: () => `,"dt":"${new Date().toISOString()}"`,
    formatters: { level: (label: string) => ({ level: label }) },
  });
}

export type { Logger };
