import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma migrate deploy`/`generate` need a session-level Postgres advisory
    // lock (SELECT pg_advisory_lock(...)) to serialize migrations. That's not
    // safe over a pooled (PgBouncer/Neon "-pooler", transaction-mode) connection
    // — the pooler can silently reassign the underlying backend mid-session,
    // so the lock can be acquired on one backend and never released, causing
    // every future migrate to hang for 10s and time out (P1002). Always run
    // migrations against the DIRECT (non-pooled) connection string; the app's
    // own runtime client (src/lib/prisma.ts) keeps using the pooled
    // DATABASE_URL for normal query traffic, where pooling is safe and wanted.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
