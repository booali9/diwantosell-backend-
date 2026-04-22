"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
// Load env vars
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const testNotificationCreation = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        console.log('Fetching all users (simulating targetAudience: all)...');
        const startTime = Date.now();
        // This is the problematic line in the controller
        const users = await User_1.default.find({}, '_id');
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
        const notification = await Notification_1.default.create(notificationData);
        console.log(`Success! Created notification ${notification._id} in ${Date.now() - createStartTime}ms`);
        // Cleanup
        await Notification_1.default.findByIdAndDelete(notification._id);
        console.log('Cleaned up test notification');
    }
    catch (error) {
        console.error('FATAL ERROR:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
};
testNotificationCreation();
