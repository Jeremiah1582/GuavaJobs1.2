"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface BentoCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  detail: string;
  index: number;
}

export default function BentoCard({ icon: Icon, title, desc, detail, index }: BentoCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-60px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: 8 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, rotateX: 0 }
          : { opacity: 0, y: 50, rotateX: 8 }
      }
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bento-item hover-reveal p-6 md:p-8 flex flex-col justify-between"
      style={{ perspective: "800px" }}
    >
      {/* Ambient glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          background: isHovered
            ? "radial-gradient(circle at 50% 50%, hsl(30 55% 50% / 0.08), transparent 70%)"
            : "radial-gradient(circle at 50% 50%, transparent, transparent)",
        }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative z-10">
        <motion.div
          animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
          className="w-12 h-12 bg-accent/10 rounded-xl grid place-items-center mb-5"
        >
          <Icon className="w-6 h-6 text-accent" />
        </motion.div>

        <h3 className="font-display text-xl font-semibold mb-2 kinetic-text">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

        <div className="reveal-content mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{detail}</p>
        </div>
      </div>

      {/* Corner accent */}
      <motion.div
        className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none"
        animate={{
          opacity: isHovered ? 0.15 : 0.05,
        }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-full h-full bg-gradient-to-tl from-accent to-transparent rounded-tl-full" />
      </motion.div>
    </motion.div>
  );
}