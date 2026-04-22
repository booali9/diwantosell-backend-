"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const auditLogSchema = new mongoose_1.default.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'deposit_credited',
            'deposit_webhook_received',
            'deposit_webhook_invalid',
            'withdrawal_approved',
            'withdrawal_rejected',
            'balance_adjusted',
            'trade_opened_by_admin',
            'trade_closed_by_admin',
            'trade_entry_modified',
            'staking_apy_changed',
            'force_unstake',
            'kyc_approved',
            'kyc_rejected',
            'user_status_changed',
            'admin_login',
            'system_settings_changed',
        ],
    },
    performedBy: {
        type: String, // admin ID or 'system'
        required: true,
    },
    performedByRole: {
        type: String,
        enum: ['admin', 'system', 'webhook'],
        default: 'admin',
    },
    targetUser: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
    },
    targetResource: {
        type: String, // e.g., trade ID, transaction ID, etc.
    },
    details: {
        type: mongoose_1.default.Schema.Types.Mixed, // Flexible JSON for action-specific data
    },
    ipAddress: String,
}, {
    timestamps: true,
});
// Index for fast lookups
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
const AuditLog = mongoose_1.default.model('AuditLog', auditLogSchema);
exports.default = AuditLog;
