/**
 * SMS Service Placeholder
 * In a real production environment, you would integrate with a provider like Twilio, Vonage, or AWS SNS.
 */

export const sendSMS = async (phone: string, message: string): Promise<boolean> => {
    try {
        console.log(`[SMS-SERVICE] Sending SMS to ${phone}: ${message}`);

        // Simulating API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Always return success in this educational/demo context
        return true;
    } catch (error) {
        console.error('[SMS-SERVICE] Failed to send SMS:', error);
        return false;
    }
};

export const sendOTPBySMS = async (phone: string, otp: string): Promise<boolean> => {
    const message = `Your Diwan Finance verification code is: ${otp}. Valid for 10 minutes.`;
    return await sendSMS(phone, message);
};
