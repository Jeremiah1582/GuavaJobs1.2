"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MagneticWrapper from "./MagneticWrapper";

export default function KineticHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(heroRef, { once: false, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textZ = useTransform(scrollYProgress, [0, 0.5], [0, 80]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const word = "Internship";
  const letters = word.split("");

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-20 preserve-3d">
      {/* Parallax background — next/image replaces <img src={heroBg.src}> */}
      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="absolute inset-0 z-0"
      >
        <motion.div
          className="absolute inset-0"
          style={{
            x: mousePos.x * 0.5,
            y: mousePos.y * 0.5,
          }}
        >
          {/*
            IMPORTANT: place your image at /public/assets/asset2.jpg
            next/image requires images to be in /public or a remote URL
          */}
          <Image
            src="/assets/asset2.jpg"
            alt=""
            fill
            priority
            className="object-cover opacity-100"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </motion.div>

      {/* Floating depth orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(30 55% 50% / 0.08), transparent)",
          x: mousePos.x * -0.8,
          y: mousePos.y * -0.8,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(30 60% 60% / 0.06), transparent)",
          x: mousePos.x * 1.2,
          y: mousePos.y * 1.2,
        }}
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        style={{ y: textY, z: textZ }}
        className="container mx-auto px-6 relative z-10 preserve-3d"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-fluid-hero font-bold tracking-tight mb-6"
          >
            Your AI-Powered
            <br />
            <span className="inline-flex">
              {letters.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40, rotateX: 90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5 + i * 0.04,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  whileHover={{ scale: 1.15, y: -4, transition: { duration: 0.15 } }}
                  className="text-mask-gradient inline-block"
                >
                  {letter}
                </motion.span>
              ))}{" "}
            </span>
            <motion.span
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              className="inline-block"
            >
              Partner
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-fluid-body text-muted-foreground max-w-xl mx-auto mb-10"
          >
            Resume analysis, smart matching, cover letters, interview prep — all powered by LLMs running 100% locally on your machine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <MagneticWrapper strength={0.25}>
              {/* next/link replaces useNavigate */}
              <Link href="/dashboard">
                <motion.span
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-glow text-base px-8 py-4 flex items-center justify-center gap-2 group"
                >
                  Start Hunting
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </motion.span>
              </Link>
            </MagneticWrapper>
            <MagneticWrapper strength={0.2}>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href="#features"
                className="px-8 py-4 rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors text-center inline-block"
              >
                Explore Features
              </motion.a>
            </MagneticWrapper>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-20"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-7 h-11 border-2 border-muted-foreground/25 rounded-full mx-auto flex justify-center pt-2.5"
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], scaleY: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-2 bg-accent rounded-full"
              />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[10px] text-muted-foreground/50 uppercase tracking-[3px] mt-3"
            >
              Scroll to explore
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}