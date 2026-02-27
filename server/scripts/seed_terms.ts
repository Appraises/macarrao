import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_TERMS = [
    // --- GENERAL TERMS ---
    {
        word: 'Gank',
        definition: 'Ato de emboscar um inimigo, geralmente aparecendo de surpresa em sua rota para criar vantagem numérica.',
        phonetic: '/ɡæŋk/',
        pronunciationGuide: 'Guen-k',
        examples: JSON.stringify([
            'O jungler veio dar um gank no top.',
            'Cuidado com o gank, o mid sumiu.'
        ]),
        gameId: '1', // LoL
        upvotes: 1250,
        downvotes: 12,
        tags: 'Estratégia,MOBA,General',
        verified: true
    },
    {
        word: 'Nerf',
        definition: 'Enfraquecimento de um personagem, item ou habilidade pelos desenvolvedores para balancear o jogo.',
        phonetic: '/nɜːrf/',
        pronunciationGuide: 'Nêrf',
        examples: JSON.stringify([
            'A Jett tomou um nerf pesado no último patch.',
            'Precisam nerfar essa arma, está muito forte.'
        ]),
        gameId: null,
        upvotes: 890,
        downvotes: 5,
        tags: 'Balanceamento,Geral,General',
        verified: true
    },
    {
        word: 'Smurf',
        definition: 'Um jogador experiente que cria uma conta nova para jogar contra iniciantes ou jogadores de nível inferior.',
        phonetic: '/smɜːrf/',
        pronunciationGuide: 'Smârf',
        examples: JSON.stringify([
            'Aquele Reyna é smurf, certeza.',
            'Vou criar uma smurf para jogar com meu amigo prata.'
        ]),
        gameId: null,
        upvotes: 2300,
        downvotes: 450,
        tags: 'Comportamento,Geral,General',
        verified: true
    },
    {
        word: 'Intar',
        definition: 'Morrer intencionalmente (Intentional Feeding) ou jogar muito mal, prejudicando o time.',
        phonetic: '/ɪnt/',
        pronunciationGuide: 'In-tar',
        examples: JSON.stringify([
            'O Yasuo tá intando o jogo todo.',
            'Pare de intar e jogue recuado.'
        ]),
        gameId: null,
        upvotes: 1500,
        downvotes: 20,
        tags: 'Comportamento,Gíria,General',
        verified: true
    },
    {
        word: 'Tilt',
        definition: 'Estado emocional de frustração que faz o jogador jogar pior.',
        phonetic: '/tɪlt/',
        pronunciationGuide: 'Tilt',
        examples: JSON.stringify(['Ele tiltou depois de morrer.', 'Não tilta, ainda dá para ganhar.']),
        gameId: null,
        upvotes: 5000,
        downvotes: 20,
        tags: 'Psicológico,Geral,General',
        verified: true
    },

    // --- LEAGUE OF LEGENDS (ID: 1) ---
    {
        word: 'Recall',
        definition: 'Habilidade padrão (tecla B) que teleporta o campeão de volta para a base após um tempo de canalização.',
        phonetic: '/rɪˈkɔːl/',
        pronunciationGuide: 'Ri-cól',
        examples: JSON.stringify(['Vou dar recall para comprar itens.', 'Cancelei o recall dele com um ataque.']),
        gameId: '1',
        upvotes: 400,
        downvotes: 2,
        tags: 'Mecânica,MOBA',
        verified: true
    },
    {
        word: 'Inibidor',
        definition: 'Estrutura localizada na base inimiga. Ao ser destruída, faz com que a sua equipe gere Super Minions naquela rota.',
        phonetic: '/i.ni.bi.dor/',
        pronunciationGuide: 'Inibidor',
        examples: JSON.stringify(['Focamos o inibidor do meio para abrir o mapa.', 'O inibidor vai renascer em breve.']),
        gameId: '1',
        upvotes: 350,
        downvotes: 5,
        tags: 'Objetivo,MOBA',
        verified: true
    },
    {
        word: 'Wave Management',
        definition: 'Técnica de controlar o fluxo de tropas (minions) para negar farm ao inimigo ou criar oportunidades de gank.',
        phonetic: '/weɪv ˈmæn.ɪdʒ.mənt/',
        pronunciationGuide: 'Ueive Me-nedj-ment',
        examples: JSON.stringify(['Estou fazendo um slow push.', 'Preciso freezar a wave aqui.']),
        gameId: '1',
        upvotes: 800,
        downvotes: 15,
        tags: 'Estratégia,MOBA',
        verified: true
    },
    {
        word: 'Leash',
        definition: 'Ajudar o caçador (Jungler) a causar dano no primeiro monstro da selva para acelerar o início dele.',
        phonetic: '/liːʃ/',
        pronunciationGuide: 'Lixe',
        examples: JSON.stringify(['O bot lane deu um leash forte.', 'Sem leash vou demorar mais.']),
        gameId: '1',
        upvotes: 600,
        downvotes: 10,
        tags: 'Estratégia,MOBA',
        verified: true
    },

    // --- VALORANT (ID: 2) ---
    {
        word: 'Spike',
        definition: 'O dispositivo explosivo que os atacantes devem plantar em um dos sites (A, B ou C). Equivalente à bomba (C4) do CS.',
        phonetic: '/spaɪk/',
        pronunciationGuide: 'Spai-que',
        examples: JSON.stringify(['A Spike está caída no meio.', 'Planta a Spike logo!']),
        gameId: '2',
        upvotes: 1100,
        downvotes: 25,
        tags: 'Objetivo,FPS',
        verified: true
    },
    {
        word: 'Operator (Op)',
        definition: 'O rifle de precisão (sniper) mais caro e poderoso do jogo. Mata com um tiro no corpo.',
        phonetic: '/ˈɒp.ər.eɪ.tər/',
        pronunciationGuide: 'Ó-pe',
        examples: JSON.stringify(['Cuidado, tem uma Op no fundo.', 'Vou economizar para comprar a Operator.']),
        gameId: '2',
        upvotes: 950,
        downvotes: 30,
        tags: 'Arma,FPS',
        verified: true
    },
    {
        word: 'Default',
        definition: 'Estratégia onde o time se espalha pelo mapa no início do round para buscar informações e controle de área sem comprometer um site.',
        phonetic: '/dɪˈfɔːlt/',
        pronunciationGuide: 'Di-fôlt',
        examples: JSON.stringify(['Vamos jogar default e esperar o erro deles.', 'Façam um default 2-1-2.']),
        gameId: '2',
        upvotes: 700,
        downvotes: 10,
        tags: 'Estratégia,FPS',
        verified: true
    },
    {
        word: 'Lineup',
        definition: 'Posicionamento específico e alinhamento de mira para lançar habilidades (como molotovs ou flechas) em locais distantes com precisão.',
        phonetic: '/ˈlaɪn.ʌp/',
        pronunciationGuide: 'Lai-nap',
        examples: JSON.stringify(['Tenho um lineup de Viper para o pós-plant.', 'Sova, você tem lineup para o bomb A?']),
        gameId: '2',
        upvotes: 1200,
        downvotes: 40,
        tags: 'Mecânica,FPS',
        verified: true
    },

    // --- CS2 (ID: 3) ---
    {
        word: 'Eco Round',
        definition: 'Rodada em que o time compra pouco ou nenhum equipamento para economizar dinheiro para o próximo round.',
        phonetic: '/ˈiː.koʊ/',
        pronunciationGuide: 'É-co',
        examples: JSON.stringify(['Estamos sem grana, vamos fazer um eco.', 'Eles ganharam o eco round apenas com pistolas.']),
        gameId: '3',
        upvotes: 1500,
        downvotes: 5,
        tags: 'Economia,FPS',
        verified: true
    },
    {
        word: 'Rush B',
        definition: 'Estratégia agressiva onde todo o time corre rapidamente para o bombsite B sem parar.',
        phonetic: '/rʌʃ biː/',
        pronunciationGuide: 'Râsh Bi',
        examples: JSON.stringify(['P90 e Rush B, não para!', 'Eles fizeram um Rush B muito rápido.']),
        gameId: '3',
        upvotes: 5000,
        downvotes: 50,
        tags: 'Estratégia,FPS',
        verified: true
    },
    {
        word: 'Clutch',
        definition: 'Situação onde um jogador sozinho consegue vencer a rodada contra múltiplos inimigos vivos.',
        phonetic: '/klʌtʃ/',
        pronunciationGuide: 'Clâ-tch',
        examples: JSON.stringify(['Ele ganhou um clutch 1v3 incrível.', 'Rei do clutch!']),
        gameId: '3',
        upvotes: 2100,
        downvotes: 20,
        tags: 'Geral,FPS',
        verified: true
    },
    {
        word: 'Entry Fragger',
        definition: 'O primeiro jogador a entrar no bombsite ou área de conflito, responsável por buscar a primeira eliminação e abrir espaço.',
        phonetic: '/ˈen.tri fræɡ.ər/',
        pronunciationGuide: 'Êntri Fré-guer',
        examples: JSON.stringify(['Nosso entry fragger morreu sem trocar.', 'Preciso de suporte para dar entry.']),
        gameId: '3',
        upvotes: 850,
        downvotes: 10,
        tags: 'Função,FPS',
        verified: true
    },

    // --- WORLD OF WARCRAFT (ID: 4) ---
    {
        word: 'Wipe',
        definition: 'Quando todo o grupo morre em uma masmorra ou raid, exigindo que todos renasçam e tentem novamente.',
        phonetic: '/waɪp/',
        pronunciationGuide: 'Uai-pe',
        examples: JSON.stringify(['Wipamos no boss com 1% de vida.', 'Se o tank morrer, é wipe.']),
        gameId: '4',
        upvotes: 1300,
        downvotes: 25,
        tags: 'Gíria,MMORPG',
        verified: true
    },
    {
        word: 'Aggro',
        definition: 'Atenção ou hostilidade de um NPC inimigo. "Puxar o aggro" significa fazer o inimigo te atacar.',
        phonetic: '/ˈæɡ.roʊ/',
        pronunciationGuide: 'Á-gro',
        examples: JSON.stringify(['Cuidado para não puxar o aggro do boss.', 'O tank perdeu o aggro.']),
        gameId: '4',
        upvotes: 650,
        downvotes: 5,
        tags: 'Mecânica,MMORPG',
        verified: true
    }
];

async function main() {
    console.log('Start seeding...');
    for (const term of MOCK_TERMS) {
        const exists = await prisma.term.findFirst({
            where: { word: term.word }
        });

        if (!exists) {
            await prisma.term.create({
                data: term
            });
            console.log(`Created term: ${term.word}`);
        } else {
            console.log(`Term already exists: ${term.word}`);
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
