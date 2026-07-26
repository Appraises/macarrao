# Plano de desenvolvimento: painel, LGPD e paginacao

## Objetivo

Entregar, de ponta a ponta:

1. gerenciamento administrativo de noticias, jogos, mapas, campeonatos e e-sports;
2. exclusao de conta, exportacao de dados e tratamento administrativo de solicitacoes LGPD;
3. paginacao nos endpoints de termos, noticias e usuarios;
4. revisao final de seguranca, integridade, experiencia de uso e operacao.

Este documento e o checklist autoritativo da implementacao. Um item so pode ser
marcado como concluido quando houver codigo, migracao quando necessaria, testes e
validacao do fluxo correspondente.

## Decisoes de arquitetura

- Endpoints publicos permanecem nos recursos atuais (`/terms`, `/news`, `/games`,
  `/maps` e `/esports`).
- Operacoes administrativas novas ficam sob `/dashboard`, que ja aplica
  autenticacao e autorizacao de administrador no router inteiro.
- Listagens paginadas usam um unico contrato e limites defensivos.
- Exclusoes de conteudo referenciado priorizam arquivamento; exclusao definitiva
  exige validacao de dependencias.
- Alteracoes administrativas e LGPD geram trilha de auditoria.
- Operacoes que alteram agregados, como mapa + callouts e campeonato + fases,
  usam transacao no banco.
- HTML editorial continua sendo sanitizado no servidor na escrita e na leitura.

## Contrato de paginacao

Parametros:

- `page`: inteiro a partir de 1, padrao 1;
- `pageSize`: inteiro entre 1 e 100, padrao 20;
- `search`: busca textual opcional;
- `sort`: campo permitido por endpoint;
- `order`: `asc` ou `desc`;
- filtros especificos do recurso.

Resposta:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

Toda ordenacao deve ter `id` como segundo criterio para evitar repeticao ou perda
de registros entre paginas.

## Etapa 1 - Fundacao e paginacao

Status: CONCLUIDA

### Backend

- [x] Criar helper tipado para validar parametros e montar metadados.
- [x] Paginar `GET /terms` com busca, jogo, verificacao e ordenacao.
- [x] Paginar `GET /news` com busca, categoria e ordenacao.
- [x] Paginar `GET /dashboard/users` com busca e filtro de funcao.
- [x] Adicionar indices adequados no Prisma.
- [x] Manter transicao compativel para consumidores ainda nao migrados.

### Frontend

- [x] Criar tipos `PaginatedResponse` e `PaginationMeta`.
- [x] Migrar paginas publicas e administrativas que consomem os endpoints.
- [x] Adicionar controles de pagina, quantidade, carregamento e estado vazio.
- [x] Preservar busca, filtros e pagina atual na URL do dashboard.

### Aceite

- [x] Nenhum dos tres endpoints busca a tabela inteira quando paginacao e usada.
- [x] Parametros invalidos retornam `400`.
- [x] `pageSize` acima de 100 e rejeitado.
- [x] Totais e navegacao permanecem corretos com filtros.
- [x] Testes cobrem primeira pagina, ultima pagina, filtros e valores invalidos.

### Evidencias da etapa 1

- Migracao `20260713170000_add_pagination_indexes` aplicada no PostgreSQL local.
- APIs verificadas contra dados reais para termos, noticias e usuarios autenticados.
- Suite com 27 testes passando, incluindo parser e contratos HTTP paginados.
- Builds de backend e frontend concluidos sem erro.
- Navegacao, busca e tamanho de pagina validados no browser.
- Dashboard corrigido para ocupar toda a largura no mobile e usar menu lateral recolhivel.

## Etapa 2 - Noticias

Status: CONCLUIDA

### Dados e API

- [x] Adicionar `slug`, status editorial, publicacao e agendamento.
- [x] Adicionar titulo e descricao de SEO.
- [x] Manter CRUD administrativo, upload e sanitizacao existentes.
- [x] Adicionar filtros por status, categoria, autor e periodo.
- [x] Registrar publicacao, edicao, arquivamento e exclusao na auditoria.

### Painel

- [x] Separar rascunhos, agendadas, publicadas e arquivadas.
- [x] Permitir salvar rascunho, publicar, agendar, duplicar e arquivar.
- [x] Exibir preview seguro e validacao de SEO.
- [x] Tratar imagem quebrada e substituicao de upload.

### Aceite

- [x] Noticia nao publicada nao aparece na API publica.
- [x] Agendamento respeita data e fuso configurados.
- [x] Slug e unico e URLs antigas nao quebram durante a migracao.
- [x] XSS permanece bloqueado na criacao, edicao e leitura.

