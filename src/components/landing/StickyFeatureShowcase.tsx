"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

const panels = [
  {
    title: "Upload & Analyze",
    desc: "Drop your resume and let AI dissect every line — skills, experience gaps, ATS compatibility, and concrete improvement suggestions.",
    /*
      IMPORTANT: place your images in /public/assets/
        illustration-resume.jpg  → /public/assets/illustration-resume.jpg
        illustration-matching.jpg → /public/assets/illustration-matching.jpg
    */
    image: "/assets/illustration-resume.jpg",
    features: ["Skill Extraction", "ATS Scoring", "Gap Analysis", "Improvement Tips"],
  },
  {
    title: "Match & Discover",
    desc: "Every scraped internship gets a 0–100% match score with a detailed natural-language explanation.",
    image: "/assets/illustration-matching.jpg",
    features: ["Smart Scoring", "NLP Explanations", "Role Comparison", "Fit Analysis"],
  },
];

function StickyPanel({ panel, index }: { panel: (typeof panels)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const z = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [-100, 0, 0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [100, 0, 0, -60]);
  const imgScale = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0.85, 1, 1, 0.9]);
  const imgRotateY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [index % 2 === 0 ? 8 : -8, 0, 0, index % 2 === 0 ? -4 : 4]
  );
  const featureOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);
  const featureY = useTransform(scrollYProgress, [0.2, 0.4], [20, 0]);

  const isReversed = index % 2 !== 0;

  return (
    <div ref={ref} className="min-h-[90vh] flex items-center py-20 preserve-3d">
      <motion.div
        style={{ opacity, y, z }}
        className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center"
      >
        <div className={`space-y-6 ${isReversed ? "md:order-2" : ""}`}>
          <motion.span
            style={{ opacity: featureOpacity }}
            className="text-xs font-semibold tracking-[4px] uppercase text-accent inline-block"
          >
            0{index + 1} — Deep Dive
          </motion.span>
          <h3 className="font-display text-fluid-section font-bold tracking-tight leading-tight">
            {panel.title}
          </h3>
          <p className="text-muted-foreground text-fluid-body max-w-md">
            {panel.desc}
          </p>

          <motion.div
            style={{ opacity: featureOpacity, y: featureY }}
            className="flex flex-wrap gap-2 pt-2"
          >
            {panel.features.map((feat) => (
              <span
                key={feat}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20"
              >
                {feat}
              </span>
            ))}
          </motion.div>

          <div className="h-1 w-16 bg-accent rounded-full" />
        </div>

        {/* next/image replaces <img src={panel.image.src}> */}
        <motion.div
          style={{ scale: imgScale, rotateY: imgRotateY }}
          className={`relative ${isReversed ? "md:order-1" : ""}`}
        >
          <div className="absolute -inset-4 bg-gradient-to-br from-accent/10 via-transparent to-amber-light/10 rounded-3xl blur-2xl -z-10" />
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border">
            <Image
              src={panel.image}
              alt={panel.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function StickyFeatureShowcase() {
  return (
    <section className="py-12 preserve-3d">
      {panels.map((panel, i) => (
        <StickyPanel key={panel.title} panel={panel} index={i} />
      ))}
    </section>
  );
}