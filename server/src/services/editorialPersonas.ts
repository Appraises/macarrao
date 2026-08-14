import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EDITORIAL_PERSONAS } from '../config/editorialPersonas';

type PersonaPrisma = Pick<PrismaClient, 'user'>;

export const upsertEditorialPersonas = async (prisma: PersonaPrisma) => {
    const profiles = [];

    for (const persona of EDITORIAL_PERSONAS) {
        const inaccessiblePassword = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
        const preferences: Prisma.InputJsonValue = {
            emailNotifications: false,
            systemProfile: true,
            editorialPersona: {
                key: persona.key,
                beat: persona.beat
            }
        };

        profiles.push(await prisma.user.upsert({
            where: { email: persona.email },
            update: {
                name: persona.name,
                description: persona.bio,
                emailVerified: true,
                preferences
            },
            create: {
                name: persona.name,
                email: persona.email,
                password: inaccessiblePassword,
                role: 'USER',
                emailVerified: true,
                description: persona.bio,
                preferences
            }
        }));
    }

    return profiles;
};
