import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local manually
try {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* ignore */ }
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  console.log("1. Creating users table...");
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         BIGSERIAL PRIMARY KEY,
      username   TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      can_view_all BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("2. Adding user_id column to sessions (if not exists)...");
  await sql`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id)
  `;

  console.log("3. Hashing passwords...");
  const tahaHash = await bcrypt.hash(process.env.LOG_PASSWORD!, 12);
  const mohssineHash = await bcrypt.hash("mohssine123", 12);

  console.log("4. Inserting users...");
  const tahaRows = await sql`
    INSERT INTO users (username, password_hash, can_view_all)
    VALUES ('taha', ${tahaHash}, false)
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id
  `;
  const tahaId = tahaRows[0].id;
  console.log(`   Taha id = ${tahaId}`);

  await sql`
    INSERT INTO users (username, password_hash, can_view_all)
    VALUES ('mohssine', ${mohssineHash}, true)
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
  console.log("   Mohssine inserted (can_view_all = true)");

  console.log("5. Assigning all existing sessions to Taha...");
  const result = await sql`
    UPDATE sessions SET user_id = ${tahaId} WHERE user_id IS NULL
  `;
  console.log(`   Updated ${result.length ?? "?"} sessions`);

  console.log("6. Making user_id NOT NULL...");
  await sql`
    ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL
  `;

  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
