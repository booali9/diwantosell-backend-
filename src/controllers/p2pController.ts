import { Request, Response } from 'express';
import P2PAd from '../models/P2PAd';
import P2POrder from '../models/P2POrder';
import User from '../models/User';

// ─── ADS ────────────────────────────────────────────────────────────────────────

// GET /api/p2p/ads - list active ads with filters
export const getAds = async (req: any, res: Response) => {
    try {
        const { side, crypto, fiat, paymentMethod, amount, page = 1, limit = 20 } = req.query;
        const filter: any = { status: 'active' };
        console.log('[DEBUG] P2P getAds filters:', { side, crypto, fiat, paymentMethod, amount });

        // When user wants to BUY crypto, show SELL ads (and vice versa)
        if (side === 'buy') filter.side = 'sell';
        else if (side === 'sell') filter.side = 'buy';

        console.log('[DEBUG] P2P getAds parsed side filter:', filter.side);

        if (crypto) filter.crypto = (crypto as string).toUpperCase();
        if (fiat) filter.fiat = (fiat as string).toUpperCase();
        if (paymentMethod) filter.paymentMethods = { $in: [paymentMethod] };

        if (amount) {
            const amt = Number(amount);
            if (amt > 0) {
                filter.minOrderAmount = { $lte: amt };
                filter.maxOrderAmount = { $gte: amt };
            }
        }

        /* 
        // Exclude user's own ads if authenticated
        if (req.user) {
            filter.user = { $ne: req.user._id };
        }
        */

        const skip = (Number(page) - 1) * Number(limit);
        console.log('[DEBUG] P2P final query filter:', filter);
        const total = await P2PAd.countDocuments(filter);
        console.log('[DEBUG] P2P ads found count:', total);
        const ads = await P2PAd.find(filter)
            .populate('user', 'name email avatar uid kycStatus createdAt isProfileComplete')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Enrich with available amount
        const enriched = ads.map((ad: any) => {
            const obj = ad.toJSON();
            obj.availableAmount = ad.totalAmount - ad.filledAmount;
            return obj;
        });

        res.json({ ads: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch ads' });
    }
};

// POST /api/p2p/ads - create an ad
export const createAd = async (req: any, res: Response) => {
    try {
        const { side, crypto, fiat, priceType, fixedPrice, floatingMargin, totalAmount, minOrderAmount, maxOrderAmount, paymentMethods, autoReply, terms, paymentTimeLimit } = req.body;

        if (!side || !totalAmount || !minOrderAmount || !maxOrderAmount || !fixedPrice) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // For sell ads, check user has sufficient balance
        if (side === 'sell') {
            const user = await User.findById(req.user._id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if ((user.balance || 0) < totalAmount) {
                return res.status(400).json({ message: 'Insufficient balance to create sell ad' });
            }
            // Lock the amount from user balance
            user.balance = (user.balance || 0) - totalAmount;
            await user.save();
        }

        // Count existing completed trades for this user
        const completedCount = await P2POrder.countDocuments({
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
            status: 'completed',
        });

        const totalOrders = await P2POrder.countDocuments({
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
        });

        const ad = await P2PAd.create({
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
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to create ad' });
    }
};

// GET /api/p2p/ads/my - user's own ads
export const getMyAds = async (req: any, res: Response) => {
    try {
        const ads = await P2PAd.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(ads);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch your ads' });
    }
};

// PUT /api/p2p/ads/:id/toggle - pause/resume ad
export const toggleAd = async (req: any, res: Response) => {
    try {
        const ad = await P2PAd.findOne({ _id: req.params.id, user: req.user._id });
        if (!ad) return res.status(404).json({ message: 'Ad not found' });
        ad.status = ad.status === 'active' ? 'paused' : 'active';
        await ad.save();
        res.json(ad);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to toggle ad' });
    }
};

// DELETE /api/p2p/ads/:id - cancel ad and refund locked balance
export const deleteAd = async (req: any, res: Response) => {
    try {
        const ad = await P2PAd.findOne({ _id: req.params.id, user: req.user._id });
        if (!ad) return res.status(404).json({ message: 'Ad not found' });

        // Refund remaining locked amount for sell ads
        if (ad.side === 'sell') {
            const remaining = ad.totalAmount - ad.filledAmount;
            if (remaining > 0) {
                await User.findByIdAndUpdate(req.user._id, { $inc: { balance: remaining } });
            }
        }

        ad.status = 'cancelled';
        await ad.save();
        res.json({ message: 'Ad cancelled', ad });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to cancel ad' });
    }
};

// ─── ORDERS ─────────────────────────────────────────────────────────────────────

// POST /api/p2p/orders - create order against an ad
export const createOrder = async (req: any, res: Response) => {
    try {
        const { adId, amount, paymentMethod } = req.body;
        if (!adId || !amount) return res.status(400).json({ message: 'Missing required fields' });

        const ad = await P2PAd.findById(adId).populate('user');
        if (!ad || ad.status !== 'active') return res.status(404).json({ message: 'Ad not found or inactive' });

        const fiatAmount = Number(amount);
        const cryptoAmount = fiatAmount / ad.fixedPrice!;

        if (fiatAmount < ad.minOrderAmount || fiatAmount > ad.maxOrderAmount) {
            return res.status(400).json({ message: `Order must be between ${ad.minOrderAmount} and ${ad.maxOrderAmount} ${ad.fiat}` });
        }

        const available = ad.totalAmount - ad.filledAmount;
        if (cryptoAmount > available) {
            return res.status(400).json({ message: 'Insufficient ad liquidity' });
        }

        console.log('[DEBUG] createOrder ad:', ad.side, ad._id);
        
        // Prevent self-trading
        if (ad.user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot trade with your own ad' });
        }

        let buyer, seller;
        if (ad.side === 'sell') {
            // Ad is selling → ad owner is seller, requester is buyer
            buyer = req.user._id;
            seller = ad.user._id;
        } else {
            // Ad is buying → ad owner is buyer, requester is seller
            buyer = ad.user._id;
            seller = req.user._id;

            // Lock seller's balance for buy ads
            const sellerUser = await User.findById(seller);
            if (!sellerUser || (sellerUser.balance || 0) < cryptoAmount) {
                console.log(`[DEBUG] Insufficient balance. Ad side: ${ad.side}. Seller: ${seller}. CryptoAmount: ${cryptoAmount}. Balance: ${sellerUser?.balance}`);
                return res.status(400).json({ message: 'Insufficient balance to fulfill this Buy ad. You are acting as the seller.' });
            }
            sellerUser.balance = (sellerUser.balance || 0) - cryptoAmount;
            await sellerUser.save();
        }

        const expiresAt = new Date(Date.now() + (ad.paymentTimeLimit || 15) * 60 * 1000);

        const order = await P2POrder.create({
            ad: ad._id,
            buyer,
            seller,
            crypto: ad.crypto,
            fiat: ad.fiat,
            price: ad.fixedPrice!,
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
        if (ad.filledAmount >= ad.totalAmount) ad.status = 'completed';
        await ad.save();

        const populated = await P2POrder.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid')
            .populate('ad');

        res.status(201).json(populated);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to create order' });
    }
};

// GET /api/p2p/orders - user's orders
export const getMyOrders = async (req: any, res: Response) => {
    try {
        const { status } = req.query;
        const filter: any = { $or: [{ buyer: req.user._id }, { seller: req.user._id }] };
        if (status && status !== 'all') filter.status = status;

        const orders = await P2POrder.find(filter)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid')
            .populate('ad')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch orders' });
    }
};

// GET /api/p2p/orders/:id - single order detail
export const getOrderDetail = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id)
            .populate('buyer', 'name email avatar uid kycStatus createdAt')
            .populate('seller', 'name email avatar uid kycStatus createdAt')
            .populate('ad');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Ensure user is participant
        const userId = req.user._id.toString();
        if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch order' });
    }
};

// POST /api/p2p/orders/:id/pay - buyer marks payment sent
export const markPaymentSent = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
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
        } as any);

        await order.save();

        const populated = await P2POrder.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid');

        res.json(populated);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to mark payment' });
    }
};

