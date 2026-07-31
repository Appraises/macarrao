// Dados de demonstracao: popula o dicionario com giria real, distribuida entre jogos,
// para avaliar o produto com volume antes de ter conteudo da comunidade.
//
// Rodar:    node scripts/seed-demo-terms.mjs
// Atualizar textos existentes: node scripts/seed-demo-terms.mjs --refresh-copy
// Remover:  node scripts/seed-demo-terms.mjs --remove
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
    { word: 'Smurf', def: 'Conta secundária de um jogador experiente usada para enfrentar oponentes de nível inferior.', game: null, tags: ['Geral', 'Ranked'], ex: ['Esse cara é smurf, joga bem demais para o elo.'] },
    { word: 'Buff', def: 'Fortalecimento de um personagem, item ou habilidade feito pelos desenvolvedores.', game: null, tags: ['Balanceamento'], ex: ['O patch deu um buff forte no suporte.'],
      senses: [{ def: 'Efeito temporário que melhora os atributos de um personagem durante a partida.', tags: ['Mecânica'], ex: ['Pega o buff azul antes de ir para o mid.'] }] },
    { word: 'Nerf', def: 'Enfraquecimento de algo que estava forte demais, aplicado pelos desenvolvedores para equilibrar o jogo.', game: null, tags: ['Balanceamento'], ex: ['Nerfaram a arma que todo mundo usava.'] },
    { word: 'GG', def: 'Abreviação de "good game". Dito ao fim da partida como reconhecimento de um bom jogo.', game: null, tags: ['Etiqueta'], ex: ['GG, foi um jogo duro.'],
      senses: [{ def: 'Usado com ironia quando algo dá errado de forma irreversível.', tags: ['Ironia'], ex: ['Caiu a internet no meio da final, GG.'] }] },
    { word: 'AFK', def: 'De "away from keyboard": jogador ausente, que largou o controle no meio da partida.', game: null, tags: ['Comportamento'], ex: ['Nosso suporte ficou afk o jogo inteiro.'] },
    { word: 'Lag', def: 'Atraso entre a ação do jogador e a resposta do jogo, causado por conexão ou desempenho ruim.', game: null, tags: ['Técnico'], ex: ['Não consegui desviar, deu um lag absurdo.'] },
    { word: 'Ping', def: 'Tempo em milissegundos que os dados levam para ir até o servidor e voltar. Quanto menor, melhor.', game: null, tags: ['Técnico'], ex: ['Com 200 de ping não dá para jogar competitivo.'] },
    { word: 'Grind', def: 'Repetir a mesma atividade por muito tempo para acumular recurso, nível ou item.', game: null, tags: ['Progressão'], ex: ['Foi um grind de trinta horas para conseguir a skin.'] },
    { word: 'Loot', def: 'Itens obtidos ao derrotar inimigos, abrir baú ou explorar o mapa.', game: null, tags: ['Itens'], ex: ['O loot dessa área é melhor que o do resto do mapa.'] },
    { word: 'Spawn', def: 'Ponto onde jogadores ou inimigos surgem no mapa.', game: null, tags: ['Mecânica'], ex: ['Eles estão camperando o nosso spawn.'] },
    { word: 'Camper', def: 'Quem fica parado num ponto esperando o inimigo passar, em vez de disputar o mapa.', game: null, tags: ['Comportamento'], ex: ['Camper de canto de sala não ganha jogo.'] },
    { word: 'Meta', def: 'O conjunto de estratégias, personagens e itens considerados mais fortes no momento.', game: null, tags: ['Estratégia'], ex: ['Esse campeão saiu do meta depois do último patch.'] },
    { word: 'Tryhard', def: 'Jogador que leva tudo a sério, jogando com o máximo de esforço mesmo em partida casual.', game: null, tags: ['Comportamento'], ex: ['Era para ser modo diversão e o cara veio tryhard.'] },
    { word: 'Elo', def: 'Faixa de classificação que mede o nível do jogador no modo competitivo.', game: null, tags: ['Ranked'], ex: ['Subi dois elos essa temporada.'] },
    { word: 'Elo hell', def: 'Faixa de classificação onde o jogador se sente preso, culpando os companheiros pela falta de progresso.', game: null, tags: ['Ranked'], ex: ['Todo mundo acha que está no elo hell.'] },
    { word: 'Lobby', def: 'Tela de espera onde os jogadores se reúnem antes da partida começar.', game: null, tags: ['Interface'], ex: ['Fica no lobby que já te convido.'] },
    { word: 'Tilt', def: 'Estado emocional em que a frustração passa a atrapalhar o desempenho, gerando erros em cadeia.', game: null, tags: ['Comportamento'], ex: ['Tomei dois ganks seguidos e entrei em tilt.'] },
    { word: 'Rage quit', def: 'Abandonar a partida de raiva, no meio do jogo.', game: null, tags: ['Comportamento'], ex: ['Perdeu a luta e deu rage quit.'] },
    { word: 'Comeback', def: 'Virada: vencer uma partida que estava claramente perdida.', game: null, tags: ['Partida'], ex: ['Estávamos 0 a 12 e viramos, que comeback.'] },
    { word: 'Skin', def: 'Item cosmético que muda a aparência de um personagem, arma ou equipamento sem alterar o desempenho.', game: null, tags: ['Cosmético'], ex: ['Comprei a skin só pelo som da arma.'] },
    { word: 'Pay to win', def: 'Jogo em que gastar dinheiro real concede vantagem competitiva, e não apenas cosméticos.', game: null, tags: ['Monetização'], ex: ['O jogo era bom até ficar pay to win.'] },
    { word: 'F2P', def: 'De "free to play": jogo gratuito, ou jogador que não gasta dinheiro nele.', game: null, tags: ['Monetização'], ex: ['Dá para competir sendo F2P, só demora mais.'] },
    { word: 'Nolife', def: 'Quem joga em quantidade muito acima da média. Usado tanto como crítica quanto como elogio.', game: null, tags: ['Comportamento'], ex: ['Só nolife chega nesse ranking.'] },
    { word: 'Boost', def: 'Ajudar alguém a subir de elo, muitas vezes jogando na conta da pessoa.', game: null, tags: ['Ranked'], ex: ['O elo dele é boostado, joga muito mal.'] },
    { word: 'Duo', def: 'Jogar em dupla na fila competitiva.', game: null, tags: ['Social'], ex: ['Só subo de elo jogando de duo.'] },
    { word: 'Solo queue', def: 'Entrar sozinho na fila e ser pareado com desconhecidos.', game: null, tags: ['Ranked'], ex: ['Solo queue é outro jogo, ninguém se comunica.'] },
    { word: 'Wipe', def: 'Quando o time inteiro é eliminado de uma vez.', game: null, tags: ['Partida'], ex: ['Tomamos wipe logo no primeiro confronto.'] },
    { word: 'Hitbox', def: 'Área invisível que define onde um personagem pode ser atingido.', game: null, tags: ['Técnico'], ex: ['A hitbox desse personagem é maior do que parece.'] },
    { word: 'Glitch', def: 'Comportamento não previsto do jogo, geralmente visual ou físico.', game: null, tags: ['Técnico'], ex: ['Atravessei a parede num glitch.'] },
    { word: 'Exploit', def: 'Uso deliberado de uma falha do jogo para obter vantagem.', game: null, tags: ['Técnico'], ex: ['Usar esse exploit dá ban.'] },
    { word: 'Speedrun', def: 'Terminar o jogo no menor tempo possível, geralmente seguindo regras de categoria.', game: null, tags: ['Comunidade'], ex: ['O recorde de speedrun caiu de novo ontem.'] },
    { word: 'Cheater', def: 'Quem usa programa externo para obter vantagem ilegítima.', game: null, tags: ['Trapaça'], ex: ['Denunciei o cara, era cheater na cara dura.'] },
    { word: 'Main', def: 'Personagem, classe ou função que o jogador usa como principal.', game: null, tags: ['Identidade'], ex: ['Sou main suporte desde que comecei.'] },
    { word: 'Alt', def: 'Personagem secundário, mantido em paralelo ao principal.', game: null, tags: ['Progressão'], ex: ['Meu alt já está quase no nível máximo.'] },
    { word: 'Nerfado', def: 'Que sofreu enfraquecimento em uma atualização.', game: null, tags: ['Balanceamento'], ex: ['Ela ficou injogável depois de nerfada.'] },
    { word: 'Patch', def: 'Atualização que corrige erros e ajusta o equilíbrio do jogo.', game: null, tags: ['Atualização'], ex: ['Espera o patch de quinta para opinar.'] },
    { word: 'Cross-play', def: 'Recurso que permite que jogadores de plataformas diferentes joguem juntos.', game: null, tags: ['Técnico'], ex: ['Com cross-play dá para jogar com quem está no console.'] },
    { word: 'Toxico', def: 'Jogador que ofende, provoca ou atrapalha o próprio time de propósito.', game: null, tags: ['Comportamento'], ex: ['Mutei o time inteiro de tão tóxico.'] },
    { word: 'Carregar', def: 'Ser responsável pela vitória, compensando o desempenho fraco dos companheiros.', game: null, tags: ['Desempenho'], ex: ['Ele carregou a partida sozinho.'] },
    { word: 'Nolan', def: 'Jogada tão confusa que ninguém entende o que aconteceu, em referência aos filmes do diretor.', game: null, tags: ['Humor'], ex: ['Esse teamfight foi um filme do Nolan.'] },

    /* ---------------------------------- FPS tatico -------------------------------- */
    { word: 'Rush', def: 'Avançar de forma agressiva e em grupo para um objetivo, pegando o inimigo de surpresa.', game: 'cs2', tags: ['FPS', 'Estratégia'], ex: ['Vamos rushar o bomb B agora.'] },
    { word: 'Clutch', def: 'Vencer a rodada sozinho, em desvantagem numérica, decidindo o round.', game: 'cs2', tags: ['FPS', 'Habilidade'], ex: ['Ele deu um clutch de 1v3 para fechar o mapa.'] },
    { word: 'Ace', def: 'Eliminar os cinco jogadores adversários em uma única rodada.', game: 'valorant', tags: ['FPS', 'Objetivo'], ex: ['Que ace absurdo com a Jett.'] },
    { word: 'Eco', def: 'Rodada em que o time economiza dinheiro, comprando pouco ou nada para poder comprar bem na próxima.', game: 'cs2', tags: ['FPS', 'Economia'], ex: ['Perdemos o pistol, agora é eco.'] },
    { word: 'Force buy', def: 'Gastar todo o dinheiro numa rodada em que o ideal seria economizar, apostando na virada.', game: 'cs2', tags: ['FPS', 'Economia'], ex: ['Não dá para economizar, vamos de force buy.'] },
    { word: 'Entry fragger', def: 'Jogador que entra primeiro no ponto para abrir espaço, aceitando o risco de morrer.', game: 'cs2', tags: ['FPS', 'Função'], ex: ['Todo time precisa de um entry fragger corajoso.'] },
    { word: 'Lurker', def: 'Jogador que se separa do time e circula sozinho pelo mapa, pegando rotações por trás.', game: 'cs2', tags: ['FPS', 'Função'], ex: ['O lurker pegou dois saindo do meio.'] },
    { word: 'Whiff', def: 'Errar um tiro ou habilidade que parecia certo.', game: 'valorant', tags: ['FPS', 'Erro'], ex: ['Whiffei o último tiro e perdemos o round.'] },
    { word: 'Peek', def: 'Expor-se brevemente atrás de uma cobertura para ver ou atirar no inimigo.', game: 'cs2', tags: ['FPS', 'Movimento'], ex: ['Faz um peek rápido para ver se ele ainda está lá.'] },
    { word: 'Prefire', def: 'Atirar num ponto antes de ver o inimigo, prevendo onde ele estará.', game: 'cs2', tags: ['FPS', 'Técnica'], ex: ['Ele prefirou o canto e pegou de graça.'] },
    { word: 'Wallbang', def: 'Matar um inimigo atirando através de uma parede ou superfície penetrável.', game: 'cs2', tags: ['FPS', 'Técnica'], ex: ['Wallbang na caixa, sabia que ele estava ali.'] },
    { word: 'Spray control', def: 'Controlar a subida do recuo da arma para manter os tiros no alvo em rajada.', game: 'cs2', tags: ['FPS', 'Mecânica'], ex: ['O spray control dele é absurdo.'] },
    { word: 'Retake', def: 'Retomar um ponto que já foi dominado pelo inimigo.', game: 'valorant', tags: ['FPS', 'Estratégia'], ex: ['Plantou, agora é retake.'] },
    { word: 'Trade', def: 'Matar imediatamente o inimigo que acabou de eliminar um companheiro, equilibrando a troca.', game: 'cs2', tags: ['FPS', 'Estratégia'], ex: ['Morri, mas ele foi tradeado na sequência.'] },
    { word: 'Rotacionar', def: 'Mudar de um ponto do mapa para outro conforme a informação muda.', game: 'valorant', tags: ['FPS', 'Estratégia'], ex: ['Rotaciona para o A, eles estão todos lá.'] },
    { word: 'Baitar', def: 'Usar um companheiro como isca, deixando-o tomar o confronto sozinho para se aproveitar depois.', game: 'cs2', tags: ['FPS', 'Comportamento'], ex: ['Ele só baita o time e depois pega os kills.'] },
    { word: 'Crosshair placement', def: 'Manter a mira já na altura da cabeça e no ângulo certo antes de o inimigo aparecer.', game: 'valorant', tags: ['FPS', 'Fundamento'], ex: ['Com crosshair placement bom você mira menos e acerta mais.'] },
    { word: 'One-way', def: 'Fumaça posicionada de modo que um lado enxerga e o outro não.', game: 'valorant', tags: ['FPS', 'Técnica'], ex: ['Ele montou um one-way e pegou três.'] },
    { word: 'Anchor', def: 'Jogador que fica sozinho segurando um ponto até os companheiros rotacionarem.', game: 'valorant', tags: ['FPS', 'Função'], ex: ['Fica de anchor no B que a gente vem.'] },
    { word: 'Headshot', def: 'Tiro na cabeça, que causa dano muito maior e costuma eliminar de imediato.', game: 'cs2', tags: ['FPS', 'Mecânica'], ex: ['Cinco kills, cinco headshots.'] },
    { word: 'Fumar', def: 'Bloquear a visão do inimigo lançando uma granada de fumaça num ponto específico.', game: 'cs2', tags: ['FPS', 'Utilitário'], ex: ['Fuma a passagem antes de atravessar.'] },
    { word: 'Flash', def: 'Granada que cega temporariamente quem estiver olhando na direção dela.', game: 'valorant', tags: ['FPS', 'Utilitário'], ex: ['Joga uma flash antes de entrar.'] },
    { word: 'Molly', def: 'Granada incendiária usada para negar área e obrigar o inimigo a sair da posição.', game: 'cs2', tags: ['FPS', 'Utilitário'], ex: ['Molly no canto, que ele não aguenta ficar.'] },
    { word: 'Stack', def: 'Concentrar vários jogadores num mesmo ponto do mapa.', game: 'valorant', tags: ['FPS', 'Estratégia'], ex: ['Eles stackaram o A, vai no B.'] },
    { word: 'Dry peek', def: 'Abrir um ângulo sem usar nenhum utilitário antes, contando só com a mira.', game: 'cs2', tags: ['FPS', 'Técnica'], ex: ['Dry peek contra AWP nunca dá certo.'] },
    { word: 'Plantar', def: 'Instalar a bomba no ponto objetivo, iniciando a contagem regressiva.', game: 'cs2', tags: ['FPS', 'Objetivo'], ex: ['Planta primeiro e depois segura o ângulo.'] },

    /* ------------------------------------ MOBA ------------------------------------ */
    { word: 'Feed', def: 'Morrer repetidamente para o inimigo, entregando ouro e experiência de graça.', game: 'lol', tags: ['MOBA', 'Comportamento'], ex: ['Para de feedar, o top já está gigante.'] },
    { word: 'Carry', def: 'Jogador que concentra o maior impacto da partida e leva o time à vitória.', game: 'lol', tags: ['MOBA', 'Função'], ex: ['O ADC carregou a partida sozinho.'] },
    { word: 'Gank', def: 'Emboscada em que um jogador de outra rota aparece para pegar o inimigo desprevenido.', game: 'lol', tags: ['MOBA', 'Estratégia'], ex: ['Toma cuidado que o jungle está vindo gankar.'] },
    { word: 'Jungle', def: 'Área entre as rotas, cheia de monstros neutros, e a função de quem joga nela.', game: 'lol', tags: ['MOBA', 'Função'], ex: ['Nosso jungle não apareceu no mapa a partida toda.'] },
    { word: 'Lane', def: 'Cada um dos caminhos principais que ligam as bases, onde as tropas avançam.', game: 'lol', tags: ['MOBA', 'Mapa'], ex: ['Perdi a lane cedo e não consegui voltar.'] },
    { word: 'Last hit', def: 'Dar o golpe final numa tropa para receber o ouro dela.', game: 'lol', tags: ['MOBA', 'Fundamento'], ex: ['Treina last hit que seu farm melhora sozinho.'] },
    { word: 'CS', def: 'De "creep score": quantidade de tropas abatidas, medida básica de farm.', game: 'lol', tags: ['MOBA', 'Métrica'], ex: ['Ele está com 200 de CS aos dez minutos.'] },
    { word: 'Ward', def: 'Sentinela colocada no mapa para dar visão de uma área.', game: 'lol', tags: ['MOBA', 'Visão'], ex: ['Bota ward no rio antes do dragão.'] },
    { word: 'Roaming', def: 'Sair da própria rota para ajudar em outras partes do mapa.', game: 'lol', tags: ['MOBA', 'Estratégia'], ex: ['O mid sumiu, está roamando para o top.'] },
    { word: 'Split push', def: 'Pressionar uma rota sozinho enquanto o time ocupa o inimigo em outro ponto.', game: 'lol', tags: ['MOBA', 'Estratégia'], ex: ['Ele ganhou o jogo no split push.'] },
    { word: 'Teamfight', def: 'Confronto envolvendo a maior parte dos dois times ao mesmo tempo.', game: 'lol', tags: ['MOBA', 'Combate'], ex: ['Perdemos o teamfight e com ele o jogo.'] },
    { word: 'Inting', def: 'Jogar mal de propósito ou de forma tão ruim que parece intencional.', game: 'lol', tags: ['MOBA', 'Comportamento'], ex: ['Ele começou a intar depois de tomar tilt.'] },
    { word: 'Kite', def: 'Atacar recuando, mantendo distância para não ser alcançado.', game: 'lol', tags: ['MOBA', 'Técnica'], ex: ['Kita o tank em vez de bater de frente.'] },
    { word: 'Poke', def: 'Causar dano à distância aos poucos, sem se comprometer com a luta.', game: 'lol', tags: ['MOBA', 'Técnica'], ex: ['Fica pokando até eles ficarem sem vida para entrar.'] },
    { word: 'Engage', def: 'Iniciar o confronto, geralmente com uma habilidade de controle.', game: 'lol', tags: ['MOBA', 'Combate'], ex: ['Espera o suporte engajar pra entrar.'] },
    { word: 'Peel', def: 'Proteger o carry do time afastando quem tenta alcançá-lo.', game: 'lol', tags: ['MOBA', 'Função'], ex: ['Faz peel para o ADC em vez de correr atrás de kill.'] },
    { word: 'Snowball', def: 'Vantagem que cresce sozinha: quem está na frente fica cada vez mais forte.', game: 'lol', tags: ['MOBA', 'Dinâmica'], ex: ['Ela pegou first blood e snowballou o jogo.'] },
    { word: 'Ult', def: 'Habilidade definitiva do personagem, de maior impacto e maior tempo de recarga.', game: 'lol', tags: ['MOBA', 'Mecânica'], ex: ['Guarda a ult para o teamfight.'] },
    { word: 'Baron', def: 'Monstro neutro poderoso que concede um bônus decisivo ao time que o derruba.', game: 'lol', tags: ['MOBA', 'Objetivo'], ex: ['Fecharam o jogo com o buff de baron.'] },
    { word: 'Recall', def: 'Voltar à base para curar e comprar itens.', game: 'lol', tags: ['MOBA', 'Mecânica'], ex: ['Dá recall agora que a lane está empurrada.'] },
    { word: 'Farmar', def: 'Acumular ouro e experiência abatendo tropas e monstros.', game: 'dota2', tags: ['MOBA', 'Progressão'], ex: ['Deixa ele farmar em paz, que depois ele carrega.'] },

    /* -------------------------------- Battle royale ------------------------------- */
    { word: 'Queda', def: 'Momento de pular do transporte inicial e escolher onde aterrissar no mapa.', game: 'fortnite', tags: ['Battle Royale', 'Inicio'], ex: ['Nossa queda foi ruim, caimos sem loot.'] },
    { word: 'Zona', def: 'Área segura que encolhe com o tempo, forçando os jogadores a se aproximarem.', game: 'warzone', tags: ['Battle Royale', 'Mecânica'], ex: ['Corre que a zona está fechando.'] },
    { word: 'Third party', def: 'Chegar num confronto já em andamento para aproveitar que os dois lados estão enfraquecidos.', game: 'apex-legends', tags: ['Battle Royale', 'Estratégia'], ex: ['Ganhamos a luta e tomamos third party na hora.'] },
    { word: 'Hot drop', def: 'Cair de propósito no ponto mais disputado do mapa, buscando confronto imediato.', game: 'pubg-battlegrounds', tags: ['Battle Royale', 'Início'], ex: ['Hot drop toda partida é o jeito de treinar mira.'] },
    { word: 'Squad', def: 'Equipe de jogadores no modo em grupo.', game: 'apex-legends', tags: ['Battle Royale', 'Social'], ex: ['Fecha o squad que a fila está rápida.'] },
    { word: 'Revive', def: 'Levantar um companheiro caído antes que ele seja eliminado de vez.', game: 'apex-legends', tags: ['Battle Royale', 'Mecânica'], ex: ['Cobre que eu vou de revive.'] },
    { word: 'Kit', def: 'Conjunto de equipamentos e itens que o jogador carrega.', game: 'warzone', tags: ['Battle Royale', 'Itens'], ex: ['Peguei um kit completo logo na primeira casa.'] },

    /* --------------------------------- MMO e RPG ---------------------------------- */
    { word: 'Raid', def: 'Atividade cooperativa de alta dificuldade, feita por grupos grandes e coordenados.', game: 'wow', tags: ['MMO', 'Cooperativo'], ex: ['A raid nova exige o grupo inteiro focado.'] },
    { word: 'Tank', def: 'Função que absorve o dano dos inimigos e mantém a atenção deles longe do resto do grupo.', game: 'wow', tags: ['MMO', 'Função'], ex: ['Sem tank a party não sobrevive ao primeiro chefe.'] },
    { word: 'Healer', def: 'Função responsável por curar e manter o grupo vivo.', game: 'final-fantasy-xiv-online', tags: ['MMO', 'Função'], ex: ['O healer segurou a raid sozinho no final.'] },
    { word: 'DPS', def: 'De "damage per second": função focada em causar dano, e também a métrica desse dano.', game: 'wow', tags: ['MMO', 'Função'], ex: ['Meu DPS caiu porque errei a rotação.'] },
    { word: 'Aggro', def: 'Atenção dos inimigos: quem tem aggro é quem está sendo atacado.', game: 'wow', tags: ['MMO', 'Mecânica'], ex: ['Puxei aggro sem querer e morri na hora.'] },
    { word: 'Dungeon', def: 'Área fechada com inimigos e um chefe ao final, feita para grupos pequenos.', game: 'final-fantasy-xiv-online', tags: ['MMO', 'Conteúdo'], ex: ['Bora fazer a dungeon diária.'] },
    { word: 'Endgame', def: 'Conteúdo disponível após o nível máximo, onde a progressão passa a ser por equipamento.', game: 'destiny-2', tags: ['MMO', 'Progressão'], ex: ['O jogo começa de verdade no endgame.'] },
    { word: 'Drop rate', def: 'Probabilidade de um item específico cair de um inimigo ou baú.', game: 'warframe', tags: ['MMO', 'Itens'], ex: ['O drop rate dessa peça é cruel.'] },
    { word: 'Build', def: 'Combinação de equipamentos, habilidades e atributos que define como o personagem funciona.', game: 'diablo-iv', tags: ['RPG', 'Personagem'], ex: ['Troquei de build e o personagem virou outro.'] },
    { word: 'PvE', def: 'Jogador contra o ambiente: enfrentar inimigos controlados pelo jogo.', game: null, tags: ['Modo'], ex: ['Prefiro pve, pvp me estressa.'] },
    { word: 'PvP', def: 'Jogador contra jogador: enfrentar outras pessoas.', game: null, tags: ['Modo'], ex: ['O pvp desse jogo e desequilibrado.'] },

    /* --------------------------------- Souls-like --------------------------------- */
    { word: 'Boss', def: 'Inimigo de destaque, muito mais forte que os comuns, que costuma encerrar uma área.', game: 'eldenring', tags: ['Souls', 'Combate'], ex: ['Morri quarenta vezes nesse boss.'] },
    { word: 'Parry', def: 'Aparar o golpe no momento exato, abrindo o inimigo para um contra-ataque devastador.', game: 'sekiro-shadows-die-twice', tags: ['Souls', 'Técnica'], ex: ['O jogo inteiro melhora quando você aprende a dar parry.'] },
    { word: 'Cheese', def: 'Vencer um desafio explorando uma brecha, evitando enfrentá-lo como foi projetado.', game: 'dark-souls-iii', tags: ['Souls', 'Estratégia'], ex: ['Dei cheese no boss usando o terreno.'] },
    { word: 'Invasao', def: 'Entrar no mundo de outro jogador como inimigo, para caçá-lo.', game: 'eldenring', tags: ['Souls', 'PvP'], ex: ['Tomei invasão bem antes do chefe.'] },
    { word: 'No-hit', def: 'Terminar um chefe ou o jogo inteiro sem levar um único dano.', game: 'dark-souls-iii', tags: ['Souls', 'Desafio'], ex: ['Ele fez a run inteira no-hit.'] },
    { word: 'Run', def: 'Uma tentativa completa de percorrer o jogo, do início ao fim ou até morrer.', game: 'hades', tags: ['Roguelike', 'Estrutura'], ex: ['Minha melhor run acabou no último chefe.'] },

    /* -------------------------------- Luta / fighting ------------------------------ */
    { word: 'Combo', def: 'Sequência de golpes encadeados de forma que o oponente não consegue reagir no meio.', game: 'sf6', tags: ['Luta', 'Mecanica'], ex: ['Esse combo tira metade da barra.'] },
    { word: 'Frame data', def: 'Dados exatos de quantos quadros cada golpe leva para sair, acertar e recuperar.', game: 'tekken-8', tags: ['Luta', 'Tecnico'], ex: ['Quem estuda frame data para de chutar no escuro.'] },
    { word: 'Punish', def: 'Castigar um golpe do oponente que deixou brecha, atacando durante a recuperação dele.', game: 'sf6', tags: ['Luta', 'Tecnica'], ex: ['Ele errou o chute e tomou punish completo.'] },
    { word: 'Mix-up', def: 'Alternar entre opções que exigem defesas diferentes, forçando o oponente a adivinhar.', game: 'guilty-gear-strive', tags: ['Luta', 'Estrategia'], ex: ['O mix-up dela é impossível de ler.'] },
    { word: 'Zoning', def: 'Controlar a distância com ataques de longo alcance, impedindo o oponente de se aproximar.', game: 'mortal-kombat-1', tags: ['Luta', 'Estrategia'], ex: ['Perdi pro zoning, nunca cheguei perto.'] },
    { word: 'Neutral', def: 'Fase da luta em que ninguém tem vantagem e os dois disputam posição.', game: 'sf6', tags: ['Luta', 'Conceito'], ex: ['Ele ganha todo neutral e depois abre o combo.'] },
    { word: 'Spam', def: 'Repetir o mesmo golpe insistentemente, contando que o oponente não saiba punir.', game: 'mortal-kombat-1', tags: ['Luta', 'Comportamento'], ex: ['Só spamma rasteira, dá para punir fácil.'] },

    /* ------------------------------ Sobrevivencia e craft ------------------------- */
    { word: 'Craftar', def: 'Fabricar itens combinando recursos coletados.', game: 'minecraft', tags: ['Sobrevivencia', 'Mecanica'], ex: ['Crafta uma picareta de ferro antes de descer.'] },
    { word: 'Creeper', def: 'Criatura verde que se aproxima em silêncio e explode, destruindo construções.', game: 'minecraft', tags: ['Sobrevivencia', 'Inimigo'], ex: ['Um creeper explodiu metade da minha casa.'] },
    { word: 'Nether', def: 'Dimensão subterrânea e hostil, usada também como atalho para viajar distâncias longas.', game: 'minecraft', tags: ['Sobrevivencia', 'Mundo'], ex: ['Fiz um portal para o nether para encurtar o caminho.'] },
    { word: 'Redstone', def: 'Material que transmite sinal e permite construir mecanismos e circuitos dentro do jogo.', game: 'minecraft', tags: ['Sobrevivencia', 'Construcao'], ex: ['A fazenda automática dele é puro redstone.'] },
    { word: 'Raid de base', def: 'Invadir a construção de outro jogador para roubar recursos.', game: 'rust', tags: ['Sobrevivencia', 'PvP'], ex: ['Perdemos tudo num raid enquanto estávamos offline.'] },
    { word: 'Wipe de servidor', def: 'Reinício periódico que apaga todo o progresso e devolve o servidor ao estado inicial.', game: 'rust', tags: ['Sobrevivencia', 'Servidor'], ex: ['O wipe é quinta, não vale mais construir.'] },
    { word: 'Hardcore', def: 'Modo em que a morte é definitiva e apaga o mundo ou o personagem.', game: 'minecraft', tags: ['Sobrevivencia', 'Modo'], ex: ['Morri no hardcore com trezentos dias.'] },

    /* -------------------------------- Terror / co-op ------------------------------ */
    { word: 'Gerador', def: 'Objetivo que os sobreviventes precisam reparar para abrir a saída.', game: 'dead-by-daylight', tags: ['Terror', 'Objetivo'], ex: ['Faltam dois geradores para abrir o portão.'] },
    { word: 'Killer', def: 'Jogador que assume o papel do assassino, caçando os demais.', game: 'dead-by-daylight', tags: ['Terror', 'Funcao'], ex: ['O killer estava campeando o gancho.'] },
    { word: 'Loop', def: 'Girar em torno de um obstáculo para ganhar tempo enquanto é perseguido.', game: 'dead-by-daylight', tags: ['Terror', 'Tecnica'], ex: ['Segurei o killer dois minutos no loop.'] },
    { word: 'Quota', def: 'Meta de lucro que a equipe precisa entregar para continuar jogando.', game: 'lethal-company', tags: ['Cooperativo', 'Objetivo'], ex: ['Não batemos a quota e fomos demitidos.'] },

    /* ----------------------------- Corrida e esportes ----------------------------- */
    { word: 'Aerial', def: 'Acertar a bola no ar, com o carro em voo.', game: 'rocket-league', tags: ['Esporte', 'Tecnica'], ex: ['Ele fez o gol de aerial no último segundo.'] },
    { word: 'Kickoff', def: 'Disputa inicial pela bola no centro do campo, no começo de cada tempo ou após gol.', game: 'rocket-league', tags: ['Esporte', 'Mecanica'], ex: ['Perder kickoff toda vez custa o jogo.'] },
    { word: 'Undercut', def: 'Parar nos boxes antes do rival para ganhar posição com pneus novos.', game: 'f1-24', tags: ['Corrida', 'Estrategia'], ex: ['Ganhou a posição no undercut.'] },
    { word: 'Drift', def: 'Deslizar o carro de lado nas curvas, mantendo o controle da derrapagem.', game: 'forza-horizon-5', tags: ['Corrida', 'Tecnica'], ex: ['Fez a curva inteira em drift.'] },

    /* --------------------------------- Estrategia --------------------------------- */
    { word: 'Rush de tropas', def: 'Atacar muito cedo, antes de o oponente ter defesa montada.', game: 'age-of-empires', tags: ['Estrategia', 'Tatica'], ex: ['Ganhou no rush aos cinco minutos.'] },
    { word: 'Boom', def: 'Priorizar economia e crescimento em vez de atacar cedo, apostando no longo prazo.', game: 'age-of-empires', tags: ['Estrategia', 'Economia'], ex: ['Ele boomou e no final tinha o dobro de recursos.'] },
    { word: 'Micro', def: 'Controle fino de unidades individuais durante o combate.', game: 'age-of-empires', tags: ['Estrategia', 'Habilidade'], ex: ['O micro dele salvou um exército perdido.'] },
    { word: 'Macro', def: 'Gestão geral da economia, produção e expansão, em oposição ao controle unidade a unidade.', game: 'age-of-empires', tags: ['Estrategia', 'Habilidade'], ex: ['Perdi porque esqueci o macro focando no combate.'] },
];

