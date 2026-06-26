import { defineConfig } from 'drizzle-kit';

// Generates migrations from the shared Drizzle schema into ./drizzle.
// No tables yet (the schema barrel is empty) -> `db:generate` is a no-op until
// the first table lands.
export default defineConfig({
  schema: '../../packages/db-schema/src/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? 'postgres://invalid' },
  strict: true,
  verbose: true,
});
