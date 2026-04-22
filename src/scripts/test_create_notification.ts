
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Notification from '../models/Notification';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testNotificationCreation = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        console.log('Fetching all users (simulating targetAudience: all)...');
        const startTime = Date.now();

        // This is the problematic line in the controller
        const users = await User.find({}, '_id');

        console.log(`Fetched ${users.length} users in ${Date.now() - startTime}ms`);

        const recipients = users.map(user => ({
            user: user._id,
            status: 'pending'
        }));

        console.log(`Prepared ${recipients.length} recipients`);

        const notificationData = {
            title: 'Test Notification - Debugging 500 Error',
            description: 'This is a test notification to reproduce the 500 error.',
            type: 'system',
            targetAudience: 'all',
            priority: 'medium',
            channels: ['in-app'],
            recipients,
            totalRecipients: recipients.length,
            status: 'draft',
            // createdBy: ... (optional, skipping for test)
        };

        console.log('Attempting to create notification document...');
        const createStartTime = Date.now();

        const notification = await Notification.create(notificationData);

        console.log(`Success! Created notification ${notification._id} in ${Date.now() - createStartTime}ms`);

        // Cleanup
        await Notification.findByIdAndDelete(notification._id);
        console.log('Cleaned up test notification');

    } catch (error) {
        console.error('FATAL ERROR:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

testNotificationCreation();
