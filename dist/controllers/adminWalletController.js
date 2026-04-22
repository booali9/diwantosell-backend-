"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminWalletTransfer = exports.adjustBalance = exports.manageDeposit = exports.manageWithdrawal = exports.getTransactions = void 0;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const auditLog_1 = require("../utils/auditLog");
// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
const getTransactions = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching transactions from database...');
        const transactions = await Transaction_1.default.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        console.log(`[DEBUG] Found ${transactions.length} transactions`);
        res.json(transactions);
    }
    catch (error) {
        console.error('[ERROR] Get transactions error:', error);
        // Only return error response for actual database connection issues
        if (error instanceof Error && (error.message.includes('buffering timed out') ||
            error.message.includes('ETIMEOUT') ||
            error.message.includes('connection') ||
            error.message.includes('ENOTFOUND'))) {
            console.log('[DEBUG] Database connection issue detected');
            res.json({
                transactions: [],
                error: 'Database connection issue - showing empty data'
            });
        }
        else {
            // For other errors, return 500 status
            res.status(500).json({
                message: 'Server error getting transactions',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getTransactions = getTransactions;
// @desc    Manage withdrawal (Approve/Reject)
// @route   PUT /api/admin/transactions/:id/withdrawal
// @access  Private/Admin
const manageWithdrawal = async (req, res) => {
    try {
        const transaction = await Transaction_1.default.findById(req.params.id);
        if (!transaction || transaction.type !== 'withdrawal') {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: `Cannot modify withdrawal — already ${transaction.status}` });
        }
        const newStatus = req.body.status;
        if (!newStatus || !['completed', 'rejected'].includes(newStatus)) {
            return res.status(400).json({ message: 'Status must be "completed" or "rejected"' });
        }
        // If rejected, refund user balance (balance was deducted when request was submitted)
        if (newStatus === 'rejected') {
            const user = await User_1.default.findById(transaction.user);
            if (user) {
                user.balance += transaction.amount;
                await user.save();
            }
            transaction.internalLogs = transaction.internalLogs || [];
            transaction.internalLogs.push({ message: 'Withdrawal rejected by admin — balance refunded', timestamp: new Date() });
        }
        else {
            // Approved
            transaction.internalLogs = transaction.internalLogs || [];
            transaction.internalLogs.push({ message: 'Withdrawal approved by admin', timestamp: new Date() });
        }
        transaction.status = newStatus;
        transaction.adminNote = req.body.adminNote || transaction.adminNote;
        const updatedTransaction = await transaction.save();
        // Audit log
        await (0, auditLog_1.createAuditLog)({
            action: newStatus === 'completed' ? 'withdrawal_approved' : 'withdrawal_rejected',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: transaction.user?.toString(),
            targetResource: transaction._id?.toString(),
            details: {
                amount: transaction.amount,
                status: newStatus,
                adminNote: req.body.adminNote,
            },
            ipAddress: req.ip,
        });
        res.json(updatedTransaction);
    }
    catch (error) {
        res.status(500).json({
            message: 'Server error managing withdrawal',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.manageWithdrawal = manageWithdrawal;
// @desc    Manually approve or reject a pending deposit (credits/discards user balance)
// @route   PUT /api/admin/transactions/:id/deposit
// @access  Private/Admin
const manageDeposit = async (req, res) => {
    try {
        const transaction = await Transaction_1.default.findById(req.params.id);
        if (!transaction || transaction.type !== 'deposit') {
            return res.status(404).json({ message: 'Deposit not found' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: `Cannot modify deposit — already ${transaction.status}` });
        }
        const newStatus = req.body.status;
        if (!newStatus || !['completed', 'rejected'].includes(newStatus)) {
            return res.status(400).json({ message: 'Status must be "completed" or "rejected"' });
        }
        const user = await User_1.default.findById(transaction.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (newStatus === 'completed') {
            // Credit the deposit amount to user balance
            user.balance += transaction.amount;
            await user.save();
            transaction.internalLogs = transaction.internalLogs || [];
            transaction.internalLogs.push({ message: `Deposit approved and credited by admin. Amount: ${transaction.amount} ${transaction.asset}`, timestamp: new Date() });
        }
        else {
            // Rejected — just mark it, no balance change needed (was never debited)
            transaction.internalLogs = transaction.internalLogs || [];
            transaction.internalLogs.push({ message: 'Deposit rejected by admin', timestamp: new Date() });
        }
        transaction.status = newStatus;
        transaction.adminNote = req.body.adminNote || transaction.adminNote;
        const updatedTransaction = await transaction.save();
        // Audit log
        await (0, auditLog_1.createAuditLog)({
            action: newStatus === 'completed' ? 'deposit_approved' : 'deposit_rejected',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: transaction.user?.toString(),
            targetResource: transaction._id?.toString(),
            details: {
                amount: transaction.amount,
                status: newStatus,
                adminNote: req.body.adminNote,
            },
            ipAddress: req.ip,
        });
        res.json(updatedTransaction);
    }
    catch (error) {
        res.status(500).json({
            message: 'Server error managing deposit',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.manageDeposit = manageDeposit;
// @desc    Manual balance adjustment
// @route   POST /api/admin/users/:id/adjust-balance
// @access  Private/Admin
const adjustBalance = async (req, res) => {
    try {
        console.log(`[DEBUG] Adjusting balance for user ID: ${req.params.id}`);
        const { amount, type, asset, adminNote, isVisible } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (user) {
            const adjustAmount = Number(amount);
            if (isNaN(adjustAmount) || adjustAmount <= 0) {
                return res.status(400).json({ message: 'Amount must be a positive number' });
            }
            if (type === 'add') {
                user.balance += adjustAmount;
            }
            else if (type === 'remove') {
                if (user.balance < adjustAmount) {
                    return res.status(400).json({ message: `Insufficient balance. User has $${user.balance}` });
                }
                user.balance -= adjustAmount;
            }
            else {
                return res.status(400).json({ message: 'Type must be "add" or "remove"' });
            }
            await user.save();
            const transaction = await Transaction_1.default.create({
                user: user._id,
                type: type === 'remove' ? 'withdrawal' : 'adjustment',
                asset: asset || 'USD',
                amount: adjustAmount,
                status: 'completed',
                adminNote: adminNote || `Balance ${type === 'add' ? 'added' : 'removed'} by admin`,
                isVisible: isVisible !== undefined ? isVisible : true,
            });
            // Audit log
            await (0, auditLog_1.createAuditLog)({
                action: 'balance_adjusted',
                performedBy: req.admin?._id?.toString() || 'unknown',
                performedByRole: 'admin',
                targetUser: user._id?.toString(),
                targetResource: transaction._id?.toString(),
                details: {
                    amount: Number(amount),
                    type,
                    asset: asset || 'USD',
                    newBalance: user.balance,
                    adminNote,
                },
                ipAddress: req.ip,
            });
            res.json({ user, transaction });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Adjust balance error:', error);
        res.status(500).json({
            message: 'Server error adjusting balance',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.adjustBalance = adjustBalance;
// @desc    Admin: Transfer funds between a user's spot and futures wallets
// @route   POST /api/admin/users/:id/wallet-transfer
// @access  Private/Admin
const adminWalletTransfer = async (req, res) => {
    try {
        const { from, to, amount, adminNote } = req.body;
        const num = Number(amount);
        if (isNaN(num) || num <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }
        if (!['spot', 'futures'].includes(from) || !['spot', 'futures'].includes(to)) {
            return res.status(400).json({ message: 'from/to must be "spot" or "futures"' });
        }
        if (from === to) {
            return res.status(400).json({ message: 'Source and destination must be different' });
        }
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (from === 'spot') {
            if (user.balance < num) {
                return res.status(400).json({ message: `Insufficient spot balance. Available: $${user.balance.toFixed(2)}` });
            }
            user.balance = parseFloat((user.balance - num).toFixed(8));
            user.futuresBalance = parseFloat(((user.futuresBalance || 0) + num).toFixed(8));
        }
        else {
            if ((user.futuresBalance || 0) < num) {
                return res.status(400).json({ message: `Insufficient futures balance. Available: $${(user.futuresBalance || 0).toFixed(2)}` });
            }
            user.futuresBalance = parseFloat(((user.futuresBalance || 0) - num).toFixed(8));
            user.balance = parseFloat((user.balance + num).toFixed(8));
        }
        await user.save();
        const transaction = await Transaction_1.default.create({
            user: user._id,
            type: 'transfer',
            asset: 'USDT',
            amount: num,
            status: 'completed',
            network: `Admin Transfer (${from} → ${to})`,
            walletAddress: 'Internal',
            isVisible: true,
            internalLogs: [{ message: adminNote || `Admin transferred $${num} from ${from} to ${to}`, timestamp: new Date() }],
        });
        await (0, auditLog_1.createAuditLog)({
            action: 'admin_wallet_transfer',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: user._id?.toString(),
            targetResource: transaction._id?.toString(),
            details: { from, to, amount: num, newSpotBalance: user.balance, newFuturesBalance: user.futuresBalance || 0, adminNote },
            ipAddress: req.ip,
        });
        res.json({
            message: `Successfully transferred $${num} from ${from} to ${to}`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                futuresBalance: user.futuresBalance || 0,
            },
            transaction,
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Server error transferring wallet funds',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.adminWalletTransfer = adminWalletTransfer;
