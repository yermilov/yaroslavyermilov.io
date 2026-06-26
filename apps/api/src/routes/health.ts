import { Hono } from 'hono';
import type { AppBindings } from '../types';

export function healthRoutes(hasDb: boolean) {
  return new Hono<AppBindings>().get('/', (c) =>
    c.json({
      status: 'ok',
      service: 'yaroslavyermilov-api',
      db: hasDb ? 'configured' : 'not-configured',
    }),
  );
}
