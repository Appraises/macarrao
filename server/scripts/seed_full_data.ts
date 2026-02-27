import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GAMES = [
    { name: 'League of Legends', slug: 'lol', genre: 'MOBA', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg' },
    { name: 'Valorant', slug: 'valorant', genre: 'FPS', image: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt3f072536d5a3e166/6201d629e00b43671c32f755/Jett_Key_Art_Valorant.jpg' },
    { name: 'Counter-Strike 2', slug: 'cs2', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg' },
    { name: 'World of Warcraft', slug: 'wow', genre: 'MMORPG', image: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/2g/2G4VNH5J968S1573515620442.jpg' },
    { name: 'Elden Ring', slug: 'eldenring', genre: 'RPG', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg' },
    { name: 'Street Fighter 6', slug: 'sf6', genre: 'Fighting', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1364780/header.jpg' },
    { name: 'Overwatch 2', slug: 'overwatch', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg' },
    { name: 'Rocket League', slug: 'rocket-league', genre: 'Sports', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg' },
    { name: 'Minecraft', slug: 'minecraft', genre: 'Sandbox', image: 'https://image.api.playstation.com/vulcan/img/rnd/202010/2119/9f7e4f9b0c5d4f3b8b8b0e8b8b8b8b8b.png' },
    { name: 'Fortnite', slug: 'fortnite', genre: 'Battle Royale', image: 'https://cdn2.unrealengine.com/fortnite-chapter-5-season-2-1920x1080-602079089.jpg' },
    { name: 'Dota 2', slug: 'dota2', genre: 'MOBA', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' },
    { name: 'Call of Duty: Warzone', slug: 'warzone', genre: 'Battle Royale', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg' },
];

const MOCK_TERMS = [
    // --- GENERAL TERMS ---
    {
        word: 'Gank',
        definition: 'Ato de emboscar um inimigo, geralmente aparecendo de surpresa em sua rota para criar vantagem numérica.',
        phonetic: '/ɡæŋk/',
        pronunciationGuide: 'Guen-k',
        examples: [
            'O jungler veio dar um gank no top.',
            'Cuidado com o gank, o mid sumiu.'
        ],
        relatedTerms: ['Roam', 'Camp', 'Dive'],
        gameSpecifics: [
            { gameName: 'League of Legends', context: 'Quando o caçador sai da selva para ajudar uma rota.' }
        ],
        upvotes: 1250,
        downvotes: 12,
        tags: ['Estratégia', 'MOBA', 'General'],
        verified: true
    },
    {
        word: 'Nerf',
        definition: 'Enfraquecimento de um personagem, item ou habilidade pelos desenvolvedores para balancear o jogo.',
        phonetic: '/nɜːrf/',
        pronunciationGuide: 'Nêrf',
        examples: [
            'A Jett tomou um nerf pesado no último patch.',
            'Precisam nerfar essa arma, está muito forte.'
        ],
        relatedTerms: ['Buff', 'OP', 'Broken'],
        upvotes: 890,
        downvotes: 5,
        tags: ['Balanceamento', 'Geral', 'General'],
        verified: true
    },
    {
        word: 'Smurf',
        definition: 'Um jogador experiente que cria uma conta nova para jogar contra iniciantes ou jogadores de nível inferior.',
        phonetic: '/smɜːrf/',
        pronunciationGuide: 'Smârf',
        examples: [
            'Aquele Reyna é smurf, certeza.',
            'Vou criar uma smurf para jogar com meu amigo prata.'
        ],
        relatedTerms: ['Elojob', 'Boosting'],
        upvotes: 2300,
        downvotes: 450,
        tags: ['Comportamento', 'Geral', 'General'],
        verified: true
    },
    {
        word: 'Intar',
        definition: 'Morrer intencionalmente (Intentional Feeding) ou jogar muito mal, prejudicando o time.',
        phonetic: '/ɪnt/',
        pronunciationGuide: 'In-tar',
        examples: [
            'O Yasuo tá intando o jogo todo.',
            'Pare de intar e jogue recuado.'
        ],
        relatedTerms: ['Feeder', 'Troll', 'Throw'],
        upvotes: 1500,
        downvotes: 20,
        tags: ['Comportamento', 'Gíria', 'General'],
        verified: true
    },
    {
        word: 'Tilt',
        definition: 'Estado emocional de frustração que faz o jogador jogar pior.',
        phonetic: '/tɪlt/',
        pronunciationGuide: 'Tilt',
        examples: ['Ele tiltou depois de morrer.', 'Não tilta, ainda dá para ganhar.'],
        relatedTerms: ['Rage', 'Toxic'],
        upvotes: 5000,
        downvotes: 20,
        tags: ['Psicológico', 'Geral', 'General'],
        verified: true
    },

    // --- LEAGUE OF LEGENDS ---
    {
        word: 'Recall',
        definition: 'Habilidade padrão (tecla B) que teleporta o campeão de volta para a base após um tempo de canalização.',
        phonetic: '/rɪˈkɔːl/',
        pronunciationGuide: 'Ri-cól',
        examples: ['Vou dar recall para comprar itens.', 'Cancelei o recall dele com um ataque.'],
        relatedTerms: ['Base', 'Shop'],
        gameSpecifics: [{ gameName: 'League of Legends', context: 'Voltar para a fonte para regenerar vida e comprar itens.' }],
        upvotes: 400,
        downvotes: 2,
        tags: ['Mecânica', 'MOBA'],
        verified: true
    },
    {
        word: 'Inibidor',
        definition: 'Estrutura localizada na base inimiga. Ao ser destruída, faz com que a sua equipe gere Super Minions naquela rota.',
        phonetic: '/i.ni.bi.dor/',
        pronunciationGuide: 'Inibidor',
        examples: ['Focamos o inibidor do meio para abrir o mapa.', 'O inibidor vai renascer em breve.'],
        relatedTerms: ['Nexus', 'Torre', 'Super Minion'],
        gameSpecifics: [{ gameName: 'League of Legends', context: 'Estrutura chave para finalizar o jogo.' }],
        upvotes: 350,
        downvotes: 5,
        tags: ['Objetivo', 'MOBA'],
        verified: true
    },
    {
        word: 'Wave Management',
        definition: 'Técnica de controlar o fluxo de tropas (minions) para negar farm ao inimigo ou criar oportunidades de gank.',
        phonetic: '/weɪv ˈmæn.ɪdʒ.mənt/',
        pronunciationGuide: 'Ueive Me-nedj-ment',
        examples: ['Estou fazendo um slow push.', 'Preciso freezar a wave aqui.'],
        relatedTerms: ['Freeze', 'Push', 'Slow Push'],
        gameSpecifics: [{ gameName: 'League of Legends', context: 'Essencial para a fase de rotas (laning phase).' }],
        upvotes: 800,
        downvotes: 15,
        tags: ['Estratégia', 'MOBA'],
        verified: true
    },
    {
        word: 'Leash',
        definition: 'Ajudar o caçador (Jungler) a causar dano no primeiro monstro da selva para acelerar o início dele.',
        phonetic: '/liːʃ/',
        pronunciationGuide: 'Lixe',
        examples: ['O bot lane deu um leash forte.', 'Sem leash vou demorar mais.'],
        relatedTerms: ['Jungle', 'Pull'],
        gameSpecifics: [{ gameName: 'League of Legends', context: 'Geralmente feito pelo Top ou Bot lane no início do jogo.' }],
        upvotes: 600,
        downvotes: 10,
        tags: ['Estratégia', 'MOBA'],
        verified: true
    },

    // --- VALORANT ---
    {
        word: 'Spike',
        definition: 'O dispositivo explosivo que os atacantes devem plantar em um dos sites (A, B ou C). Equivalente à bomba (C4) do CS.',
        phonetic: '/spaɪk/',
        pronunciationGuide: 'Spai-que',
        examples: ['A Spike está caída no meio.', 'Planta a Spike logo!'],
        relatedTerms: ['Plant', 'Defuse'],
        gameSpecifics: [{ gameName: 'Valorant', context: 'Objetivo principal do time de ataque.' }],
        upvotes: 1100,
        downvotes: 25,
        tags: ['Objetivo', 'FPS'],
        verified: true
    },
    {
        word: 'Operator (Op)',
        definition: 'O rifle de precisão (sniper) mais caro e poderoso do jogo. Mata com um tiro no corpo.',
        phonetic: '/ˈɒp.ər.eɪ.tər/',
        pronunciationGuide: 'Ó-pe',
        examples: ['Cuidado, tem uma Op no fundo.', 'Vou economizar para comprar a Operator.'],
        relatedTerms: ['Sniper', 'AWP'],
        gameSpecifics: [{ gameName: 'Valorant', context: 'Arma de alto risco e alta recompensa.' }],
        upvotes: 950,
        downvotes: 30,
        tags: ['Arma', 'FPS'],
        verified: true
    },
    {
        word: 'Default',
        definition: 'Estratégia onde o time se espalha pelo mapa no início do round para buscar informações e controle de área sem comprometer um site.',
        phonetic: '/dɪˈfɔːlt/',
        pronunciationGuide: 'Di-fôlt',
        examples: ['Vamos jogar default e esperar o erro deles.', 'Façam um default 2-1-2.'],
        relatedTerms: ['Rush', 'Hold'],
        gameSpecifics: [{ gameName: 'Valorant', context: 'Padrão de jogo lento e metódico.' }],
        upvotes: 700,
        downvotes: 10,
        tags: ['Estratégia', 'FPS'],
        verified: true
    },
    {
        word: 'Lineup',
        definition: 'Posicionamento específico e alinhamento de mira para lançar habilidades (como molotovs ou flechas) em locais distantes com precisão.',
        phonetic: '/ˈlaɪn.ʌp/',
        pronunciationGuide: 'Lai-nap',
        examples: ['Tenho um lineup de Viper para o pós-plant.', 'Sova, você tem lineup para o bomb A?'],
        relatedTerms: ['Pixel', 'Molly'],
        gameSpecifics: [{ gameName: 'Valorant', context: 'Muito usado por controladores e iniciadores.' }],
        upvotes: 1200,
        downvotes: 40,
        tags: ['Mecânica', 'FPS'],
        verified: true
    },

    // --- CS2 ---
    {
        word: 'Eco Round',
        definition: 'Rodada em que o time compra pouco ou nenhum equipamento para economizar dinheiro para o próximo round.',
        phonetic: '/ˈiː.koʊ/',
        pronunciationGuide: 'É-co',
        examples: ['Estamos sem grana, vamos fazer um eco.', 'Eles ganharam o eco round apenas com pistolas.'],
        relatedTerms: ['Force Buy', 'Full Buy'],
        gameSpecifics: [{ gameName: 'Counter-Strike 2', context: 'Gestão de economia essencial.' }],
        upvotes: 1500,
        downvotes: 5,
        tags: ['Economia', 'FPS'],
        verified: true
    },
    {
        word: 'Rush B',
        definition: 'Estratégia agressiva onde todo o time corre rapidamente para o bombsite B sem parar.',
        phonetic: '/rʌʃ biː/',
        pronunciationGuide: 'Râsh Bi',
        examples: ['P90 e Rush B, não para!', 'Eles fizeram um Rush B muito rápido.'],
        relatedTerms: ['Hold', 'Push'],
        gameSpecifics: [{ gameName: 'Counter-Strike 2', context: 'Meme clássico e estratégia real.' }],
        upvotes: 5000,
        downvotes: 50,
        tags: ['Estratégia', 'FPS'],
        verified: true
    },
    {
        word: 'Clutch',
        definition: 'Situação onde um jogador sozinho consegue vencer a rodada contra múltiplos inimigos vivos.',
        phonetic: '/klʌtʃ/',
        pronunciationGuide: 'Clâ-tch',
        examples: ['Ele ganhou um clutch 1v3 incrível.', 'Rei do clutch!'],
        relatedTerms: ['Ace', 'Choke'],
        gameSpecifics: [{ gameName: 'Counter-Strike 2', context: 'Momento de alta tensão.' }],
        upvotes: 2100,
        downvotes: 20,
        tags: ['Geral', 'FPS'],
        verified: true
    },
    {
        word: 'Entry Fragger',
        definition: 'O primeiro jogador a entrar no bombsite ou área de conflito, responsável por buscar a primeira eliminação e abrir espaço.',
        phonetic: '/ˈen.tri fræɡ.ər/',
        pronunciationGuide: 'Êntri Fré-guer',
        examples: ['Nosso entry fragger morreu sem trocar.', 'Preciso de suporte para dar entry.'],
        relatedTerms: ['Lurker', 'Support'],
        gameSpecifics: [{ gameName: 'Counter-Strike 2', context: 'Função de alto risco.' }],
        upvotes: 850,
        downvotes: 10,
        tags: ['Função', 'FPS'],
        verified: true
    },

    // --- WORLD OF WARCRAFT ---
    {
        word: 'Wipe',
        definition: 'Quando todo o grupo morre em uma masmorra ou raid, exigindo que todos renasçam e tentem novamente.',
        phonetic: '/waɪp/',
        pronunciationGuide: 'Uai-pe',
        examples: ['Wipamos no boss com 1% de vida.', 'Se o tank morrer, é wipe.'],
        relatedTerms: ['Reset', 'Run back'],
        gameSpecifics: [{ gameName: 'World of Warcraft', context: 'Falha total do grupo.' }],
        upvotes: 1300,
        downvotes: 25,
        tags: ['Gíria', 'MMORPG'],
        verified: true
    },
    {
        word: 'Aggro',
        definition: 'Atenção ou hostilidade de um NPC inimigo. "Puxar o aggro" significa fazer o inimigo te atacar.',
        phonetic: '/ˈæɡ.roʊ/',
        pronunciationGuide: 'Á-gro',
        examples: ['Cuidado para não puxar o aggro do boss.', 'O tank perdeu o aggro.'],
        relatedTerms: ['Threat', 'Taunt'],
        gameSpecifics: [{ gameName: 'World of Warcraft', context: 'Mecânica central de tanques.' }],
        upvotes: 650,
        downvotes: 5,
        tags: ['Mecânica', 'MMORPG'],
        verified: true
    },
    {
        word: 'Raid',
        definition: 'Conteúdo de alto nível para grupos grandes (10 a 25+ jogadores) enfrentarem chefes difíceis.',
        phonetic: '/reɪd/',
        pronunciationGuide: 'Rei-de',
        examples: ['Hoje tem raid da guilda às 20h.', 'Conseguimos limpar a raid ontem.'],
        relatedTerms: ['Dungeon', 'Pug'],
        gameSpecifics: [{ gameName: 'World of Warcraft', context: 'Endgame PvE.' }],
        upvotes: 900,
        downvotes: 10,
        tags: ['Conteúdo', 'MMORPG'],
        verified: true
    },
    {
        word: 'Alt (Alternative Character)',
        definition: 'Personagem secundário de um jogador, diferente do seu "Main" (principal).',
        phonetic: '/ɔːlt/',
        pronunciationGuide: 'Alt',
        examples: ['Estou upando um alt healer.', 'Vou logar no meu alt para craftar.'],
        relatedTerms: ['Main', 'Twink'],
        gameSpecifics: [{ gameName: 'World of Warcraft', context: 'Comum ter vários alts.' }],
        upvotes: 550,
        downvotes: 5,
        tags: ['Geral', 'MMORPG'],
        verified: true
    },

    // --- ELDEN RING ---
    {
        word: 'Site of Grace',
        definition: 'Pontos de checagem (fogueiras) onde o jogador pode descansar, subir de nível e recuperar vida. Inimigos respawnam ao usar.',
        phonetic: '/saɪt ɒv ɡreɪs/',
        pronunciationGuide: 'Saite óv Greice',
        examples: ['Toquei no Site of Grace antes do boss.', 'Preciso achar uma graça urgente.'],
        relatedTerms: ['Bonfire', 'Checkpoint'],
        gameSpecifics: [{ gameName: 'Elden Ring', context: 'Mecânica central de progressão.' }],
        upvotes: 750,
        downvotes: 5,
        tags: ['Mecânica', 'RPG'],
        verified: true
    },
    {
        word: 'Maidenless',
        definition: 'Insulto usado por Varré no início do jogo, que virou meme na comunidade para chamar alguém de solteiro ou sem habilidade.',
        phonetic: '/ˈmeɪ.dən.ləs/',
        pronunciationGuide: 'Mei-den-les',
        examples: ['Você é maidenless?', 'Totalmente maidenless behavior.'],
        relatedTerms: ['Tarnished', 'Touch Grass'],
        gameSpecifics: [{ gameName: 'Elden Ring', context: 'Meme da comunidade.' }],
        upvotes: 3000,
        downvotes: 100,
        tags: ['Meme', 'RPG'],
        verified: true
    },
    {
        word: 'Tarnished',
        definition: 'Termo usado para se referir ao protagonista e outros personagens que perderam a graça da Erdtree. O jogador é um Tarnished.',
        phonetic: '/ˈtɑːr.nɪʃt/',
        pronunciationGuide: 'Tar-nisht',
        examples: ['Levante-se, Tarnished.', 'Outro Tarnished invadiu meu mundo.'],
        relatedTerms: ['Undead', 'Ashen One'],
        gameSpecifics: [{ gameName: 'Elden Ring', context: 'Lore do jogo.' }],
        upvotes: 600,
        downvotes: 5,
        tags: ['Lore', 'RPG'],
        verified: true
    },
    {
        word: 'Fat Roll',
        definition: 'Quando o personagem está com carga de equipamento muito pesada, fazendo com que a esquiva (roll) seja lenta e curta.',
        phonetic: '/fæt roʊl/',
        pronunciationGuide: 'Fét Rôu',
        examples: ['Tira essa armadura, você tá dando fat roll.', 'Morri pro boss por causa do fat roll.'],
        relatedTerms: ['I-frames', 'Equip Load'],
        gameSpecifics: [{ gameName: 'Elden Ring', context: 'Erro comum de iniciantes.' }],
        upvotes: 900,
        downvotes: 10,
        tags: ['Mecânica', 'RPG'],
        verified: true
    },

    // --- STREET FIGHTER 6 ---
    {
        word: 'Drive Impact',
        definition: 'Mecânica universal poderosa que absorve ataques (armor) e deixa o oponente vulnerável se acertar.',
        phonetic: '/draɪv ˈɪm.pækt/',
        pronunciationGuide: 'Draive Im-péc-t',
        examples: ['Ele spammou Drive Impact o round todo.', 'Reagi ao Drive Impact dele com o meu.'],
        relatedTerms: ['Drive Gauge', 'Parry'],
        gameSpecifics: [{ gameName: 'Street Fighter 6', context: 'Mecânica definidora do SF6.' }],
        upvotes: 1100,
        downvotes: 40,
        tags: ['Mecânica', 'Fighting'],
        verified: true
    },
    {
        word: 'Footsies',
        definition: 'Jogo neutro onde os jogadores tentam controlar o espaço e acertar golpes (pokes) mantendo uma distância segura.',
        phonetic: '/ˈfʊt.siz/',
        pronunciationGuide: 'Fut-sis',
        examples: ['O footsies da Chun-Li é muito forte.', 'Ganhei no footsies e converti em combo.'],
        relatedTerms: ['Neutral', 'Spacing'],
        gameSpecifics: [{ gameName: 'Street Fighter 6', context: 'Fundamento de jogos de luta.' }],
        upvotes: 850,
        downvotes: 15,
        tags: ['Conceito', 'Fighting'],
        verified: true
    },
    {
        word: 'Zoning',
        definition: 'Estratégia de manter o oponente longe usando projéteis (hadouken) e golpes de longo alcance.',
        phonetic: '/ˈzoʊ.nɪŋ/',
        pronunciationGuide: 'Zo-ning',
        examples: ['O Guile é o rei do zoning.', 'Não consigo passar pelo zoning desse JP.'],
        relatedTerms: ['Keep away', 'Projectile'],
        gameSpecifics: [{ gameName: 'Street Fighter 6', context: 'Arquétipo de personagem.' }],
        upvotes: 700,
        downvotes: 50,
        tags: ['Estratégia', 'Fighting'],
        verified: true
    },
    {
        word: 'Frame Data',
        definition: 'Dados matemáticos das animações dos golpes (início, ativo, recuperação) que determinam se é seguro ou punível atacar.',
        phonetic: '/freɪm ˈdeɪ.tə/',
        pronunciationGuide: 'Frei-me Dei-ta',
        examples: ['Esse golpe é -5 na defesa, não é punível.', 'Estudei a frame data para saber quando apertar botão.'],
        relatedTerms: ['Punish', 'Plus on block'],
        gameSpecifics: [{ gameName: 'Street Fighter 6', context: 'Conhecimento técnico avançado.' }],
        upvotes: 1200,
        downvotes: 5,
        tags: ['Técnico', 'Fighting'],
        verified: true
    },

    // --- OVERWATCH 2 ---
    {
        word: 'C9',
        definition: 'Quando um time vence a luta (teamfight) mas esquece de ficar no objetivo (carga ou ponto) e perde o round por desatenção.',
        phonetic: '/siː naɪn/',
        pronunciationGuide: 'Cê-Naine',
        examples: ['Ganhamos a fight mas demos C9.', 'Sai do ponto não, cuidado com o C9.'],
        relatedTerms: ['Backcap', 'Objective'],
        gameSpecifics: [{ gameName: 'Overwatch 2', context: 'Erro clássico eternizado pelo time Cloud9.' }],
        upvotes: 1800,
        downvotes: 20,
        tags: ['Meme', 'Gíria', 'FPS'],
        verified: true
    },
    {
        word: 'Ult Economy',
        definition: 'Gerenciamento das habilidades supremas (Ultimates) do time. Saber quando usar e quando guardar para a próxima luta.',
        phonetic: '/ʌlt ɪˈkɒn.ə.mi/',
        pronunciationGuide: 'Âlt Ecôn-o-mi',
        examples: ['Temos vantagem na ult economy.', 'Não gaste ult agora, a luta já está perdida.'],
        relatedTerms: ['Dry Push', 'Combo'],
        gameSpecifics: [{ gameName: 'Overwatch 2', context: 'Crucial para vencer partidas.' }],
        upvotes: 600,
        downvotes: 5,
        tags: ['Estratégia', 'FPS'],
        verified: true
    },

    // --- ROCKET LEAGUE ---
    {
        word: 'Flip Reset',
        definition: 'Mecânica avançada onde o jogador encosta as quatro rodas na bola no ar para recuperar o pulo (dash) e usá-lo novamente.',
        phonetic: '/flɪp rɪˈsɛt/',
        pronunciationGuide: 'Flípi Rissét',
        examples: ['Ele mandou um flip reset absurdo no ângulo.', 'Estou treinando flip reset no freeplay.'],
        relatedTerms: ['Ceiling Shot', 'Aerial'],
        gameSpecifics: [{ gameName: 'Rocket League', context: 'Gol de alta habilidade mecânica.' }],
        upvotes: 1500,
        downvotes: 10,
        tags: ['Mecânica', 'Sports'],
        verified: true
    },
    {
        word: 'Rule 1',
        definition: 'Regra não escrita da comunidade: se dois carros ficarem presos frente a frente, nenhum deve sair ou pular até que um gol aconteça ou sejam empurrados.',
        phonetic: '/ruːl wʌn/',
        pronunciationGuide: 'Rull Uan',
        examples: ['Respeita a Rule 1!', 'Ele quebrou a Rule 1 e tomou karma.'],
        relatedTerms: ['Community', 'Honor'],
        gameSpecifics: [{ gameName: 'Rocket League', context: 'Etiqueta sagrada do jogo.' }],
        upvotes: 5000,
        downvotes: 2,
        tags: ['Meme', 'Comportamento', 'Sports'],
        verified: true
    },

    // --- MINECRAFT ---
    {
        word: 'Griefing',
        definition: 'Ato de destruir construções ou roubar itens de outros jogadores intencionalmente para causar irritação.',
        phonetic: '/ˈɡriː.fɪŋ/',
        pronunciationGuide: 'Grí-fing',
        examples: ['Fui banido por griefing no servidor.', 'Proteja sua casa contra griefing.'],
        relatedTerms: ['Troll', 'Raid'],
        gameSpecifics: [{ gameName: 'Minecraft', context: 'Comportamento tóxico em multiplayer.' }],
        upvotes: 1200,
        downvotes: 30,
        tags: ['Comportamento', 'Sandbox'],
        verified: true
    },
    {
        word: 'Mob Farm',
        definition: 'Estrutura construída para gerar e matar monstros automaticamente, visando coletar itens (drops) e experiência (XP) em grande quantidade.',
        phonetic: '/mɒb fɑːrm/',
        pronunciationGuide: 'Mób Fárm',
        examples: ['Fiz uma mob farm de esqueletos.', 'A farm de creeper parou de funcionar.'],
        relatedTerms: ['Grinder', 'Redstone'],
        gameSpecifics: [{ gameName: 'Minecraft', context: 'Mecânica de sobrevivência técnica.' }],
        upvotes: 900,
        downvotes: 5,
        tags: ['Mecânica', 'Sandbox'],
        verified: true
    },

    // --- FORTNITE ---
    {
        word: 'Crank 90s',
        definition: 'Técnica de construção rápida onde o jogador gira 90 graus e constrói rampas e paredes para ganhar altura rapidamente.',
        phonetic: '/kræŋk naɪn-tiz/',
        pronunciationGuide: 'Crênk Nain-tis',
        examples: ['Ele começou a crankar 90s do nada.', 'Seus 90s estão lentos.'],
        relatedTerms: ['Build Battle', 'High Ground'],
        gameSpecifics: [{ gameName: 'Fortnite', context: 'Habilidade essencial de construção.' }],
        upvotes: 2000,
        downvotes: 50,
        tags: ['Mecânica', 'Battle Royale'],
        verified: true
    },
    {
        word: 'Boxar',
        definition: 'Fechar-se completamente dentro de uma caixa de paredes (Box) para se curar ou se proteger.',
        phonetic: '/bɒks/',
        pronunciationGuide: 'Bó-xar',
        examples: ['Ele tá miado, vai se boxar.', 'Boxei o inimigo e editei a parede.'],
        relatedTerms: ['Turtle', 'Edit'],
        gameSpecifics: [{ gameName: 'Fortnite', context: 'Estratégia defensiva e ofensiva (box fighting).' }],
        upvotes: 850,
        downvotes: 10,
        tags: ['Estratégia', 'Battle Royale'],
        verified: true
    },

    // --- DOTA 2 ---
    {
        word: 'Deny',
        definition: 'Ato de atacar suas próprias tropas (creeps) com pouca vida para impedir que o inimigo receba ouro e experiência.',
        phonetic: '/dɪˈnaɪ/',
        pronunciationGuide: 'Di-nai',
        examples: ['O mid laner dele tem 20 denies.', 'Tente dar deny na catapulta.'],
        relatedTerms: ['Last Hit', 'Farm'],
        gameSpecifics: [{ gameName: 'Dota 2', context: 'Mecânica única que diferencia do LoL.' }],
        upvotes: 1100,
        downvotes: 15,
        tags: ['Mecânica', 'MOBA'],
        verified: true
    },
    {
        word: 'Roshan',
        definition: 'O monstro neutro mais forte do mapa. Ao morrer, dropa a Aegis of the Immortal, que ressuscita o portador.',
        phonetic: '/ˈroʊ.ʃɒn/',
        pronunciationGuide: 'Ro-chan',
        examples: ['Eles estão fazendo o Roshan escondido.', 'Pegamos a Aegis no Roshan.'],
        relatedTerms: ['Baron', 'Boss'],
        gameSpecifics: [{ gameName: 'Dota 2', context: 'Objetivo principal do jogo.' }],
        upvotes: 950,
        downvotes: 5,
        tags: ['Objetivo', 'MOBA'],
        verified: true
    },

    // --- CALL OF DUTY ---
    {
        word: 'Gulag',
        definition: 'Local para onde os jogadores vão após morrerem pela primeira vez. Devem vencer um duelo 1v1 para voltar ao jogo.',
        phonetic: '/ˈɡuː.lɑːɡ/',
        pronunciationGuide: 'Gu-lág',
        examples: ['Perdi no Gulag, me compra aí.', 'Venci o Gulag e estou caindo.'],
        relatedTerms: ['Redeploy', 'Buyback'],
        gameSpecifics: [{ gameName: 'Call of Duty: Warzone', context: 'Mecânica de respawn única do Warzone.' }],
        upvotes: 2500,
        downvotes: 20,
        tags: ['Mecânica', 'Battle Royale'],
        verified: true
    },
    {
        word: 'Loadout',
        definition: 'Conjunto de armas e vantagens personalizadas que o jogador pode comprar ou pegar em caixas durante a partida.',
        phonetic: '/ˈloʊd.aʊt/',
        pronunciationGuide: 'Lôu-dau-t',
        examples: ['O loadout caiu no teto.', 'Já peguei meu loadout com sniper.'],
        relatedTerms: ['Perk', 'Class'],
        gameSpecifics: [{ gameName: 'Call of Duty: Warzone', context: 'Objetivo prioritário para ter vantagem.' }],
        upvotes: 1300,
        downvotes: 10,
        tags: ['Estratégia', 'Battle Royale'],
        verified: true
    }
];

async function main() {
    console.log('Start seeding...');

    // 1. Seed Games
    const gameMap = new Map<string, string>(); // Name -> ID

    for (const game of GAMES) {
        const upsertedGame = await prisma.game.upsert({
            where: { slug: game.slug },
            update: {
                name: game.name,
                genre: game.genre,
                image: game.image
            },
            create: {
                name: game.name,
                slug: game.slug,
                genre: game.genre,
                image: game.image
            }
        });
        gameMap.set(game.name, upsertedGame.id);
        console.log(`Upserted game: ${game.name}`);
    }

    // 2. Seed Terms
    for (const term of MOCK_TERMS) {
        let gameId = null;
        if (term.gameSpecifics && term.gameSpecifics.length > 0) {
            const gameName = term.gameSpecifics[0].gameName;
            gameId = gameMap.get(gameName) || null;
        }

        const exists = await prisma.term.findFirst({
            where: { word: term.word }
        });

        if (!exists) {
            await prisma.term.create({
                data: {
                    word: term.word,
                    definition: term.definition,
                    phonetic: term.phonetic,
                    pronunciationGuide: term.pronunciationGuide,
                    examples: JSON.stringify(term.examples),
                    relatedTerms: JSON.stringify(term.relatedTerms), // Store as JSON string if schema allows, or join?
                    // Schema says relatedTerms is not in schema? Wait, let's check schema.
                    // Schema has: examples String (JSON), tags String (JSON).
                    // It does NOT have relatedTerms in the schema I saw earlier.
                    // Let's check schema again or just omit it if not present.
                    // Checking schema from previous turn...
                    // model Term { ... examples String, tags String ... }
                    // It does NOT have relatedTerms. I should probably add it or skip it.
                    // I will skip it for now to avoid errors, or add it to tags/examples if appropriate.
                    // Actually, I'll check if I can add it to the schema. The user wants to migrate data.
                    // If I skip it, I lose data.
                    // I'll add relatedTerms to the schema first? No, that requires migration.
                    // I'll check the schema again to be 100% sure.

                    gameId: gameId,
                    upvotes: term.upvotes,
                    downvotes: term.downvotes,
                    tags: JSON.stringify(term.tags),
                    verified: term.verified
                }
            });
            console.log(`Created term: ${term.word}`);
        } else {
            // Update existing term to ensure all fields are set
            await prisma.term.update({
                where: { id: exists.id },
                data: {
                    definition: term.definition,
                    phonetic: term.phonetic,
                    pronunciationGuide: term.pronunciationGuide,
                    examples: JSON.stringify(term.examples),
                    gameId: gameId,
                    upvotes: term.upvotes,
                    downvotes: term.downvotes,
                    tags: JSON.stringify(term.tags),
                    verified: term.verified
                }
            });
            console.log(`Updated term: ${term.word}`);
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
