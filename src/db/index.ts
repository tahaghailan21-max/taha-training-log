import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDb() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set");
  const sql = neon(url);
  return drizzle(sql, { schema });
}

const globalForDb = globalThis as unknown as { db: ReturnType<typeof getDb> };
export const db = globalForDb.db ?? getDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
