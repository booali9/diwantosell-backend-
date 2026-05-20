"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const keys_1 = require("../config/keys");
const generateToken = (id, sessionId) => {
    const payload = { id };
    if (sessionId) {
        payload.sessionId = sessionId;
    }
    return jsonwebtoken_1.default.sign(payload, keys_1.JWT_SECRET, {
        expiresIn: '30d',
    });
};
exports.default = generateToken;
