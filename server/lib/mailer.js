import nodemailer from 'nodemailer';

// Creates a transporter using Gmail SMTP
// The user must add EMAIL_USER and EMAIL_PASS to their .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
    },
});

/**
 * Send a password-reset OTP email
 * @param {string} toEmail - recipient email address
 * @param {string} otp     - 6-digit OTP code
 */
export const sendOTPEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"Chat App" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Your Password Reset OTP',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; 
                    background: #1a1a2e; border-radius: 12px; color: #fff; border: 1px solid #444;">
            <h2 style="color: #a78bfa; margin-bottom: 8px;">Password Reset</h2>
            <p style="color: #ccc; font-size: 15px;">Use the OTP below to reset your Chat App password. 
            It expires in <strong>10 minutes</strong>.</p>
            <div style="margin: 28px auto; text-align: center;">
                <span style="display: inline-block; background: #7c3aed; color: #fff;
                             font-size: 36px; font-weight: bold; letter-spacing: 10px;
                             padding: 16px 32px; border-radius: 10px;">
                    ${otp}
                </span>
            </div>
            <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};
