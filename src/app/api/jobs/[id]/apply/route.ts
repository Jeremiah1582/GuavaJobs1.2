// src/app/api/jobs/[id]/apply/route.ts — track applied job id + source only
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/db";
import { randomUUID } from "crypto";
import { getCachedJobForUser } from "@/lib/jobs-api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id: jobExternalId } = await params;

    const existing = await prisma.appliedJob.findFirst({
      where: { userId: user.id, jobExternalId },
    });

    if (existing) {
      await prisma.appliedJob.delete({ where: { id: existing.id } });
      return NextResponse.json({ applied: false });
    }

    const cached = await getCachedJobForUser(user.id, jobExternalId);
    if (!cached) {
      return NextResponse.json(
        { error: "Job not in cache. Scan jobs first." },
        { status: 404 },
      );
    }

    await prisma.appliedJob.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        jobExternalId,
        source: cached.source,
      },
    });

    return NextResponse.json({ applied: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
