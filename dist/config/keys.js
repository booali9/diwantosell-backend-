"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASTER_KEY = exports.JWT_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure dotenv is configured before accessing process.env
dotenv_1.default.config();
console.log('[DEBUG] Loading JWT Secret from keys.ts');
exports.JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_key_12345';
exports.MASTER_KEY = process.env.MASTER_KEY || '';
if (process.env.JWT_SECRET) {
    console.log('[DEBUG] JWT_SECRET found in environment variables');
}
else {
    console.warn('[WARN] JWT_SECRET not found in .env, using fallback');
}
