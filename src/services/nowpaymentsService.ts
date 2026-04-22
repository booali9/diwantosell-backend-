import axios from 'axios';
import crypto from 'crypto';

export const IS_SANDBOX = process.env.NOWPAYMENTS_IS_SANDBOX === 'true';
const NOWPAYMENTS_API_URL = IS_SANDBOX ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

export interface CreatePaymentParams {
    amount: number;
    currency: string;
    orderId: string;
    callbackUrl: string;
    successUrl: string;
    cancelUrl: string;
}

export const createNowPayment = async (params: CreatePaymentParams) => {
    try {
        // Sandbox only supports specific currencies like 'usdterc20'. 
        // 'usdttrc20' often fails in sandbox, so we map it to 'usdterc20' for testing if in sandbox mode.
        let payCurrency = params.currency.toLowerCase();
        if (IS_SANDBOX && payCurrency === 'usdttrc20') {
            payCurrency = 'usdterc20';
        }

        // Use Invoice API for a proper hosted payment page with MetaMask/wallet support
        const response = await axios.post(
            `${NOWPAYMENTS_API_URL}/invoice`,
            {
                price_amount: params.amount,
                price_currency: 'usd',
                pay_currency: payCurrency,
                ipn_callback_url: params.callbackUrl,
                order_id: params.orderId,
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                order_description: `Deposit ${params.amount} USD`,
            },
            {
                headers: {
                    'x-api-key': NOWPAYMENTS_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('[NowPayments] Create invoice error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create NowPayments invoice');
    }
};

/**
 * Verify NowPayments IPN Signature
 * @param body The raw callback body
 * @param signature The x-nowpayments-sig header
 */
/**
 * Check NowPayments API configuration & connectivity
 */
export const checkNowPaymentsStatus = async () => {
    try {
        // Check the NowPayments API status
        const statusResponse = await axios.get(`${NOWPAYMENTS_API_URL}/status`);
        
        // Try to get available currencies to verify API key works
        let currenciesOk = false;
        let currencyError = '';
        try {
            await axios.get(`${NOWPAYMENTS_API_URL}/currencies`, {
                headers: { 'x-api-key': NOWPAYMENTS_API_KEY },
            });
            currenciesOk = true;
        } catch (e: any) {
            currencyError = e.response?.data?.message || e.message;
        }

        return {
            sandbox: IS_SANDBOX,
            apiUrl: NOWPAYMENTS_API_URL,
            apiKeySet: !!NOWPAYMENTS_API_KEY && NOWPAYMENTS_API_KEY.length > 0,
            apiKeyPrefix: NOWPAYMENTS_API_KEY ? NOWPAYMENTS_API_KEY.substring(0, 8) + '...' : '(empty)',
            ipnSecretSet: !!NOWPAYMENTS_IPN_SECRET && NOWPAYMENTS_IPN_SECRET.length > 0,
            apiStatus: statusResponse.data?.message || 'unknown',
            apiKeyValid: currenciesOk,
            apiKeyError: currencyError || undefined,
        };
    } catch (error: any) {
        return {
            sandbox: IS_SANDBOX,
            apiUrl: NOWPAYMENTS_API_URL,
            apiKeySet: !!NOWPAYMENTS_API_KEY && NOWPAYMENTS_API_KEY.length > 0,
            ipnSecretSet: !!NOWPAYMENTS_IPN_SECRET && NOWPAYMENTS_IPN_SECRET.length > 0,
            error: error.message,
        };
    }
};

export const verifyNowPaymentsIPN = (body: any, signature: string): boolean => {
    if (!NOWPAYMENTS_IPN_SECRET) {
        console.error('[NowPayments] IPN Secret is missing in environment variables');
        return false;
    }

    // Sort parameters alphabetically
    const sortedKeys = Object.keys(body).sort();
    const orderedBody: any = {};
    sortedKeys.forEach(key => {
        orderedBody[key] = body[key];
    });

    const bodyString = JSON.stringify(orderedBody);
    const hmac = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET);
    hmac.update(bodyString);
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === signature;
};
