import AuditLog from '../models/AuditLog';

interface AuditLogEntry {
    action: string;
    performedBy: string;
    performedByRole?: 'admin' | 'system' | 'webhook';
    targetUser?: string;
    targetResource?: string;
    details?: Record<string, any>;
    ipAddress?: string;
}

/**
 * Create an audit log entry.
 * Non-blocking — errors are logged but never thrown to avoid disrupting main flows.
 */
export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
    try {
        await AuditLog.create({
            action: entry.action,
            performedBy: entry.performedBy,
            performedByRole: entry.performedByRole || 'admin',
            targetUser: entry.targetUser,
            targetResource: entry.targetResource,
            details: entry.details,
            ipAddress: entry.ipAddress,
        });
    } catch (error) {
        console.error('[AuditLog] Failed to create audit log:', error);
    }
};
