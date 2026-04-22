import mongoose, { Schema, Document } from 'mongoose';

export interface IStaking extends Document {
    user: mongoose.Types.ObjectId;
    asset: string;
    amount: number;
    apy: number;
    duration: number; // in days
    startDate: Date;
    endDate: Date;
    status: 'active' | 'completed' | 'withdrawn';
    accruedRewards: number;
    autoCompound: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StakingSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    asset: { type: String, required: true, default: 'USDT' },
    amount: { type: Number, required: true },
    apy: { type: Number, required: true }, // Annual Percentage Yield
    duration: { type: Number, required: true }, // e.g., 30, 60, 90
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'withdrawn'], default: 'active' },
    accruedRewards: { type: Number, default: 0 },
    autoCompound: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IStaking>('Staking', StakingSchema);
