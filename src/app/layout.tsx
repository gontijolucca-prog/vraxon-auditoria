import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://diagnostico.pontofinal.site";
// noindex por defeito até lançamento público; flip com NEXT_PUBLIC_NOINDEX=false
const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX !== "false";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "VRAXON – Auditoria Grátis do seu perfil no Google Maps",
  description:
    "Descubra como a sua empresa aparece no Google Maps. Auditoria gratuita por IA com pontuação, pontos críticos e radar da concorrência.",
  icons: { icon: "/vraxon-logo.png" },
  robots: NOINDEX ? { index: false, follow: false } : undefined,
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
        {children}
      </body>
    </html>
  );
}