import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    text: { type: String },
    image: { type: String },
    video: { type: String },
    audio: { type: String },
    file: {
        url: { type: String },
        name: { type: String },
        size: { type: Number },
        type: { type: String },
    },
    seen: { type: Boolean, default: false },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Delete for me — list of users who deleted this message from their view
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Delete for everyone — message is wiped for all parties
    deletedForEveryone: { type: Boolean, default: false },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
