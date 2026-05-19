"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const deviceSessionSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    deviceType: {
        type: String,
        enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
        default: 'Unknown',
    },
    browser: {
        type: String,
        default: 'Unknown',
    },
    os: {
        type: String,
        default: 'Unknown',
    },
    ipAddress: {
        type: String,
        default: '',
    },
    location: {
        type: String,
        default: 'Unknown',
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Compound index for fast user-session lookups
deviceSessionSchema.index({ user: 1, isActive: 1 });
const DeviceSession = mongoose_1.default.model('DeviceSession', deviceSessionSchema);
exports.default = DeviceSession;