// Notas de origem. Etimologia real — e o que da valor ao painel de Origem, que sem
// exemplo fica invisivel. Onde a origem e disputada, o texto diz isso em vez de inventar.
const ORIGENS = {
    Nerf: 'Vem da marca de brinquedos Nerf, conhecida pelas armas de espuma. Dizer que algo "foi nerfado" é dizer que viraram brinquedo: continua existindo, mas não machuca mais.',
    Smurf: 'Nasceu no Warcraft II, nos anos 90. Dois jogadores muito fortes criaram contas novas chamadas PapaSmurf e Smurfette porque ninguem mais aceitava partida contra eles com os nomes reais. O apelido pegou e virou o termo para conta secundaria.',
    Gank: 'Contração de "gang kill" — matar em bando. Descreve exatamente o que é: vários contra um que não esperava.',
    Elo: 'Homenagem a Arpad Elo, físico húngaro-americano que criou o sistema de pontuação usado no xadrez. Não é sigla, é sobrenome — por isso "Elo" e não "ELO".',
    Tilt: 'Vem do pinball: inclinar a maquina para forcar a bola dava falta e travava o jogo. No poker o termo passou a descrever o jogador que perde o controle emocional, e dali chegou aos jogos eletronicos.',
    Noob: 'Corruptela de "newbie", que por sua vez vem de "new" — novato. A grafia com dois zeros ("n00b") apareceu no jargao de internet dos anos 90 e costuma carregar mais deboche que a forma original.',
    Creeper: 'Foi um acidente. Notch, criador do Minecraft, errou as dimensões ao modelar um porco e trocou altura por comprimento. O resultado ficou tão estranho que virou inimigo em vez de bug corrigido.',
    Spam: 'Vem de um quadro do Monty Python em que a palavra "spam" é repetida até não sobrar mais nada da conversa. Passou a significar repetição insistente — no e-mail e depois nos jogos.',
    AFK: 'Sigla de "away from keyboard", nascida nos canais de IRC dos anos 80 e 90, quando avisar que voce ia sair era etiqueta basica de sala de bate-papo.',
    GG: 'Abreviação de "good game", herdada da etiqueta dos jogos de estratégia em rede, onde era costume cumprimentar o adversário ao fim da partida. Sobreviveu até quando a intenção passou a ser irônica.',
    Meta: 'Costuma ser explicada como sigla de "most effective tactic available", mas isso e um acronimo inventado depois. A origem real e o prefixo grego "meta", de "sobre" — o meta e o jogo sobre o jogo.',
    Boss: 'Vem dos fliperamas japoneses, onde o inimigo final de fase era chamado de chefe por analogia com a hierarquia de uma organizacao criminosa: para chegar ao topo, voce derruba os subordinados primeiro.',
    Camper: 'Do ingles "to camp", acampar. Apareceu nos primeiros FPS multijogador, quando ficar parado num canto virou tatica eficiente o bastante para gerar reclamacao — e apelido.',
    Feed: 'Literalmente "alimentar". Morrer repetidamente alimenta o inimigo com ouro e experiência, engordando justamente quem você deveria conter.',
    Clutch: 'Emprestado do esporte americano, onde "clutch player" é quem rende mais sob pressão, nos momentos decisivos. Chegou aos jogos competitivos pelo mesmo caminho de vários outros termos esportivos.',
    Ace: 'Vem do tenis e das cartas, onde o as e a carta mais alta e o saque perfeito e chamado de ace. Nos FPS passou a nomear a rodada perfeita: matar o time inteiro sozinho.',
    Grind: 'Do inglês "to grind", moer ou triturar. Descreve a natureza repetitiva e mecânica da tarefa — você não joga, você mói.',
    Raid: 'Vem do vocabulario militar, onde raid e uma incursao coordenada em territorio inimigo. Os MMOs adotaram o termo para as investidas de grupos grandes contra um alvo unico.',
    Buff: 'Do ingles "to buff", polir. Polir algo e deixa-lo melhor — o oposto exato de nerfar.',
};