## Etapa 3 - Jogos

Status: CONCLUIDA

### Dados e API

- [x] Adicionar descricao, estado de publicacao e arquivamento quando necessario.
- [x] Criar CRUD administrativo paginado em `/dashboard/games`.
- [x] Validar nome, slug, genero e imagens.
- [x] Impedir exclusao definitiva quando houver termos, mapas ou favoritos.
- [x] Registrar alteracoes na auditoria.

### Painel

- [x] Criar listagem com busca, genero e estado.
- [x] Criar formulario de cadastro e edicao com preview de imagem.
- [x] Exibir dependencias antes de arquivar ou excluir.

### Aceite

- [x] Apenas administradores alteram jogos.
- [x] Slugs duplicados sao recusados.
- [x] Arquivamento nao remove termos e mapas existentes.

## Etapa 4 - Mapas

Status: CONCLUIDA

### Dados e API

- [x] Criar CRUD administrativo em `/dashboard/maps`.
- [x] Validar jogo, nome, imagens e callouts.
- [x] Garantir coordenadas entre 0 e 100 e tipos permitidos.
- [x] Adicionar unicidade de nome por jogo.
- [x] Salvar mapa e callouts em transacao.

### Painel

- [x] Criar listagem filtrada por jogo.
- [x] Criar upload das imagens artistica e tatica.
- [x] Criar editor visual de callouts com clique, arraste e remocao.
- [x] Exibir preview nas mesmas proporcoes do mapa publico.

### Aceite

- [x] Falha em um callout nao deixa mapa parcialmente atualizado.
- [x] Exclusao do mapa remove callouts e arquivos locais relacionados.
- [x] Editor funciona com mouse e teclado.

### Evidencias das etapas 2 a 4

- Migracao `20260713190000_add_content_management` aplicada no PostgreSQL local.
- CRUDs administrativos, upload tipado e auditoria implementados para os tres recursos.
- APIs publicas verificadas contra o banco: rascunhos ocultos e publicados visiveis.
- Editor de callouts validado no browser com criacao e persistencia de marcador.
- Dashboard conferido em desktop e viewport mobile de 390 x 844.
- TypeScript e build do backend sem erros; suite com 31 testes passando.

## Etapa 5 - Campeonatos

Status: CONCLUIDA

### Dados e API

- [x] Relacionar campeonato a `Game` por `gameId`.
- [x] Migrar datas textuais para `DateTime`.
- [x] Normalizar status e adicionar slug/publicacao.
- [x] Criar CRUD de dados gerais, equipes, classificacao, chaveamento e stats.
- [x] Proteger atualizacoes compostas com transacao.

### Painel

- [x] Criar editor em abas: geral, equipes, tabela, chave e estatisticas.
- [x] Validar colocacoes, confrontos, vencedores e placares.
- [x] Permitir duplicar a estrutura de um campeonato anterior.

### Aceite

- [x] Campeonato incompleto pode existir como rascunho sem aparecer publicamente.
- [x] Equipes removidas nao deixam partidas e classificacoes inconsistentes.
- [x] Chaveamento e classificacao continuam legiveis em desktop e mobile.

## Etapa 6 - E-sports

Status: CONCLUIDA

### Dados e API

- [x] Criar entidades administrativas para equipes e jogadores.
- [x] Relacionar partidas e rankings a jogos/equipes.
- [x] Unificar noticias de e-sports com o fluxo editorial principal.
- [x] Criar CRUD de partidas, rankings, jogadores e estatisticas.
- [x] Manter leaderboard de Pick'em somente leitura ate existir regra de negocio.

### Painel

- [x] Criar secoes de equipes, jogadores, partidas e rankings.
- [x] Permitir atualizacao rapida de placar e status ao vivo.
- [x] Validar conflitos de horario e equipes repetidas na mesma partida.

### Aceite

- [x] Dados publicos deixam de depender de nomes duplicados e inconsistentes.
- [x] Uma partida ao vivo pode ser atualizada sem editar o campeonato inteiro.
- [x] Rankings nao aceitam duas equipes na mesma posicao para o mesmo jogo.

### Evidencias das etapas 5 e 6

- Migracoes de normalizacao e conteudo unificado aplicadas sem diff residual.
- Todos os 4 campeonatos, 15 partidas e 8 rankings legados vinculados por IDs.
- Ciclo real criou equipes, jogador, campeonato, partida e ranking, atualizou placar
  ao vivo, publicou o campeonato e removeu os dados temporarios em ordem relacional.
- Rascunho oculto e publicacao visivel confirmados pela API publica.
- Editores de campeonato e e-sports validados em desktop e mobile no browser.
- Frontend e backend compilam; suite com 36 testes passando.

