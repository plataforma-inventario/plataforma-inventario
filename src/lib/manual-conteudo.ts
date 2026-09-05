// Conteúdo único do manual de alimentação da plataforma (item pedido pelo
// usuário em 2026-09-05, pra deixar outra pessoa lançar dados no lugar dele
// nas férias). Usado tanto pela página /ajuda (renderiza em HTML) quanto
// pela rota /ajuda/export-pdf (renderiza com pdfkit) - um texto só, sem
// duplicar/arriscar as duas versões saírem diferentes uma da outra.

export type Bloco =
  | { tipo: "h2"; id: string; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "listaNumerada"; itens: string[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] }
  | { tipo: "aviso"; texto: string }
  | { tipo: "exemplo"; titulo: string; texto: string }
  // Um "cartão" recolhível por tipo de arquivo (seção 2) - o HTML renderiza
  // como <details> (fechado por padrão, pra não virar um paredão de texto);
  // o PDF renderiza tudo aberto (impresso não tem "clicar pra expandir").
  | {
      tipo: "arquivo";
      id: string;
      numero: string;
      titulo: string;
      formato: "CSV" | "PDF" | "XLS/XLSX";
      resumo: string;
      blocos: Bloco[];
    };

export const SECOES_TOC: { id: string; label: string }[] = [
  { id: "visao-geral", label: "1. Visão geral do fluxo" },
  { id: "tipos-arquivo", label: "2. Cada tipo de arquivo" },
  { id: "regras", label: "3. Regras importantes" },
  { id: "passo-a-passo", label: "4. Passo a passo" },
  { id: "agenda-visitas", label: "5. Agenda de visitas" },
  { id: "erros", label: "6. Se der erro" },
];

