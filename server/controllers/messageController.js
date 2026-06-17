import Message from '../models/Message.js';
import FriendRequest from '../models/FriendRequest.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import { io, userSocketMap } from '../server.js';

// Returns ONLY accepted friends (contacts) with unseen counts
export const getUsersForSidebar = async (req, res) => {
    try {
        const myId = req.user._id;

        const accepted = await FriendRequest.find({
            status: 'accepted',
            $or: [{ sender: myId }, { receiver: myId }],
        }).populate('sender', '-password').populate('receiver', '-password');

        const users = accepted.map((r) =>
            r.sender._id.toString() === myId.toString() ? r.receiver : r.sender
        );

        const unseenMessages = {};
        await Promise.all(
            users.map(async (user) => {
                const count = await Message.countDocuments({
                    senderId: user._id,
                    receiverId: myId,
                    seen: false,
                });
                if (count > 0) unseenMessages[user._id.toString()] = count;
            })
        );

        res.json({ success: true, users, unseenMessages });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ],
            deletedFor: { $ne: myId }, // exclude messages deleted for this user
        });
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId, seen: false }, { seen: true });
        const senderSocketId = userSocketMap[selectedUserId.toString()];
        if (senderSocketId) io.to(senderSocketId).emit('messagesSeen', { by: myId, to: selectedUserId });
        res.json({ success: true, messages });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findByIdAndUpdate(id, { seen: true }, { new: true });
        if (message) {
            const senderSocketId = userSocketMap[message.senderId.toString()];
            if (senderSocketId) io.to(senderSocketId).emit('messageSeen', { messageId: id });
        }
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getResourceType = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video';
    return 'raw';
};

export const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;
        const file = req.file;

        let imageUrl, videoUrl, audioUrl, fileData;
        if (file) {
            const mime = file.mimetype;
            const resourceType = getResourceType(mime);
            const result = await uploadToCloudinary(file.buffer, {
                resource_type: resourceType,
                folder: 'chat_media',
                ...(resourceType === 'raw' && { public_id: `chat_media/${Date.now()}_${file.originalname}` }),
            });
            if (mime.startsWith('image/')) imageUrl = result.secure_url;
            else if (mime.startsWith('video/')) videoUrl = result.secure_url;
            else if (mime.startsWith('audio/')) audioUrl = result.secure_url;
            else fileData = { url: result.secure_url, name: file.originalname, size: file.size, type: file.mimetype };
        }

        const newMessage = await Message.create({
            senderId, receiverId,
            text: text || undefined,
            image: imageUrl, video: videoUrl, audio: audioUrl, file: fileData,
            seen: false,
        });

        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) io.to(receiverSocketId).emit('newMessage', newMessage);

        res.json({ success: true, newMessage });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// Delete a message
// deleteFor=me   → adds userId to deletedFor array (only hidden for them)
// deleteFor=everyone → only sender can do this, marks deletedForEveryone=true
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteFor } = req.body; // 'me' | 'everyone'
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.json({ success: false, message: 'Message not found' });

        if (deleteFor === 'everyone') {
            // Only the sender can delete for everyone
            if (message.senderId.toString() !== userId.toString())
                return res.json({ success: false, message: 'Only the sender can delete for everyone' });

            message.deletedForEveryone = true;
            message.text = null;
            message.image = null;
            message.video = null;
            message.audio = null;
            message.file = null;
            await message.save();

            // Notify all parties via socket
            const otherUserId = message.receiverId
                ? message.receiverId.toString()
                : null;

            const payload = { messageId, groupId: message.groupId };

            if (otherUserId) {
                const otherSocket = userSocketMap[otherUserId];
                if (otherSocket) io.to(otherSocket).emit('messageDeleted', payload);
            }

            // Also notify group members if it's a group message
            if (message.groupId) {
                const Group = (await import('../models/Group.js')).default;
                const group = await Group.findById(message.groupId);
                if (group) {
                    group.members.forEach((memberId) => {
                        const socketId = userSocketMap[memberId.toString()];
                        if (socketId) io.to(socketId).emit('messageDeleted', payload);
                    });
                }
            }

            // Emit back to sender too
            const senderSocket = userSocketMap[userId.toString()];
            if (senderSocket) io.to(senderSocket).emit('messageDeleted', payload);

        } else {
            // Delete for me only — add to deletedFor array
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
