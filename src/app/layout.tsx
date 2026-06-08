import type { Metadata } from "next";
import { Archivo, Archivo_Black, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://diagnostico.pontofinal.site";
// noindex por defeito até lançamento público; flip com NEXT_PUBLIC_NOINDEX=false
const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX !== "false";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Diagnóstico PontoFinal – Auditoria grátis ao seu Google Maps",
  description:
    "Descubra como o seu negócio aparece no Google Maps. Diagnóstico gratuito com pontuação, pontos a melhorar e comparação real com a concorrência da sua zona.",
  robots: NOINDEX ? { index: false, follow: false } : undefined,
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`${archivo.variable} ${archivoBlack.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {GA_ID && (
          <>
            <script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} async />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        )}
        {META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}