import * as schema from '@yermilov/db-schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type Database = ReturnType<typeof createDb>['db'];

// Drizzle over postgres-js, same shape as juggernaut. Only called when
// DATABASE_URL is set (see index.ts); the schema barrel is empty for now.
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  const db = drizzle(client, { schema });
  return { client, db };
}
