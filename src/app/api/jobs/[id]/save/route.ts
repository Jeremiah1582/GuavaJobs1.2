// src/app/api/jobs/[id]/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { savedJobs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: jobId } = await params;

    const existing = await db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId)),
    });

    if (existing) {
      await db.delete(savedJobs).where(eq(savedJobs.id, existing.id));
      return NextResponse.json({ saved: false });
    }

    await db.insert(savedJobs).values({ id: randomUUID(), userId: user.id, jobId });
    return NextResponse.json({ saved: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}