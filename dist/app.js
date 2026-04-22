"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const tradeRoutes_1 = __importDefault(require("./routes/tradeRoutes"));
const stakingRoutes_1 = __importDefault(require("./routes/stakingRoutes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*',
    credentials: false
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '5mb' }));
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to DiwanFinance API' });
});
// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbState = mongoose_1.default.connection.readyState;
        const dbStatusMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        const dbStatus = dbStatusMap[dbState] || 'unknown';
        // Try a simple database operation
        const adminCount = await mongoose_1.default.connection.db?.collection('admins').countDocuments() || 0;
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                adminCount: adminCount
            },
            environment: process.env.NODE_ENV || 'development'
        });
    }
    catch (error) {
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
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/trades', tradeRoutes_1.default);
app.use('/api/staking', stakingRoutes_1.default);
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
