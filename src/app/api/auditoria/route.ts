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

// ─── Google Places API (NEW) ───
// A API legacy (maps.googleapis.com/maps/api/place) já não é ativável em projetos novos.
// Usamos a Places API (New) em places.googleapis.com/v1, com X-Goog-FieldMask.
const KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES = "https://places.googleapis.com/v1";

type PlaceLite = { id: string; displayName?: { text?: string }; types?: string[]; primaryType?: string };

// Procura por texto (Text Search New). Devolve a lista de places (já normalizada).
async function searchPlace(query: string): Promise<PlaceLite[]> {
  const res = await fetch(`${PLACES}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY ?? "",
      "X-Goog-FieldMask": "places.id,places.displayName,places.types,places.primaryType",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "pt", regionCode: "PT" }),
  });
  const json = await res.json();
  if (!res.ok) console.log("[SEARCH] error:", JSON.stringify(json).slice(0, 300));
  console.log(`[SEARCH] q="${query}" results=${json.places?.length ?? 0}`);
  return json.places ?? [];
}

type PlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: { rating?: number; text?: { text?: string }; authorAttribution?: { displayName?: string } }[];
  photos?: unknown[];
  regularOpeningHours?: unknown;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
};

async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const fields =
    "id,displayName,rating,userRatingCount,reviews,photos,regularOpeningHours,types,primaryType,primaryTypeDisplayName,location";
  const res = await fetch(`${PLACES}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": KEY ?? "",
      "X-Goog-FieldMask": fields,
      "Accept-Language": "pt",
    },
  });
  const json = await res.json();
  if (!res.ok) console.log("[DETAILS] error:", JSON.stringify(json).slice(0, 300));
  console.log(`[DETAILS] id="${placeId}" name=${json.displayName?.text ?? "?"}`);
  return json;
}

type Competitor = { name: string; rating: number; reviews: number };

// Concorrentes REAIS: Nearby Search (New) do mesmo tipo, na zona do negócio.
async function findCompetitors(
  lat: number,
  lng: number,
  primaryType: string,
  types: string[],
  selfPlaceId: string
): Promise<{ list: Competitor[]; areaAvg: number | null; rankPercentile: number | null; total: number }> {
  const empty = { list: [] as Competitor[], areaAvg: null, rankPercentile: null, total: 0 };
  const generic = new Set(["point_of_interest", "establishment", "food", "store", "premise"]);
  const type =
    primaryType && !generic.has(primaryType)
      ? primaryType
      : (types || []).find((t) => !generic.has(t)) || (types || [])[0];
  if (!type || !lat || !lng) return empty;
  try {
    const res = await fetch(`${PLACES}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY ?? "",
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 15,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 5000 } },
        languageCode: "pt",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.log("[COMPET] error:", JSON.stringify(json).slice(0, 200));
      return empty;
    }
    const list: Competitor[] = (json.places || [])
      .filter((p: { id?: string; rating?: number }) => p.id !== selfPlaceId && typeof p.rating === "number")
      .map((p: { displayName?: { text?: string }; rating?: number; userRatingCount?: number }) => ({
        name: p.displayName?.text ?? "Concorrente",
        rating: p.rating ?? 0,
        reviews: p.userRatingCount ?? 0,
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

    const bizName = extractNameFromUrl(link);
    console.log("[PARSE] bizName:", bizName);

    // Procura: primeiro pelo nome extraído, depois pelo input cru.
    let places = bizName ? await searchPlace(bizName) : [];
    if (!places.length && bizName !== link) {
      places = await searchPlace(link);
    }

    if (!places.length) {
      console.log("[FINAL] Nenhum resultado encontrado");
      return NextResponse.json(
        {
          error:
            "Não encontrei este negócio no Google Maps. Tenta colar um link direto do perfil ou o nome exato da empresa (ex: 'Angela Cabeleireiro Porto').",
        },
        { status: 404 }
      );
    }

    const place = places[0];
    const placeId = place.id;

    console.log("[FOUND] id:", placeId, "name:", place.displayName?.text);

    const details = await getPlaceDetails(placeId);

    const name = details.displayName?.text ?? place.displayName?.text ?? "Empresa";
    const rating = details.rating != null ? String(details.rating) : "N/A";
    const totalReviews = details.userRatingCount != null ? String(details.userRatingCount) : "0";
    const types = details.types ?? place.types ?? [];
    const primaryType = details.primaryType ?? place.primaryType ?? "";
    const categoryLabel = details.primaryTypeDisplayName?.text ?? types[types.length - 1] ?? "N/A";
    const hasOpeningHours = !!details.regularOpeningHours;
    const photoCount = details.photos?.length ?? 0;

    const rawReviews = details.reviews ?? [];
    const reviews = rawReviews.map((r) => ({
      text: r.text?.text ?? "",
      rating: r.rating ?? 0,
      author: r.authorAttribution?.displayName ?? "Anónimo",
    }));

    if (!reviews.length) {
      const completenessNoReviews = Math.round(
        ([photoCount > 0, hasOpeningHours, types.length > 0].filter(Boolean).length / 5) * 100
      );
      return NextResponse.json({
        title: name,
        rating,
        totalReviews,
        category: categoryLabel,
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

    // ── Concorrentes REAIS (Places Nearby New) + métricas honestas ──
    const loc = details.location;
    const competitors = loc?.latitude && loc?.longitude
      ? await findCompetitors(loc.latitude, loc.longitude, primaryType, types, placeId)
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
CATEGORIA: ${categoryLabel}
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
      category: categoryLabel,
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
