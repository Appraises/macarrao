# Operacao de e-sports

O backend e a unica fonte publica de dados de e-sports. O navegador nao recebe chaves de provedores e nao consulta APIs externas diretamente.

## Provedor

A integracao principal usa a API LPDB v3 da Liquipedia. E necessario solicitar uma chave, respeitar os termos de uso, manter o cache local e exibir a atribuicao CC BY-SA. Configure `LIQUIPEDIA_API_KEY`, `LIQUIPEDIA_USER_AGENT` e os wikis desejados no `server/.env`.

Sem uma chave configurada, o agendador registra a rodada como `SKIPPED` e mantem somente conteudo editorial criado no painel. Nenhum dado demonstrativo e gerado.

## Foco Brasil

Uma partida entra no banco quando ao menos uma destas condicoes e verdadeira:

- uma equipe possui pais `BR`;
- uma equipe esta na allowlist `ESPORTS_FOCUS_TEAMS`;
- campeonato, etapa ou rodada contem uma palavra de `ESPORTS_FOCUS_KEYWORDS`.

Revise as duas listas conforme novas ligas e equipes brasileiras surgirem. O feed publico aplica `isBrazilFocused=true` por padrao.

## Sincronizacao

O servidor sincroniza ao iniciar e depois a cada `ESPORTS_SYNC_INTERVAL_MINUTES`. O painel tambem pode iniciar uma rodada manual em `POST /dashboard/esports/sync` e consultar o historico em `GET /dashboard/esports/sync`.

Cada rodada grava quantos registros foram recebidos, aceitos e atualizados. Partidas alteradas atualizam chaveamento, classificacao calculada e pontuacao do Pick'em, e publicam o evento Socket.IO `esports:update`.

## Pick'em

Palpites exigem login e ficam vinculados ao usuario, campeonato e partida. Eles podem ser alterados ate o horario marcado da partida. Um acerto vale 10 pontos; empates ou palpites incorretos valem zero.
