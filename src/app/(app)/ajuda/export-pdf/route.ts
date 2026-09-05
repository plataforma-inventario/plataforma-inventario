import PDFDocument from "pdfkit";
import { auth } from "@/auth";
import { MANUAL, type Bloco } from "@/lib/manual-conteudo";

const LARGURA_UTIL = 515; // A4 (595) - 2*40 de margem

// As fontes padrão do pdfkit (Helvetica/Courier) usam WinAnsiEncoding, que
// não tem glifo pra →/⚠/✗ - sem isso o PDF sai com caracteres trocados.
// Trocamos por equivalentes em texto simples só na versão em PDF (a página
// HTML não precisa disso, o navegador renderiza Unicode normalmente).
function paraPdf(texto: string): string {
  return texto.replace(/→/g, "->").replace(/⚠/g, "[aviso]").replace(/✗/g, "[x]").replace(/✓/g, "[ok]");
}

function desenharTabela(doc: PDFKit.PDFDocument, bloco: Extract<Bloco, { tipo: "tabela" }>) {
  const temCabecalho = bloco.cabecalho.some((c) => c);
  const nColunas = bloco.cabecalho.length;
  const largura = LARGURA_UTIL / nColunas;

  const desenharLinha = (valores: string[], negrito: boolean) => {
    if (doc.y > 740) doc.addPage();
    const xInicial = doc.x;
    const yInicial = doc.y;
    doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    let alturaMax = 0;
    valores.forEach((v) => {
      const altura = doc.heightOfString(paraPdf(v), { width: largura - 8 });
      alturaMax = Math.max(alturaMax, altura);
    });
    valores.forEach((v, i) => {
      doc.text(paraPdf(v), xInicial + i * largura, yInicial, { width: largura - 8 });
    });
    doc.y = yInicial + alturaMax + 6;
    doc.x = xInicial;
  };

  if (temCabecalho) {
    desenharLinha(bloco.cabecalho, true);
    doc
      .moveTo(doc.x, doc.y - 2)
      .lineTo(doc.x + LARGURA_UTIL, doc.y - 2)
      .strokeColor("#ccc")
      .stroke();
    doc.y += 2;
  }
  for (const linha of bloco.linhas) {
    desenharLinha(linha, false);
  }
  doc.moveDown(0.5);
}

function desenharBloco(doc: PDFKit.PDFDocument, bloco: Bloco) {
  if (doc.y > 740 && bloco.tipo !== "h2") doc.addPage();

  switch (bloco.tipo) {
    case "h2":
      doc.addPage();
      doc.fontSize(15).font("Helvetica-Bold").fillColor("#00674a").text(paraPdf(bloco.texto));
      doc.moveDown(0.5);
      break;
    case "h3":
      doc.moveDown(0.3);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#111").text(paraPdf(bloco.texto));
      doc.moveDown(0.2);
      break;
    case "p":
      doc.fontSize(10).font("Helvetica").fillColor("#333").text(paraPdf(bloco.texto), { align: "left" });
      doc.moveDown(0.4);
      break;
    case "lista":
    case "listaNumerada":
      doc.fontSize(10).font("Helvetica").fillColor("#333");
      bloco.itens.forEach((item, i) => {
        const marcador = bloco.tipo === "listaNumerada" ? `${i + 1}. ` : "• ";
        doc.text(marcador + paraPdf(item), { indent: 10 });
      });
      doc.moveDown(0.4);
      break;
    case "tabela":
      doc.fillColor("#000");
      desenharTabela(doc, bloco);
      break;
    case "aviso":
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#92620a").text("[aviso] " + paraPdf(bloco.texto));
      doc.moveDown(0.4);
      break;
    case "exemplo":
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#555").text(paraPdf(bloco.titulo));
      doc.font("Courier").fontSize(8).fillColor("#333").text(paraPdf(bloco.texto));
      doc.moveDown(0.4);
      break;
    case "arquivo":
      doc.moveDown(0.3);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#111")
        .text(`${bloco.numero} ${paraPdf(bloco.titulo)} — ${bloco.formato}`);
      doc.fontSize(9).font("Helvetica").fillColor("#666").text(paraPdf(bloco.resumo));
      doc.moveDown(0.2);
      bloco.blocos.forEach((b) => desenharBloco(doc, b));
      break;
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const pronto = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).font("Helvetica-Bold").fillColor("#00674a").text("Manual de alimentação da plataforma");
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#666")
    .text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown(1);

  for (const bloco of MANUAL) {
    desenharBloco(doc, bloco);
  }

  doc.end();
  const buffer = await pronto;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="manual-plataforma.pdf"`,
    },
  });
}
