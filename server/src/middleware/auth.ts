import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JWT_SECRET } from '../utils/config';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
        if (err) return res.sendStatus(403);

        // Fetch full user to check verification status
        const fullUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (!fullUser) return res.sendStatus(403);

        req.user = fullUser;
        next();
    });
};
