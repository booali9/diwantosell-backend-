import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db';
import Admin from './models/Admin';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = 'admin@diwanfinance.com';
        const adminPassword = 'admin@123';

        const existingAdmin = await Admin.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit();
        }

        const admin = new Admin({
            name: 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'superadmin',
            isActive: true,
        });

        await admin.save();
        console.log('Admin user created successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

seedAdmin();
