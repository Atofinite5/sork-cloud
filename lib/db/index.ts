import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Drizzle client (lazy — only initialized on first access).
 *
 *   import { db } from '@/lib/db';
 *   import { users } from '@/lib/db/schema';
 *   const all = await db.select().from(users);
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.',
        );
      }
      _db = drizzle(neon(url), { schema });
    }
    return Reflect.get(_db, prop);
  },
});

export { schema };
