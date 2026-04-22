"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const adminUserAuthController_1 = require("../controllers/adminUserAuthController");
const adminWalletController_1 = require("../controllers/adminWalletController");
const adminAcademyController_1 = require("../controllers/adminAcademyController");
const adminNotificationController_1 = require("../controllers/adminNotificationController");
const adminSettingsController_1 = require("../controllers/adminSettingsController");
const adminRolesController_1 = require("../controllers/adminRolesController");
const adminCampaignController_1 = require("../controllers/adminCampaignController");
const tradeController_1 = require("../controllers/tradeController");
const stakingController_1 = require("../controllers/stakingController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = express_1.default.Router();
router.post('/login', adminController_1.authAdmin);
router.route('/profile').get(adminAuthMiddleware_1.protectAdmin, adminController_1.getAdminProfile).put(adminAuthMiddleware_1.protectAdmin, adminController_1.updateAdminProfile);
router.get('/dashboard', adminAuthMiddleware_1.protectAdmin, adminController_1.getDashboardStats);
// User Management
router.get('/users', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.getUsers);
router.get('/users/:id', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.getUserById);
router.put('/users/:id/status', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.updateUserStatus);
router.post('/users/:id/adjust-balance', adminAuthMiddleware_1.protectAdmin, adminWalletController_1.adjustBalance);
router.post('/users/:id/wallet-transfer', adminAuthMiddleware_1.protectAdmin, adminWalletController_1.adminWalletTransfer);
router.post('/users/:id/impersonate', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.impersonateUser);
// KYC Management
router.get('/kyc', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.getKycSubmissions);
router.put('/kyc/:id', adminAuthMiddleware_1.protectAdmin, adminUserAuthController_1.verifyKyc);
// Wallet/Transaction Management
router.get('/transactions', adminAuthMiddleware_1.protectAdmin, adminWalletController_1.getTransactions);
router.put('/transactions/:id/withdrawal', adminAuthMiddleware_1.protectAdmin, adminWalletController_1.manageWithdrawal);
router.put('/transactions/:id/deposit', adminAuthMiddleware_1.protectAdmin, adminWalletController_1.manageDeposit);
// Academy Management
router.get('/academy/stats', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.getAcademyStats);
router.get('/academy/engagement', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.getAcademyEngagement);
router.get('/academy/lessons', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.getLessons);
router.get('/academy/lessons/:id', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.getLessonById);
router.post('/academy/lessons', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.createLesson);
router.put('/academy/lessons/:id', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.updateLesson);
router.delete('/academy/lessons/:id', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.deleteLesson);
router.put('/academy/lessons/:id/publish', adminAuthMiddleware_1.protectAdmin, adminAcademyController_1.publishLesson);
// Notification Management
router.get('/notifications/stats', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.getNotificationStats);
router.get('/notifications', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.getNotifications);
router.get('/notifications/:id', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.getNotificationById);
router.post('/notifications', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.createNotification);
router.put('/notifications/:id', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.updateNotification);
router.delete('/notifications/:id', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.deleteNotification);
router.put('/notifications/:id/send', adminAuthMiddleware_1.protectAdmin, adminNotificationController_1.sendNotification);
// System Settings
router.get('/settings', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.getSystemSettings);
router.put('/settings', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateSystemSettings);
router.put('/settings/general', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateGeneralSettings);
router.put('/settings/fees', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateTransactionFees);
router.put('/settings/limits', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateTransactionLimits);
router.put('/settings/notifications', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateNotificationSettings);
router.put('/settings/compliance', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateComplianceSettings);
router.put('/settings/customization', adminAuthMiddleware_1.protectAdmin, adminSettingsController_1.updateCustomizationSettings);
// Roles & Permissions
router.get('/roles/stats', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.getAdminStats);
router.get('/roles/available', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.getAvailableRoles);
router.get('/roles/admins', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.getAdmins);
router.get('/roles/admins/:id', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.getAdminById);
router.post('/roles/admins', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.createAdmin);
router.put('/roles/admins/:id', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.updateAdmin);
router.delete('/roles/admins/:id', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.deleteAdmin);
router.put('/roles/admins/:id/toggle-status', adminAuthMiddleware_1.protectAdmin, adminRolesController_1.toggleAdminStatus);
// Campaign Management
router.get('/campaigns/stats', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.getCampaignStats);
router.get('/campaigns', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.getCampaigns);
router.get('/campaigns/:id', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.getCampaignById);
router.post('/campaigns', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.createCampaign);
router.put('/campaigns/:id', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.updateCampaign);
router.delete('/campaigns/:id', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.deleteCampaign);
router.put('/campaigns/:id/toggle', adminAuthMiddleware_1.protectAdmin, adminCampaignController_1.toggleCampaignStatus);
// Trade Management
router.get('/trades', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminGetAllTrades);
router.put('/trades/:id/entry-price', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminModifyEntryPrice);
router.post('/trades/open-for-user', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminOpenTradeForUser);
router.post('/trades/:id/close', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminCloseTrade);
router.post('/trades/cleanup-sells', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminCleanupStaleSells);
// Liquidation Management
router.get('/liquidations/stats', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminGetLiquidationStats);
router.get('/liquidations/at-risk', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminGetAtRiskTrades);
router.get('/liquidations', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminGetLiquidations);
router.post('/liquidations/:id/liquidate', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminManualLiquidate);
router.put('/liquidations/:id/adjust', adminAuthMiddleware_1.protectAdmin, tradeController_1.adminAdjustLiquidationPrice);
// Staking Management
router.get('/staking', adminAuthMiddleware_1.protectAdmin, stakingController_1.adminGetAllStakes);
router.put('/staking/apy', adminAuthMiddleware_1.protectAdmin, stakingController_1.adminUpdateAPY);
router.post('/staking/:id/force-unstake', adminAuthMiddleware_1.protectAdmin, stakingController_1.adminForceUnstake);
// Audit Logs
router.get('/audit-logs', adminAuthMiddleware_1.protectAdmin, adminController_1.getAuditLogs);
exports.default = router;
