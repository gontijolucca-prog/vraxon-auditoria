"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Motion imports ─── */
import {
  fadeUp,
  fadeScale,
  staggerContainer,
  staggerContainerSlow,
  MotionButton,
  MotionCard,
  GlassCard,
  MotionListItem,
  AnimatedProgress,
  AnimatedCheck,
  PulseDot,
} from "@/components/motion-components";
import FooterSection from "@/components/FooterSection";

/* ─── Types ─── */
type ResultData = {
  title: string;
  rating: string;
  totalReviews: string;
  category: string;
  score: number;
  strengths: string[];
  improvements: string[];
  health: {
    hasPhotos: boolean;
    hasOpeningHours: boolean;
    hasCategory: boolean;
    responseRate: number;
  };
  missingProfileItems: string[];
  competitorInsights: string;
  leadImpact: string;
  recommendationUrgency: "critical" | "warning" | "ok";
};

type Step = "initial" | "loading" | "lead" | "result";

const SAAS_NAME = "VRAXON";
const SAAS_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "351913752933";

/* ─── Cache ─── */
const resultCache = new Map<string, ResultData>();

/* ──────────────────────────────────────────
   BACKGROUND — grid sutil, sem orbs
   ────────────────────────────────────────── */
function PageBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Grid limpo */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)`,
        backgroundSize: '64px 64px'
      }} />
      {/* Topo com gradiente muito suave */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.06] blur-[100px] rounded-full" />
      {/* Linha horizontal fina no topo */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}

/* ──────────────────────────────────────────
   SCORE GAUGE — Animated SVG com glow
   ────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";
  const glowColor = score >= 70 ? "rgba(52,211,153,0.25)" : score >= 40 ? "rgba(251,191,36,0.25)" : "rgba(248,113,113,0.25)";
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Crítico";

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
    >
      <div className="relative flex h-36 w-36 items-center justify-center">
        <div className="absolute inset-2 rounded-full blur-2xl" style={{ background: glowColor }} />
        <svg className="h-36 w-36 -rotate-90 relative z-10" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#2a2a35" strokeWidth="6" />
          <motion.circle
            cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          />
        </svg>
        <motion.span
          className="absolute z-20 text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        >
          {score}
        </motion.span>
      </div>
      <motion.span
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   HEALTH ROW — com ícones coloridos
   ────────────────────────────────────────── */
function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted">{label}</span>
      <motion.span
        className={`flex items-center gap-1.5 font-medium ${ok ? "text-success-bright" : "text-danger-bright"}`}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        {ok ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bright/10 border border-success-bright/20">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-bright/10 border border-danger-bright/20">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        {ok ? "Ok" : "Em falta"}
      </motion.span>
    </div>
  );
}

/* ──────────────────────────────────────────
   SKELETON
   ────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className ?? ""}`} />;
}

function DashboardSkeleton() {
  const steps = [
    "A analisar o perfil no Google Maps...",
    "A comparar concorrentes da região...",
    "A calcular pontuação de reputação...",
    "A gerar insights personalizados...",
    "Quase lá! A preparar o relatório...",
  ];
  const [stepIndex, setStepIndex] = useState(0);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="mx-auto mt-10 max-w-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-10">
        {/* Spinner animado */}
        <motion.div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </motion.div>

        <motion.p
          key={stepIndex}
          className="text-sm font-medium text-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {steps[stepIndex]}
        </motion.p>

        {/* Barra de progresso */}
        <div className="mx-auto w-48 h-1.5 rounded-full bg-border/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-muted-dim mt-3">
          {Math.round(progress)}% · leva ~30 segundos
        </p>
      </div>

      {/* Skeleton preview */}
      <div className="space-y-4">
        <Skeleton className="h-14" />
        <div className="flex gap-4">
          <Skeleton className="h-36 flex-1" />
          <Skeleton className="h-36 w-36" />
        </div>
        <Skeleton className="h-28" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   FAQ ITEM — Accordion animado
   ────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
      >
        {q}
        <svg
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: PREMIUM_EASE }}
          >
            <div className="px-5 pb-4 text-sm text-muted leading-relaxed border-t border-border/50">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────
   LEAD MAGNET SECTION
   ────────────────────────────────────────── */
