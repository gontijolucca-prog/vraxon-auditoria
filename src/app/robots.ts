import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://diagnostico.pontofinal.site";
const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX !== "false";

export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) {
    // Fase de pré-lançamento: bloquear toda a indexação.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
