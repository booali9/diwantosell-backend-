"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const Admin_1 = __importDefault(require("./models/Admin"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        await (0, db_1.default)();
        const adminEmail = 'admin@diwanfinance.com';
        const adminPassword = 'admin@123';
        const existingAdmin = await Admin_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit();
        }
        const admin = new Admin_1.default({
            name: 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'superadmin',
            isActive: true,
        });
        await admin.save();
        console.log('Admin user created successfully');
        process.exit();
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
seedAdmin();