export const MANUAL: Bloco[] = [
  {
    tipo: "p",
    texto:
      "Este manual é pra quem vai lançar os arquivos na plataforma no lugar do responsável habitual (perfil Auditor) — cobre o fluxo inteiro, do login até o lançamento fechado, e o que fazer se algo der errado no caminho.",
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "visao-geral", texto: "1. Visão geral do fluxo" },
  {
    tipo: "p",
    texto:
      "Tudo começa quando uma loja faz um novo inventário físico (contagem). Esse é o momento certo de reunir e lançar de uma vez TODOS os arquivos daquele período — desde o fim do último lançamento fechado daquela loja até a data da nova contagem. Não lance arquivos aos poucos ao longo do mês; espere o inventário acontecer e junte tudo do período de uma vez.",
  },
  {
    tipo: "listaNumerada",
    itens: [
      "Na loja, entra em Lojas → clica na loja → \"+ Novo lançamento\". O sistema já detecta sozinho a data de início do período (fim do último lançamento fechado dessa loja).",
      "Você informa a data do novo inventário e o tipo (Cíclico ou Completo — ver seção 3).",
      "Abre a tela do lançamento, com um quadro para cada um dos 6 tipos de arquivo do período (inventário, transferência saída, transferência entrada, ajuste, requisição, faturamento).",
      "Envia cada arquivo no quadro certo (ou solta todos de uma vez na Central de Importação — ver seção 4).",
      "Quando os 6 quadros estiverem preenchidos e sem erro de leitura, o botão \"Fechar lançamento\" libera.",
      "Ao fechar, o sistema calcula sozinho a divergência do período (total, sacola/material auxiliar vs. resto, % sobre estoque e sobre faturamento) e o lançamento entra pro histórico da loja.",
    ],
  },
  {
    tipo: "aviso",
    texto:
      "Defeitos (notas de devolução) e Logística Reversa NÃO fazem parte desse fluxo por loja/período — são lançados à parte, em suas próprias abas, a qualquer momento (ver seção 2).",
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "tipos-arquivo", texto: "2. Cada tipo de arquivo" },
  {
    tipo: "p",
    texto:
      "Todos os arquivos abaixo são relatórios exportados direto do sistema da loja (RetaguardaGB) ou do Portal/Extranet do Grupo Boticário — ninguém digita esses arquivos na mão. O trabalho da pessoa que lança é só: exportar o relatório certo, do período certo, da loja certa, e soltar no lugar certo da plataforma. Não abra o CSV no Excel pra “arrumar” e salvar de novo antes de enviar — isso corrompe a acentuação (ver seção 6). Clique em cada card abaixo pra abrir os detalhes.",
  },

  {
    tipo: "arquivo",
    id: "arquivo-inventario",
    numero: "2.1",
    titulo: "Resultado do inventário",
    formato: "CSV",
    resumo: "Contagem física da loja (Congelado x Digitado)",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório de inventário do sistema da loja (contagem Congelado x Digitado)"],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Resultado do inventário\", ou Central de Importação"],
      ] },
      { tipo: "p", texto: "Colunas que o sistema lê desse relatório:" },
      { tipo: "tabela", cabecalho: ["Coluna no arquivo", "O que é"], linhas: [
        ["Código do Produto", "obrigatório — linha sem isso é ignorada"],
        ["Descrição do Produto", "nome do item"],
        ["Emb", "unidade de medida"],
        ["Congelado", "quantidade que o sistema esperava (estoque teórico)"],
        ["Digitado", "quantidade contada fisicamente"],
        ["Ajuste", "diferença entre contado e esperado"],
        ["Custo", "custo unitário"],
        ["Valor de Ajuste(R$)", "valor da divergência daquele item"],
        ["Valor de Estoque(R$)", "valor em estoque daquele item"],
        ["Loja", "usado pra identificar a loja automaticamente (Central de Importação)"],
        ["Tipo", "Cíclico ou Completo — informativo; o tipo que vale é o escolhido ao criar o lançamento"],
      ] },
      { tipo: "exemplo", titulo: "Exemplo de uma linha", texto: "Código do Produto;Descrição do Produto;Emb;Congelado;Digitado;Ajuste;Custo;Valor de Ajuste(R$);Valor de Estoque(R$);Loja\n52040;REF BOTI BABY LOC HID CPO 350ml;UN;12;10;-2;34,90;-69,80;349,00;11101 - Pruden" },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-transferencia-saida",
    numero: "2.2",
    titulo: "Notas fiscais de transferência de saída",
    formato: "CSV",
    resumo: "NFs de saída pra outra loja (CFOP 5152)",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório de \"notas fiscais de venda\" do sistema da loja, filtrado por CFOP 5152 (transferência entre lojas)"],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Notas fiscais de transferência de saída\", ou Central de Importação"],
      ] },
      { tipo: "tabela", cabecalho: ["Coluna no arquivo", "O que é"], linhas: [
        ["Número do Documento", "número da NF — obrigatório"],
        ["Data De Emissão", "obrigatório"],
        ["Cliente", "loja destino, no formato \"código - nome\""],
        ["Produto", "no formato \"código - descrição\""],
        ["Unidade de medida", "-"],
        ["Quantidade de itens", "-"],
        ["Valor unitário / Valor total do item", "-"],
        ["CFOP", "precisa ser 5152 — se for 5949/6949 é Logística Reversa, não este"],
        ["Loja", "usado pra identificar a loja automaticamente (Central de Importação)"],
      ] },
      {
        tipo: "aviso",
        texto:
          "Esse é o MESMO relatório usado em Logística Reversa (seção 2.9) — só o CFOP dentro do arquivo diferencia. A Central de Importação já separa sozinha; se for lançar manualmente pela tela do lançamento, confira que as notas ali são mesmo CFOP 5152.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-transferencia-entrada",
    numero: "2.3",
    titulo: "Notas fiscais de transferência de entrada",
    formato: "CSV",
    resumo: "NFs de entrada vindas de outra loja",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório de \"notas fiscais de compra\" do sistema da loja, com Operação = \"ENTRADA POR TRANSFERÊNCIA\""],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Notas fiscais de transferência de entrada\", ou Central de Importação"],
      ] },
      { tipo: "tabela", cabecalho: ["Coluna no arquivo", "O que é"], linhas: [
        ["Número do Documento", "número da NF — obrigatório"],
        ["Data De Emissão", "obrigatório"],
        ["Código do Fornecedor / Nome do Fornecedor", "loja de origem"],
        ["Código do produto / Descrição Produto", "-"],
        ["Unidade de medida / Quantidade de itens", "-"],
        ["Valor unitário / Valor total do item", "-"],
        ["Código da Loja", "usado pra identificar a loja automaticamente"],
        ["Operação", "precisa ser \"ENTRADA POR TRANSFERÊNCIA\" — se for \"DEVOLUÇÃO DE COMPRA\" é Defeito, não este"],
      ] },
      {
        tipo: "aviso",
        texto:
          "Esse é o MESMO relatório usado em Defeitos (seção 2.7) — só a coluna Operação diferencia. A Central de Importação já separa sozinha pelo conteúdo dessa coluna.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-ajuste",
    numero: "2.4",
    titulo: "Ajustes de entrada e de saída (mesmo CNPJ diferente)",
    formato: "PDF",
    resumo: "Movimentação entre CNPJs diferentes — entrada e saída no mesmo arquivo",
    blocos: [
      {
        tipo: "aviso",
        texto:
          "Entrada e saída de ajuste são UM SÓ arquivo/upload, não dois. O relatório do sistema já traz as duas direções misturadas (coluna interna \"Tipo Ajuste\": 1 = entrada, 2 = saída) e a plataforma separa sozinha.",
      },
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório \"Ajuste de Estoque - Analítico\" do sistema da loja, exportado filtrado por UMA loja e pelo período exato do lançamento"],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Ajustes de estoque (entrada e saída)\", ou Central de Importação"],
      ] },
      {
        tipo: "p",
        texto:
          "Ao exportar, confira no próprio relatório o filtro de \"Lojas\" (deve ser só a loja do lançamento) e o filtro de \"Data Movimentação\" (deve cobrir exatamente o período do lançamento) — o sistema lê essas informações direto do cabeçalho do PDF.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-requisicoes",
    numero: "2.5",
    titulo: "Requisições",
    formato: "CSV",
    resumo: "Demonstrador, brinde, vencido, premiação, perda/roubo, material auxiliar",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório de requisições do sistema da loja (demonstrador, brinde, vencido, premiação, perda/roubo, material auxiliar)"],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Requisições do período\" — ver aviso abaixo sobre a Central de Importação"],
      ] },
      { tipo: "tabela", cabecalho: ["Coluna no arquivo", "O que é"], linhas: [
        ["Número", "número da requisição — obrigatório"],
        ["Data Requisição", "obrigatório"],
        ["Produto", "no formato \"código - descrição\""],
        ["Motivo", "texto livre (ex.: \"1 - DEMONSTRADORES\", \"9 - PREMIAÇÃO\") — o sistema reconhece automaticamente as palavras DEMONSTRADOR, BRINDE, PERDA, ROUBO e PREMI dentro desse texto pras estatísticas"],
        ["Setor / Solicitante", "opcionais"],
        ["Unidade de Medida / Quantidade Atendida / Custo Total", "-"],
        ["Observação", "opcional — na premiação, é aqui que vem o nome/CPF da funcionária (ver Premiações no menu Requisições)"],
      ] },
      {
        tipo: "aviso",
        texto:
          "Esse relatório NUNCA traz o PDV da loja (regra do próprio sistema da loja, não é falha) — por isso, se você soltar SÓ o arquivo de Requisição na Central de Importação, ela não vai saber de qual loja é e vai pedir pra enviar pela tela do lançamento. Se você soltar a Requisição JUNTO com os outros arquivos do mesmo lote (inventário, transferências, ajuste, faturamento) na Central de Importação, o sistema infere a loja sozinho a partir dos outros arquivos.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-faturamento",
    numero: "2.6",
    titulo: "Faturamento do período",
    formato: "XLS/XLSX",
    resumo: "Receita líquida do período",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Relatório de faturamento (Receita Líquida) do sistema da loja"],
        ["Onde fazer upload", "Tela do lançamento da loja, quadro \"Faturamento do período\", ou Central de Importação"],
      ] },
      {
        tipo: "aviso",
        texto:
          "A planilha tem duas abas: uma com \"Relat\" no nome (os dados — o sistema soma o valor de cada linha de período que tiver rótulo na coluna B e valor na coluna C, ignorando as linhas de total) e outra com \"Parâmetro\"/\"Parametro\" no nome (só usada pra identificar a loja pelo PDV, numa linha que começa com \"Lojas\"). Como essa leitura é pela posição das colunas (não pelo nome), não reorganize ou reformate a planilha antes de enviar — envie exatamente como o sistema exportou.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-defeitos",
    numero: "2.7",
    titulo: "Notas fiscais de defeito",
    formato: "CSV",
    resumo: "NFs de devolução (defeito ou falta de mercadoria)",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Mesmo relatório de \"notas fiscais de compra\" da seção 2.3, com Operação = \"DEVOLUÇÃO DE COMPRA\""],
        ["Onde fazer upload", "Aba \"Defeitos\" (menu), quadro \"Relatório de devoluções (NF)\" — não está ligado a nenhum lançamento/período, pode enviar a qualquer momento"],
      ] },
      {
        tipo: "p",
        texto:
          "Colunas: Número do Documento, Código da Loja, Nome do Fornecedor, Data De Emissão, Valor Total (valor da NF inteira — vem repetido em toda linha do arquivo, o sistema já sabe que não é pra somar), Código do produto, Descrição Produto, Unidade de medida, Quantidade de itens, Valor total do item.",
      },
      {
        tipo: "p",
        texto:
          "Depois de lançado, classifique cada NF na própria tabela como \"Defeito\" ou \"Falta de mercadoria\" (dropdown na coluna Tipo) — isso não vem no arquivo, precisa ser feito manualmente.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-aviso-credito",
    numero: "2.8",
    titulo: "Aviso de Crédito",
    formato: "PDF",
    resumo: "Registra o reembolso do defeito sozinho",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Portal/Extranet do Grupo Boticário — o aviso de que o reembolso de uma ou mais NFs de devolução foi concedido"],
        ["Onde fazer upload", "Aba \"Defeitos\" (menu), quadro \"Aviso de Crédito (PDF)\", ao lado do upload das notas de devolução — também não depende de lançamento/período"],
      ] },
      {
        tipo: "p",
        texto:
          "O sistema lê direto do PDF: a data do aviso (linha \"dd/mm/aaaa\" no topo) e, pra cada linha de crédito (formato \"000000439-001 R$ 9,00 DEVOLUÇÃO DE MERCADORIA\"), o número da NF (sem os zeros à esquerda e sem o \"-001\" do fim — \"000000439-001\" vira \"439\") e o valor. Linhas com outro motivo (ex.: \"Lçto G/L Manual\") são ignoradas de propósito, só interessa \"DEVOLUÇÃO DE MERCADORIA\".",
      },
      {
        tipo: "p",
        texto:
          "Pra cada NF do PDF, o sistema procura um Defeito já lançado (seção 2.7) com o mesmo número de NF e preenche sozinho o valor reembolsado (somando se já tinha um reembolso parcial antes), a data e o status (Integral quando o total reembolsado atinge o valor enviado, Parcial caso contrário). Se a mesma NF existir em Defeitos de mais de uma loja, o sistema não arrisca adivinhar — avisa e ignora; nesse caso, reenvie o mesmo PDF escolhendo a loja certa no campo ao lado do botão de envio (em vez de \"Cruzar em todas as lojas\").",
      },
      {
        tipo: "p",
        texto:
          "O reembolso também pode ser editado manualmente a qualquer momento, direto na tabela de Defeitos: mude Status/Valor Reembolsado/Data na linha e clique Salvar — útil quando não há (ou ainda não chegou) o PDF do Aviso de Crédito daquele período.",
      },
    ],
  },

  {
    tipo: "arquivo",
    id: "arquivo-logistica-reversa",
    numero: "2.9",
    titulo: "Logística reversa",
    formato: "CSV",
    resumo: "Volume mensal de reciclagem, todas as lojas juntas",
    blocos: [
      { tipo: "tabela", cabecalho: ["", ""], linhas: [
        ["Vem de", "Mesmo relatório de \"notas fiscais de venda\" da seção 2.2, filtrado por CFOP 5949/6949 (material pós-consumo pra reciclagem)"],
        ["Onde fazer upload", "Aba \"Logística Reversa\" (menu)"],
      ] },
      {
        tipo: "aviso",
        texto:
          "Diferente de todos os outros: chega UMA VEZ POR MÊS, com TODAS as lojas juntas no mesmo arquivo (não é por loja/ciclo). Colunas: Documento, Loja (de qual loja é cada linha), Emissão, Valor (valor da NF inteira, repetido — o sistema já trata certo).",
      },
    ],
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "regras", texto: "3. Regras importantes" },
  {
    tipo: "lista",
    itens: [
      "Arquivo duplicado é bloqueado: o sistema identifica pelo conteúdo do arquivo (não só pelo nome) e nunca deixa importar o mesmo arquivo duas vezes — se aparecer esse aviso, é porque aquele arquivo já foi lançado antes, não precisa reenviar.",
      "Requisições nunca mostram o PDV da loja nas telas de relatório — só a razão social do grupo. Isso é assim de propósito (regra do próprio relatório de origem), não é erro nem falha de cadastro.",
      "Inventário Cíclico é o normal do mês a mês (só uma parte da loja, conforme o calendário fixo de rodízio). Inventário Completo é a loja inteira, e SEMPRE exige um motivo: Suspeita/diagnóstico de roubo, Inventário anual pós-Natal (janeiro), ou Outro (com descrição livre obrigatória).",
      "Dezembro não tem contagem cíclica agendada em nenhuma loja (foco no movimento de fim de ano) — se não aparecer alerta de atraso nesse mês, está certo, não é bug.",
      "Só é possível fechar um lançamento quando as 6 categorias (inventário, transferência saída, transferência entrada, ajuste, requisição, faturamento) estiverem enviadas e nenhuma com \"falha na leitura\".",
      "Defeitos e Logística Reversa não têm \"fechar lançamento\" — são lançados direto, a qualquer momento, sem depender de um período aberto.",
    ],
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "passo-a-passo", texto: "4. Passo a passo" },
  { tipo: "h3", texto: "Login" },
  { tipo: "p", texto: "Acesse o link da plataforma, informe e-mail e senha da conta que vai usar, e clique Entrar." },

  { tipo: "h3", texto: "Lançar os 6 arquivos de um período de uma loja" },
  {
    tipo: "listaNumerada",
    itens: [
      "No menu superior, clique em \"Lojas\".",
      "Clique na loja que fez o inventário.",
      "Clique em \"+ Novo lançamento\" (canto superior direito) — se já existir um lançamento em aberto dessa loja, entre nele direto pela lista da própria página da loja em vez de criar outro.",
      "Confirme a data do inventário, escolha o tipo (Cíclico ou Completo — se Completo, escolha também o motivo) e clique \"Iniciar lançamento\".",
      "Na tela do lançamento, em cada um dos 6 quadros: clique \"Escolher arquivo\", selecione o arquivo certo no computador, e clique \"Enviar\".",
      "Cada quadro mostra o resultado da leitura: \"✓ lido com sucesso\", \"⚠ lido com avisos\" (clique pra ver a lista de avisos) ou \"✗ falha na leitura\" (precisa reenviar).",
      "Repita pros 6 quadros.",
      "Quando os 6 estiverem OK, clique \"Fechar lançamento\".",
    ],
  },

  { tipo: "h3", texto: "Lançar vários arquivos de uma vez (Central de Importação)" },
  {
    tipo: "listaNumerada",
    itens: [
      "Crie primeiro o lançamento (\"+ Novo lançamento\") da loja, como acima — a Central de Importação só encaixa arquivos em lançamentos que já existem e estão abertos.",
      "No menu superior, clique em \"Central de importação\" (só aparece pro perfil Auditor).",
      "Clique em \"Escolher arquivo\" e selecione vários arquivos de uma vez (pode misturar CSV, PDF e XLS).",
      "Clique \"Importar\". O sistema mostra o resultado de cada arquivo (✓/⚠/✗) e em qual loja/categoria caiu.",
    ],
  },

  { tipo: "h3", texto: "Lançar um Defeito (nota de devolução)" },
  {
    tipo: "listaNumerada",
    itens: [
      "No menu superior, clique em \"Defeitos\".",
      "No quadro \"Relatório de devoluções (NF)\", clique \"Escolher arquivo\", selecione o CSV e clique \"Enviar\".",
      "Classifique cada NF na tabela como Defeito ou Falta de mercadoria.",
      "Pra registrar o reembolso: suba o PDF do Aviso de Crédito no quadro ao lado (escolhendo a loja certa se souber, ou deixando \"Cruzar em todas as lojas\"), ou edite manualmente Status/Valor/Data na linha da tabela e clique Salvar.",
    ],
  },

  { tipo: "h3", texto: "Lançar Logística Reversa" },
  {
    tipo: "listaNumerada",
    itens: [
      "No menu superior, clique em \"Logística Reversa\".",
      "Clique \"Escolher arquivo\", selecione o CSV mensal (todas as lojas juntas) e clique \"Enviar\".",
    ],
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "agenda-visitas", texto: "5. Agenda de visitas (print do calendário)" },
  {
    tipo: "p",
    texto:
      "Isso não é um dos arquivos do lançamento — é uma referência visual separada, em Calendário → Agenda de visitas (só Auditor), pra registrar o dia exato combinado com cada loja pra visita, no lugar da estimativa automática por mês que o Calendário mostra por padrão.",
  },
  {
    tipo: "listaNumerada",
    itens: [
      "Escolha o mês e o ano no topo da página e clique \"Ver\".",
      "Em \"Print de referência\", clique \"Escolher arquivo\", selecione a imagem (print de tela do Google Agenda daquele mês, qualquer formato de imagem) e clique \"Enviar imagem\" — só serve de referência visual, pode enviar mais de uma se precisar.",
      "Na tabela abaixo, pra cada loja (só aparecem as que têm ciclo de contagem definido), clique no campo de data e escolha o dia combinado — salva sozinho ao escolher a data, não tem botão \"Salvar\" separado.",
      "Esse dia digitado passa a aparecer no Calendário como \"(combinado)\" no lugar do mês estimado pelo cronograma fixo.",
    ],
  },

  // ---------------------------------------------------------------------
  { tipo: "h2", id: "erros", texto: "6. Se der erro" },
  { tipo: "tabela", cabecalho: ["Mensagem / situação", "O que fazer"], linhas: [
    ["\"Esse arquivo já foi importado antes (nome-do-arquivo)\"", "O arquivo já foi lançado — confira se é mesmo o período novo (às vezes a pessoa reexporta o mesmo relatório sem querer). Se for período diferente, exporte de novo do sistema da loja com o filtro de data certo."],
    ["\"Não identifiquei a loja automaticamente\" (Central de Importação)", "Envie esse arquivo pela tela do lançamento da loja certa (Lojas → loja → lançamento aberto) em vez da Central de Importação."],
    ["\"Loja com PDV X não encontrada no cadastro\"", "A loja ainda não está cadastrada — em Lojas, clique \"+ Nova loja\" e cadastre com o PDV certo antes de tentar de novo."],
    ["\"Loja X não tem lançamento em aberto\"", "Crie o lançamento primeiro (Lojas → loja → \"+ Novo lançamento\") antes de soltar arquivos na Central de Importação."],
    ["\"✗ falha na leitura\" num quadro de upload", "Geralmente é arquivo do formato/categoria errada (ex.: um PDF de Ajuste no quadro de Faturamento) ou um export incompleto — volte no sistema da loja e exporte o relatório de novo, com cuidado pra baixar o arquivo certo."],
    ["\"⚠ lido com avisos\"", "O arquivo foi aceito, mas alguma linha foi ignorada (sem produto, sem data válida etc.) — clique na lista de avisos pra ver quais linhas, e confira se faz sentido ignorá-las (às vezes é só uma linha de rodapé/total do relatório)."],
    ["Acentos estranhos (Ã©, Ã§Ã£o, etc.)", "O arquivo foi reaberto e resalvo no Excel antes de enviar — isso troca a codificação original e corrompe os acentos. Sempre envie o arquivo exportado direto do sistema, sem abrir/resalvar."],
    ["Botão \"Fechar lançamento\" não fica clicável", "Falta enviar algum dos 6 quadros, ou um deles ainda está com \"✗ falha na leitura\" — confira um por um."],
    ["Aviso de Crédito: \"NF encontrada em mais de uma loja\"", "A mesma NF existe em Defeitos de duas lojas diferentes — reenvie o mesmo PDF escolhendo a loja certa no campo do formulário de upload, em vez de \"Cruzar em todas as lojas\"."],
  ] },
  {
    tipo: "p",
    texto:
      "Se nada disso resolver, anote a mensagem de erro exata e o nome do arquivo — isso ajuda muito a diagnosticar rápido quando o responsável habitual voltar.",
  },
];
