import { NewsStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEWS_AUTHOR = 'Lia Pixel';

const sourceLink = (label: string, url: string) =>
    `<p><strong>Fonte consultada:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></p>`;

const NEWS = [
    {
        headline: 'Sony mantém plano de encerrar discos físicos para novos jogos de PlayStation em 2028',
        slug: 'sony-mantem-plano-discos-fisicos-playstation-2028',
        category: 'INDÚSTRIA',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        publishedAt: new Date('2026-08-01T14:00:00-03:00'),
        seoTitle: 'Sony mantém fim dos discos físicos de PlayStation em 2028',
        seoDescription: 'A Sony confirmou que seguirá com o plano de interromper a produção de discos físicos para novos jogos de PlayStation em janeiro de 2028.',
        content: `<p>A Sony confirmou que continua trabalhando para interromper, a partir de janeiro de 2028, a produção de discos físicos para novos jogos lançados no PlayStation. A decisão não apaga imediatamente a biblioteca já existente, mas muda a forma como os próximos lançamentos serão distribuídos.</p><p>O movimento acelera uma transformação que já vinha acontecendo no mercado: jogos digitais, pré-carregamentos e serviços de assinatura ocupam um espaço cada vez maior. Para a comunidade, porém, a mudança vai além da preferência entre download e mídia física.</p><h2>O que está em jogo</h2><p>Discos permitem revenda, empréstimo, coleção e acesso a uma cópia que não depende da disponibilidade de uma loja digital. Por outro lado, a distribuição digital simplifica atualizações, reduz logística e oferece às empresas mais controle sobre lançamentos e preços.</p><p>A discussão agora deve se concentrar em preservação, direito de revenda e alternativas para quem ainda prefere comprar jogos em formato físico. É uma mudança de mercado que pode influenciar outras plataformas.</p>${sourceLink('PlayStation Blog — comunicado oficial', 'https://blog.playstation.com/2026/07/01/physical-disc-production-ending-in-january-2028-for-new-games-releasing-on-playstation-consoles/')}`
    },
    {
        headline: 'Assassin’s Creed Black Flag Resynced ultrapassa três milhões de cópias vendidas na primeira semana',
        slug: 'assassins-creed-black-flag-resynced-tres-milhoes',
        category: 'LANÇAMENTOS',
        image: 'https://images.unsplash.com/photo-1593305841991-05c29736cec7?auto=format&fit=crop&w=1200&q=80',
        publishedAt: new Date('2026-07-17T13:00:00-03:00'),
        seoTitle: 'Black Flag Resynced supera 3 milhões na primeira semana',
        seoDescription: 'A Ubisoft informou que Assassin’s Creed Black Flag Resynced passou de três milhões de cópias vendidas em sua primeira semana.',
        content: `<p>A Ubisoft anunciou que <strong>Assassin’s Creed Black Flag Resynced</strong> ultrapassou a marca de três milhões de cópias vendidas na primeira semana. O resultado coloca a nova versão da aventura de Edward Kenway entre os lançamentos de maior impacto da franquia nos últimos anos.</p><p>O jogo revisita a campanha pirata de Black Flag com melhorias técnicas, ajustes de jogabilidade e conteúdo adicional para o hardware atual. A proposta é preservar a fantasia de navegação, exploração e combate naval que tornou o original tão lembrado.</p><h2>O retorno da vida de pirata</h2><p>O desempenho comercial também mostra a força que remakes e reimaginações ainda têm quando recuperam uma experiência querida sem abandonar sua identidade. Para a Ubisoft, o resultado pode reforçar a estratégia de revisitar capítulos importantes enquanto a série prepara seus próximos passos.</p><p>O sucesso não elimina a expectativa por novidades, mas prova que existe público para uma aventura conhecida quando ela recebe tratamento cuidadoso e chega em um momento de interesse renovado.</p>${sourceLink('Ubisoft News — resultado da primeira semana', 'https://news.ubisoft.com/en-us/article/3FcqYa0y8K39sboBSUfXzk/assassins-creed-black-flag-resynced-sells-over-3-million-copies-in-a-week')}`
    },
    {
        headline: 'Halo: Campaign Evolved chega com campanha refeita e três missões inéditas',
        slug: 'halo-campaign-evolved-chega-com-missoes-ineditas',
        category: 'LANÇAMENTOS',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        publishedAt: new Date('2026-07-28T16:00:00-03:00'),
        seoTitle: 'Halo Campaign Evolved chega com três missões inéditas',
        seoDescription: 'O remake de Halo: Combat Evolved foi lançado com visual atualizado, controles refinados e três missões de prólogo inéditas.',
        content: `<p><strong>Halo: Campaign Evolved</strong> já está disponível para levar a primeira campanha da série a uma nova geração. O projeto reconstrói a jornada do Master Chief com visuais em alta definição, cenas atualizadas e controles refinados.</p><p>A principal novidade para quem conhece o original está nas três missões de prólogo que ampliam a história antes dos acontecimentos mais conhecidos. O pacote também inclui novas possibilidades de armas, veículos, inimigos e modificadores opcionais que alteram o ritmo dos confrontos.</p><h2>Uma ponte entre memória e novidade</h2><p>Remakes de jogos tão influentes precisam equilibrar familiaridade e modernização. No caso de Halo, o desafio é preservar o desenho de combate, a exploração dos cenários e a sensação de descoberta sem transformar a campanha em um produto completamente diferente.</p><p>O lançamento também amplia o alcance do clássico ao chegar ao ecossistema Xbox, ao PC, à nuvem, ao Game Pass e ao PlayStation 5.</p>${sourceLink('Xbox Wire — anúncio de lançamento', 'https://news.xbox.com/en-us/2026/06/07/halo-campaign-evolved-launch-preorder-xbox-games-showcase-2026/')}`
    },
    {
        headline: 'Splatoon Raiders estreia no Switch 2 levando a série para uma aventura solo',
        slug: 'splatoon-raiders-estreia-switch-2-aventura-solo',
        category: 'NINTENDO',
        image: 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=1200&q=80',
        publishedAt: new Date('2026-07-23T12:00:00-03:00'),
        seoTitle: 'Splatoon Raiders estreia no Switch 2 em aventura solo',
        seoDescription: 'Splatoon Raiders chegou ao Switch 2 com uma campanha individual, participação do grupo Deep Cut e exploração da ilha Spirhalite.',
        content: `<p><strong>Splatoon Raiders</strong> já pode ser jogado no Nintendo Switch 2. A nova aventura leva o universo colorido da série para uma campanha individual ambientada na ilha Spirhalite, com a participação do trio Deep Cut.</p><p>A estrutura troca o foco tradicional das partidas competitivas por exploração, combate contra Salmonids e uma progressão baseada em equipamentos e melhorias. O jogador também pode contar com um robô de exploração e adaptar seu conjunto de ferramentas para enfrentar situações diferentes.</p><h2>Splatoon fora da arena</h2><p>A mudança de formato é interessante porque expande a identidade da série sem abandonar seus elementos mais marcantes: movimento veloz, tinta como ferramenta e confrontos com muita leitura de espaço. É uma tentativa de mostrar que Splatoon pode funcionar como aventura de um jogador, não apenas como disputa online.</p><p>O lançamento também abre espaço para novas histórias e personagens dentro de um universo que já tem uma comunidade competitiva bastante consolidada.</p>${sourceLink('Nintendo — lançamento de Splatoon Raiders', 'https://www.nintendo.com/us/whatsnew/splatoon-raiders-is-out-now-hunt-for-treasure-in-a-wild-new-single-player-adventure/')}`
    },
    {
        headline: 'Esports World Cup 2026 reúne 24 jogos e premiação de US$ 75 milhões em Paris',
        slug: 'esports-world-cup-2026-24-jogos-premiacao-paris',
        category: 'E-SPORTS',
        image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1200&q=80',
        publishedAt: new Date('2026-07-31T11:00:00-03:00'),
        seoTitle: 'Esports World Cup 2026 reúne 24 jogos em Paris',
        seoDescription: 'A edição de 2026 da Esports World Cup reúne mais de 2 mil jogadores, 24 jogos e premiação de US$ 75 milhões em Paris.',
        content: `<p>A edição de 2026 da <strong>Esports World Cup</strong> está sendo realizada em Paris e reúne mais de 2 mil jogadores, 200 clubes e representantes de mais de cem países. O evento se estende até 23 de agosto e distribui uma premiação total de US$ 75 milhões.</p><p>São 25 torneios em 24 jogos, uma escala que transforma o campeonato em uma vitrine ampla para diferentes comunidades competitivas. Além dos resultados individuais, os clubes disputam uma classificação geral que cria uma narrativa comum entre modalidades distintas.</p><h2>O tamanho do espetáculo</h2><p>A competição mostra como o e-sports deixou de ser organizado apenas em torno de um jogo por vez. Ao mesmo tempo, o tamanho do evento reacende discussões sobre calendário, concentração de investimento e o espaço que cada cena regional ocupa em um circuito global.</p><p>Para o público brasileiro, vale acompanhar não só os confrontos, mas também quais equipes e jogadores conseguem transformar presença internacional em continuidade durante o restante da temporada.</p>${sourceLink('Esports World Cup — guia oficial de mídia', 'https://cdn.esportsworldcup.com/resources/uploads/EWC_26_Media_Guide_short_d6f73c0f8a.pdf')}`
    }
];

async function main() {
    for (const item of NEWS) {
        await prisma.news.upsert({
            where: { slug: item.slug },
            update: {
                headline: item.headline,
                category: item.category,
                image: item.image,
                content: item.content,
                author: NEWS_AUTHOR,
                status: NewsStatus.PUBLISHED,
                publishedAt: item.publishedAt,
                archivedAt: null,
                seoTitle: item.seoTitle,
                seoDescription: item.seoDescription
            },
            create: {
                ...item,
                author: NEWS_AUTHOR,
                status: NewsStatus.PUBLISHED
            }
        });
    }

    console.log(`✅ ${NEWS.length} notícias atuais criadas/atualizadas por ${NEWS_AUTHOR}.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
