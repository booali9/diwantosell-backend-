import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/keys';

const generateToken = (id: string, sessionId?: string) => {
    const payload: Record<string, string> = { id };
    if (sessionId) {
        payload.sessionId = sessionId;
    }
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30d',
    });
};

export default generateToken;
