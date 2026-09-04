# Briefing — Plataforma de Gestão de Inventário e Movimentação de Estoque

> Documento de requisitos original, fornecido pelo usuário em 2026-09-04, como ponto de partida do projeto. Serve de referência viva: atualizar aqui conforme decisões forem tomadas ao longo do desenvolvimento.

## Visão geral
Aplicação web (acesso via link, com login/senha) para centralizar a auditoria de estoque de ~30 lojas O Boticário (varejo e revenda) na região de Alta Sorocabana/SP, hoje controlada manualmente em planilhas.

**Decisão de arquitetura:** sistema de uso contínuo por vários anos. Banco de dados com histórico contínuo por data (nunca particionado por ano). Na UI, navegação por ano (abas/seletor) — só aparece a partir do momento em que existir mais de um ano de dados (2027 é o primeiro ano).

## 1. Autenticação e Perfis de Acesso
Login usuário/senha. Perfis:
- **Auditor (admin):** acesso total, todas as lojas/módulos; único que cadastra/lança dados.
- **Diretoria:** acesso total, somente leitura.
- **Gerente comercial — Varejo:** só lojas de varejo sob sua gestão.
- **Gerente comercial — Revenda:** só lojas de revenda sob sua gestão.
- **Logística / CD:** foco em Transferências, Ajustes e Logística Reversa; acesso amplo às lojas, mas Requisições/Defeitos podem ficar ocultos.

Cada loja é vinculada a um ou mais gerentes responsáveis (define o filtro de acesso automaticamente).

## 2. Módulo Lojas

### 2.0 Hierarquia Organizacional
Grupo (CNPJ) → Região → Loja (PDV).
- **Grupo Francisco Nunes** (CNPJ revenda/logística): Região Prudente (loja revenda), Região Dracena (loja revenda), Região Venceslau (loja revenda), Logístico (Centro de Distribuição).
- **Grupo Sherlin / SH Nunes** (CNPJ varejo): Região Prudente (13 lojas), Região Dracena (6 lojas), Região Venceslau (7 lojas).

Loja identificada por número de PDV + nome, pertence a um Grupo e Região fixos no cadastro (herdados automaticamente ao lançar dados — item 2.1). Permite agrupar relatórios por região ou grupo/CNPJ.

Cadastro de loja: PDV, nome, grupo, região, tipo (varejo/revenda), ciclo de contagem (mensal/bimestral/trimestral, configurável por loja), gerente(s) responsável(is).
Página própria por loja: histórico de inventários, gráfico de evolução de divergência, melhor/pior inventário.

### 2.1 Fluxo de Alimentação de Dados (núcleo do sistema)
Ao registrar novo inventário de uma loja:
1. Sistema identifica automaticamente a data do inventário anterior dessa loja.
2. Abre tela única de lançamento cobrindo o período (inventário anterior → atual), com upload CSV e/ou PDF por categoria:
   - Resultado do inventário (contagem)
   - NFs de transferência de saída no período
   - NFs de transferência de entrada no período
   - Ajustes de entrada (movimentação entre CNPJs diferentes, sem NF)
   - Ajustes de saída
   - Requisições do período (demonstrador, brinde, vencido, premiação, perda/roubo, material auxiliar)
   - Faturamento do período (para % de divergência sobre faturamento)
3. Ao fim, roda automaticamente o cruzamento de divergências (item 5) sobre o período fechado.
4. Ciclo fica "fechado", entra no histórico/dashboards da loja.

Vale para varejo e revenda igualmente.

## 3. Módulo Inventários

### 3.0 Tipo e Motivo do Inventário
- **Cíclico (parcial):** cobre só os itens do setor/curva do ciclo (metodologia de 6 setores rotativos).
- **Completo (loja inteira):** conta tudo, sem exceção. Campo de motivo obrigatório:
  - Suspeita/diagnóstico de roubo (fora do calendário normal, loja específica)
  - Inventário anual pós-Natal (janeiro) — todas as lojas, para regularizar após o pico de dezembro
  - Campo aberto para outros motivos
- Diferenciar visualmente nos gráficos: inventário completo (evento pontual/motivado) vs. ciclo normal.
- **Dezembro:** nenhuma loja tem inventário cíclico agendado (foco em vendas). Alerta de atraso (10.1) não dispara em dezembro.
- Cálculo automático de divergência em R$ e % (geral + separado sacola/material auxiliar vs. resto).
- Filtros: loja, mês, PDV, ciclo, tipo de loja.
- Comparativo entre ciclos da mesma loja ao longo do tempo.

### 3.1 Ranking entre Lojas
Ranking por % de divergência, valor R$, tendência (melhorando/piorando).

## 4. Módulo Ajustes (CNPJs diferentes)
Relatório de itens que saíram/entraram por ajuste, por loja e período, com totais de valor.

