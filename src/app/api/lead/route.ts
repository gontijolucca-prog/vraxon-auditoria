import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Destino do aviso: email geral da PontoFinal + cópia para a caixa que já recebe.
// (geral@pontofinal.site ainda está a ser ligado — o cc garante que o lead não se perde.)
const TO_EMAIL = process.env.LEAD_EMAIL_TO || "geral@pontofinal.site";
const CC_EMAIL = process.env.LEAD_EMAIL_CC || "pontofinalsite@gmail.com";
// Remetente: domínio pontofinal.site já verificado no Resend.
const FROM = process.env.LEAD_FROM_EMAIL || "Diagnóstico PontoFinal <diagnostico@pontofinal.site>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://diagnostico.pontofinal.site";
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "351915136439";
const GUIDE_URL = `${SITE_URL}/guia-5-erros-google-maps.pdf`;

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

    const isGuide = String(company) === "Guia 5 erros";

    console.log("=== NOVO LEAD — Diagnóstico PontoFinal ===");
    console.log(JSON.stringify(body, null, 2));

    if (resend) {
      // Envios independentes: o aviso à equipa não pode falhar só porque o
      // auto-reply ao lead foi recusado (ex.: caixa do lead a rejeitar).
      const sends: Promise<unknown>[] = [];

      // 1) Aviso para a equipa PontoFinal
      sends.push(resend.emails.send({
        from: FROM,
        to: [TO_EMAIL],
        cc: CC_EMAIL ? [CC_EMAIL] : undefined,
        replyTo: email,
        subject: `Novo lead${isGuide ? " (guia)" : ""} — ${esc(name)} (${esc(company) || "sem empresa"})`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#ff2a2a">Novo lead — Diagnóstico PontoFinal</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666">Nome</td><td style="padding:8px 0;font-weight:600">${esc(name)}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0;color:#666">WhatsApp</td><td style="padding:8px 0">${esc(whatsapp)}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Empresa</td><td style="padding:8px 0;font-weight:600">${esc(company) || "—"}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Pontuação</td><td style="padding:8px 0;font-weight:600">${esc(score) || "—"}/100</td></tr>
            </table>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#999">Diagnóstico PontoFinal · pontofinal.site</p>
          </div>
        `,
      }));

      // 2) Resposta automática para o lead (com o guia em anexo)
      sends.push(resend.emails.send({
        from: FROM,
        to: [email],
        subject: isGuide
          ? "O seu guia: 5 erros no Google Maps"
          : `O seu diagnóstico está pronto — ${esc(company) || "obrigado pelo seu interesse"}`,
        attachments: [{ filename: "guia-5-erros-google-maps.pdf", path: GUIDE_URL }],
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto">
            <div style="background:#050505;padding:20px 24px;margin-bottom:24px">
              <span style="color:#fff;font-size:22px;font-weight:800">PontoFinal<span style="color:#ff2a2a">.</span></span>
              <div style="color:#bbb;font-size:11px;letter-spacing:1px;margin-top:4px">DIAGNÓSTICO · GOOGLE MAPS</div>
            </div>
            <p style="font-size:14px;color:#333">Olá <strong>${esc(name)}</strong>,</p>
            ${isGuide ? `
            <p style="font-size:14px;color:#555;line-height:1.6">
              Aqui está o seu guia <strong>"5 erros no Google Maps"</strong> em anexo.
              São os erros mais comuns nos perfis de negócios locais — e como corrigir cada um sem gastar dinheiro.
            </p>` : `
            <p style="font-size:14px;color:#555;line-height:1.6">
              Obrigado por usar o nosso diagnóstico. O perfil da sua empresa
              <strong>${esc(company)}</strong> foi analisado com uma pontuação de <strong>${esc(score) || "—"}/100</strong>.
              Em anexo segue também o nosso guia com os 5 erros mais comuns no Google Maps.
            </p>`}
            <p style="font-size:14px;color:#555;line-height:1.6">
              Se quiser, fazemos as correções consigo e mostramos como ficar à frente da concorrência da sua zona.
            </p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://wa.me/${WHATSAPP}?text=Ol%C3%A1!%20Recebi%20o%20diagn%C3%B3stico%20PontoFinal%20e%20quero%20saber%20mais."
                 style="display:inline-block;background:#25D366;color:white;padding:12px 32px;text-decoration:none;font-weight:600;font-size:14px">
                Falar no WhatsApp
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:11px;color:#999;text-align:center">
              Diagnóstico PontoFinal · pontofinal.site<br/>
              Marque a sua reunião em <a href="https://pontofinal.site" style="color:#ff2a2a">pontofinal.site</a>
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
        body: JSON.stringify({ ...body, timestamp: new Date().toISOString(), source: "diagnostico-pontofinal" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
