import { prisma } from '../src/lib/prisma';

const MOCK_MAPS_DATA = [
    // --- LEAGUE OF LEGENDS ---
    {
        gameSlug: 'lol',
        maps: [
            {
                id: 'map_sr',
                name: "Summoner's Rift",
                image: "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png", // Official Data Dragon URL
                tacticalImage: "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png",
                callouts: [
                    { id: 'c1', name: 'Baron Pit', x: 35, y: 28, type: 'Objective', description: 'Local onde nasce o Barão Na\'Shor.' },
                    { id: 'c2', name: 'Dragon Pit', x: 68, y: 75, type: 'Objective', description: 'Covil dos Dragões Elementais e Ancião.' },
                    { id: 'c3', name: 'Blue Buff (Blue)', x: 38, y: 52, type: 'Objective', description: 'Golem Sentinela Azul (Lado Azul).' },
                    { id: 'c4', name: 'Red Buff (Red)', x: 55, y: 25, type: 'Objective', description: 'Rubrivira (Lado Vermelho).' },
                    { id: 'c5', name: 'Mid Lane', x: 50, y: 50, type: 'Callout', description: 'Rota do meio, a mais curta.' },
                    { id: 'c6', name: 'Bot Lane', x: 85, y: 85, type: 'Callout', description: 'Rota inferior.' },
                    { id: 'c7', name: 'Top Lane', x: 15, y: 15, type: 'Callout', description: 'Rota superior.' },
                ]
            },
            {
                id: 'map_ha',
                name: "Howling Abyss (ARAM)",
                image: "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map12.png", // Official Data Dragon URL
                tacticalImage: "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map12.png",
                callouts: [
                    { id: 'ha1', name: 'Bridge', x: 50, y: 50, type: 'Callout', description: 'A única rota do mapa.' },
                    { id: 'ha2', name: 'Health Relic (Blue)', x: 30, y: 40, type: 'Objective', description: 'Relíquia de cura do lado azul.' },
                    { id: 'ha3', name: 'Health Relic (Red)', x: 70, y: 60, type: 'Objective', description: 'Relíquia de cura do lado vermelho.' },
                    { id: 'ha4', name: 'Blue Base', x: 10, y: 80, type: 'Site' },
                    { id: 'ha5', name: 'Red Base', x: 90, y: 20, type: 'Site' }
                ]
            }
        ]
    },

    // --- VALORANT ---
    {
        gameSlug: 'valorant',
        maps: [
            {
                id: 'map2',
                name: "Ascent",
                image: "https://static.wikia.nocookie.net/valorant/images/e/e7/Loading_Screen_Ascent.png",
                tacticalImage: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png",
                callouts: [
                    { id: 'v1', name: 'Site A', x: 80, y: 25, type: 'Site', description: 'Ponto de plant da Spike A.' },
                    { id: 'v2', name: 'Site B', x: 20, y: 28, type: 'Site', description: 'Ponto de plant da Spike B.' },
                    { id: 'v3', name: 'Mid Courtyard', x: 50, y: 45, type: 'Callout', description: 'Área aberta central.' },
                    { id: 'v4', name: 'Market', x: 40, y: 38, type: 'Callout', description: 'Conexão entre Mid e B.' },
                    { id: 'v5', name: 'Pizza (Gelato)', x: 60, y: 22, type: 'Callout', description: 'Canto no Mid Top.' },
                    { id: 'v6', name: 'Boat House', x: 12, y: 22, type: 'Callout', description: 'Fundão do Bomb B.' },
                    { id: 'v7', name: 'Heaven (A)', x: 78, y: 12, type: 'Callout', description: 'Posição elevada olhando pro Site A.' },
                ]
            },
            {
                id: 'map3',
                name: "Bind",
                image: "https://static.wikia.nocookie.net/valorant/images/2/23/Loading_Screen_Bind.png",
                tacticalImage: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/displayicon.png",
                callouts: [
                    { id: 'b1', name: 'Teleporter A (Exit)', x: 30, y: 20, type: 'Objective', description: 'Saída do TP A.' },
                    { id: 'b2', name: 'Showers/Bath', x: 85, y: 45, type: 'Callout', description: 'Banheiros.' },
                    { id: 'b3', name: 'Site A', x: 75, y: 30, type: 'Site' },
                    { id: 'b4', name: 'Site B', x: 30, y: 28, type: 'Site' }
                ]
            },
            {
                id: 'map4',
                name: "Haven",
                image: "https://static.wikia.nocookie.net/valorant/images/7/70/Loading_Screen_Haven.png",
                tacticalImage: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/displayicon.png",
                callouts: [
                    { id: 'h1', name: 'Site A', x: 82, y: 40, type: 'Site' },
                    { id: 'h2', name: 'Site B', x: 50, y: 32, type: 'Site' },
                    { id: 'h3', name: 'Site C', x: 18, y: 38, type: 'Site' },
                    { id: 'h4', name: 'Garage', x: 28, y: 45, type: 'Callout', description: 'Garagem central.' }
                ]
            },
            {
                id: 'map5',
                name: "Split",
                image: "https://static.wikia.nocookie.net/valorant/images/d/d6/Loading_Screen_Split.png",
                tacticalImage: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/displayicon.png",
                callouts: [
                    { id: 's1', name: 'Ropes/Vents', x: 50, y: 35, type: 'Objective', description: 'Cordas do meio.' },
                    { id: 's2', name: 'Site A', x: 82, y: 25, type: 'Site' },
                    { id: 's3', name: 'Site B', x: 15, y: 20, type: 'Site' },
                    { id: 's4', name: 'Mid', x: 50, y: 45, type: 'Callout' }
                ]
            },
            {
                id: 'map6',
                name: "Icebox",
                image: "https://static.wikia.nocookie.net/valorant/images/1/13/Loading_Screen_Icebox.png",
                tacticalImage: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/displayicon.png",
                callouts: [
                    { id: 'i1', name: 'Site A', x: 75, y: 45, type: 'Site' },
                    { id: 'i2', name: 'Site B', x: 25, y: 38, type: 'Site' },
                    { id: 'i3', name: 'Mid', x: 50, y: 45, type: 'Callout' }
                ]
            },
            {
                id: 'map7',
                name: "Breeze",
                image: "https://static.wikia.nocookie.net/valorant/images/1/10/Loading_Screen_Breeze.png",
                tacticalImage: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/displayicon.png",
                callouts: [
                    { id: 'br1', name: 'Site A', x: 80, y: 45, type: 'Site' },
                    { id: 'br2', name: 'Site B', x: 18, y: 28, type: 'Site' },
                    { id: 'br3', name: 'Mid', x: 50, y: 40, type: 'Callout' }
                ]
            },
            {
                id: 'map8',
                name: "Fracture",
                image: "https://static.wikia.nocookie.net/valorant/images/f/fc/Loading_Screen_Fracture.png",
                tacticalImage: "https://media.valorant-api.com/maps/b529448b-4d84-45ab-871f-e8b0b70e6d87/displayicon.png",
                callouts: [
                    { id: 'f1', name: 'Site A', x: 70, y: 15, type: 'Site' },
                    { id: 'f2', name: 'Site B', x: 70, y: 75, type: 'Site' },
                    { id: 'f3', name: 'Dish', x: 25, y: 20, type: 'Callout' }
                ]
            },
            {
                id: 'map9',
                name: "Pearl",
                image: "https://static.wikia.nocookie.net/valorant/images/a/af/Loading_Screen_Pearl.png",
                tacticalImage: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-bf52-9eb157ed70fb/displayicon.png",
                callouts: [
                    { id: 'p1', name: 'Site A', x: 78, y: 40, type: 'Site' },
                    { id: 'p2', name: 'Site B', x: 20, y: 25, type: 'Site' },
                    { id: 'p3', name: 'Mid Plaza', x: 50, y: 35, type: 'Callout' }
                ]
            },
            {
                id: 'map10',
                name: "Lotus",
                image: "https://static.wikia.nocookie.net/valorant/images/d/d0/Loading_Screen_Lotus.png",
                tacticalImage: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/displayicon.png",
                callouts: [
                    { id: 'l1', name: 'Site A', x: 18, y: 25, type: 'Site' },
                    { id: 'l2', name: 'Site B', x: 50, y: 20, type: 'Site' },
                    { id: 'l3', name: 'Site C', x: 82, y: 30, type: 'Site' }
                ]
            },
            {
                id: 'map11',
                name: "Sunset",
                image: "https://static.wikia.nocookie.net/valorant/images/5/5c/Loading_Screen_Sunset.png",
                tacticalImage: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/displayicon.png",
                callouts: [
                    { id: 'ss1', name: 'Site A', x: 20, y: 25, type: 'Site' },
                    { id: 'ss2', name: 'Site B', x: 75, y: 40, type: 'Site' },
                    { id: 'ss3', name: 'Mid Courtyard', x: 45, y: 40, type: 'Callout' }
                ]
            },
            {
                id: 'map12',
                name: "Abyss",
                image: "https://static.wikia.nocookie.net/valorant/images/6/61/Loading_Screen_Abyss.png",
                tacticalImage: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1a86-c2ae5a5b3133/displayicon.png",
                callouts: [
                    { id: 'ab1', name: 'Site A', x: 75, y: 25, type: 'Site' },
                    { id: 'ab2', name: 'Site B', x: 25, y: 32, type: 'Site' },
                    { id: 'ab3', name: 'Library', x: 50, y: 32, type: 'Callout' }
                ]
            }
        ]
    },

    // --- CS2 ---
    {
        gameSlug: 'cs2',
        maps: [
            {
                id: 'cs_mirage',
                name: "Mirage",
                image: "https://static.wikia.nocookie.net/cswikia/images/d/d6/Mirage_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/1/12/De_mirage_radar.png",
                callouts: [
                    { id: 'm1', name: 'Site A', x: 70, y: 25, type: 'Site' },
                    { id: 'm2', name: 'Site B', x: 30, y: 30, type: 'Site' },
                    { id: 'm3', name: 'Mid', x: 50, y: 50, type: 'Callout' },
                    { id: 'm4', name: 'Palace', x: 80, y: 15, type: 'Callout' },
                    { id: 'm5', name: 'Apartments', x: 20, y: 15, type: 'Callout' }
                ]
            },
            {
                id: 'cs_inferno',
                name: "Inferno",
                image: "https://static.wikia.nocookie.net/cswikia/images/6/61/Inferno_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/2/23/De_inferno_radar.png",
                callouts: [
                    { id: 'in1', name: 'Site A', x: 75, y: 70, type: 'Site' },
                    { id: 'in2', name: 'Site B', x: 30, y: 30, type: 'Site' },
                    { id: 'in3', name: 'Banana', x: 20, y: 50, type: 'Callout' },
                    { id: 'in4', name: 'Mid', x: 60, y: 50, type: 'Callout' }
                ]
            },
            {
                id: 'cs_dust2',
                name: "Dust II",
                image: "https://static.wikia.nocookie.net/cswikia/images/0/02/Dust_II_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/4/42/De_dust2_radar.png",
                callouts: [
                    { id: 'd1', name: 'Site A', x: 85, y: 30, type: 'Site' },
                    { id: 'd2', name: 'Site B', x: 20, y: 20, type: 'Site' },
                    { id: 'd3', name: 'Long A', x: 90, y: 50, type: 'Callout' },
                    { id: 'd4', name: 'Mid', x: 50, y: 40, type: 'Callout' },
                    { id: 'd5', name: 'Tunnels', x: 15, y: 35, type: 'Callout' }
                ]
            },
            {
                id: 'cs_nuke',
                name: "Nuke",
                image: "https://static.wikia.nocookie.net/cswikia/images/9/9d/Nuke_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/2/22/De_nuke_radar.png",
                callouts: [
                    { id: 'n1', name: 'Site A', x: 50, y: 45, type: 'Site' },
                    { id: 'n2', name: 'Site B (Lower)', x: 50, y: 55, type: 'Site' },
                    { id: 'n3', name: 'Outside', x: 80, y: 40, type: 'Callout' },
                    { id: 'n4', name: 'Ramp', x: 20, y: 40, type: 'Callout' }
                ]
            },
            {
                id: 'cs_overpass',
                name: "Overpass",
                image: "https://static.wikia.nocookie.net/cswikia/images/c/cc/Overpass_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/a/a2/De_overpass_radar.png",
                callouts: [
                    { id: 'ov1', name: 'Site A', x: 45, y: 30, type: 'Site' },
                    { id: 'ov2', name: 'Site B', x: 45, y: 65, type: 'Site' },
                    { id: 'ov3', name: 'Connector', x: 60, y: 50, type: 'Callout' },
                    { id: 'ov4', name: 'Monster', x: 30, y: 60, type: 'Callout' }
                ]
            },
            {
                id: 'cs_vertigo',
                name: "Vertigo",
                image: "https://static.wikia.nocookie.net/cswikia/images/0/0c/Vertigo_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/0/08/De_vertigo_radar.png",
                callouts: [
                    { id: 've1', name: 'Site A', x: 30, y: 25, type: 'Site' },
                    { id: 've2', name: 'Site B', x: 30, y: 65, type: 'Site' },
                    { id: 've3', name: 'Mid', x: 50, y: 45, type: 'Callout' }
                ]
            },
            {
                id: 'cs_ancient',
                name: "Ancient",
                image: "https://static.wikia.nocookie.net/cswikia/images/2/22/Ancient_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/e/e0/De_ancient_radar.png",
                callouts: [
                    { id: 'an1', name: 'Site A', x: 25, y: 40, type: 'Site' },
                    { id: 'an2', name: 'Site B', x: 75, y: 40, type: 'Site' },
                    { id: 'an3', name: 'Mid', x: 50, y: 50, type: 'Callout' }
                ]
            },
            {
                id: 'cs_anubis',
                name: "Anubis",
                image: "https://static.wikia.nocookie.net/cswikia/images/d/df/Anubis_CS2_thumbnail.png",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/1/1a/De_anubis_radar.png",
                callouts: [
                    { id: 'ab1', name: 'Site A', x: 70, y: 30, type: 'Site' },
                    { id: 'ab2', name: 'Site B', x: 20, y: 45, type: 'Site' },
                    { id: 'ab3', name: 'Mid', x: 45, y: 45, type: 'Callout' },
                    { id: 'ab4', name: 'Bridge', x: 55, y: 55, type: 'Callout' }
                ]
            },
            {
                id: 'cs_train',
                name: "Train",
                image: "https://placehold.co/1920x1080/1a1a1a/ffffff?text=Train+CS2",
                tacticalImage: "https://placehold.co/500x500/1a1a1a/ffffff?text=Train+Radar",
                callouts: [
                    { id: 'tr1', name: 'Site A', x: 40, y: 40, type: 'Site' },
                    { id: 'tr2', name: 'Site B', x: 40, y: 80, type: 'Site' },
                    { id: 'tr3', name: 'Ivy', x: 80, y: 20, type: 'Callout' },
                    { id: 'tr4', name: 'Popdog', x: 50, y: 60, type: 'Callout' }
                ]
            },
            {
                id: 'cs_office',
                name: "Office",
                image: "https://placehold.co/1920x1080/1a1a1a/ffffff?text=Office+CS2",
                tacticalImage: "https://placehold.co/500x500/1a1a1a/ffffff?text=Office+Radar",
                callouts: [
                    { id: 'of1', name: 'Hostage Rescue Zone', x: 50, y: 90, type: 'Objective' },
                    { id: 'of2', name: 'Long Hall', x: 20, y: 50, type: 'Callout' },
                    { id: 'of3', name: 'Paper', x: 80, y: 50, type: 'Callout' }
                ]
            },
            {
                id: 'cs_italy',
                name: "Italy",
                image: "https://placehold.co/1920x1080/1a1a1a/ffffff?text=Italy+CS2",
                tacticalImage: "https://static.wikia.nocookie.net/cswikia/images/1/1c/Cs_italy_radar.png", // Found this one!
                callouts: [
                    { id: 'it1', name: 'Market', x: 50, y: 50, type: 'Callout' },
                    { id: 'it2', name: 'Apartments', x: 70, y: 30, type: 'Callout' },
                    { id: 'it3', name: 'Hostage Rescue', x: 20, y: 80, type: 'Objective' }
                ]
            },
            {
                id: 'cs_baggage',
                name: "Baggage",
                image: "https://placehold.co/1920x1080/1a1a1a/ffffff?text=Baggage+CS2",
                tacticalImage: "https://placehold.co/500x500/1a1a1a/ffffff?text=Baggage+Radar",
                callouts: []
            },
            {
                id: 'cs_shoots',
                name: "Shoots",
                image: "https://placehold.co/1920x1080/1a1a1a/ffffff?text=Shoots+CS2",
                tacticalImage: "https://placehold.co/500x500/1a1a1a/ffffff?text=Shoots+Radar",
                callouts: []
            }
        ]
    }
];

