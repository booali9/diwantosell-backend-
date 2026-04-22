import express from 'express';
import { openTrade, getMyOpenTrades, closeTrade, getMarketPrices, getDetailedMarketPrices, runLiquidations } from '../controllers/tradeController';
import { protectUser } from '../middleware/userAuthMiddleware';

const router = express.Router();

// Public: live market prices
router.get('/prices', getMarketPrices);
router.get('/market-data', getDetailedMarketPrices);

// Internal: cron-safe liquidation runner (protected by CRON_SECRET header)
router.post('/run-liquidations', runLiquidations);

router.route('/')
    .get(protectUser, getMyOpenTrades)
    .post(protectUser, openTrade);

router.post('/:id/close', protectUser, closeTrade);

export default router;
