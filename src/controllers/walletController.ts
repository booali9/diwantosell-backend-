import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import crypto from 'crypto';
import { createNowPayment, verifyNowPaymentsIPN } from '../services/nowpaymentsService';
import { createAuditLog } from '../utils/auditLog';
import { notifyDepositRequest, notifyWithdrawRequest } from '../services/telegramService';

// Master wallet addresses — all deposits route here (admin-controlled)
const MASTER_WALLETS: Record<string, string> = {
    USDT_TRC20: process.env.MASTER_WALLET_USDT_TRC20 || 'TYZJvtMf88tpWNXyRurKujo5n9RBSwZDcG',
    USDT_EVM: process.env.MASTER_WALLET_USDT_EVM || '0x43c39E195Ba15D4DF17cEB74dF9fb28E6e52fb1c', // ERC20/BEP20
    BTC: process.env.MASTER_WALLET_BTC || 'bc1quethj66kepvz64wqcykaq9mdq5syv2kdlt9x5r',
    ETH: process.env.MASTER_WALLET_ETH || '0x43c39E195Ba15D4DF17cEB74dF9fb28E6e52fb1c',
};
// Default fallback
const MASTER_WALLET_ADDRESS = MASTER_WALLETS.USDT_TRC20;

// Helper to get NowPayments ticker
const getTicker = (asset: string, network: string): string => {
    const a = asset.toUpperCase();
    const n = network.toLowerCase();

    if (a === 'USDT') {
        if (n === 'tron' || n === 'trc20') return 'usdttrc20';
        if (n === 'eth' || n === 'erc20') return 'usdterc20';
        if (n === 'bsc' || n === 'bep20') return 'usdtbsc';
        return 'usdttrc20'; // Default
    }
    if (a === 'BTC') return 'btc';
    if (a === 'ETH') return 'eth';

    return a.toLowerCase();
};

