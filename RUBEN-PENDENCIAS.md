# Diagnóstico PontoFinal — Estado e pendências (handoff)

> Antiga "VRAXON". Rebrand total para **Diagnóstico PontoFinal** + redesign a condizer com
> pontofinal.site + todas as promessas reais. **A ferramenta funciona a 100% e está provada em produção.**

## ✅ A FUNCIONAR (provado ao vivo)
- **Auditoria real end-to-end**: cola-se um negócio → puxa nota, avaliações, fotos, horário,
  categoria e **concorrentes reais da zona** do Google Maps → o modelo gera relatório, plano de
  ação e comparação. Testado em produção com negócios reais (ex.: A Padaria Portuguesa, 4★/1431
  avaliações, 5 concorrentes reais).
- **Sem chave Google / sem cartão**: os dados do Google Maps vêm via **SerpApi** (faz o scrape do
  Maps e devolve JSON). Token grátis no Worker (`SERPAPI_KEY`). O Gemini escreve a análise (`GEMINI_API_KEY`).
- **Rebrand total** (zero VRAXON) + **redesign** neo-brutalista PontoFinal. Desktop + telemóvel.
- **Guia "5 erros no Google Maps"** em PDF, anexado por email ao lead (entrega confirmada via Resend).
- **Leads**: aviso para geral@pontofinal.site + cc pontofinalsite@gmail.com; WhatsApp **só do Ruben**
  (351913752933); consentimento RGPD + evento Meta Pixel `Lead`.
- **Deploy** Cloudflare Worker, **noindex mantido** (meta + robots). Build/lint/typecheck verdes.

## ⚙️ Secrets no Worker (conta a2cff060…)
- `SERPAPI_KEY` ✅ (dados do Google Maps — grátis)
- `GEMINI_API_KEY` ✅ (texto da análise — grátis)
- `RESEND_API_KEY` ✅ (emails)

## ⚠️ A ter em conta
| O quê | Detalhe |
|---|---|
| **Limite SerpApi grátis** | ~250 pesquisas/mês. Cada auditoria gasta ~2–3 → **~80–100 auditorias/mês grátis**. Chega para o teste de ads. Acima disso: plano pago SerpApi **ou** chave Google billing (Ruben). |
| **Flip do noindex** | Para ir a público: `NEXT_PUBLIC_NOINDEX=false` + redeploy. |
| **NEXT_PUBLIC_META_PIXEL_ID** | Para medir conversões dos anúncios (var no Cloudflare). |
| **Alternativa de escala** | Se o volume crescer, trocar SerpApi → Google Places (New) com billing do Ruben (código já tem o histórico dessa versão no Git). |

## Como mexer
```bash
export CLOUDFLARE_API_TOKEN=...   # token da conta a2cff060…
export CLOUDFLARE_ACCOUNT_ID=a2cff0602323a3b179fd8581371c603d
printf 'CHAVE' | npx wrangler secret put SERPAPI_KEY   # (ou GEMINI_API_KEY / RESEND_API_KEY)
npm run cf:deploy
node scripts/build-guide-pdf.mjs                       # regenerar o guia PDF
```

## Provas (corridas e observadas)
- Homepage live: título "Diagnóstico PontoFinal…", `noindex,nofollow`, robots `Disallow: /`.
- `POST /api/auditoria` com negócio real → JSON com nota/avaliações/score/**5 concorrentes reais**/plano.
- `/guia-5-erros-google-maps.pdf` → 200; `/api/lead` → email + guia entregue (Resend).
- Relatório renderizado ao vivo no browser (desktop) com dados reais.
