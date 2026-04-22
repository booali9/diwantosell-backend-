"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCleanupStaleSells = exports.runLiquidations = exports.adminAdjustLiquidationPrice = exports.adminManualLiquidate = exports.adminGetAtRiskTrades = exports.adminGetLiquidations = exports.adminGetLiquidationStats = exports.adminCloseTrade = exports.adminOpenTradeForUser = exports.adminGetAllTrades = exports.adminModifyEntryPrice = exports.closeTrade = exports.getMyOpenTrades = exports.openTrade = exports.getDetailedMarketPrices = exports.getMarketPrices = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Trade_1 = __importDefault(require("../models/Trade"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Notification_1 = __importDefault(require("../models/Notification"));
const priceService_1 = require("../utils/priceService");
const auditLog_1 = require("../utils/auditLog");
// @desc    Get live market prices for multiple assets
// @route   GET /api/trades/prices
// @access  Public
const getMarketPrices = async (req, res) => {
    try {
        const symbols = req.query.symbols?.split(',') || ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'];
        const prices = await (0, priceService_1.getMultiplePrices)(symbols);
        res.json(prices);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch prices', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getMarketPrices = getMarketPrices;
// @desc    Get detailed market data (price, 24h change, volume, market cap)
// @route   GET /api/trades/market-data
// @access  Public
const getDetailedMarketPrices = async (req, res) => {
    try {
        const symbols = req.query.symbols?.split(',') || [
            'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
            'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
            'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'NEAR/USDT', 'APT/USDT',
            'OP/USDT', 'ARB/USDT', 'MATIC/USDT'
        ];
        const data = await (0, priceService_1.getDetailedMarketData)(symbols);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch market data', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getDetailedMarketPrices = getDetailedMarketPrices;
// @desc    Open a new trade
// @route   POST /api/trades/open
// @access  Private
const openTrade = async (req, res) => {
    try {
        const { asset, type, side, amount, leverage, orderType, limitPrice, price: providedPrice, entryPrice: providedEntryPrice } = req.body;
        if (!asset || !type || !side || !amount) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        const isLimit = orderType === 'limit';
        if (isLimit && (!limitPrice || isNaN(Number(limitPrice)) || Number(limitPrice) <= 0)) {
            return res.status(400).json({ message: 'A valid limit price is required for limit orders' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const effectLeverage = leverage || 1;
        // For limit orders use limit price; for market orders use provided price (stocks/commodities)
        // or fall back to live crypto price lookup
        const clientPrice = providedPrice || providedEntryPrice;
        const priceForMargin = isLimit
            ? Number(limitPrice)
            : (clientPrice && Number(clientPrice) > 0 ? Number(clientPrice) : await (0, priceService_1.getCryptoPrice)(asset));
        const marginUsed = (amount * priceForMargin) / effectLeverage;
        // Futures trades: validate and deduct from futuresBalance (DB-authoritative).
        // Spot trades: deduct/credit spot balance based on order side.
        if (type === 'futures') {
            if ((user.futuresBalance || 0) < marginUsed) {
                return res.status(400).json({
                    message: `Insufficient futures balance. Required: $${marginUsed.toFixed(2)}, Available: $${(user.futuresBalance || 0).toFixed(2)}. Please transfer funds from Spot to Futures first.`
                });
            }
            user.futuresBalance = parseFloat(((user.futuresBalance || 0) - marginUsed).toFixed(8));
            await user.save();
        }
        else {
            const isBuyOrder = side === 'buy' || side === 'long';
            if (isBuyOrder) {
                // BUY: user spends USDT — validate sufficient balance and deduct
                if (user.balance < marginUsed) {
                    return res.status(400).json({ message: 'Insufficient balance for margin' });
                }
                user.balance -= marginUsed;
            }
            else {
                // SELL: validate user actually holds enough coins before crediting USDT.
                // Only open BUY trades represent real holdings — sells are closed immediately
                // on creation, so we only need to sum open buys.
                const openBuys = await Trade_1.default.find({
                    user: user._id, asset, type: 'spot', status: 'open', side: { $in: ['buy', 'long'] },
                }).sort({ createdAt: 1 }); // oldest first (FIFO)
                const netHolding = openBuys.reduce((s, t) => s + t.amount, 0);
                if (amount > netHolding + 1e-8) {
                    const sym = asset.split('/')[0];
                    return res.status(400).json({
                        message: `Insufficient ${sym} balance. You hold ${netHolding.toFixed(8)} but tried to sell ${amount}.`,
                    });
                }
                // Deduct sold coins from open buy trades (FIFO) so holdings reflect the sale.
                let remaining = amount;
                for (const buyTrade of openBuys) {
                    if (remaining <= 1e-8)
                        break;
                    if (buyTrade.amount <= remaining + 1e-8) {
                        // Fully consumed — close this buy trade
                        remaining -= buyTrade.amount;
                        buyTrade.status = 'closed';
                        buyTrade.closePrice = priceForMargin;
                        buyTrade.pnl = parseFloat(((priceForMargin - buyTrade.entryPrice) * buyTrade.amount).toFixed(2));
                        buyTrade.closedAt = new Date();
                        await buyTrade.save();
                    }
                    else {
                        // Partially consumed — reduce amount on this buy trade
                        const soldFromThis = remaining;
                        remaining = 0;
                        buyTrade.amount = parseFloat((buyTrade.amount - soldFromThis).toFixed(8));
                        buyTrade.marginUsed = parseFloat(((buyTrade.amount * buyTrade.entryPrice) / buyTrade.leverage).toFixed(8));
                        await buyTrade.save();
                    }
                }
                if (!isLimit) {
                    // Market SELL: credit USDT immediately
                    user.balance += marginUsed;
                }
            }
            // Limit SELL: no balance change until order is filled or cancelled
            await user.save();
        }
        const tradeStatus = isLimit ? 'pending' : 'open';
        // Spot market sells are instant — USDT was already credited above.
        // Mark them 'closed' immediately so they never pollute open-trade queries.
        const isSellOrder = side === 'sell' || side === 'short';
        const effectiveStatus = (!isLimit && type === 'spot' && isSellOrder) ? 'closed' : tradeStatus;
        const entryPrice = isLimit ? Number(limitPrice) : priceForMargin;
        const trade = await Trade_1.default.create({
            user: user._id,
            asset,
            type,
            side,
            amount,
            leverage: effectLeverage,
            entryPrice,
            marginUsed,
            orderType: isLimit ? 'limit' : 'market',
            ...(isLimit ? { limitPrice: Number(limitPrice) } : {}),
            status: effectiveStatus,
            ...(effectiveStatus === 'closed' ? { closedAt: new Date(), pnl: 0 } : {}),
            ...(type === 'futures' && effectLeverage > 1 && !isLimit ? {
                liquidationPrice: (() => {
                    const direction = (side === 'buy' || side === 'long') ? 1 : -1;
                    return parseFloat((entryPrice * (1 - (direction / effectLeverage))).toFixed(2));
                })(),
            } : {}),
        });
        res.status(201).json({
            message: isLimit ? 'Limit order placed successfully' : 'Trade opened successfully',
            trade,
            newBalance: user.balance
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.openTrade = openTrade;
// @desc    Get user's open trades with live P&L
// @route   GET /api/trades
// @access  Private
const getMyOpenTrades = async (req, res) => {
    try {
        const status = req.query.status;
        // Support comma-separated status values e.g. ?status=closed,liquidated
        let query;
        if (!status) {
            query = { user: req.user._id, status: { $in: ['open', 'pending'] } };
        }
        else if (status.includes(',')) {
            query = { user: req.user._id, status: { $in: status.split(',').map(s => s.trim()) } };
        }
        else {
            query = { user: req.user._id, status };
        }
        const trades = await Trade_1.default.find(query).sort({ createdAt: -1 });
        // Fetch live prices for all unique assets using market-aware routing
        const uniqueAssets = [...new Set(trades.map(t => t.asset))];
        const livePrices = {};
        // Build a map of asset → market so we route to the correct price service
        const assetMarketMap = {};
        for (const trade of trades) {
            if (!assetMarketMap[trade.asset])
                assetMarketMap[trade.asset] = trade.market || 'crypto';
        }
        await Promise.all(uniqueAssets.map(async (asset) => {
            try {
                const market = assetMarketMap[asset];
                // Commodities and stocks must use getStockPrice (Yahoo Finance)
                // to avoid receiving micro-cap crypto token prices from CoinGecko
                if (market === 'commodities' || market === 'stock') {
                    const coin = asset.split('/')[0].toUpperCase();
                    const sp = await (0, priceService_1.getStockPrice)(coin);
                    livePrices[asset] = sp > 0 ? sp : 0;
                }
                else {
                    livePrices[asset] = await (0, priceService_1.getCryptoPrice)(asset);
                }
            }
            catch {
                livePrices[asset] = 0;
            }
        }));
        // Real-time liquidation check: auto-liquidate any trade whose price crossed the liquidation level
        const liquidatedNow = new Set();
        for (const trade of trades) {
            if (trade.status !== 'open' || trade.type !== 'futures' || trade.leverage <= 1)
                continue;
            const currentPrice = livePrices[trade.asset];
            if (!currentPrice || currentPrice === 0)
                continue;
            const isLong = trade.side === 'buy' || trade.side === 'long';
            const liqPrice = trade.liquidationPrice ||
                trade.entryPrice * (1 - ((isLong ? 1 : -1) / trade.leverage));
            const shouldLiquidate = isLong ? currentPrice <= liqPrice : currentPrice >= liqPrice;
            if (!shouldLiquidate)
                continue;
            try {
                trade.status = 'liquidated';
                trade.closePrice = currentPrice;
                trade.pnl = -trade.marginUsed;
                trade.liquidatedAt = new Date();
                trade.liquidatedBy = 'system';
                await trade.save();
                liquidatedNow.add(trade._id.toString());
                const tradeUser = await User_1.default.findById(trade.user);
                if (tradeUser) {
                    // Margin is already deducted; no balance change on liquidation
                    await tradeUser.save();
                }
                await Notification_1.default.create({
                    title: 'Position Liquidated',
                    description: `Your ${trade.asset} ${isLong ? 'LONG' : 'SHORT'} position (${trade.leverage}x) was liquidated at $${currentPrice.toFixed(2)}. Margin lost: $${trade.marginUsed.toFixed(2)}`,
                    type: 'transaction', targetAudience: 'all', status: 'sent', sentAt: new Date(),
                    recipients: [{ user: trade.user, status: 'delivered', deliveredAt: new Date() }],
                }).catch(() => { });
            }
            catch (liqErr) {
                console.error('[getMyOpenTrades] Real-time liquidation failed:', liqErr);
            }
        }
        // Calculate live P&L for each trade (exclude just-liquidated ones)
        // Correct formula: PnL = (currentPrice - entryPrice) * amount  [NO leverage multiplier]
        // Leverage only reduces *required margin*, not P&L magnitude.
        const tradesWithPnL = trades
            .filter(t => !liquidatedNow.has(t._id.toString()))
            .map(trade => {
            const currentPrice = livePrices[trade.asset] || trade.entryPrice;
            // Use stored liquidation price or compute it
            const isLong = trade.side === 'buy' || trade.side === 'long';
            let liquidationPrice = null;
            if (trade.type === 'futures' && trade.leverage > 1) {
                liquidationPrice = trade.liquidationPrice ??
                    parseFloat((trade.entryPrice * (1 - ((isLong ? 1 : -1) / trade.leverage))).toFixed(2));
            }
            // Only compute live unrealizedPnL for open trades.
            // For closed/liquidated/pending trades return null so the frontend falls back
            // to the stored `pnl` field instead of overriding it with 0.
            if (trade.status !== 'open') {
                const storedPnl = trade.pnl ?? 0;
                const pnlPercentage = trade.marginUsed > 0 ? (storedPnl / trade.marginUsed) * 100 : 0;
                return {
                    ...trade.toObject(),
                    currentPrice,
                    unrealizedPnL: null,
                    pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
                    liquidationPrice,
                };
            }
            let unrealizedPnL;
            if (isLong) {
                unrealizedPnL = (currentPrice - trade.entryPrice) * trade.amount;
            }
            else {
                unrealizedPnL = (trade.entryPrice - currentPrice) * trade.amount;
            }
            // Cap loss at -marginUsed (can never lose more than your margin)
            unrealizedPnL = Math.max(unrealizedPnL, -trade.marginUsed);
            const pnlPercentage = trade.marginUsed > 0 ? (unrealizedPnL / trade.marginUsed) * 100 : 0;
            return {
                ...trade.toObject(),
                currentPrice,
                unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
                pnlPercentage: parseFloat(Math.max(pnlPercentage, -100).toFixed(2)),
                liquidationPrice,
            };
        });
        res.json(tradesWithPnL);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getMyOpenTrades = getMyOpenTrades;
// @desc    Close a trade
// @route   POST /api/trades/:id/close
// @access  Private
const closeTrade = async (req, res) => {
    try {
        const trade = await Trade_1.default.findById(req.params.id);
        if (!trade || (trade.status !== 'open' && trade.status !== 'pending')) {
            return res.status(404).json({ message: 'Open trade not found' });
        }
        if (trade.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Cancelling a pending limit order — refund reserved margin (buys only; sells had no USDT reserved)
        if (trade.status === 'pending') {
            trade.status = 'closed';
            trade.pnl = 0;
            trade.closedAt = new Date();
            await trade.save();
            // Refund locked margin back to the originating wallet.
            if (trade.type === 'futures') {
                user.futuresBalance = parseFloat((Math.max(0, (user.futuresBalance || 0) + trade.marginUsed)).toFixed(8));
                await user.save();
            }
            else {
                const isBuyOrder = trade.side === 'buy' || trade.side === 'long';
                if (isBuyOrder) {
                    // Buy limit cancel: refund the USDT that was reserved on open
                    user.balance += trade.marginUsed;
                }
                // Sell limit cancel: no balance change (no USDT was charged on open)
                await user.save();
            }
            return res.json({ message: 'Limit order cancelled, margin refunded', trade, newBalance: user.balance, newFuturesBalance: user.futuresBalance || 0 });
        }
        // Fetch closing price; fall back to entry price if price service is unavailable
        // so the trade is never permanently stuck in an un-closable state.
        let closingPrice;
        try {
            closingPrice = await (0, priceService_1.getCryptoPrice)(trade.asset);
        }
        catch {
            closingPrice = trade.entryPrice;
        }
        // Correct P&L formula: (price change) × notional amount  [NO leverage multiplier]
        let pnl = 0;
        if (trade.side === 'buy' || trade.side === 'long') {
            pnl = (closingPrice - trade.entryPrice) * trade.amount;
        }
        else {
            pnl = (trade.entryPrice - closingPrice) * trade.amount;
        }
        // P&L can never exceed the notional gain or go below -marginUsed
        pnl = Math.max(pnl, -trade.marginUsed);
        trade.status = 'closed';
        trade.closePrice = closingPrice;
        trade.pnl = pnl;
        trade.closedAt = new Date();
        await trade.save();
        // Return funds to the originating wallet based on trade type.
        // Futures trades: credit futuresBalance with margin + pnl (DB-authoritative).
        // Spot trades: credit spot balance for buy-side closes.
        if (trade.type === 'futures') {
            const returnAmount = Math.max(0, trade.marginUsed + pnl);
            user.futuresBalance = parseFloat((Math.max(0, (user.futuresBalance || 0) + returnAmount)).toFixed(8));
            await user.save();
        }
        else {
            const isBuyOrder = trade.side === 'buy' || trade.side === 'long';
            if (isBuyOrder) {
                // Buy close: margin was deducted on open — return margin + pnl
                const returnAmount = Math.max(0, trade.marginUsed + pnl);
                user.balance += returnAmount;
            }
            // Market sell close: USDT was already credited when the sell was opened;
            // no further balance change needed (pnl stored on trade record for history display)
            await user.save();
        }
        res.json({
            message: 'Trade closed successfully',
            trade,
            newBalance: user.balance,
            newFuturesBalance: user.futuresBalance || 0
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.closeTrade = closeTrade;
// @desc    Admin: Modify trade entry price
// @route   PUT /api/admin/trades/:id/entry-price
// @access  Private (Admin Only)
const adminModifyEntryPrice = async (req, res) => {
    try {
        const { entryPrice, adminNote } = req.body;
        if (!entryPrice) {
            return res.status(400).json({ message: 'Please provide a new entry price' });
        }
        const trade = await Trade_1.default.findById(req.params.id).populate('user', 'name email');
        if (!trade || trade.status !== 'open') {
            return res.status(404).json({ message: 'Open trade not found' });
        }
        const oldEntryPrice = trade.entryPrice;
        trade.entryPrice = Number(entryPrice);
        // Recalculate amount (coin units) to keep consistent with the invariant:
        //   amount = (marginUsed × leverage) / entryPrice
        // Without this, PnL = (marketPrice - newEntryPrice) × amount would use
        // the coin count from the original entry price, which is wrong.
        trade.amount = parseFloat(((trade.marginUsed * trade.leverage) / Number(entryPrice)).toFixed(8));
        // Recalculate liquidation price based on new entry price (for futures with leverage)
        if (trade.type === 'futures' && trade.leverage > 1) {
            const direction = (trade.side === 'buy' || trade.side === 'long') ? 1 : -1;
            trade.liquidationPrice = parseFloat((Number(entryPrice) * (1 - (direction / trade.leverage))).toFixed(2));
        }
        trade.adminNote = adminNote || `Entry price changed from $${oldEntryPrice} to $${entryPrice}`;
        await trade.save();
        await (0, auditLog_1.createAuditLog)({
            action: 'trade_entry_modified',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: trade.user?._id?.toString() || trade.user?.toString(),
            targetResource: trade._id?.toString(),
            details: { oldEntryPrice, newEntryPrice: Number(entryPrice), newLiquidationPrice: trade.liquidationPrice ?? null, adminNote },
        });
        // Compute live PnL with new entry price for immediate feedback
        let liveCurrentPrice = null;
        let newUnrealizedPnL = null;
        let newPnlPercentage = null;
        try {
            liveCurrentPrice = await (0, priceService_1.getCryptoPrice)(trade.asset);
            const direction = (trade.side === 'buy' || trade.side === 'long') ? 1 : -1;
            newUnrealizedPnL = parseFloat((direction === 1
                ? (liveCurrentPrice - trade.entryPrice) * trade.amount
                : (trade.entryPrice - liveCurrentPrice) * trade.amount).toFixed(2));
            newUnrealizedPnL = Math.max(newUnrealizedPnL, -trade.marginUsed);
            newPnlPercentage = trade.marginUsed > 0
                ? parseFloat(((newUnrealizedPnL / trade.marginUsed) * 100).toFixed(2))
                : 0;
        }
        catch {
            // Price fetch is best-effort
        }
        res.json({
            message: 'Entry price modified successfully',
            trade,
            oldEntryPrice,
            newEntryPrice: trade.entryPrice,
            newLiquidationPrice: trade.liquidationPrice ?? null,
            currentMarketPrice: liveCurrentPrice,
            newUnrealizedPnL,
            newPnlPercentage,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminModifyEntryPrice = adminModifyEntryPrice;
// @desc    Admin: Get all trades with live P&L
// @route   GET /api/admin/trades
// @access  Private (Admin Only)
const adminGetAllTrades = async (req, res) => {
    try {
        const trades = await Trade_1.default.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        // Fetch live prices for open trade assets using market-aware routing
        const openTrades = trades.filter(t => t.status === 'open');
        const uniqueAssets = [...new Set(openTrades.map(t => t.asset))];
        const livePrices = {};
        // Build a map of asset → market for correct price routing
        const assetMarketMap = {};
        for (const trade of openTrades) {
            if (!assetMarketMap[trade.asset])
                assetMarketMap[trade.asset] = trade.market || 'crypto';
        }
        await Promise.all(uniqueAssets.map(async (asset) => {
            try {
                const market = assetMarketMap[asset];
                if (market === 'commodities' || market === 'stock') {
                    const coin = asset.split('/')[0].toUpperCase();
                    const sp = await (0, priceService_1.getStockPrice)(coin);
                    livePrices[asset] = sp > 0 ? sp : 0;
                }
                else {
                    livePrices[asset] = await (0, priceService_1.getCryptoPrice)(asset);
                }
            }
            catch {
                livePrices[asset] = 0;
            }
        }));
        const tradesWithPnL = trades.map(trade => {
            if (trade.status !== 'open') {
                return { ...trade.toObject(), currentPrice: trade.closePrice || trade.entryPrice, unrealizedPnL: trade.pnl, pnlPercentage: trade.marginUsed > 0 ? (trade.pnl / trade.marginUsed) * 100 : 0 };
            }
            const currentPrice = livePrices[trade.asset] || trade.entryPrice;
            let unrealizedPnL = 0;
            if (trade.side === 'buy' || trade.side === 'long') {
                unrealizedPnL = (currentPrice - trade.entryPrice) * trade.amount;
            }
            else {
                unrealizedPnL = (trade.entryPrice - currentPrice) * trade.amount;
            }
            unrealizedPnL = Math.max(unrealizedPnL, -trade.marginUsed);
            const pnlPercentage = trade.marginUsed > 0 ? (unrealizedPnL / trade.marginUsed) * 100 : 0;
            return {
                ...trade.toObject(),
                currentPrice,
                unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
                pnlPercentage: parseFloat(Math.max(pnlPercentage, -100).toFixed(2)),
            };
        });
        res.json(tradesWithPnL);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminGetAllTrades = adminGetAllTrades;
// @desc    Admin: Open trade on behalf of user
// @route   POST /api/admin/trades/open-for-user
// @access  Private (Admin Only)
const adminOpenTradeForUser = async (req, res) => {
    try {
        const { userId, asset, type, market, side, amount, leverage, entryPrice } = req.body;
        if (!userId || !asset || !type || !side || !amount) {
            return res.status(400).json({ message: 'userId, asset, type, side, and amount are required' });
        }
        if (!mongoose_1.default.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid userId — must be a valid MongoDB ObjectId' });
        }
        const numAmount = Number(amount);
        const numLeverage = leverage ? Number(leverage) : 1;
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }
        if (isNaN(numLeverage) || numLeverage < 1) {
            return res.status(400).json({ message: 'Leverage must be a positive number' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        let price;
        try {
            price = entryPrice ? Number(entryPrice) : await (0, priceService_1.getCryptoPrice)(asset);
        }
        catch (priceError) {
            return res.status(400).json({
                message: `Unable to fetch live price for ${asset}. Please provide an entry price manually.`,
                error: priceError instanceof Error ? priceError.message : 'Price service unavailable'
            });
        }
        if (!price || price <= 0) {
            return res.status(400).json({ message: 'Invalid price. Please provide a valid entry price.' });
        }
        const marginUsed = (numAmount * price) / numLeverage;
        // For futures trades: must have sufficient futuresBalance — no spot fallback.
        if (type === 'futures') {
            const availableFutures = user.futuresBalance || 0;
            if (availableFutures < marginUsed) {
                return res.status(400).json({
                    message: `Insufficient futures balance. Required: $${marginUsed.toFixed(2)}, Available: $${availableFutures.toFixed(2)}. Transfer funds from Spot to Futures wallet first.`
                });
            }
            user.futuresBalance = parseFloat((availableFutures - marginUsed).toFixed(8));
            await user.save();
        }
        else {
            const adminIsBuy = side === 'buy' || side === 'long';
            if (adminIsBuy) {
                if (user.balance < marginUsed) {
                    return res.status(400).json({ message: `Insufficient user balance. Required: $${marginUsed.toFixed(2)}, Available: $${user.balance.toFixed(2)}` });
                }
                user.balance -= marginUsed;
            }
            else {
                // Admin opening a sell: credit USDT for the coins being sold
                user.balance += marginUsed;
            }
            await user.save();
        }
        const trade = await Trade_1.default.create({
            user: user._id,
            asset,
            type,
            market: market || 'crypto',
            side,
            amount: numAmount,
            leverage: numLeverage,
            entryPrice: price,
            marginUsed,
            status: 'open',
            adminNote: 'Trade opened by admin',
            ...(type === 'futures' && numLeverage > 1 ? {
                liquidationPrice: (() => {
                    const direction = (side === 'buy' || side === 'long') ? 1 : -1;
                    return parseFloat((price * (1 - (direction / numLeverage))).toFixed(2));
                })(),
            } : {}),
        });
        const populatedTrade = await Trade_1.default.findById(trade._id).populate('user', 'name email');
        res.status(201).json({
            message: 'Trade opened for user successfully',
            trade: populatedTrade,
            newBalance: user.balance,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminOpenTradeForUser = adminOpenTradeForUser;
// @desc    Admin: Force close a trade
// @route   POST /api/admin/trades/:id/close
// @access  Private (Admin Only)
const adminCloseTrade = async (req, res) => {
    try {
        const trade = await Trade_1.default.findById(req.params.id);
        if (!trade || trade.status !== 'open') {
            return res.status(404).json({ message: 'Open trade not found' });
        }
        const user = await User_1.default.findById(trade.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const closingPrice = req.body.closePrice ? Number(req.body.closePrice) : await (0, priceService_1.getCryptoPrice)(trade.asset);
        let pnl = 0;
        if (trade.side === 'buy' || trade.side === 'long') {
            pnl = (closingPrice - trade.entryPrice) * trade.amount;
        }
        else {
            pnl = (trade.entryPrice - closingPrice) * trade.amount;
        }
        pnl = Math.max(pnl, -trade.marginUsed);
        trade.status = 'closed';
        trade.closePrice = closingPrice;
        trade.pnl = pnl;
        trade.closedAt = new Date();
        trade.adminNote = req.body.adminNote || 'Trade closed by admin';
        await trade.save();
        // Credit margin + pnl back to the correct wallet.
        // Futures: credit futuresBalance (DB-authoritative). Spot: credit spot balance.
        if (trade.type === 'futures') {
            const returnAmount = Math.max(0, trade.marginUsed + pnl);
            user.futuresBalance = parseFloat((Math.max(0, (user.futuresBalance || 0) + returnAmount)).toFixed(8));
            await user.save();
        }
        else {
            const returnAmount = Math.max(0, trade.marginUsed + pnl);
            user.balance += returnAmount;
            await user.save();
        }
        const populatedTrade = await Trade_1.default.findById(trade._id).populate('user', 'name email');
        res.json({
            message: 'Trade closed by admin',
            trade: populatedTrade,
            newBalance: user.balance,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminCloseTrade = adminCloseTrade;
// ==================== LIQUIDATION ENDPOINTS ====================
// @desc    Admin: Get liquidation statistics
// @route   GET /api/admin/liquidations/stats
// @access  Private (Admin Only)
const adminGetLiquidationStats = async (req, res) => {
    try {
        const totalLiquidated = await Trade_1.default.countDocuments({ status: 'liquidated' });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const liquidatedToday = await Trade_1.default.countDocuments({ status: 'liquidated', updatedAt: { $gte: todayStart } });
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const liquidatedWeek = await Trade_1.default.countDocuments({ status: 'liquidated', updatedAt: { $gte: last7Days } });
        // Total margin lost to liquidations
        const marginStats = await Trade_1.default.aggregate([
            { $match: { status: 'liquidated' } },
            { $group: { _id: null, totalMarginLost: { $sum: '$marginUsed' }, totalPnL: { $sum: '$pnl' } } },
        ]);
        const totalMarginLost = marginStats[0]?.totalMarginLost || 0;
        // At-risk trades (open futures with >70% margin used)
        const openFutures = await Trade_1.default.find({ status: 'open', type: 'futures', leverage: { $gt: 1 } });
        const uniqueAssets = [...new Set(openFutures.map(t => t.asset))];
        const livePrices = {};
        await Promise.all(uniqueAssets.map(async (asset) => {
            try {
                livePrices[asset] = await (0, priceService_1.getCryptoPrice)(asset);
            }
            catch {
                livePrices[asset] = 0;
            }
        }));
        let atRiskCount = 0;
        for (const trade of openFutures) {
            const currentPrice = livePrices[trade.asset];
            if (!currentPrice)
                continue;
            const isLong = trade.side === 'buy' || trade.side === 'long';
            const unrealizedPnL = Math.max(isLong
                ? (currentPrice - trade.entryPrice) * trade.amount
                : (trade.entryPrice - currentPrice) * trade.amount, -trade.marginUsed);
            const marginRatio = (trade.marginUsed + unrealizedPnL) / trade.marginUsed;
            if (marginRatio < 0.3)
                atRiskCount++;
        }
        res.json({
            totalLiquidated,
            liquidatedToday,
            liquidatedWeek,
            totalMarginLost: parseFloat(totalMarginLost.toFixed(2)),
            atRiskTrades: atRiskCount,
            openFuturesCount: openFutures.length,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminGetLiquidationStats = adminGetLiquidationStats;
// @desc    Admin: Get all liquidated trades
// @route   GET /api/admin/liquidations
// @access  Private (Admin Only)
const adminGetLiquidations = async (req, res) => {
    try {
        const { page = 1, limit = 50, asset, liquidatedBy, search } = req.query;
        const filter = { status: 'liquidated' };
        if (asset)
            filter.asset = asset;
        if (liquidatedBy)
            filter.liquidatedBy = liquidatedBy;
        const trades = await Trade_1.default.find(filter)
            .populate('user', 'name email')
            .sort({ updatedAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await Trade_1.default.countDocuments(filter);
        // If search, filter by user name/email
        let filtered = trades;
        if (search) {
            const s = search.toLowerCase();
            filtered = trades.filter(t => {
                const u = t.user;
                return u?.name?.toLowerCase().includes(s) || u?.email?.toLowerCase().includes(s);
            });
        }
        res.json({
            trades: filtered,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminGetLiquidations = adminGetLiquidations;
// @desc    Admin: Get at-risk futures trades (near liquidation)
// @route   GET /api/admin/liquidations/at-risk
// @access  Private (Admin Only)
const adminGetAtRiskTrades = async (req, res) => {
    try {
        const openFutures = await Trade_1.default.find({ status: 'open', type: 'futures', leverage: { $gt: 1 } })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        const uniqueAssets = [...new Set(openFutures.map(t => t.asset))];
        const livePrices = {};
        await Promise.all(uniqueAssets.map(async (asset) => {
            try {
                livePrices[asset] = await (0, priceService_1.getCryptoPrice)(asset);
            }
            catch {
                livePrices[asset] = 0;
            }
        }));
        const atRiskTrades = openFutures.map(trade => {
            const currentPrice = livePrices[trade.asset] || trade.entryPrice;
            const direction = (trade.side === 'buy' || trade.side === 'long') ? 1 : -1;
            const liquidationPrice = trade.liquidationPrice || trade.entryPrice * (1 - (direction / trade.leverage));
            const unrealizedPnL = Math.max(direction === 1
                ? (currentPrice - trade.entryPrice) * trade.amount
                : (trade.entryPrice - currentPrice) * trade.amount, -trade.marginUsed);
            const marginRatio = trade.marginUsed > 0 ? (trade.marginUsed + unrealizedPnL) / trade.marginUsed : 1;
            const distanceToLiquidation = Math.abs(currentPrice - liquidationPrice) / currentPrice * 100;
            return {
                ...trade.toObject(),
                currentPrice,
                liquidationPrice: parseFloat(liquidationPrice.toFixed(2)),
                unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
                marginRatio: parseFloat(marginRatio.toFixed(4)),
                distanceToLiquidation: parseFloat(distanceToLiquidation.toFixed(2)),
                pnlPercentage: trade.marginUsed > 0 ? parseFloat(((unrealizedPnL / trade.marginUsed) * 100).toFixed(2)) : 0,
            };
        }).filter(t => t.marginRatio < 0.5) // Show trades with < 50% remaining margin
            .sort((a, b) => a.marginRatio - b.marginRatio);
        res.json(atRiskTrades);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminGetAtRiskTrades = adminGetAtRiskTrades;
// @desc    Admin: Manually liquidate a trade
// @route   POST /api/admin/liquidations/:id/liquidate
// @access  Private (Admin Only)
const adminManualLiquidate = async (req, res) => {
    try {
        const trade = await Trade_1.default.findById(req.params.id).populate('user', 'name email');
        if (!trade || trade.status !== 'open') {
            return res.status(404).json({ message: 'Open trade not found' });
        }
        const currentPrice = await (0, priceService_1.getCryptoPrice)(trade.asset);
        trade.status = 'liquidated';
        trade.closePrice = currentPrice;
        trade.pnl = -trade.marginUsed;
        trade.liquidatedAt = new Date();
        trade.liquidatedBy = 'admin';
        trade.adminNote = req.body.adminNote || 'Manually liquidated by admin';
        await trade.save();
        // Create a transaction record for the liquidation
        await Transaction_1.default.create({
            user: trade.user._id || trade.user,
            type: 'trade_liquidation',
            asset: trade.asset,
            amount: trade.marginUsed,
            currency: 'USD',
            status: 'completed',
            adminNote: `Manually liquidated by admin: ${trade.asset} ${trade.side} ${trade.leverage}x`,
        });
        // Create notification for user
        try {
            await Notification_1.default.create({
                title: 'Trade Liquidated',
                description: `Your ${trade.asset} ${trade.side} position (${trade.leverage}x) has been liquidated. Margin lost: $${trade.marginUsed.toFixed(2)}`,
                type: 'transaction',
                targetAudience: 'all',
                status: 'sent',
                sentAt: new Date(),
                recipients: [{ user: trade.user._id || trade.user, status: 'delivered', deliveredAt: new Date() }],
            });
        }
        catch (e) {
            console.error('[Liquidation] Failed to create notification:', e);
        }
        // Audit log
        await (0, auditLog_1.createAuditLog)({
            action: 'trade_manual_liquidation',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: trade.user?._id?.toString() || trade.user?.toString(),
            targetResource: trade._id?.toString(),
            details: {
                asset: trade.asset,
                side: trade.side,
                leverage: trade.leverage,
                entryPrice: trade.entryPrice,
                closePrice: currentPrice,
                marginLost: trade.marginUsed,
                adminNote: trade.adminNote,
            },
        });
        res.json({
            message: 'Trade liquidated successfully',
            trade,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminManualLiquidate = adminManualLiquidate;
// @desc    Admin: Adjust liquidation price for a trade
// @route   PUT /api/admin/liquidations/:id/adjust
// @access  Private (Admin Only)
const adminAdjustLiquidationPrice = async (req, res) => {
    try {
        const { liquidationPrice, adminNote } = req.body;
        if (!liquidationPrice || liquidationPrice <= 0) {
            return res.status(400).json({ message: 'Please provide a valid liquidation price' });
        }
        const trade = await Trade_1.default.findById(req.params.id).populate('user', 'name email');
        if (!trade || trade.status !== 'open') {
            return res.status(404).json({ message: 'Open trade not found' });
        }
        if (trade.type !== 'futures' || trade.leverage <= 1) {
            return res.status(400).json({ message: 'Can only adjust liquidation price for leveraged futures trades' });
        }
        const oldLiqPrice = trade.liquidationPrice;
        const direction = (trade.side === 'buy' || trade.side === 'long') ? 1 : -1;
        const computedOld = oldLiqPrice || trade.entryPrice * (1 - (direction / trade.leverage));
        trade.liquidationPrice = Number(liquidationPrice);
        trade.adminNote = adminNote || `Liquidation price adjusted from $${computedOld.toFixed(2)} to $${liquidationPrice}`;
        await trade.save();
        await (0, auditLog_1.createAuditLog)({
            action: 'liquidation_price_adjusted',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            targetUser: trade.user?._id?.toString() || trade.user?.toString(),
            targetResource: trade._id?.toString(),
            details: {
                oldLiquidationPrice: computedOld,
                newLiquidationPrice: Number(liquidationPrice),
                adminNote,
            },
        });
        res.json({
            message: 'Liquidation price adjusted successfully',
            trade,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminAdjustLiquidationPrice = adminAdjustLiquidationPrice;
// @desc    Run liquidation checks on all open futures trades (cron-safe, no auth required with secret key)
// @route   POST /api/trades/run-liquidations
// @access  Internal / Vercel Cron (protected by CRON_SECRET header)
const runLiquidations = async (req, res) => {
    // Simple secret-key guard so this is not publicly abusable
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const openTrades = await Trade_1.default.find({ status: 'open', type: 'futures', leverage: { $gt: 1 } });
        const pendingTrades = await Trade_1.default.find({ status: 'pending', orderType: 'limit' });
        const allTrades = [...openTrades, ...pendingTrades];
        if (allTrades.length === 0)
            return res.json({ liquidated: 0, filled: 0 });
        const uniqueAssets = [...new Set(allTrades.map(t => t.asset))];
        const livePrices = {};
        await Promise.all(uniqueAssets.map(async (asset) => {
            try {
                livePrices[asset] = await (0, priceService_1.getCryptoPrice)(asset);
            }
            catch {
                livePrices[asset] = 0;
            }
        }));
        let liquidated = 0, filled = 0;
        for (const trade of allTrades) {
            const currentPrice = livePrices[trade.asset];
            if (!currentPrice || currentPrice === 0)
                continue;
            // Fill pending limit orders
            if (trade.status === 'pending' && trade.orderType === 'limit') {
                const limitPrice = trade.limitPrice;
                if (!limitPrice)
                    continue;
                const isLong = trade.side === 'buy' || trade.side === 'long';
                const shouldFill = isLong ? currentPrice <= limitPrice : currentPrice >= limitPrice;
                if (shouldFill) {
                    trade.status = 'open';
                    trade.entryPrice = limitPrice;
                    if (trade.type === 'futures' && trade.leverage > 1) {
                        const dir = isLong ? 1 : -1;
                        trade.liquidationPrice = parseFloat((limitPrice * (1 - (dir / trade.leverage))).toFixed(2));
                    }
                    await trade.save();
                    filled++;
                    await Notification_1.default.create({
                        title: 'Limit Order Filled',
                        description: `Your ${trade.asset} ${isLong ? 'LONG' : 'SHORT'} limit order filled at $${limitPrice.toFixed(2)}.`,
                        type: 'transaction', targetAudience: 'all', status: 'sent', sentAt: new Date(),
                        recipients: [{ user: trade.user, status: 'delivered', deliveredAt: new Date() }],
                    }).catch(() => { });
                }
                continue;
            }
            // Liquidate open futures trades that breached their liquidation price
            const isLong = trade.side === 'buy' || trade.side === 'long';
            const liqPrice = trade.liquidationPrice ||
                trade.entryPrice * (1 - ((isLong ? 1 : -1) / trade.leverage));
            const shouldLiquidate = isLong ? currentPrice <= liqPrice : currentPrice >= liqPrice;
            if (!shouldLiquidate)
                continue;
            trade.status = 'liquidated';
            trade.closePrice = currentPrice;
            trade.pnl = -trade.marginUsed;
            trade.liquidatedAt = new Date();
            trade.liquidatedBy = 'system';
            await trade.save();
            liquidated++;
            await Notification_1.default.create({
                title: 'Position Liquidated',
                description: `Your ${trade.asset} ${isLong ? 'LONG' : 'SHORT'} position (${trade.leverage}x) was liquidated at $${currentPrice.toFixed(2)}. Margin lost: $${trade.marginUsed.toFixed(2)}`,
                type: 'transaction', targetAudience: 'all', status: 'sent', sentAt: new Date(),
                recipients: [{ user: trade.user, status: 'delivered', deliveredAt: new Date() }],
            }).catch(() => { });
            await Transaction_1.default.create({
                user: trade.user,
                type: 'trade_liquidation',
                asset: trade.asset,
                amount: trade.marginUsed,
                currency: 'USD',
                status: 'completed',
                adminNote: `Auto-liquidated: ${trade.asset} ${trade.side} ${trade.leverage}x at $${currentPrice.toFixed(2)}`,
            }).catch(() => { });
        }
        res.json({ liquidated, filled, checked: allTrades.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.runLiquidations = runLiquidations;
// @desc    Admin: Close all stale open spot sell trades (one-time data cleanup)
// @route   POST /api/admin/trades/cleanup-sells
// @access  Private (Admin Only)
const adminCleanupStaleSells = async (req, res) => {
    try {
        const result = await Trade_1.default.updateMany({ type: 'spot', side: { $in: ['sell', 'short'] }, status: 'open' }, { $set: { status: 'closed', closedAt: new Date(), pnl: 0 } });
        await (0, auditLog_1.createAuditLog)({
            action: 'cleanup_stale_sells',
            performedBy: req.admin?._id?.toString() || 'unknown',
            performedByRole: 'admin',
            details: { modifiedCount: result.modifiedCount },
        });
        res.json({
            message: `Closed ${result.modifiedCount} stale open spot sell trades`,
            modifiedCount: result.modifiedCount,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.adminCleanupStaleSells = adminCleanupStaleSells;
