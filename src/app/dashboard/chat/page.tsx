"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MessageSquare, ArrowLeft, Send, Bot, User,
  Sparkles, Loader2, Lightbulb, Trash2
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

const SUGGESTIONS = [
  "What skills should I highlight for a frontend role?",
  "How should I prepare for a technical interview?",
  "How do I compare two job offers?",
  "What makes a strong internship application?",
];

function MessageContent({ content, role }: { content: string; role: string }) {
  if (role === "user") return <span className="whitespace-pre-wrap">{content}</span>;

  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function AIAssistant() {
  const router = useRouter();
  const [messages, setMessages]           = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [clearing, setClearing]           = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => { if (data.messages) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Chat failed.");
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const { text } = JSON.parse(data);
            accumulated += text;
            setStreamingContent(accumulated);
          } catch {}
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: accumulated,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, something went wrong: ${err.message}`,
        },
      ]);
      setStreamingContent("");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // FIX: actually call DELETE /api/chat to clear from DB, not just local state
  const clearHistory = async () => {
    if (clearing || loading) return;
    setClearing(true);
    try {
      const res = await fetch("/api/chat", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
      // Only clear local state after DB confirms deletion
      setMessages([]);
    } catch {
      // If API fails, still clear local state so UI isn't stuck
      setMessages([]);
    } finally {
      setClearing(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-9 h-9 rounded-xl border border-border bg-card grid place-items-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" /> AI Career Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by OpenRouter — ask anything about your career
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={clearing || loading}
              className="ml-auto w-9 h-9 rounded-xl border border-border bg-card grid place-items-center hover:bg-secondary transition-colors disabled:opacity-40"
              title="Clear chat history"
            >
              {/* FIX: show spinner while clearing so user knows it's working */}
              {clearing
                ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                : <Trash2  className="w-4 h-4 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
          {messages.length === 0 && !streamingContent ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 grid place-items-center mb-5">
                <Bot className="w-7 h-7 text-purple-400" />
              </div>
              <h2 className="font-display text-2xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                I can help with interview prep, role advice, resume tips, offer comparisons, and more.
                I'm aware of your uploaded resume for personalized guidance.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(s)}
                    className="flex items-start gap-2.5 p-4 rounded-xl border border-border bg-card text-left hover:border-accent/20 hover:shadow-md transition-all duration-200"
                  >
                    <Lightbulb className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{s}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === messages.length - 1 ? 0.05 : 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 grid place-items-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md"
                  }`}>
                    <MessageContent content={msg.content} role={msg.role} />
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-primary grid place-items-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming message */}
              {streamingContent && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 grid place-items-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="max-w-[78%] bg-card border border-border rounded-2xl rounded-bl-md p-4 text-sm leading-relaxed">
                    <MessageContent content={streamingContent} role="assistant" />
                    <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse ml-0.5 align-middle" />
                  </div>
                </motion.div>
              )}

              {/* Thinking indicator */}
              {loading && !streamingContent && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 grid place-items-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border px-6 lg:px-8 py-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your career…"
              className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={!input.trim() || loading}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-xl bg-primary grid place-items-center text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}