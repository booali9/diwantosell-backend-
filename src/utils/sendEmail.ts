import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
    await transporter.sendMail({
        from: `"Diwan Finance" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html,
    });
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
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

    await sendEmail({
        to: email,
        subject: 'Diwan Finance - Verification Code',
        html,
    });
};

export const sendPasswordResetEmail = async (email: string, otp: string): Promise<void> => {
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

    await sendEmail({
        to: email,
        subject: 'Diwan Finance - Password Reset Code',
        html,
    });
};
