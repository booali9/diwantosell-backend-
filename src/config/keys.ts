import dotenv from 'dotenv';

// Ensure dotenv is configured before accessing process.env
dotenv.config();

console.log('[DEBUG] Loading JWT Secret from keys.ts');

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_key_12345';
export const MASTER_KEY = process.env.MASTER_KEY || '';

if (process.env.JWT_SECRET) {
    console.log('[DEBUG] JWT_SECRET found in environment variables');
} else {
    console.warn('[WARN] JWT_SECRET not found in .env, using fallback');
}
