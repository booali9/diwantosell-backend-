"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const DeviceSession_1 = __importDefault(require("../models/DeviceSession"));
const keys_1 = require("../config/keys");
const protectUser = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
            }
            console.log('[DEBUG] Verifying user token with secret length:', keys_1.JWT_SECRET.length);
            const decoded = jsonwebtoken_1.default.verify(token, keys_1.JWT_SECRET);
            // If the token contains a sessionId, verify the session is still active
            if (decoded.sessionId) {
                const session = await DeviceSession_1.default.findOne({
                    sessionId: decoded.sessionId,
                    user: decoded.id,
                });
                if (!session || !session.isActive) {
                    return res.status(401).json({
                        message: 'Session has been revoked. Please login again.',
                        code: 'SESSION_REVOKED',
                    });
                }
                // Update last activity timestamp
                session.lastActive = new Date();
                await session.save();
            }
            req.user = await User_1.default.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            return next();
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please login again', code: 'TOKEN_EXPIRED' });
            }
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    return res.status(401).json({ message: 'Not authorized, no token' });
};
exports.protectUser = protectUser;
