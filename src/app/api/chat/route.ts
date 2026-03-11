// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { chatMessages, resumes } from "@/db/schema";
import { groq, MODEL_SMART } from "@/lib/groq";
import { and, eq, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// GET — load chat history
export async function GET() {
  try {
    const user = await requireAuth();
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, user.id),
      orderBy: [asc(chatMessages.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ messages });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}

// DELETE — clear all chat history for user
export async function DELETE() {
  try {
    const user = await requireAuth();
    await db.delete(chatMessages).where(eq(chatMessages.userId, user.id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to clear chat." }, { status: 500 });
  }
}

// POST — send message, stream response
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { message } = await req.json();

    if (!message?.trim())
      return NextResponse.json({ error: "Message is required." }, { status: 400 });

    // Get resume for context
    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.userId, user.id), eq(resumes.isActive, true)),
    });

    const resumeContext = resume
      ? `The user has uploaded their resume:
- Skills: ${JSON.parse(resume.skills).join(", ")}
- ATS Score: ${resume.atsScore}/100
- Summary: ${resume.summary ?? "Not provided"}
- Education: ${JSON.parse(resume.education).map((e: any) => `${e.degree} at ${e.institution}`).join("; ") || "Not specified"}`
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

    // Last 6 messages only — each message costs tokens, 20 is too many for free tier
    const history = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, user.id),
      orderBy: [desc(chatMessages.createdAt)],
      limit: 6,
    });
    history.reverse();

    // Save user message
    await db.insert(chatMessages).values({
      id: randomUUID(), userId: user.id, role: "user", content: message.trim(),
    });

    const groqMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];

    // Stream response back
    const stream = await groq.chat.completions.create({
      model: MODEL_SMART,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

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
          // Save completed assistant message
          await db.insert(chatMessages).values({
            id: randomUUID(), userId: user.id, role: "assistant", content: fullContent,
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
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    console.error("[chat]", err);
    return NextResponse.json({ error: "Chat failed. Please try again." }, { status: 500 });
  }
}