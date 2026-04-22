import { Request, Response } from 'express';
import Staking from '../models/Staking';
import User from '../models/User';
import SystemSettings from '../models/SystemSettings';
import Transaction from '../models/Transaction';

export const stakeAsset = async (req: Request, res: Response) => {
    try {
        const { amount, duration, asset = 'USDT', autoCompound = false } = req.body;
        const userId = (req as any).user.id;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Get APY from settings
        const settings: any = await (SystemSettings as any).getSettings();
        let apy = settings.stakingAPY.flexible;
        if (duration === 30) apy = settings.stakingAPY.locked30;
        else if (duration === 60) apy = settings.stakingAPY.locked60;
        else if (duration === 90) apy = settings.stakingAPY.locked90;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (duration || 0));

        // Create staking position
        const staking = new Staking({
            user: userId,
            asset,
            amount,
            apy,
            duration: duration || 0,
            endDate,
            autoCompound,
            status: 'active'
        });

        // Deduct balance
        user.balance -= amount;

        await Promise.all([
            staking.save(),
            user.save(),
            Transaction.create({
                user: userId,
                type: 'withdrawal',
                amount,
                asset,
                status: 'completed',
                adminNote: `Staked in ${duration ? duration + '-day pool' : 'Flexible pool'}`
            })
        ]);

        res.status(201).json(staking);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyStakes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const stakes = await Staking.find({ user: userId }).sort({ createdAt: -1 });

        // Calculate real-time accrued rewards for each active stake
        const stakesWithRewards = stakes.map(stake => {
            const stakeObj = stake.toObject();
            if (stakeObj.status === 'active') {
                const now = new Date();
                const start = new Date(stakeObj.startDate);
                const diffTime = Math.max(0, now.getTime() - start.getTime());
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                // Formula: Amount * (APY/100) * (DaysElapsed / 365)
                const accrued = stakeObj.amount * (stakeObj.apy / 100) * (diffDays / 365);
                stakeObj.accruedRewards = parseFloat(accrued.toFixed(8));
            }
            return stakeObj;
        });

        res.json(stakesWithRewards);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unstakeAsset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const staking = await Staking.findOne({ _id: id, user: userId });
        if (!staking) return res.status(404).json({ message: 'Staking position not found' });
        if (staking.status !== 'active') return res.status(400).json({ message: 'Already unstaked' });

        const now = new Date();
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Calculate rewards
        const start = new Date(staking.startDate);
        const diffTime = Math.max(0, now.getTime() - start.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const rewards = staking.amount * (staking.apy / 100) * (diffDays / 365);

        // Check for early withdrawal penalty if it was a locked pool
        if (staking.duration > 0 && now < staking.endDate) {
            // Optional: apply penalty logic here
            // For now, we'll just allow it but maybe give 0 rewards if before 50% duration?
            // User requested "Educational" so let's keep it simple.
        }

        staking.status = 'withdrawn';
        staking.accruedRewards = rewards;

        const totalRelease = staking.amount + rewards;
        user.balance += totalRelease;

        await Promise.all([
            staking.save(),
            user.save(),
            Transaction.create({
                user: userId,
                type: 'deposit',
                amount: totalRelease,
                asset: staking.asset,
                status: 'completed',
                adminNote: `Unstaked from ${staking.duration}-day pool`
            })
        ]);

        res.json({ message: 'Unstaked successfully', totalRelease, rewards });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ========================
// PUBLIC ENDPOINT
// ========================

// @desc    Get staking pools with current APYs from SystemSettings
// @route   GET /api/staking/pools
// @access  Public
export const getStakingPools = async (_req: Request, res: Response) => {
    try {
        const settings: any = await (SystemSettings as any).getSettings();
        const apy = settings.stakingAPY || { flexible: 5, locked30: 8, locked60: 12, locked90: 18 };

        const pools = [
            { id: 'flexible', name: 'Flexible Savings', apy: apy.flexible, duration: 0, description: 'Withdraw any time' },
            { id: 'locked30', name: '30 Days Fixed', apy: apy.locked30, duration: 30, description: 'Locked for 30 days' },
            { id: 'locked60', name: '60 Days Fixed', apy: apy.locked60, duration: 60, description: 'Locked for 60 days' },
            { id: 'locked90', name: '90 Days Fixed', apy: apy.locked90, duration: 90, description: 'Locked for 90 days' },
        ];

        res.json(pools);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ========================
// ADMIN ENDPOINTS
// ========================

// @desc    Get all staking positions for admin
// @route   GET /api/admin/staking
// @access  Private/Admin
export const adminGetAllStakes = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status && ['active', 'completed', 'withdrawn'].includes(status as string)) {
            filter.status = status;
        }

        const stakes = await Staking.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Calculate real-time accrued rewards for active stakes
        const stakesWithRewards = stakes.map(stake => {
            const obj = stake.toObject();
            if (obj.status === 'active') {
                const now = new Date();
                const start = new Date(obj.startDate);
                const diffDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                obj.accruedRewards = parseFloat((obj.amount * (obj.apy / 100) * (diffDays / 365)).toFixed(8));
            }
            return obj;
        });

        // Stats
        const active = stakesWithRewards.filter(s => s.status === 'active');
        const totalStaked = active.reduce((sum, s) => sum + s.amount, 0);
        const totalRewards = stakesWithRewards.reduce((sum, s) => sum + (s.accruedRewards || 0), 0);

        res.json({
            stakes: stakesWithRewards,
            stats: {
                totalStaked,
                totalRewards,
                activePositions: active.length,
                totalPositions: stakesWithRewards.length,
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Admin updates staking APY
// @route   PUT /api/admin/staking/apy
// @access  Private/Admin
export const adminUpdateAPY = async (req: Request, res: Response) => {
    try {
        const { flexible, locked30, locked60, locked90 } = req.body;
        const settings: any = await (SystemSettings as any).getSettings();

        if (flexible !== undefined) settings.stakingAPY.flexible = Number(flexible);
        if (locked30 !== undefined) settings.stakingAPY.locked30 = Number(locked30);
        if (locked60 !== undefined) settings.stakingAPY.locked60 = Number(locked60);
        if (locked90 !== undefined) settings.stakingAPY.locked90 = Number(locked90);

        await settings.save();

        res.json({
            message: 'Staking APY updated successfully',
            stakingAPY: settings.stakingAPY,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Admin force-unstake a user's position
// @route   POST /api/admin/staking/:id/force-unstake
// @access  Private/Admin
export const adminForceUnstake = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;

        const staking = await Staking.findById(id);
        if (!staking) return res.status(404).json({ message: 'Staking position not found' });
        if (staking.status !== 'active') return res.status(400).json({ message: 'Position already closed' });

        const user = await User.findById(staking.user);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Calculate rewards
        const now = new Date();
        const start = new Date(staking.startDate);
        const diffDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const rewards = staking.amount * (staking.apy / 100) * (diffDays / 365);

        staking.status = 'withdrawn';
        staking.accruedRewards = rewards;

        const totalRelease = staking.amount + rewards;
        user.balance += totalRelease;

        await Promise.all([
            staking.save(),
            user.save(),
            Transaction.create({
                user: user._id,
                type: 'deposit',
                amount: totalRelease,
                asset: staking.asset,
                status: 'completed',
                adminNote: adminNote || 'Force-unstaked by admin',
            })
        ]);

        res.json({
            message: 'Position force-unstaked',
            totalRelease,
            rewards,
            stake: staking,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};