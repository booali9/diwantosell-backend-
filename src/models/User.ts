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
        password: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            default: 'Not set',
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        avatar: {
            type: String,
            default: '',
        },
        balance: {
            type: Number,
            default: 0,
        },
        futuresBalance: {
            type: Number,
            default: 0,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        otp: String,
        otpExpires: Date,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        kycStatus: {
            type: String,
            enum: ['none', 'pending', 'verified', 'rejected'],
            default: 'none',
        },
        kycData: {
            firstName: String,
            lastName: String,
            dateOfBirth: Date,
            address: String,
            city: String,
            postalCode: String,
            country: String,
            documentType: {
                type: String,
                enum: ['passport', 'id-card', 'national-passport', 'drivers-license'],
            },
            documentNumber: String,
            documentFront: String,
            documentBack: String,
            selfie: String,
        },
        isFrozen: {
            type: Boolean,
            default: false,
        },
        walletAddress: {
            type: String,
        },
        defaultNetwork: {
            type: String,
            enum: ['Internal Ledger', 'Ethereum', 'BNB Chain', 'Polygon'],
            default: 'Internal Ledger',
        },
        uid: {
            type: Number,
            unique: true,
            sparse: true
        },
        invitationCode: {
            type: String,
            unique: true,
            sparse: true
        },
        isGoogleAuthenticatorEnabled: {
            type: Boolean,
            default: false,
        },
        googleAuthenticatorSecret: {
            type: String,
        },
        fundPassword: {
            type: String,
        },
        lastWithdrawalRestrictionUntil: {
            type: Date,
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        referralCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function (next) {
    // Generate numeric UID if not present
    if (!this.uid) {
        this.uid = Math.floor(10000000 + Math.random() * 90000000);
    }

    // Generate Invitation Code if not present
    if (!this.invitationCode) {
        this.invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        if (this.invitationCode === this.uid.toString()) {
            this.invitationCode = Math.random().toString(36).substring(2, 11).toUpperCase();
        }
    }

    if (!this.password || !this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.verifyFundPassword = async function (enteredPassword: string) {
    if (!this.fundPassword) return false;
    return await bcrypt.compare(enteredPassword, this.fundPassword);
};

const User = mongoose.model('User', userSchema);

export default User;
