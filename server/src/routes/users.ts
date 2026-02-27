import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

// Get Current User Profile
router.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                level: true,
                role: true,
                description: true,
                preferences: true,
                createdAt: true,
                _count: {
                    select: {
                        terms: true,
                        comments: true
                    }
                },
                favoriteGame: true
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get User Activity (Terms and Comments)
router.get('/me/activity', authenticateToken, async (req: any, res) => {
    try {
        const [terms, comments] = await Promise.all([
            prisma.term.findMany({
                where: { authorId: req.user.id },
                include: { game: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.comment.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Parse JSON fields for terms
        const formattedTerms = terms.map(t => ({
            ...t
        }));

        res.json({ terms: formattedTerms, comments });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Update User Profile
router.put('/me', authenticateToken, async (req: any, res) => {
    const { name, avatar, favoriteGameId, description, preferences } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name,
                avatar,
                favoriteGameId,
                description,
                preferences
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                level: true,
                role: true,
                description: true,
                preferences: true,
                favoriteGame: true
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});



// Change Password
router.put('/me/password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

export default router;
