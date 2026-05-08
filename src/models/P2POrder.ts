import mongoose from 'mongoose';

const p2pMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
    imageUrl: { type: String },
    read: { type: Boolean, default: false },
}, { timestamps: true });

const p2pOrderSchema = new mongoose.Schema(
    {
        ad: { type: mongoose.Schema.Types.ObjectId, ref: 'P2PAd', required: true },
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        crypto: { type: String, required: true },
        fiat: { type: String, required: true },
        price: { type: Number, required: true },
        cryptoAmount: { type: Number, required: true },
        fiatAmount: { type: Number, required: true },
        paymentMethod: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending_payment', 'payment_sent', 'releasing', 'completed', 'cancelled', 'expired', 'disputed'],
            default: 'pending_payment',
        },
        paymentProof: { type: String },
        expiresAt: { type: Date, required: true },
        paidAt: { type: Date },
        releasedAt: { type: Date },
        cancelledAt: { type: Date },
        cancelReason: { type: String },
        messages: [p2pMessageSchema],
        orderNumber: { type: String, unique: true },
    },
    { timestamps: true }
);

p2pOrderSchema.pre('save', function () {
    if (!this.orderNumber) {
        this.orderNumber = 'P2P' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
});

const P2POrder = mongoose.model('P2POrder', p2pOrderSchema);
export default P2POrder;
