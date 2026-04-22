"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.getDashboardStats = exports.updateAdminProfile = exports.getAdminProfile = exports.authAdmin = void 0;
const Admin_1 = __importDefault(require("../models/Admin"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const KYC_1 = __importDefault(require("../models/KYC"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
const authAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        console.log('[DEBUG] Login attempt for:', email);
        // Temporary bypass for testing - remove this in production
        if (email === 'admin@diwanfinance.com' && password === 'admin@123') {
            console.log('[DEBUG] Using temporary bypass login');
            const mockToken = (0, generateToken_1.default)('temp_admin_id');
            return res.json({
                _id: 'temp_admin_id',
                name: 'Super Admin',
                email: 'admin@diwanfinance.com',
                role: 'superadmin',
                token: mockToken,
            });
        }
        const admin = await Admin_1.default.findOne({ email });
        if (!admin) {
            console.log('[DEBUG] Admin not found for email:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isPasswordMatch = await admin.matchPassword(password);
        if (!isPasswordMatch) {
            console.log('[DEBUG] Password mismatch for email:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = (0, generateToken_1.default)(admin._id.toString());
        console.log('[DEBUG] Login successful for:', email);
        console.log('[DEBUG] Generated token:', token.substring(0, 50) + '...');
        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            token: token,
        });
    }
    catch (error) {
        console.error('[ERROR] Login error:', error);
        // If it's a MongoDB timeout error and we have the test credentials, use bypass
        if (error instanceof Error && error.message.includes('buffering timed out')) {
            const { email, password } = req.body;
            if (email === 'admin@diwanfinance.com' && password === 'admin@123') {
                console.log('[DEBUG] MongoDB timeout - using bypass login');
                const mockToken = (0, generateToken_1.default)('temp_admin_id');
                return res.json({
                    _id: 'temp_admin_id',
                    name: 'Super Admin',
                    email: 'admin@diwanfinance.com',
                    role: 'superadmin',
                    token: mockToken,
                });
            }
        }
        res.status(500).json({
            message: 'Server error during login',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.authAdmin = authAdmin;
// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
const getAdminProfile = async (req, res) => {
    try {
        // Handle temporary bypass user
        if (req.admin._id === 'temp_admin_id') {
            return res.json({
                _id: 'temp_admin_id',
                name: 'Super Admin',
                email: 'admin@diwanfinance.com',
                role: 'superadmin',
            });
        }
        const admin = await Admin_1.default.findById(req.admin._id);
        if (admin) {
            res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            });
        }
        else {
            res.status(404).json({ message: 'Admin not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Get profile error:', error);
        res.status(500).json({
            message: 'Server error getting profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAdminProfile = getAdminProfile;
// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
const updateAdminProfile = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.admin._id);
        if (admin) {
            admin.name = req.body.name || admin.name;
            admin.email = req.body.email || admin.email;
            if (req.body.password) {
                admin.password = req.body.password;
            }
            const updatedAdmin = await admin.save();
            res.json({
                _id: updatedAdmin._id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                role: updatedAdmin.role,
                token: (0, generateToken_1.default)(updatedAdmin._id.toString()),
            });
        }
        else {
            res.status(404).json({ message: 'Admin not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Update profile error:', error);
        res.status(500).json({
            message: 'Server error updating profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateAdminProfile = updateAdminProfile;
// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching dashboard stats from database...');
        // Get total users count
        const totalUsers = await User_1.default.countDocuments();
        console.log('[DEBUG] Total users:', totalUsers);
        // Get active users (users who logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = await User_1.default.countDocuments({
            lastLogin: { $gte: thirtyDaysAgo }
        });
        // Get KYC stats
        const pendingKyc = await KYC_1.default.countDocuments({ status: 'pending' });
        const verifiedKyc = await KYC_1.default.countDocuments({ status: 'verified' });
        const rejectedKyc = await KYC_1.default.countDocuments({ status: 'rejected' });
        // Get transaction stats
        const completedDeposits = await Transaction_1.default.aggregate([
            { $match: { type: 'deposit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        const completedWithdrawals = await Transaction_1.default.aggregate([
            { $match: { type: 'withdrawal', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        // Get pending transactions
        const pendingTransactions = await Transaction_1.default.countDocuments({ status: 'pending' });
        // Calculate total deposits and withdrawals
        const totalDeposits = completedDeposits.length > 0 ? completedDeposits[0].total : 0;
        const totalWithdrawals = completedWithdrawals.length > 0 ? completedWithdrawals[0].total : 0;
        // Get recent transactions for the chart/activity
        const recentTransactions = await Transaction_1.default.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('type amount status createdAt user asset');
        // Calculate transaction volume (last 30 days)
        const transactionVolume = await Transaction_1.default.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const volume30Days = transactionVolume.length > 0 ? transactionVolume[0].total : 0;
        // Get daily transaction data for chart (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dailyTransactions = await Transaction_1.default.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        console.log('[DEBUG] Dashboard stats calculated successfully');
        res.json({
            totalUsers,
            activeUsers,
            totalDeposits,
            totalWithdrawals,
            pendingKyc,
            verifiedKyc,
            rejectedKyc,
            pendingTransactions,
            transactionVolume: volume30Days,
            recentTransactions,
            dailyTransactions,
            operationalQueues: [
                {
                    name: 'Pending KYC',
                    count: pendingKyc,
                    priority: 'high'
                },
                {
                    name: 'Pending Withdrawals',
                    count: await Transaction_1.default.countDocuments({ type: 'withdrawal', status: 'pending' }),
                    priority: 'medium'
                },
                {
                    name: 'Failed Transactions',
                    count: await Transaction_1.default.countDocuments({ status: 'failed' }),
                    priority: 'low'
                }
            ]
        });
    }
    catch (error) {
        console.error('[ERROR] Dashboard stats error:', error);
        // Only return error response for actual database connection issues
        if (error instanceof Error && (error.message.includes('buffering timed out') ||
            error.message.includes('ETIMEOUT') ||
            error.message.includes('connection') ||
            error.message.includes('ENOTFOUND'))) {
            console.log('[DEBUG] Database connection issue detected - using fallback data');
            res.json({
                totalUsers: 0,
                activeUsers: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
                pendingKyc: 0,
                verifiedKyc: 0,
                rejectedKyc: 0,
                pendingTransactions: 0,
                transactionVolume: 0,
                recentTransactions: [],
                dailyTransactions: [],
                operationalQueues: [],
                error: 'Database connection issue - showing empty data'
            });
        }
        else {
            // For other errors, return 500 status
            res.status(500).json({
                message: 'Server error getting dashboard stats',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getDashboardStats = getDashboardStats;
// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const action = req.query.action;
        const performedBy = req.query.performedBy;
        const targetUser = req.query.targetUser;
        const filter = {};
        if (action)
            filter.action = action;
        if (performedBy)
            filter.performedBy = performedBy;
        if (targetUser)
            filter.targetUser = targetUser;
        const total = await AuditLog_1.default.countDocuments(filter);
        const logs = await AuditLog_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        res.json({
            logs,
            page,
            pages: Math.ceil(total / limit),
            total,
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Server error fetching audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
