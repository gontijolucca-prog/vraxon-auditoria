import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ─── Rate Limiting simples ───
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 10;        // máx. 10 pedidos/min/IP
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  // Limpeza lazy (edge-safe: sem timers globais, que não sobrevivem em serverless/workers)
  if (rateMap.size > 5000) {
    for (const [key, entry] of rateMap) {
      if (now > entry.resetAt) rateMap.delete(key);
    }
  }
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  entry.count++;
  return { ok: entry.count <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - entry.count) };
}

// Extrai JSON mesmo quando o modelo devolve cercas ```json ou texto à volta.
function parseJsonLoose(raw: string): Record<string, unknown> {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        /* cai para o erro abaixo */
      }
    }
    throw new Error("AI_PARSE_FAIL");
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

async function askGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Gemini: ${json?.error?.message || res.status}`);
  }

  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE = "https://maps.googleapis.com/maps/api/place";

async function searchPlace(query: string) {
  const url = `${BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${KEY}&language=pt`;
  const res = await fetch(url);
  const json = await res.json();
  console.log(`[SEARCH] query="${query}" status=${json.status} results=${json.results?.length ?? 0}`);
  if (json.status !== "OK") console.log("[SEARCH] error:", JSON.stringify(json));
  return json;
}

async function getPlaceDetails(placeId: string) {
  const fields =
    "place_id,name,rating,user_ratings_total,reviews,photos,opening_hours,types,formatted_address,vicinity,geometry/location";
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}&language=pt&reviews_no_translations=true`;
  const res = await fetch(url);
  const json = await res.json();
  console.log(`[DETAILS] place_id="${placeId}" status=${json.status}`);
  if (json.status !== "OK") console.log("[DETAILS] error:", JSON.stringify(json));
  return json;
}

type Competitor = { name: string; rating: number; reviews: number };

