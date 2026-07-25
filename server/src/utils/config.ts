import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    console.error('Please set JWT_SECRET in your .env file.');
    process.exit(1);
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(o => o.trim());
const TERMS_VERSION = process.env.TERMS_VERSION || '2026-07-13';
const PRIVACY_VERSION = process.env.PRIVACY_VERSION || '2026-07-13';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Dicionario Gamer <onboarding@resend.dev>';

// Email nao impede o servidor de subir, mas um canal morto em silencio e pior do que
// um canal ausente: recuperacao de senha falha sem ninguem perceber. Avisa alto.
const PLACEHOLDER_SENDER = /seu-dominio|your-domain|example\.com|onboarding@resend\.dev/i;
if (!RESEND_API_KEY) {
    console.warn('[config] AVISO: RESEND_API_KEY nao esta definida. NENHUM email sera enviado');
    console.warn('[config]        (recuperacao de senha, verificacao de conta, LGPD e moderacao).');
}
if (PLACEHOLDER_SENDER.test(EMAIL_FROM)) {
    console.warn(`[config] AVISO: EMAIL_FROM usa um remetente de exemplo (${EMAIL_FROM}).`);
    console.warn('[config]        O Resend so entrega a partir de um dominio verificado na conta.');
}
// Image safety pre-screen (SafeSearch). Off by default: images go straight to owner
// curation. When a provider + key are set, uploads are screened first and unsafe ones
// are flagged for admin review instead of reaching the term owner.
const IMAGE_MODERATION_ENABLED = process.env.IMAGE_MODERATION_ENABLED === 'true';
const IMAGE_MODERATION_PROVIDER = (process.env.IMAGE_MODERATION_PROVIDER || 'google').toLowerCase();
const IMAGE_MODERATION_API_KEY = process.env.IMAGE_MODERATION_API_KEY || '';
if (IMAGE_MODERATION_ENABLED && !IMAGE_MODERATION_API_KEY) {
    console.warn('[config] AVISO: IMAGE_MODERATION_ENABLED=true mas IMAGE_MODERATION_API_KEY esta vazia.');
    console.warn('[config]        O pre-filtro de imagens fica inativo ate a chave ser definida.');
}
const LIQUIPEDIA_API_KEY = process.env.LIQUIPEDIA_API_KEY || '';
const LIQUIPEDIA_API_BASE = (process.env.LIQUIPEDIA_API_BASE || 'https://api.liquipedia.net/api/v3').replace(/\/$/, '');
const LIQUIPEDIA_USER_AGENT = process.env.LIQUIPEDIA_USER_AGENT || 'DicionarioGamer/1.0 (contato@dicionariogamer.com.br)';
const ESPORTS_SYNC_INTERVAL_MINUTES = Math.max(5, Number(process.env.ESPORTS_SYNC_INTERVAL_MINUTES) || 15);
const ESPORTS_SYNC_WIKIS = (process.env.ESPORTS_SYNC_WIKIS || 'valorant,counterstrike,leagueoflegends')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
const ESPORTS_FOCUS_KEYWORDS = (process.env.ESPORTS_FOCUS_KEYWORDS || 'brasil,brazil,cblol,lta south,cbcs,challengers brazil,vct brazil,game changers brazil,liga gg,fireleague brazil')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
const ESPORTS_FOCUS_TEAMS = (process.env.ESPORTS_FOCUS_TEAMS || 'LOUD,paiN Gaming,FURIA,MIBR,Fluxo,RED Canids,Vivo Keyd,KaBuM,INTZ,Los Grandes,Liberty,2GAME,Corinthians Esports,w7m esports,Team Liquid Brazil')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
const ANALYTICS_HASH_SECRET = process.env.ANALYTICS_HASH_SECRET || JWT_SECRET;
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID || '';
const PLAUSIBLE_STATS_API_KEY = process.env.PLAUSIBLE_STATS_API_KEY || '';
const PLAUSIBLE_STATS_API_URL = (process.env.PLAUSIBLE_STATS_API_URL || 'https://plausible.io/api/v2/query').replace(/\/$/, '');
const GOOGLE_SEARCH_CONSOLE_SITE_URL = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || '';
const GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || '';
const GOOGLE_PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY || '';
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const SENTRY_ORG = process.env.SENTRY_ORG || '';
const SENTRY_API_TOKEN = process.env.SENTRY_API_TOKEN || '';
const SENTRY_FRONTEND_PROJECT = process.env.SENTRY_FRONTEND_PROJECT || '';
const SENTRY_BACKEND_PROJECT = process.env.SENTRY_BACKEND_PROJECT || '';
const ANALYTICS_SYNC_ENABLED = process.env.ANALYTICS_SYNC_ENABLED === 'true';

export {
    JWT_SECRET,
    CORS_ORIGINS,
    TERMS_VERSION,
    PRIVACY_VERSION,
    APP_URL,
    PUBLIC_API_URL,
    RESEND_API_KEY,
    EMAIL_FROM,
    IMAGE_MODERATION_ENABLED,
    IMAGE_MODERATION_PROVIDER,
    IMAGE_MODERATION_API_KEY,
    LIQUIPEDIA_API_KEY,
    LIQUIPEDIA_API_BASE,
    LIQUIPEDIA_USER_AGENT,
    ESPORTS_SYNC_INTERVAL_MINUTES,
    ESPORTS_SYNC_WIKIS,
    ESPORTS_FOCUS_KEYWORDS,
    ESPORTS_FOCUS_TEAMS,
    ANALYTICS_HASH_SECRET,
    PLAUSIBLE_SITE_ID,
    PLAUSIBLE_STATS_API_KEY,
    PLAUSIBLE_STATS_API_URL,
    GOOGLE_SEARCH_CONSOLE_SITE_URL,
    GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    GOOGLE_PAGESPEED_API_KEY,
    SENTRY_DSN,
    SENTRY_ORG,
    SENTRY_API_TOKEN,
    SENTRY_FRONTEND_PROJECT,
    SENTRY_BACKEND_PROJECT,
    ANALYTICS_SYNC_ENABLED
};
