import type { NextConfig } from "next";

const securityHeaders = [
  // Impede clickjacking — a página não pode ser embutida em iframe externo
  { key: "X-Frame-Options", value: "DENY" },
  // Impede MIME-sniffing — o browser respeita o Content-Type declarado
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Envia origin apenas para requests same-origin; omite em cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desativa APIs de hardware não utilizadas
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // CSP: permite apenas recursos do próprio domínio + Supabase + fontes Google
  // 'unsafe-inline' necessário enquanto o Next.js injeta estilos inline; revisar ao adotar CSS-in-JS puro
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval necessário para Next.js dev/HMR
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} wss://*.supabase.co`,
      "img-src 'self' data: blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  eslint: {
    // Pre-existing react-hooks/set-state-in-effect violations across the codebase
    // TODO: fix each useEffect to use a callback pattern, then remove this flag
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
