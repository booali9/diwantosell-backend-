"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stakingController_1 = require("../controllers/stakingController");
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const router = express_1.default.Router();
// Public
router.get('/pools', stakingController_1.getStakingPools);
// Protected
router.post('/stake', userAuthMiddleware_1.protectUser, stakingController_1.stakeAsset);
router.get('/my-stakes', userAuthMiddleware_1.protectUser, stakingController_1.getMyStakes);
router.post('/unstake/:id', userAuthMiddleware_1.protectUser, stakingController_1.unstakeAsset);
exports.default = router;
