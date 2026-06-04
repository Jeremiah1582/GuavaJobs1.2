// src/app/api/jobs/[id]/apply/route.ts — track applied job id + source only
import { NextRequest, NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { randomUUID } from "crypto";
import { getCachedJobForUser } from "@/lib/jobs-api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;
    const { id: jobExternalId } = await params;

    const existing = await prisma.appliedJob.findFirst({
      where: { userId, jobExternalId },
    });

    if (existing) {
      await prisma.appliedJob.delete({ where: { id: existing.id } });
      return NextResponse.json({ applied: false });
    }

    const cached = await getCachedJobForUser(userId, jobExternalId);
    if (!cached) {
      return NextResponse.json(
        { error: "Job not in cache. Scan jobs first." },
        { status: 404 },
      );
    }

    await prisma.appliedJob.create({
      data: {
        id: randomUUID(),
        userId,
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
