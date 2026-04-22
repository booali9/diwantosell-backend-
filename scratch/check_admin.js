const mongoose = require('mongoose');
require('dotenv').config();

const AdminSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    isActive: Boolean
}, { collection: 'admins' });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
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
