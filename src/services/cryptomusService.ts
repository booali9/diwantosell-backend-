/**
 * Cryptomus Payment Gateway Service
 * Handles real crypto deposit creation and webhook verification.
 * All received crypto routes to a single admin-controlled master wallet.
 */
import crypto from 'crypto';
import axios from 'axios';

const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1';
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || '';
const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || '';

/**
 * Generate Cryptomus API signature
 * sign = md5(base64_encode(json_encode(body)) + API_KEY)
 */
export const generateSignature = (body: Record<string, any>): string => {
    const jsonStr = JSON.stringify(body);
    const base64 = Buffer.from(jsonStr).toString('base64');
    return crypto.createHash('md5').update(base64 + CRYPTOMUS_API_KEY).digest('hex');
};

/**
 * Verify incoming webhook signature from Cryptomus
 */
export const verifyWebhookSignature = (body: Record<string, any>, receivedSign: string): boolean => {
    // Remove the 'sign' field before computing
    const { sign, ...bodyWithoutSign } = body;
    const computed = generateSignature(bodyWithoutSign);
    return computed === receivedSign;
};

export interface CreatePaymentParams {
    orderId: string;       // Unique internal order ID (e.g., txn._id)
    amount: string;        // Amount in USD
    currency: string;      // e.g., 'USDT', 'BTC', 'ETH'
    network?: string;      // e.g., 'tron', 'eth', 'bsc'
    callbackUrl: string;   // Webhook URL
    returnUrl?: string;    // User redirect URL after payment
    lifetime?: number;     // Payment page lifetime in seconds (default 3600)
}

export interface CryptomusPaymentResponse {
    uuid: string;
    order_id: string;
    amount: string;
    currency: string;
    network: string;
    address: string;
    url: string;            // Payment page URL
    status: string;
    expired_at: number;
}

/**
 * Create a new payment invoice via Cryptomus API
 */
export const createPayment = async (params: CreatePaymentParams): Promise<CryptomusPaymentResponse> => {
    const body: Record<string, any> = {
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

    const sign = generateSignature(body);

    try {
        const response = await axios.post(`${CRYPTOMUS_API_URL}/payment`, body, {
            headers: {
                'Content-Type': 'application/json',
                'merchant': CRYPTOMUS_MERCHANT_ID,
                'sign': sign,
            },
        });

        return response.data.result;
    } catch (error: any) {
        console.error('[Cryptomus] Create payment error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Cryptomus payment');
    }
};

/**
 * Check payment status from Cryptomus
 */
export const checkPaymentStatus = async (uuid: string): Promise<any> => {
    const body = { uuid };
    const sign = generateSignature(body);

    try {
        const response = await axios.post(`${CRYPTOMUS_API_URL}/payment/info`, body, {
            headers: {
                'Content-Type': 'application/json',
                'merchant': CRYPTOMUS_MERCHANT_ID,
                'sign': sign,
            },
        });

        return response.data.result;
    } catch (error: any) {
        console.error('[Cryptomus] Check status error:', error.response?.data || error.message);
        throw new Error('Failed to check payment status');
    }
};

// Allowed webhook IPs from Cryptomus (optional IP whitelist)
export const CRYPTOMUS_WEBHOOK_IPS = [
    '91.227.144.54',
    '23.105.226.191',
];
