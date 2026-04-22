"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
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
}, {
    timestamps: true,
});
userSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) {
        return;
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
});
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password)
        return false;
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
