"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Motion imports ─── */
import {
  fadeUp,
  fadeScale,
  fadeIn,
  staggerContainer,
  staggerContainerSlow,
  slideInFromBottom,
  slideInFromRight,
  MotionButton,
  MotionCard,
  GlassCard,
  MotionListItem,
  AnimatedProgress,
  AnimatedCheck,
  PulseDot,
} from "@/components/motion-components";

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
   SCORE GAUGE — Animated SVG
   ────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Crítico";

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
          <motion.circle
            cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
          />
        </svg>
        <motion.span
          className="absolute text-3xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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
   HEALTH ROW
   ────────────────────────────────────────── */
function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <motion.span
        className={`flex items-center gap-1 ${ok ? "text-green-400" : "text-red-400"}`}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {ok ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          )}
        </svg>
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
  return (
    <motion.div
      className="mx-auto mt-10 max-w-3xl space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={fadeUp}><Skeleton className="h-16" /></motion.div>
      <motion.div className="flex gap-6" variants={fadeUp}>
        <Skeleton className="h-40 flex-1" />
        <Skeleton className="h-40 w-40" />
      </motion.div>
      <motion.div variants={fadeUp}><Skeleton className="h-32" /></motion.div>
      <div className="space-y-3">
        <motion.div variants={fadeUp}><Skeleton className="h-16" /></motion.div>
        <motion.div variants={fadeUp}><Skeleton className="h-16" /></motion.div>
        <motion.div variants={fadeUp}><Skeleton className="h-16" /></motion.div>
      </div>
      <motion.div variants={fadeUp}><Skeleton className="h-24" /></motion.div>
    </motion.div>
  );
}

/* ─── URGENCY MAP ─── */
const URGENCY_MAP = {
  critical: { bg: "border-red-500/20 bg-red-500/5", text: "text-red-400", icon: "🔴", title: "Prioridade Máxima" },
  warning: { bg: "border-amber-500/20 bg-amber-500/5", text: "text-amber-400", icon: "🟡", title: "Atenção" },
  ok: { bg: "border-green-500/20 bg-green-500/5", text: "text-green-400", icon: "🟢", title: "Bom Caminho" },
};

