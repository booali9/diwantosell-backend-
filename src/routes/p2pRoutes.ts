import express from 'express';
import { protectUser } from '../middleware/userAuthMiddleware';
import {
    getAds, createAd, getMyAds, toggleAd, deleteAd,
    createOrder, getMyOrders, getOrderDetail, markPaymentSent, releaseCrypto, cancelOrder,
    sendMessage, getMessages, getUserP2PStats,
} from '../controllers/p2pController';

const router = express.Router();

// Ads
router.get('/ads', protectUser, getAds);
router.post('/ads', protectUser, createAd);
router.get('/ads/my', protectUser, getMyAds);
router.put('/ads/:id/toggle', protectUser, toggleAd);
router.delete('/ads/:id', protectUser, deleteAd);

// Orders
router.post('/orders', protectUser, createOrder);
router.get('/orders', protectUser, getMyOrders);
router.get('/orders/:id', protectUser, getOrderDetail);
router.post('/orders/:id/pay', protectUser, markPaymentSent);
router.post('/orders/:id/release', protectUser, releaseCrypto);
router.post('/orders/:id/cancel', protectUser, cancelOrder);

// Chat
router.post('/orders/:id/messages', protectUser, sendMessage);
router.get('/orders/:id/messages', protectUser, getMessages);

// Stats
router.get('/stats', protectUser, getUserP2PStats);

export default router;