## 5. Módulo Transferências (mesmo CNPJ)
Documentos fiscais de saída/entrada (matriz↔filial), totais de valor movimentado.

### 5.1 Detecção de Movimentação Não Registrada
Cruzamento automático: item faltando numa loja + sobrando em outra, mesmo período, sem ajuste/transferência que explique.
- **Cruzamento considera TODAS as lojas do sistema**, não só da mesma região (transferências acontecem entre regiões diferentes). Região/grupo serve para organizar/filtrar relatórios, não para restringir esse cruzamento.
- 1 item envolvido → "suspeita".
- Vários itens com quantidades batendo (-5 numa loja, +5 noutra) → "provável transferência não registrada" (alta confiança).
- Aba própria de divergências cruzadas, com nível de confiança.

## 6. Módulo Requisições (Consumo)
Por loja e ciclo: demonstradores, brindes, vencidos, premiações, perda e roubo, material auxiliar (sacola, flaconete etc.).

**Regra de exibição importante:** diferente de Inventário/Transferência/Ajuste (que sempre mostram o PDV), o relatório de Requisição **nunca exibe o PDV** — só a razão social. Internamente o sistema vincula a requisição ao PDV correto automaticamente (arquivos do mesmo ciclo são enviados juntos no mesmo lançamento — item 2.1).

## 7. Módulo Defeitos
NF de defeito (loja, data, valor, itens) → status do reembolso (pendente/parcial/integral) → valor reembolsado vs. enviado. Análise de tempo médio de reembolso (envio → recebimento), por loja e geral.

## 8. Logística Reversa
Volume/valor enviado por loja e por mês.

### 8.1 Análise por Item (SKU) — Ranking de Itens Problemáticos
Visão transversal do mesmo SKU em todos os módulos simultaneamente:
- Divergência de inventário (quantas lojas/PDVs, quanto)
- Ocorrências em defeito
- Ocorrências em requisição de demonstrador
- Ocorrências em brinde
- Ocorrências em perda/roubo
- Ocorrências nas divergências cruzadas suspeitas (5.1)

Saída: ranking de itens mais problemáticos (soma do "peso" em todas as categorias, não só divergência de inventário isolada). Filtrável por loja, tipo de loja, período. Objetivo: identificar itens estruturalmente mal controlados (ex: sempre usado como demonstrador e nunca baixado) vs. divergência real de estoque.

## 9. Dashboards e Filtros
Gráficos por loja e consolidados. Filtros cruzáveis: mês, loja, tipo de loja, PDV, ciclo, tipo de movimentação. Abas: Lojas | Inventários | Ranking | Ajustes | Transferências | Requisições | Defeitos | Logística Reversa.

## 10. Importação de Dados
Upload de CSV e PDF alimentando cada categoria do fluxo (2.1). Padrão de colunas esperado por tipo de arquivo (a definir/validar).

**Bloqueio de arquivo duplicado:** não pode importar o mesmo arquivo duas vezes (identificar por nome + hash do conteúdo, ou combinação loja+período+tipo de arquivo já existente). Se detectar duplicidade, bloquear e avisar claramente — nunca ignorar silenciosamente.

## 11. Melhorias Adicionais

**10.1 Alerta de inventário atrasado** — avisa quando o ciclo de uma loja está vencendo/venceu (com base no ciclo configurado) e ainda não teve inventário lançado. Não dispara em dezembro.

**10.2 Metas de divergência** — limite aceitável de divergência por loja (% e/ou R$), **editável pela Diretoria/Admin** (não é valor fixo no sistema). Loja acima do limite → sinalização visual (ex: vermelho no dashboard/ranking).

**10.3 Campo de observação/contexto** — texto livre por inventário lançado (ex: "loja em reforma", "trocou de gerente").

**10.4 Relatório exportável para diretoria** — gerar PDF/Excel a partir de dashboards/rankings, pronto para apresentação.

**10.5 Log de alterações** — toda edição em dado já lançado registra quem, quando, e motivo (justificativa obrigatória).

**10.6 Calendário de visitas** — visão de calendário/lista com lojas próximas do vencimento do ciclo, para planejar rota de visitas.

## Decisões técnicas (registradas conforme tomadas)

- **2026-09-04 — Hospedagem:** usuário pediu opção sem custo. Decisão: stack de custo zero via free tiers (Cloudflare Pages/Workers para o app Next.js, Neon para Postgres, Cloudflare R2 para armazenamento de arquivos). Risco aceito conscientemente: sem SLA/suporte pago, limites de uso que podem exigir upgrade no futuro, backups precisam ser configurados manualmente.
- **2026-09-04 — PDFs:** confirmado que os PDFs enviados (NFs, requisições etc.) são nativos/digitais (gerados por sistema, texto selecionável), não escaneados. Parsing pode confiar em extração de texto estruturado (ex: pdf-parse), sem necessidade de OCR.
