import type { Logger } from 'pino';

// Hono request-context variables shared across middleware + routes.
export type AppBindings = {
  Variables: {
    logger: Logger;
    reqId: string;
  };
};
