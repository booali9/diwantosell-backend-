"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const nowpaymentsService_1 = require("../services/nowpaymentsService");
const router = express_1.default.Router();
// NowPayments diagnostic — check sandbox/production config (dev only)
router.get('/nowpayments-status', async (_req, res) => {
    try {
        const status = await (0, nowpaymentsService_1.checkNowPaymentsStatus)();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/balance', userAuthMiddleware_1.protectUser, walletController_1.getBalance);
router.get('/address', userAuthMiddleware_1.protectUser, walletController_1.getAddress);
router.get('/transactions', userAuthMiddleware_1.protectUser, walletController_1.getTransactions);
// Real deposit via NowPayments (legacy)
router.post('/create-deposit', userAuthMiddleware_1.protectUser, walletController_1.createDeposit);
router.get('/deposit-status/:transactionId', userAuthMiddleware_1.protectUser, walletController_1.getDepositStatus);
// Manual deposit notification (user sends txhash for admin approval)
router.post('/deposit-notify', userAuthMiddleware_1.protectUser, walletController_1.notifyDeposit);
// Direct deposit — enter amount, balance credited immediately
router.post('/direct-deposit', userAuthMiddleware_1.protectUser, walletController_1.directDeposit);
// NowPayments webhook (public — secured by signature verification)
router.post('/webhook/nowpayments', walletController_1.nowpaymentsWebhook);
// Simulator (dev/testing only)
router.post('/deposit-simulator', userAuthMiddleware_1.protectUser, walletController_1.simulateDeposit);
// Withdrawal request
router.post('/withdraw', userAuthMiddleware_1.protectUser, walletController_1.withdrawFunds);
// Transfer funds (simulated)
router.post('/transfer', userAuthMiddleware_1.protectUser, walletController_1.transferFunds);
// Record internal Spot ↔ Futures transfer for history/audit
router.post('/record-transfer', userAuthMiddleware_1.protectUser, walletController_1.recordInternalTransfer);
exports.default = router;
