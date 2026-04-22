"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const transactionSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'adjustment', 'reward', 'trade_liquidation', 'transfer'],
        required: true,
    },
    receiver: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    asset: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected', 'failed'],
        default: 'pending',
    },
    txHash: String,
    network: String,
    walletAddress: String,
    adminNote: String,
    depositRef: String,
    isVisible: {
        type: Boolean,
        default: true,
    },
    internalLogs: [
        {
            message: String,
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
}, {
    timestamps: true,
});
const Transaction = mongoose_1.default.model('Transaction', transactionSchema);
exports.default = Transaction;
