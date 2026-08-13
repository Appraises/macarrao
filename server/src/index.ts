import './instrument';
import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import termsRoutes from './routes/terms';
import newsRoutes from './routes/news';
import dashboardRoutes from './routes/dashboard';
import commentRoutes from './routes/comments';
import userRoutes from './routes/users';
import mapRoutes from './routes/maps';
import aiRoutes from './routes/ai';
import esportsRoutes from './routes/esports';
import contributionsRoutes from './routes/contributions';
import newsletterRoutes from './routes/newsletter';
import arcadeRoutes from './routes/arcade';
import { CORS_ORIGINS } from './utils/config';
import { UPLOAD_ROOT } from './utils/uploads';
import { setEsportsSocketServer } from './services/esports/realtime';
import { setRealtimeSocketServer } from './services/realtime';
import { startEsportsSyncScheduler } from './services/esports/sync';
import { authenticatedUser } from './middleware/auth';
import { startAnalyticsScheduler } from './services/analytics/sync';
import { resendWebhook } from './routes/webhooks';
import { sentryEnabled } from './instrument';
import { deleteExpiredRateLimitBuckets } from './services/abuseProtection';

import { prisma } from './lib/prisma';
const PORT = process.env.PORT || 3001;

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// Security Middleware
app.use(helmet());

// Provider webhooks can legitimately emit several signed events per recipient.
// Keep this before the browser-oriented global limiter and preserve the raw body.
app.post('/webhooks/resend', express.raw({ type: 'application/json', limit: '256kb' }), resendWebhook);

// Keep CORS ahead of the limiter so the browser can read 429 responses instead
// of turning them into a misleading generic network error.
app.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Analytics-Enabled', 'X-Search-Origin'],
    exposedHeaders: ['Content-Disposition', 'Retry-After', 'RateLimit', 'RateLimit-Policy']
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    // The SPA loads independent widgets and uses polling. Sensitive operations
    // retain their stricter route-specific limits.
    max: process.env.NODE_ENV === 'production' ? 600 : 5000,
    // Production SSG runs on the same host and can legitimately prerender
    // hundreds of routes in one pass. Nginx preserves the real client IP, so
    // only direct loopback requests bypass this browser-facing limiter.
    skip: (req) => ['127.0.0.1', '::1'].includes(String(req.ip || '').replace(/^::ffff:/, '')),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' }
});
app.use(limiter);

// Body parser — BEFORE all regular routes
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_ROOT, {
    dotfiles: 'deny',
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Helmet defaults every response to same-origin, which silently blocks the
        // frontend from displaying uploaded media whenever it runs on a different
        // origin than the API (i.e. always, in production). These files are public.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// WebSocket Setup
const io = new Server(httpServer, {
    cors: {
        origin: CORS_ORIGINS,
        methods: ["GET", "POST"]
    }
});
setEsportsSocketServer(io);
setRealtimeSocketServer(io);

io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (typeof token === 'string' && token) {
        try {
            const user = await authenticatedUser(token);
            if (user) {
                socket.data.userId = user.id;
                await socket.join(`user:${user.id}`);
                if (user.role === 'ADMIN') await socket.join('admins');
            }
        } catch {
            // Public real-time channels remain available without authentication.
        }
    }
    io.emit('activeUsers', io.engine.clientsCount);

    socket.on('disconnect', () => {
        io.emit('activeUsers', io.engine.clientsCount);
    });
});

// Routes
app.use('/auth', authRoutes);
app.use('/games', gamesRoutes);
app.use('/terms', termsRoutes);
app.use('/contributions', contributionsRoutes);
app.use('/news', newsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/comments', commentRoutes);
app.use('/users', userRoutes);
app.use('/maps', mapRoutes);
app.use('/ai', aiRoutes);
app.use('/esports', esportsRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/arcade', arcadeRoutes);

app.get('/', (req, res) => {
    res.send('Dicionário Gamer API is running');
});

// Error handling — MUST be after all routes
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp: new Date().toISOString() });
    }
});

if (sentryEnabled) Sentry.setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandler);

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    startEsportsSyncScheduler();
    startAnalyticsScheduler();
    void deleteExpiredRateLimitBuckets()
        .catch((error) => console.error('[abuse-protection] Cleanup failed:', error));
    const abuseCleanup = setInterval(() => {
        void deleteExpiredRateLimitBuckets()
            .catch((error) => console.error('[abuse-protection] Cleanup failed:', error));
    }, 6 * 60 * 60 * 1000);
    abuseCleanup.unref();
});

export { prisma };
