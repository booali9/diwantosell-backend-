import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/diwantosell';

async function addFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'kazmi4600088@cloud.bender.edu.pk';
        const amountToAdd = 1000;

        const user = await User.findOne({ email: email });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        console.log(`Current balance for ${email}: ${user.balance}`);
        
        user.balance = (user.balance || 0) + amountToAdd;
        await user.save();

        console.log(`Updated balance for ${email}: ${user.balance}`);
        console.log(`Successfully added ${amountToAdd} to user balance.`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addFunds();
