import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { parseEnv } from 'node:util';

try {
    const env = await open('/srv/dicionario/server/.env', constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        const stat = await env.stat();
        if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o027) || stat.size > 128 * 1024) {
            throw new Error();
        }
        const { DATABASE_URL } = parseEnv(await env.readFile('utf8'));
        if (!DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(DATABASE_URL)) throw new Error();
        process.env.DATABASE_URL = DATABASE_URL;
    } finally {
        await env.close();
    }
    await import('./publish-news.mjs');
} catch {
    console.error('IMPORT_RUNTIME_OR_DATABASE_CONFIG_INVALID');
    process.exitCode = 1;
}
