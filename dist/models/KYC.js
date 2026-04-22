"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const kycSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    documentType: {
        type: String,
        required: true,
    },
    documentFront: String,
    documentBack: String,
    selfie: String,
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },
    adminComment: String,
}, {
    timestamps: true,
});
const KYC = mongoose_1.default.model('KYC', kycSchema);
exports.default = KYC;
