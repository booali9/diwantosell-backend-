import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import walletRoutes from './routes/walletRoutes';
import tradeRoutes from './routes/tradeRoutes';
import stakingRoutes from './routes/stakingRoutes';


const app = express();

app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to DiwanFinance API' });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbState = mongoose.connection.readyState;
        const dbStatusMap: { [key: number]: string } = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        const dbStatus = dbStatusMap[dbState] || 'unknown';

        // Try a simple database operation
        const adminCount = await mongoose.connection.db?.collection('admins').countDocuments() || 0;

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                adminCount: adminCount
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            database: {
                status: 'error'
            }
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
