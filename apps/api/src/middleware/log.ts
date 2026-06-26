import { createMiddleware } from 'hono/factory';
import type { Logger } from 'pino';
import type { AppBindings } from '../types';

export function logMiddleware(baseLogger: Logger) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const reqId =
      c.req.header('x-request-id') ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`;

    const child = baseLogger.child({
      reqId,
      method: c.req.method,
      path: c.req.path,
    });
    c.set('logger', child);
    c.set('reqId', reqId);

    const start = performance.now();
    child.info({ event: 'request.start' });
    try {
      await next();
      child.info({
        event: 'request.end',
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      child.error({
        event: 'request.error',
        durationMs: Math.round(performance.now() - start),
        err,
      });
      throw err;
    }
  });
}
