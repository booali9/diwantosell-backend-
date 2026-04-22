"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tradeController_1 = require("../controllers/tradeController");
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const router = express_1.default.Router();
// Public: live market prices
router.get('/prices', tradeController_1.getMarketPrices);
router.get('/market-data', tradeController_1.getDetailedMarketPrices);
// Internal: cron-safe liquidation runner (protected by CRON_SECRET header)
router.post('/run-liquidations', tradeController_1.runLiquidations);
router.route('/')
    .get(userAuthMiddleware_1.protectUser, tradeController_1.getMyOpenTrades)
    .post(userAuthMiddleware_1.protectUser, tradeController_1.openTrade);
router.post('/:id/close', userAuthMiddleware_1.protectUser, tradeController_1.closeTrade);
exports.default = router;
