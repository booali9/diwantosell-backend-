import P2POrder from '../models/P2POrder';
import User from '../models/User';
import P2PAd from '../models/P2PAd';
import Notification from '../models/Notification';

export const startP2PExpiryWorker = () => {
    console.log('[P2PExpiryWorker] Starting...');

    // Run every 30 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            const expiredOrders = await P2POrder.find({ status: 'pending_payment', expiresAt: { $lt: now } });
            if (!expiredOrders || expiredOrders.length === 0) return;

            for (const order of expiredOrders) {
                try {
                    // Refund escrow to seller (unlock crypto)
                    if (order.seller) {
                        await User.findByIdAndUpdate(order.seller, { $inc: { balance: order.cryptoAmount } });
                    }

                    // Restore ad availability
                    const ad = await P2PAd.findById(order.ad);
                    if (ad) {
                        ad.filledAmount = Math.max(0, (ad.filledAmount || 0) - (order.cryptoAmount || 0));
                        if (ad.status === 'completed') ad.status = 'active';
                        await ad.save();
                    }

                    // Mark order expired and add system message
                    order.status = 'expired';
                    order.cancelledAt = new Date();
                    order.cancelReason = 'Expired: payment time limit exceeded';
                    order.messages = order.messages || [];
                    order.messages.push({ sender: null, text: 'Order expired: payment not received within the time limit.', type: 'system' } as any);
                    await order.save();

                    // Create a notification (best-effort)
                    try {
                        await Notification.create({
                            title: 'P2P Order Expired',
                            description: `Order ${order.orderNumber || order._id} expired due to payment timeout.`,
                            type: 'system',
                            targetAudience: 'all',
                            status: 'sent',
                            sentAt: new Date(),
                            recipients: [
                                { user: order.buyer, status: 'delivered', deliveredAt: new Date() },
                                { user: order.seller, status: 'delivered', deliveredAt: new Date() },
                            ],
                        });
                    } catch (e) {
                        // ignore notification errors
                        console.error('[P2PExpiryWorker] Notification error:', e);
                    }

                    console.log(`[P2PExpiryWorker] Expired order ${order._id} processed.`);
                } catch (e) {
                    console.error('[P2PExpiryWorker] Failed processing order', order._id, e);
                }
            }
        } catch (error) {
            console.error('[P2PExpiryWorker] Error scanning orders:', error);
        }
    }, 30000);
};

export default startP2PExpiryWorker;
