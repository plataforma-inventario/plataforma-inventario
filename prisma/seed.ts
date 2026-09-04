import bcrypt from "bcryptjs";
import { PerfilAcesso, TipoLoja, TipoUnidade } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

// Dados de origem: "DADOS BOTICÁRIO 2025.xlsx", fornecido pelo usuário em
// 2026-09-04. Ordem das lojas dentro de cada grupo segue a planilha original,
// que já vem agrupada por região (Prudente, depois Dracena, depois Venceslau).

const REGIOES = ["Prudente", "Dracena", "Venceslau"] as const;

type LojaSeed = {
  pdv: number;
  nome: string;
  cnpj: string;
  tipoUnidade: TipoUnidade;
  regiao: (typeof REGIOES)[number] | null;
};

const FRANCISCO_NUNES: { nome: string; razaoSocial: string; lojas: LojaSeed[] } = {
  nome: "CP F Nunes",
  razaoSocial: "CP F NUNES",
  lojas: [
    { pdv: 14336, nome: "VD Prudente", cnpj: "11.847.600/0001-06", tipoUnidade: "MATRIZ", regiao: "Prudente" },
    { pdv: 22875, nome: "VD Venceslau", cnpj: "11.847.600/0004-59", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 24141, nome: "Dracena VD", cnpj: "11.847.600/0006-10", tipoUnidade: "FILIAL", regiao: "Dracena" },
    // Centro de Distribuição: unidade logística, não é ponto de venda regional.
    // Assumimos região Prudente por ser a sede física mais provável do grupo -
    // ajustar no cadastro se estiver incorreto.
    { pdv: 23338, nome: "Centro de Distribuição", cnpj: "11.847.600/0005-30", tipoUnidade: "FILIAL", regiao: "Prudente" },
  ],
};

const SHERLIN: { nome: string; razaoSocial: string; lojas: LojaSeed[] } = {
  nome: "CP SH Nunes",
  razaoSocial: "CP SH NUNES",
  lojas: [
    // Região Prudente (13 lojas)
    { pdv: 11101, nome: "Pruden", cnpj: "07.586.463/0001-26", tipoUnidade: "MATRIZ", regiao: "Prudente" },
    { pdv: 24145, nome: "Bernardes", cnpj: "07.586.463/0023-31", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24143, nome: "Pirapó", cnpj: "07.586.463/0028-46", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24146, nome: "Estrela Ana Jacinta", cnpj: "07.586.463/0022-50", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24150, nome: "Guanabara", cnpj: "07.586.463/0027-65", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24120, nome: "Muffato Max", cnpj: "07.586.463/0026-84", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24144, nome: "Regente", cnpj: "07.586.463/0031-41", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24152, nome: "Maffei", cnpj: "07.586.463/0025-01", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24151, nome: "Calçadão", cnpj: "07.586.463/0024-12", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24148, nome: "Machado", cnpj: "07.586.463/0021-70", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24142, nome: "Americanas", cnpj: "07.586.463/0029-27", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 24147, nome: "Anastácio", cnpj: "07.586.463/0030-60", tipoUnidade: "FILIAL", regiao: "Prudente" },
    { pdv: 22729, nome: "Assaí", cnpj: "07.586.463/0013-60", tipoUnidade: "FILIAL", regiao: "Prudente" },
    // Região Dracena (6 lojas)
    { pdv: 19142, nome: "Dracena Centro", cnpj: "07.586.463/0005-50", tipoUnidade: "FILIAL", regiao: "Dracena" },
    { pdv: 19144, nome: "Tupi Paulista", cnpj: "07.586.463/0006-30", tipoUnidade: "FILIAL", regiao: "Dracena" },
    { pdv: 19143, nome: "Junqueirópolis", cnpj: "07.586.463/0007-11", tipoUnidade: "FILIAL", regiao: "Dracena" },
    { pdv: 19141, nome: "Dracena Ikeda", cnpj: "07.586.463/0008-00", tipoUnidade: "FILIAL", regiao: "Dracena" },
    { pdv: 19145, nome: "Panorama", cnpj: "07.586.463/0009-83", tipoUnidade: "FILIAL", regiao: "Dracena" },
    { pdv: 19148, nome: "Paulicéia", cnpj: "07.586.463/0010-17", tipoUnidade: "FILIAL", regiao: "Dracena" },
    // Região Venceslau (7 lojas)
    { pdv: 22865, nome: "Pres. Epitácio", cnpj: "07.586.463/0020-99", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22876, nome: "Euclides da Cunha (TQT)", cnpj: "07.586.463/0019-55", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22873, nome: "Mirante", cnpj: "07.586.463/0017-93", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22872, nome: "Primavera", cnpj: "07.586.463/0018-74", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22871, nome: "Teodoro Sampaio", cnpj: "07.586.463/0016-02", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22874, nome: "Pres. Venceslau (Pinheirão)", cnpj: "07.586.463/0015-21", tipoUnidade: "FILIAL", regiao: "Venceslau" },
    { pdv: 22864, nome: "Pres. Venceslau", cnpj: "07.586.463/0014-40", tipoUnidade: "FILIAL", regiao: "Venceslau" },
  ],
};

