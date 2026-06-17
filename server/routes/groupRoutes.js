import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import {
    createGroup, getUserGroups, getGroupMessages,
    sendGroupMessage, addGroupMember, removeGroupMember,
    updateGroup, deleteGroup, deleteGroupMessage,
} from '../controllers/groupController.js';
import { upload } from '../lib/multer.js';

const groupRouter = express.Router();

groupRouter.post('/create', protectRoute, upload.single('groupPic'), createGroup);
groupRouter.get('/my-groups', protectRoute, getUserGroups);
groupRouter.get('/messages/:groupId', protectRoute, getGroupMessages);
groupRouter.post('/send/:groupId', protectRoute, upload.single('media'), sendGroupMessage);
groupRouter.put('/add-member/:groupId', protectRoute, addGroupMember);
groupRouter.put('/remove-member/:groupId', protectRoute, removeGroupMember);
groupRouter.put('/update/:groupId', protectRoute, updateGroup);
groupRouter.delete('/delete/:groupId', protectRoute, deleteGroup);
groupRouter.delete('/message/:messageId', protectRoute, deleteGroupMessage);

export default groupRouter;
