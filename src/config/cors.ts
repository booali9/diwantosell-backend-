import type { CorsOptions } from 'cors';

const productionOrigins = new Set([
    'https://bicoin.app',
    'https://www.bicoin.app',
    'https://bicoinweb.vercel.app',
    'https://www.bicoinweb.vercel.app',
    'https://Bicoinweb.vercel.app',
]);

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export const corsOptions: CorsOptions = {
    // allow all origins; with `credentials: true` use `origin: true`
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
};