// @desc    Get user balance (spot + futures)
// @route   GET /api/wallet/balance
// @access  Private
export const getBalance = async (req: any, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ balance: user.balance, futuresBalance: user.futuresBalance || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Get master wallet address for deposits
// @route   GET /api/wallet/address
// @access  Private
export const getAddress = async (req: any, res: Response) => {
    try {
        const { asset, network } = req.query;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the master wallet address for the requested asset & network
        const requestedAsset = (asset as string || 'USDT').toUpperCase();
        const requestedNetwork = (network as string || '').toLowerCase();

        let address = '';

        if (requestedAsset === 'USDT') {
            if (requestedNetwork.includes('tron') || requestedNetwork.includes('trc20')) {
                address = MASTER_WALLETS.USDT_TRC20;
            } else {
                // Default to EVM address for BSC/ETH/ERC20/BEP20
                address = MASTER_WALLETS.USDT_EVM;
            }
        } else {
            address = MASTER_WALLETS[requestedAsset] || MASTER_WALLETS.USDT_TRC20;
        }

        res.json({ address });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Create a real crypto deposit via NowPayments
// @route   POST /api/wallet/create-deposit
// @access  Private
export const createDeposit = async (req: any, res: Response) => {
    try {
        const { amount, currency, network } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const asset = currency || 'USDT';
        const masterAddress = MASTER_WALLETS[asset.toUpperCase()] || MASTER_WALLET_ADDRESS;

        // Credit user balance immediately — no waiting for webhook
        user.balance += Number(amount);
        await user.save();

        // Create completed transaction record immediately
        const transaction = await Transaction.create({
            user: user._id,
            type: 'deposit',
            asset: asset,
            network: network || 'Tron (TRC20)',
            amount: Number(amount),
            status: 'completed',
            walletAddress: masterAddress,
            internalLogs: [{ message: 'Deposit credited immediately on initiation via NowPayments', timestamp: new Date() }],
        });

        // Telegram Notification
        notifyDepositRequest({ email: user.email, name: user.name }, Number(amount), `${asset} on ${network || 'Tron'} (NowPayments)`).catch(console.error);

        // Determine the URLs
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const callbackUrl = `${backendUrl}/api/wallet/webhook/nowpayments`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Create NowPayments invoice (hosted payment page with wallet/MetaMask support)
        const payment = await createNowPayment({
            amount: Number(amount),
            currency: getTicker(asset, network || 'tron'),
            orderId: transaction._id.toString(),
            callbackUrl,
            successUrl: `${frontendUrl}/dashboard/deposit?status=success`,
            cancelUrl: `${frontendUrl}/dashboard/deposit?status=cancel`,
        });

        // Update transaction with NowPayments details
        transaction.txHash = payment.id || payment.payment_id;
        if (payment.pay_address) {
            transaction.walletAddress = payment.pay_address;
        }
        transaction.internalLogs.push({
            message: `NowPayments invoice created: ${payment.id}. Balance already credited. URL: ${payment.invoice_url}`,
            timestamp: new Date(),
        });
        await transaction.save();

        res.json({
            message: 'Deposit payment created',
            paymentUrl: payment.invoice_url,
            paymentId: payment.id || payment.payment_id,
            payAddress: payment.pay_address,
            amount: payment.pay_amount || amount,
            currency: payment.pay_currency || getTicker(asset, network || 'tron'),
            transaction: {
                _id: transaction._id,
                status: transaction.status,
                amount: transaction.amount,
                walletAddress: transaction.walletAddress,
            },
        });
    } catch (error) {
        console.error('[Deposit] Create deposit error:', error);
        res.status(500).json({ message: 'Failed to create deposit', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    NowPayments IPN handler — credits user balance on confirmed payment
// @route   POST /api/wallet/webhook/nowpayments
// @access  Public (secured by signature verification)
export const nowpaymentsWebhook = async (req: any, res: Response) => {
    try {
        const body = req.body;
        const signature = req.headers['x-nowpayments-sig'] as string;

        console.log('[Webhook] NowPayments callback received:', JSON.stringify({
            payment_id: body.payment_id,
            payment_status: body.payment_status,
            order_id: body.order_id,
            actually_paid: body.actually_paid,
            hasSignature: !!signature,
        }));

        // In sandbox mode, skip strict signature verification (sandbox IPN signatures are unreliable)
        const isSandbox = process.env.NOWPAYMENTS_IS_SANDBOX === 'true';
        if (!isSandbox) {
            // Verify signature in production
            if (!signature || !verifyNowPaymentsIPN(body, signature)) {
                console.warn('[Webhook] Invalid NowPayments signature');
                return res.status(400).json({ message: 'Invalid signature' });
            }
        } else {
            // In sandbox, log but don't reject
            if (signature && !verifyNowPaymentsIPN(body, signature)) {
                console.warn('[Webhook] Sandbox: signature mismatch (proceeding anyway)');
            }
        }

        const { order_id, payment_status, payment_id, actually_paid } = body;

        // Process only finished or partially_paid statuses
        if (!['finished', 'partially_paid'].includes(payment_status)) {
            return res.json({ message: 'Status received, but not finished yet' });
        }

        // Require a real payment — never credit without proof of payment
        const rawActuallyPaid = Number(actually_paid);
        if (!rawActuallyPaid || rawActuallyPaid <= 0) {
            console.warn('[Webhook] actually_paid is 0 or missing — ignoring credit to prevent phantom deposits');
            return res.json({ message: 'No actual payment amount confirmed yet' });
        }

        // Find the pending transaction
        const transaction = await Transaction.findById(order_id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status === 'completed') {
            return res.json({ message: 'Already processed' });
        }

        const user = await User.findById(transaction.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Credit the original USD amount requested (not the crypto amount which may differ for BTC/ETH etc.)
        // Also accept NowPayments' price_amount if provided in the payload
        const priceAmount = Number(body.price_amount);
        const depositAmount = priceAmount > 0 ? priceAmount : transaction.amount;
        user.balance += depositAmount;
        await user.save();

        transaction.status = 'completed';
        transaction.amount = depositAmount;
        transaction.txHash = payment_id;
        transaction.internalLogs.push({
            message: `NowPayments confirmed payment. Status: ${payment_status}`,
            timestamp: new Date(),
        });
        await transaction.save();

        // Audit log
        await createAuditLog({
            action: 'deposit_credited',
            performedBy: 'system',
            performedByRole: 'webhook',
            targetUser: user._id.toString(),
            targetResource: transaction._id.toString(),
            details: { amount: depositAmount, payment_id, status: payment_status },
            ipAddress: req.ip,
        });

        res.json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('[Webhook] NowPayments error:', error);
        res.status(500).json({ message: 'Webhook error' });
    }
};

// @desc    Check deposit status (dummy for now, but signature matches Cryptomus if we implement checkNowPaymentStatus)
// @route   GET /api/wallet/deposit-status/:transactionId
// @access  Private
export const getDepositStatus = async (req: any, res: Response) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.transactionId,
            user: req.user._id,
            type: 'deposit',
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        res.json({
            _id: transaction._id,
            status: transaction.status,
            amount: transaction.amount,
            asset: transaction.asset,
            network: transaction.network,
            createdAt: transaction.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Direct deposit — user enters amount, creates PENDING record awaiting admin approval
// @route   POST /api/wallet/direct-deposit
// @access  Private
export const directDeposit = async (req: any, res: Response) => {
    try {
        const { amount, asset } = req.body;
        const num = Number(amount);
        if (!amount || isNaN(num) || num <= 0) {
            return res.status(400).json({ message: 'Please enter a valid amount' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Determine network from asset
        let network = 'Tron (TRC20)';
        if (asset === 'BTC') network = 'Bitcoin';
        else if (asset === 'ETH') network = 'Ethereum';

        // Determine expected wallet address
        const walletAddress = asset === 'BTC'
            ? MASTER_WALLETS.BTC
            : MASTER_WALLETS.USDT_TRC20;

        const ref = 'DW-' + user._id.toString().slice(-8).toUpperCase();

        // Create PENDING transaction — admin must approve to credit balance
        const transaction = await Transaction.create({
            user: user._id,
            type: 'deposit',
            asset: (asset || 'USDT').toUpperCase(),
            amount: num,
            status: 'pending',
            txHash: undefined,
            network,
            walletAddress,
            depositRef: ref,
            isVisible: true,
            internalLogs: [{ message: `Deposit submitted by user. Ref: ${ref}. Awaiting admin approval.`, timestamp: new Date() }],
        });

        // Telegram Notification
        notifyDepositRequest({ email: user.email, name: user.name }, num, `${(asset || 'USDT').toUpperCase()} on ${network}`).catch(console.error);

        res.json({
            message: 'Deposit submitted. Your balance will be credited after admin review.',
            transactionId: transaction._id,
            depositRef: ref,
            status: 'pending',
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Simulate deposit for testing (kept for dev/testing purposes)
// @route   POST /api/wallet/deposit-simulator
// @access  Private
export const simulateDeposit = async (req: any, res: Response) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: 'Deposit simulator disabled in production. Use real deposits.' });
        }

        const { amount, asset } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.balance += Number(amount);
        await user.save();

        const transaction = await Transaction.create({
            user: user._id,
            type: 'deposit',
            asset: asset || 'USDT',
            amount: Number(amount),
            status: 'completed',
            txHash: 'SIM_' + crypto.randomBytes(16).toString('hex'),
            network: 'Simulated',
            walletAddress: MASTER_WALLET_ADDRESS,
            internalLogs: [{ message: 'Simulated deposit (dev/testing)', timestamp: new Date() }],
        });

        res.json({
            message: 'Deposit simulated successfully',
            balance: user.balance,
            transaction
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Get user transactions
// @route   GET /api/wallet/transactions
// @access  Private
export const getTransactions = async (req: any, res: Response) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id, isVisible: true }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    User notifies admin of a manual deposit (creates pending record for admin to approve)
// @route   POST /api/wallet/deposit-notify
// @access  Private
export const notifyDeposit = async (req: any, res: Response) => {
    try {
        const { amount, asset, network, txHash, depositRef } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const depositAsset = (asset || 'USDT').toUpperCase();
        const depositNetwork = network || 'Tron (TRC20)';
        // Derive the ref from the user's _id if not provided
        const ref = depositRef || ('DW-' + user._id.toString().slice(-8).toUpperCase());

        // Derive the expected wallet address from the network
        let walletAddress = MASTER_WALLETS.USDT_TRC20;
        if (depositAsset === 'BTC') walletAddress = MASTER_WALLETS.BTC;
        else if (depositNetwork.toLowerCase().includes('trc20') || depositNetwork.toLowerCase().includes('tron')) walletAddress = MASTER_WALLETS.USDT_TRC20;
        else walletAddress = MASTER_WALLETS.USDT_EVM;

        // Create a PENDING transaction — admin must approve to credit balance
        const transaction = await Transaction.create({
            user: user._id,
            type: 'deposit',
            asset: depositAsset,
            network: depositNetwork,
            amount: Number(amount),
            status: 'pending',
            walletAddress,
            txHash: txHash || undefined,
            depositRef: ref,
            isVisible: true,
            internalLogs: [{ message: `Manual deposit notification. Ref: ${ref}. TxHash: ${txHash || 'not provided'}. Awaiting admin approval.`, timestamp: new Date() }],
        });

        await createAuditLog({
            action: 'DEPOSIT_NOTIFY',
            performedBy: user._id.toString(),
            details: { amount, depositAsset, depositNetwork, ref, txHash: txHash || 'N/A' },
            ipAddress: req.ip,
        });

        // Telegram Notification
        notifyDepositRequest({ email: user.email, name: user.name }, Number(amount), `${depositAsset} on ${depositNetwork}`).catch(console.error);

        res.json({
            message: 'Deposit notification submitted. Your balance will be credited after admin review.',
            transactionId: transaction._id,
            depositRef: ref,
            status: 'pending',
        });
    } catch (error) {
        console.error('[Deposit] Notify deposit error:', error);
        res.status(500).json({ message: 'Failed to submit deposit notification', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @route   POST /api/wallet/withdraw
// @access  Private
export const withdrawFunds = async (req: any, res: Response) => {
    try {
        const { amount, asset, network, address } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        if (!address) {
            return res.status(400).json({ message: 'Please provide a withdrawal address' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // KYC is optional — users can use all features without KYC

        if (user.balance < Number(amount)) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct balance immediately to prevent double-spend
        user.balance -= Number(amount);
        await user.save();

        // Create PENDING transaction — requires admin approval
        const transaction = await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            asset: asset || 'USDT',
            amount: Number(amount),
            status: 'pending',
            network: network || 'BNB Smart Chain (BEP20)',
            walletAddress: address,
            internalLogs: [{ message: 'Withdrawal request submitted by user', timestamp: new Date() }]
        });

        // Telegram Notification
        notifyWithdrawRequest({ email: user.email, name: user.name }, Number(amount), asset || 'USDT', address).catch(console.error);

        res.json({
            message: 'Withdrawal request submitted. Pending admin approval.',
            balance: user.balance,
            transaction
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Internal Spot ↔ Futures transfer — DB-authoritative, also records transaction history
// @route   POST /api/wallet/record-transfer
// @access  Private
export const recordInternalTransfer = async (req: any, res: Response) => {
    try {
        const { amount, fromAccount, toAccount, asset } = req.body;
        const num = Number(amount);
        if (!num || isNaN(num) || num <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const from = (fromAccount as string || '').toLowerCase();
        const to   = (toAccount   as string || '').toLowerCase();

        if (!['spot', 'futures'].includes(from) || !['spot', 'futures'].includes(to)) {
            return res.status(400).json({ message: 'fromAccount and toAccount must be "spot" or "futures"' });
        }
        if (from === to) {
            return res.status(400).json({ message: 'Source and destination cannot be the same' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (from === 'spot') {
            if (user.balance < num) {
                return res.status(400).json({ message: `Insufficient spot balance. Available: $${user.balance.toFixed(2)}` });
            }
            user.balance  = parseFloat((user.balance - num).toFixed(8));
            user.futuresBalance = parseFloat(((user.futuresBalance || 0) + num).toFixed(8));
        } else {
            if ((user.futuresBalance || 0) < num) {
                return res.status(400).json({ message: `Insufficient futures balance. Available: $${(user.futuresBalance || 0).toFixed(2)}` });
            }
            user.futuresBalance = parseFloat(((user.futuresBalance || 0) - num).toFixed(8));
            user.balance = parseFloat((user.balance + num).toFixed(8));
        }
        await user.save();

        const transaction = await Transaction.create({
            user: user._id,
            type: 'transfer',
            asset: (asset || 'USDT').toUpperCase(),
            amount: num,
            status: 'completed',
            network: `Internal (${from} → ${to})`,
            walletAddress: 'Internal',
            isVisible: true,
            internalLogs: [{ message: `Internal transfer: ${from} → ${to}, Amount: $${num}`, timestamp: new Date() }],
        });

        res.json({
            transaction,
            balance: user.balance,
            futuresBalance: user.futuresBalance || 0,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// @desc    Transfer funds between internal wallets (Simulated)
// @route   POST /api/wallet/transfer
// @access  Private
export const transferFunds = async (req: any, res: Response) => {
    try {
        const { recipientId, amount, asset, network } = req.body;

        if (!recipientId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Please provide a valid recipient and amount' });
        }

        const sender = await User.findById(req.user._id);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }

        // Network Handling Logic
        const selectedNetwork = network || 'Internal Ledger';
        const senderDefaultNetwork = (sender as any).defaultNetwork || 'Internal Ledger';

        if (selectedNetwork !== 'Internal Ledger' && selectedNetwork !== senderDefaultNetwork) {
            return res.status(200).json({
                status: 'cross_network_required',
                message: 'Different network detected. Cross-chain transfer required.',
                details: {
                    selectedNetwork,
                    senderNetwork: senderDefaultNetwork,
                    estimatedGasFee: '0.8 USDT'
                }
            });
        }

        // For simulation purposes, 'recipientId' can be User ID, Email, or Wallet Address
        const receiver = await User.findOne({
            $or: [
                { _id: isValidObjectId(recipientId) ? recipientId : null },
                { email: recipientId },
                { walletAddress: recipientId }
            ]
        });

        if (!receiver) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        if (receiver._id.toString() === sender._id.toString()) {
            return res.status(400).json({ message: 'Cannot transfer to yourself' });
        }

        if (sender.balance < Number(amount)) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // BEGIN SIMULATED TRANSACTION
        // Debit sender
        sender.balance -= Number(amount);
        await sender.save();

        // Credit receiver
        receiver.balance += Number(amount);
        await receiver.save();

        // Create transaction record for sender
        const transaction = await Transaction.create({
            user: sender._id,
            receiver: receiver._id,
            type: 'transfer',
            asset: asset || 'USDT',
            amount: Number(amount),
            status: 'completed',
            network: selectedNetwork,
            walletAddress: receiver.walletAddress || 'Internal Ledger',
            internalLogs: [{ message: `Transfer of ${amount} ${asset} to ${receiver.email} completed`, timestamp: new Date() }]
        });

        // Audit logs (optional but recommended for fintech simulations)
        await createAuditLog({
            action: 'transfer_completed',
            performedBy: sender._id.toString(),
            targetUser: receiver._id.toString(),
            targetResource: transaction._id.toString(),
            details: { amount, asset, network: selectedNetwork },
            ipAddress: req.ip,
        });

        res.json({
            message: 'Transfer completed successfully',
            balance: sender.balance,
            transaction
        });
    } catch (error) {
        console.error('[Transfer] Error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// Helper to check for valid mongoose ObjectId
const isValidObjectId = (id: string) => {
    return mongoose.Types.ObjectId.isValid(id);
};

import mongoose from 'mongoose';