function LeadMagnetSection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Pedido de guia", email: email.trim(), whatsapp: "—", company: "Guia 5 erros" }),
      });
    } catch { /* silent */ }
    setTimeout(() => setSent(false), 3000);
    setEmail("");
  };
  return (
    <section className="relative px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />
      <motion.div
        className="mx-auto max-w-2xl text-center relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainerSlow}
      >
        <motion.div variants={fadeUp} className="mb-4 section-label">
          Guia Gratuito
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Os <span className="gradient-text">5 erros mais comuns</span> no Google Maps
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-5 text-base text-muted-dim max-w-xl mx-auto leading-relaxed"
        >
          Receba o nosso guia rápido com os 5 erros mais comuns que as empresas cometem no Google Maps — e como corrigi-los hoje mesmo.
        </motion.p>
        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          className="mx-auto mt-8 max-w-md flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="O seu melhor e-mail"
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 shadow-inner-light"
          />
          <MotionButton
            type="submit"
            className="rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-glow-sm btn-gradient"
          >
            {sent ? "Enviado!" : "Receber guia grátis"}
          </MotionButton>
        </motion.form>
        <p className="mt-4 text-[11px] text-muted-dim">Zero spam. Pode cancelar a qualquer momento.</p>
      </motion.div>
    </section>
  );
}

