import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const trimmed = name.trim();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Return existing if slug already exists
  const [existing] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.slug, slug))
    .limit(1);

  if (existing) return NextResponse.json(existing);

  const [created] = await db
    .insert(exercises)
    .values({ slug, name: trimmed, is_archived: false })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
