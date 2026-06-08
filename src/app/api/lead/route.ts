import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const TO_EMAIL = process.env.LEAD_EMAIL_TO || "ruben_frazao98@outlook.pt";
// Remetente: precisa de domínio verificado no Resend p/ enviar a leads externos.
// Em sandbox (onboarding@resend.dev) só chega ao dono da conta.
const FROM = process.env.LEAD_FROM_EMAIL || "VRAXON <onboarding@resend.dev>";

// Escapa HTML para não partir/injetar nos emails.
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, whatsapp, company, score } = body;

    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Email inválido." }, { status: 400 });
    }

    console.log("=== NOVO LEAD VRAXON ===");
    console.log(JSON.stringify(body, null, 2));

    if (resend) {
      // Envios independentes: o aviso ao dono não pode falhar só porque o
      // auto-reply ao lead foi recusado (ex.: domínio ainda não verificado).
      const sends: Promise<unknown>[] = [];

      // Email para o dono do SaaS
      sends.push(resend.emails.send({
        from: FROM,
        to: [TO_EMAIL],
        subject: `Novo Lead – ${esc(name)} (${esc(company) || "sem empresa"})`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#6366f1">Novo Lead — VRAXON</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666">Nome</td><td style="padding:8px 0;font-weight:600">${esc(name)}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0;color:#666">WhatsApp</td><td style="padding:8px 0">${esc(whatsapp)}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Empresa</td><td style="padding:8px 0;font-weight:600">${esc(company) || "—"}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Score</td><td style="padding:8px 0;font-weight:600">${esc(score) || "—"}/100</td></tr>
            </table>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#999">VRAXON — Especialistas em Posicionamento Local</p>
          </div>
        `,
      }));

      // Email automático de follow-up para o lead
      sends.push(resend.emails.send({
        from: FROM,
        to: [email],
        subject: `O seu relatório VRAXON está pronto — ${esc(company) || "obrigado pelo seu interesse"}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">
            <div style="text-align:center;margin-bottom:24px">
              <h1 style="color:#6366f1;font-size:24px;margin:0">VRAXON</h1>
              <p style="color:#999;font-size:12px">Especialistas em Posicionamento Local</p>
            </div>
            <p style="font-size:14px;color:#333">Olá <strong>${esc(name)}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.6">
              Obrigado por utilizar a nossa ferramenta de auditoria. O relatório da sua empresa
              <strong>${esc(company)}</strong> já foi gerado com uma pontuação de <strong>${esc(score) || "—"}/100</strong>.
            </p>
            <p style="font-size:14px;color:#555;line-height:1.6">
              A nossa equipa está disponível para analisar os resultados consigo e delinear
              um plano de ação personalizado para melhorar o seu posicionamento no Google Maps.
            </p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || "351913752933"}?text=Olá!%20Recebi%20o%20relatório%20VRAXON%20e%20quero%20saber%20mais." 
                 style="display:inline-block;background:#25D366;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                Falar com a equipa no WhatsApp
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:11px;color:#999;text-align:center">
              VRAXON — Especialistas em Posicionamento Local<br/>
              Contacto: ${process.env.NEXT_PUBLIC_WHATSAPP || "351913752933"}
            </p>
          </div>
        `,
      }));

      await Promise.allSettled(sends);
    }

    const WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL;
    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, timestamp: new Date().toISOString(), source: "vraxon" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}