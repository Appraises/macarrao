import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    console.error('Please set JWT_SECRET in your .env file.');
    process.exit(1);
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(o => o.trim());

export { JWT_SECRET, CORS_ORIGINS };
