"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.impersonateUser = exports.verifyKyc = exports.getKycSubmissions = exports.updateUserStatus = exports.getUserById = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const KYC_1 = __importDefault(require("../models/KYC"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const auditLog_1 = require("../utils/auditLog");
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching users from database...');
        const users = await User_1.default.find({}).sort({ createdAt: -1 });
        console.log(`[DEBUG] Found ${users.length} users`);
        res.json(users);
    }
    catch (error) {
        console.error('[ERROR] Get users error:', error);
        // Only return error response for actual database connection issues
        if (error instanceof Error && (error.message.includes('buffering timed out') ||
            error.message.includes('ETIMEOUT') ||
            error.message.includes('connection') ||
            error.message.includes('ENOTFOUND'))) {
            console.log('[DEBUG] Database connection issue detected');
            res.json({
                users: [],
                error: 'Database connection issue - showing empty data'
            });
        }
        else {
            // For other errors, return 500 status
            res.status(500).json({
                message: 'Server error getting users',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getUsers = getUsers;
// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching user by ID: ${req.params.id}`);
        const user = await User_1.default.findById(req.params.id);
        if (user) {
            res.json(user);
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Get user by ID error:', error);
        res.status(500).json({
            message: 'Server error getting user',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserById = getUserById;
// @desc    Update user status (Freeze/Unfreeze)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        console.log(`[DEBUG] Updating user status for ID: ${req.params.id}`);
        const user = await User_1.default.findById(req.params.id);
        if (user) {
            user.isFrozen = req.body.isFrozen ?? user.isFrozen;
            const updatedUser = await user.save();
            res.json(updatedUser);
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Update user status error:', error);
        res.status(500).json({
            message: 'Server error updating user status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateUserStatus = updateUserStatus;
// @desc    Get all KYC submissions
// @route   GET /api/admin/kyc
// @access  Private/Admin
const getKycSubmissions = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching KYC submissions from database...');
        const submissions = await KYC_1.default.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        console.log(`[DEBUG] Found ${submissions.length} KYC submissions`);
        res.json(submissions);
    }
    catch (error) {
        console.error('[ERROR] Get KYC submissions error:', error);
        // Only return error response for actual database connection issues
        if (error instanceof Error && (error.message.includes('buffering timed out') ||
            error.message.includes('ETIMEOUT') ||
            error.message.includes('connection') ||
            error.message.includes('ENOTFOUND'))) {
            console.log('[DEBUG] Database connection issue detected');
            res.json({
                submissions: [],
                error: 'Database connection issue - showing empty data'
            });
        }
        else {
            // For other errors, return 500 status
            res.status(500).json({
                message: 'Server error getting KYC submissions',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getKycSubmissions = getKycSubmissions;
// @desc    Approve/Reject KYC
// @route   PUT /api/admin/kyc/:id
// @access  Private/Admin
const verifyKyc = async (req, res) => {
    try {
        console.log(`[DEBUG] Verifying KYC for ID: ${req.params.id}`);
        const kyc = await KYC_1.default.findById(req.params.id);
        if (kyc) {
            kyc.status = req.body.status || kyc.status;
            kyc.adminComment = req.body.adminComment || kyc.adminComment;
            const updatedKyc = await kyc.save();
            // Update user's KYC status as well
            const user = await User_1.default.findById(kyc.user);
            if (user) {
                user.kycStatus = kyc.status === 'verified' ? 'verified' : (kyc.status === 'rejected' ? 'rejected' : user.kycStatus);
                await user.save();
            }
            res.json(updatedKyc);
        }
        else {
            res.status(404).json({ message: 'KYC submission not found' });
        }
    }
    catch (error) {
        console.error('[ERROR] Verify KYC error:', error);
        res.status(500).json({
            message: 'Server error verifying KYC',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.verifyKyc = verifyKyc;
// @desc    Admin: Generate a login token for any user (master-key access — no OTP required)
// @route   POST /api/admin/users/:id/impersonate
// @access  Private/Admin
const impersonateUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Generate a standard user JWT — same token the normal login endpoint issues.
        // This lets the admin panel open the user app logged in as this user without
        // sending any verification code to the user's email.
        const token = (0, generateToken_1.default)(user._id.toString());
        // Impersonation MUST always be logged for security audit purposes.
        await (0, auditLog_1.createAuditLog)({
            action: 'admin_impersonated_user',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: user._id?.toString(),
            details: { targetEmail: user.email, targetName: user.name },
            ipAddress: req.ip,
        });
        res.json({
            message: `Access token generated for ${user.email}`,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                futuresBalance: user.futuresBalance || 0,
                kycStatus: user.kycStatus,
                isEmailVerified: user.isEmailVerified,
            },
        });
    }
    catch (error) {
        console.error('[ERROR] Impersonate user error:', error);
        res.status(500).json({
            message: 'Server error generating impersonation token',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.impersonateUser = impersonateUser;
