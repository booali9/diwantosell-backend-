"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const systemSettingsSchema = new mongoose_1.default.Schema({
    // General Settings
    defaultCurrency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'YEN'],
    },
    defaultLanguage: {
        type: String,
        default: 'English',
        enum: ['English', 'French', 'German', 'Polish', 'Spanish', 'Swedish'],
    },
    dateFormat: {
        type: String,
        default: '12h',
        enum: ['12h', '24h'],
    },
    // System Configurations
    networkSettings: {
        type: String,
        default: 'RPC provider',
    },
    dataRefreshInterval: {
        type: String,
        default: '30 mins',
        enum: ['1 min', '5 mins', '15 mins', '30 mins', '1 hour'],
    },
    // Transaction Fees
    depositFee: {
        type: Number,
        default: 10,
    },
    withdrawalFee: {
        type: Number,
        default: 10,
    },
    // Transaction Limits
    dailyLimit: {
        type: Number,
        default: 10000,
    },
    weeklyLimit: {
        type: Number,
        default: 50000,
    },
    minWithdrawal: {
        type: Number,
        default: 10,
    },
    maxWithdrawal: {
        type: Number,
        default: 100000,
    },
    liquidityAlert: {
        type: String,
        default: 'Hot wallet > 1 BTC',
    },
    // User Settings
    userWalletCreation: {
        type: Boolean,
        default: true,
    },
    // Notification Settings
    transactionAlert: {
        type: Boolean,
        default: true,
    },
    priceAlert: {
        type: Boolean,
        default: true,
    },
    securityAlert: {
        type: Boolean,
        default: true,
    },
    systemUpdate: {
        type: Boolean,
        default: true,
    },
    // Compliance & Security
    require2FA: {
        type: Boolean,
        default: true,
    },
    transactionMonitoring: {
        type: String,
        default: 'Flags amount above $5000',
    },
    dailyTransactionLimit: {
        type: Number,
        default: 10000,
    },
    // KYC Settings
    requiredDocuments: [{
            type: String,
            enum: ['passport', 'id-card', 'national-passport', 'drivers-license'],
        }],
    verificationLevel: {
        type: String,
        default: 'advanced',
        enum: ['basic', 'intermediate', 'advanced'],
    },
    // Customization
    supportedCurrencies: [{
            code: String,
            enabled: Boolean,
        }],
    supportedLanguages: [{
            code: String,
            name: String,
            enabled: Boolean,
        }],
    homepageWidgets: [{
            name: String,
            enabled: Boolean,
        }],
    // Logo settings
    lightModeLogo: String, // URL or base64
    darkModeLogo: String, // URL or base64
    // Staking Settings
    stakingAPY: {
        flexible: { type: Number, default: 5 },
        locked30: { type: Number, default: 8 },
        locked60: { type: Number, default: 12 },
        locked90: { type: Number, default: 18 },
    },
    lastUpdatedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Admin',
    },
}, {
    timestamps: true,
});
// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};
const SystemSettings = mongoose_1.default.model('SystemSettings', systemSettingsSchema);
exports.default = SystemSettings;
