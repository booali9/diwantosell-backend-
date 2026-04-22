"use strict";
/**
 * Market price service — fetches live crypto prices.
 * Uses CoinGecko Pro API with key, with Binance/MEXC/CoinCap as fallbacks.
 * Includes caching to reduce API calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDetailedMarketData = exports.getMultiplePrices = exports.getCryptoPrice = exports.getStockPrice = void 0;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
// Simple in-memory cache (TTL: 15 seconds)
const priceCache = {};
const CACHE_TTL = 15 * 1000; // 15 seconds
const fetchWithTimeout = async (url, timeout = 5000, headers) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(id);
        return response;
    }
    catch (e) {
        clearTimeout(id);
        throw e;
    }
};
// CoinGecko ID mapping for supported assets
const COINGECKO_ID_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'DOGE': 'dogecoin',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
    'NEAR': 'near',
    'APT': 'aptos',
    'OP': 'optimism',
    'ARB': 'arbitrum',
    'USDT': 'tether',
    'USDC': 'usd-coin',
};
// Yahoo Finance Fallback (No API key required for public endpoint)
const getStockPrice = async (symbol) => {
    try {
        // Handle common commodity mappings for Yahoo Finance
        const commodityMap = {
            'GOLD': 'GC=F',
            'SILVER': 'SI=F',
            'OIL': 'CL=F',
            'CRUDE OIL': 'CL=F',
            'XAU': 'GC=F',
            'XAG': 'SI=F',
            'WTI': 'CL=F',
            'WTIUSDT': 'CL=F',
            'XAUUSDT': 'GC=F',
            'XAGUSDT': 'SI=F',
            'XPT': 'PL=F',
            'XPTUSDT': 'PL=F',
            'PLATINUM': 'PL=F',
            'PLAT': 'PL=F',
            'NG': 'NG=F',
            'NGUSDT': 'NG=F',
            'NATGAS': 'NG=F',
            'NATURAL GAS': 'NG=F',
            'WHEAT': 'ZW=F',
            'CORN': 'ZC=F',
            'COPPER': 'HG=F',
            'COFFEE': 'KC=F',
            'SUGAR': 'SB=F',
        };
        // Fallback: map stock/commodity display names (stored in older trades) to Yahoo Finance tickers
        const nameToTickerMap = {
            'APPLE': 'AAPL', 'APPLE INC': 'AAPL', 'APPLE INC.': 'AAPL',
            'TESLA': 'TSLA',
            'MICROSOFT': 'MSFT',
            'NVIDIA': 'NVDA',
            'ALPHABET': 'GOOGL',
            'AMAZON': 'AMZN',
            'META': 'META',
            'NETFLIX': 'NFLX',
            'JPMORGAN': 'JPM', 'JP MORGAN': 'JPM', 'JPMORGAN CHASE': 'JPM',
            'VISA': 'V',
            'WALMART': 'WMT',
            'DISNEY': 'DIS',
            'AMD': 'AMD',
            'INTEL': 'INTC',
            'COINBASE': 'COIN',
            'PAYPAL': 'PYPL',
            'UBER': 'UBER',
            'ORACLE': 'ORCL',
            'SALESFORCE': 'CRM',
            'ALIBABA': 'BABA',
            'GOLDMAN SACHS': 'GS',
            'MORGAN STANLEY': 'MS',
            'BANK OF AMERICA': 'BAC',
            'EXXONMOBIL': 'XOM',
            'CHEVRON': 'CVX',
            'NIKE': 'NKE',
            'COCA-COLA': 'KO', 'COCACOLA': 'KO',
            'PEPSICO': 'PEP',
            'MCDONALDS': 'MCD', "MCDONALD'S": 'MCD',
            'STARBUCKS': 'SBUX',
            'JOHNSON & JOHNSON': 'JNJ',
            'PROCTER & GAMBLE': 'PG',
            'BOEING': 'BA',
            'PALANTIR': 'PLTR',
            'SNOWFLAKE': 'SNOW',
            'SPOTIFY': 'SPOT',
            'BLOCK': 'SQ', 'SQUARE': 'SQ',
            'ROBINHOOD': 'HOOD',
            'MICROSTRATEGY': 'MSTR',
            'ARM': 'ARM',
            'BROADCOM': 'AVGO',
            'QUALCOMM': 'QCOM',
            'MICRON': 'MU',
            'ADOBE': 'ADBE',
            'SERVICENOW': 'NOW',
            'ROBLOX': 'RBLX',
            // New stocks
            'ARAMCO': '2222.SR',
            'SAUDI ARAMCO': '2222.SR',
            'RTX': 'RTX',
            'RTX CORPORATION': 'RTX',
            'BRK-B': 'BRK-B',
            'BERKSHIRE HATHAWAY': 'BRK-B',
            'BERKSHIRE': 'BRK-B',
            'LLY': 'LLY',
            'ELI LILLY': 'LLY',
            'UNH': 'UNH',
            'UNITEDHEALTH': 'UNH',
            'HD': 'HD',
            'HOME DEPOT': 'HD',
            'COST': 'COST',
            'COSTCO': 'COST',
            'ABBV': 'ABBV',
            'ABBVIE': 'ABBV',
            'MRK': 'MRK',
            'MERCK': 'MRK',
            'TMO': 'TMO',
            'THERMO FISHER': 'TMO',
            'CSCO': 'CSCO',
            'CISCO': 'CSCO',
            'TMUS': 'TMUS',
            'T-MOBILE': 'TMUS',
            'TXN': 'TXN',
            'TEXAS INSTRUMENTS': 'TXN',
            'NVO': 'NVO',
            'NOVO NORDISK': 'NVO',
            'TM': 'TM',
            'TOYOTA': 'TM',
            'SAP': 'SAP',
            'SONY': 'SONY',
            'BHP': 'BHP',
            'LMT': 'LMT',
            'LOCKHEED MARTIN': 'LMT',
            'LOCKHEED': 'LMT',
            'CAT': 'CAT',
            'CATERPILLAR': 'CAT',
        };
        const cleanSymbol = symbol.split('/')[0].toUpperCase().trim();
        const yahooSymbol = commodityMap[cleanSymbol] || nameToTickerMap[cleanSymbol] || cleanSymbol;
        // Yahoo Finance requires a browser-like User-Agent — bare serverless requests get blocked
        const yahooHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
        };
        // Try query1 first, then query2 as fallback (Vercel IPs are sometimes blocked on one endpoint)
        const yahooUrls = [
            `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
            `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbol}`,
        ];
        for (const url of yahooUrls) {
            try {
                const response = await fetchWithTimeout(url, 6000, yahooHeaders);
                if (response.ok) {
                    const data = await response.json();
                    // v8/chart format
                    const chartPrice = data.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (chartPrice)
                        return parseFloat(chartPrice);
                    // v7/quote format
                    const quotePrice = data.quoteResponse?.result?.[0]?.regularMarketPrice;
                    if (quotePrice)
                        return parseFloat(quotePrice);
                }
            }
            catch { /* try next URL */ }
        }
    }
    catch (e) {
        console.warn(`Yahoo Finance fetch failed for ${symbol}:`, e instanceof Error ? e.message : e);
    }
    return 0;
};
exports.getStockPrice = getStockPrice;
const getCryptoPrice = async (symbol) => {
    const coin = symbol.split('/')[0].toUpperCase();
    const base = symbol.split('/')[1]?.toUpperCase() || 'USDT';
    const cacheKey = `${coin}/${base}`;
    // Check cache first
    const cached = priceCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.price;
    }
    const formattedSymbol = `${coin}${base}`;
    // 1. For non-crypto assets (stocks, commodities) try Yahoo Finance FIRST.
    // CoinGecko must NOT be tried for these because it will return micro-cap crypto
    // token prices for tickers like GOLD, SILVER, OIL, AAPL etc., which are near-zero
    // and cause catastrophically wrong PnL calculations.
    const isKnownCrypto = !!COINGECKO_ID_MAP[coin];
    if (!isKnownCrypto) {
        const stockPrice = await (0, exports.getStockPrice)(coin);
        if (stockPrice > 0) {
            priceCache[cacheKey] = { price: stockPrice, timestamp: Date.now() };
            return stockPrice;
        }
    }
    // 2. Try CoinGecko Pro API (only for known crypto assets)
    if (COINGECKO_API_KEY && isKnownCrypto) {
        try {
            const geckoId = COINGECKO_ID_MAP[coin];
            const vsCurrency = base === 'USDT' || base === 'USD' || base === 'USDC' ? 'usd' : base.toLowerCase();
            const response = await fetchWithTimeout(`https://pro-api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=${vsCurrency}`, 5000, { 'x-cg-pro-api-key': COINGECKO_API_KEY });
            if (response.ok) {
                const data = await response.json();
                if (data[geckoId] && data[geckoId][vsCurrency]) {
                    const price = parseFloat(data[geckoId][vsCurrency]);
                    priceCache[cacheKey] = { price, timestamp: Date.now() };
                    return price;
                }
            }
        }
        catch (e) {
            console.warn("CoinGecko Pro fetch failed:", e instanceof Error ? e.message : e);
        }
    }
    // 3. Try Binance Endpoints
    const binanceUrls = [
        `https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`,
        `https://api1.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`,
        `https://api.binance.us/api/v3/ticker/price?symbol=${formattedSymbol}`,
    ];
    for (const url of binanceUrls) {
        try {
            const response = await fetchWithTimeout(url);
            if (response.ok) {
                const data = await response.json();
                const price = parseFloat(data.price);
                priceCache[cacheKey] = { price, timestamp: Date.now() };
                return price;
            }
        }
        catch (e) {
            console.warn(`Binance fetch failed for ${url}:`, e instanceof Error ? e.message : e);
        }
    }
    // 4. Try MEXC
    try {
        const mexcUrl = `https://api.mexc.com/api/v3/ticker/price?symbol=${formattedSymbol}`;
        const response = await fetchWithTimeout(mexcUrl);
        if (response.ok) {
            const data = await response.json();
            const price = parseFloat(data.price);
            priceCache[cacheKey] = { price, timestamp: Date.now() };
            return price;
        }
    }
    catch (e) {
        console.warn("MEXC fetch failed:", e instanceof Error ? e.message : e);
    }
    // 5. Try CoinCap
    try {
        const idMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'USDT': 'tether', 'SOL': 'solana', 'BNB': 'binance-coin' };
        const id = idMap[coin] || coin.toLowerCase();
        const response = await fetchWithTimeout(`https://api.coincap.io/v2/assets/${id}`);
        if (response.ok) {
            const data = await response.json();
            const price = parseFloat(data.data.priceUsd);
            priceCache[cacheKey] = { price, timestamp: Date.now() };
            return price;
        }
    }
    catch (e) {
        console.warn("CoinCap fetch failed:", e instanceof Error ? e.message : e);
    }
    // 6. Try CoinGecko Public API (rate limited) — ONLY for known crypto assets.
    // Using coin.toLowerCase() as fallback GeckoID returned micro-cap tokens for stock/commodity
    // tickers (e.g. "aapl" crypto token ~$0.21 instead of Apple stock ~$260).
    if (!COINGECKO_ID_MAP[coin]) {
        throw new Error(`Price service unavailable for non-crypto symbol: ${symbol}`);
    }
    try {
        const geckoId = COINGECKO_ID_MAP[coin];
        const response = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
        if (response.ok) {
            const data = await response.json();
            if (data[geckoId]) {
                const price = parseFloat(data[geckoId].usd);
                priceCache[cacheKey] = { price, timestamp: Date.now() };
                return price;
            }
        }
    }
    catch (e) {
        console.warn("CoinGecko public fetch failed:", e instanceof Error ? e.message : e);
    }
    throw new Error(`Price service unavailable for ${symbol}`);
};
exports.getCryptoPrice = getCryptoPrice;
/**
 * Get prices for multiple assets
 */
