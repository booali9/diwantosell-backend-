import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        documentType: {
            type: String,
            required: true,
        },
        documentFront: String,
        documentBack: String,
        selfie: String,
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
        adminComment: String,
    },
    {
        timestamps: true,
    }
);

const KYC = mongoose.model('KYC', kycSchema);

export default KYC;
