import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings';

// Helper function to safely set lastUpdatedBy
const setLastUpdatedBy = (settings: any, admin: any) => {
    if (admin?._id && admin._id !== 'temp_admin_id') {
        settings.lastUpdatedBy = admin._id;
    }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private
export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Fetching system settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        console.log('[DEBUG] System settings retrieved successfully');

        res.json(settings);
    } catch (error) {
        console.error('[ERROR] Get system settings error:', error);
        res.status(500).json({ 
            message: 'Server error getting system settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private
export const updateSystemSettings = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating system settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        // Update settings with provided data
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                (settings as any)[key] = req.body[key];
            }
        });

        // Handle both ObjectId and string admin IDs
        setLastUpdatedBy(settings, req.admin);
        await settings.save();

        const updatedSettings = await SystemSettings.findById(settings._id)
            .populate('lastUpdatedBy', 'name email');

        console.log('[DEBUG] System settings updated successfully');

        res.json(updatedSettings);
    } catch (error) {
        console.error('[ERROR] Update system settings error:', error);
        res.status(500).json({ 
            message: 'Server error updating system settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update general settings
// @route   PUT /api/admin/settings/general
// @access  Private
export const updateGeneralSettings = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating general settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { defaultCurrency, defaultLanguage, dateFormat } = req.body;

        if (defaultCurrency) settings.defaultCurrency = defaultCurrency;
        if (defaultLanguage) settings.defaultLanguage = defaultLanguage;
        if (dateFormat) settings.dateFormat = dateFormat;

        setLastUpdatedBy(settings, req.admin);
        await settings.save();

        console.log('[DEBUG] General settings updated successfully');

        res.json({
            defaultCurrency: settings.defaultCurrency,
            defaultLanguage: settings.defaultLanguage,
            dateFormat: settings.dateFormat,
        });
    } catch (error) {
        console.error('[ERROR] Update general settings error:', error);
        res.status(500).json({ 
            message: 'Server error updating general settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update transaction fees
// @route   PUT /api/admin/settings/fees
// @access  Private
export const updateTransactionFees = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating transaction fees...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { depositFee, withdrawalFee } = req.body;

        if (depositFee !== undefined) settings.depositFee = depositFee;
        if (withdrawalFee !== undefined) settings.withdrawalFee = withdrawalFee;

        setLastUpdatedBy(settings, req.admin);
        await settings.save();

        console.log('[DEBUG] Transaction fees updated successfully');

        res.json({
            depositFee: settings.depositFee,
            withdrawalFee: settings.withdrawalFee,
        });
    } catch (error) {
        console.error('[ERROR] Update transaction fees error:', error);
        res.status(500).json({ 
            message: 'Server error updating transaction fees',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update transaction limits
// @route   PUT /api/admin/settings/limits
// @access  Private
export const updateTransactionLimits = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating transaction limits...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { 
            dailyLimit, 
            weeklyLimit, 
            minWithdrawal, 
            maxWithdrawal, 
            liquidityAlert 
        } = req.body;

        if (dailyLimit !== undefined) settings.dailyLimit = dailyLimit;
        if (weeklyLimit !== undefined) settings.weeklyLimit = weeklyLimit;
        if (minWithdrawal !== undefined) settings.minWithdrawal = minWithdrawal;
        if (maxWithdrawal !== undefined) settings.maxWithdrawal = maxWithdrawal;
        if (liquidityAlert) settings.liquidityAlert = liquidityAlert;

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
    } catch (error) {
        console.error('[ERROR] Update transaction limits error:', error);
        res.status(500).json({ 
            message: 'Server error updating transaction limits',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update notification settings
// @route   PUT /api/admin/settings/notifications
// @access  Private
export const updateNotificationSettings = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating notification settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { 
            transactionAlert, 
            priceAlert, 
            securityAlert, 
            systemUpdate 
        } = req.body;

        if (transactionAlert !== undefined) settings.transactionAlert = transactionAlert;
        if (priceAlert !== undefined) settings.priceAlert = priceAlert;
        if (securityAlert !== undefined) settings.securityAlert = securityAlert;
        if (systemUpdate !== undefined) settings.systemUpdate = systemUpdate;

        setLastUpdatedBy(settings, req.admin);
        await settings.save();

        console.log('[DEBUG] Notification settings updated successfully');

        res.json({
            transactionAlert: settings.transactionAlert,
            priceAlert: settings.priceAlert,
            securityAlert: settings.securityAlert,
            systemUpdate: settings.systemUpdate,
        });
    } catch (error) {
        console.error('[ERROR] Update notification settings error:', error);
        res.status(500).json({ 
            message: 'Server error updating notification settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update compliance settings
// @route   PUT /api/admin/settings/compliance
// @access  Private
export const updateComplianceSettings = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating compliance settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { 
            require2FA, 
            transactionMonitoring, 
            dailyTransactionLimit,
            requiredDocuments,
            verificationLevel
        } = req.body;

        if (require2FA !== undefined) settings.require2FA = require2FA;
        if (transactionMonitoring) settings.transactionMonitoring = transactionMonitoring;
        if (dailyTransactionLimit !== undefined) settings.dailyTransactionLimit = dailyTransactionLimit;
        if (requiredDocuments) settings.requiredDocuments = requiredDocuments;
        if (verificationLevel) settings.verificationLevel = verificationLevel;

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
    } catch (error) {
        console.error('[ERROR] Update compliance settings error:', error);
        res.status(500).json({ 
            message: 'Server error updating compliance settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update customization settings
// @route   PUT /api/admin/settings/customization
// @access  Private
export const updateCustomizationSettings = async (req: any, res: Response) => {
    try {
        console.log('[DEBUG] Updating customization settings...');

        const settings = await (SystemSettings as any).getSettings();
        
        const { 
            supportedCurrencies,
            supportedLanguages,
            homepageWidgets,
            lightModeLogo,
            darkModeLogo
        } = req.body;

        if (supportedCurrencies) settings.supportedCurrencies = supportedCurrencies;
        if (supportedLanguages) settings.supportedLanguages = supportedLanguages;
        if (homepageWidgets) settings.homepageWidgets = homepageWidgets;
        if (lightModeLogo) settings.lightModeLogo = lightModeLogo;
        if (darkModeLogo) settings.darkModeLogo = darkModeLogo;

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
    } catch (error) {
        console.error('[ERROR] Update customization settings error:', error);
        res.status(500).json({ 
            message: 'Server error updating customization settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};