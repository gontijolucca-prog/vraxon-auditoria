# VRAXON — Estado e pendências (handoff)

## ✅ Feito
- Código auditado e endurecido para produção. `npm run build` **verde**.
- Site **LIVE** com **noindex** (pré-lançamento): **https://diagnostico.pontofinal.site**
- Deploy via OpenNext + Cloudflare Worker (`npm run cf:deploy`), na conta que tem a zona
  pontofinal.site (Gontijolucca). Resend ligado.
- Pixel Meta integrado (env `NEXT_PUBLIC_META_PIXEL_ID`). Campanha Meta Ads preparada (sem gastar).

## Correções aplicadas
- API auditoria: parse de JSON robusto (o Gemini às vezes devolve com ```json e rebentava);
  rate-limit edge-safe (removido `setInterval` global); **503 gracioso** quando faltam chaves;
  limite de tamanho do input; modelo Gemini configurável.
- API lead: envios independentes (o aviso ao dono chega mesmo que o auto-reply falhe);
  escape de HTML; validação de email; remetente configurável (`LEAD_FROM_EMAIL`).
- Frontend: corrigido erro que **partia o build** (`variants` num `<div>`); **consentimento RGPD**
  no formulário; removida a afirmação não verificável "50+ empresas"; typo "guio"→"guia".
- SEO: noindex coerente (layout + robots.ts + sitemap) via `NEXT_PUBLIC_NOINDEX`.

## ⚠️ Pendente (precisa do Ruben / decisão)
| O quê | Porquê | Onde mete |
|---|---|---|
| **GOOGLE_PLACES_API_KEY** | Sem ela a auditoria devolve "em configuração". Precisa billing + Places API (legacy). | Secret no Cloudflare |
| **GEMINI_API_KEY** | Gera o relatório por IA. (Alternativa: usar OpenRouter do Lucca.) | Secret no Cloudflare |
| ~~Domínio diagnostico.pontofinal.site~~ | ✅ FEITO — live com noindex. | — |
| **NEXT_PUBLIC_META_PIXEL_ID** | Medir conversões dos ads. | Var no Cloudflare |
| **Domínio verificado no Resend** | Auto-reply chegar a leads externos (sandbox só chega ao dono). | Resend |

## Como meter secrets (exemplo)
```bash
export CLOUDFLARE_API_TOKEN=...   # token com Workers Scripts:Edit
export CLOUDFLARE_ACCOUNT_ID=...
printf 'A_CHAVE' | npx wrangler secret put GOOGLE_PLACES_API_KEY
printf 'A_CHAVE' | npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```
