import crypto from 'crypto';

/**
 * Decode a Base32-encoded string into a Buffer.
 * Uses the RFC 4648 alphabet: A-Z and 2-7.
 */
function base32Decode(base32: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanString = base32.toUpperCase().replace(/=+$/, '');
    const length = cleanString.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));

    for (let i = 0; i < length; i++) {
        const val = alphabet.indexOf(cleanString[i]);
        if (val === -1) throw new Error('Invalid base32 character');
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            buffer[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return buffer;
}

/**
 * Generate a random Base32 secret (16 chars = 80 bits of entropy).
 */
export function generateBase32Secret(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        secret += chars[randomBytes[i] % chars.length];
    }
    return secret;
}

/**
 * Verify a TOTP code against a Base32 secret.
 * Supports a configurable time window (default ±1 step = 30 seconds each way).
 */
export function verifyTOTP(token: string, secret: string, window: number = 1): boolean {
    const cleanToken = token.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const currentCount = Math.floor(epoch / timeStep);

    for (let i = -window; i <= window; i++) {
        const count = currentCount + i;
        const counter = Buffer.alloc(8);
        counter.writeUInt32BE(0, 0);
        counter.writeUInt32BE(count, 4);

        const key = base32Decode(secret);
        const hmac = crypto.createHmac('sha1', key).update(counter).digest();
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        ) % 1000000;

        if (code.toString().padStart(6, '0') === cleanToken) {
            return true;
        }
    }
    return false;
}
