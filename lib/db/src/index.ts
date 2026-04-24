import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const rawDatabaseUrl = process.env.DATABASE_URL;

const needsSsl =
  process.env.PGSSL === "true" ||
  process.env.NODE_ENV === "production" ||
  /sslmode=(require|verify-ca|verify-full|no-verify)/.test(rawDatabaseUrl);

function stripSslModeFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return parsed.toString();
  } catch {
    return url;
  }
}

const connectionString = needsSsl
  ? stripSslModeFromUrl(rawDatabaseUrl)
  : rawDatabaseUrl;

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
