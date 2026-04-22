import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    {
        timestamps: true,
    }
);

const Trade = mongoose.model('Trade', tradeSchema);

export default Trade;
