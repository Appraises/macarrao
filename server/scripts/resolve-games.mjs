// Resolves a curated game list to real Steam app IDs + verified header art, writing
// the result to scripts/.games-resolved.json for the seeder to consume.
// Guessing app IDs from memory risks showing the wrong game's art, so every entry is
// looked up by name and its header.jpg is checked for HTTP 200 before being accepted.
// Run: node scripts/resolve-games.mjs
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

// name = what we show; query = what we search on Steam (when it differs); genre = our label.
const WANTED = [
    // --- FPS / tático ---
    { name: 'Rainbow Six Siege', query: "Tom Clancy's Rainbow Six Siege", genre: 'FPS' },
    { name: 'Apex Legends', genre: 'Battle Royale' },
    { name: 'Escape from Tarkov', genre: 'FPS' },
    { name: 'Team Fortress 2', genre: 'FPS' },
    { name: 'Titanfall 2', genre: 'FPS' },
    { name: 'Battlefield 2042', genre: 'FPS' },
    { name: 'DOOM Eternal', genre: 'FPS' },
    { name: 'Half-Life 2', genre: 'FPS' },
    { name: 'Hunt: Showdown', genre: 'FPS' },
    { name: 'Insurgency: Sandstorm', genre: 'FPS' },
    { name: 'The Finals', genre: 'FPS' },
    { name: 'Delta Force', genre: 'FPS' },

    // --- MOBA / estratégia ---
    { name: 'Smite', genre: 'MOBA' },
    { name: 'Age of Empires II: Definitive Edition', genre: 'Estratégia' },
    { name: 'StarCraft II', query: 'StarCraft', genre: 'Estratégia' },
    { name: 'Civilization VI', query: "Sid Meier's Civilization VI", genre: 'Estratégia' },
    { name: 'Total War: Warhammer III', genre: 'Estratégia' },
    { name: 'Company of Heroes 3', genre: 'Estratégia' },

    // --- RPG ---
    { name: 'The Witcher 3: Wild Hunt', genre: 'RPG' },
    { name: 'Baldur\'s Gate 3', query: 'Baldurs Gate 3', genre: 'RPG' },
    { name: 'Cyberpunk 2077', genre: 'RPG' },
    { name: 'Dark Souls III', genre: 'RPG' },
    { name: 'Sekiro: Shadows Die Twice', genre: 'RPG' },
    { name: 'Diablo IV', genre: 'RPG' },
    { name: 'Path of Exile', genre: 'RPG' },
    { name: 'Monster Hunter: World', genre: 'RPG' },
    { name: 'Skyrim', query: 'The Elder Scrolls V: Skyrim Special Edition', genre: 'RPG' },
    { name: 'Persona 5 Royal', genre: 'RPG' },
    { name: 'Hollow Knight', genre: 'Metroidvania' },
    { name: 'Hades', genre: 'Roguelike' },
    { name: 'Slay the Spire', genre: 'Roguelike' },
    { name: 'Vampire Survivors', genre: 'Roguelike' },
    { name: 'Risk of Rain 2', genre: 'Roguelike' },

    // --- Sobrevivência / sandbox / co-op ---
    { name: 'Rust', genre: 'Sobrevivência' },
    { name: 'ARK: Survival Evolved', genre: 'Sobrevivência' },
    { name: 'Valheim', genre: 'Sobrevivência' },
    { name: 'Terraria', genre: 'Sandbox' },
    { name: 'Stardew Valley', genre: 'Simulação' },
    { name: 'Palworld', genre: 'Sobrevivência' },
    { name: 'Grounded', genre: 'Sobrevivência' },
    { name: 'Don\'t Starve Together', query: 'Dont Starve Together', genre: 'Sobrevivência' },
    { name: 'Phasmophobia', genre: 'Terror' },
    { name: 'Lethal Company', genre: 'Terror' },
    { name: 'Dead by Daylight', genre: 'Terror' },
    { name: 'Left 4 Dead 2', genre: 'FPS' },
    { name: 'Deep Rock Galactic', genre: 'Co-op' },
    { name: 'It Takes Two', genre: 'Co-op' },

    // --- Luta ---
    { name: 'Tekken 8', genre: 'Luta' },
    { name: 'Mortal Kombat 1', genre: 'Luta' },
    { name: 'Guilty Gear -Strive-', genre: 'Luta' },
    { name: 'Dragon Ball FighterZ', genre: 'Luta' },

    // --- Corrida / esporte ---
    { name: 'Forza Horizon 5', genre: 'Corrida' },
    { name: 'EA SPORTS FC 25', query: 'EA SPORTS FC', genre: 'Esporte' },
    { name: 'F1 24', genre: 'Corrida' },
    { name: 'Assetto Corsa', genre: 'Corrida' },
    { name: 'NBA 2K25', genre: 'Esporte' },

    // --- Sandbox / simulação / outros ---
    { name: 'Grand Theft Auto V', genre: 'Sandbox' },
    { name: 'Red Dead Redemption 2', genre: 'Sandbox' },
    { name: 'Cities: Skylines II', genre: 'Simulação' },
    { name: 'The Sims 4', genre: 'Simulação' },
    { name: 'Euro Truck Simulator 2', genre: 'Simulação' },
    { name: 'Microsoft Flight Simulator', genre: 'Simulação' },
    { name: 'Among Us', genre: 'Party' },
    { name: 'Fall Guys', genre: 'Party' },
    { name: 'Overcooked! 2', genre: 'Party' },
    { name: 'Portal 2', genre: 'Puzzle' },
    { name: 'PUBG: Battlegrounds', genre: 'Battle Royale' },
    { name: 'Naraka: Bladepoint', genre: 'Battle Royale' },
    { name: 'Destiny 2', genre: 'MMO' },
    { name: 'Warframe', genre: 'MMO' },
    { name: 'Final Fantasy XIV Online', genre: 'MMORPG' },
    { name: 'Lost Ark', genre: 'MMORPG' },
    { name: 'New World', genre: 'MMORPG' },
    { name: 'Albion Online', genre: 'MMORPG' },
    { name: 'Sea of Thieves', genre: 'Aventura' },
    { name: 'No Man\'s Sky', query: 'No Mans Sky', genre: 'Aventura' },
    { name: 'Elite Dangerous', genre: 'Simulação' },
    { name: 'Rimworld', genre: 'Simulação' },
    { name: 'Factorio', genre: 'Simulação' },
    { name: 'Satisfactory', genre: 'Simulação' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const search = async (term) => {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=en&cc=br`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`storesearch HTTP ${res.status}`);
    const data = await res.json();
    return data.items || [];
};

const headerOk = async (appid) => {
    const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok ? url : null;
    } catch { return null; }
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const resolved = [];
const failed = [];

for (const item of WANTED) {
    const term = item.query || item.name;
    try {
        const results = await search(term);
        if (!results.length) { failed.push({ ...item, why: 'sem resultado' }); continue; }

        // Prefer an exact-ish name match; otherwise take the top hit.
        const target = norm(term);
        const hit = results.find((r) => norm(r.name) === target)
            || results.find((r) => norm(r.name).includes(target) || target.includes(norm(r.name)))
            || results[0];

        const image = await headerOk(hit.id);
        if (!image) { failed.push({ ...item, why: `header 404 (appid ${hit.id})` }); continue; }

        resolved.push({ name: item.name, steamName: hit.name, appid: hit.id, genre: item.genre, image });
        console.log(`  OK   ${item.name}  ->  ${hit.name} (${hit.id})`);
    } catch (error) {
        failed.push({ ...item, why: error.message });
        console.log(`  FALHOU ${item.name}: ${error.message}`);
    }
    await sleep(220); // be polite with Steam
}

writeFileSync(join(here, '.games-resolved.json'), JSON.stringify({ resolved, failed }, null, 2), 'utf8');
console.log(`\nResolvidos: ${resolved.length} | Falharam: ${failed.length}`);
failed.forEach((f) => console.log(`  - ${f.name}: ${f.why}`));
