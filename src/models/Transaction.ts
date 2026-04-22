import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['deposit', 'withdrawal', 'adjustment', 'reward', 'trade_liquidation', 'transfer'],
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    {
        timestamps: true,
    }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
