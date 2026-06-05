import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`;
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
    "place_id,name,rating,user_ratings_total,reviews,photos,opening_hours,types,formatted_address,vicinity";
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}&language=pt&reviews_no_translations=true`;
  const res = await fetch(url);
  const json = await res.json();
  console.log(`[DETAILS] place_id="${placeId}" status=${json.status}`);
  if (json.status !== "OK") console.log("[DETAILS] error:", JSON.stringify(json));
  return json;
}

function extractCid(url: string): string | null {
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

  const placeMatch = url.match(/\/place\/([^/]+)/);
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

  return null;
}

export async function POST(request: Request) {
  try {
    const { link } = await request.json();

    if (!link || typeof link !== "string") {
      return NextResponse.json(
        { error: "Link do Google Maps é obrigatório." },
        { status: 400 }
      );
    }

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
      return NextResponse.json({
        title: name,
        rating,
        totalReviews,
        category: types[types.length - 1] ?? "N/A",
        score: 0,
        strengths: [],
        improvements: ["Nenhuma avaliação encontrada para análise."],
        health: {
          hasPhotos: photoCount > 0,
          hasOpeningHours,
          hasCategory: types.length > 0,
          responseRate: 0,
        },
        missingProfileItems: [],
        competitorInsights: "N/A",
        leadImpact: "Sem dados suficientes para calcular.",
        recommendationUrgency: "critical",
      });
    }

    const reviewsSummary = reviews
      .slice(0, 15)
      .map((r) => `- ${r.author} (${r.rating}★): ${r.text.slice(0, 300)}`)
      .join("\n");

    const hasNegativePattern = reviews.filter((r) => r.rating <= 3).length > 2;
    const avgRating = reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : rating;

    const prompt = `Você é um auditor especialista em SEO local e Google Maps. Analise profundamente este perfil comercial e retorne APENAS JSON puro, sem markdown.

EMPRESA: ${name}
CATEGORIA: ${types[types.length - 1] ?? "N/A"}
NOTA MÉDIA: ${avgRating}
TOTAL AVALIAÇÕES: ${totalReviews}
TEM FOTOS: ${photoCount > 0 ? `Sim (${photoCount} fotos)` : "Não"}
TEM HORÁRIOS: ${hasOpeningHours ? "Sim" : "Não"}
AVALIAÇÕES RECENTES:
${reviewsSummary}

Com base nestes dados, retorne este JSON exato:
{
  "score": 0-100,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["ponto crítico 1", "ponto crítico 2", "ponto crítico 3"],
  "health": {
    "hasPhotos": true/false,
    "hasOpeningHours": true/false,
    "hasCategory": true/false,
    "responseRate": 0-100
  },
  "missingProfileItems": ["O que falta no perfil"],
  "competitorInsights": "Parágrafo comparando com concorrentes do mesmo nicho. Dê dicas específicas.",
  "leadImpact": "Frase sobre quantos leads estão sendo perdidos e por qual motivo principal.",
  "recommendationUrgency": "critical" ou "warning" ou "ok"
}

REGRAS:
- score: 0-100. Baseie-se em nota, engajamento do dono, fotos, horários e tom das avaliações.
- improvements: itens ACIONÁVEIS.
- health.responseRate: estime com base no padrão das avaliações.
- competitorInsights: comparativo realista de como negócios do mesmo segmento podem estar melhores.
- leadImpact: algo como "Com base nas avaliações, você pode estar perdendo até X% dos leads por [motivo]".
- recommendationUrgency: "critical" se nota < 4.0 ou sem fotos/horários. "warning" se nota entre 4.0-4.3. "ok" se nota > 4.3 e perfil completo.`;

    const raw = await askGemini(
      "Você é um auditor especialista em SEO local e Google Maps. Retorne APENAS JSON puro, sem markdown, sem código.\n\n" +
      prompt
    );
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      title: name,
      rating,
      totalReviews,
      category: types[types.length - 1] ?? "N/A",
      score: parsed.score ?? 50,
      strengths: parsed.strengths ?? [],
      improvements: parsed.improvements ?? [],
      health: parsed.health ?? {
        hasPhotos: photoCount > 0,
        hasOpeningHours,
        hasCategory: types.length > 0,
        responseRate: hasNegativePattern ? 20 : 60,
      },
      missingProfileItems: parsed.missingProfileItems ?? [],
      competitorInsights:
        parsed.competitorInsights ??
        "Seus concorrentes diretos na região estão investindo em fotos profissionais e respondendo a todas as avaliações.",
      leadImpact:
        parsed.leadImpact ??
        "Perfil incompleto pode estar a custar clientes para os seus concorrentes.",
      recommendationUrgency: parsed.recommendationUrgency ?? "warning",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    console.log("[ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}