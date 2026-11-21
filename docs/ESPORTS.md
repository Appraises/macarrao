# Operacao de e-sports

O backend e a unica fonte publica de dados de e-sports. O navegador nao recebe chaves de provedores e nao consulta APIs externas diretamente.

## Provedores

PandaScore complementa a cobertura da Liquipedia. Configure `PANDASCORE_TOKEN` no ambiente do backend; a credencial nunca e enviada ao navegador. Por padrao, a integracao consulta CS2, Valorant e LoL. Torneios de nivel S/A entram no feed; niveis B, ate o limite configurado, entram quando tem foco brasileiro. Partidas canceladas, sem duas equipes definidas ou sem nivel ficam de fora. O conteudo exibido recebe a atribuicao exigida: **Source: PandaScore**.

Os limites podem ser ajustados com `PANDASCORE_GAMES`, `PANDASCORE_MIN_TIER` e `PANDASCORE_BR_MIN_TIER`. O sincronizador mantem rodadas por provedor e uma falha da PandaScore nao interrompe a Liquipedia.

A integracao principal usa a API LPDB v3 da Liquipedia. E necessario solicitar uma chave, respeitar os termos de uso, manter o cache local e exibir a atribuicao CC BY-SA. Configure `LIQUIPEDIA_API_KEY`, `LIQUIPEDIA_USER_AGENT` e os wikis desejados no `server/.env`.

Sem uma chave configurada, o agendador registra a rodada como `SKIPPED` e mantem somente conteudo editorial criado no painel. Nenhum dado demonstrativo e gerado.

## Foco Brasil

Uma partida entra no banco quando ao menos uma destas condicoes e verdadeira:

- uma equipe possui pais `BR`;
- uma equipe esta na allowlist `ESPORTS_FOCUS_TEAMS`;
- campeonato, etapa ou rodada contem uma palavra de `ESPORTS_FOCUS_KEYWORDS`.

Revise as duas listas conforme novas ligas e equipes brasileiras surgirem. O feed publico inclui os torneios filtrados dos provedores; `?focus=br` restringe a cobertura a partidas e campeonatos com foco brasileiro.

## Sincronizacao

O servidor sincroniza ao iniciar e depois a cada `ESPORTS_SYNC_INTERVAL_MINUTES`. O painel tambem pode iniciar uma rodada manual em `POST /dashboard/esports/sync` e consultar o historico em `GET /dashboard/esports/sync`.

Cada rodada grava quantos registros foram recebidos, aceitos e atualizados. Partidas alteradas atualizam chaveamento, classificacao calculada e pontuacao do Pick'em, e publicam o evento Socket.IO `esports:update`.

## Pick'em

Palpites exigem login e ficam vinculados ao usuario, campeonato e partida. Eles podem ser alterados ate o horario marcado da partida. Um acerto vale 10 pontos; empates ou palpites incorretos valem zero.
