"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, Mail, Shield, Zap, Sparkles } from "lucide-react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  // FIX: use authClient SDK — handles cookies, baseURL, and headers automatically
  const sendOTP = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) throw new Error(error.message ?? "Failed to send code. Try again.");
      setStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // FIX: use authClient SDK — it sets the session cookie correctly via Better Auth
  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await authClient.signIn.emailOtp({
        email,
        otp: code,
      });
      if (error) throw new Error(error.message ?? "Invalid code. Please try again.");
      if (data?.user) {
        localStorage.setItem("internhunt_user", JSON.stringify(data.user));
      }
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) verifyOTP();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const next = [...otp];
      pasted.split("").forEach((char, i) => { if (i < 6) next[i] = char; });
      setOtp(next);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden bg-primary">
        <Image src="/assets/login-pattern.jpg" alt="" fill className="object-cover" sizes="44vw" priority />

        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(hsl(40 33% 94%) 1px, transparent 1px), linear-gradient(90deg, hsl(40 33% 94%) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(30 55% 50%) 0%, transparent 70%)", filter: "blur(40px)" }}
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(30 55% 50%) 0%, transparent 70%)", filter: "blur(50px)" }}
          />
          {[
            { cls: "top-[12%] left-[8%] w-16 h-16 rounded-2xl border border-accent/20", delay: 0, dur: 7 },
            { cls: "top-[30%] right-[10%] w-10 h-10 rounded-full bg-accent/10", delay: 1, dur: 6 },
            { cls: "top-[55%] left-[15%] w-8 h-8 rotate-45 border border-accent/15", delay: 0.5, dur: 8 },
            { cls: "bottom-[20%] right-[8%] w-14 h-14 rounded-xl border border-primary-foreground/10", delay: 1.5, dur: 7 },
          ].map((s, i) => (
            <motion.div
              key={i} className={`absolute ${s.cls}`}
              animate={{ y: [0, -14, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground w-full">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl grid place-items-center">
              <span className="text-primary font-display text-xl font-bold">I</span>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">InternHunt</span>
          </motion.div>

          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
              <p className="text-xs font-semibold tracking-[3px] uppercase text-accent mb-4">AI-Powered Job Search</p>
              <h2 className="font-display text-4xl font-bold leading-[1.15] mb-6">
                Land your dream<br />internship with<br />
                <span className="text-accent">AI precision.</span>
              </h2>
            </motion.div>

            <div className="space-y-3">
              {[
                { icon: Shield,   text: "100% local — your data never leaves your machine" },
                { icon: Zap,      text: "AI-powered matching with 95% accuracy" },
                { icon: Sparkles, text: "One-click cover letters and interview prep" },
              ].map((item, i) => (
                <motion.div key={item.text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12 }}
                  className="flex items-center gap-3 text-sm text-primary-foreground/75">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 grid place-items-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-accent" />
                  </div>
                  {item.text}
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 grid place-items-center">
                  <span className="text-accent text-sm font-bold font-display">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Abhinav S.</p>
                  <p className="text-xs text-primary-foreground/50">SWE Intern @ Stripe</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-accent">94% match</p>
                </div>
              </div>
              <p className="text-xs text-primary-foreground/60 leading-relaxed italic">
                InternHunt matched me to this role in seconds. The cover letter it generated got me the interview.
              </p>
            </motion.div>
          </div>

          <p className="text-xs text-primary-foreground/30">© 2026 InternHunt. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 60% 40%, hsl(30 55% 50% / 0.04) 0%, transparent 70%)",
        }} />

        <div className="w-full max-w-[420px] relative">

          <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-3 mb-10 lg:hidden hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-primary rounded-xl grid place-items-center">
              <span className="text-accent font-display text-lg font-semibold">I</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">InternHunt</span>
          </motion.button>

          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => router.push("/")}
            className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </motion.button>

          {/* Step progress */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <motion.div key={i}
                animate={{
                  width: i === stepIndex ? 32 : 8,
                  backgroundColor: i < stepIndex ? "hsl(30 15% 8%)" : i === stepIndex ? "hsl(30 55% 50%)" : "hsl(35 18% 82%)",
                }}
                transition={{ duration: 0.4 }}
                className="h-1.5 rounded-full"
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {step === "email" ? "Step 1 of 2" : step === "otp" ? "Step 2 of 2" : "Done"}
            </span>
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-xl shadow-black/5 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_100%]"
              style={{ animation: "gradient-x 3s ease infinite" }} />

            <div className="p-8 md:p-10">
              <AnimatePresence mode="wait">

                {/* ── Email step ── */}
                {step === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}>
                    <div className="mb-7">
                      <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
                        <Mail className="w-5 h-5 text-accent" />
                      </div>
                      <h1 className="font-display text-2xl font-semibold mb-1.5">Welcome back.</h1>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Enter your email — we'll send a one-time code. No password needed.
                      </p>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 mb-5">
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                          <input
                            type="email" placeholder="you@example.com" value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-all text-sm"
                          />
                        </div>
                      </div>
                      <button onClick={sendOTP} disabled={loading} className="btn-ink w-full flex items-center justify-center gap-2 py-3.5">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</> : <>Send Login Code <span className="text-accent">→</span></>}
                      </button>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
                      By continuing, you agree to our{" "}
                      <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">Terms</span>
                      {" "}and{" "}
                      <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>.
                    </p>
                  </motion.div>
                )}

                {/* ── OTP step ── */}
                {step === "otp" && (
                  <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}>
                    <div className="mb-7">
                      <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
                        <Shield className="w-5 h-5 text-accent" />
                      </div>
                      <h1 className="font-display text-2xl font-semibold mb-1.5">Check your inbox.</h1>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                      </p>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 mb-5">
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">Verification code</label>
                        <div className="flex gap-2" onPaste={handleOtpPaste}>
                          {otp.map((digit, i) => (
                            <motion.input
                              key={i}
                              ref={(el) => { inputRefs.current[i] = el; }}
                              type="text" inputMode="numeric" maxLength={1} value={digit}
                              onChange={(e) => handleOtpChange(i, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e)}
                              autoFocus={i === 0}
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className={`w-0 flex-1 min-w-0 aspect-square max-h-[56px] text-center font-display text-xl font-bold border rounded-xl bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all ${
                                digit ? "border-accent/60 bg-accent/5 text-foreground" : "border-border text-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button onClick={verifyOTP} disabled={loading || otp.join("").length < 6}
                        className="btn-ink w-full flex items-center justify-center gap-2 py-3.5">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Verify & Sign In <span className="text-accent">→</span></>}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-5 text-sm">
                      <button onClick={() => { setStep("email"); setError(""); setOtp(["","","","","",""]); }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Different email
                      </button>
                      <div className="text-muted-foreground">
                        {resendTimer > 0 ? (
                          <span>Resend in {resendTimer}s</span>
                        ) : (
                          <button onClick={sendOTP} className="text-accent font-medium hover:text-accent/80 transition-colors">Resend code</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Success step ── */}
                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                    className="text-center py-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
                      className="w-20 h-20 bg-primary rounded-2xl grid place-items-center mx-auto mb-6 shadow-lg">
                      <CheckCircle className="w-10 h-10 text-accent" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <p className="text-xs font-semibold tracking-[3px] uppercase text-accent mb-2">Signed In</p>
                      <h1 className="font-display text-3xl font-semibold mb-2">You're in.</h1>
                      <p className="text-sm text-muted-foreground mb-7">Welcome to InternHunt. Redirecting to your dashboard…</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                      className="inline-flex items-center gap-2.5 bg-secondary border border-border rounded-full px-4 py-2.5">
                      <div className="w-8 h-8 bg-primary rounded-full grid place-items-center flex-shrink-0">
                        <span className="text-accent font-display text-sm font-semibold">{email[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium">{email}</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex justify-center gap-1.5 mt-6">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i}
                          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
                          className="w-1.5 h-1.5 rounded-full bg-accent"
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>

          {step === "email" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-6">
              New here?{" "}
              <span className="text-foreground font-medium">Just enter your email above — we'll create your account automatically.</span>
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}