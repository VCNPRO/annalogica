// app/api/_debug/env/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
const KEYS = ["POSTGRES_URL","POSTGRES_URL_NON_POOLING","DATABASE_URL","DB_URL","AUTH_SECRET","JWT_SECRET","SENTRY_DSN","S3_BUCKET"];
export async function GET() {
  const presence = Object.fromEntries(KEYS.map(k => [k, process.env[k] ? "SET" : "MISSING"]));
  return NextResponse.json({ env: presence });
}