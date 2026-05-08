"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const p2pAdSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    crypto: { type: String, required: true, default: 'USDT' },
    fiat: { type: String, required: true, default: 'USD' },
    priceType: { type: String, enum: ['fixed', 'floating'], default: 'fixed' },
    fixedPrice: { type: Number },
    floatingMargin: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    filledAmount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, required: true },
    maxOrderAmount: { type: Number, required: true },
    paymentMethods: [{ type: String }],
    autoReply: { type: String, default: '' },
    terms: { type: String, default: '' },
    paymentTimeLimit: { type: Number, default: 15 }, // minutes
    status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
    completedTrades: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    avgReleaseTime: { type: Number, default: 5 }, // minutes
    isOnline: { type: Boolean, default: true },
}, { timestamps: true });
p2pAdSchema.virtual('availableAmount').get(function () {
    return this.totalAmount - this.filledAmount;
});
p2pAdSchema.set('toJSON', { virtuals: true });
p2pAdSchema.set('toObject', { virtuals: true });
const P2PAd = mongoose_1.default.model('P2PAd', p2pAdSchema);
exports.default = P2PAd;