const getMultiplePrices = async (symbols) => {
    const priceMap = {};
    // Try bulk CoinGecko first for efficiency — ONLY for known crypto assets.
    // Non-crypto symbols (GOLD, SILVER, OIL, AAPL, XAU, etc.) must NOT be sent to
    // CoinGecko: it returns micro-cap token prices (e.g. "gold" crypto ~$0.00004)
    // instead of the real commodity/stock price, causing wrong market prices.
    if (COINGECKO_API_KEY) {
        const cryptoSymbols = symbols.filter(s => !!COINGECKO_ID_MAP[s.split('/')[0].toUpperCase()]);
        if (cryptoSymbols.length > 0) {
            try {
                const geckoIds = cryptoSymbols.map(s => {
                    const coin = s.split('/')[0].toUpperCase();
                    return COINGECKO_ID_MAP[coin];
                }).filter(Boolean);
                const uniqueIds = [...new Set(geckoIds)].join(',');
                const response = await fetchWithTimeout(`https://pro-api.coingecko.com/api/v3/simple/price?ids=${uniqueIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`, 8000, { 'x-cg-pro-api-key': COINGECKO_API_KEY });
                if (response.ok) {
                    const data = await response.json();
                    for (const symbol of cryptoSymbols) {
                        const coin = symbol.split('/')[0].toUpperCase();
                        const geckoId = COINGECKO_ID_MAP[coin];
                        if (geckoId && data[geckoId]) {
                            priceMap[symbol] = data[geckoId].usd;
                            // Cache it
                            priceCache[symbol] = { price: data[geckoId].usd, timestamp: Date.now() };
                        }
                    }
                    // If we got all prices, return
                    if (Object.keys(priceMap).length === symbols.length) {
                        return priceMap;
                    }
                }
            }
            catch (e) {
                console.warn("CoinGecko bulk fetch failed:", e instanceof Error ? e.message : e);
            }
        }
    }
    // Fallback: fetch individually for missing symbols
    await Promise.all(symbols.map(async (symbol) => {
        if (priceMap[symbol])
            return; // Already fetched
        try {
            // Route through getCryptoPrice for all symbols.
            // It already handles stocks/commodities via Yahoo first and then
            // crypto exchanges for altcoins that are not in COINGECKO_ID_MAP.
            const price = await (0, exports.getCryptoPrice)(symbol);
            priceMap[symbol] = price;
        }
        catch (error) {
            priceMap[symbol] = 0;
        }
    }));
    return priceMap;
};
exports.getMultiplePrices = getMultiplePrices;
/**
 * Get detailed market data for multiple assets (price, 24h change, vol, market cap)
 */
