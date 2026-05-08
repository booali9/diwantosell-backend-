"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const p2pController_1 = require("../controllers/p2pController");
const router = express_1.default.Router();
// Ads
router.get('/ads', userAuthMiddleware_1.protectUser, p2pController_1.getAds);
router.post('/ads', userAuthMiddleware_1.protectUser, p2pController_1.createAd);
router.get('/ads/my', userAuthMiddleware_1.protectUser, p2pController_1.getMyAds);
router.put('/ads/:id/toggle', userAuthMiddleware_1.protectUser, p2pController_1.toggleAd);
router.delete('/ads/:id', userAuthMiddleware_1.protectUser, p2pController_1.deleteAd);
// Orders
router.post('/orders', userAuthMiddleware_1.protectUser, p2pController_1.createOrder);
router.get('/orders', userAuthMiddleware_1.protectUser, p2pController_1.getMyOrders);
router.get('/orders/:id', userAuthMiddleware_1.protectUser, p2pController_1.getOrderDetail);
router.post('/orders/:id/pay', userAuthMiddleware_1.protectUser, p2pController_1.markPaymentSent);
router.post('/orders/:id/release', userAuthMiddleware_1.protectUser, p2pController_1.releaseCrypto);
router.post('/orders/:id/cancel', userAuthMiddleware_1.protectUser, p2pController_1.cancelOrder);
// Chat
router.post('/orders/:id/messages', userAuthMiddleware_1.protectUser, p2pController_1.sendMessage);
router.get('/orders/:id/messages', userAuthMiddleware_1.protectUser, p2pController_1.getMessages);
// Stats
router.get('/stats', userAuthMiddleware_1.protectUser, p2pController_1.getUserP2PStats);
exports.default = router;
