"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import SectionHeading from "./SectionHeading";

const faqs = [
  {
    q: "Is InternHunt really free?",
    a: "Yes, 100% free. The AI runs locally on your machine using Groq's generous free tier. No subscriptions, no hidden costs.",
  },
  {
    q: "Is my resume data safe?",
    a: "Absolutely. Everything runs locally — your resume never leaves your computer. We don't store or transmit any personal data.",
  },
  {
    q: "How accurate is the job matching?",
    a: "Our LLM-powered matching achieves ~95% relevance accuracy by analyzing skills, experience level, location preferences, and job requirements in natural language.",
  },
  {
    q: "What file formats are supported?",
    a: "Currently we support PDF resumes. Upload your PDF and the AI extracts all relevant information automatically.",
  },
  {
    q: "Can I use it for full-time jobs too?",
    a: "InternHunt is optimized for internships, but the resume analysis, cover letter, and interview prep features work great for any job application.",
  },
];

function FAQItem({ faq, i }: { faq: (typeof faqs)[0]; i: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-20px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: i * 0.08 }}
      className="border-b border-border"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-display text-lg font-medium group-hover:text-accent transition-colors">
          {faq.q}
        </span>
        <span className="ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-secondary grid place-items-center">
          {open ? (
            <Minus className="w-4 h-4 text-accent" />
          ) : (
            <Plus className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-muted-foreground leading-relaxed pr-12">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <SectionHeading label="FAQ" title="Common Questions" />
        <div className="max-w-2xl mx-auto">
          {faqs.map((faq, i) => (
            <FAQItem key={faq.q} faq={faq} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}