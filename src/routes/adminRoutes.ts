import express from 'express';
import {
    authAdmin,
    getAdminProfile,
    updateAdminProfile,
    getDashboardStats,
    getAuditLogs,
} from '../controllers/adminController';
import {
    getUsers,
    getUserById,
    updateUserStatus,
    getKycSubmissions,
    verifyKyc,
    impersonateUser,
} from '../controllers/adminUserAuthController';
import {
    getTransactions,
    manageWithdrawal,
    manageDeposit,
    adjustBalance,
    adminWalletTransfer,
} from '../controllers/adminWalletController';
import {
    getLessons,
    getLessonById,
    createLesson,
    updateLesson,
    deleteLesson,
    publishLesson,
    getAcademyStats,
    getAcademyEngagement,
} from '../controllers/adminAcademyController';
import {
    getNotifications,
    getNotificationById,
    createNotification,
    updateNotification,
    deleteNotification,
    sendNotification,
    getNotificationStats,
} from '../controllers/adminNotificationController';
import {
    getSystemSettings,
    updateSystemSettings,
    updateGeneralSettings,
    updateTransactionFees,
    updateTransactionLimits,
    updateNotificationSettings,
    updateComplianceSettings,
    updateCustomizationSettings,
} from '../controllers/adminSettingsController';
import {
    getAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    getAdminStats,
    getAvailableRoles,
} from '../controllers/adminRolesController';
import {
    getCampaigns,
    getCampaignById,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaignStatus,
    getCampaignStats,
} from '../controllers/adminCampaignController';
import {
    adminModifyEntryPrice,
    adminGetAllTrades,
    adminOpenTradeForUser,
    adminCloseTrade,
    adminGetLiquidationStats,
    adminGetLiquidations,
    adminGetAtRiskTrades,
    adminManualLiquidate,
    adminAdjustLiquidationPrice,
    adminCleanupStaleSells,
} from '../controllers/tradeController';
import {
    adminGetAllStakes,
    adminUpdateAPY,
    adminForceUnstake,
} from '../controllers/stakingController';
import { protectAdmin } from '../middleware/adminAuthMiddleware';

const router = express.Router();

router.post('/login', authAdmin);
router.route('/profile').get(protectAdmin, getAdminProfile).put(protectAdmin, updateAdminProfile);
router.get('/dashboard', protectAdmin, getDashboardStats);

// User Management
router.get('/users', protectAdmin, getUsers);
router.get('/users/:id', protectAdmin, getUserById);
router.put('/users/:id/status', protectAdmin, updateUserStatus);
router.post('/users/:id/adjust-balance', protectAdmin, adjustBalance);
router.post('/users/:id/wallet-transfer', protectAdmin, adminWalletTransfer);
router.post('/users/:id/impersonate', protectAdmin, impersonateUser);

// KYC Management
router.get('/kyc', protectAdmin, getKycSubmissions);
router.put('/kyc/:id', protectAdmin, verifyKyc);

// Wallet/Transaction Management
router.get('/transactions', protectAdmin, getTransactions);
router.put('/transactions/:id/withdrawal', protectAdmin, manageWithdrawal);
router.put('/transactions/:id/deposit', protectAdmin, manageDeposit);

// Academy Management
router.get('/academy/stats', protectAdmin, getAcademyStats);
router.get('/academy/engagement', protectAdmin, getAcademyEngagement);
router.get('/academy/lessons', protectAdmin, getLessons);
router.get('/academy/lessons/:id', protectAdmin, getLessonById);
router.post('/academy/lessons', protectAdmin, createLesson);
router.put('/academy/lessons/:id', protectAdmin, updateLesson);
router.delete('/academy/lessons/:id', protectAdmin, deleteLesson);
router.put('/academy/lessons/:id/publish', protectAdmin, publishLesson);

// Notification Management
router.get('/notifications/stats', protectAdmin, getNotificationStats);
router.get('/notifications', protectAdmin, getNotifications);
router.get('/notifications/:id', protectAdmin, getNotificationById);
router.post('/notifications', protectAdmin, createNotification);
router.put('/notifications/:id', protectAdmin, updateNotification);
router.delete('/notifications/:id', protectAdmin, deleteNotification);
router.put('/notifications/:id/send', protectAdmin, sendNotification);

// System Settings
router.get('/settings', protectAdmin, getSystemSettings);
router.put('/settings', protectAdmin, updateSystemSettings);
router.put('/settings/general', protectAdmin, updateGeneralSettings);
router.put('/settings/fees', protectAdmin, updateTransactionFees);
router.put('/settings/limits', protectAdmin, updateTransactionLimits);
router.put('/settings/notifications', protectAdmin, updateNotificationSettings);
router.put('/settings/compliance', protectAdmin, updateComplianceSettings);
router.put('/settings/customization', protectAdmin, updateCustomizationSettings);

// Roles & Permissions
router.get('/roles/stats', protectAdmin, getAdminStats);
router.get('/roles/available', protectAdmin, getAvailableRoles);
router.get('/roles/admins', protectAdmin, getAdmins);
router.get('/roles/admins/:id', protectAdmin, getAdminById);
router.post('/roles/admins', protectAdmin, createAdmin);
router.put('/roles/admins/:id', protectAdmin, updateAdmin);
router.delete('/roles/admins/:id', protectAdmin, deleteAdmin);
router.put('/roles/admins/:id/toggle-status', protectAdmin, toggleAdminStatus);

// Campaign Management
router.get('/campaigns/stats', protectAdmin, getCampaignStats);
router.get('/campaigns', protectAdmin, getCampaigns);
router.get('/campaigns/:id', protectAdmin, getCampaignById);
router.post('/campaigns', protectAdmin, createCampaign);
router.put('/campaigns/:id', protectAdmin, updateCampaign);
router.delete('/campaigns/:id', protectAdmin, deleteCampaign);
router.put('/campaigns/:id/toggle', protectAdmin, toggleCampaignStatus);

// Trade Management
router.get('/trades', protectAdmin, adminGetAllTrades);
router.put('/trades/:id/entry-price', protectAdmin, adminModifyEntryPrice);
router.post('/trades/open-for-user', protectAdmin, adminOpenTradeForUser);
router.post('/trades/:id/close', protectAdmin, adminCloseTrade);
router.post('/trades/cleanup-sells', protectAdmin, adminCleanupStaleSells);

// Liquidation Management
router.get('/liquidations/stats', protectAdmin, adminGetLiquidationStats);
router.get('/liquidations/at-risk', protectAdmin, adminGetAtRiskTrades);
router.get('/liquidations', protectAdmin, adminGetLiquidations);
router.post('/liquidations/:id/liquidate', protectAdmin, adminManualLiquidate);
router.put('/liquidations/:id/adjust', protectAdmin, adminAdjustLiquidationPrice);

// Staking Management
router.get('/staking', protectAdmin, adminGetAllStakes);
router.put('/staking/apy', protectAdmin, adminUpdateAPY);
router.post('/staking/:id/force-unstake', protectAdmin, adminForceUnstake);

// Audit Logs
router.get('/audit-logs', protectAdmin, getAuditLogs);

export default router;
