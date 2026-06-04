// src/app/api/jobs/[id]/save/route.ts — persist job id + source (+ snapshot)
import { NextRequest, NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { randomUUID } from "crypto";
import {
  cacheRowToSnapshot,
  getCachedJobForUser,
  type JobSnapshot,
} from "@/lib/jobs-api";

type SaveBody = {
  snapshot?: JobSnapshot;
  source?: string;
};

function decodeJobId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;
    const { id: rawId } = await params;
    const jobExternalId = decodeJobId(rawId);

    if (!jobExternalId) {
      return NextResponse.json({ error: "Job id is required." }, { status: 400 });
    }

    let body: SaveBody = {};
    try {
      body = (await req.json()) as SaveBody;
    } catch {
      /* empty body is fine when job is in cache */
    }

    const existing = await prisma.savedJob.findFirst({
      where: { userId, jobExternalId },
    });

    if (existing) {
      await prisma.savedJob.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false, jobId: jobExternalId });
    }

    const cached = await getCachedJobForUser(userId, jobExternalId);
    const snapshot =
      cached != null
        ? cacheRowToSnapshot(cached)
        : body.snapshot?.title && body.snapshot?.company
          ? body.snapshot
          : null;

    if (!snapshot) {
      return NextResponse.json(
        {
          error:
            "Job not in cache. Scan jobs first, then save — or retry from the jobs list.",
        },
        { status: 404 },
      );
    }

    await prisma.savedJob.create({
      data: {
        id: randomUUID(),
        userId,
        jobExternalId,
        source: cached?.source ?? body.source ?? snapshot.source ?? "Unknown",
        snapshot: JSON.stringify(snapshot),
      },
    });

    return NextResponse.json({ saved: true, jobId: jobExternalId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs/save]", err);
    return NextResponse.json({ error: "Failed to save job." }, { status: 500 });
  }
}