const getDetailedMarketData = async (symbols) => {
    const result = {};
    if (COINGECKO_API_KEY) {
        // Only send known crypto assets to CoinGecko — stock/commodity tickers like
        // "aapl", "gold", "tsla" match real micro-cap crypto tokens on CoinGecko
        // and return completely wrong prices (e.g. "aapl" ~$0.21 instead of ~$260).
        const cryptoSymbols = symbols.filter(s => !!COINGECKO_ID_MAP[s.split('/')[0].toUpperCase()]);
        if (cryptoSymbols.length > 0) {
            try {
                const geckoIds = cryptoSymbols.map(s => COINGECKO_ID_MAP[s.split('/')[0].toUpperCase()]);
                const uniqueIds = [...new Set(geckoIds)].join(',');
                const response = await fetchWithTimeout(`https://pro-api.coingecko.com/api/v3/simple/price?ids=${uniqueIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`, 8000, { 'x-cg-pro-api-key': COINGECKO_API_KEY });
                if (response.ok) {
                    const data = await response.json();
                    for (const symbol of cryptoSymbols) {
                        const coin = symbol.split('/')[0].toUpperCase();
                        const geckoId = COINGECKO_ID_MAP[coin];
                        if (geckoId && data[geckoId]) {
                            result[symbol] = {
                                price: data[geckoId].usd,
                                change24h: data[geckoId].usd_24h_change || 0,
                                volume24h: data[geckoId].usd_24h_vol || 0,
                                marketCap: data[geckoId].usd_market_cap || 0,
                            };
                            priceCache[symbol] = { price: data[geckoId].usd, timestamp: Date.now() };
                        }
                    }
                }
            }
            catch (e) {
                console.warn("CoinGecko detailed fetch failed:", e instanceof Error ? e.message : e);
            }
        }
    }
    // Fallback for any missing symbols — route to correct source per asset type
    for (const symbol of symbols) {
        if (!result[symbol]) {
            try {
                // Route through getCryptoPrice for all symbols.
                // This avoids misclassifying altcoins as stocks while still keeping
                // stock/commodity Yahoo routing inside getCryptoPrice.
                const price = await (0, exports.getCryptoPrice)(symbol);
                result[symbol] = { price, change24h: 0, volume24h: 0, marketCap: 0 };
            }
            catch {
                result[symbol] = { price: 0, change24h: 0, volume24h: 0, marketCap: 0 };
            }
        }
    }
    return result;
};
exports.getDetailedMarketData = getDetailedMarketData;
