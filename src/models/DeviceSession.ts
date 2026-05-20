import mongoose from 'mongoose';

const deviceSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    {
        timestamps: true,
    }
);

// Compound index for fast user-session lookups
deviceSessionSchema.index({ user: 1, isActive: 1 });

const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);

export default DeviceSession;
