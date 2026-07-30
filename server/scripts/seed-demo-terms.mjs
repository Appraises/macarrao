// Dados de demonstracao: popula o dicionario com giria real, distribuida entre jogos,
// para avaliar o produto com volume antes de ter conteudo da comunidade.
//
// Rodar:   node scripts/seed-demo-terms.mjs
// Remover: node scripts/seed-demo-terms.mjs --remove
//
// Os termos sao conteudo legitimo (definicoes de giria que existe de verdade). A
// atribuicao a usuarios ficticios vem do seed-demo-contributors.mjs e e separavel:
// rodando so este, os termos ficam sem autor, como conteudo da casa.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// `game` casa por slug OU nome (substring). null = giria que atravessa jogos.
// `senses` opcional: termos com mais de um significado, que e o coracao do dicionario.
const TERMS = [
    /* ---------------------------- Geral / transversal ---------------------------- */
    { word: 'Smurf', def: 'Conta secundaria de um jogador experiente usada para enfrentar oponentes de nivel inferior.', game: null, tags: ['Geral', 'Ranked'], ex: ['Esse cara e smurf, joga bem demais pro elo.'] },
    { word: 'Buff', def: 'Fortalecimento de um personagem, item ou habilidade feito pelos desenvolvedores.', game: null, tags: ['Balanceamento'], ex: ['O patch deu um buff forte no suporte.'],
      senses: [{ def: 'Efeito temporario que melhora os atributos de um personagem durante a partida.', tags: ['Mecanica'], ex: ['Pega o buff azul antes de ir pro mid.'] }] },
    { word: 'Nerf', def: 'Enfraquecimento de algo que estava forte demais, aplicado pelos desenvolvedores para equilibrar o jogo.', game: null, tags: ['Balanceamento'], ex: ['Nerfaram a arma que todo mundo usava.'] },
    { word: 'GG', def: 'Abreviacao de "good game". Dito ao fim da partida como reconhecimento de um bom jogo.', game: null, tags: ['Etiqueta'], ex: ['GG, foi um jogo duro.'],
      senses: [{ def: 'Usado com ironia quando algo da errado de forma irreversivel.', tags: ['Ironia'], ex: ['Caiu a internet no meio da final, gg.'] }] },
    { word: 'AFK', def: 'De "away from keyboard": jogador ausente, que largou o controle no meio da partida.', game: null, tags: ['Comportamento'], ex: ['Nosso suporte ficou afk o jogo inteiro.'] },
    { word: 'Lag', def: 'Atraso entre a acao do jogador e a resposta do jogo, causado por conexao ou desempenho ruim.', game: null, tags: ['Tecnico'], ex: ['Nao consegui desviar, deu um lag absurdo.'] },
    { word: 'Ping', def: 'Tempo em milissegundos que os dados levam para ir ate o servidor e voltar. Quanto menor, melhor.', game: null, tags: ['Tecnico'], ex: ['Com 200 de ping nao da pra jogar competitivo.'] },
    { word: 'Grind', def: 'Repetir a mesma atividade por muito tempo para acumular recurso, nivel ou item.', game: null, tags: ['Progressao'], ex: ['Foi um grind de trinta horas pra conseguir a skin.'] },
    { word: 'Loot', def: 'Itens obtidos ao derrotar inimigos, abrir bau ou explorar o mapa.', game: null, tags: ['Itens'], ex: ['O loot dessa area e melhor que o do resto do mapa.'] },
    { word: 'Spawn', def: 'Ponto onde jogadores ou inimigos surgem no mapa.', game: null, tags: ['Mecanica'], ex: ['Eles estao camperando o nosso spawn.'] },
    { word: 'Camper', def: 'Quem fica parado num ponto esperando o inimigo passar, em vez de disputar o mapa.', game: null, tags: ['Comportamento'], ex: ['Camper de canto de sala nao ganha jogo.'] },
    { word: 'Meta', def: 'O conjunto de estrategias, personagens e itens considerados mais fortes no momento.', game: null, tags: ['Estrategia'], ex: ['Esse campeao saiu do meta depois do ultimo patch.'] },
    { word: 'Tryhard', def: 'Jogador que leva tudo a serio, jogando no maximo do esforco mesmo em partida casual.', game: null, tags: ['Comportamento'], ex: ['Era pra ser modo diversao e o cara veio tryhard.'] },
    { word: 'Elo', def: 'Faixa de classificacao que mede o nivel do jogador no modo competitivo.', game: null, tags: ['Ranked'], ex: ['Subi dois elos essa temporada.'] },
    { word: 'Elo hell', def: 'Faixa de classificacao onde o jogador se sente preso, culpando os companheiros pela falta de progresso.', game: null, tags: ['Ranked'], ex: ['Todo mundo acha que esta no elo hell.'] },
    { word: 'Lobby', def: 'Tela de espera onde os jogadores se reunem antes da partida comecar.', game: null, tags: ['Interface'], ex: ['Fica no lobby que ja te convido.'] },
    { word: 'Tilt', def: 'Estado emocional em que a frustacao passa a atrapalhar o desempenho, gerando erros em cadeia.', game: null, tags: ['Comportamento'], ex: ['Tomei dois gank seguidos e entrei em tilt.'] },
    { word: 'Rage quit', def: 'Abandonar a partida de raiva, no meio do jogo.', game: null, tags: ['Comportamento'], ex: ['Perdeu a luta e deu rage quit.'] },
    { word: 'Comeback', def: 'Virada: vencer uma partida que estava claramente perdida.', game: null, tags: ['Partida'], ex: ['Estavamos 0 a 12 e viramos, que comeback.'] },
    { word: 'Skin', def: 'Item cosmetico que muda a aparencia de um personagem, arma ou equipamento sem alterar desempenho.', game: null, tags: ['Cosmetico'], ex: ['Comprei a skin so pelo som da arma.'] },
    { word: 'Pay to win', def: 'Jogo em que gastar dinheiro real concede vantagem competitiva, e nao apenas cosmeticos.', game: null, tags: ['Monetizacao'], ex: ['O jogo era bom ate ficar pay to win.'] },
    { word: 'F2P', def: 'De "free to play": jogo gratuito, ou jogador que nao gasta dinheiro nele.', game: null, tags: ['Monetizacao'], ex: ['Da pra competir sendo f2p, so demora mais.'] },
    { word: 'Nolife', def: 'Quem joga em quantidade muito acima da media. Usado tanto como critica quanto como elogio.', game: null, tags: ['Comportamento'], ex: ['So nolife chega nesse ranking.'] },
    { word: 'Boost', def: 'Ajudar alguem a subir de elo, muitas vezes jogando na conta da pessoa.', game: null, tags: ['Ranked'], ex: ['O elo dele e boostado, joga muito mal.'] },
    { word: 'Duo', def: 'Jogar em dupla na fila competitiva.', game: null, tags: ['Social'], ex: ['So subo de elo jogando de duo.'] },
    { word: 'Solo queue', def: 'Entrar sozinho na fila e ser pareado com desconhecidos.', game: null, tags: ['Ranked'], ex: ['Solo queue e outro jogo, ninguem se comunica.'] },
    { word: 'Wipe', def: 'Quando o time inteiro e eliminado de uma vez.', game: null, tags: ['Partida'], ex: ['Tomamos wipe logo no primeiro confronto.'] },
    { word: 'Hitbox', def: 'Area invisivel que define onde um personagem pode ser atingido.', game: null, tags: ['Tecnico'], ex: ['A hitbox desse personagem e maior do que parece.'] },
    { word: 'Glitch', def: 'Comportamento nao previsto do jogo, geralmente visual ou fisico.', game: null, tags: ['Tecnico'], ex: ['Atravessei a parede num glitch.'] },
    { word: 'Exploit', def: 'Uso deliberado de uma falha do jogo para obter vantagem.', game: null, tags: ['Tecnico'], ex: ['Usar esse exploit da ban.'] },
    { word: 'Speedrun', def: 'Terminar o jogo no menor tempo possivel, geralmente seguindo regras de categoria.', game: null, tags: ['Comunidade'], ex: ['O recorde de speedrun caiu de novo ontem.'] },
    { word: 'Cheater', def: 'Quem usa programa externo para obter vantagem ilegitima.', game: null, tags: ['Trapaca'], ex: ['Denunciei o cara, era cheater na cara dura.'] },
    { word: 'Main', def: 'Personagem, classe ou funcao que o jogador usa como principal.', game: null, tags: ['Identidade'], ex: ['Sou main suporte desde que comecei.'] },
    { word: 'Alt', def: 'Personagem secundario, mantido em paralelo ao principal.', game: null, tags: ['Progressao'], ex: ['Meu alt ja esta quase no nivel maximo.'] },
    { word: 'Nerfado', def: 'Que sofreu enfraquecimento em uma atualizacao.', game: null, tags: ['Balanceamento'], ex: ['Ela ficou injogavel depois de nerfada.'] },
    { word: 'Patch', def: 'Atualizacao que corrige erros e ajusta o equilibrio do jogo.', game: null, tags: ['Atualizacao'], ex: ['Espera o patch de quinta pra opinar.'] },
    { word: 'Cross-play', def: 'Recurso que permite jogadores de plataformas diferentes jogarem juntos.', game: null, tags: ['Tecnico'], ex: ['Com cross-play da pra jogar com quem esta no console.'] },
    { word: 'Toxico', def: 'Jogador que ofende, provoca ou atrapalha o proprio time de proposito.', game: null, tags: ['Comportamento'], ex: ['Mutei o time inteiro de tao toxico.'] },
    { word: 'Carregar', def: 'Ser responsavel pela vitoria, compensando o desempenho fraco dos companheiros.', game: null, tags: ['Desempenho'], ex: ['Ele carregou a partida sozinho.'] },
    { word: 'Nolan', def: 'Jogada tao confusa que ninguem entende o que aconteceu, em referencia aos filmes do diretor.', game: null, tags: ['Humor'], ex: ['Esse teamfight foi um filme do Nolan.'] },

    /* ---------------------------------- FPS tatico -------------------------------- */
    { word: 'Rush', def: 'Avancar de forma agressiva e em grupo para um objetivo, pegando o inimigo de surpresa.', game: 'cs2', tags: ['FPS', 'Estrategia'], ex: ['Vamos rushar o bomb B agora.'] },
    { word: 'Clutch', def: 'Vencer a rodada sozinho, em desvantagem numerica, decidindo o round.', game: 'cs2', tags: ['FPS', 'Habilidade'], ex: ['Ele deu um clutch de 1v3 pra fechar o mapa.'] },
    { word: 'Ace', def: 'Eliminar os cinco jogadores adversarios em uma unica rodada.', game: 'valorant', tags: ['FPS', 'Objetivo'], ex: ['Que ace absurdo com a Jett.'] },
    { word: 'Eco', def: 'Rodada em que o time economiza dinheiro, comprando pouco ou nada para poder comprar bem na proxima.', game: 'cs2', tags: ['FPS', 'Economia'], ex: ['Perdemos o pistol, agora e eco.'] },
    { word: 'Force buy', def: 'Gastar todo o dinheiro numa rodada em que o ideal seria economizar, apostando na virada.', game: 'cs2', tags: ['FPS', 'Economia'], ex: ['Nao da pra economizar, vamos de force buy.'] },
    { word: 'Entry fragger', def: 'Jogador que entra primeiro no ponto para abrir espaco, aceitando o risco de morrer.', game: 'cs2', tags: ['FPS', 'Funcao'], ex: ['Todo time precisa de um entry fragger corajoso.'] },
    { word: 'Lurker', def: 'Jogador que se separa do time e circula sozinho pelo mapa, pegando rotacoes por tras.', game: 'cs2', tags: ['FPS', 'Funcao'], ex: ['O lurker pegou dois saindo do meio.'] },
    { word: 'Whiff', def: 'Errar um tiro ou habilidade que parecia certo.', game: 'valorant', tags: ['FPS', 'Erro'], ex: ['Whiffei o ultimo tiro e perdemos o round.'] },
    { word: 'Peek', def: 'Expor-se brevemente atras de uma cobertura para ver ou atirar no inimigo.', game: 'cs2', tags: ['FPS', 'Movimento'], ex: ['Faz um peek rapido pra ver se ele ainda esta la.'] },
    { word: 'Prefire', def: 'Atirar num ponto antes de ver o inimigo, prevendo onde ele estara.', game: 'cs2', tags: ['FPS', 'Tecnica'], ex: ['Ele prefirou o canto e pegou de graca.'] },
    { word: 'Wallbang', def: 'Matar um inimigo atirando atraves de uma parede ou superficie penetravel.', game: 'cs2', tags: ['FPS', 'Tecnica'], ex: ['Wallbang na caixa, sabia que ele estava ali.'] },
    { word: 'Spray control', def: 'Controlar a subida do recuo da arma para manter os tiros no alvo em rajada.', game: 'cs2', tags: ['FPS', 'Mecanica'], ex: ['O spray control dele e absurdo.'] },
    { word: 'Retake', def: 'Retomar um ponto que ja foi dominado pelo inimigo.', game: 'valorant', tags: ['FPS', 'Estrategia'], ex: ['Plantou, agora e retake.'] },
    { word: 'Trade', def: 'Matar imediatamente o inimigo que acabou de eliminar um companheiro, equilibrando a troca.', game: 'cs2', tags: ['FPS', 'Estrategia'], ex: ['Morri, mas ele foi tradeado na sequencia.'] },
    { word: 'Rotacionar', def: 'Mudar de um ponto do mapa para outro conforme a informacao muda.', game: 'valorant', tags: ['FPS', 'Estrategia'], ex: ['Rotaciona pro A, eles estao todos la.'] },
    { word: 'Baitar', def: 'Usar um companheiro como isca, deixando ele tomar o confronto sozinho para se aproveitar depois.', game: 'cs2', tags: ['FPS', 'Comportamento'], ex: ['Ele so baita o time e depois pega os kills.'] },
    { word: 'Crosshair placement', def: 'Manter a mira ja na altura da cabeca e no angulo certo antes de o inimigo aparecer.', game: 'valorant', tags: ['FPS', 'Fundamento'], ex: ['Com crosshair placement bom voce mira menos e acerta mais.'] },
    { word: 'One-way', def: 'Fumaca posicionada de modo que um lado enxerga e o outro nao.', game: 'valorant', tags: ['FPS', 'Tecnica'], ex: ['Ele montou um one-way e pegou tres.'] },
    { word: 'Anchor', def: 'Jogador que fica sozinho segurando um ponto ate os companheiros rotacionarem.', game: 'valorant', tags: ['FPS', 'Funcao'], ex: ['Fica de anchor no B que a gente vem.'] },
    { word: 'Headshot', def: 'Tiro na cabeca, que causa dano muito maior e costuma eliminar de imediato.', game: 'cs2', tags: ['FPS', 'Mecanica'], ex: ['Cinco kills, cinco headshots.'] },
    { word: 'Fumar', def: 'Bloquear a visao do inimigo lancando uma granada de fumaca num ponto especifico.', game: 'cs2', tags: ['FPS', 'Utilitario'], ex: ['Fuma a passagem antes de atravessar.'] },
    { word: 'Flash', def: 'Granada que cega temporariamente quem estiver olhando na direcao dela.', game: 'valorant', tags: ['FPS', 'Utilitario'], ex: ['Joga uma flash antes de entrar.'] },
    { word: 'Molly', def: 'Granada incendiaria usada para negar area e obrigar o inimigo a sair da posicao.', game: 'cs2', tags: ['FPS', 'Utilitario'], ex: ['Molly no canto que ele nao aguenta ficar.'] },
    { word: 'Stack', def: 'Concentrar varios jogadores num mesmo ponto do mapa.', game: 'valorant', tags: ['FPS', 'Estrategia'], ex: ['Eles stackaram o A, vai no B.'] },
    { word: 'Dry peek', def: 'Abrir um angulo sem usar nenhum utilitario antes, contando so com a mira.', game: 'cs2', tags: ['FPS', 'Tecnica'], ex: ['Dry peek contra AWP nunca da certo.'] },
    { word: 'Plantar', def: 'Instalar a bomba no ponto objetivo, iniciando a contagem regressiva.', game: 'cs2', tags: ['FPS', 'Objetivo'], ex: ['Planta primeiro e depois segura o angulo.'] },

    /* ------------------------------------ MOBA ------------------------------------ */
    { word: 'Feed', def: 'Morrer repetidamente para o inimigo, entregando ouro e experiencia de graca.', game: 'lol', tags: ['MOBA', 'Comportamento'], ex: ['Para de feedar, o top ja esta gigante.'] },
    { word: 'Carry', def: 'Jogador que concentra o maior impacto da partida e leva o time a vitoria.', game: 'lol', tags: ['MOBA', 'Funcao'], ex: ['O ADC carregou a partida sozinho.'] },
    { word: 'Gank', def: 'Emboscada em que um jogador de outra rota aparece para pegar o inimigo desprevenido.', game: 'lol', tags: ['MOBA', 'Estrategia'], ex: ['Toma cuidado que o jungle esta vindo gankar.'] },
    { word: 'Jungle', def: 'Area entre as rotas, cheia de monstros neutros, e a funcao de quem joga nela.', game: 'lol', tags: ['MOBA', 'Funcao'], ex: ['Nosso jungle nao apareceu no mapa a partida toda.'] },
    { word: 'Lane', def: 'Cada um dos caminhos principais que ligam as bases, onde as tropas avancam.', game: 'lol', tags: ['MOBA', 'Mapa'], ex: ['Perdi a lane cedo e nao consegui voltar.'] },
    { word: 'Last hit', def: 'Dar o golpe final numa tropa para receber o ouro dela.', game: 'lol', tags: ['MOBA', 'Fundamento'], ex: ['Treina last hit que seu farm melhora sozinho.'] },
    { word: 'CS', def: 'De "creep score": quantidade de tropas abatidas, medida basica de farm.', game: 'lol', tags: ['MOBA', 'Metrica'], ex: ['Ele esta com 200 de cs aos dez minutos.'] },
    { word: 'Ward', def: 'Sentinela colocada no mapa para dar visao de uma area.', game: 'lol', tags: ['MOBA', 'Visao'], ex: ['Bota ward no rio antes do dragao.'] },
    { word: 'Roaming', def: 'Sair da propria rota para ajudar em outras partes do mapa.', game: 'lol', tags: ['MOBA', 'Estrategia'], ex: ['O mid sumiu, esta roamando pro top.'] },
    { word: 'Split push', def: 'Pressionar uma rota sozinho enquanto o time ocupa o inimigo em outro ponto.', game: 'lol', tags: ['MOBA', 'Estrategia'], ex: ['Ele ganhou o jogo no split push.'] },
    { word: 'Teamfight', def: 'Confronto envolvendo a maior parte dos dois times ao mesmo tempo.', game: 'lol', tags: ['MOBA', 'Combate'], ex: ['Perdemos o teamfight e com ele o jogo.'] },
    { word: 'Inting', def: 'Jogar mal de proposito ou de forma tao ruim que parece intencional.', game: 'lol', tags: ['MOBA', 'Comportamento'], ex: ['Ele comecou a intar depois de tomar tilt.'] },
    { word: 'Kite', def: 'Atacar recuando, mantendo distancia para nao ser alcancado.', game: 'lol', tags: ['MOBA', 'Tecnica'], ex: ['Kita o tank em vez de bater de frente.'] },
    { word: 'Poke', def: 'Causar dano a distancia aos poucos, sem se comprometer com a luta.', game: 'lol', tags: ['MOBA', 'Tecnica'], ex: ['Fica pokando ate eles ficarem sem vida pra entrar.'] },
    { word: 'Engage', def: 'Iniciar o confronto, geralmente com uma habilidade de controle.', game: 'lol', tags: ['MOBA', 'Combate'], ex: ['Espera o suporte engajar pra entrar.'] },
    { word: 'Peel', def: 'Proteger o carry do time afastando quem tenta alcanca-lo.', game: 'lol', tags: ['MOBA', 'Funcao'], ex: ['Faz peel pro ADC em vez de correr atras de kill.'] },
    { word: 'Snowball', def: 'Vantagem que cresce sozinha: quem esta na frente fica cada vez mais forte.', game: 'lol', tags: ['MOBA', 'Dinamica'], ex: ['Ela pegou first blood e snowballou o jogo.'] },
    { word: 'Ult', def: 'Habilidade definitiva do personagem, de maior impacto e maior tempo de recarga.', game: 'lol', tags: ['MOBA', 'Mecanica'], ex: ['Guarda a ult pro teamfight.'] },
    { word: 'Baron', def: 'Monstro neutro poderoso que concede um bonus decisivo ao time que o derruba.', game: 'lol', tags: ['MOBA', 'Objetivo'], ex: ['Fecharam o jogo com o buff de baron.'] },
    { word: 'Recall', def: 'Voltar a base para curar e comprar itens.', game: 'lol', tags: ['MOBA', 'Mecanica'], ex: ['Da recall agora que a lane esta empurrada.'] },
    { word: 'Farmar', def: 'Acumular ouro e experiencia abatendo tropas e monstros.', game: 'dota2', tags: ['MOBA', 'Progressao'], ex: ['Deixa ele farmar em paz que depois ele carrega.'] },

    /* -------------------------------- Battle royale ------------------------------- */
    { word: 'Queda', def: 'Momento de pular do transporte inicial e escolher onde aterrissar no mapa.', game: 'fortnite', tags: ['Battle Royale', 'Inicio'], ex: ['Nossa queda foi ruim, caimos sem loot.'] },
    { word: 'Zona', def: 'Area segura que encolhe com o tempo, forcando os jogadores a se aproximarem.', game: 'warzone', tags: ['Battle Royale', 'Mecanica'], ex: ['Corre que a zona esta fechando.'] },
    { word: 'Third party', def: 'Chegar num confronto ja em andamento para aproveitar que os dois lados estao enfraquecidos.', game: 'apex-legends', tags: ['Battle Royale', 'Estrategia'], ex: ['Ganhamos a luta e tomamos third party na hora.'] },
    { word: 'Hot drop', def: 'Cair de proposito no ponto mais disputado do mapa, buscando confronto imediato.', game: 'pubg-battlegrounds', tags: ['Battle Royale', 'Inicio'], ex: ['Hot drop toda partida e o jeito de treinar mira.'] },
    { word: 'Squad', def: 'Equipe de jogadores no modo em grupo.', game: 'apex-legends', tags: ['Battle Royale', 'Social'], ex: ['Fecha o squad que a fila esta rapida.'] },
    { word: 'Revive', def: 'Levantar um companheiro caido antes que ele seja eliminado de vez.', game: 'apex-legends', tags: ['Battle Royale', 'Mecanica'], ex: ['Cobre que eu vou de revive.'] },
    { word: 'Kit', def: 'Conjunto de equipamentos e itens que o jogador carrega.', game: 'warzone', tags: ['Battle Royale', 'Itens'], ex: ['Peguei um kit completo logo na primeira casa.'] },

    /* --------------------------------- MMO e RPG ---------------------------------- */
    { word: 'Raid', def: 'Atividade cooperativa de alta dificuldade, feita por grupos grandes e coordenados.', game: 'wow', tags: ['MMO', 'Cooperativo'], ex: ['A raid nova exige o grupo inteiro focado.'] },
    { word: 'Tank', def: 'Funcao que absorve o dano dos inimigos e mantem a atencao deles longe do resto do grupo.', game: 'wow', tags: ['MMO', 'Funcao'], ex: ['Sem tank a party nao sobrevive ao primeiro chefe.'] },
    { word: 'Healer', def: 'Funcao responsavel por curar e manter o grupo vivo.', game: 'final-fantasy-xiv-online', tags: ['MMO', 'Funcao'], ex: ['O healer segurou a raid sozinho no final.'] },
    { word: 'DPS', def: 'De "damage per second": funcao focada em causar dano, e tambem a metrica desse dano.', game: 'wow', tags: ['MMO', 'Funcao'], ex: ['Meu dps caiu porque errei a rotacao.'] },
    { word: 'Aggro', def: 'Atencao dos inimigos: quem tem aggro e quem esta sendo atacado.', game: 'wow', tags: ['MMO', 'Mecanica'], ex: ['Puxei aggro sem querer e morri na hora.'] },
    { word: 'Dungeon', def: 'Area fechada com inimigos e um chefe ao final, feita para grupos pequenos.', game: 'final-fantasy-xiv-online', tags: ['MMO', 'Conteudo'], ex: ['Bora fazer a dungeon diaria.'] },
    { word: 'Endgame', def: 'Conteudo disponivel apos o nivel maximo, onde a progressao passa a ser por equipamento.', game: 'destiny-2', tags: ['MMO', 'Progressao'], ex: ['O jogo comeca de verdade no endgame.'] },
    { word: 'Drop rate', def: 'Probabilidade de um item especifico cair de um inimigo ou bau.', game: 'warframe', tags: ['MMO', 'Itens'], ex: ['O drop rate dessa peca e cruel.'] },
    { word: 'Build', def: 'Combinacao de equipamentos, habilidades e atributos que define como o personagem funciona.', game: 'diablo-iv', tags: ['RPG', 'Personagem'], ex: ['Troquei de build e o personagem virou outro.'] },
    { word: 'PvE', def: 'Jogador contra o ambiente: enfrentar inimigos controlados pelo jogo.', game: null, tags: ['Modo'], ex: ['Prefiro pve, pvp me estressa.'] },
    { word: 'PvP', def: 'Jogador contra jogador: enfrentar outras pessoas.', game: null, tags: ['Modo'], ex: ['O pvp desse jogo e desequilibrado.'] },

    /* --------------------------------- Souls-like --------------------------------- */
    { word: 'Boss', def: 'Inimigo de destaque, muito mais forte que os comuns, que costuma encerrar uma area.', game: 'eldenring', tags: ['Souls', 'Combate'], ex: ['Morri quarenta vezes nesse boss.'] },
    { word: 'Parry', def: 'Aparar o golpe no momento exato, abrindo o inimigo para um contra-ataque devastador.', game: 'sekiro-shadows-die-twice', tags: ['Souls', 'Tecnica'], ex: ['O jogo inteiro melhora quando voce aprende a dar parry.'] },
    { word: 'Cheese', def: 'Vencer um desafio explorando uma brecha, evitando enfrenta-lo como foi projetado.', game: 'dark-souls-iii', tags: ['Souls', 'Estrategia'], ex: ['Dei cheese no boss usando o terreno.'] },
    { word: 'Invasao', def: 'Entrar no mundo de outro jogador como inimigo, para caca-lo.', game: 'eldenring', tags: ['Souls', 'PvP'], ex: ['Tomei invasao bem antes do chefe.'] },
    { word: 'No-hit', def: 'Terminar um chefe ou o jogo inteiro sem levar um unico dano.', game: 'dark-souls-iii', tags: ['Souls', 'Desafio'], ex: ['Ele fez a run inteira no-hit.'] },
    { word: 'Run', def: 'Uma tentativa completa de percorrer o jogo, do inicio ao fim ou ate morrer.', game: 'hades', tags: ['Roguelike', 'Estrutura'], ex: ['Minha melhor run acabou no ultimo chefe.'] },

    /* -------------------------------- Luta / fighting ------------------------------ */
    { word: 'Combo', def: 'Sequencia de golpes encadeados de forma que o oponente nao consegue reagir no meio.', game: 'sf6', tags: ['Luta', 'Mecanica'], ex: ['Esse combo tira metade da barra.'] },
    { word: 'Frame data', def: 'Dados exatos de quantos quadros cada golpe leva para sair, acertar e recuperar.', game: 'tekken-8', tags: ['Luta', 'Tecnico'], ex: ['Quem estuda frame data para de chutar no escuro.'] },
    { word: 'Punish', def: 'Castigar um golpe do oponente que deixou brecha, atacando durante a recuperacao dele.', game: 'sf6', tags: ['Luta', 'Tecnica'], ex: ['Ele errou o chute e tomou punish completo.'] },
    { word: 'Mix-up', def: 'Alternar entre opcoes que exigem defesas diferentes, forcando o oponente a adivinhar.', game: 'guilty-gear-strive', tags: ['Luta', 'Estrategia'], ex: ['O mix-up dela e impossivel de ler.'] },
    { word: 'Zoning', def: 'Controlar a distancia com ataques de longo alcance, impedindo o oponente de se aproximar.', game: 'mortal-kombat-1', tags: ['Luta', 'Estrategia'], ex: ['Perdi pro zoning, nunca cheguei perto.'] },
    { word: 'Neutral', def: 'Fase da luta em que ninguem tem vantagem e os dois disputam posicao.', game: 'sf6', tags: ['Luta', 'Conceito'], ex: ['Ele ganha todo neutral e depois abre o combo.'] },
    { word: 'Spam', def: 'Repetir o mesmo golpe insistentemente, contando que o oponente nao saiba punir.', game: 'mortal-kombat-1', tags: ['Luta', 'Comportamento'], ex: ['So spamma rasteira, da pra punir facil.'] },

    /* ------------------------------ Sobrevivencia e craft ------------------------- */
    { word: 'Craftar', def: 'Fabricar itens combinando recursos coletados.', game: 'minecraft', tags: ['Sobrevivencia', 'Mecanica'], ex: ['Crafta uma picareta de ferro antes de descer.'] },
    { word: 'Creeper', def: 'Criatura verde que se aproxima em silencio e explode, destruindo construcoes.', game: 'minecraft', tags: ['Sobrevivencia', 'Inimigo'], ex: ['Um creeper explodiu metade da minha casa.'] },
    { word: 'Nether', def: 'Dimensao subterranea e hostil, usada tambem como atalho para viajar distancias longas.', game: 'minecraft', tags: ['Sobrevivencia', 'Mundo'], ex: ['Fiz um portal pro nether pra encurtar o caminho.'] },
    { word: 'Redstone', def: 'Material que transmite sinal e permite construir mecanismos e circuitos dentro do jogo.', game: 'minecraft', tags: ['Sobrevivencia', 'Construcao'], ex: ['A fazenda automatica dele e puro redstone.'] },
    { word: 'Raid de base', def: 'Invadir a construcao de outro jogador para roubar recursos.', game: 'rust', tags: ['Sobrevivencia', 'PvP'], ex: ['Perdemos tudo num raid enquanto estavamos offline.'] },
    { word: 'Wipe de servidor', def: 'Reinicio periodico que apaga todo o progresso e devolve o servidor ao estado inicial.', game: 'rust', tags: ['Sobrevivencia', 'Servidor'], ex: ['O wipe e quinta, nao vale mais construir.'] },
    { word: 'Hardcore', def: 'Modo em que a morte e definitiva e apaga o mundo ou o personagem.', game: 'minecraft', tags: ['Sobrevivencia', 'Modo'], ex: ['Morri no hardcore com trezentos dias.'] },

    /* -------------------------------- Terror / co-op ------------------------------ */
    { word: 'Gerador', def: 'Objetivo que os sobreviventes precisam reparar para abrir a saida.', game: 'dead-by-daylight', tags: ['Terror', 'Objetivo'], ex: ['Faltam dois geradores pra abrir o portao.'] },
    { word: 'Killer', def: 'Jogador que assume o papel do assassino, cacando os demais.', game: 'dead-by-daylight', tags: ['Terror', 'Funcao'], ex: ['O killer estava campeando o gancho.'] },
    { word: 'Loop', def: 'Girar em torno de um obstaculo para ganhar tempo enquanto e perseguido.', game: 'dead-by-daylight', tags: ['Terror', 'Tecnica'], ex: ['Segurei o killer dois minutos no loop.'] },
    { word: 'Quota', def: 'Meta de lucro que a equipe precisa entregar para continuar jogando.', game: 'lethal-company', tags: ['Cooperativo', 'Objetivo'], ex: ['Nao batemos a quota e fomos demitidos.'] },

    /* ----------------------------- Corrida e esportes ----------------------------- */
    { word: 'Aerial', def: 'Acertar a bola no ar, com o carro em voo.', game: 'rocket-league', tags: ['Esporte', 'Tecnica'], ex: ['Ele fez o gol de aerial no ultimo segundo.'] },
    { word: 'Kickoff', def: 'Disputa inicial pela bola no centro do campo, no comeco de cada tempo ou apos gol.', game: 'rocket-league', tags: ['Esporte', 'Mecanica'], ex: ['Perder kickoff toda vez custa o jogo.'] },
    { word: 'Undercut', def: 'Parar nos boxes antes do rival para ganhar posicao com pneus novos.', game: 'f1-24', tags: ['Corrida', 'Estrategia'], ex: ['Ganhou a posicao no undercut.'] },
    { word: 'Drift', def: 'Deslizar o carro de lado nas curvas, mantendo o controle da derrapagem.', game: 'forza-horizon-5', tags: ['Corrida', 'Tecnica'], ex: ['Fez a curva inteira em drift.'] },

    /* --------------------------------- Estrategia --------------------------------- */
    { word: 'Rush de tropas', def: 'Atacar muito cedo, antes de o oponente ter defesa montada.', game: 'age-of-empires', tags: ['Estrategia', 'Tatica'], ex: ['Ganhou no rush aos cinco minutos.'] },
    { word: 'Boom', def: 'Priorizar economia e crescimento em vez de atacar cedo, apostando no longo prazo.', game: 'age-of-empires', tags: ['Estrategia', 'Economia'], ex: ['Ele boomou e no final tinha o dobro de recursos.'] },
    { word: 'Micro', def: 'Controle fino de unidades individuais durante o combate.', game: 'age-of-empires', tags: ['Estrategia', 'Habilidade'], ex: ['O micro dele salvou um exercito perdido.'] },
    { word: 'Macro', def: 'Gestao geral da economia, producao e expansao, em oposicao ao controle unidade a unidade.', game: 'age-of-empires', tags: ['Estrategia', 'Habilidade'], ex: ['Perdi porque esqueci o macro focando no combate.'] },
];

