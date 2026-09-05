import PDFDocument from "pdfkit";
import { auth } from "@/auth";
import { getRankingLojas } from "@/lib/ranking";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

// Item 10.4: relatório pronto pra apresentação, direto do ranking.
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const criterio = new URL(request.url).searchParams.get("ordenarPor") === "valor" ? "valor" : "percentual";
  const linhas = await getRankingLojas(session.user, criterio);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const pronto = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text("Ranking de divergência entre lojas", { align: "left" });
  doc
    .fontSize(9)
    .fillColor("#666")
    .text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "left" });
  doc.moveDown(1);

  const colunas = [
    { titulo: "Loja", largura: 170 },
    { titulo: "Último lançamento", largura: 90 },
    { titulo: "Divergência R$", largura: 90 },
    { titulo: "% faturamento", largura: 70 },
    { titulo: "Tendência", largura: 90 },
  ];
  const xInicial = doc.x;
  let y = doc.y;

  const desenharLinha = (valores: string[], negrito: boolean) => {
    let x = xInicial;
    doc.fontSize(9).fillColor("#000").font(negrito ? "Helvetica-Bold" : "Helvetica");
    valores.forEach((v, i) => {
      doc.text(v, x, y, { width: colunas[i].largura, ellipsis: true });
      x += colunas[i].largura;
    });
    y += 18;
  };

  desenharLinha(colunas.map((c) => c.titulo), true);
  doc
    .moveTo(xInicial, y - 4)
    .lineTo(xInicial + colunas.reduce((a, c) => a + c.largura, 0), y - 4)
    .strokeColor("#ccc")
    .stroke();

  for (const l of linhas) {
    if (y > 760) {
      doc.addPage();
      y = doc.y;
    }
    desenharLinha(
      [
        `${l.pdv} — ${l.nome}`,
        l.dataFim.toLocaleDateString("pt-BR"),
        formatoBRL.format(l.divergenciaValor),
        l.percentualSobreFaturamento !== null ? formatoPct(l.percentualSobreFaturamento) : "—",
        l.tendencia === "MELHOROU" ? "Melhorou" : l.tendencia === "PIOROU" ? "Piorou" : l.tendencia === "ESTAVEL" ? "Estável" : "—",
      ],
      false
    );
  }

  if (linhas.length === 0) {
    doc.fontSize(10).fillColor("#999").text("Nenhuma loja com lançamento fechado ainda.", xInicial, y);
  }

  doc.end();
  const buffer = await pronto;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ranking-lojas-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