## Etapa 7 - LGPD e ciclo de conta

Status: CONCLUIDA

### Dados e API

- [x] Criar `PrivacyRequest`, eventos imutaveis e auditoria administrativa.
- [x] Criar exportacao autenticada, excluindo senhas, hashes e tokens.
- [x] Criar solicitacao de exclusao com senha e confirmacao por e-mail.
- [x] Anonimizar autoria quando o conteudo comunitario precisar ser preservado.
- [x] Remover votos e demais dados sem necessidade de conservacao.
- [x] Invalidar sessoes e tokens ao concluir a exclusao.

### Painel do usuario

- [x] Adicionar "Exportar meus dados" e "Excluir minha conta".
- [x] Mostrar estado e protocolo da solicitacao.
- [x] Permitir cancelar antes da confirmacao/execucao.

### Painel administrativo

- [x] Listar solicitacoes com tipo, estado, prazo e responsavel.
- [x] Exibir timeline e registrar justificativa de atendimento ou negativa.
- [x] Permitir concluir exportacao, correcao, anonimizacao e exclusao.
- [x] Enviar atualizacoes por e-mail sem expor dados sensiveis.

### Aceite

- [x] Exportacao inclui todos os dados pessoais previstos e nenhum segredo.
- [x] Exclusao nao falha por restricao relacional.
- [x] Conteudo preservado deixa de identificar o titular.
- [x] Toda acao administrativa possui ator, data e resultado auditavel.

### Evidencias da etapa 7

- Migracoes `20260713210000_add_privacy_requests` e
  `20260713211000_add_privacy_request_note` aplicadas no PostgreSQL local.
- Exportacao usa selecao explicita e foi verificada sem senha, tokens de
  verificacao/recuperacao ou versao de sessao.
- Confirmacao armazena apenas SHA-256, expira em 24 horas e recalcula o prazo de
  atendimento para 15 dias.
- Transicoes, cancelamento e conclusao usam atualizacoes condicionais atomicas.
- Integracao real percorreu `CANCELED`, `CONFIRMED`, `IN_REVIEW`, `PROCESSING` e
  `COMPLETED`, registrou cinco eventos e rejeitou o token antigo com `403`.
- Painel do titular e fila administrativa verificados em desktop e 390 x 844;
  os dados temporarios foram removidos e a auditoria SQL confirmou zero QA.

## Etapa 8 - Revisao final

Status: CONCLUIDA

- [x] Revisar autorizacao de toda rota de escrita.
- [x] Revisar validacao, sanitizacao, uploads e limites de corpo.
- [x] Rodar migracoes sobre copia do banco e validar rollback.
- [x] Rodar testes unitarios, integrados e fluxos E2E.
- [x] Verificar dashboard em desktop e mobile.
- [x] Verificar estados de loading, vazio, erro e concorrencia.
- [x] Atualizar `.env.example`, documentacao operacional e politica de privacidade.
- [x] Executar auditoria requisito por requisito antes de declarar conclusao.

### Evidencias da etapa 8

- Router `/dashboard` aplica autenticacao e funcao administrativa antes de todos
  os routers de escrita; as escritas do titular exigem sua propria sessao.
- Corpo JSON limitado a 1 MB; uploads limitados a 5/8 MB, com quantidade,
  assinatura binaria, pasta e extensao controladas.
- Noticias sanitizadas na escrita e leitura; perfil, comentarios, termos,
  denuncias e chamadas de IA possuem limites e normalizacao de texto.
- As 16 migracoes foram aplicadas em banco temporario vazio; dump customizado de
  76.328 bytes foi restaurado e `prisma migrate status` permaneceu atualizado.
  Banco e dump temporarios foram apagados.
- Auditoria SQL final: 4 campeonatos, 15 partidas e 8 rankings integralmente
  relacionados; zero comentarios orfaos e zero contas/pedidos de QA.
- Procedimentos de deploy, backup/restauracao, segredos, email e LGPD registrados
  em `docs/OPERACAO.md`.
- Gate final: 8 arquivos de teste e 47 casos passando; builds SSG e backend,
  `tsc --noEmit`, `prisma validate`, `migrate status` e diff do schema aprovados.

## Ordem de entrega

1. Fundacao e paginacao.
2. Noticias, jogos e mapas.
3. Campeonatos e e-sports.
4. LGPD e ciclo de conta.
5. Revisao final e rollout.

## Evidencias de conclusao

Ao final de cada etapa devem ser registrados neste arquivo:

- migracoes aplicadas;
- endpoints implementados;
- telas entregues;
- testes executados e resultado;
- validacao manual realizada;
- riscos ou pendencias remanescentes.
