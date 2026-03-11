"use client";
import { motion } from "framer-motion";

const items = [
  "AI Resume Analysis",
  "Deep Resume Parsing",
  "ATS Score Optimization",
  "Intelligent Job Matching",
  "AI-Powered Cover Letters",
  "24/7 Career Chatbot",
  "Automated Internship Scraping",
  "Cross-Platform Opportunity Aggregation",
  "Skill Detection & Gap Analysis",
  "Real-Time Alerts",
  "Application Tracking",
  "PDF Resume Export",
];

export default function Marquee() {
  return (
    <div className="py-6 border-y border-border overflow-hidden bg-secondary/50">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="flex gap-8 whitespace-nowrap"
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-sm font-medium text-muted-foreground flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}