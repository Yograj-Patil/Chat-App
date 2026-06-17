import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import { getMessages, getUsersForSidebar, markMessageAsSeen, sendMessage, deleteMessage } from '../controllers/messageController.js';
import { upload } from '../lib/multer.js';

const messageRouter = express.Router();

messageRouter.get('/users', protectRoute, getUsersForSidebar);
messageRouter.get('/:id', protectRoute, getMessages);
messageRouter.put('/mark/:id', protectRoute, markMessageAsSeen);
messageRouter.post('/send/:id', protectRoute, upload.single('media'), sendMessage);
messageRouter.delete('/delete/:messageId', protectRoute, deleteMessage);

export default messageRouter;
