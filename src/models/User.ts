import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            required: false,
        },
        password: {
            type: String,
            required: false,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        clerkId: {
            type: String,
            unique: true,
            sparse: true
        },
        country: String,
        kycStatus: {
            type: String,
            enum: ['none', 'pending', 'verified', 'rejected'],
            default: 'none',
        },
        balance: {
            type: Number,
            default: 0,
        },
        futuresBalance: {
            type: Number,
            default: 0,
        },
        isFrozen: {
            type: Boolean,
            default: false,
        },
        lastLogin: Date,
        walletAddress: {
            type: String,
            unique: true,
            sparse: true
        },
        otp: {
            type: String,
        },
        otpExpires: {
            type: Date,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        resetPasswordExpires: {
            type: Date,
        },
        resetPasswordToken: {
            type: String,
        },
        defaultNetwork: {
            type: String,
            enum: ['Internal Ledger', 'Ethereum', 'BNB Chain', 'Polygon'],
            default: 'Internal Ledger',
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
