import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';
import { validateEmail, validatePassword, validateName } from '../utils/validation';

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        // Return user info without password
        const { password: _, ...userInfo } = user;
        res.json({ token, user: userInfo });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Input validation
    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
        return res.status(400).json({ error: nameCheck.message });
    }

    if (!email || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email,
                password: hashedPassword,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random`,
                verificationToken
            }
        });

        console.log(`\n\n[EMAIL SIMULATION] Verify your email here: http://localhost:5173/verify-email?token=${verificationToken}\n\n`);

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        const { password: _, ...userInfo } = user;
        res.json({ token, user: userInfo });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed (Email might be taken)' });
    }
});

// Verify Email
router.post('/verify-email', async (req, res) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token é obrigatório.' });
    }

    try {
        const user = await prisma.user.findFirst({ where: { verificationToken: token } });
        if (!user) return res.status(400).json({ error: 'Invalid token' });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null
            }
        });

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Security: Don't reveal if user exists
            return res.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        // Generate cryptographically secure token (valid for 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: expires
            }
        });

        // SIMULATION: Log to console
        console.log(`\n\n[EMAIL SIMULATION] Reset Password Link: http://localhost:5173/reset-password?token=${resetToken}\n\n`);

        res.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token é obrigatório.' });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;
