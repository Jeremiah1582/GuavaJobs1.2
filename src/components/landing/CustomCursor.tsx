"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const currentPos = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number>(0);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Detect touch on client only (fixes SSR mismatch)
  useEffect(() => {
    setIsTouch("ontouchstart" in window);
  }, []);

  const animate = useCallback(() => {
    const dx = pos.current.x - currentPos.current.x;
    const dy = pos.current.y - currentPos.current.y;
    currentPos.current.x += dx * 0.18;
    currentPos.current.y += dy * 0.18;

    if (cursorRef.current) {
      cursorRef.current.style.left = `${currentPos.current.x}px`;
      cursorRef.current.style.top = `${currentPos.current.y}px`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };
    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);
    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);
    rafRef.current = requestAnimationFrame(animate);

    const attachHover = () => {
      document.querySelectorAll("a, button, [role='button'], input, textarea, select, label, .clickable")
        .forEach((el) => {
          el.addEventListener("mouseenter", () => setHovering(true));
          el.addEventListener("mouseleave", () => setHovering(false));
        });
    };
    attachHover();
    const observer = new MutationObserver(attachHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [animate, visible, isTouch]);

  // Don't render on touch devices
  if (isTouch) return null;

  return (
    <>
      <style>{`
        * { cursor: none !important; }

        .c-arrow {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 100000;
          will-change: left, top;
          transition: opacity 0.25s ease;
        }

        .c-arrow.hidden { opacity: 0; }

        .c-arrow svg {
          display: block;
          transform-origin: 3px 3px;
          transition:
            transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94),
            filter 0.2s ease;
        }

        .c-arrow.hovering svg {
          transform: scale(1.2);
          filter: drop-shadow(0 4px 12px rgba(200, 100, 30, 0.6));
        }

        .c-arrow.clicking svg {
          transform: scale(0.85);
          filter: brightness(1.3);
        }
      `}</style>

      <div
        ref={cursorRef}
        className={`c-arrow ${hovering ? "hovering" : ""} ${clicking ? "clicking" : ""} ${!visible ? "hidden" : ""}`}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cursor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(38, 90%, 58%)" />
              <stop offset="100%" stopColor="hsl(20, 85%, 48%)" />
            </linearGradient>
            <linearGradient id="cursor-grad-hover" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(42, 95%, 65%)" />
              <stop offset="100%" stopColor="hsl(25, 90%, 55%)" />
            </linearGradient>
          </defs>
          <path
            d="M3 3 L28 14 L17 17 L14 28 Z"
            fill={hovering ? "url(#cursor-grad-hover)" : "url(#cursor-grad)"}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}