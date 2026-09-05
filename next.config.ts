import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse usa pdfjs-dist + @napi-rs/canvas (addon nativo) pra polyfill de
  // DOMMatrix. Sem isso, o Next tenta empacotar o addon nativo com o
  // bundler e o binário certo da plataforma (ex: linux-x64-gnu na Vercel)
  // não é encontrado em runtime -> "ReferenceError: DOMMatrix is not
  // defined". Marcando como externo, o require() nativo do Node resolve o
  // binário certo direto do node_modules, sem passar pelo bundler.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
