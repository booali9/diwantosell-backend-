"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = __importDefault(require("../models/Admin"));
const protectAdmin = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[DEBUG] Verifying token:', token.substring(0, 10) + '...');
            console.log('[DEBUG] Verify Secret:', process.env.JWT_SECRET);
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
            // Handle temporary bypass admin
            if (decoded.id === 'temp_admin_id') {
                req.admin = {
                    _id: 'temp_admin_id',
                    name: 'Super Admin',
                    email: 'admin@diwanfinance.com',
                    role: 'superadmin'
                };
                return next();
            }
            req.admin = await Admin_1.default.findById(decoded.id).select('-password');
            if (!req.admin) {
                res.status(401);
                throw new Error('Not authorized, admin not found');
            }
            next();
        }
        catch (error) {
            console.error('[AUTH ERROR] Token verification failed:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please login again', code: 'TOKEN_EXPIRED' });
            }
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
};
exports.protectAdmin = protectAdmin;
