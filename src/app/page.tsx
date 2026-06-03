"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, CheckCircle, FileText, Target, PenTool, MessageSquare } from "lucide-react";
import Link from "next/link";

import KineticHero from "@/components/landing/KineticHero";
import Marquee from "@/components/landing/Marquee";
import StickyFeatureShowcase from "@/components/landing/StickyFeatureShowcase";
import FAQSection from "@/components/landing/FAQSection";
import ScrollProgress from "@/components/landing/ScrollProgress";
import BentoCard from "@/components/landing/BentoCard";
import StepCard from "@/components/landing/StepCard";
import ScrollReveal from "@/components/landing/ScrollReveal";
import SectionHeading from "@/components/landing/SectionHeading";
import MagneticWrapper from "@/components/landing/MagneticWrapper";

const features = [
  {
    icon: FileText,
    title: "AI Resume Analyzer",
    desc: "Full analysis with improvement suggestions, missing skills detection, and ATS compatibility scoring.",
    detail: "Our AI reads your resume like a recruiter — flagging weak sections, suggesting power verbs, and scoring every bullet for impact.",
  },
  {
    icon: Target,
    title: "Smart Job Matcher",
    desc: "0–100% match score with detailed natural-language explanations for every scraped internship.",
    detail: "We analyze job descriptions against your profile using semantic understanding, not just keyword matching.",
  },
  {
    icon: PenTool,
    title: "Cover Letter Generator",
    desc: "One-click personalized, professional cover letters — download as PDF instantly.",
    detail: "Tailored to each specific role. Mirrors the company's tone and highlights your most relevant experiences.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    desc: '"Explain this role", "How to prepare", "Compare these offers" — your personal career advisor.',
    detail: "Powered by OpenRouter. Ask anything about your job search, interview prep, or career decisions.",
  },
];

const steps = [
  { step: "01", title: "Upload Resume", desc: "Drop your PDF — our AI extracts skills, experience, and strengths instantly." },
  { step: "02", title: "Get Matched", desc: "Every scraped internship receives a 0–100% match score with a detailed explanation." },
  { step: "03", title: "Apply Smarter", desc: "Generate cover letters, prep for interviews, and chat with your AI advisor." },
];

function Navbar() {
  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-[3px] left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg grid place-items-center">
            <span className="text-accent font-display text-lg font-semibold">I</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight kinetic-text">InternHunt</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors kinetic-text">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors kinetic-text">How it Works</a>
          <a href="#faq" className="hover:text-foreground transition-colors kinetic-text">FAQ</a>
        </div>
        <MagneticWrapper strength={0.3}>
          <Link href="/dashboard">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="btn-ink text-sm px-5 py-2.5 inline-flex items-center gap-1"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </MagneticWrapper>
      </div>
    </motion.nav>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <SectionHeading
          label="Features"
          title="Everything You Need"
          subtitle="Powerful AI tools designed to give you an unfair advantage in your internship search."
        />
        <div className="bento-grid max-w-4xl mx-auto">
          {features.map((f, i) => (
            <BentoCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} detail={f.detail} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -right-40 w-80 h-80 border border-accent/5 rounded-full" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-20 -left-20 w-60 h-60 border border-accent/5 rounded-full" />
      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <motion.p initial={{ opacity: 0, letterSpacing: "0px" }} whileInView={{ opacity: 1, letterSpacing: "4px" }}
            viewport={{ once: false, margin: "-80px" }} transition={{ duration: 0.8 }}
            className="text-xs font-semibold uppercase text-accent mb-4">
            How It Works
          </motion.p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Three Simple Steps</h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((item, i) => <StepCard key={item.step} item={item} i={i} />)}
        </div>
      </div>
    </section>
  );
}

function CTAAndFooter() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <>
      <div ref={ref} className="relative overflow-hidden py-24">
        <motion.div style={{ y: smoothY }} className="container mx-auto px-6">
          <ScrollReveal className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to Find Your<br />Perfect Internship?
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Join InternHunt today. Open the dashboard and start hunting — no sign-in required.
            </p>
            <MagneticWrapper>
              <Link href="/dashboard">
                <motion.span whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="btn-ink text-lg px-10 py-5 inline-flex items-center gap-3 mx-auto">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
            </MagneticWrapper>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
              {["100% Free", "Runs Locally", "No Data Shared"].map((t, i) => (
                <ScrollReveal key={t} delay={i * 0.1} direction="up">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-accent" /> {t}
                  </span>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </motion.div>
      </div>

      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md grid place-items-center">
              <span className="text-accent font-display text-sm font-semibold">I</span>
            </div>
            <span className="font-display text-sm font-semibold">InternHunt</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 InternHunt. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <ScrollProgress />
      <Navbar />
      <KineticHero />
      <Marquee />
      <FeaturesSection />
      <StickyFeatureShowcase />
      <HowItWorks />
      <FAQSection />
      <CTAAndFooter />
    </div>
  );
}