const WORDS = TERMS.map((t) => t.word);

async function remove() {
    const res = await prisma.term.deleteMany({ where: { word: { in: WORDS } } });
    console.log(`Removidos ${res.count} termo(s) de demonstracao.`);
}

async function seed() {
    const refreshCopy = process.argv.includes('--refresh-copy');
    const games = await prisma.game.findMany({ select: { id: true, name: true, slug: true } });
    const findGame = (needle) => needle && games.find((g) =>
        g.slug.toLowerCase().includes(needle) || g.name.toLowerCase().includes(needle));
    const authors = await prisma.user.findMany({
        where: { email: { endsWith: '@demo.dicionariogamer.local' } },
        select: { id: true },
    });

    let created = 0;
    let updated = 0;
    for (let i = 0; i < TERMS.length; i++) {
        const t = TERMS[i];
        const game = findGame(t.game);
        const gameId = game ? game.id : null;
        const exists = await prisma.term.findFirst({
            where: { word: { equals: t.word, mode: 'insensitive' } },
            select: { id: true },
        });
        if (exists) {
            if (refreshCopy) {
                await prisma.$transaction([
                    prisma.term.update({
                        where: { id: exists.id },
                        data: { definition: t.def, examples: t.ex, tags: t.tags },
                    }),
                    prisma.termMeaning.updateMany({
                        where: { termId: exists.id, order: 1 },
                        data: { definition: t.def, examples: t.ex },
                    }),
                    ...(t.senses || []).map((sense, index) => prisma.termMeaning.updateMany({
                        where: { termId: exists.id, order: index + 2 },
                        data: { definition: sense.def, examples: sense.ex || [] },
                    })),
                ]);
                updated++;
            }
            continue;
        }

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
    if (refreshCopy) console.log(`Textos atualizados em ${updated} termo(s) existentes.`);
    console.log(`${TERMS.length - semJogo} amarrados a um jogo, ${semJogo} transversais.`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
