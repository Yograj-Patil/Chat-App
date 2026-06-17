import express from 'express';
import { checkAuth, login, signup, updateProfile, sendResetOTP, resetPassword } from '../controllers/userController.js';
import { protectRoute } from '../middleware/auth.js';
import { upload } from '../lib/multer.js';

const userRouter = express.Router();

userRouter.post('/signup', signup);
userRouter.post('/login', login);
userRouter.put('/update-profile', protectRoute, upload.single('profilePic'), updateProfile);
userRouter.get('/check', protectRoute, checkAuth);

// Forgot password routes
userRouter.post('/send-reset-otp', sendResetOTP);
userRouter.post('/reset-password', resetPassword);

export default userRouter;
