"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomizationSettings = exports.updateComplianceSettings = exports.updateNotificationSettings = exports.updateTransactionLimits = exports.updateTransactionFees = exports.updateGeneralSettings = exports.updateSystemSettings = exports.getSystemSettings = void 0;
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
// Helper function to safely set lastUpdatedBy
const setLastUpdatedBy = (settings, admin) => {
    if (admin?._id && admin._id !== 'temp_admin_id') {
        settings.lastUpdatedBy = admin._id;
    }
};
// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private
const getSystemSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Fetching system settings...');
        const settings = await SystemSettings_1.default.getSettings();
        console.log('[DEBUG] System settings retrieved successfully');
        res.json(settings);
    }
    catch (error) {
        console.error('[ERROR] Get system settings error:', error);
        res.status(500).json({
            message: 'Server error getting system settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSystemSettings = getSystemSettings;
// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private
const updateSystemSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Updating system settings...');
        const settings = await SystemSettings_1.default.getSettings();
        // Update settings with provided data
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                settings[key] = req.body[key];
            }
        });
        // Handle both ObjectId and string admin IDs
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        const updatedSettings = await SystemSettings_1.default.findById(settings._id)
            .populate('lastUpdatedBy', 'name email');
        console.log('[DEBUG] System settings updated successfully');
        res.json(updatedSettings);
    }
    catch (error) {
        console.error('[ERROR] Update system settings error:', error);
        res.status(500).json({
            message: 'Server error updating system settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateSystemSettings = updateSystemSettings;
// @desc    Update general settings
// @route   PUT /api/admin/settings/general
// @access  Private
const updateGeneralSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Updating general settings...');
        const settings = await SystemSettings_1.default.getSettings();
        const { defaultCurrency, defaultLanguage, dateFormat } = req.body;
        if (defaultCurrency)
            settings.defaultCurrency = defaultCurrency;
        if (defaultLanguage)
            settings.defaultLanguage = defaultLanguage;
        if (dateFormat)
            settings.dateFormat = dateFormat;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] General settings updated successfully');
        res.json({
            defaultCurrency: settings.defaultCurrency,
            defaultLanguage: settings.defaultLanguage,
            dateFormat: settings.dateFormat,
        });
    }
    catch (error) {
        console.error('[ERROR] Update general settings error:', error);
        res.status(500).json({
            message: 'Server error updating general settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateGeneralSettings = updateGeneralSettings;
// @desc    Update transaction fees
// @route   PUT /api/admin/settings/fees
// @access  Private
const updateTransactionFees = async (req, res) => {
    try {
        console.log('[DEBUG] Updating transaction fees...');
        const settings = await SystemSettings_1.default.getSettings();
        const { depositFee, withdrawalFee } = req.body;
        if (depositFee !== undefined)
            settings.depositFee = depositFee;
        if (withdrawalFee !== undefined)
            settings.withdrawalFee = withdrawalFee;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] Transaction fees updated successfully');
        res.json({
            depositFee: settings.depositFee,
            withdrawalFee: settings.withdrawalFee,
        });
    }
    catch (error) {
        console.error('[ERROR] Update transaction fees error:', error);
        res.status(500).json({
            message: 'Server error updating transaction fees',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateTransactionFees = updateTransactionFees;
// @desc    Update transaction limits
// @route   PUT /api/admin/settings/limits
// @access  Private
const updateTransactionLimits = async (req, res) => {
    try {
        console.log('[DEBUG] Updating transaction limits...');
        const settings = await SystemSettings_1.default.getSettings();
        const { dailyLimit, weeklyLimit, minWithdrawal, maxWithdrawal, liquidityAlert } = req.body;
        if (dailyLimit !== undefined)
            settings.dailyLimit = dailyLimit;
        if (weeklyLimit !== undefined)
            settings.weeklyLimit = weeklyLimit;
        if (minWithdrawal !== undefined)
            settings.minWithdrawal = minWithdrawal;
        if (maxWithdrawal !== undefined)
            settings.maxWithdrawal = maxWithdrawal;
        if (liquidityAlert)
            settings.liquidityAlert = liquidityAlert;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] Transaction limits updated successfully');
        res.json({
            dailyLimit: settings.dailyLimit,
            weeklyLimit: settings.weeklyLimit,
            minWithdrawal: settings.minWithdrawal,
            maxWithdrawal: settings.maxWithdrawal,
            liquidityAlert: settings.liquidityAlert,
        });
    }
    catch (error) {
        console.error('[ERROR] Update transaction limits error:', error);
        res.status(500).json({
            message: 'Server error updating transaction limits',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateTransactionLimits = updateTransactionLimits;
// @desc    Update notification settings
// @route   PUT /api/admin/settings/notifications
// @access  Private
const updateNotificationSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Updating notification settings...');
        const settings = await SystemSettings_1.default.getSettings();
        const { transactionAlert, priceAlert, securityAlert, systemUpdate } = req.body;
        if (transactionAlert !== undefined)
            settings.transactionAlert = transactionAlert;
        if (priceAlert !== undefined)
            settings.priceAlert = priceAlert;
        if (securityAlert !== undefined)
            settings.securityAlert = securityAlert;
        if (systemUpdate !== undefined)
            settings.systemUpdate = systemUpdate;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] Notification settings updated successfully');
        res.json({
            transactionAlert: settings.transactionAlert,
            priceAlert: settings.priceAlert,
            securityAlert: settings.securityAlert,
            systemUpdate: settings.systemUpdate,
        });
    }
    catch (error) {
        console.error('[ERROR] Update notification settings error:', error);
        res.status(500).json({
            message: 'Server error updating notification settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateNotificationSettings = updateNotificationSettings;
// @desc    Update compliance settings
// @route   PUT /api/admin/settings/compliance
// @access  Private
const updateComplianceSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Updating compliance settings...');
        const settings = await SystemSettings_1.default.getSettings();
        const { require2FA, transactionMonitoring, dailyTransactionLimit, requiredDocuments, verificationLevel } = req.body;
        if (require2FA !== undefined)
            settings.require2FA = require2FA;
        if (transactionMonitoring)
            settings.transactionMonitoring = transactionMonitoring;
        if (dailyTransactionLimit !== undefined)
            settings.dailyTransactionLimit = dailyTransactionLimit;
        if (requiredDocuments)
            settings.requiredDocuments = requiredDocuments;
        if (verificationLevel)
            settings.verificationLevel = verificationLevel;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] Compliance settings updated successfully');
        res.json({
            require2FA: settings.require2FA,
            transactionMonitoring: settings.transactionMonitoring,
            dailyTransactionLimit: settings.dailyTransactionLimit,
            requiredDocuments: settings.requiredDocuments,
            verificationLevel: settings.verificationLevel,
        });
    }
    catch (error) {
        console.error('[ERROR] Update compliance settings error:', error);
        res.status(500).json({
            message: 'Server error updating compliance settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateComplianceSettings = updateComplianceSettings;
// @desc    Update customization settings
// @route   PUT /api/admin/settings/customization
// @access  Private
const updateCustomizationSettings = async (req, res) => {
    try {
        console.log('[DEBUG] Updating customization settings...');
        const settings = await SystemSettings_1.default.getSettings();
        const { supportedCurrencies, supportedLanguages, homepageWidgets, lightModeLogo, darkModeLogo } = req.body;
        if (supportedCurrencies)
            settings.supportedCurrencies = supportedCurrencies;
        if (supportedLanguages)
            settings.supportedLanguages = supportedLanguages;
        if (homepageWidgets)
            settings.homepageWidgets = homepageWidgets;
        if (lightModeLogo)
            settings.lightModeLogo = lightModeLogo;
        if (darkModeLogo)
            settings.darkModeLogo = darkModeLogo;
        setLastUpdatedBy(settings, req.admin);
        await settings.save();
        console.log('[DEBUG] Customization settings updated successfully');
        res.json({
            supportedCurrencies: settings.supportedCurrencies,
            supportedLanguages: settings.supportedLanguages,
            homepageWidgets: settings.homepageWidgets,
            lightModeLogo: settings.lightModeLogo,
            darkModeLogo: settings.darkModeLogo,
        });
    }
    catch (error) {
        console.error('[ERROR] Update customization settings error:', error);
        res.status(500).json({
            message: 'Server error updating customization settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateCustomizationSettings = updateCustomizationSettings;
