"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['system', 'transaction', 'security', 'marketing', 'announcement'],
    },
    targetAudience: {
        type: String,
        required: true,
        enum: ['all', 'verified', 'unverified', 'active', 'inactive', 'deposit', 'withdrawal'],
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sent', 'failed'],
        default: 'draft',
    },
    scheduledAt: Date,
    sentAt: Date,
    recipients: [{
            user: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User',
            },
            status: {
                type: String,
                enum: ['pending', 'delivered', 'failed', 'read'],
                default: 'pending',
            },
            deliveredAt: Date,
            readAt: Date,
        }],
    totalRecipients: {
        type: Number,
        default: 0,
    },
    deliveredCount: {
        type: Number,
        default: 0,
    },
    failedCount: {
        type: Number,
        default: 0,
    },
    readCount: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    channels: [{
            type: String,
            enum: ['email', 'sms', 'push', 'in-app'],
        }],
}, {
    timestamps: true,
});
const Notification = mongoose_1.default.model('Notification', notificationSchema);
exports.default = Notification;