async function seedGrupo(
  grupoData: { nome: string; razaoSocial: string; lojas: LojaSeed[] },
  tipoLoja: TipoLoja
) {
  const grupo = await prisma.grupo.upsert({
    where: { nome: grupoData.nome },
    update: { razaoSocial: grupoData.razaoSocial },
    create: { nome: grupoData.nome, razaoSocial: grupoData.razaoSocial },
  });

  for (const loja of grupoData.lojas) {
    const regiao = loja.regiao
      ? await prisma.regiao.upsert({
          where: { nome: loja.regiao },
          update: {},
          create: { nome: loja.regiao },
        })
      : null;

    await prisma.loja.upsert({
      where: { pdv: loja.pdv },
      update: {
        nome: loja.nome,
        cnpj: loja.cnpj,
        tipoUnidade: loja.tipoUnidade,
        tipoLoja,
        grupoId: grupo.id,
        regiaoId: regiao?.id ?? null,
      },
      create: {
        pdv: loja.pdv,
        nome: loja.nome,
        cnpj: loja.cnpj,
        tipoUnidade: loja.tipoUnidade,
        tipoLoja,
        grupoId: grupo.id,
        regiaoId: regiao?.id ?? null,
      },
    });
  }
}

async function main() {
  // Grupo Francisco Nunes: revenda, exceto o Centro de Distribuição (logística).
  await seedGrupo(FRANCISCO_NUNES, TipoLoja.REVENDA);
  await prisma.loja.update({
    where: { pdv: 23338 },
    data: { tipoLoja: TipoLoja.LOGISTICA },
  });

  // Grupo Sherlin/SH Nunes: todo o grupo é varejo.
  await seedGrupo(SHERLIN, TipoLoja.VAREJO);

  // Usuário administrador inicial (perfil Auditor). Senha temporária gerada
  // apenas na primeira vez que este usuário é criado — trocar após o login.
  const ADMIN_EMAIL = "glogistica@grupocpnunes.com";
  const adminExistente = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!adminExistente) {
    const senhaTemporaria = "F7eKLKbUhnYshr";
    await prisma.user.create({
      data: {
        nome: "Administrador",
        email: ADMIN_EMAIL,
        senhaHash: await bcrypt.hash(senhaTemporaria, 12),
        perfil: PerfilAcesso.AUDITOR,
      },
    });
    console.log(`Usuário admin criado: ${ADMIN_EMAIL} / senha temporária: ${senhaTemporaria}`);
  }

  const total = await prisma.loja.count();
  console.log(`Seed concluído: ${total} lojas cadastradas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
