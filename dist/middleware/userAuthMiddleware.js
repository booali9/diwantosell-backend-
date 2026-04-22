"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protectUser = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
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
