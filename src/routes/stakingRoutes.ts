import express from 'express';
import { stakeAsset, getMyStakes, unstakeAsset, getStakingPools } from '../controllers/stakingController';
import { protectUser } from '../middleware/userAuthMiddleware';

const router = express.Router();

// Public
router.get('/pools', getStakingPools);

// Protected
router.post('/stake', protectUser, stakeAsset);
router.get('/my-stakes', protectUser, getMyStakes);
router.post('/unstake/:id', protectUser, unstakeAsset);

export default router;