// Notas de origem. Etimologia real — e o que da valor ao painel de Origem, que sem
// exemplo fica invisivel. Onde a origem e disputada, o texto diz isso em vez de inventar.
const ORIGENS = {
    Nerf: 'Vem da marca de brinquedos Nerf, conhecida pelas armas de espuma. Dizer que algo "foi nerfado" e dizer que viraram brinquedo: continua existindo, mas nao machuca mais.',
    Smurf: 'Nasceu no Warcraft II, nos anos 90. Dois jogadores muito fortes criaram contas novas chamadas PapaSmurf e Smurfette porque ninguem mais aceitava partida contra eles com os nomes reais. O apelido pegou e virou o termo para conta secundaria.',
    Gank: 'Contracao de "gang kill" — matar em bando. Descreve exatamente o que e: varios contra um que nao esperava.',
    Elo: 'Homenagem a Arpad Elo, fisico hungaro-americano que criou o sistema de pontuacao usado no xadrez. Nao e sigla, e sobrenome — por isso "Elo" e nao "ELO".',
    Tilt: 'Vem do pinball: inclinar a maquina para forcar a bola dava falta e travava o jogo. No poker o termo passou a descrever o jogador que perde o controle emocional, e dali chegou aos jogos eletronicos.',
    Noob: 'Corruptela de "newbie", que por sua vez vem de "new" — novato. A grafia com dois zeros ("n00b") apareceu no jargao de internet dos anos 90 e costuma carregar mais deboche que a forma original.',
    Creeper: 'Foi um acidente. Notch, criador do Minecraft, errou as dimensoes ao modelar um porco e trocou altura por comprimento. O resultado ficou tao estranho que virou inimigo em vez de bug corrigido.',
    Spam: 'Vem de um quadro do Monty Python em que a palavra "spam" e repetida ate nao sobrar mais nada da conversa. Passou a significar repeticao insistente — no e-mail e depois nos jogos.',
    AFK: 'Sigla de "away from keyboard", nascida nos canais de IRC dos anos 80 e 90, quando avisar que voce ia sair era etiqueta basica de sala de bate-papo.',
    GG: 'Abreviacao de "good game", herdada da etiqueta dos jogos de estrategia em rede, onde era costume cumprimentar o adversario ao fim da partida. Sobreviveu ate quando a intencao passou a ser ironica.',
    Meta: 'Costuma ser explicada como sigla de "most effective tactic available", mas isso e um acronimo inventado depois. A origem real e o prefixo grego "meta", de "sobre" — o meta e o jogo sobre o jogo.',
    Boss: 'Vem dos fliperamas japoneses, onde o inimigo final de fase era chamado de chefe por analogia com a hierarquia de uma organizacao criminosa: para chegar ao topo, voce derruba os subordinados primeiro.',
    Camper: 'Do ingles "to camp", acampar. Apareceu nos primeiros FPS multijogador, quando ficar parado num canto virou tatica eficiente o bastante para gerar reclamacao — e apelido.',
    Feed: 'Literalmente "alimentar". Morrer repetidamente alimenta o inimigo com ouro e experiencia, engordando justamente quem voce deveria conter.',
    Clutch: 'Emprestado do esporte americano, onde "clutch player" e quem rende mais sob pressao, nos momentos decisivos. Chegou aos jogos competitivos pelo mesmo caminho de varios outros termos esportivos.',
    Ace: 'Vem do tenis e das cartas, onde o as e a carta mais alta e o saque perfeito e chamado de ace. Nos FPS passou a nomear a rodada perfeita: matar o time inteiro sozinho.',
    Grind: 'Do ingles "to grind", moer ou triturar. Descreve a natureza repetitiva e mecanica da tarefa — voce nao joga, voce mói.',
    Raid: 'Vem do vocabulario militar, onde raid e uma incursao coordenada em territorio inimigo. Os MMOs adotaram o termo para as investidas de grupos grandes contra um alvo unico.',
    Buff: 'Do ingles "to buff", polir. Polir algo e deixa-lo melhor — o oposto exato de nerfar.',
};

