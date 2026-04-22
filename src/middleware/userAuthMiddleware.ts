import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface DecodedToken {
    id: string;
}

export const protectUser = async (req: any, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here') as DecodedToken;

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please login again', code: 'TOKEN_EXPIRED' });
            }
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};
