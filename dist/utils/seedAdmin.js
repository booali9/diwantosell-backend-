"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Admin_1 = __importDefault(require("../models/Admin"));
const db_1 = __importDefault(require("../config/db"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        console.log('🌱 Starting admin seeding process...');
        await (0, db_1.default)();
        console.log('✅ Database connected successfully');
        const adminExists = await Admin_1.default.findOne({ email: 'admin@diwanfinance.com' });
        if (!adminExists) {
            console.log('👤 Creating new admin user...');
            const admin = new Admin_1.default({
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
        }
        else {
            console.log('ℹ️  Admin already exists');
            console.log('📧 Email:', adminExists.email);
            console.log('👑 Role:', adminExists.role);
            console.log('✅ Active:', adminExists.isActive);
        }
        console.log('🎉 Seeding process completed successfully!');
    }
    catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    }
    finally {
        mongoose_1.default.connection.close();
        console.log('🔌 Database connection closed');
    }
};
seedAdmin().catch((err) => {
    console.error('💥 Seeding failed:', err);
    process.exit(1);
});
