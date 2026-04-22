import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin';
import connectDB from '../config/db';

dotenv.config();

const seedAdmin = async () => {
    try {
        console.log('🌱 Starting admin seeding process...');
        await connectDB();
        console.log('✅ Database connected successfully');

        const adminExists = await Admin.findOne({ email: 'admin@diwanfinance.com' });

        if (!adminExists) {
            console.log('👤 Creating new admin user...');
            const admin = new Admin({
                name: 'Super Admin',
                email: 'admin@diwanfinance.com',
                password: 'admin@123', // This will be hashed by the pre-save hook
                role: 'superadmin',
                isActive: true,
            });

            await admin.save();
            console.log('✅ Initial admin seeded successfully!');
            console.log('📧 Email: admin@diwanfinance.com');
            console.log('🔑 Password: admin@123');
            console.log('👑 Role: superadmin');
        } else {
            console.log('ℹ️  Admin already exists');
            console.log('📧 Email:', adminExists.email);
            console.log('👑 Role:', adminExists.role);
            console.log('✅ Active:', adminExists.isActive);
        }

        console.log('🎉 Seeding process completed successfully!');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

seedAdmin().catch((err) => {
    console.error('💥 Seeding failed:', err);
    process.exit(1);
});
