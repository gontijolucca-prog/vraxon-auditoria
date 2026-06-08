#!/usr/bin/env bash
# Ata diagnostico.pontofinal.site ao Worker vraxon-auditoria e verifica.
# Pré-requisito: UMA credencial Cloudflare com Zone:DNS:Edit + Workers Routes:Edit, via:
#   (a) `npx wrangler login`  (OAuth — mais simples), OU
#   (b) ~/.config/credentials/cloudflare-api-token-dns  (token DNS dedicado)
# Uso: bash scripts/attach-domain.sh
set -euo pipefail

DOMAIN="diagnostico.pontofinal.site"
WORKER="vraxon-auditoria"
CRED="$HOME/.config/credentials"
cd "$(dirname "$0")/.."

# Escolhe credencial: token DNS dedicado tem prioridade; senão usa OAuth do wrangler.
if [ -f "$CRED/cloudflare-api-token-dns" ]; then
  export CLOUDFLARE_API_TOKEN="$(cat "$CRED/cloudflare-api-token-dns")"
  export CLOUDFLARE_ACCOUNT_ID="$(cat "$CRED/cloudflare-account-id")"
  echo "→ a usar token DNS dedicado"
else
  unset CLOUDFLARE_API_TOKEN || true   # força OAuth do wrangler login
  echo "→ a usar OAuth do wrangler (corre 'npx wrangler login' primeiro se falhar)"
fi

# Adiciona a rota custom_domain de forma temporária (não suja o config commitado).
cp wrangler.jsonc /tmp/wrangler.vraxon.bak.jsonc
python3 - <<'PY'
import json
d=json.load(open('wrangler.jsonc'))
d.setdefault('routes',[])
if not any(r.get('pattern')=='diagnostico.pontofinal.site' for r in d['routes']):
    d['routes'].append({'pattern':'diagnostico.pontofinal.site','custom_domain':True})
json.dump(d,open('wrangler.jsonc','w'),indent=2)
print('rota custom_domain adicionada')
PY

echo "→ deploy (cria o custom domain + DNS + certificado)..."
if npx wrangler deploy; then
  STATUS=ok
else
  STATUS=fail
fi
cp /tmp/wrangler.vraxon.bak.jsonc wrangler.jsonc   # restaura config commitado

if [ "$STATUS" != ok ]; then
  echo "✘ deploy falhou — provavelmente sem credencial DNS válida. Corre 'npx wrangler login' e tenta de novo."
  exit 1
fi

echo "→ a aguardar propagação + emissão de certificado (pode levar 1-2 min)..."
for i in $(seq 1 24); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || echo 000)
  if [ "$CODE" = "200" ]; then
    echo "✓ $DOMAIN responde 200"
    echo "  robots: $(curl -s "https://$DOMAIN/robots.txt" | tr '\n' ' ')"
    echo "  noindex no HTML: $(curl -s "https://$DOMAIN/" | grep -ci noindex) match(es)"
    echo "✅ diagnostico.pontofinal.site LIVE com noindex."
    exit 0
  fi
  echo "  ($i/24) ainda $CODE — a aguardar 5s..."
  sleep 5
done
echo "⚠️ domínio atado mas ainda não responde 200 (cert a emitir). Confirma daqui a 1-2 min com: curl -I https://$DOMAIN/"
