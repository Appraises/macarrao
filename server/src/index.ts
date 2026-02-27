import express from 'express';
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
import { CORS_ORIGINS } from './utils/config';

import { prisma } from './lib/prisma';
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

// Security Middleware
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser — BEFORE all routes
app.use(express.json());

// WebSocket Setup
const io = new Server(httpServer, {
    cors: {
        origin: CORS_ORIGINS,
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    io.emit('activeUsers', io.engine.clientsCount);

    socket.on('disconnect', () => {
        io.emit('activeUsers', io.engine.clientsCount);
    });
});

// Routes
app.use('/auth', authRoutes);
app.use('/games', gamesRoutes);
app.use('/terms', termsRoutes);
app.use('/news', newsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/comments', commentRoutes);
app.use('/users', userRoutes);
app.use('/maps', mapRoutes);
app.use('/ai', aiRoutes);
app.use('/esports', esportsRoutes);

app.get('/', (req, res) => {
    res.send('Dicionário Gamer API is running');
});

// Error handling — MUST be after all routes
app.use(notFoundHandler);
app.use(errorHandler);

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

export { prisma };
