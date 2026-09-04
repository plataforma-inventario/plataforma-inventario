"use client";

import { useRouter, usePathname } from "next/navigation";

type LojaOpcao = { id: string; pdv: number; nome: string };

export function FiltroLoja({ lojas, valorAtual }: { lojas: LojaOpcao[]; valorAtual?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      defaultValue={valorAtual ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (e.target.value) params.set("loja", e.target.value);
        router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
    >
      <option value="">Todas as lojas</option>
      {lojas.map((l) => (
        <option key={l.id} value={l.id}>
          {l.pdv} — {l.nome}
        </option>
      ))}
    </select>
  );
}
