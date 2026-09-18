import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/schema";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export function getDb() {
  return drizzle(getSql(), { schema });
}

export function isMissingDatabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("DATABASE_URL");
}
