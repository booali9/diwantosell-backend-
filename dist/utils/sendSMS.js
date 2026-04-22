"use strict";
/**
 * SMS Service Placeholder
 * In a real production environment, you would integrate with a provider like Twilio, Vonage, or AWS SNS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPBySMS = exports.sendSMS = void 0;
const sendSMS = async (phone, message) => {
    try {
        console.log(`[SMS-SERVICE] Sending SMS to ${phone}: ${message}`);
        // Simulating API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        // Always return success in this educational/demo context
        return true;
    }
    catch (error) {
        console.error('[SMS-SERVICE] Failed to send SMS:', error);
        return false;
    }
};
exports.sendSMS = sendSMS;
const sendOTPBySMS = async (phone, otp) => {
    const message = `Your Diwan Finance verification code is: ${otp}. Valid for 10 minutes.`;
    return await (0, exports.sendSMS)(phone, message);
};
exports.sendOTPBySMS = sendOTPBySMS;
