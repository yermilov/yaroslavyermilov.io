import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  // Bind 0.0.0.0 so the container is reachable on Railway; override locally.
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  // Optional until Postgres is wired: the skeleton boots and serves /healthz
  // with no database. Set it (Railway Postgres add-on) when the first feature
  // needs persistence.
  DATABASE_URL: z.string().url().optional(),
  // Browser origins allowed to call the API (comma-separated). The web app is a
  // different origin, so cross-origin calls need CORS.
  WEB_ORIGIN: z
    .string()
    .default('https://yaroslavyermilov.io,http://localhost:4321'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-image'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat empty-string env vars as unset so `.default()`/`.optional()` apply —
  // Railway can inject NODE_ENV="" at runtime, which zod's `.default()` won't
  // fill (it only fills `undefined`), so an empty value would crash startup.
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') cleaned[key] = value;
  }
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
