"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendOTPEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});
const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({
        from: `"Diwan Finance" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html,
    });
};
exports.sendEmail = sendEmail;
const sendOTPEmail = async (email, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; text-align: center;">Diwan Finance</h2>
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 8px;">Your verification code is:</p>
                <h1 style="color: #1e293b; font-size: 36px; letter-spacing: 8px; margin: 16px 0;">${otp}</h1>
                <p style="color: #64748b; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
                If you didn't request this code, please ignore this email.
            </p>
        </div>
    `;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'Diwan Finance - Verification Code',
        html,
    });
};
exports.sendOTPEmail = sendOTPEmail;
const sendPasswordResetEmail = async (email, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; text-align: center;">Diwan Finance</h2>
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 8px;">Your password reset code is:</p>
                <h1 style="color: #1e293b; font-size: 36px; letter-spacing: 8px; margin: 16px 0;">${otp}</h1>
                <p style="color: #64748b; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
                If you didn't request a password reset, please ignore this email.
            </p>
        </div>
    `;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'Diwan Finance - Password Reset Code',
        html,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
