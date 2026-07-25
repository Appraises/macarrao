import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JWT_SECRET } from '../utils/config';
import { recordUserActivity } from '../services/analytics/activity';

export interface AuthRequest extends Request {
    user?: any;
}

const bearerToken = (req: Request): string | null => {
    const authHeader = req.headers['authorization'];
    const [scheme, token] = typeof authHeader === 'string' ? authHeader.split(' ') : [];
    return scheme === 'Bearer' && token ? token : null;
};

export const authenticatedUser = async (token: string) => {
    // Pin the algorithm. Without this, verification accepts whatever the token's own
    // header asks for, which is how algorithm-confusion attacks get started.
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload || typeof payload === 'string' || typeof payload.userId !== 'string') return null;

    const fullUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!fullUser) return null;

    const tokenSessionVersion = Number.isInteger(payload.sessionVersion) ? payload.sessionVersion : 0;
    if (fullUser.sessionVersion !== tokenSessionVersion || fullUser.anonymizedAt) return null;
    return fullUser;
};

const resolveToken = async (req: AuthRequest, res: Response, next: NextFunction, required: boolean) => {
    const token = bearerToken(req);
    if (!token) return required ? res.sendStatus(401) : next();

    try {
        const user = await authenticatedUser(token);
        if (!user) return res.sendStatus(403);
        req.user = user;
        void recordUserActivity(user.id).catch((error) => console.error('[analytics] Failed to record user activity:', error));
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.sendStatus(403);
        }
        console.error('[auth] Failed to validate authenticated user:', error);
        return res.status(503).json({ error: 'Authentication service unavailable' });
    }
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) =>
    resolveToken(req, res, next, true);

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) =>
    resolveToken(req, res, next, false);
