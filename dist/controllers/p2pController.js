"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserP2PStats = exports.getMessages = exports.sendMessage = exports.cancelOrder = exports.releaseCrypto = exports.markPaymentSent = exports.getOrderDetail = exports.getMyOrders = exports.createOrder = exports.deleteAd = exports.toggleAd = exports.getMyAds = exports.createAd = exports.getAds = void 0;
const P2PAd_1 = __importDefault(require("../models/P2PAd"));
const P2POrder_1 = __importDefault(require("../models/P2POrder"));
const User_1 = __importDefault(require("../models/User"));
// ─── ADS ────────────────────────────────────────────────────────────────────────
// GET /api/p2p/ads - list active ads with filters
const getAds = async (req, res) => {
    try {
        const { side, crypto, fiat, paymentMethod, amount, page = 1, limit = 20 } = req.query;
        const filter = { status: 'active' };
        // When user wants to BUY crypto, show SELL ads (and vice versa)
        if (side === 'buy')
            filter.side = 'sell';
        else if (side === 'sell')
            filter.side = 'buy';
        if (crypto)
            filter.crypto = crypto.toUpperCase();
        if (fiat)
            filter.fiat = fiat.toUpperCase();
        if (paymentMethod)
            filter.paymentMethods = { $in: [paymentMethod] };
        if (amount) {
            const amt = Number(amount);
            if (amt > 0) {
                filter.minOrderAmount = { $lte: amt };
                filter.maxOrderAmount = { $gte: amt };
            }
        }
        // Exclude user's own ads if authenticated
        if (req.user) {
            filter.user = { $ne: req.user._id };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await P2PAd_1.default.countDocuments(filter);
        const ads = await P2PAd_1.default.find(filter)
            .populate('user', 'name email avatar uid kycStatus createdAt isProfileComplete')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        // Enrich with available amount
        const enriched = ads.map((ad) => {
            const obj = ad.toJSON();
            obj.availableAmount = ad.totalAmount - ad.filledAmount;
            return obj;
        });
        res.json({ ads: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch ads' });
    }
};
exports.getAds = getAds;
// POST /api/p2p/ads - create an ad
const createAd = async (req, res) => {
    try {
        const { side, crypto, fiat, priceType, fixedPrice, floatingMargin, totalAmount, minOrderAmount, maxOrderAmount, paymentMethods, autoReply, terms, paymentTimeLimit } = req.body;
        if (!side || !totalAmount || !minOrderAmount || !maxOrderAmount || !fixedPrice) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // For sell ads, check user has sufficient balance
        if (side === 'sell') {
            const user = await User_1.default.findById(req.user._id);
            if (!user)
                return res.status(404).json({ message: 'User not found' });
            if ((user.balance || 0) < totalAmount) {
                return res.status(400).json({ message: 'Insufficient balance to create sell ad' });
            }
            // Lock the amount from user balance
            user.balance = (user.balance || 0) - totalAmount;
            await user.save();
        }
        // Count existing completed trades for this user
        const completedCount = await P2POrder_1.default.countDocuments({
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
            status: 'completed',
        });
        const totalOrders = await P2POrder_1.default.countDocuments({
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
        });
        const ad = await P2PAd_1.default.create({
            user: req.user._id,
            side,
            crypto: (crypto || 'USDT').toUpperCase(),
            fiat: (fiat || 'USD').toUpperCase(),
            priceType: priceType || 'fixed',
            fixedPrice,
            floatingMargin: floatingMargin || 0,
            totalAmount,
            minOrderAmount,
            maxOrderAmount,
            paymentMethods: paymentMethods || ['Bank Transfer'],
            autoReply: autoReply || '',
            terms: terms || '',
            paymentTimeLimit: paymentTimeLimit || 15,
            completedTrades: completedCount,
            completionRate: totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100,
        });
        res.status(201).json(ad);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to create ad' });
    }
};
exports.createAd = createAd;
// GET /api/p2p/ads/my - user's own ads
const getMyAds = async (req, res) => {
    try {
        const ads = await P2PAd_1.default.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(ads);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch your ads' });
    }
};
exports.getMyAds = getMyAds;
// PUT /api/p2p/ads/:id/toggle - pause/resume ad
const toggleAd = async (req, res) => {
    try {
        const ad = await P2PAd_1.default.findOne({ _id: req.params.id, user: req.user._id });
        if (!ad)
            return res.status(404).json({ message: 'Ad not found' });
        ad.status = ad.status === 'active' ? 'paused' : 'active';
        await ad.save();
        res.json(ad);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to toggle ad' });
    }
};
exports.toggleAd = toggleAd;
// DELETE /api/p2p/ads/:id - cancel ad and refund locked balance
const deleteAd = async (req, res) => {
    try {
        const ad = await P2PAd_1.default.findOne({ _id: req.params.id, user: req.user._id });
        if (!ad)
            return res.status(404).json({ message: 'Ad not found' });
        // Refund remaining locked amount for sell ads
        if (ad.side === 'sell') {
            const remaining = ad.totalAmount - ad.filledAmount;
            if (remaining > 0) {
                await User_1.default.findByIdAndUpdate(req.user._id, { $inc: { balance: remaining } });
            }
        }
        ad.status = 'cancelled';
        await ad.save();
        res.json({ message: 'Ad cancelled', ad });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to cancel ad' });
    }
};
exports.deleteAd = deleteAd;
// ─── ORDERS ─────────────────────────────────────────────────────────────────────
// POST /api/p2p/orders - create order against an ad
const createOrder = async (req, res) => {
    try {
        const { adId, amount, paymentMethod } = req.body;
        if (!adId || !amount)
            return res.status(400).json({ message: 'Missing required fields' });
        const ad = await P2PAd_1.default.findById(adId).populate('user');
        if (!ad || ad.status !== 'active')
            return res.status(404).json({ message: 'Ad not found or inactive' });
        const fiatAmount = Number(amount);
        const cryptoAmount = fiatAmount / ad.fixedPrice;
        if (fiatAmount < ad.minOrderAmount || fiatAmount > ad.maxOrderAmount) {
            return res.status(400).json({ message: `Order must be between ${ad.minOrderAmount} and ${ad.maxOrderAmount} ${ad.fiat}` });
        }
        const available = ad.totalAmount - ad.filledAmount;
        if (cryptoAmount > available) {
            return res.status(400).json({ message: 'Insufficient ad liquidity' });
        }
        // Prevent self-trading
        if (ad.user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot trade with your own ad' });
        }
        let buyer, seller;
        if (ad.side === 'sell') {
            // Ad is selling → ad owner is seller, requester is buyer
            buyer = req.user._id;
            seller = ad.user._id;
        }
        else {
            // Ad is buying → ad owner is buyer, requester is seller
            buyer = ad.user._id;
            seller = req.user._id;
            // Lock seller's balance for buy ads
            const sellerUser = await User_1.default.findById(seller);
            if (!sellerUser || (sellerUser.balance || 0) < cryptoAmount) {
                return res.status(400).json({ message: 'Insufficient balance to sell' });
            }
            sellerUser.balance = (sellerUser.balance || 0) - cryptoAmount;
            await sellerUser.save();
        }
        const expiresAt = new Date(Date.now() + (ad.paymentTimeLimit || 15) * 60 * 1000);
        const order = await P2POrder_1.default.create({
            ad: ad._id,
            buyer,
            seller,
            crypto: ad.crypto,
            fiat: ad.fiat,
            price: ad.fixedPrice,
            cryptoAmount,
            fiatAmount,
            paymentMethod: paymentMethod || ad.paymentMethods[0] || 'Bank Transfer',
            expiresAt,
            messages: ad.autoReply ? [{
                    sender: ad.user._id,
                    text: ad.autoReply,
                    type: 'system',
                }] : [],
        });
        // Update ad filled amount
        ad.filledAmount += cryptoAmount;
        if (ad.filledAmount >= ad.totalAmount)
            ad.status = 'completed';
        await ad.save();
        const populated = await P2POrder_1.default.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid')
            .populate('ad');
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to create order' });
    }
};
exports.createOrder = createOrder;
// GET /api/p2p/orders - user's orders
const getMyOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { $or: [{ buyer: req.user._id }, { seller: req.user._id }] };
        if (status && status !== 'all')
            filter.status = status;
        const orders = await P2POrder_1.default.find(filter)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid')
            .populate('ad')
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch orders' });
    }
};
exports.getMyOrders = getMyOrders;
// GET /api/p2p/orders/:id - single order detail
const getOrderDetail = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id)
            .populate('buyer', 'name email avatar uid kycStatus createdAt')
            .populate('seller', 'name email avatar uid kycStatus createdAt')
            .populate('ad');
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        // Ensure user is participant
        const userId = req.user._id.toString();
        if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch order' });
    }
};
exports.getOrderDetail = getOrderDetail;
// POST /api/p2p/orders/:id/pay - buyer marks payment sent
const markPaymentSent = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        if (order.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the buyer can mark payment' });
        }
        if (order.status !== 'pending_payment') {
            return res.status(400).json({ message: 'Invalid order state for this action' });
        }
        order.status = 'payment_sent';
        order.paidAt = new Date();
        if (req.body.paymentProof) {
            order.paymentProof = req.body.paymentProof;
        }
        // Add system message
        order.messages.push({
            sender: req.user._id,
            text: 'Buyer has marked the payment as sent.',
            type: 'system',
        });
        await order.save();
        const populated = await P2POrder_1.default.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid');
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to mark payment' });
    }
};
exports.markPaymentSent = markPaymentSent;
// POST /api/p2p/orders/:id/release - seller releases crypto
const releaseCrypto = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        if (order.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the seller can release crypto' });
        }
        if (order.status !== 'payment_sent') {
            return res.status(400).json({ message: 'Payment must be marked as sent first' });
        }
        order.status = 'releasing';
        await order.save();
        // Transfer crypto from escrow to buyer
        const buyerUser = await User_1.default.findById(order.buyer);
        if (buyerUser) {
            buyerUser.balance = (buyerUser.balance || 0) + order.cryptoAmount;
            await buyerUser.save();
        }
        order.status = 'completed';
        order.releasedAt = new Date();
        order.messages.push({
            sender: req.user._id,
            text: 'Crypto has been released to buyer. Trade completed!',
            type: 'system',
        });
        await order.save();
        // Update ad stats
        const ad = await P2PAd_1.default.findById(order.ad);
        if (ad) {
            ad.completedTrades = (ad.completedTrades || 0) + 1;
            await ad.save();
        }
        const populated = await P2POrder_1.default.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid');
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to release crypto' });
    }
};
exports.releaseCrypto = releaseCrypto;
// POST /api/p2p/orders/:id/cancel - cancel order
const cancelOrder = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const userId = req.user._id.toString();
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Cannot cancel after payment sent (only buyer can cancel before payment)
        if (order.status === 'payment_sent' && order.buyer.toString() === userId) {
            return res.status(400).json({ message: 'Cannot cancel after payment is marked as sent' });
        }
        if (['completed', 'cancelled', 'expired'].includes(order.status)) {
            return res.status(400).json({ message: 'Order is already finalized' });
        }
        // Refund escrow to seller
        const sellerUser = await User_1.default.findById(order.seller);
        if (sellerUser) {
            sellerUser.balance = (sellerUser.balance || 0) + order.cryptoAmount;
            await sellerUser.save();
        }
        // Restore ad availability
        const ad = await P2PAd_1.default.findById(order.ad);
        if (ad) {
            ad.filledAmount = Math.max(0, ad.filledAmount - order.cryptoAmount);
            if (ad.status === 'completed')
                ad.status = 'active';
            await ad.save();
        }
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = req.body.reason || 'Cancelled by user';
        order.messages.push({
            sender: req.user._id,
            text: `Order cancelled: ${order.cancelReason}`,
            type: 'system',
        });
        await order.save();
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to cancel order' });
    }
};
exports.cancelOrder = cancelOrder;
// ─── CHAT ───────────────────────────────────────────────────────────────────────
// POST /api/p2p/orders/:id/messages - send message
const sendMessage = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const userId = req.user._id.toString();
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { text, type, imageUrl } = req.body;
        const message = {
            sender: req.user._id,
            text: text || '',
            type: type || 'text',
            imageUrl: imageUrl || undefined,
        };
        order.messages.push(message);
        await order.save();
        const updatedOrder = await P2POrder_1.default.findById(order._id)
            .populate('messages.sender', 'name avatar uid');
        const newMsg = updatedOrder.messages[updatedOrder.messages.length - 1];
        res.json(newMsg);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to send message' });
    }
};
exports.sendMessage = sendMessage;
// GET /api/p2p/orders/:id/messages - get messages
const getMessages = async (req, res) => {
    try {
        const order = await P2POrder_1.default.findById(req.params.id)
            .populate('messages.sender', 'name avatar uid');
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const userId = req.user._id.toString();
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(order.messages);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch messages' });
    }
};
exports.getMessages = getMessages;
// GET /api/p2p/stats - user's P2P trade stats
const getUserP2PStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const completed = await P2POrder_1.default.countDocuments({
            $or: [{ buyer: userId }, { seller: userId }],
            status: 'completed',
        });
        const total = await P2POrder_1.default.countDocuments({
            $or: [{ buyer: userId }, { seller: userId }],
        });
        const user = await User_1.default.findById(userId).select('name email avatar uid kycStatus createdAt');
        res.json({
            completedTrades: completed,
            totalTrades: total,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 100,
            user,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch stats' });
    }
};
exports.getUserP2PStats = getUserP2PStats;
