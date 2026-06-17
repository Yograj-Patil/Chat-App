import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { io, userSocketMap } from '../server.js';

// Search users you are NOT yet friends with (to send a request)
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const myId = req.user._id;

        if (!query || query.trim().length < 2)
            return res.json({ success: false, message: 'Enter at least 2 characters to search' });

        // Find users matching the query, excluding yourself
        const users = await User.find({
            _id: { $ne: myId },
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        }).select('fullName email profilePic bio').limit(20);

        // Get my pending/accepted requests to show status for each user
        const myRequests = await FriendRequest.find({
            $or: [{ sender: myId }, { receiver: myId }],
        });

        const usersWithStatus = users.map((user) => {
            const req1 = myRequests.find(
                (r) => r.sender.toString() === user._id.toString() && r.receiver.toString() === myId.toString()
            );
            const req2 = myRequests.find(
                (r) => r.sender.toString() === myId.toString() && r.receiver.toString() === user._id.toString()
            );

            let status = 'none'; // no relation
            if (req1?.status === 'accepted' || req2?.status === 'accepted') status = 'friends';
            else if (req2?.status === 'pending') status = 'requestSent';
            else if (req1?.status === 'pending') status = 'requestReceived';

            return { ...user.toObject(), friendStatus: status };
        });

        res.json({ success: true, users: usersWithStatus });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { receiverId } = req.body;

        if (senderId.toString() === receiverId)
            return res.json({ success: false, message: "You can't add yourself" });

        // Check if already friends or request exists
        const existing = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId },
            ],
        });

        if (existing) {
            if (existing.status === 'accepted')
                return res.json({ success: false, message: 'Already friends' });
            if (existing.status === 'pending')
                return res.json({ success: false, message: 'Request already sent' });
            // If previously rejected, allow re-sending by updating status
            existing.status = 'pending';
            existing.sender = senderId;
            existing.receiver = receiverId;
            await existing.save();
        } else {
            await FriendRequest.create({ sender: senderId, receiver: receiverId });
        }

        const sender = await User.findById(senderId).select('fullName profilePic');

        // Notify receiver via socket in real time
        const receiverSocket = userSocketMap[receiverId];
        if (receiverSocket) {
            io.to(receiverSocket).emit('newFriendRequest', {
                sender,
                senderId: senderId.toString(),
            });
        }

        res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all pending incoming requests
export const getIncomingRequests = async (req, res) => {
    try {
        const myId = req.user._id;
        const requests = await FriendRequest.find({ receiver: myId, status: 'pending' })
            .populate('sender', 'fullName email profilePic bio');
        res.json({ success: true, requests });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Accept or reject a friend request
export const respondToRequest = async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'accept' | 'reject'
        const myId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request)
            return res.json({ success: false, message: 'Request not found' });
        if (request.receiver.toString() !== myId.toString())
            return res.json({ success: false, message: 'Not authorized' });

        request.status = action === 'accept' ? 'accepted' : 'rejected';
        await request.save();

        if (action === 'accept') {
            // Notify sender that request was accepted
            const senderSocket = userSocketMap[request.sender.toString()];
            const me = await User.findById(myId).select('fullName profilePic');
            if (senderSocket) {
                io.to(senderSocket).emit('friendRequestAccepted', {
                    by: me,
                    byId: myId.toString(),
                });
            }
        }

        res.json({ success: true, message: action === 'accept' ? 'Friend added' : 'Request rejected' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get my accepted contacts (friends list)
export const getMyContacts = async (req, res) => {
    try {
        const myId = req.user._id;

        const accepted = await FriendRequest.find({
            status: 'accepted',
            $or: [{ sender: myId }, { receiver: myId }],
        }).populate('sender', '-password').populate('receiver', '-password');

        // Return the OTHER person in each accepted request
        const contacts = accepted.map((req) => {
            return req.sender._id.toString() === myId.toString() ? req.receiver : req.sender;
        });

        // Also get unseen message counts for each contact
        const Message = (await import('../models/Message.js')).default;
        const unseenMessages = {};
        await Promise.all(
            contacts.map(async (contact) => {
                const count = await Message.countDocuments({
                    senderId: contact._id,
                    receiverId: myId,
                    seen: false,
                });
                if (count > 0) unseenMessages[contact._id.toString()] = count;
            })
        );

        res.json({ success: true, users: contacts, unseenMessages });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Remove a friend (unfriend)
export const removeFriend = async (req, res) => {
    try {
        const myId = req.user._id;
        const { friendId } = req.body;

        await FriendRequest.findOneAndDelete({
            status: 'accepted',
            $or: [
                { sender: myId, receiver: friendId },
                { sender: friendId, receiver: myId },
            ],
        });

        res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