/* ─── URGENCY MAP — SVG icons consistency ─── */
function UrgencyIcon({ type }: { type: "critical" | "warning" | "ok" }) {
  const circleColor = type === "critical" ? "#f87171" : type === "warning" ? "#fbbf24" : "#34d399";
  const iconColor = "#0f172a";
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill={circleColor} />
      {type === "critical" ? (
        <>
          <line x1="11" y1="11" x2="21" y2="21" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="21" y1="11" x2="11" y2="21" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : type === "warning" ? (
        <>
          <line x1="16" y1="10" x2="16" y2="17" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="21" r="1.5" fill={iconColor} />
        </>
      ) : (
        <polyline points="9,17 13,21 23,11" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
    </svg>
  );
}

const URGENCY_MAP = {
  critical: { bg: "border-danger-bright/25 bg-danger-subtle", text: "text-danger-bright", title: "Prioridade Máxima" },
  warning: { bg: "border-warning-bright/25 bg-warning-subtle", text: "text-warning-bright", title: "Atenção Necessária" },
  ok: { bg: "border-success-bright/25 bg-success-subtle", text: "text-success-bright", title: "Bom Caminho" },
};
const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;
const SNAP_EASE = [0.2, 0, 0, 1] as const;

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function Home() {
  const [link, setLink] = useState("");
  const [step, setStep] = useState<Step>("initial");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [leadData, setLeadData] = useState({ name: "", email: "", whatsapp: "" });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  /* ─── Handlers ─── */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;

    const cached = resultCache.get(link.trim());
    if (cached) {
      setResult(cached);
      setStep("lead");
      return;
    }

    setStep("loading");
    setError("");

    try {
      const res = await fetch("/api/auditoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: link.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro"); setStep("initial"); return; }
      resultCache.set(link.trim(), data);
      setResult(data);
      setStep("lead");
    } catch {
      setError("Erro de ligação. Tente novamente.");
      setStep("initial");
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadData.name || !leadData.email || !leadData.whatsapp || !consent) return;

    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadData, company: result?.title, score: result?.score }),
      });
      (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "Lead");
    } catch { /* silent */ }

    setShowConfirm(true);
    setTimeout(() => { setShowConfirm(false); setStep("result"); }, 1500);
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!dashboardRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#0b0b10",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      pdf.setFontSize(16);
      pdf.setTextColor(99, 102, 241);
      pdf.text("Auditoria de Visibilidade Digital", 14, 16);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(result?.title ? `Empresa: ${result.title}` : "", 14, 23);
      pdf.setDrawColor(99, 102, 241);
      pdf.setLineWidth(0.5);
      pdf.line(14, 27, pageW - 14, 27);

      let y = 34;
      if (imgH + y + 20 > pageH) {
        const ratio = (pageH - y - 20) / imgH;
        pdf.addImage(imgData, "PNG", 0, y, pageW, imgH * ratio);
      } else {
        pdf.addImage(imgData, "PNG", 0, y, pageW, imgH);
      }

      const footerY = pageH - 16;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(14, footerY - 4, pageW - 14, footerY - 4);
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Relatório Gerado por ${SAAS_NAME} – Especialistas em Posicionamento Local. Contacto: ${SAAS_WHATSAPP}`, 14, footerY + 2);

      pdf.save(`Auditoria-${result?.title?.slice(0, 20) || "Maps"}.pdf`);
    } catch { /* */ }
    setPdfLoading(false);
  }, [result]);

  const whatsappLink = () => {
    const msg = encodeURIComponent(
      "Olá! Acabei de analisar o relatório da minha empresa e gostava de perceber como podemos melhorar o nosso ranking no Google Maps. Podemos falar?"
    );
    return `https://wa.me/${SAAS_WHATSAPP}?text=${msg}`;
  };

  const urgency = result ? URGENCY_MAP[result.recommendationUrgency] : URGENCY_MAP.warning;

  const reset = () => {
    setStep("initial"); setResult(null); setLink(""); setError("");
    setLeadData({ name: "", email: "", whatsapp: "" }); setShowConfirm(false); setConsent(false);
  };

  /* ─── RENDER ─── */
  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <PageBackground />

      {/* ═════ HEADER ═════ */}
      <motion.header
        className="fixed top-0 z-50 w-full border-b border-border/50 glass"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: PREMIUM_EASE }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <motion.a
            href="#inicio"
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Image src="/vraxon-logo.png" alt={SAAS_NAME} width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-foreground">{SAAS_NAME}</span>
          </motion.a>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <motion.a href="#como-funciona" className="transition-colors hover:text-foreground" whileHover={{ y: -1 }}>Como funciona</motion.a>
            <motion.a href="#beneficios" className="transition-colors hover:text-foreground" whileHover={{ y: -1 }}>Benefícios</motion.a>
            <motion.a
              href="#inicio"
              className="rounded-full border border-border-light bg-card/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-card hover:border-primary/40 hover:text-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Auditoria Grátis
            </motion.a>
          </nav>
          <button onClick={() => setShowMenu(!showMenu)} className="flex sm:hidden text-muted hover:text-foreground">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="border-t border-border/50 bg-card/95 backdrop-blur-xl px-6 py-4 sm:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: PREMIUM_EASE }}
            >
              <div className="flex flex-col gap-4 text-sm">
                <a href="#como-funciona" onClick={() => setShowMenu(false)} className="text-muted hover:text-foreground">Como funciona</a>
                <a href="#beneficios" onClick={() => setShowMenu(false)} className="text-muted hover:text-foreground">Benefícios</a>
                <a href="#inicio" onClick={() => setShowMenu(false)} className="rounded-full border border-border-light bg-card/50 px-4 py-2 text-center font-medium text-foreground hover:bg-card">Auditoria Grátis</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="flex flex-1 flex-col items-center px-6 pt-28 pb-20 relative z-10" id="inicio">
        <div className="mx-auto w-full max-w-2xl text-center">

          <AnimatePresence mode="wait">
            {step === "initial" && (
              <motion.div
                key="initial"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: SNAP_EASE } }}
                variants={staggerContainerSlow}
                className="relative"
              >
                <motion.div
                  variants={fadeUp}
                  className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-light bg-card/70 backdrop-blur-sm px-4 py-2 text-xs font-medium text-muted shadow-glow-sm"
                >
                  <PulseDot color="#6366f1" size={7} />
                  Análise gratuita · Leva 30 segundos
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl glow-text"
                >
                  A sua empresa está a{" "}
                  <span className="gradient-text">perder clientes no Google Maps</span>?
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mt-5 text-base leading-relaxed text-muted sm:text-lg max-w-xl mx-auto"
                >
                  Cole o link do Google Maps do seu negócio. Em segundos, a nossa inteligência artificial
                  analisa o seu perfil e mostra exatamente o que está a afastar potenciais clientes.
                </motion.p>

                <motion.form
                  variants={fadeUp}
                  onSubmit={handleSearch}
                  className="mx-auto mt-12 max-w-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1 group">
                      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted group-focus-within:text-primary transition-colors">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        placeholder="Link do Google Maps, pesquisa ou nome do seu negócio"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card py-4 pl-11 pr-4 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-border-light shadow-inner-light"
                      />
                    </div>
                    <MotionButton
                      type="submit"
                      disabled={!link.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-glow-sm btn-gradient"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Auditar Agora
                    </MotionButton>
                  </div>
                </motion.form>

                <motion.div
                  variants={fadeUp}
                  className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-dim"
                >
                  {["Análise por IA", "Comparativo com concorrentes", "Relatório em PDF"].map((text) => (
                    <motion.span
                      key={text}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/30"
                      whileHover={{ scale: 1.05, borderColor: "rgba(99,102,241,0.3)", color: "#f2f2f5" }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {text}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DashboardSkeleton />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && step !== "loading" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.35, ease: PREMIUM_EASE }}
                className="mx-auto mt-6 max-w-xl rounded-xl border border-danger-bright/25 bg-danger-subtle px-5 py-4 text-sm text-danger-bright"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === "lead" && result && !showConfirm && (
              <motion.div
                key="lead"
                className="mx-auto mt-10 max-w-lg text-left"
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: PREMIUM_EASE }}
              >
                <GlassCard glow className="p-8 card-shine">
                  <motion.div
                    className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider border border-primary/20"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Relatório bloqueado
                  </motion.div>
                  <motion.h2
                    className="mt-4 text-2xl font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    O seu relatório está pronto!
                  </motion.h2>
                  <motion.p
                    className="mt-2 text-sm text-muted leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Insira os seus dados abaixo para desbloquear o dashboard completo com
                    pontuação, análise de concorrência e download em PDF.
                  </motion.p>
                  <form onSubmit={handleLeadSubmit} className="mt-8 space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <label className="mb-1.5 block text-xs font-medium text-muted">O seu nome</label>
                      <input
                        type="text" required value={leadData.name}
                        onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                        placeholder="João Silva"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-border-light shadow-inner-light"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="mb-1.5 block text-xs font-medium text-muted">O seu e-mail</label>
                      <input
                        type="email" required value={leadData.email}
                        onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                        placeholder="joao@email.com"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-border-light shadow-inner-light"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <label className="mb-1.5 block text-xs font-medium text-muted">O seu WhatsApp</label>
                      <input
                        type="tel" required value={leadData.whatsapp}
                        onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                        placeholder="+351 912 345 678"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-border-light shadow-inner-light"
                      />
                    </motion.div>
                    <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-muted-dim cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-background accent-primary"
                      />
                      <span>
                        Autorizo o contacto da equipa {SAAS_NAME} e o tratamento dos meus dados para
                        este efeito, nos termos da{" "}
                        <a href="/privacidade" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary-hover">
                          Política de Privacidade
                        </a>.
                      </span>
                    </label>
                    <MotionButton
                      type="submit"
                      disabled={!leadData.name || !leadData.email || !leadData.whatsapp || !consent}
                      className="w-full rounded-xl bg-primary py-4 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-glow-sm btn-gradient"
                    >
                      Desbloquear Relatório Completo
                    </MotionButton>
                    <p className="text-center text-[11px] text-muted-dim">Sem spam. Pode pedir a remoção dos dados a qualquer momento.</p>
                  </form>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showConfirm && (
              <motion.div
                key="confirm"
                className="mx-auto mt-10 max-w-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: PREMIUM_EASE }}
              >
                <div className="rounded-xl border border-success-bright/25 bg-success-subtle p-8 text-center">
                  <motion.div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-bright/15 border border-success-bright/25"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <AnimatedCheck size={32} color="#34d399" />
                  </motion.div>
                  <motion.h3
                    className="text-lg font-bold text-success-bright"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Relatório desbloqueado!
                  </motion.h3>
                  <motion.p
                    className="mt-2 text-sm text-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    Receberá um e-mail com o resumo da auditoria.
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === "result" && result && (
              <motion.div
                key="result"
                className="mx-auto mt-8 max-w-3xl text-left"
                ref={dashboardRef}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: 20 }}
                variants={staggerContainerSlow}
              >
                <motion.div
                  variants={fadeUp}
                  className={`mb-6 flex items-center gap-4 rounded-xl border p-5 ${urgency.bg}`}
                >
                  <motion.span
                    className="flex-shrink-0"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
                  >
                    <UrgencyIcon type={result.recommendationUrgency} />
                  </motion.span>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${urgency.text}`}>{urgency.title}</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{result.leadImpact}</p>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeScale}
                  className="mb-6 flex flex-col items-center gap-8 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:justify-between card-shine shadow-card"
                >
                  <div className="text-center sm:text-left">
                    <motion.h2
                      className="text-xl font-semibold text-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {result.title}
                    </motion.h2>
                    <p className="mt-1 text-xs text-muted-dim uppercase tracking-wider">{result.category}</p>
                    <motion.div
                      className="mt-3 flex items-center justify-center gap-1.5 text-2xl font-bold text-warning-bright sm:justify-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                    >
                      {result.rating}
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-normal text-muted ml-1">({result.totalReviews} avaliações)</span>
                    </motion.div>
                  </div>
                  <ScoreGauge score={result.score} />
                </motion.div>

                <GlassCard className="mb-6 p-6 card-shine shadow-card">
                  <motion.h3
                    className="mb-5 text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                      <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Saúde do Perfil
                  </motion.h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <HealthRow label="Fotografias no perfil" ok={result.health.hasPhotos} />
                    <HealthRow label="Horário de funcionamento" ok={result.health.hasOpeningHours} />
                    <HealthRow label="Categoria definida" ok={result.health.hasCategory} />
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted">Resposta a avaliações</span>
                      <span className={`text-sm font-medium ${result.health.responseRate >= 50 ? "text-success-bright" : "text-danger-bright"}`}>
                        {result.health.responseRate}%
                      </span>
                    </div>
                  </div>

                  {result.health.responseRate > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-[11px] text-muted uppercase tracking-wider">Taxa de resposta</p>
                      <AnimatedProgress
                        value={result.health.responseRate}
                        color={result.health.responseRate >= 50 ? "#34d399" : result.health.responseRate >= 25 ? "#fbbf24" : "#f87171"}
                        duration={1.5}
                      />
                    </div>
                  )}

                  {result.missingProfileItems.length > 0 && (
                    <motion.div
                      className="mt-5 rounded-lg border border-warning-bright/25 bg-warning-subtle p-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-xs font-semibold text-warning-bright uppercase tracking-wider flex items-center gap-2">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        Itens em falta
                      </p>
                      <ul className="mt-2 space-y-2">
                        <AnimatePresence>
                          {result.missingProfileItems.map((item, i) => (
                            <motion.li
                              key={i}
                              className="flex items-start gap-2 text-xs text-warning-bright/90"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + i * 0.1 }}
                            >
                              <span className="mt-0.5 text-warning-bright">•</span> {item}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </GlassCard>

                {result.strengths.length > 0 && (
                  <motion.div className="mb-6" variants={fadeUp}>
                    <motion.h3
                      className="mb-4 text-sm font-semibold uppercase tracking-wider text-success-bright flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-success-bright/10">
                        <svg className="h-3.5 w-3.5 text-success-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      Pontos Fortes
                    </motion.h3>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {result.strengths.map((item, i) => (
                          <MotionListItem key={i} index={i}>
                            <div className="flex items-start gap-3 rounded-xl border border-success-bright/20 bg-success-subtle p-4 transition-all hover:bg-success-bright/10 hover:border-success-bright/30 card-shine">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-bright/15 border border-success-bright/25">
                                <svg className="h-3.5 w-3.5 text-success-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="text-sm leading-relaxed text-success-bright/90">{item}</span>
                            </div>
                          </MotionListItem>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {result.improvements.length > 0 && (
                  <motion.div className="mb-6" variants={fadeUp}>
                    <motion.h3
                      className="mb-4 text-sm font-semibold uppercase tracking-wider text-danger-bright flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-danger-bright/10">
                        <svg className="h-3.5 w-3.5 text-danger-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </span>
                      Pontos Críticos
                    </motion.h3>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {result.improvements.map((item, i) => (
                          <MotionListItem key={i} index={i}>
                            <div className="flex items-start gap-3 rounded-xl border border-danger-bright/20 bg-danger-subtle p-4 transition-all hover:bg-danger-bright/10 hover:border-danger-bright/30 card-shine">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger-bright/15 border border-danger-bright/25">
                                <svg className="h-3.5 w-3.5 text-danger-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                              </span>
                              <span className="text-sm leading-relaxed text-danger-bright/90">{item}</span>
                            </div>
                          </MotionListItem>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                <GlassCard className="mb-6 p-6 card-shine shadow-card" glow>
                  <motion.h3
                    className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                      <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    Radar da Concorrência
                  </motion.h3>
                  <motion.p
                    className="mt-2 text-sm leading-relaxed text-muted whitespace-pre-line"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    {result.competitorInsights}
                  </motion.p>
                </GlassCard>

                <motion.div
                  variants={fadeUp}
                  className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card card-shine"
                >
                  <div className="flex items-start gap-4">
                    <motion.span
                      className="text-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 p-2 rounded-xl"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, -10, 10, -5, 0] }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </motion.span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Nota da nossa equipa</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-dim">
                        Estes dados foram processados por inteligência artificial, mas a estratégia de implementação
                        deve ser personalizada para o seu negócio. Recomendamos uma conversa com a nossa equipa
                        para delinear o plano ideal para si.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <MotionButton
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-card px-5 py-3.5 text-sm font-medium text-muted transition-all hover:bg-card-hover hover:text-foreground disabled:opacity-50 shadow-inner-light"
                  >
                    {pdfLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        A gerar PDF...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Baixar PDF
                      </>
                    )}
                  </MotionButton>

                  <motion.a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:brightness-110"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Quero melhorar o meu ranking
                    <motion.svg
                      className="h-4 w-4"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      initial={{ x: 0 }}
                      whileHover={{ x: 3 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </motion.svg>
                  </motion.a>
                </motion.div>

                <p className="mt-4 text-center text-[11px] text-muted-dim">Fale connosco e implemente as correções ainda hoje.</p>

                <MotionButton
                  onClick={reset}
                  className="mt-8 w-full rounded-xl border border-border-light bg-card/50 px-5 py-3 text-sm font-medium text-muted transition-all hover:bg-card hover:text-foreground"
                >
                  ← Auditar outro perfil
                </MotionButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="divider-glow" />

      {/* ═════ PROVA SOCIAL ═════ */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {[
              { n: "100%", l: "Auditoria gratuita" },
              { n: "86%", l: "dos clientes leem avaliações" },
              { n: "35%", l: "mais receita com respostas" },
              { n: "3x", l: "mais visibilidade no mapa" },
            ].map((stat) => (
              <motion.div
                key={stat.n}
                variants={fadeUp}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                  {stat.n}
                </p>
                <p className="text-xs text-muted-dim mt-2 leading-relaxed">
                  {stat.l}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="divider-glow" />

      {/* ═════ FAQ ═════ */}
      <section id="faq" className="relative px-6 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent pointer-events-none" />
        <motion.div
          className="mx-auto max-w-3xl relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div variants={fadeUp} className="mb-4 section-label text-center mx-auto table">
            Perguntas Frequentes
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl glow-text text-center">
            Dúvidas <span className="gradient-text">comuns</span>
          </motion.h2>
          <motion.div variants={fadeUp} className="mt-12 space-y-3">
            <FaqItem
              q="A auditoria é realmente gratuita?"
              a="Sim. A análise do seu perfil no Google Maps é 100% gratuita e sem compromisso. Só pedimos o contacto para enviar o relatório completo e o plano de ação."
            />
            <FaqItem
              q="Preciso dar acesso à minha conta Google?"
              a="Não. Basta colar o URL público do seu perfil no Google Maps. Não pedimos palavras-passe nem acesso à sua conta."
            />
            <FaqItem
              q="Quanto tempo demora a análise?"
              a="Normalmente entre 20 e 40 segundos, dependendo do número de avaliações."
            />
            <FaqItem
              q="O que acontece depois de receber o PDF?"
              a="Fica com o relatório para usar como quiser. Se quiser ajuda para implementar as correções, a nossa equipa está disponível — sem obrigação."
            />
            <FaqItem
              q="Os meus dados estão seguros?"
              a="Sim. Usamos encriptação SSL, não vendemos dados a terceiros, e cumprimos o RGPD. Consulte a nossa Política de Privacidade para mais detalhes."
            />
            <FaqItem
              q="Posso analisar o perfil de um concorrente?"
              a="Sim, porque os dados do Google Maps são públicos. No entanto, o relatório é desenhado para o proprietário do perfil — os insights são acionáveis para quem pode mudar o perfil."
            />
          </motion.div>
        </motion.div>
      </section>

      <div className="divider-glow" />

      <LeadMagnetSection />

      <div className="divider-glow" />

      <section id="como-funciona" className="relative px-6 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
        <motion.div
          className="mx-auto max-w-5xl text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div
            variants={fadeUp}
            className="mb-4 section-label"
          >
            Passo a passo
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl glow-text"
          >
            Como funciona a <span className="gradient-text">auditoria</span>
          </motion.h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              { n: "01", t: "Cole o link", d: "Copie o URL do Google Maps da sua empresa e cole no campo acima. Não precisa de registo." },
              { n: "02", t: "IA analisa", d: "A nossa inteligência artificial examina as avaliações, fotografias, horários e reputação do seu perfil em segundos." },
              { n: "03", t: "Receba o relatório", d: "Descarregue o PDF completo com pontuação, pontos críticos, radar da concorrência e um plano de ação personalizado." },
            ].map((item) => (
              <MotionCard
                key={item.n}
                className="rounded-2xl border border-border bg-card p-7 text-left group transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.35)]"
              >
                <motion.span
                  className="text-4xl font-bold gradient-text"
                  whileHover={{ scale: 1.1 }}
                >
                  {item.n}
                </motion.span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-dim">{item.d}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      <div className="divider-glow" />

      <section id="beneficios" className="relative px-6 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.02] to-transparent pointer-events-none" />
        <motion.div
          className="mx-auto max-w-5xl text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div
            variants={fadeUp}
            className="mb-4 section-label"
          >
            Por que auditar?
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl glow-text"
          >
            O que está em jogo no <span className="gradient-text">Google Maps</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 text-base text-muted-dim max-w-2xl mx-auto leading-relaxed"
          >
            86% dos consumidores confiam em avaliações online tanto como em recomendações pessoais.
            Um perfil mal cuidado no Google Maps pode estar a custar-lhe dezenas de clientes por dia
            — que vão diretamente para os seus concorrentes.
          </motion.p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Aumente o Faturamento", d: "Negócios que respondem a avaliações facturam até 35% mais." },
              { t: "Domine o Bairro", d: "Perfis completos aparecem 3 vezes mais no mapa local." },
              { t: "Reputação Automática", d: "Saiba exatamente onde atuar para blindar a sua classificação." },
              { t: "Relatório Executivo", d: "Documento profissional para orientar as suas ações de marketing local." },
            ].map((b) => (
              <MotionCard
                key={b.t}
                className="rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.35)]"
              >
                <h3 className="text-sm font-bold text-foreground">{b.t}</h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-dim">{b.d}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      <FooterSection />
    </div>
  );
}
