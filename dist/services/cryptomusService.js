"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRYPTOMUS_WEBHOOK_IPS = exports.checkPaymentStatus = exports.createPayment = exports.verifyWebhookSignature = exports.generateSignature = void 0;
/**
 * Cryptomus Payment Gateway Service
 * Handles real crypto deposit creation and webhook verification.
 * All received crypto routes to a single admin-controlled master wallet.
 */
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1';
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || '';
const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || '';
/**
 * Generate Cryptomus API signature
 * sign = md5(base64_encode(json_encode(body)) + API_KEY)
 */
const generateSignature = (body) => {
    const jsonStr = JSON.stringify(body);
    const base64 = Buffer.from(jsonStr).toString('base64');
    return crypto_1.default.createHash('md5').update(base64 + CRYPTOMUS_API_KEY).digest('hex');
};
exports.generateSignature = generateSignature;
/**
 * Verify incoming webhook signature from Cryptomus
 */
const verifyWebhookSignature = (body, receivedSign) => {
    // Remove the 'sign' field before computing
    const { sign, ...bodyWithoutSign } = body;
    const computed = (0, exports.generateSignature)(bodyWithoutSign);
    return computed === receivedSign;
};
exports.verifyWebhookSignature = verifyWebhookSignature;
/**
 * Create a new payment invoice via Cryptomus API
 */
const createPayment = async (params) => {
    const body = {
        amount: params.amount,
        currency: params.currency,
        order_id: params.orderId,
        url_callback: params.callbackUrl,
        is_payment_multiple: false,
        lifetime: params.lifetime || 3600,
    };
    if (params.network) {
        body.network = params.network;
    }
    if (params.returnUrl) {
        body.url_return = params.returnUrl;
        body.url_success = params.returnUrl;
    }
    const sign = (0, exports.generateSignature)(body);
    try {
        const response = await axios_1.default.post(`${CRYPTOMUS_API_URL}/payment`, body, {
            headers: {
                'Content-Type': 'application/json',
                'merchant': CRYPTOMUS_MERCHANT_ID,
                'sign': sign,
            },
        });
        return response.data.result;
    }
    catch (error) {
        console.error('[Cryptomus] Create payment error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Cryptomus payment');
    }
};
exports.createPayment = createPayment;
/**
 * Check payment status from Cryptomus
 */
const checkPaymentStatus = async (uuid) => {
    const body = { uuid };
    const sign = (0, exports.generateSignature)(body);
    try {
        const response = await axios_1.default.post(`${CRYPTOMUS_API_URL}/payment/info`, body, {
            headers: {
                'Content-Type': 'application/json',
                'merchant': CRYPTOMUS_MERCHANT_ID,
                'sign': sign,
            },
        });
        return response.data.result;
    }
    catch (error) {
        console.error('[Cryptomus] Check status error:', error.response?.data || error.message);
        throw new Error('Failed to check payment status');
    }
};
exports.checkPaymentStatus = checkPaymentStatus;
// Allowed webhook IPs from Cryptomus (optional IP whitelist)
exports.CRYPTOMUS_WEBHOOK_IPS = [
    '91.227.144.54',
    '23.105.226.191',
];
