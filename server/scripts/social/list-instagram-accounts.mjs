import 'dotenv/config';
import { listInstagramAccounts } from './providers.mjs';

const token = process.env.SOCIAL_INSTAGRAM_ACCESS_TOKEN;
const version = process.env.SOCIAL_INSTAGRAM_API_VERSION || 'v27.0';

try {
    if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN_REQUIRED');
    if ((process.env.SOCIAL_INSTAGRAM_AUTH_MODE || 'instagram_login') !== 'unified_login') {
        throw new Error('SET_INSTAGRAM_AUTH_MODE_TO_UNIFIED_LOGIN');
    }
    const accounts = await listInstagramAccounts({ token, version });
    console.log(JSON.stringify(accounts, null, 2));
} catch (error) {
    console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'INSTAGRAM_ACCOUNT_LOOKUP_FAILED');
    process.exitCode = 1;
}
