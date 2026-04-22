import { Request, Response } from 'express';
import Notification from '../models/Notification';
import User from '../models/User';

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// @access  Private
export const getNotifications = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Fetching notifications from database...');

        const notifications = await Notification.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        console.log('[DEBUG] Found', notifications.length, 'notifications');

        res.json(notifications);
    } catch (error) {
        console.error('[ERROR] Get notifications error:', error);
        // Return empty array instead of error for better UX
        res.json([]);
    }
};

// @desc    Get notification by ID
// @route   GET /api/admin/notifications/:id
// @access  Private
export const getNotificationById = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('recipients.user', 'name email');

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('[ERROR] Get notification by ID error:', error);
        res.status(500).json({
            message: 'Server error getting notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Create new notification
// @route   POST /api/admin/notifications
// @access  Private
export const createNotification = async (req: any, res: Response) => {
    try {
        const {
            title,
            description,
            type,
            targetAudience,
            scheduledAt,
            priority,
            channels,
        } = req.body;

        console.log('[DEBUG] Creating notification request received:', { title, type, targetAudience });
        const adminId = req.admin?._id;
        console.log('[DEBUG] Admin ID requesting creation:', adminId);

        // Validate required fields
        if (!title || !description || !type || !targetAudience) {
            console.log('[DEBUG] Missing fields:', { title: !!title, description: !!description, type: !!type, targetAudience: !!targetAudience });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get target users based on audience
        console.log(`[DEBUG] Fetching target users for audience: ${targetAudience}...`);
        const fetchStartTime = Date.now();
        let targetUsers: any[] = [];

        try {
            const queryOptions = { _id: 1 }; // Only fetch _id field

            switch (targetAudience) {
                case 'all':
                    // Use lean() for better performance with large datasets
                    targetUsers = await User.find({}, queryOptions).lean();
                    break;
                case 'verified':
                    targetUsers = await User.find({ kycStatus: 'verified' }, queryOptions).lean();
                    break;
                case 'unverified':
                    targetUsers = await User.find({ kycStatus: { $ne: 'verified' } }, queryOptions).lean();
                    break;
                case 'active':
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    targetUsers = await User.find({ lastLogin: { $gte: thirtyDaysAgo } }, queryOptions).lean();
                    break;
                case 'inactive':
                    const thirtyDaysAgoInactive = new Date();
                    thirtyDaysAgoInactive.setDate(thirtyDaysAgoInactive.getDate() - 30);
                    targetUsers = await User.find({
                        $or: [
                            { lastLogin: { $lt: thirtyDaysAgoInactive } },
                            { lastLogin: { $exists: false } }
                        ]
                    }, queryOptions).lean();
                    break;
                default:
                    targetUsers = await User.find({}, queryOptions).lean();
            }
            console.log(`[DEBUG] Fetched ${targetUsers.length} users in ${Date.now() - fetchStartTime}ms`);

        } catch (userError) {
            console.error('[ERROR] Could not fetch users for notification:', userError);
            targetUsers = []; // Continue with empty recipients if user fetch fails
        }

        console.log('[DEBUG] Preparing recipients list...');
        const mapStartTime = Date.now();
        // Use a simple loop or map, ensuring we handle the lean object correctly
        // With lean(), objects are plain JS objects, not Mongoose documents
        const recipients = targetUsers.map((user: any) => ({
            user: user._id, // Accessing _id directly from plain object
            status: 'pending'
        }));
        console.log(`[DEBUG] Prepared recipients in ${Date.now() - mapStartTime}ms`);

        // Handle both ObjectId and string admin IDs
        let createdBy = adminId;
        if (createdBy === 'temp_admin_id') {
            createdBy = null;
        }

        const notificationData = {
            title,
            description,
            type,
            targetAudience,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            priority: priority || 'medium',
            channels: channels || ['in-app'],
            recipients,
            totalRecipients: recipients.length,
            status: scheduledAt ? 'scheduled' : 'draft',
            ...(createdBy && { createdBy })
        };

        console.log('[DEBUG] Creating notification document in DB...');
        const createStartTime = Date.now();

        const notification = await Notification.create(notificationData);

        console.log(`[DEBUG] Successfully created notification ${notification._id} in ${Date.now() - createStartTime}ms`);

        // Return the notification but avoid populating the massive recipients list in the response
        // for performance. Only populate metadata.
        const responseNotification = {
            _id: notification._id,
            title: notification.title,
            description: notification.description,
            type: notification.type,
            targetAudience: notification.targetAudience,
            status: notification.status,
            scheduledAt: notification.scheduledAt,
            totalRecipients: notification.totalRecipients,
            createdAt: (notification as any).createdAt,
            createdBy: createdBy ? { _id: createdBy, name: 'Admin' } : null // Simplified return
        };

        res.status(201).json(responseNotification);

    } catch (error) {
        console.error('[ERROR] Create notification FATAL error:', error);
        res.status(500).json({
            message: 'Server error creating notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Update notification
// @route   PUT /api/admin/notifications/:id
// @access  Private
export const updateNotification = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Don't allow updating sent notifications
        if (notification.status === 'sent') {
            return res.status(400).json({ message: 'Cannot update sent notifications' });
        }

        const updatedNotification = await Notification.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('createdBy', 'name email');

        console.log('[DEBUG] Updated notification:', req.params.id);

        res.json(updatedNotification);
    } catch (error) {
        console.error('[ERROR] Update notification error:', error);
        res.status(500).json({
            message: 'Server error updating notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Don't allow deleting sent notifications
        if (notification.status === 'sent') {
            return res.status(400).json({ message: 'Cannot delete sent notifications' });
        }

        await Notification.findByIdAndDelete(req.params.id);

        console.log('[DEBUG] Deleted notification:', req.params.id);

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete notification error:', error);
        res.status(500).json({
            message: 'Server error deleting notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Send notification immediately
// @route   PUT /api/admin/notifications/:id/send
// @access  Private
export const sendNotification = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.status === 'sent') {
            return res.status(400).json({ message: 'Notification already sent' });
        }

        // Update notification status
        notification.status = 'sent';
        notification.sentAt = new Date();

        // Mark all recipients as delivered (simplified for demo)
        notification.recipients.forEach(recipient => {
            recipient.status = 'delivered';
            recipient.deliveredAt = new Date();
        });

        notification.deliveredCount = notification.recipients.length;
        await notification.save();

        const updatedNotification = await Notification.findById(notification._id)
            .populate('createdBy', 'name email');

        console.log('[DEBUG] Sent notification:', req.params.id);

        res.json(updatedNotification);
    } catch (error) {
        console.error('[ERROR] Send notification error:', error);
        res.status(500).json({
            message: 'Server error sending notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// @desc    Get notification stats
// @route   GET /api/admin/notifications/stats
// @access  Private
export const getNotificationStats = async (req: Request, res: Response) => {
    try {
        console.log('[DEBUG] Fetching notification stats...');

        // Use Promise.allSettled to handle potential model issues gracefully
        const [totalResult, deliveredResult, pendingResult, failedResult] = await Promise.allSettled([
            Notification.countDocuments(),
            Notification.countDocuments({ status: 'sent' }),
            Notification.countDocuments({ status: { $in: ['draft', 'scheduled'] } }),
            Notification.countDocuments({ status: 'failed' })
        ]);

        const totalNotifications = totalResult.status === 'fulfilled' ? totalResult.value : 0;
        const deliveredNotifications = deliveredResult.status === 'fulfilled' ? deliveredResult.value : 0;
        const pendingNotifications = pendingResult.status === 'fulfilled' ? pendingResult.value : 0;
        const failedNotifications = failedResult.status === 'fulfilled' ? failedResult.value : 0;

        console.log('[DEBUG] Notification stats calculated successfully');

        res.json({
            totalNotifications,
            deliveredNotifications,
            pendingNotifications,
            failedNotifications,
        });
    } catch (error) {
        console.error('[ERROR] Get notification stats error:', error);
        res.status(500).json({
            message: 'Server error getting notification stats',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};