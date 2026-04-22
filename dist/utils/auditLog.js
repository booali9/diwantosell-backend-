"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
/**
 * Create an audit log entry.
 * Non-blocking — errors are logged but never thrown to avoid disrupting main flows.
 */
const createAuditLog = async (entry) => {
    try {
        await AuditLog_1.default.create({
            action: entry.action,
            performedBy: entry.performedBy,
            performedByRole: entry.performedByRole || 'admin',
            targetUser: entry.targetUser,
            targetResource: entry.targetResource,
            details: entry.details,
            ipAddress: entry.ipAddress,
        });
    }
    catch (error) {
        console.error('[AuditLog] Failed to create audit log:', error);
    }
};
exports.createAuditLog = createAuditLog;
