import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['deposit', 'referral', 'trading', 'signup'],
        },
        // Eligibility Rules
        eligibility: {
            allUsers: {
                type: Boolean,
                default: true,
            },
            newUsers: {
                type: Boolean,
                default: false,
            },
            kycRequired: {
                type: Boolean,
                default: false,
            },
            minDepositAmount: {
                type: Number,
                default: 0,
            },
        },
        // Reward Configuration
        reward: {
            rewardType: {
                type: String,
                enum: ['cashback', 'bonus', 'discount', 'percentage'],
                default: 'bonus',
            },
            amount: {
                type: Number,
                default: 0,
            },
            maxReward: {
                type: Number,
                default: 0,
            },
        },
        // Campaign Duration
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['draft', 'scheduled', 'active', 'paused', 'ended'],
            default: 'draft',
        },
        // Statistics
        stats: {
            participants: {
                type: Number,
                default: 0,
            },
            totalRewardsIssued: {
                type: Number,
                default: 0,
            },
            conversionRate: {
                type: Number,
                default: 0,
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-update status based on dates
campaignSchema.pre('save', function() {
    const now = new Date();
    if (this.status !== 'paused') {
        if (now < this.startDate) {
            this.status = 'scheduled';
        } else if (now >= this.startDate && now <= this.endDate) {
            this.status = 'active';
        } else if (now > this.endDate) {
            this.status = 'ended';
        }
    }
});

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
