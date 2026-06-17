import Group from '../models/Group.js';
import Message from '../models/Message.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import { io, userSocketMap } from '../server.js';

const getResourceType = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'video'; // Cloudinary uses 'video' for audio too
    return 'raw';
};

export const createGroup = async (req, res) => {
    try {
        const { name, description, members } = req.body;
        const admin = req.user._id;

        if (!name || !members || members.length === 0)
            return res.json({ success: false, message: 'Name and members are required' });

        const allMembers = [...new Set([admin.toString(), ...JSON.parse(members)])];

        const group = await Group.create({
            name, description: description || '', admin, members: allMembers,
        });

        const populatedGroup = await Group.findById(group._id)
            .populate('members', '-password').populate('admin', '-password');

        allMembers.forEach((memberId) => {
            const socketId = userSocketMap[memberId.toString()];
            if (socketId) io.to(socketId).emit('groupCreated', populatedGroup);
        });

        res.json({ success: true, group: populatedGroup });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({ members: userId })
            .populate('members', '-password').populate('admin', '-password');
        res.json({ success: true, groups });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const messages = await Message.find({ groupId, deletedFor: { $ne: userId } }).populate('senderId', 'fullName profilePic');
        await Message.updateMany({ groupId, seenBy: { $ne: userId } }, { $addToSet: { seenBy: userId } });
        res.json({ success: true, messages });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { text } = req.body;
        const senderId = req.user._id;
        const file = req.file;

        const group = await Group.findById(groupId);
        if (!group) return res.json({ success: false, message: 'Group not found' });

        let imageUrl, videoUrl, audioUrl, fileData;

        if (file) {
            const mime = file.mimetype;
            const resourceType = getResourceType(mime);

            const uploadResult = await uploadToCloudinary(file.buffer, {
                resource_type: resourceType,
                folder: 'chat_media',
                ...(resourceType === 'raw' && {
                    public_id: `chat_media/${Date.now()}_${file.originalname}`,
                }),
            });

            if (mime.startsWith('image/')) imageUrl = uploadResult.secure_url;
            else if (mime.startsWith('video/')) videoUrl = uploadResult.secure_url;
            else if (mime.startsWith('audio/')) audioUrl = uploadResult.secure_url;
            else fileData = { url: uploadResult.secure_url, name: file.originalname, size: file.size, type: file.mimetype };
        }

        const newMessage = await Message.create({
            senderId, groupId,
            text: text || undefined,
            image: imageUrl, video: videoUrl, audio: audioUrl, file: fileData,
            seenBy: [senderId],
        });

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'fullName profilePic');

        group.members.forEach((memberId) => {
            const socketId = userSocketMap[memberId.toString()];
            if (socketId) io.to(socketId).emit('newGroupMessage', { message: populatedMessage, groupId });
        });

        res.json({ success: true, newMessage: populatedMessage });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const addGroupMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.json({ success: false, message: 'Group not found' });
        if (group.admin.toString() !== requesterId.toString())
            return res.json({ success: false, message: 'Only admin can add members' });
        if (group.members.map(m => m.toString()).includes(userId))
            return res.json({ success: false, message: 'User already in group' });

        group.members.push(userId);
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate('members', '-password').populate('admin', '-password');

        updatedGroup.members.forEach((member) => {
            const socketId = userSocketMap[member._id.toString()];
            if (socketId) io.to(socketId).emit('groupUpdated', updatedGroup);
        });

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.json({ success: false, message: 'Group not found' });
        if (group.admin.toString() !== requesterId.toString())
            return res.json({ success: false, message: 'Only admin can remove members' });

        const prevMembers = group.members.map(m => m.toString());
        group.members = group.members.filter((m) => m.toString() !== userId);
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate('members', '-password').populate('admin', '-password');

        prevMembers.forEach((memberId) => {
            const socketId = userSocketMap[memberId];
            if (socketId) io.to(socketId).emit('groupUpdated', updatedGroup);
        });

        const removedSocketId = userSocketMap[userId];
        if (removedSocketId) io.to(removedSocketId).emit('removedFromGroup', groupId);

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;
        const requesterId = req.user._id;
        const file = req.file;

        const group = await Group.findById(groupId);
        if (!group) return res.json({ success: false, message: 'Group not found' });
        if (group.admin.toString() !== requesterId.toString())
            return res.json({ success: false, message: 'Only admin can update group' });

        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (file) {
            const result = await uploadToCloudinary(file.buffer, { resource_type: 'image', folder: 'chat_media' });
            group.groupPic = result.secure_url;
        }
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate('members', '-password').populate('admin', '-password');

        updatedGroup.members.forEach((member) => {
            const socketId = userSocketMap[member._id.toString()];
            if (socketId) io.to(socketId).emit('groupUpdated', updatedGroup);
        });

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.json({ success: false, message: 'Group not found' });
        if (group.admin.toString() !== requesterId.toString())
            return res.json({ success: false, message: 'Only admin can delete this group' });

        const memberIds = group.members.map(m => m.toString());
        await Message.deleteMany({ groupId });
        await Group.findByIdAndDelete(groupId);

        memberIds.forEach((memberId) => {
            const socketId = userSocketMap[memberId];
            if (socketId) io.to(socketId).emit('groupDeleted', groupId);
        });

        res.json({ success: true, message: 'Group deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete a group message
export const deleteGroupMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteFor } = req.body; // 'me' | 'everyone'
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.json({ success: false, message: 'Message not found' });
        if (!message.groupId) return res.json({ success: false, message: 'Not a group message' });

        if (deleteFor === 'everyone') {
            if (message.senderId.toString() !== userId.toString())
                return res.json({ success: false, message: 'Only the sender can delete for everyone' });

            message.deletedForEveryone = true;
            message.text = null;
            message.image = null;
            message.video = null;
            message.audio = null;
            message.file = null;
            await message.save();

            const group = await Group.findById(message.groupId);
            if (group) {
                group.members.forEach((memberId) => {
                    const socketId = userSocketMap[memberId.toString()];
                    if (socketId) io.to(socketId).emit('messageDeleted', { messageId, groupId: message.groupId });
                });
            }
        } else {
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
