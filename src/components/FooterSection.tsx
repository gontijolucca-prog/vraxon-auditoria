"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainerSlow } from "./motion-components";
import Image from "next/image";

export default function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 relative z-10 bg-background">
      {/* Newsletter / CTA */}
      <div className="border-b border-border/30">
        <motion.div
          className="mx-auto max-w-6xl px-6 py-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainerSlow}
        >
          <motion.div
            variants={fadeUp}
            className="mb-4 section-label"
          >
            Vamos crescer juntos
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-2xl font-bold tracking-tight sm:text-3xl glow-text"
          >
            Pronto para <span className="gradient-text">dominar o Google Maps</span>?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-sm text-muted-dim max-w-xl mx-auto leading-relaxed"
          >
            Fale connosco e descubra como podemos ajudar a sua empresa a aparecer 
            no topo das pesquisas locais.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8">
            <a
              href={`https://wa.me/351913752933?text=${encodeURIComponent("Olá! Quero saber mais sobre como melhorar o meu ranking no Google Maps.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-all"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar com a equipa
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/vraxon-logo.png" alt="VRAXON" width={28} height={28} className="rounded-lg" />
              <span className="text-base font-bold text-foreground">VRAXON</span>
            </div>
            <p className="text-sm text-muted-dim leading-relaxed">
              Especialistas em posicionamento local e SEO para Google Maps. 
              Auditoria gratuita com IA e plano de ação personalizado.
            </p>
          </div>

          {/* Contactos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-5">Contactos</h4>
            <div className="space-y-3 text-sm">
              <a
                href={`https://wa.me/351913752933`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-muted-dim hover:text-foreground transition-colors"
              >
                <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                +351 913 752 933
              </a>
              <a
                href="mailto:ola@vraxon.pt"
                className="flex items-center gap-2.5 text-muted-dim hover:text-foreground transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ola@vraxon.pt
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-5">Plataforma</h4>
            <div className="space-y-3 text-sm">
              <a href="#inicio" className="block text-muted-dim hover:text-foreground transition-colors">
                Auditoria Grátis
              </a>
              <a href="#como-funciona" className="block text-muted-dim hover:text-foreground transition-colors">
                Como funciona
              </a>
              <a href="#beneficios" className="block text-muted-dim hover:text-foreground transition-colors">
                Benefícios
              </a>
              <a href="#faq" className="block text-muted-dim hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-5">Legal</h4>
            <div className="space-y-3 text-sm">
              <a href="/privacidade" className="block text-muted-dim hover:text-foreground transition-colors">
                Política de Privacidade
              </a>
              <a href="/termos" className="block text-muted-dim hover:text-foreground transition-colors">
                Termos e Condições
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/30">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-xs text-muted-dim">
          <span>© {currentYear} VRAXON. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/351913752933`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a href="/privacidade" className="transition-colors hover:text-foreground">Privacidade</a>
            <a href="/termos" className="transition-colors hover:text-foreground">Termos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
