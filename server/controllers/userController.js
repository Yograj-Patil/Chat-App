import { uploadToCloudinary } from '../lib/cloudinary.js';
import { generateToken } from '../lib/utils.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { sendOTPEmail } from '../lib/mailer.js';

// ─── Signup ──────────────────────────────────────────────────
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;
    try {
        if (!fullName || !email || !password || !bio)
            return res.json({ success: false, message: 'Missing Details' });

        const existing = await User.findOne({ email });
        if (existing)
            return res.json({ success: false, message: 'Account already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({ fullName, email, password: hashedPassword, bio });
        const token = generateToken(newUser._id);

        res.json({ success: true, userData: newUser, token, message: 'Account created successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// ─── Login ───────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });

        if (!userData)
            return res.json({ success: false, message: 'User not found' });

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect)
            return res.json({ success: false, message: 'Invalid credentials' });

        const token = generateToken(userData._id);
        res.json({ success: true, userData, token, message: 'Login successful' });
    } catch (error) {
        console.log(error.message, 'Login Unsuccessful');
        res.json({ success: false, message: error.message });
    }
};

// ─── Check Auth ──────────────────────────────────────────────
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};

// ─── Update Profile ──────────────────────────────────────────
export const updateProfile = async (req, res) => {
    try {
        const { bio, fullName } = req.body;
        const userId = req.user._id;
        const file = req.file; // profilePic via multer

        let updatedUser;
        if (file) {
            const result = await uploadToCloudinary(file.buffer, {
                resource_type: 'image',
                folder: 'chat_profiles',
            });
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { profilePic: result.secure_url, bio, fullName },
                { new: true }
            );
        } else {
            updatedUser = await User.findByIdAndUpdate(userId, { bio, fullName }, { new: true });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ─── Send OTP for password reset ─────────────────────────────
export const sendResetOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user)
            return res.json({ success: false, message: 'No account found with this email' });

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        user.resetOTP = otp;
        user.resetOTPExpiry = expiry;
        await user.save();

        await sendOTPEmail(email, otp);

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ─── Verify OTP & Reset Password ─────────────────────────────
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword)
            return res.json({ success: false, message: 'All fields are required' });

        const user = await User.findOne({ email });
        if (!user)
            return res.json({ success: false, message: 'User not found' });

        if (user.resetOTP !== otp)
            return res.json({ success: false, message: 'Invalid OTP' });

        if (!user.resetOTPExpiry || user.resetOTPExpiry < new Date())
            return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });

        if (newPassword.length < 6)
            return res.json({ success: false, message: 'Password must be at least 6 characters' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOTP = '';
        user.resetOTPExpiry = null;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
