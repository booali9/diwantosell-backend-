import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin';
import connectDB from './src/config/db';

dotenv.config();

const checkAdmin = async () => {
    try {
        await connectDB();
        const admins = await Admin.find({});
        console.log('Total Admins found:', admins.length);
        admins.forEach(admin => {
            console.log(`- Name: ${admin.name}, Email: ${admin.email}, Role: ${admin.role}, Active: ${admin.isActive}`);
        });
    } catch (error) {
        console.error('Error checking admins:', error);
    } finally {
        mongoose.connection.close();
    }
};

checkAdmin();
