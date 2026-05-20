import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Loaded SMTP_EMAIL:', process.env.SMTP_EMAIL);
console.log('Loaded SMTP_HOST:', process.env.SMTP_HOST);
console.log('Loaded SMTP_PORT:', process.env.SMTP_PORT);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('SMTP Connection is verified successfully!');

        console.log('Sending test email to', process.env.SMTP_EMAIL);
        const info = await transporter.sendMail({
            from: `"Bicoin Test" <${process.env.SMTP_EMAIL}>`,
            to: process.env.SMTP_EMAIL,
            subject: 'Bicoin - SMTP Test Connection',
            html: '<h1>SMTP working!</h1><p>Your SMTP is configured and working correctly.</p>',
        });
        console.log('Email sent successfully!', info.messageId);
    } catch (error) {
        console.error('SMTP testing failed with error:', error);
    }
}

main();
