import express from 'express';
import { getBalance, getAddress, createDeposit, notifyDeposit, nowpaymentsWebhook, getDepositStatus, simulateDeposit, directDeposit, getTransactions, withdrawFunds, transferFunds, recordInternalTransfer } from '../controllers/walletController';
import { protectUser } from '../middleware/userAuthMiddleware';
import { checkNowPaymentsStatus } from '../services/nowpaymentsService';

const router = express.Router();

// NowPayments diagnostic — check sandbox/production config (dev only)
router.get('/nowpayments-status', async (_req, res) => {
    try {
        const status = await checkNowPaymentsStatus();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/balance', protectUser, getBalance);
router.get('/address', protectUser, getAddress);
router.get('/transactions', protectUser, getTransactions);

// Real deposit via NowPayments (legacy)
router.post('/create-deposit', protectUser, createDeposit);
router.get('/deposit-status/:transactionId', protectUser, getDepositStatus);

// Manual deposit notification (user sends txhash for admin approval)
router.post('/deposit-notify', protectUser, notifyDeposit);

// Direct deposit — enter amount, balance credited immediately
router.post('/direct-deposit', protectUser, directDeposit);

// NowPayments webhook (public — secured by signature verification)
router.post('/webhook/nowpayments', nowpaymentsWebhook);

// Simulator (dev/testing only)
router.post('/deposit-simulator', protectUser, simulateDeposit);

// Withdrawal request
router.post('/withdraw', protectUser, withdrawFunds);

// Transfer funds (simulated)
router.post('/transfer', protectUser, transferFunds);

// Record internal Spot ↔ Futures transfer for history/audit
router.post('/record-transfer', protectUser, recordInternalTransfer);

export default router;
