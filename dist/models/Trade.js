"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tradeSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['spot', 'futures'],
        required: true,
    },
    market: {
        type: String,
        enum: ['crypto', 'stock', 'commodities'],
        default: 'crypto',
    },
    asset: {
        type: String,
        required: true,
    },
    side: {
        type: String,
        enum: ['buy', 'sell', 'long', 'short'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    leverage: {
        type: Number,
        default: 1,
    },
    entryPrice: {
        type: Number,
        required: true,
    },
    closePrice: {
        type: Number,
    },
    marginUsed: {
        type: Number,
        required: true,
    },
    liquidationPrice: {
        type: Number,
    },
    stopLoss: {
        type: Number,
    },
    takeProfit: {
        type: Number,
    },
    orderType: {
        type: String,
        enum: ['market', 'limit'],
        default: 'market',
    },
    limitPrice: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['pending', 'open', 'closed', 'liquidated'],
        default: 'open',
    },
    pnl: {
        type: Number,
        default: 0,
    },
    closedAt: {
        type: Date,
    },
    liquidatedAt: {
        type: Date,
    },
    liquidatedBy: {
        type: String,
        enum: ['system', 'admin'],
    },
    adminNote: String,
}, {
    timestamps: true,
});
const Trade = mongoose_1.default.model('Trade', tradeSchema);
exports.default = Trade;
