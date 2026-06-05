// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { llm, MODEL_SMART } from "@/lib/llm";
import { randomUUID } from "crypto";
import { toEpochMsNumber } from "@/lib/epoch-ms";
import { resumeTextForAI } from "@/lib/pdf-extract.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({
      messages: messages.map((m) => ({
        ...m,
        createdAt: toEpochMsNumber(m.createdAt),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await prisma.chatMessage.deleteMany({ where: { userId: session.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear chat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;
    const { message } = await req.json();

    if (!message?.trim())
      return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: 1 },
    });

    const history = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        userId,
        role: "user",
        content: message.trim(),
      },
    });

    const resumeContext = resume
      ? `Resume summary: ${resume.summary ?? ""}\nSkills: ${resume.skills}\nText excerpt: ${resumeTextForAI(resume.rawText, 1500)}`
      : "No resume uploaded yet.";

    const systemPrompt = `You are InternHunt, a friendly career coach for students seeking internships.
Be concise, practical, and encouraging. Use the candidate's resume when relevant.
${resumeContext}`;

    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message.trim() },
    ];

    const stream = (await llm.chat.completions.create({
      model: MODEL_SMART,
      messages: llmMessages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    })) as AsyncIterable<{
      choices: Array<{ delta?: { content?: string } }>;
    }>;

    let fullContent = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          await prisma.chatMessage.create({
            data: {
              id: randomUUID(),
              userId,
              role: "assistant",
              content: fullContent,
            },
          });
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Chat failed. Please try again." }, { status: 500 });
  }
}