/* ─── PREMIUM EASE ─── */
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
    if (!leadData.name || !leadData.email || !leadData.whatsapp) return;

    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadData, company: result?.title, score: result?.score }),
      });
    } catch { /* silent */ }

    setShowConfirm(true);
    setTimeout(() => { setShowConfirm(false); setStep("result"); }, 1500);
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!dashboardRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#0a0a0b",
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
    setLeadData({ name: "", email: "", whatsapp: "" }); setShowConfirm(false);
  };

  /* ─── RENDER ─── */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ═════ HEADER ═════ */}
      <motion.header
        className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg"
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
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-card hover:border-primary/40 hover:text-primary"
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
              className="border-t border-border bg-card px-6 py-4 sm:hidden overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: PREMIUM_EASE }}
            >
              <div className="flex flex-col gap-4 text-sm">
                <a href="#como-funciona" onClick={() => setShowMenu(false)} className="text-muted hover:text-foreground">Como funciona</a>
                <a href="#beneficios" onClick={() => setShowMenu(false)} className="text-muted hover:text-foreground">Benefícios</a>
                <a href="#inicio" onClick={() => setShowMenu(false)} className="rounded-full border border-border px-4 py-2 text-center font-medium text-foreground hover:bg-card">Auditoria Grátis</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="flex flex-1 flex-col items-center px-6 pt-24 pb-16" id="inicio">
        <div className="mx-auto w-full max-w-2xl text-center">

          {/* ═════ STEP: INITIAL (Hero + Search) ═════ */}
          <AnimatePresence mode="wait">
            {step === "initial" && (
              <motion.div
                key="initial"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: SNAP_EASE } }}
                variants={staggerContainerSlow}
              >
                {/* Badge */}
                <motion.div
                  variants={fadeUp}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-muted shadow-glow-sm"
                >
                  <PulseDot color="#6366f1" size={6} />
                  Análise gratuita · Leva 30 segundos
                </motion.div>

                {/* H1 */}
                <motion.h1
                  variants={fadeUp}
                  className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
                >
                  A sua empresa está a{" "}
                  <span className="gradient-text">perder clientes no Google Maps</span>?
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  variants={fadeUp}
                  className="mt-4 text-base leading-relaxed text-muted sm:text-lg"
                >
                  Cole o link do Google Maps do seu negócio. Em segundos, a nossa inteligência artificial
                  analisa o seu perfil e mostra exatamente o que está a afastar potenciais clientes.
                </motion.p>

                {/* Search Form */}
                <motion.form
                  variants={fadeUp}
                  onSubmit={handleSearch}
                  className="mx-auto mt-10 max-w-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
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
                        className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/50 hover:border-muted-dim"
                      />
                    </div>
                    <MotionButton
                      type="submit"
                      disabled={!link.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-glow-sm"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Auditar Agora
                    </MotionButton>
                  </div>
                </motion.form>

                {/* Badges */}
                <motion.div
                  variants={fadeUp}
                  className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted"
                >
                  {["Análise por IA", "Comparativo com concorrentes", "Relatório em PDF"].map((text) => (
                    <motion.span
                      key={text}
                      className="flex items-center gap-1.5"
                      whileHover={{ scale: 1.05, color: "#fafafa" }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {text}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═════ STEP: LOADING ═════ */}
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

          {/* ═════ ERROR ═════ */}
          <AnimatePresence>
            {error && step !== "loading" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.35, ease: PREMIUM_EASE }}
                className="mx-auto mt-6 max-w-xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═════ STEP: LEAD CAPTURE ═════ */}
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
                <GlassCard glow className="p-8">
                  <motion.div
                    className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Relatório bloqueado
                  </motion.div>
                  <motion.h2
                    className="mt-4 text-xl font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    O seu relatório está pronto!
                  </motion.h2>
                  <motion.p
                    className="mt-2 text-sm text-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Insira os seus dados abaixo para desbloquear o dashboard completo com
                    pontuação, análise de concorrência e download em PDF.
                  </motion.p>
                  <form onSubmit={handleLeadSubmit} className="mt-6 space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <label className="mb-1 block text-xs font-medium text-muted">O seu nome</label>
                      <input
                        type="text" required value={leadData.name}
                        onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                        placeholder="João Silva"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/50 hover:border-muted-dim"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="mb-1 block text-xs font-medium text-muted">O seu e-mail</label>
                      <input
                        type="email" required value={leadData.email}
                        onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                        placeholder="joao@email.com"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/50 hover:border-muted-dim"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <label className="mb-1 block text-xs font-medium text-muted">O seu WhatsApp</label>
                      <input
                        type="tel" required value={leadData.whatsapp}
                        onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                        placeholder="+351 912 345 678"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted outline-none transition-all duration-300 focus:border-primary focus:ring-1 focus:ring-primary/50 hover:border-muted-dim"
                      />
                    </motion.div>
                    <MotionButton
                      type="submit"
                      disabled={!leadData.name || !leadData.email || !leadData.whatsapp}
                      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-glow-sm"
                    >
                      Desbloquear Relatório Completo
                    </MotionButton>
                    <p className="text-center text-[11px] text-muted">Prometemos não enviar spam. Os seus dados estão seguros.</p>
                  </form>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═════ CONFIRM POPUP ═════ */}
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
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-8 text-center">
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <AnimatedCheck size={32} color="#4ade80" />
                  </motion.div>
                  <motion.h3
                    className="text-lg font-bold text-green-400"
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

          {/* ═════ STEP: RESULT DASHBOARD ═════ */}
          <AnimatePresence mode="wait">
            {step === "result" && result && (
              <motion.div
                key="result"
                className="mx-auto mt-6 max-w-3xl text-left"
                ref={dashboardRef}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: 20 }}
                variants={staggerContainerSlow}
              >
                {/* Urgency Banner */}
                <motion.div
                  variants={fadeUp}
                  className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${urgency.bg}`}
                >
                  <motion.span
                    className="text-2xl"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
                  >
                    {urgency.icon}
                  </motion.span>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${urgency.text}`}>{urgency.title}</p>
                    <p className="text-xs text-muted">{result.leadImpact}</p>
                  </div>
                </motion.div>

                {/* Company Card */}
                <motion.div
                  variants={fadeScale}
                  className="mb-6 flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-8 sm:flex-row sm:justify-between shadow-card"
                >
                  <div className="text-center sm:text-left">
                    <motion.h2
                      className="text-lg font-semibold text-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {result.title}
                    </motion.h2>
                    <p className="mt-0.5 text-xs text-muted">{result.category}</p>
                    <motion.div
                      className="mt-2 flex items-center justify-center gap-1.5 text-2xl font-bold text-amber-400 sm:justify-start"
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

                {/* Health Card */}
                <GlassCard className="mb-6 p-6">
                  <motion.h3
                    className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    Saúde do Perfil
                  </motion.h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <HealthRow label="Fotografias no perfil" ok={result.health.hasPhotos} />
                    <HealthRow label="Horário de funcionamento" ok={result.health.hasOpeningHours} />
                    <HealthRow label="Categoria definida" ok={result.health.hasCategory} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Resposta a avaliações</span>
                      <span className={`text-sm font-medium ${result.health.responseRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {result.health.responseRate}%
                      </span>
                    </div>
                  </div>

                  {result.health.responseRate > 0 && (
                    <div className="mt-4">
                      <p className="mb-1 text-[11px] text-muted uppercase tracking-wider">Taxa de resposta</p>
                      <AnimatedProgress
                        value={result.health.responseRate}
                        color={result.health.responseRate >= 50 ? "#22c55e" : result.health.responseRate >= 25 ? "#eab308" : "#ef4444"}
                        duration={1.5}
                      />
                    </div>
                  )}

                  {result.missingProfileItems.length > 0 && (
                    <motion.div
                      className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Itens em falta</p>
                      <ul className="mt-1 space-y-1">
                        <AnimatePresence>
                          {result.missingProfileItems.map((item, i) => (
                            <motion.li
                              key={i}
                              className="flex items-start gap-2 text-xs text-amber-300"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + i * 0.1 }}
                            >
                              <span>⚠</span> {item}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </GlassCard>

                {/* Strengths */}
                {result.strengths.length > 0 && (
                  <motion.div className="mb-6" variants={fadeUp}>
                    <motion.h3
                      className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      ✓ Pontos Fortes
                    </motion.h3>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {result.strengths.map((item, i) => (
                          <MotionListItem key={i} index={i}>
                            <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 transition-colors hover:bg-green-500/10">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="text-sm leading-relaxed text-green-300">{item}</span>
                            </div>
                          </MotionListItem>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Improvements */}
                {result.improvements.length > 0 && (
                  <motion.div className="mb-6" variants={fadeUp}>
                    <motion.h3
                      className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      ⚠ Pontos Críticos
                    </motion.h3>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {result.improvements.map((item, i) => (
                          <MotionListItem key={i} index={i}>
                            <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 transition-colors hover:bg-red-500/10">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                              </span>
                              <span className="text-sm leading-relaxed text-red-300">{item}</span>
                            </div>
                          </MotionListItem>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Competitor Insights */}
                <GlassCard className="mb-6 p-6" glow>
                  <motion.h3
                    className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
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

                {/* Team Note */}
                <motion.div
                  variants={fadeUp}
                  className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <motion.span
                      className="text-lg"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, -10, 10, -5, 0] }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      💡
                    </motion.span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Nota da nossa equipa</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Estes dados foram processados por inteligência artificial, mas a estratégia de implementação
                        deve ser personalizada para o seu negócio. Recomendamos uma conversa com a nossa equipa
                        para delinear o plano ideal para si.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* CTA Actions */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <MotionButton
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-foreground disabled:opacity-50"
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
                    className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-glow-sm transition-all hover:brightness-110"
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

                <p className="mt-3 text-center text-[11px] text-muted">Fale connosco e implemente as correções ainda hoje.</p>

                <MotionButton
                  onClick={reset}
                  className="mt-6 w-full rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
                >
                  ← Auditar outro perfil
                </MotionButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ═════ COMO FUNCIONA ═════ */}
      <section id="como-funciona" className="border-t border-border px-6 py-20">
        <motion.div
          className="mx-auto max-w-5xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div
            variants={fadeUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted"
          >
            Passo a passo
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Como funciona a <span className="gradient-text">auditoria</span>
          </motion.h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { n: "01", t: "Cole o link", d: "Copie o URL do Google Maps da sua empresa e cole no campo acima. Não precisa de registo." },
              { n: "02", t: "IA analisa", d: "A nossa inteligência artificial examina as avaliações, fotografias, horários e reputação do seu perfil em segundos." },
              { n: "03", t: "Receba o relatório", d: "Descarregue o PDF completo com pontuação, pontos críticos, radar da concorrência e um plano de ação personalizado." },
            ].map((item, i) => (
              <MotionCard
                key={item.n}
                className="rounded-xl border border-border bg-card p-6 text-left gradient-border group shadow-card"
              >
                <motion.span
                  className="text-3xl font-bold gradient-text"
                  whileHover={{ scale: 1.1 }}
                >
                  {item.n}
                </motion.span>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═════ BENEFÍCIOS ═════ */}
      <section id="beneficios" className="border-t border-border px-6 py-20">
        <motion.div
          className="mx-auto max-w-5xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div
            variants={fadeUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted"
          >
            Por que auditar?
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            O que está em jogo no <span className="gradient-text">Google Maps</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base text-muted max-w-2xl mx-auto"
          >
            86% dos consumidores confiam em avaliações online tanto como em recomendações pessoais.
            Um perfil mal cuidado no Google Maps pode estar a custar-lhe dezenas de clientes por dia
            — que vão diretamente para os seus concorrentes.
          </motion.p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Aumente o Faturamento", d: "Negócios que respondem a avaliações facturam até 35% mais." },
              { t: "Domine o Bairro", d: "Perfis completos aparecem 3 vezes mais no mapa local." },
              { t: "Reputação Automática", d: "Saiba exatamente onde atuar para blindar a sua classificação." },
              { t: "Relatório Executivo", d: "Documento profissional para orientar as suas ações de marketing local." },
            ].map((b) => (
              <MotionCard
                key={b.t}
                className="rounded-xl border border-border bg-card p-5 text-left gradient-border group shadow-card"
              >
                <h3 className="text-sm font-bold text-foreground">{b.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{b.d}</p>
              </MotionCard>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═════ FOOTER ═════ */}
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-xs text-muted">
          <span>© 2026 {SAAS_NAME}. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="transition-colors hover:text-foreground">Privacidade</a>
            <a href="#" className="transition-colors hover:text-foreground">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