// Concorrentes REAIS: Places Nearby do mesmo tipo, na zona do negócio.
async function findCompetitors(
  lat: number,
  lng: number,
  types: string[],
  selfPlaceId: string
): Promise<{ list: Competitor[]; areaAvg: number | null; rankPercentile: number | null; total: number }> {
  const empty = { list: [], areaAvg: null, rankPercentile: null, total: 0 };
  // tipo de negócio válido p/ Nearby (ignora genéricos)
  const generic = new Set(["point_of_interest", "establishment", "food", "store", "premise"]);
  const type = (types || []).find((t) => !generic.has(t)) || (types || [])[0];
  if (!type || !lat || !lng) return empty;
  try {
    const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=${encodeURIComponent(type)}&key=${KEY}&language=pt`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`[COMPET] type=${type} status=${json.status} results=${json.results?.length ?? 0}`);
    if (json.status !== "OK") return empty;
    const list: Competitor[] = (json.results || [])
      .filter((r: { place_id?: string; rating?: number }) => r.place_id !== selfPlaceId && typeof r.rating === "number")
      .map((r: { name?: string; rating?: number; user_ratings_total?: number }) => ({
        name: r.name ?? "Concorrente",
        rating: r.rating ?? 0,
        reviews: r.user_ratings_total ?? 0,
      }))
      .slice(0, 10);
    const areaAvg = list.length
      ? Number((list.reduce((a, c) => a + c.rating, 0) / list.length).toFixed(1))
      : null;
    return { list: list.slice(0, 5), areaAvg, rankPercentile: null, total: list.length };
  } catch {
    return empty;
  }
}

function extractCid(url: string): string | null {
  // Formato moderno: ...!1s0x1234:0x5678... dentro de data=
  const dataMatch = url.match(/!1s([a-f0-9x]+:[a-f0-9x]+)/i);
  if (dataMatch) {
    // O segundo número hexadecimal é o "cid" equivalente
    const parts = dataMatch[1].split(":");
    if (parts[1]) return BigInt(parts[1]).toString();
  }

  const match = url.match(/[?&]cid=(\d+)/);
  if (match) return match[1];

  const ftidMatch = url.match(/ftid=0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (ftidMatch) return BigInt(`0x${ftidMatch[1]}`).toString();

  return null;
}

function extractNameFromUrl(url: string): string | null {
  const afterQ = url.match(/[?&]q=([^&]+)/);
  if (afterQ) {
    const raw = decodeURIComponent(afterQ[1].replace(/\+/g, " "));
    const cleaned = raw.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, " ").trim();
    if (cleaned.length > 2) return cleaned;
  }

  const placeMatch = url.match(/\/place\/([^/@?]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));

  const lqiMatch = url.match(/lqi=([^&]+)/);
  if (lqiMatch) {
    try {
      const raw = lqiMatch[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = raw.padEnd(raw.length + (4 - (raw.length % 4)) % 4, "=");
      const decoded = atob(padded);
      const match = decoded.match(/[\x20-\x7EÀ-ÿ]{4,}/);
      if (match) return match[0].trim();
    } catch {}
  }

  // Extrair nome de search URLs (/search/...)
  const searchMatch = url.match(/\/search\/([^/@?]+)/);
  if (searchMatch) return decodeURIComponent(searchMatch[1].replace(/\+/g, " "));

  return null;
}

// Expandir URLs encurtadas (goo.gl, maps.app.goo.gl)
async function expandShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    const location = res.headers.get("location");
    if (location) return location;
  } catch {}
  return url;
}

export async function POST(request: Request) {
  try {
    // ─── Rate limiting ───
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const { ok: allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "⚠️ Muitos pedidos num curto espaço de tempo. Aguarde 1 minuto antes de tentar novamente." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } }
      );
    }

    // Degradação graciosa: se faltar uma chave, não rebenta — avisa que está em configuração.
    if (!GEMINI_KEY || !KEY) {
      console.log("[CONFIG] chave em falta:", { gemini: !!GEMINI_KEY, places: !!KEY });
      return NextResponse.json(
        { error: "🔧 Ferramenta em configuração final. Volte dentro de instantes — estamos quase prontos." },
        { status: 503 }
      );
    }

    const { link: rawLink } = await request.json();

    if (!rawLink || typeof rawLink !== "string") {
      return NextResponse.json(
        { error: "Link do Google Maps é obrigatório." },
        { status: 400 }
      );
    }

    if (rawLink.length > 2000) {
      return NextResponse.json(
        { error: "O link enviado é demasiado longo. Cole apenas o URL do Google Maps ou o nome do negócio." },
        { status: 400 }
      );
    }

    // Expandir URLs encurtadas (goo.gl, maps.app.goo.gl)
    const link = rawLink.includes("goo.gl") ? await expandShortUrl(rawLink) : rawLink;

    console.log("[INPUT] link recebido:", link);

    const cid = extractCid(link);
    const bizName = extractNameFromUrl(link);

    console.log("[PARSE] cid:", cid, "bizName:", bizName);

    let searchResult;

    if (cid) {
      searchResult = await searchPlace(`cid:${cid}`);
    }

    if (!searchResult?.results?.length && bizName) {
      searchResult = await searchPlace(bizName);
    }

    if (!searchResult?.results?.length) {
      searchResult = await searchPlace(link);
    }

    if (!searchResult?.results?.length) {
      console.log("[FINAL] Nenhum resultado encontrado");
      return NextResponse.json(
        {
          error:
            "Não encontrei este negócio no Google Maps. Tenta colar um link direto do perfil ou o nome exato da empresa (ex: 'Angela Cabeleireiro Porto').",
        },
        { status: 404 }
      );
    }

    const place = searchResult.results[0];
    const placeId = place.place_id;

    console.log("[FOUND] place_id:", placeId, "name:", place.name);

    const detailsResult = await getPlaceDetails(placeId);
    const details = detailsResult.result || {};

    const name = details.name ?? place.name ?? "Empresa";
    const rating = details.rating?.toString() ?? "N/A";
    const totalReviews = details.user_ratings_total?.toString() ?? "0";
    const types = details.types ?? place.types ?? [];
    const hasOpeningHours = !!details.opening_hours;
    const photoCount = details.photos?.length ?? 0;

    const rawReviews: { author_name?: string; rating?: number; text?: string }[] =
      details.reviews ?? [];

    const reviews = rawReviews.map((r) => ({
      text: r.text ?? "",
      rating: r.rating ?? 0,
      author: r.author_name ?? "Anónimo",
    }));

    if (!reviews.length) {
      const completenessNoReviews = Math.round(
        ([photoCount > 0, hasOpeningHours, types.length > 0].filter(Boolean).length / 5) * 100
      );
      return NextResponse.json({
        title: name,
        rating,
        totalReviews,
        category: types[types.length - 1] ?? "N/A",
        score: 0,
        strengths: [],
        improvements: [
          "Ainda não há avaliações neste perfil — peça a clientes satisfeitos para deixarem uma avaliação.",
          photoCount > 0 ? null : "Adicione fotos reais do espaço, equipa e trabalhos.",
          hasOpeningHours ? null : "Preencha os horários de funcionamento.",
        ].filter(Boolean),
        health: {
          hasPhotos: photoCount > 0,
          hasOpeningHours,
          hasCategory: types.length > 0,
          profileCompleteness: completenessNoReviews,
        },
        missingProfileItems: [],
        competitors: [],
        areaAvg: null,
        rankPercentile: null,
        competitorInsights: null,
        leadImpact:
          "Sem avaliações, o perfil aparece menos nas pesquisas e gera menos confiança em quem o encontra.",
        actionPlan: [
          { acao: "Peça as primeiras avaliações a clientes recentes", impacto: "alto", prazo: "esta semana" },
          { acao: "Complete fotos, horários e categoria do perfil", impacto: "alto", prazo: "esta semana" },
        ],
        recommendationUrgency: "critical",
      });
    }

    const reviewsSummary = reviews
      .slice(0, 15)
      .map((r) => `- ${r.author} (${r.rating}★): ${r.text.slice(0, 300)}`)
      .join("\n");

    const avgRating = reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : rating;

    // ── Concorrentes REAIS (Places Nearby) + métricas honestas ──
    const loc = details.geometry?.location;
    const competitors = loc
      ? await findCompetitors(loc.lat, loc.lng, types, placeId)
      : { list: [], areaAvg: null, rankPercentile: null, total: 0 };
    const myRating = Number(details.rating) || Number(avgRating) || 0;
    const betterOrEqual = competitors.list.filter((c) => myRating >= c.rating).length;
    const rankPercentile = competitors.total
      ? Math.round((betterOrEqual / competitors.total) * 100)
      : null;
    // Completude do perfil = sinais REAIS verificáveis (não inventado)
    const profileCompleteness = Math.round(
      ([
        photoCount > 0,
        hasOpeningHours,
        types.length > 0,
        Number(details.rating) >= 4,
        Number(totalReviews) >= 10,
      ].filter(Boolean).length / 5) * 100
    );
    const competitorsBlock = competitors.list.length
      ? competitors.list.map((c) => `- ${c.name}: ${c.rating}★ (${c.reviews} avaliações)`).join("\n")
      : "(sem concorrentes do mesmo tipo encontrados na zona)";

    const prompt = `És um auditor especialista em SEO local e Google Maps. Analisa este perfil comercial e devolve APENAS JSON puro, sem markdown. Escreve em português europeu (PT-PT, Acordo Ortográfico 1990), trata o leitor por "você", sem estrangeirismos.

EMPRESA: ${name}
CATEGORIA: ${types[types.length - 1] ?? "N/A"}
NOTA MÉDIA: ${avgRating}
TOTAL AVALIAÇÕES: ${totalReviews}
TEM FOTOS: ${photoCount > 0 ? `Sim (${photoCount} fotos)` : "Não"}
TEM HORÁRIOS: ${hasOpeningHours ? "Sim" : "Não"}
AVALIAÇÕES RECENTES:
${reviewsSummary}

CONCORRENTES REAIS NA ZONA (dados do Google Maps, mesmo tipo de negócio):
${competitorsBlock}
MÉDIA DE NOTA DA ZONA: ${competitors.areaAvg ?? "N/D"}

Com base nestes dados, devolve este JSON exato:
{
  "score": 0-100,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["ponto a melhorar 1", "ponto a melhorar 2", "ponto a melhorar 3"],
  "health": {
    "hasPhotos": true/false,
    "hasOpeningHours": true/false,
    "hasCategory": true/false
  },
  "missingProfileItems": ["O que falta no perfil"],
  "competitorInsights": "Parágrafo a comparar ESTE negócio com os concorrentes REAIS listados acima (usa os nomes e notas reais). Diz onde está à frente e onde está atrás.",
  "leadImpact": "Frase honesta sobre o efeito do perfil na captação de clientes — sem inventar percentagens exactas.",
  "actionPlan": [
    {"acao": "passo concreto a fazer no perfil", "impacto": "alto|médio|baixo", "prazo": "esta semana|este mês"}
  ],
  "recommendationUrgency": "critical" ou "warning" ou "ok"
}

REGRAS:
- score: 0-100. Baseia-te em nota, fotos, horários, volume de avaliações e tom dos comentários.
- improvements: itens ACIONÁVEIS, concretos.
- competitorInsights: usa SÓ os concorrentes reais acima; nunca inventes nomes nem números.
- leadImpact: honesto, sem percentagens inventadas (ex: "perfil sem fotos transmite menos confiança e leva clientes a escolher concorrentes com perfil mais completo").
- actionPlan: 3 a 5 passos, ordenados por impacto, cada um realista para um dono de negócio executar sozinho.
- recommendationUrgency: "critical" se nota < 4.0 ou sem fotos/horários. "warning" se nota entre 4.0-4.3. "ok" se nota > 4.3 e perfil completo.`;

    const raw = await askGemini(
      "Você é um auditor especialista em SEO local e Google Maps. Retorne APENAS JSON puro, sem markdown, sem código.\n\n" +
      prompt
    );
    const parsed = parseJsonLoose(raw);

    const parsedHealth = (parsed.health ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      title: name,
      rating,
      totalReviews,
      category: types[types.length - 1] ?? "N/A",
      score: parsed.score ?? 50,
      strengths: parsed.strengths ?? [],
      improvements: parsed.improvements ?? [],
      // Saúde do perfil: sinais REAIS verificados (sem percentagem inventada).
      health: {
        hasPhotos: parsedHealth.hasPhotos ?? photoCount > 0,
        hasOpeningHours: parsedHealth.hasOpeningHours ?? hasOpeningHours,
        hasCategory: parsedHealth.hasCategory ?? types.length > 0,
        profileCompleteness,
      },
      missingProfileItems: parsed.missingProfileItems ?? [],
      // Concorrência REAL (Google Places Nearby, mesmo tipo, mesma zona)
      competitors: competitors.list,
      areaAvg: competitors.areaAvg,
      rankPercentile,
      competitorInsights: parsed.competitorInsights ?? null,
      leadImpact:
        parsed.leadImpact ??
        "Um perfil incompleto transmite menos confiança e leva clientes a escolher concorrentes com perfil mais completo.",
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
      recommendationUrgency: parsed.recommendationUrgency ?? "warning",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    console.log("[ERROR]", message);

    // Mensagens mais amigáveis
    let friendlyError = message;
    if (message.includes("GOOGLE_PLACES_API_KEY") || message.includes("API key not valid")) {
      friendlyError = "🔧 Serviço temporariamente indisponível. A equipa Diagnóstico PontoFinal foi notificada.";
    } else if (message.includes("Gemini") || message.includes("GEMINI_API_KEY") || message.includes("AI_PARSE_FAIL")) {
      friendlyError = "🧠 A inteligência artificial está temporariamente indisponível. Tente novamente em instantes.";
    } else if (message.includes("NOT_FOUND") || message.includes("ZERO_RESULTS")) {
      friendlyError = "🔍 Não encontrei este negócio no Google Maps. Verifique o link e tente novamente.";
    } else if (message.includes("500") || message.includes("Internal")) {
      friendlyError = "⚡ Erro interno. A equipa foi notificada. Tente novamente.";
    }

    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}