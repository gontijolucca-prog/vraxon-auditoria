# Diagnóstico PontoFinal — Estado e pendências (handoff)

> Antiga "VRAXON". Rebrand total para **Diagnóstico PontoFinal** + redesign a condizer com
> pontofinal.site + todas as promessas do site tornadas reais. Tudo provado em produção.

## ✅ Feito e PROVADO
- **Rebrand total**: zero "VRAXON" em qualquer página, email, legal ou metadados.
- **Redesign** neo-brutalista PontoFinal (tema claro, preto/branco/vermelho #FF2A2A, fundo
  pontilhado, Archivo + JetBrains Mono). Desktop e telemóvel verificados por captura de ecrã.
- **Concorrência REAL**: o relatório lista concorrentes verdadeiros da zona (Google Places
  Nearby, mesmo tipo de negócio), média de nota da zona e percentil honesto. Sem números inventados.
- **Saúde do perfil honesta**: completude calculada de 5 sinais reais (fotos, horário, categoria,
  nota, volume). Removida a "taxa de resposta" que era inventada.
- **Plano de ação** concreto (3–5 passos com impacto e prazo).
- **Guia "5 erros no Google Maps" REAL** em PDF (`/guia-5-erros-google-maps.pdf`), anexado no
  email ao lead. **Entrega confirmada** (Resend `last_event: delivered`).
- **Leads**: aviso para **geral@pontofinal.site** + cópia **pontofinalsite@gmail.com**;
  botões WhatsApp **Lucca (915 136 439)** e **Ruben (913 752 933)**; consentimento RGPD e
  evento Meta Pixel `Lead` mantidos.
- **Estatísticas**: as não verificáveis (35%/3x) foram substituídas; a de avaliações cita fonte
  (BrightLocal).
- **Legal**: corrigido um claim falso herdado (dizia Vercel + Privacy Shield → agora Cloudflare +
  Resend + cláusulas contratuais-tipo da UE).
- **Deploy**: `npm run cf:deploy` na conta com a zona pontofinal.site. **noindex mantido**
  (meta + robots.txt). Build + lint + typecheck verdes.

## ⚠️ Pendente (precisa do Ruben / decisão) — para o site funcionar a 100%
| O quê | Porquê | Onde mete |
|---|---|---|
| **GOOGLE_PLACES_API_KEY** | É a chave do Ruben (precisa billing + Places API legacy). Sem ela a auditoria mostra "em configuração" (503 limpo, não rebenta). | Secret no Cloudflare |
| **GEMINI_API_KEY** | Gera o texto do relatório. Pode ser uma chave grátis do Google AI Studio (do Lucca). | Secret no Cloudflare |
| **Flip do noindex** | Para ir a público: `NEXT_PUBLIC_NOINDEX=false` e redeploy. | Var no Cloudflare |
| **NEXT_PUBLIC_META_PIXEL_ID** | Medir conversões dos anúncios. | Var no Cloudflare |

> O remetente **diagnostico@pontofinal.site** já está verificado no Resend (testado, entrega ok).

## Como meter os secrets
```bash
export CLOUDFLARE_API_TOKEN=...   # token com Workers Scripts:Edit na conta a2cff060…
export CLOUDFLARE_ACCOUNT_ID=a2cff0602323a3b179fd8581371c603d
printf 'A_CHAVE' | npx wrangler secret put GOOGLE_PLACES_API_KEY
printf 'A_CHAVE' | npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

## Como regenerar o guia PDF (se mudar o conteúdo)
```bash
node scripts/build-guide-pdf.mjs   # escreve public/guia-5-erros-google-maps.pdf
```

## Provas (o que foi corrido e observado)
- Homepage live: título "Diagnóstico PontoFinal…", `meta robots: noindex, nofollow`, robots.txt `Disallow: /`.
- `/api/auditoria` → **503 gracioso** (faltam Gemini/Places — comportamento correto até às chaves).
- `/guia-5-erros-google-maps.pdf` → 200 `application/pdf`.
- `/api/lead` → 200; email + guia **entregue** (Resend).
- Render do relatório (concorrência real, plano de ação, saúde honesta) verificado em desktop e telemóvel.
