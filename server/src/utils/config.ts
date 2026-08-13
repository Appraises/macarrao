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
const PRIVACY_VERSION = process.env.PRIVACY_VERSION || '2026-08-10';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Dicionario Gamer <onboarding@resend.dev>';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';
const NEWSLETTER_TOKEN_SECRET = process.env.NEWSLETTER_TOKEN_SECRET || JWT_SECRET;
const NEWSLETTER_ENABLED = process.env.NEWSLETTER_ENABLED === 'true';
const positiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const TURNSTILE_ENABLED = process.env.TURNSTILE_ENABLED === 'true';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_ALLOWED_HOSTNAMES = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'localhost,127.0.0.1')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
const TURNSTILE_TIMEOUT_MS = positiveInteger(process.env.TURNSTILE_TIMEOUT_MS, 3_000);
const ABUSE_HASH_SECRET = process.env.ABUSE_HASH_SECRET || JWT_SECRET;
const BOT_TRUST_MINUTES = positiveInteger(process.env.BOT_TRUST_MINUTES, 30);
const BOT_NEW_ACCOUNT_HOURS = positiveInteger(process.env.BOT_NEW_ACCOUNT_HOURS, 24);
const CONTRIBUTION_ACCOUNT_LIMIT = positiveInteger(process.env.CONTRIBUTION_ACCOUNT_LIMIT, 5);
const CONTRIBUTION_ACCOUNT_WINDOW_MINUTES = positiveInteger(process.env.CONTRIBUTION_ACCOUNT_WINDOW_MINUTES, 30);
const CONTRIBUTION_IP_LIMIT = positiveInteger(process.env.CONTRIBUTION_IP_LIMIT, 20);
const CONTRIBUTION_IP_WINDOW_MINUTES = positiveInteger(process.env.CONTRIBUTION_IP_WINDOW_MINUTES, 30);
const CONTRIBUTION_CHALLENGE_THRESHOLD = positiveInteger(process.env.CONTRIBUTION_CHALLENGE_THRESHOLD, 2);
const CONTRIBUTION_DAILY_CHALLENGE_THRESHOLD = positiveInteger(process.env.CONTRIBUTION_DAILY_CHALLENGE_THRESHOLD, 5);

if (TURNSTILE_ENABLED && !TURNSTILE_SECRET_KEY) {
    const message = 'TURNSTILE_ENABLED=true mas TURNSTILE_SECRET_KEY nao foi configurada.';
    if (process.env.NODE_ENV === 'production') {
        console.error(`[config] ERRO: ${message}`);
        process.exit(1);
    }
    console.warn(`[config] AVISO: ${message}`);
}
if (TURNSTILE_ENABLED && !process.env.ABUSE_HASH_SECRET) {
    console.warn('[config] AVISO: ABUSE_HASH_SECRET ausente; usando JWT_SECRET como fallback.');
}

// Email nao impede o servidor de subir, mas um canal morto em silencio e pior do que
// um canal ausente: recuperacao de senha falha sem ninguem perceber. Avisa alto.
const PLACEHOLDER_SENDER = /seu-dominio|your-domain|example\.com|onboarding@resend\.dev/i;
if (!RESEND_API_KEY) {
    console.warn('[config] AVISO: RESEND_API_KEY nao esta definida. NENHUM email sera enviado');
    console.warn('[config]        (recuperacao de senha, verificacao de conta, LGPD, moderacao e newsletter).');
}
if (PLACEHOLDER_SENDER.test(EMAIL_FROM)) {
    console.warn(`[config] AVISO: EMAIL_FROM usa um remetente de exemplo (${EMAIL_FROM}).`);
    console.warn('[config]        O Resend so entrega a partir de um dominio verificado na conta.');
}
if (NEWSLETTER_ENABLED && (!RESEND_API_KEY || !PUBLIC_API_URL)) {
    console.warn('[config] AVISO: newsletter ativa sem RESEND_API_KEY ou PUBLIC_API_URL. O job diario sera ignorado.');
}
if (!RESEND_WEBHOOK_SECRET) {
    console.warn('[config] AVISO: RESEND_WEBHOOK_SECRET ausente. Eventos da newsletter nao serao aceitos.');
}
if (!process.env.NEWSLETTER_TOKEN_SECRET) {
    console.warn('[config] AVISO: NEWSLETTER_TOKEN_SECRET ausente; usando JWT_SECRET como fallback.');
}
// Where uploaded media lives. 'local' keeps files on the server's own disk, which is
// fine on a VPS but loses every image on an ephemeral host and cannot be shared across
// instances. 's3' points at any S3-compatible bucket (AWS, Cloudflare R2, Backblaze,
// MinIO) and is what makes more than one instance possible.
const MEDIA_DRIVER = (process.env.MEDIA_DRIVER || 'local').toLowerCase();
const MEDIA_S3_BUCKET = process.env.MEDIA_S3_BUCKET || '';
const MEDIA_S3_REGION = process.env.MEDIA_S3_REGION || 'auto';
const MEDIA_S3_ENDPOINT = process.env.MEDIA_S3_ENDPOINT || '';
const MEDIA_S3_ACCESS_KEY_ID = process.env.MEDIA_S3_ACCESS_KEY_ID || '';
const MEDIA_S3_SECRET_ACCESS_KEY = process.env.MEDIA_S3_SECRET_ACCESS_KEY || '';
const MEDIA_S3_PUBLIC_URL = (process.env.MEDIA_S3_PUBLIC_URL || '').replace(/\/$/, '');
if (MEDIA_DRIVER === 's3') {
    const missing = [
        ['MEDIA_S3_BUCKET', MEDIA_S3_BUCKET],
        ['MEDIA_S3_ACCESS_KEY_ID', MEDIA_S3_ACCESS_KEY_ID],
        ['MEDIA_S3_SECRET_ACCESS_KEY', MEDIA_S3_SECRET_ACCESS_KEY],
        ['MEDIA_S3_PUBLIC_URL', MEDIA_S3_PUBLIC_URL],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
        console.error(`[config] ERRO: MEDIA_DRIVER=s3 mas faltam: ${missing.join(', ')}. Uploads vao falhar.`);
    }
} else {
    console.warn('[config] Uploads no disco local. Em host efemero (Vercel/Render/Railway) as');
    console.warn('[config] imagens somem a cada deploy — use MEDIA_DRIVER=s3 em producao.');
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
    RESEND_WEBHOOK_SECRET,
    NEWSLETTER_TOKEN_SECRET,
    NEWSLETTER_ENABLED,
    TURNSTILE_ENABLED,
    TURNSTILE_SECRET_KEY,
    TURNSTILE_ALLOWED_HOSTNAMES,
    TURNSTILE_TIMEOUT_MS,
    ABUSE_HASH_SECRET,
    BOT_TRUST_MINUTES,
    BOT_NEW_ACCOUNT_HOURS,
    CONTRIBUTION_ACCOUNT_LIMIT,
    CONTRIBUTION_ACCOUNT_WINDOW_MINUTES,
    CONTRIBUTION_IP_LIMIT,
    CONTRIBUTION_IP_WINDOW_MINUTES,
    CONTRIBUTION_CHALLENGE_THRESHOLD,
    CONTRIBUTION_DAILY_CHALLENGE_THRESHOLD,
    MEDIA_DRIVER,
    MEDIA_S3_BUCKET,
    MEDIA_S3_REGION,
    MEDIA_S3_ENDPOINT,
    MEDIA_S3_ACCESS_KEY_ID,
    MEDIA_S3_SECRET_ACCESS_KEY,
    MEDIA_S3_PUBLIC_URL,
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
