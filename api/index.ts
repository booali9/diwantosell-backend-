import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { errorHandler, notFound } from '../src/middleware/errorMiddleware';
import adminRoutes from '../src/routes/adminRoutes';
import userRoutes from '../src/routes/userRoutes';
import walletRoutes from '../src/routes/walletRoutes';
import tradeRoutes from '../src/routes/tradeRoutes';
import stakingRoutes from '../src/routes/stakingRoutes';

const app = express();

// Database connection caching for serverless
let cachedDb: typeof mongoose | null = null;

async function connectDB() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || '', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        cachedDb = conn;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// DB connection middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', message: (error as Error).message });
    }
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to DiwanFinance API' });
});

app.get('/api/health', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStatusMap: { [key: number]: string } = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        const dbStatus = dbStatusMap[dbState] || 'unknown';

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: { status: dbStatus },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: (error as Error).message
        });
    }
});

app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/staking', stakingRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
