import Trade from '../models/Trade';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import { getCryptoPrice } from './priceService';
import { createAuditLog } from './auditLog';

/**
 * Liquidation Worker
 * Scans all open futures trades and closes them if they hit liquidation price.
 * Logs audit entries, creates transaction records, and notifies users.
 */
export const startLiquidationWorker = () => {
    console.log('[LiquidationWorker] Starting...');

    // Run every 30 seconds for more responsive liquidation
    setInterval(async () => {
        try {
            const openTrades = await Trade.find({ status: 'open', type: 'futures', leverage: { $gt: 1 } });
            const pendingTrades = await Trade.find({ status: 'pending', orderType: 'limit' });
            const allTrades = [...openTrades, ...pendingTrades];

            if (allTrades.length === 0) return;

            // Fetch prices for unique assets
            const uniqueAssets = [...new Set(allTrades.map(t => t.asset))];
            const livePrices: Record<string, number> = {};

            await Promise.all(uniqueAssets.map(async (asset) => {
                try {
                    livePrices[asset] = await getCryptoPrice(asset);
                } catch {
                    livePrices[asset] = 0;
                }
            }));

            for (const trade of allTrades) {
                const currentPrice = livePrices[trade.asset];
                if (!currentPrice || currentPrice === 0) continue;

                // --- Fill pending limit orders ---
                if ((trade as any).status === 'pending' && (trade as any).orderType === 'limit') {
                    const limitPrice = (trade as any).limitPrice;
                    if (!limitPrice) continue;

                    const isLong = trade.side === 'buy' || trade.side === 'long';
                    // A buy/long limit fills when market price drops to or below the limit price
                    // A sell/short limit fills when market price rises to or above the limit price
                    const shouldFill = isLong ? currentPrice <= limitPrice : currentPrice >= limitPrice;

                    if (shouldFill) {
                        console.log(`[LiquidationWorker] Filling limit order ${trade._id}. LimitPrice: ${limitPrice}, CurrentPrice: ${currentPrice}`);
                        trade.status = 'open';
                        trade.entryPrice = limitPrice;
                        if (trade.type === 'futures' && trade.leverage > 1) {
                            const direction = isLong ? 1 : -1;
                            (trade as any).liquidationPrice = parseFloat((limitPrice * (1 - (direction / trade.leverage))).toFixed(2));
                        }
                        await trade.save();

                        try {
                            await Notification.create({
                                title: 'Limit Order Filled',
                                description: `Your ${trade.asset} ${isLong ? 'Long' : 'Short'} limit order has been filled at $${limitPrice.toFixed(2)}.`,
                                type: 'transaction',
                                targetAudience: 'all',
                                status: 'sent',
                                sentAt: new Date(),
                                recipients: [{ user: trade.user, status: 'delivered', deliveredAt: new Date() }],
                            });
                        } catch (e) {
                            console.error('[LiquidationWorker] Failed to create limit fill notification:', e);
                        }
                    }
                    continue; // Skip liquidation logic for pending trades
                }

                const direction = (trade.side === 'buy' || trade.side === 'long') ? 1 : -1;
                // Use stored liquidation price if available, otherwise compute
                const liquidationPrice = trade.liquidationPrice || trade.entryPrice * (1 - (direction / trade.leverage));

                let isLiquidated = false;
                if (direction === 1) { // Long
                    if (currentPrice <= liquidationPrice) isLiquidated = true;
                } else { // Short
                    if (currentPrice >= liquidationPrice) isLiquidated = true;
                }

                if (isLiquidated) {
                    console.log(`[LiquidationWorker] Liquidating trade ${trade._id} for user ${trade.user}. Price: ${currentPrice}, Liquidation: ${liquidationPrice}`);

                    trade.status = 'liquidated';
                    trade.closePrice = currentPrice;
                    trade.pnl = -trade.marginUsed; // Total loss of margin
                    trade.liquidatedAt = new Date();
                    trade.liquidatedBy = 'system';
                    await trade.save();

                    // Create transaction record for the liquidation
                    try {
                        await Transaction.create({
                            user: trade.user,
                            type: 'trade_liquidation',
                            asset: trade.asset,
                            amount: trade.marginUsed,
                            currency: 'USD',
                            status: 'completed',
                            adminNote: `Auto-liquidated: ${trade.asset} ${trade.side} ${trade.leverage}x at $${currentPrice.toFixed(2)}`,
                        });
                    } catch (e) {
                        console.error('[LiquidationWorker] Failed to create transaction:', e);
                    }

                    // Create notification for user
                    try {
                        await Notification.create({
                            title: 'Position Liquidated',
                            description: `Your ${trade.asset} ${trade.side} position (${trade.leverage}x leverage) has been automatically liquidated at $${currentPrice.toFixed(2)}. Margin lost: $${trade.marginUsed.toFixed(2)}`,
                            type: 'transaction',
                            targetAudience: 'all',
                            status: 'sent',
                            sentAt: new Date(),
                            recipients: [{ user: trade.user, status: 'delivered', deliveredAt: new Date() }],
                        });
                    } catch (e) {
                        console.error('[LiquidationWorker] Failed to create notification:', e);
                    }

                    // Audit log
                    try {
                        await createAuditLog({
                            action: 'trade_auto_liquidation',
                            performedBy: 'system',
                            performedByRole: 'system',
                            targetUser: trade.user?.toString(),
                            targetResource: trade._id?.toString(),
                            details: {
                                asset: trade.asset,
                                side: trade.side,
                                leverage: trade.leverage,
                                entryPrice: trade.entryPrice,
                                closePrice: currentPrice,
                                liquidationPrice,
                                marginLost: trade.marginUsed,
                            },
                        });
                    } catch (e) {
                        console.error('[LiquidationWorker] Failed to create audit log:', e);
                    }
                }
            }
        } catch (error) {
            console.error('[LiquidationWorker] Error:', error);
        }
    }, 30000);
};
