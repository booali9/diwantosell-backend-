"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyWithdrawRequest = exports.notifyDepositRequest = exports.notifyNewUser = exports.sendTelegramAlert = void 0;
const axios_1 = __importDefault(require("axios"));
const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;
const getChatId = () => process.env.TELEGRAM_CHAT_ID;
const sendTelegramAlert = async (message) => {
    const BOT_TOKEN = getBotToken();
    const CHAT_ID = getChatId();
    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('[Telegram] BOT_TOKEN or CHAT_ID is missing. Notification skipped.');
        return;
    }
    try {
        await axios_1.default.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    }
    catch (error) {
        console.error('[Telegram] Failed to send Telegram alert:', error instanceof Error ? error.message : error);
    }
};
exports.sendTelegramAlert = sendTelegramAlert;
const notifyNewUser = async (user) => {
    const message = `🆕 <b>New User Registered</b>\n\n<b>Name:</b> ${user.name}\n<b>Email:</b> ${user.email}\n<b>Phone:</b> ${user.phone}`;
    await (0, exports.sendTelegramAlert)(message);
};
exports.notifyNewUser = notifyNewUser;
const notifyDepositRequest = async (user, amount, method) => {
    const message = `💰 <b>Deposit Request</b>\n\n<b>User:</b> ${user.email} (${user.name})\n<b>Amount:</b> $${amount}\n<b>Method:</b> ${method}`;
    await (0, exports.sendTelegramAlert)(message);
};
exports.notifyDepositRequest = notifyDepositRequest;
const notifyWithdrawRequest = async (user, amount, asset, address) => {
    const message = `🏧 <b>Withdraw Request</b>\n\n<b>User:</b> ${user.email} (${user.name})\n<b>Amount:</b> ${amount} ${asset}\n<b>Address:</b> ${address}`;
    await (0, exports.sendTelegramAlert)(message);
};
exports.notifyWithdrawRequest = notifyWithdrawRequest;
