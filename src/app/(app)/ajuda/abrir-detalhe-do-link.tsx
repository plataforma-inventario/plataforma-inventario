"use client";

import { useEffect } from "react";

/**
 * Clicar num link do índice (#arquivo-x) deveria abrir o <details> sozinho
 * (é o comportamento padrão do HTML desde ~2021), mas nem todo navegador
 * suporta isso ainda - então garantimos na mão: ao carregar a página ou
 * mudar o hash, se o alvo for um <details> fechado, abre e rola até ele.
 */
export function AbrirDetalheDoLink() {
  useEffect(() => {
    const abrirPeloHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const alvo = document.getElementById(hash);
      if (alvo instanceof HTMLDetailsElement && !alvo.open) {
        alvo.open = true;
        alvo.scrollIntoView({ block: "start" });
      }
    };
    abrirPeloHash();
    window.addEventListener("hashchange", abrirPeloHash);
    return () => window.removeEventListener("hashchange", abrirPeloHash);
  }, []);

  return null;
}
