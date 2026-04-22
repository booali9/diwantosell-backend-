import axios from 'axios';

const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;
const getChatId = () => process.env.TELEGRAM_CHAT_ID;

export const sendTelegramAlert = async (message: string) => {
    const BOT_TOKEN = getBotToken();
    const CHAT_ID = getChatId();

    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('[Telegram] BOT_TOKEN or CHAT_ID is missing. Notification skipped.');
        return;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('[Telegram] Failed to send Telegram alert:', error instanceof Error ? error.message : error);
    }
};

export const notifyNewUser = async (user: { name: string, email: string, phone: string }) => {
    const message = `🆕 <b>New User Registered</b>\n\n<b>Name:</b> ${user.name}\n<b>Email:</b> ${user.email}\n<b>Phone:</b> ${user.phone}`;
    await sendTelegramAlert(message);
};

export const notifyDepositRequest = async (user: { email: string, name: string }, amount: number, method: string) => {
    const message = `💰 <b>Deposit Request</b>\n\n<b>User:</b> ${user.email} (${user.name})\n<b>Amount:</b> $${amount}\n<b>Method:</b> ${method}`;
    await sendTelegramAlert(message);
};

export const notifyWithdrawRequest = async (user: { email: string, name: string }, amount: number, asset: string, address: string) => {
    const message = `🏧 <b>Withdraw Request</b>\n\n<b>User:</b> ${user.email} (${user.name})\n<b>Amount:</b> ${amount} ${asset}\n<b>Address:</b> ${address}`;
    await sendTelegramAlert(message);
};
