import { NextResponse } from "next/server";
import { db } from "@/db";
import { exercises, exerciseAliases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exList = await db
    .select()
    .from(exercises)
    .where(eq(exercises.is_archived, false))
    .orderBy(exercises.name);

  const aliases = await db.select().from(exerciseAliases);

  return NextResponse.json({ exercises: exList, aliases });
}
