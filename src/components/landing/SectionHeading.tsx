"use client";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

export default function SectionHeading({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <ScrollReveal className="text-center mb-16">
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0px" }}
        whileInView={{ opacity: 1, letterSpacing: "4px" }}
        viewport={{ once: false, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="text-xs font-semibold uppercase text-accent mb-4"
      >
        {label}
      </motion.p>
      <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </ScrollReveal>
  );
}