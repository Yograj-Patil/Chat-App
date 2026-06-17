import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import {
    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
    respondToRequest,
    getMyContacts,
    removeFriend,
} from '../controllers/friendController.js';

const friendRouter = express.Router();

friendRouter.get('/search', protectRoute, searchUsers);
friendRouter.post('/send-request', protectRoute, sendFriendRequest);
friendRouter.get('/incoming-requests', protectRoute, getIncomingRequests);
friendRouter.put('/respond', protectRoute, respondToRequest);
friendRouter.get('/my-contacts', protectRoute, getMyContacts);
friendRouter.delete('/remove', protectRoute, removeFriend);

export default friendRouter;