async function main() {
    console.log('Seeding maps...');

    for (const gameData of MOCK_MAPS_DATA) {
        // 1. Fetch Game ID by Slug
        const game = await prisma.game.findUnique({
            where: { slug: gameData.gameSlug }
        });

        if (!game) {
            console.warn(`Game with slug '${gameData.gameSlug}' not found. Skipping maps.`);
            continue;
        }

        console.log(`Found game '${game.name}' (ID: ${game.id}). Seeding ${gameData.maps.length} maps...`);

        for (const map of gameData.maps) {
            await prisma.gameMap.upsert({
                where: { id: map.id },
                update: {
                    name: map.name,
                    image: map.image,
                    tacticalImage: map.tacticalImage,
                    gameId: game.id, // Use the actual Game ID from DB
                    callouts: {
                        deleteMany: {},
                        create: map.callouts.map(c => ({
                            name: c.name,
                            x: c.x,
                            y: c.y,
                            type: c.type,
                            description: c.description
                        }))
                    }
                },
                create: {
                    id: map.id,
                    gameId: game.id, // Use the actual Game ID from DB
                    name: map.name,
                    image: map.image,
                    tacticalImage: map.tacticalImage,
                    callouts: {
                        create: map.callouts.map(c => ({
                            name: c.name,
                            x: c.x,
                            y: c.y,
                            type: c.type,
                            description: c.description
                        }))
                    }
                }
            });
            console.log(`Upserted map: ${map.name}`);
        }
    }

    console.log('Seeding maps completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
