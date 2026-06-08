"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

/* ==============================================================
   MOTION COMPONENTS — Reutilizáveis para todo o projeto
   ============================================================== */

/* Motion Personality: PREMIUM
   - Durations: 350-600ms
   - Easing: cubic-bezier(0.4,0,0.2,1) — smooth, decelerating
   - Overshoot: 0% — elegant, no bounce
*/

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;
const SNAP_EASE = [0.2, 0, 0, 1] as const;
const BOUNCE_EASE = [0.175, 0.885, 0.32, 1.275] as const;

/* ────────────────── VARIANTS ────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: PREMIUM_EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: PREMIUM_EASE },
  },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: PREMIUM_EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.25, ease: SNAP_EASE },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: PREMIUM_EASE },
  },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: PREMIUM_EASE },
  },
};

/* ────────────────── WRAPPERS ────────────────── */

interface MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function MotionFadeUp({ children, className = "", delay = 0 }: MotionProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function MotionScale({ children, className = "", delay = 0 }: MotionProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeScale}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  className = "",
  slow = false,
}: MotionProps & { slow?: boolean }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={slow ? staggerContainerSlow : staggerContainer}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────── BUTTONS ────────────────── */

export function MotionButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: SNAP_EASE }}
    >
      {children}
    </motion.button>
  );
}

/* ────────────────── CARDS ────────────────── */

export function MotionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeScale}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────── LIST ITEM ────────────────── */

export function MotionListItem({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        ease: PREMIUM_EASE,
        delay: index * 0.08,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────── PROGRESS BAR ────────────────── */

export function AnimatedProgress({
  value,
  color = "#6366f1",
  height = 8,
  duration = 1.2,
}: {
  value: number;
  color?: string;
  height?: number;
  duration?: number;
}) {
  return (
    <div className="w-full rounded-full bg-border/60 overflow-hidden" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration, ease: PREMIUM_EASE }}
      />
    </div>
  );
}

/* ────────────────── PULSE DOT ────────────────── */

export function PulseDot({ color = "#6366f1", size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}

/* ────────────────── CHECK ANIMATION ────────────────── */

export function AnimatedCheck({ size = 32, color = "#4ade80" }: { size?: number; color?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: PREMIUM_EASE }}
      />
      <motion.path
        d="M8 12l2.5 2.5L16 9"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: PREMIUM_EASE, delay: 0.3 }}
      />
    </motion.svg>
  );
}

/* ────────────────── GLASS CARD ────────────────── */

export function GlassCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl ${glow ? "shadow-glow" : ""} ${className}`}
      initial="hidden"
      animate="visible"
      variants={fadeScale}
      whileHover={{
        borderColor: "rgba(99,102,241,0.3)",
        transition: { duration: 0.25 },
      }}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        </div>
      )}
      {children}
    </motion.div>
  );
}

/* ────────────────── NUMBER COUNTER ────────────────── */

export function AnimatedNumber({
  value,
  duration = 1.5,
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {value}{suffix}
      </motion.span>
    </motion.span>
  );
}
