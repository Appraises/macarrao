import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==================== GAMES ====================
const GAMES = [
    { name: 'League of Legends', slug: 'lol', genre: 'MOBA', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg' },
    { name: 'Valorant', slug: 'valorant', genre: 'FPS', image: 'https://images.hdqwalls.com/wallpapers/valorant-game-art-4k-2022-0b.jpg' },
    { name: 'Counter-Strike 2', slug: 'cs2', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg' },
    { name: 'World of Warcraft', slug: 'wow', genre: 'MMORPG', image: 'https://images.hdqwalls.com/wallpapers/world-of-warcraft-dragonflight-4k-1a.jpg' },
    { name: 'Elden Ring', slug: 'eldenring', genre: 'RPG', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg' },
    { name: 'Street Fighter 6', slug: 'sf6', genre: 'Fighting', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1364780/header.jpg' },
    { name: 'Overwatch 2', slug: 'overwatch', genre: 'FPS', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg' },
    { name: 'Rocket League', slug: 'rocket-league', genre: 'Sports', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg' },
    { name: 'Minecraft', slug: 'minecraft', genre: 'Sandbox', image: 'https://images.hdqwalls.com/wallpapers/minecraft-dungeons-4k-1a.jpg' },
    { name: 'Fortnite', slug: 'fortnite', genre: 'Battle Royale', image: 'https://images.hdqwalls.com/wallpapers/fortnite-chapter-4-season-2-mega-4k-1a.jpg' },
    { name: 'Dota 2', slug: 'dota2', genre: 'MOBA', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' },
    { name: 'Call of Duty: Warzone', slug: 'warzone', genre: 'Battle Royale', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg' },
];

// ==================== MAPS ====================
const MAPS: { gameSlug: string; name: string; image: string; tacticalImage: string; callouts: { name: string; x: number; y: number; type: string; description?: string }[] }[] = [
    // League of Legends
    {
        gameSlug: 'lol', name: "Summoner's Rift",
        image: "https://static.wikia.nocookie.net/leagueoflegends/images/2/23/Summoner%27s_Rift_Minimap.png",
        tacticalImage: "https://static.wikia.nocookie.net/leagueoflegends/images/2/23/Summoner%27s_Rift_Minimap.png",
        callouts: [
            { name: 'Baron Pit', x: 35, y: 28, type: 'Objective', description: "Local onde nasce o Barão Na'Shor." },
            { name: 'Dragon Pit', x: 68, y: 75, type: 'Objective', description: 'Covil dos Dragões Elementais e Ancião.' },
            { name: 'Blue Buff (Blue)', x: 40, y: 55, type: 'Objective', description: 'Golem Sentinela Azul.' },
            { name: 'Red Buff (Red)', x: 55, y: 25, type: 'Objective', description: 'Rubrivira.' },
            { name: 'Mid Lane', x: 50, y: 50, type: 'Callout', description: 'Rota do meio, a mais curta.' },
            { name: 'Tri-Bush (Bot)', x: 78, y: 80, type: 'Callout', description: 'Arbusto em formato triangular próximo à torre.' },
            { name: 'River (Top)', x: 30, y: 30, type: 'Callout', description: 'Rio superior.' },
        ]
    },
    // Valorant Maps
    {
        gameSlug: 'valorant', name: "Ascent",
        image: "https://static.wikia.nocookie.net/valorant/images/e/e7/Loading_Screen_Ascent.png",
        tacticalImage: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png",
        callouts: [
            { name: 'Site A', x: 80, y: 25, type: 'Site', description: 'Ponto de plant da Spike A.' },
            { name: 'Site B', x: 20, y: 28, type: 'Site', description: 'Ponto de plant da Spike B.' },
            { name: 'Mid Courtyard', x: 50, y: 45, type: 'Callout', description: 'Área aberta central.' },
            { name: 'Market', x: 40, y: 38, type: 'Callout', description: 'Conexão entre Mid e B.' },
            { name: 'Pizza (Gelato)', x: 60, y: 22, type: 'Callout', description: 'Canto no Mid Top.' },
            { name: 'Boat House', x: 12, y: 22, type: 'Callout', description: 'Fundão do Bomb B.' },
            { name: 'Heaven (A)', x: 78, y: 12, type: 'Callout', description: 'Posição elevada olhando pro Site A.' },
        ]
    },
    {
        gameSlug: 'valorant', name: "Bind",
        image: "https://static.wikia.nocookie.net/valorant/images/2/23/Loading_Screen_Bind.png",
        tacticalImage: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/displayicon.png",
        callouts: [
            { name: 'Teleporter A (Exit)', x: 30, y: 20, type: 'Objective', description: 'Saída do TP A.' },
            { name: 'Showers/Bath', x: 85, y: 45, type: 'Callout', description: 'Banheiros.' },
            { name: 'Site A', x: 75, y: 30, type: 'Site' },
            { name: 'Site B', x: 30, y: 28, type: 'Site' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Haven",
        image: "https://static.wikia.nocookie.net/valorant/images/7/70/Loading_Screen_Haven.png",
        tacticalImage: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/displayicon.png",
        callouts: [
            { name: 'Site A', x: 82, y: 40, type: 'Site' },
            { name: 'Site B', x: 50, y: 32, type: 'Site' },
            { name: 'Site C', x: 18, y: 38, type: 'Site' },
            { name: 'Garage', x: 28, y: 45, type: 'Callout', description: 'Garagem central.' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Split",
        image: "https://static.wikia.nocookie.net/valorant/images/d/d6/Loading_Screen_Split.png",
        tacticalImage: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/displayicon.png",
        callouts: [
            { name: 'Ropes/Vents', x: 50, y: 35, type: 'Objective', description: 'Cordas do meio.' },
            { name: 'Site A', x: 82, y: 25, type: 'Site' },
            { name: 'Site B', x: 15, y: 20, type: 'Site' },
            { name: 'Mid', x: 50, y: 45, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Icebox",
        image: "https://static.wikia.nocookie.net/valorant/images/1/13/Loading_Screen_Icebox.png",
        tacticalImage: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/displayicon.png",
        callouts: [
            { name: 'Site A', x: 75, y: 45, type: 'Site' },
            { name: 'Site B', x: 25, y: 38, type: 'Site' },
            { name: 'Mid', x: 50, y: 45, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Breeze",
        image: "https://static.wikia.nocookie.net/valorant/images/1/10/Loading_Screen_Breeze.png",
        tacticalImage: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/displayicon.png",
        callouts: [
            { name: 'Site A', x: 80, y: 45, type: 'Site' },
            { name: 'Site B', x: 18, y: 28, type: 'Site' },
            { name: 'Mid', x: 50, y: 40, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Fracture",
        image: "https://static.wikia.nocookie.net/valorant/images/f/fc/Loading_Screen_Fracture.png",
        tacticalImage: "https://media.valorant-api.com/maps/b529448b-4d84-45ab-871f-e8b0b70e6d87/displayicon.png",
        callouts: [
            { name: 'Site A', x: 70, y: 15, type: 'Site' },
            { name: 'Site B', x: 70, y: 75, type: 'Site' },
            { name: 'Dish', x: 25, y: 20, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Pearl",
        image: "https://static.wikia.nocookie.net/valorant/images/a/af/Loading_Screen_Pearl.png",
        tacticalImage: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-bf52-9eb157ed70fb/displayicon.png",
        callouts: [
            { name: 'Site A', x: 78, y: 40, type: 'Site' },
            { name: 'Site B', x: 20, y: 25, type: 'Site' },
            { name: 'Mid Plaza', x: 50, y: 35, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Lotus",
        image: "https://static.wikia.nocookie.net/valorant/images/d/d0/Loading_Screen_Lotus.png",
        tacticalImage: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/displayicon.png",
        callouts: [
            { name: 'Site A', x: 18, y: 25, type: 'Site' },
            { name: 'Site B', x: 50, y: 20, type: 'Site' },
            { name: 'Site C', x: 82, y: 30, type: 'Site' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Sunset",
        image: "https://static.wikia.nocookie.net/valorant/images/5/5c/Loading_Screen_Sunset.png",
        tacticalImage: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/displayicon.png",
        callouts: [
            { name: 'Site A', x: 20, y: 25, type: 'Site' },
            { name: 'Site B', x: 75, y: 40, type: 'Site' },
            { name: 'Mid Courtyard', x: 45, y: 40, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'valorant', name: "Abyss",
        image: "https://static.wikia.nocookie.net/valorant/images/6/61/Loading_Screen_Abyss.png",
        tacticalImage: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1a86-c2ae5a5b3133/displayicon.png",
        callouts: [
            { name: 'Site A', x: 75, y: 25, type: 'Site' },
            { name: 'Site B', x: 25, y: 32, type: 'Site' },
            { name: 'Library', x: 50, y: 32, type: 'Callout' }
        ]
    },
    // CS2 Maps
    {
        gameSlug: 'cs2', name: "Mirage",
        image: "https://static.wikia.nocookie.net/cswikia/images/d/d6/Mirage_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/1/12/De_mirage_radar.png",
        callouts: [
            { name: 'Site A', x: 70, y: 25, type: 'Site' },
            { name: 'Site B', x: 30, y: 30, type: 'Site' },
            { name: 'Mid', x: 50, y: 50, type: 'Callout' },
            { name: 'Palace', x: 80, y: 15, type: 'Callout' },
            { name: 'Apartments', x: 20, y: 15, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Inferno",
        image: "https://static.wikia.nocookie.net/cswikia/images/6/61/Inferno_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/2/23/De_inferno_radar.png",
        callouts: [
            { name: 'Site A', x: 75, y: 70, type: 'Site' },
            { name: 'Site B', x: 30, y: 30, type: 'Site' },
            { name: 'Banana', x: 20, y: 50, type: 'Callout' },
            { name: 'Mid', x: 60, y: 50, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Dust II",
        image: "https://static.wikia.nocookie.net/cswikia/images/0/02/Dust_II_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/4/42/De_dust2_radar.png",
        callouts: [
            { name: 'Site A', x: 85, y: 30, type: 'Site' },
            { name: 'Site B', x: 20, y: 20, type: 'Site' },
            { name: 'Long A', x: 90, y: 50, type: 'Callout' },
            { name: 'Mid', x: 50, y: 40, type: 'Callout' },
            { name: 'Tunnels', x: 15, y: 35, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Nuke",
        image: "https://static.wikia.nocookie.net/cswikia/images/9/9d/Nuke_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/2/22/De_nuke_radar.png",
        callouts: [
            { name: 'Site A', x: 50, y: 45, type: 'Site' },
            { name: 'Site B (Lower)', x: 50, y: 55, type: 'Site' },
            { name: 'Outside', x: 80, y: 40, type: 'Callout' },
            { name: 'Ramp', x: 20, y: 40, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Overpass",
        image: "https://static.wikia.nocookie.net/cswikia/images/c/cc/Overpass_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/a/a2/De_overpass_radar.png",
        callouts: [
            { name: 'Site A', x: 45, y: 30, type: 'Site' },
            { name: 'Site B', x: 45, y: 65, type: 'Site' },
            { name: 'Connector', x: 60, y: 50, type: 'Callout' },
            { name: 'Monster', x: 30, y: 60, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Vertigo",
        image: "https://static.wikia.nocookie.net/cswikia/images/0/0c/Vertigo_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/0/08/De_vertigo_radar.png",
        callouts: [
            { name: 'Site A', x: 30, y: 25, type: 'Site' },
            { name: 'Site B', x: 30, y: 65, type: 'Site' },
            { name: 'Mid', x: 50, y: 45, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Ancient",
        image: "https://static.wikia.nocookie.net/cswikia/images/2/22/Ancient_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/e/e0/De_ancient_radar.png",
        callouts: [
            { name: 'Site A', x: 25, y: 40, type: 'Site' },
            { name: 'Site B', x: 75, y: 40, type: 'Site' },
            { name: 'Mid', x: 50, y: 50, type: 'Callout' }
        ]
    },
    {
        gameSlug: 'cs2', name: "Anubis",
        image: "https://static.wikia.nocookie.net/cswikia/images/d/df/Anubis_CS2_thumbnail.png",
        tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/1/1a/De_anubis_radar.png",
        callouts: [
            { name: 'Site A', x: 70, y: 30, type: 'Site' },
            { name: 'Site B', x: 20, y: 45, type: 'Site' },
            { name: 'Mid', x: 45, y: 45, type: 'Callout' },
            { name: 'Bridge', x: 55, y: 55, type: 'Callout' }
        ]
    },
];

// ==================== TERMS ====================
const TERMS = [
    {
        word: 'Gank', definition: 'Ato de emboscar um inimigo, geralmente aparecendo de surpresa em sua rota para criar vantagem numérica.',
        phonetic: '/ɡæŋk/', pronunciationGuide: 'Guen-k',
        examples: ['O jungler veio dar um gank no top.', 'Cuidado com o gank, o mid sumiu.'],
        gameSlug: 'lol', upvotes: 1250, downvotes: 12, tags: ['Estratégia', 'MOBA', 'General'], verified: true
    },
    {
        word: 'Nerf', definition: 'Enfraquecimento de um personagem, item ou habilidade pelos desenvolvedores para balancear o jogo.',
        phonetic: '/nɜːrf/', pronunciationGuide: 'Nêrf',
        examples: ['A Jett tomou um nerf pesado no último patch.', 'Precisam nerfar essa arma, está muito forte.'],
        gameSlug: null, upvotes: 890, downvotes: 5, tags: ['Balanceamento', 'Geral', 'General'], verified: true
    },
    {
        word: 'Spike', definition: 'O dispositivo explosivo que os atacantes devem plantar em um dos sites (A, B ou C). Equivalente à bomba (C4) do CS.',
        phonetic: '/spaɪk/', pronunciationGuide: 'Spai-que',
        examples: ['A Spike está caída no meio.', 'Planta a Spike logo!'],
        gameSlug: 'valorant', upvotes: 1100, downvotes: 25, tags: ['Objetivo', 'FPS'], verified: true
    },
    {
        word: 'Eco Round', definition: 'Rodada em que o time compra pouco ou nenhum equipamento para economizar dinheiro para o próximo round.',
        phonetic: '/ˈiː.koʊ/', pronunciationGuide: 'É-co',
        examples: ['Estamos sem grana, vamos fazer um eco.', 'Eles ganharam o eco round apenas com pistolas.'],
        gameSlug: 'cs2', upvotes: 1500, downvotes: 5, tags: ['Economia', 'FPS'], verified: true
    }
];

// ==================== NEWS (Full articles) ====================
const NEWS = [
    { headline: 'FalleN confirma aposentadoria após Major do Rio', category: 'CS2', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400&auto=format&fit=crop', author: 'Dust2' },
    { headline: 'Arcane Season 2 quebra recordes de audiência na Twitch', category: 'LoL', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop', author: 'Riot' },
    { headline: 'Novo agente do Valorant "Smoke" é revelado com habilidades de teleporte', category: 'Valorant', image: 'https://images.unsplash.com/photo-1624138784181-dc7f5b75e52e?q=80&w=400&auto=format&fit=crop', author: 'ValorantZone' },
];

const FULL_NEWS = [
    {
        headline: 'Marvel Cosmic Invasion é mais um acerto no renascimento dos beat \'em ups | Review',
        category: 'REVIEW',
        image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=800&auto=format&fit=crop',
        author: 'Bruno Lopes',
        content: `<p>O gênero beat 'em up tem vivido um verdadeiro renascimento nos últimos anos, e <strong>Marvel Cosmic Invasion</strong> chega para consolidar essa tendência com uma experiência vibrante e frenética.</p><p>Desenvolvido pela <em>RetroFuture Games</em>, o título combina a nostalgia dos arcades dos anos 90 com mecânicas modernas de combate e progressão.</p><h3>Jogabilidade Refinada</h3><p>O grande destaque é o sistema de combate. Cada personagem possui um moveset único que realmente muda a forma de jogar.</p><h3>Veredito</h3><p>Marvel Cosmic Invasion não reinventa a roda, mas a faz girar com uma suavidade impressionante.</p>`
    },
    {
        headline: 'Battlefield 6 vs. Call of Duty: Black Ops 7: grande vencedor do duelo é muito claro',
        category: 'ARTIGO',
        image: 'https://images.unsplash.com/photo-1593305841991-05c29736cec7?q=80&w=800&auto=format&fit=crop',
        author: 'Vinicius Silva',
        content: `<p>O final de ano sempre traz o embate titânico entre as duas maiores franquias de FPS do mercado.</p><h3>Campanha e Narrativa</h3><p>A campanha de CoD continua sendo um espetáculo hollywoodiano.</p><h3>Multiplayer</h3><p>Aqui é onde a discussão esquenta. O gunplay de CoD está mais afiado do que nunca.</p>`
    },
    {
        headline: 'O senso de humor de Monkey Island é tão magistral que faz piada da própria tecnologia',
        category: 'RETRO',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
        author: 'Ana Clara',
        content: `<p>Revisitar <strong>The Secret of Monkey Island</strong> é como reencontrar um velho amigo que sempre tem uma piada nova para contar.</p><h3>A Piada do Disquete 22</h3><p>Um dos momentos mais icônicos é a famosa piada do "insira o disquete 22".</p>`
    },
    {
        headline: 'Stranger Things: As maiores dúvidas que a Parte 1 da 5ª temporada deixou',
        category: 'SÉRIES',
        image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800&auto=format&fit=crop',
        author: 'Lucas Mendes',
        content: `<p>A primeira parte da temporada final de <strong>Stranger Things</strong> chegou à Netflix quebrando recordes.</p><h3>O Destino de Max</h3><p>A maior interrogação continua sendo o estado de Max.</p>`
    },
    {
        headline: 'Metroid Prime 4 Beyond recebe suas primeiras notas',
        category: 'PRÉVIA',
        image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=800&auto=format&fit=crop',
        author: 'Vinicius Silva',
        content: `<p>As primeiras análises de <strong>Metroid Prime 4: Beyond</strong> começaram a surgir, e o consenso é de que a Retro Studios entregou uma obra-prima técnica no Switch.</p>`
    },
    {
        headline: 'Game Pass: Primeira leva de dezembro é revelada com Mortal Kombat 1 e muito mais',
        category: 'GAMES',
        image: 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=800&auto=format&fit=crop',
        author: 'Equipe DG',
        content: `<p>A Microsoft anunciou hoje os jogos que chegam ao <strong>Xbox Game Pass</strong> na primeira quinzena de dezembro.</p><p>O grande destaque é <strong>Mortal Kombat 1</strong>.</p>`
    },
    {
        headline: 'Elden Ring Nightreign apresenta Undertaker, sua mais nova personagem jogável',
        category: 'GAMES',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        author: 'Vinicius Silva',
        content: `<p>A FromSoftware surpreendeu a todos com o anúncio de uma nova expansão standalone para Elden Ring, intitulada <strong>Nightreign</strong>.</p>`
    },
    {
        headline: 'Confira as notas que Marvel Cosmic Invasion vem recebendo',
        category: 'NOTAS',
        image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=800&auto=format&fit=crop',
        author: 'Vinicius Silva',
        content: `<p>O embargo de <strong>Marvel Cosmic Invasion</strong> caiu e as notas estão no ar.</p><p>No geral, o jogo está com uma média de 82 no OpenCritic.</p>`
    },
    {
        headline: 'Novo gameplay de Elden Ring no Switch 2 mostra desempenho melhor do que o esperado',
        category: 'RUMOR',
        image: 'https://images.unsplash.com/photo-1592155931584-901ac15763e3?q=80&w=800&auto=format&fit=crop',
        author: 'Coca',
        content: `<p>Um vídeo vazado, supostamente capturado em um kit de desenvolvimento do <strong>Nintendo Switch 2</strong>, mostra <em>Elden Ring</em> rodando com uma fluidez impressionante.</p>`
    },
];

// ==================== ESPORTS ====================
const ESPORTS_NEWS = [
    { headline: 'FalleN confirma aposentadoria após Major do Rio', category: 'CS2', timeAgo: '2h', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400&auto=format&fit=crop', author: 'Dust2' },
    { headline: 'Arcane Season 2 quebra recordes de audiência na Twitch', category: 'LoL', timeAgo: '4h', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop', author: 'Riot' },
    { headline: 'Novo agente do Valorant "Smoke" é revelado com habilidades de teleporte', category: 'Valorant', timeAgo: '6h', image: 'https://images.unsplash.com/photo-1624138784181-dc7f5b75e52e?q=80&w=400&auto=format&fit=crop', author: 'ValorantZone' },
    { headline: 'LOUD anuncia line-up inclusiva para o Game Changers', category: 'Geral', timeAgo: '1d', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop', author: 'Globo' },
    { headline: 'Valve anuncia mudanças na economia do CS2 para o próximo patch', category: 'CS2', timeAgo: '1d', image: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=400&auto=format&fit=crop', author: 'HLTV' },
];

const ESPORTS_MATCHES = [
    { game: 'League of Legends', competition: 'CBLOL Split 2', teamAName: 'LOUD', teamACountry: 'br', teamBName: 'paiN', teamBCountry: 'br', time: 'Live', date: 'Hoje', isLive: true, scoreA: 2, scoreB: 1, oddsA: 1.45, oddsB: 2.55 },
    { game: 'CS2', competition: 'IEM Cologne', teamAName: 'FURIA', teamACountry: 'br', teamBName: 'FaZe', teamBCountry: 'us', time: 'Live', date: 'Hoje', isLive: true, scoreA: 11, scoreB: 9, oddsA: 2.10, oddsB: 1.65 },
    { game: 'Valorant', competition: 'VCT Americas', teamAName: 'Sentinels', teamACountry: 'us', teamBName: 'LOUD', teamBCountry: 'br', time: '18:00', date: 'Hoje' },
    { game: 'Dota 2', competition: 'The International', teamAName: 'Spirit', teamACountry: 'ru', teamBName: 'Gaimin', teamBCountry: 'ca', time: '20:00', date: 'Hoje' },
    { game: 'CS2', competition: 'IEM Cologne', teamAName: 'Vitality', teamACountry: 'fr', teamBName: 'G2', teamBCountry: 'eu', time: '09:00', date: 'Amanhã' },
    { game: 'League of Legends', competition: 'LCK Summer', teamAName: 'T1', teamACountry: 'kr', teamBName: 'DK', teamBCountry: 'kr', time: '05:00', date: 'Amanhã' },
    { game: 'Valorant', competition: 'VCT EMEA', teamAName: 'Fnatic', teamACountry: 'gb', teamBName: 'NAVI', teamBCountry: 'ua', time: '13:00', date: 'Amanhã' },
    { game: 'Rocket League', competition: 'RLCS Major', teamAName: 'Vitality', teamACountry: 'fr', teamBName: 'BDS', teamBCountry: 'ch', time: '15:30', date: 'Amanhã' },
    { game: 'League of Legends', competition: 'LPL Summer', teamAName: 'JDG', teamACountry: 'cn', teamBName: 'BLG', teamBCountry: 'cn', time: '06:00', date: '15/08' },
    { game: 'CS2', competition: 'ESL Pro League', teamAName: 'MIBR', teamACountry: 'br', teamBName: 'Big', teamBCountry: 'de', time: '14:00', date: '15/08' },
];

const TOURNAMENT_MATCHES = [
    { game: 'League of Legends', competition: 'CBLOL Playoffs', teamAName: 'LOUD', teamACountry: 'br', teamBName: 'paiN', teamBCountry: 'br', time: 'Completed', date: '24 Ago', scoreA: 3, scoreB: 1 },
    { game: 'League of Legends', competition: 'CBLOL Playoffs', teamAName: 'paiN', teamACountry: 'br', teamBName: 'Vivo Keyd', teamBCountry: 'br', time: 'Completed', date: '18 Ago', scoreA: 3, scoreB: 2 },
    { game: 'League of Legends', competition: 'CBLOL Playoffs', teamAName: 'LOUD', teamACountry: 'br', teamBName: 'RED Canids', teamBCountry: 'br', time: 'Completed', date: '17 Ago', scoreA: 3, scoreB: 0 },
    { game: 'League of Legends', competition: 'CBLOL Playoffs', teamAName: 'Vivo Keyd', teamACountry: 'br', teamBName: 'Fluxo', teamBCountry: 'br', time: 'Completed', date: '10 Ago', scoreA: 3, scoreB: 2 },
    { game: 'League of Legends', competition: 'CBLOL Playoffs', teamAName: 'RED Canids', teamACountry: 'br', teamBName: 'FURIA', teamBCountry: 'br', time: 'Completed', date: '09 Ago', scoreA: 3, scoreB: 1 },
];

const GLOBAL_RANKINGS = [
    { rank: 1, teamName: 'Gen.G', teamCountry: 'kr', points: 1540, trend: 'stable', game: 'LoL' },
    { rank: 2, teamName: 'BLG', teamCountry: 'cn', points: 1480, trend: 'up', game: 'LoL' },
    { rank: 3, teamName: 'T1', teamCountry: 'kr', points: 1420, trend: 'down', game: 'LoL' },
    { rank: 1, teamName: 'Team Spirit', teamCountry: 'ru', points: 1800, trend: 'stable', game: 'CS2' },
    { rank: 2, teamName: 'FaZe Clan', teamCountry: 'us', points: 1750, trend: 'up', game: 'CS2' },
    { rank: 3, teamName: 'MOUZ', teamCountry: 'de', points: 1600, trend: 'down', game: 'CS2' },
    { rank: 1, teamName: 'Fnatic', teamCountry: 'eu', points: 2100, trend: 'up', game: 'Valorant' },
    { rank: 2, teamName: 'Paper Rex', teamCountry: 'sg', points: 1950, trend: 'stable', game: 'Valorant' },
];

const PICKEM_LEADERBOARD = [
    { rank: 1, username: 'xX_Slayer_Xx', points: 135, percentile: '0%' },
    { rank: 2, username: 'ProGamer123', points: 130, percentile: '0.1%' },
    { rank: 3, username: 'JettMain', points: 125, percentile: '0.2%' },
    { rank: 4, username: 'NoobMaster69', points: 120, percentile: '0.1%' },
    { rank: 5, username: 'FalleN_Fan', points: 115, percentile: '0.3%' },
    { rank: 6, username: 'LOUD_Lover', points: 110, percentile: '0.3%' },
];

const PLAYER_STATS = [
    { name: 'Aspas', team: 'Leviatán', country: 'br', role: 'Duelist', stats: { rating: 1.25, kda: '1.45', acs: 265, maps: 15 } },
    { name: 'Less', team: 'LOUD', country: 'br', role: 'Sentinel', stats: { rating: 1.18, kda: '1.30', acs: 210, maps: 15 } },
    { name: 'Saadhak', team: 'LOUD', country: 'ar', role: 'Initiator', stats: { rating: 1.05, kda: '1.10', acs: 195, maps: 15 } },
    { name: 'Zekken', team: 'Sentinels', country: 'us', role: 'Duelist', stats: { rating: 1.22, kda: '1.35', acs: 255, maps: 12 } },
    { name: 'Boaster', team: 'Fnatic', country: 'gb', role: 'Controller', stats: { rating: 0.95, kda: '0.90', acs: 180, maps: 10 } },
];

// ==================== MAIN SEED FUNCTION ====================
async function main() {
    console.log('🌱 Starting seed...');

    // 1. Admin User
    const password = await bcrypt.hash('admin', 10);
    await prisma.user.upsert({
        where: { email: 'admin@dicionariogamer.com' },
        update: {},
        create: { name: 'Admin', email: 'admin@dicionariogamer.com', password, role: 'ADMIN', level: 99, avatar: 'https://github.com/shadcn.png' },
    });
    console.log('✅ Admin user created');

    // 2. Games
    const gameMap: Record<string, string> = {}; // slug -> id
    for (const game of GAMES) {
        const g = await prisma.game.upsert({
            where: { slug: game.slug },
            update: {},
            create: game,
        });
        gameMap[game.slug] = g.id;
    }
    console.log(`✅ ${GAMES.length} games seeded`);

    // 3. Maps + Callouts
    let mapsCount = 0;
    for (const map of MAPS) {
        const gameId = gameMap[map.gameSlug];
        if (!gameId) continue;

        const existing = await prisma.gameMap.findFirst({ where: { gameId, name: map.name } });
        if (existing) continue;

        const createdMap = await prisma.gameMap.create({
            data: {
                gameId,
                name: map.name,
                image: map.image,
                tacticalImage: map.tacticalImage,
                callouts: {
                    create: map.callouts.map(c => ({
                        name: c.name, x: c.x, y: c.y, type: c.type, description: c.description || null
                    }))
                }
            }
        });
        mapsCount++;
    }
    console.log(`✅ ${mapsCount} maps seeded`);

    // 4. Terms
    for (const term of TERMS) {
        const gameId = term.gameSlug ? gameMap[term.gameSlug] : null;
        await prisma.term.create({
            data: {
                word: term.word,
                definition: term.definition,
                phonetic: term.phonetic,
                pronunciationGuide: term.pronunciationGuide,
                examples: term.examples,
                gameId,
                upvotes: term.upvotes,
                downvotes: term.downvotes,
                tags: term.tags,
                verified: term.verified,
            },
        });
    }
    console.log(`✅ ${TERMS.length} terms seeded`);

    // 5. News (short + full articles)
    for (const news of NEWS) {
        await prisma.news.create({ data: news });
    }
    for (const news of FULL_NEWS) {
        await prisma.news.create({ data: news });
    }
    console.log(`✅ ${NEWS.length + FULL_NEWS.length} news articles seeded`);

    // 6. Tournaments (with teams, standings, bracket)
    const cblol = await prisma.tournament.create({
        data: {
            name: 'CBLOL Split 2',
            game: 'LoL',
            logo: 'L',
            status: 'Playoffs',
            dates: 'Jun 01 - Aug 24',
            prizePool: 'R$ 400.000',
            image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
            description: 'O Campeonato Brasileiro de League of Legends (CBLOL) é a competição oficial do jogo no Brasil, administrada pela Riot Games. O vencedor garante vaga no Mundial.',
            organizer: 'Riot Games Brasil',
            location: 'Arena CBLOL, São Paulo',
            format: 'Double Elimination',
            teams: {
                create: [
                    { name: 'LOUD', country: 'br' }, { name: 'paiN Gaming', country: 'br' },
                    { name: 'RED Canids', country: 'br' }, { name: 'Vivo Keyd Stars', country: 'br' },
                    { name: 'Fluxo', country: 'br' }, { name: 'FURIA', country: 'br' },
                    { name: 'INTZ', country: 'br' }, { name: 'KaBuM!', country: 'br' },
                    { name: 'Los Grandes', country: 'br' }, { name: 'Liberty', country: 'br' }
                ]
            },
            standings: {
                create: [
                    { rank: 1, teamName: 'LOUD', teamCountry: 'br', played: 18, wins: 14, losses: 4, points: 14, diff: 10, streak: 'W3' },
                    { rank: 2, teamName: 'paiN Gaming', teamCountry: 'br', played: 18, wins: 13, losses: 5, points: 13, diff: 8, streak: 'W1' },
                    { rank: 3, teamName: 'RED Canids', teamCountry: 'br', played: 18, wins: 11, losses: 7, points: 11, diff: 4, streak: 'L1' },
                    { rank: 4, teamName: 'Vivo Keyd', teamCountry: 'br', played: 18, wins: 10, losses: 8, points: 10, diff: 2, streak: 'W2' },
                    { rank: 5, teamName: 'Fluxo', teamCountry: 'br', played: 18, wins: 9, losses: 9, points: 9, diff: 0, streak: 'L2' },
                    { rank: 6, teamName: 'FURIA', teamCountry: 'br', played: 18, wins: 8, losses: 10, points: 8, diff: -2, streak: 'W1' },
                ]
            },
            bracket: {
                create: [
                    { matchKey: 'qf1', round: 'Quarterfinals', teamAName: 'RED Canids', teamAScore: 3, teamAWinner: true, teamBName: 'FURIA', teamBScore: 1, date: '09/08', status: 'Finished' },
                    { matchKey: 'qf2', round: 'Quarterfinals', teamAName: 'Vivo Keyd', teamAScore: 3, teamAWinner: true, teamBName: 'Fluxo', teamBScore: 2, date: '10/08', status: 'Finished' },
                    { matchKey: 'sf1', round: 'Semifinals', teamAName: 'LOUD', teamBName: 'RED Canids', date: '17/08', status: 'Scheduled' },
                    { matchKey: 'sf2', round: 'Semifinals', teamAName: 'paiN Gaming', teamBName: 'Vivo Keyd', date: '18/08', status: 'Scheduled' },
                    { matchKey: 'gf', round: 'Grand Final', teamAName: 'TBD', teamBName: 'TBD', date: '24/08', status: 'Scheduled' },
                ]
            }
        }
    });

    // Additional tournaments
    await prisma.tournament.createMany({
        data: [
            { name: 'VCT Americas', game: 'Valorant', logo: 'V', status: 'Group Stage', dates: 'Jul 10 - Sep 02', prizePool: '$ 250.000', image: 'https://images.unsplash.com/photo-1624138784181-dc7f5b75e52e?q=80&w=600&auto=format&fit=crop' },
            { name: 'IEM Cologne', game: 'CS2', logo: 'C', status: 'Live', dates: 'Aug 04 - Aug 16', prizePool: '$ 1.000.000', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=600&auto=format&fit=crop' },
            { name: 'EVO 2024', game: 'Fighting', logo: 'E', status: 'Upcoming', dates: 'Aug 20 - Aug 22', prizePool: '$ 50.000', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop' },
        ]
    });
    console.log('✅ 4 tournaments seeded');

    // 7. Esports Matches
    await prisma.esportsMatch.createMany({ data: [...ESPORTS_MATCHES, ...TOURNAMENT_MATCHES] as any });
    console.log(`✅ ${ESPORTS_MATCHES.length + TOURNAMENT_MATCHES.length} esports matches seeded`);

    // 8. Esports News
    await prisma.esportsNews.createMany({ data: ESPORTS_NEWS });
    console.log(`✅ ${ESPORTS_NEWS.length} esports news seeded`);

    // 9. Rankings
    await prisma.teamRanking.createMany({ data: GLOBAL_RANKINGS });
    console.log(`✅ ${GLOBAL_RANKINGS.length} team rankings seeded`);

    // 10. Pick'em Leaderboard
    await prisma.pickemUser.createMany({ data: PICKEM_LEADERBOARD });
    console.log(`✅ ${PICKEM_LEADERBOARD.length} pick'em users seeded`);

    // 11. Player Stats (linked to CBLOL tournament)
    for (const stat of PLAYER_STATS) {
        await prisma.playerStat.create({
            data: { ...stat, tournamentId: cblol.id }
        });
    }
    console.log(`✅ ${PLAYER_STATS.length} player stats seeded`);

    console.log('\n🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
