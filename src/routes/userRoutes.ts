import express from 'express';
import {
    registerUser,
    authUser,
    updateUserProfile,
    getUserProfile,
    clerkAuth,
    verifyOTP,
    resendOTP,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    submitKYC,
    getKYCStatus,
    getUserNotifications,
    markNotificationRead,
    getUnreadNotificationCount,
    changePassword,
    changeEmail,
    deleteAccount,
} from '../controllers/userController';
import { protectUser } from '../middleware/userAuthMiddleware';

const router = express.Router();

// Auth
router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/clerk-auth', clerkAuth);

// OTP Verification
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Password Reset
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Profile
router.route('/profile')
    .get(protectUser, getUserProfile)
    .put(protectUser, updateUserProfile);

// Security
router.put('/change-password', protectUser, changePassword);
router.put('/change-email', protectUser, changeEmail);
router.delete('/account', protectUser, deleteAccount);

// KYC
router.post('/kyc', protectUser, submitKYC);
router.get('/kyc-status', protectUser, getKYCStatus);

// Notifications
router.get('/notifications/unread-count', protectUser, getUnreadNotificationCount);
router.get('/notifications', protectUser, getUserNotifications);
router.put('/notifications/:id/read', protectUser, markNotificationRead);

export default router;
