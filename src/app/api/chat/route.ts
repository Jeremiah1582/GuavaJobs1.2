// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/db";
import { llm, MODEL_SMART } from "@/lib/llm";
import { randomUUID } from "crypto";
import { resumeTextForAI } from "@/lib/pdf-extract.server";

export async function GET() {
  try {
    const user = await requireAuth();
    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ messages });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to clear chat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { message } = await req.json();

    if (!message?.trim())
      return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const resume = await prisma.resume.findFirst({
      where: { userId: user.id, isActive: 1 },
    });

    const resumeContext = resume
      ? `The user has uploaded their resume (use all sections below, including later pages):
- Skills: ${JSON.parse(resume.skills).join(", ")}
- ATS Score: ${resume.atsScore}/100
- Summary: ${resume.summary ?? "Not provided"}
- Education: ${JSON.parse(resume.education).map((e: { degree: string; institution: string }) => `${e.degree} at ${e.institution}`).join("; ") || "Not specified"}
- Experience: ${JSON.parse(resume.experience).map((e: { title: string; company: string; duration: string }) => `${e.title} at ${e.company} (${e.duration})`).join("; ") || "Not specified"}
- Full resume text:
${resumeTextForAI(resume.rawText)}`
      : "The user has not uploaded a resume yet. Gently encourage them to upload one for personalized advice.";

    const systemPrompt = `You are InternHunt AI — an expert career advisor for students and early-career professionals seeking internships.

${resumeContext}

How you respond:
- Be practical, specific, and actionable
- Reference the user's actual skills when relevant
- Use **bold** for emphasis, numbered lists for steps
- Keep responses 150-300 words — comprehensive but concise
- Be encouraging but honest about skill gaps
- If asked about companies, provide real, useful insights`;

    const history = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    history.reverse();

    await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        role: "user",
        content: message.trim(),
      },
    });

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
              userId: user.id,
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
        "Connection": "keep-alive",
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    console.error("[chat]", err);
    return NextResponse.json({ error: "Chat failed. Please try again." }, { status: 500 });
  }
}
