import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const TO_EMAIL = process.env.LEAD_EMAIL_TO || "ruben_frazao98@outlook.pt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, whatsapp, company, score } = body;

    console.log("=== NOVO LEAD VRAXON ===");
    console.log(JSON.stringify(body, null, 2));

    if (resend) {
      // Email para o dono do SaaS
      await resend.emails.send({
        from: "VRAXON <onboarding@resend.dev>",
        to: [TO_EMAIL],
        subject: `Novo Lead – ${name} (${company || "sem empresa"})`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#6366f1">Novo Lead — VRAXON</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666">Nome</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#666">WhatsApp</td><td style="padding:8px 0">${whatsapp}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Empresa</td><td style="padding:8px 0;font-weight:600">${company || "—"}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Score</td><td style="padding:8px 0;font-weight:600">${score ?? "—"}/100</td></tr>
            </table>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#999">VRAXON — Especialistas em Posicionamento Local</p>
          </div>
        `,
      });

      // Email automático de follow-up para o lead
      await resend.emails.send({
        from: "VRAXON <onboarding@resend.dev>",
        to: [email],
        subject: `O seu relatório VRAXON está pronto — ${company || "obrigado pelo seu interesse"}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
            <div style="text-align:center;margin-bottom:24px">
              <h1 style="color:#6366f1;font-size:24px;margin:0">VRAXON</h1>
              <p style="color:#999;font-size:12px">Especialistas em Posicionamento Local</p>
            </div>
            <p style="font-size:14px;color:#333">Olá <strong>${name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.6">
              Obrigado por utilizar a nossa ferramenta de auditoria. O relatório da sua empresa
              <strong>${company || ""}</strong> já foi gerado com uma pontuação de <strong>${score ?? "—"}/100</strong>.
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
      });
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