import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import connectDB from './config/db';
import { startLiquidationWorker } from './utils/liquidationWorker';

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

console.log(`[DEBUG] Attempting to listen on port ${PORT}...`);
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    startLiquidationWorker();
});

// Export for Vercel serverless
export default app;