const WORDS = TERMS.map((t) => t.word);

async function remove() {
    const res = await prisma.term.deleteMany({ where: { word: { in: WORDS } } });
    console.log(`Removidos ${res.count} termo(s) de demonstracao.`);
}

async function seed() {
    const games = await prisma.game.findMany({ select: { id: true, name: true, slug: true } });
    const findGame = (needle) => needle && games.find((g) =>
        g.slug.toLowerCase().includes(needle) || g.name.toLowerCase().includes(needle));
    const authors = await prisma.user.findMany({
        where: { email: { endsWith: '@demo.dicionariogamer.local' } },
        select: { id: true },
    });

    let created = 0;
    for (let i = 0; i < TERMS.length; i++) {
        const t = TERMS[i];
        const exists = await prisma.term.findFirst({
            where: { word: { equals: t.word, mode: 'insensitive' } },
            select: { id: true },
        });
        if (exists) continue;

        const game = findGame(t.game);
        const gameId = game ? game.id : null;
        // Sem contribuintes de demonstracao, o termo fica sem autor — conteudo da casa.
        const authorId = authors.length ? authors[i % authors.length].id : null;
        const upvotes = 12 + Math.floor(Math.random() * 480);

        // O sentido principal espelha as colunas do termo; os extras entram abaixo dele.
        const extras = (t.senses || []).map((s, index) => ({
            definition: s.def,
            examples: s.ex || [],
            gameId: findGame(s.game)?.id ?? null,
            order: index + 2,
            upvotes: Math.floor(upvotes * (0.15 + Math.random() * 0.4)),
            status: 'APPROVED',
            authorId: authors.length ? authors[(i + index + 1) % authors.length].id : null,
        }));

        const origem = ORIGENS[t.word];

        await prisma.term.create({
            data: {
                word: t.word,
                definition: t.def,
                status: 'APPROVED',
                tags: t.tags,
                examples: t.ex,
                upvotes,
                gameId,
                gameIds: gameId ? [gameId] : [],
                authorId,
                // Term.origin espelha a nota aprovada, do mesmo jeito que a definicao
                // espelha o sentido lider — e o que a busca e o card do catalogo leem.
                origin: origem ?? null,
                meanings: {
                    create: [
                        { definition: t.def, examples: t.ex, gameId, order: 1, upvotes, status: 'APPROVED', authorId },
                        ...extras,
                    ],
                },
                ...(origem ? {
                    media: {
                        create: {
                            kind: 'ORIGIN',
                            content: origem,
                            status: 'APPROVED',
                            authorId,
                        },
                    },
                } : {}),
            },
        });
        created++;
    }
    const semJogo = TERMS.filter((t) => !t.game).length;
    console.log(`Semeados ${created} termo(s) de ${TERMS.length} (${TERMS.length - created} ja existiam).`);
    console.log(`${TERMS.length - semJogo} amarrados a um jogo, ${semJogo} transversais.`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
