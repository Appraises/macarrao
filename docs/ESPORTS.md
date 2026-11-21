# Operacao de e-sports

O backend e a unica fonte publica de dados de e-sports. O navegador nao recebe chaves de provedores e nao consulta APIs externas diretamente.

## Provedores

Os provedores configurados rodam em sequencia a cada `ESPORTS_SYNC_INTERVAL_MINUTES`, cada um com sua propria rodada em `EsportsSyncRun`. A falha de um nao interrompe o outro.

### PandaScore

Fonte principal para CS2, Valorant, LoL e, opcionalmente, Dota 2 (`PANDASCORE_GAMES`). Configure `PANDASCORE_TOKEN` no `server/.env`. O token e privado e nunca chega ao navegador.

A PandaScore lista qualquer qualificatoria e copa amadora, entao o feed e filtrado antes de gravar:

1. a API e consultada apenas para torneios com `filter[tier]` ate `PANDASCORE_BR_MIN_TIER` (padrao `s,a,b`), em andamento, nos proximos 14 dias ou encerrados nos ultimos 3 dias; depois, so as partidas desses torneios;
2. torneios de nivel `PANDASCORE_MIN_TIER` ou acima (padrao S e A) entram sempre;
3. niveis abaixo entram somente com time brasileiro, organizacao listada em `ESPORTS_FOCUS_TEAMS` ou liga com palavra de `ESPORTS_FOCUS_KEYWORDS`;
4. partidas canceladas, sem dois times definidos ou de torneios sem nivel ficam de fora.

O evento (a "serie" da PandaScore, como `IEM Rio 2026`) vira o campeonato do site; a etapa (grupos, playoffs) vira a fase da partida. Logos de times usam a versao para fundo escuro quando existe; escudos locais em `public/esports/teams` continuam tendo prioridade. A transmissao preferida e a oficial em portugues.

Uma rodada faz cerca de 5 requisicoes por jogo, bem abaixo do limite de 1.000 por hora do plano gratuito. Confirme com a PandaScore que o plano gratuito pode ser usado em um site com anuncios antes de publicar.

### Liquipedia

A integracao complementar usa a API LPDB v3 da Liquipedia. E necessario solicitar uma chave, respeitar os termos de uso, manter o cache local e exibir a atribuicao CC BY-SA. Configure `LIQUIPEDIA_API_KEY`, `LIQUIPEDIA_USER_AGENT` e os wikis desejados no `server/.env`.

Sem nenhum provedor configurado (nem `PANDASCORE_TOKEN` nem `LIQUIPEDIA_API_KEY`), o agendador registra a rodada como `SKIPPED` e mantem somente conteudo editorial criado no painel. Nenhum dado demonstrativo e gerado.

Antes de publicar a cobertura com dados externos, obtenha acesso adequado ao uso do site no [portal da Liquipedia](https://liquipedia.net/api). Configure a chave apenas no backend, reinicie o servico e confirme uma sincronizacao bem-sucedida no painel. Verifique `GET /esports/overview` com equipes, jogos e horarios reais. Nao trate a frequencia de consulta do navegador como latencia do provedor.

Um horario previsto ja atingido nao confirma que a partida comecou. A importacao so marca `LIVE` quando a fonte informa esse estado. Placar ausente permanece nulo; zero e reservado para um placar informado.

Uma partida importada sai da lista ao vivo depois de dois intervalos completos sem confirmacao do provedor. A API preserva o ultimo estado gravado, mas retorna `isLive: false`; o detalhe informa que o status nao esta confirmado. Em caso de agenda vazia, os links externos levam aos calendarios de CS2, Valorant e LoL, sem importar seus dados.

Sem acesso a API, a redacao pode usar **Painel > E-sports > Partidas** para cadastrar confrontos confirmados. Informe o horario no fuso local do dispositivo, associe equipes e modalidade, e inclua a URL do organizador em **Fonte da partida**. Revise antes de publicar. Altere para ao vivo ou encerrado apenas quando a fonte confirmar o estado; atualizacoes manuais nao sao automaticas.

## Referencias da pagina

| Referencia | O que aproveitamos | O que ficou de fora |
| --- | --- | --- |
| [BLAST](https://blast.tv/cs) | Estrutura de portal: partidas e editorial no centro, campeonatos em painel lateral de borda fina. | O destaque de campeonato acima do placar e a navegacao paralela de jogos e produtos. |
| [Strafe](https://www.strafe.com/) | Arte do jogo preenchendo cada opcao, logo central e indicacao de atividade. | O trilho horizontal largo no desktop. |
| [HLTV](https://www.hltv.org/matches) | Partidas ao vivo separadas da agenda; estado e placar faceis de localizar. | A densidade de filtros de um portal dedicado a uma modalidade. |
| [VLR.gg](https://www.vlr.gg/matches) | Agenda por dia com horario, fase e contexto do campeonato. | Bandeiras como identificador principal das equipes. |
| [LoL Esports](https://lolesports.com/en-US) | Leitura simetrica: escudos e nomes em torno do placar. | Navegacao por fases do calendario de uma unica modalidade. |
| [GosuGamers](https://www.gosugamers.net/matches) | Agenda e resultados como modos da mesma superficie multijogo. | O calendario mensal antes das partidas. |

O filtro por jogo atualiza todas as secoes, e a selecao fica na URL para voltar ou compartilhar. `GET /esports/overview?game=valorant` aplica a modalidade antes dos limites da API; o historico curto de campeonatos encerrados tem um limite separado. No celular, os jogos ocupam uma grade compacta antes das partidas, e os campeonatos aparecem abaixo do editorial. As referencias nao sao fontes de dados.

Para validar a interface sem credencial ou banco de producao, rode `npm run dev -- --host 127.0.0.1 --port 4175` na raiz e `npm run test:e2e:esports` em outro terminal. Os testes isolam o feed via Playwright, exercitam desktop e celular e salvam as capturas em `test-results`.

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
