import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import connectDB from './config/db';
import { startLiquidationWorker } from './utils/liquidationWorker';

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    startLiquidationWorker();
});

// Export for Vercel serverless
export default app;
