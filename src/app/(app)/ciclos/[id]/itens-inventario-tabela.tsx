"use client";

import { useMemo, useState } from "react";

export type ItemInventarioLinha = {
  codigoProduto: string;
  descricaoProduto: string;
  unidade: string;
  quantidadeSistema: number;
  quantidadeContada: number;
  ajuste: number;
  valorAjuste: number;
};

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Remove marcas diacríticas (acentos) depois de decompor a string (NFD),
// comparando o code point de cada caractere em vez de usar uma regex com
// caracteres de combinação literais no código-fonte.
function normalizar(texto: string): string {
  return Array.from(texto.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0)!;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase();
}

/**
 * Pedido pelo usuário em 2026-09-05, inspirado na tela de inventário do
 * sistema da loja (Retaguarda GB): poder buscar um código específico e ver
 * a diferença dele, em vez de só o resumo agregado. Filtro local (client)
 * já que o volume por lançamento é pequeno (só os itens divergentes, o
 * arquivo nunca traz o catálogo inteiro).
 */
export function ItensInventarioTabela({ itens }: { itens: ItemInventarioLinha[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const chave = normalizar(busca.trim());
    if (!chave) return itens;
    return itens.filter(
      (i) => normalizar(i.codigoProduto).includes(chave) || normalizar(i.descricaoProduto).includes(chave)
    );
  }, [itens, busca]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por código ou descrição..."
        className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Congelado</th>
              <th className="px-4 py-2 font-medium">Contado</th>
              <th className="px-4 py-2 font-medium">Diferença</th>
              <th className="px-4 py-2 font-medium">Valor de ajuste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtrados.map((i, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-neutral-900">{i.codigoProduto}</td>
                <td className="px-4 py-2 text-neutral-700">{i.descricaoProduto}</td>
                <td className="px-4 py-2 text-neutral-700">{i.quantidadeSistema}</td>
                <td className="px-4 py-2 text-neutral-700">{i.quantidadeContada}</td>
                <td className="px-4 py-2 text-neutral-700">{i.ajuste}</td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(i.valorAjuste)}</td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum item encontrado pra essa busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
