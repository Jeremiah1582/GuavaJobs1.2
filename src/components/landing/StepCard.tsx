"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

function AnimatedStep({ step, isInView }: { step: string; isInView: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
      animate={isInView ? { scale: 1, opacity: 1, rotateY: 0 } : { scale: 0.5, opacity: 0, rotateY: 90 }}
      transition={{ duration: 0.6 }}
      className="font-display text-7xl font-bold text-accent/20 mb-4"
    >
      {step}
    </motion.div>
  );
}

export default function StepCard({ item, i }: { item: { step: string; title: string; desc: string }; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      transition={{ duration: 0.6, delay: i * 0.15 }}
      className="text-center"
    >
      <AnimatedStep step={item.step} isInView={isInView} />
      <motion.h3
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.5, delay: i * 0.15 + 0.2 }}
        className="font-display text-2xl font-semibold mb-3 kinetic-text"
      >
        {item.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: i * 0.15 + 0.35 }}
        className="text-primary-foreground/70 leading-relaxed text-fluid-body"
      >
        {item.desc}
      </motion.p>
    </motion.div>
  );
}