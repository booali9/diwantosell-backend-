"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const router = express_1.default.Router();
// Auth
router.post('/register', userController_1.registerUser);
router.post('/login', userController_1.authUser);
router.post('/clerk-auth', userController_1.clerkAuth);
// OTP Verification
router.post('/verify-otp', userController_1.verifyOTP);
router.post('/resend-otp', userController_1.resendOTP);
// Password Reset
router.post('/forgot-password', userController_1.forgotPassword);
router.post('/verify-reset-otp', userController_1.verifyResetOTP);
router.post('/reset-password', userController_1.resetPassword);
// Profile
router.route('/profile')
    .get(userAuthMiddleware_1.protectUser, userController_1.getUserProfile)
    .put(userAuthMiddleware_1.protectUser, userController_1.updateUserProfile);
// Security
router.put('/change-password', userAuthMiddleware_1.protectUser, userController_1.changePassword);
router.put('/change-email', userAuthMiddleware_1.protectUser, userController_1.changeEmail);
router.delete('/account', userAuthMiddleware_1.protectUser, userController_1.deleteAccount);
// KYC
router.post('/kyc', userAuthMiddleware_1.protectUser, userController_1.submitKYC);
router.get('/kyc-status', userAuthMiddleware_1.protectUser, userController_1.getKYCStatus);
// Notifications
router.get('/notifications/unread-count', userAuthMiddleware_1.protectUser, userController_1.getUnreadNotificationCount);
router.get('/notifications', userAuthMiddleware_1.protectUser, userController_1.getUserNotifications);
router.put('/notifications/:id/read', userAuthMiddleware_1.protectUser, userController_1.markNotificationRead);
exports.default = router;