// POST /api/p2p/orders/:id/release - seller releases crypto
export const releaseCrypto = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the seller can release crypto' });
        }
        if (order.status !== 'payment_sent') {
            return res.status(400).json({ message: 'Payment must be marked as sent first' });
        }

        order.status = 'releasing';
        await order.save();

        // Transfer crypto from escrow to buyer
        const buyerUser = await User.findById(order.buyer);
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
        } as any);

        await order.save();

        // Update ad stats
        const ad = await P2PAd.findById(order.ad);
        if (ad) {
            ad.completedTrades = (ad.completedTrades || 0) + 1;
            await ad.save();
        }

        const populated = await P2POrder.findById(order._id)
            .populate('buyer', 'name email avatar uid')
            .populate('seller', 'name email avatar uid');

        res.json(populated);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to release crypto' });
    }
};

// POST /api/p2p/orders/:id/cancel - cancel order
export const cancelOrder = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

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
        const sellerUser = await User.findById(order.seller);
        if (sellerUser) {
            sellerUser.balance = (sellerUser.balance || 0) + order.cryptoAmount;
            await sellerUser.save();
        }

        // Restore ad availability
        const ad = await P2PAd.findById(order.ad);
        if (ad) {
            ad.filledAmount = Math.max(0, ad.filledAmount - order.cryptoAmount);
            if (ad.status === 'completed') ad.status = 'active';
            await ad.save();
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = req.body.reason || 'Cancelled by user';

        order.messages.push({
            sender: req.user._id,
            text: `Order cancelled: ${order.cancelReason}`,
            type: 'system',
        } as any);

        await order.save();
        res.json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to cancel order' });
    }
};

// ─── CHAT ───────────────────────────────────────────────────────────────────────

// POST /api/p2p/orders/:id/messages - send message
export const sendMessage = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

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

        order.messages.push(message as any);
        await order.save();

        const updatedOrder = await P2POrder.findById(order._id)
            .populate('messages.sender', 'name avatar uid');

        const newMsg = updatedOrder!.messages[updatedOrder!.messages.length - 1];
        res.json(newMsg);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to send message' });
    }
};

// GET /api/p2p/orders/:id/messages - get messages
export const getMessages = async (req: any, res: Response) => {
    try {
        const order = await P2POrder.findById(req.params.id)
            .populate('messages.sender', 'name avatar uid');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const userId = req.user._id.toString();
        if (order.buyer.toString() !== userId && order.seller.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order.messages);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch messages' });
    }
};

// GET /api/p2p/stats - user's P2P trade stats
export const getUserP2PStats = async (req: any, res: Response) => {
    try {
        const userId = req.user._id;
        const completed = await P2POrder.countDocuments({
            $or: [{ buyer: userId }, { seller: userId }],
            status: 'completed',
        });
        const total = await P2POrder.countDocuments({
            $or: [{ buyer: userId }, { seller: userId }],
        });
        const user = await User.findById(userId).select('name email avatar uid kycStatus createdAt');

        res.json({
            completedTrades: completed,
            totalTrades: total,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 100,
            user,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to fetch stats' });
    }
};
