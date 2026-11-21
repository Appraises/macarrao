import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEAM_LOGOS, selectTeamLogos } from './esports-team-logos.mjs';

const MAX_ASSET_BYTES = 2 * 1024 * 1024;
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(scriptsDir, '..', '..', 'public');

const assetKind = (buffer) => {
    const prefix = buffer.subarray(0, 128).toString('utf8').trimStart();
    if (prefix.startsWith('<svg') || prefix.startsWith('<?xml')) return 'svg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
};

const fetchAsset = async (entry) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
        const response = await fetch(entry.assetUrl, {
            headers: { 'User-Agent': 'DicionarioGamer/1.0 (team-logo-sync)' },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length || buffer.length > MAX_ASSET_BYTES) throw new Error('arquivo vazio ou maior que 2 MB');

        const kind = assetKind(buffer);
        const expected = path.extname(entry.path).slice(1).toLowerCase();
        if (!kind || kind !== expected) throw new Error(`formato recebido ${kind || 'desconhecido'}, esperado ${expected}`);

        const target = path.resolve(publicDir, entry.path.replace(/^\/+/, ''));
        if (!target.startsWith(`${publicDir}${path.sep}`)) throw new Error('caminho fora da pasta public');
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, buffer);
        console.log(`${entry.key}: ${kind.toUpperCase()} atualizado de ${new URL(entry.assetUrl).hostname}`);
    } finally {
        clearTimeout(timeout);
    }
};

async function main() {
    const officialAssets = selectTeamLogos(process.argv.slice(2), TEAM_LOGOS.filter((entry) => entry.assetUrl));
    for (const entry of officialAssets) await fetchAsset(entry);
    console.log(`${officialAssets.length} logo(s) oficiais atualizadas.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
