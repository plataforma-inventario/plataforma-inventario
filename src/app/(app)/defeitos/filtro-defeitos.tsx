"use client";

import { useRouter, usePathname } from "next/navigation";

type LojaOpcao = { id: string; pdv: number; nome: string };

export function FiltroDefeitos({
  lojas,
  loja,
  tipo,
}: {
  lojas: LojaOpcao[];
  loja?: string;
  tipo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const atualizar = (campo: "loja" | "tipo", valor: string) => {
    const params = new URLSearchParams();
    const valores = { loja, tipo, [campo]: valor };
    for (const [chave, v] of Object.entries(valores)) {
      if (v) params.set(chave, v);
    }
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={loja ?? ""}
        onChange={(e) => atualizar("loja", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todas as lojas</option>
        {lojas.map((l) => (
          <option key={l.id} value={l.id}>
            {l.pdv} — {l.nome}
          </option>
        ))}
      </select>

      <select
        value={tipo ?? ""}
        onChange={(e) => atualizar("tipo", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Defeito e falta de mercadoria</option>
        <option value="DEFEITO">Só defeito</option>
        <option value="FALTA_MERCADORIA">Só falta de mercadoria</option>
      </select>
    </div>
  );
}
