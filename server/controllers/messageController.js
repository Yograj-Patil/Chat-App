// import Message from "../models/Message.js";
// import User from "../models/User.js";
// import cloudinary from "../lib/cloudinary.js";
// import { io, userSocketMap } from "../server.js";


// // Get all users except the logged in user
// export const getUsersForSidebar = async (req, res) => {
//     try {
//         const userId = req.user._id;

//         const filteredUsers = await User.find({_id: {$ne: userId}}).select("-password");

//         // Count number of messages not seen

//         const unseenMessages = {}
//         const promises = filteredUsers.map(async (user) => {
//             const messages = await Message.find({senderId: user._id, receiverId: userId, seen: false});

//             if(messages.length > 0) {
//                 unseenMessages[user._id] = messages.length;
//             }
//         })
//         await Promise.all(promises);
//         res.json({success: true, users: filteredUsers, unseenMessages});
//     }
//     catch(error) {
//         console.log(error.message);

//         res.json({success: false, message: error.message});
//     }
// }

// // Get all messages for selected user
// export const getMessages = async (req, res) => {
//     try {
//         const { id: selectedUserId } = req.params;
//         const myId = req.user._id;

//         const messages = await Message.find({
//             $or: [
//                 {senderId: myId, receiverId: selectedUserId},
//                 {senderId: selectedUserId, receiverId: myId}
//             ]
//         })
//         await Message.updateMany({senderId: selectedUserId, receiverId: myId}, {seen: true});

//         res.json({success: true, messages})
//     }
//     catch(error) {
//         console.log(error.message);

//         res.json({success: false, message: error.message});
    
//     }
// }

// // api to mark message as seen using message id
// export const markMessageAsSeen = async (req, res) => {
//     try {
//         const { id } = req.params;
//         await Message.findByIdAndUpdate(id, {seen: true});
//         res.json({success: true});
//     }
//     catch(error) {
//         console.log(error.message);

//         res.json({success: false, message: error.message});
            
//     }
// }

// // send message to selected user
// export const sendMessage = async (req, res) => {
//     try {
//         const { text, image } = req.body;
//         const receiverId = req.params.id;
//         const senderId = req.user._id;

//         let imageUrl;
//         if(image) {
//             const uploadResponse = await cloudinary.uploader.upload(image);
//             imageUrl = uploadResponse.secure_url;
//         }

//         const newMessage = await Message.create({
//             senderId,
//             receiverId,
//             text,
//             image: imageUrl
//         })

//         // Emit the new message to the receiver's socket
//         const receiverSocketId = userSocketMap[receiverId];

//         if(receiverSocketId) {
//             io.to(receiverSocketId).emit("newMessage", newMessage);
//         }

//         res.json({success: true, newMessage})
//     }
//     catch(error) {
//         console.log(error.message);

//         res.json({success: false, message: error.message});
            
//     }
// }

// server/controllers/messageController.js
import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * Get all users except the logged-in one for sidebar,
 * along with unseen message counts from each user.
 */
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;

    // Exclude logged-in user and omit password
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

    // Count unseen messages from each user to logged-in user
    const unseenMessages = {};
    const tasks = filteredUsers.map(async (user) => {
      const count = await Message.countDocuments({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (count > 0) unseenMessages[user._id] = count;
    });
    await Promise.all(tasks);

    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.error("getUsersForSidebar error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Fetch all messages between the logged-in user and receiverId
 */
export const getMessages = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: "Receiver ID required" });
    }

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Send a new message (text or image) and notify receiver if online
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;
    const { text, image } = req.body;

    if (!receiverId || (!text && !image)) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID and message content (text or image) required",
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image,
      seen: false,
    });

    // notify receiver if online
    const receiverSocketId = globalThis.userSocketMap?.[receiverId];
    if (receiverSocketId && globalThis.io) {
      globalThis.io.to(receiverSocketId).emit("new-message", newMessage);
    }

    res.status(201).json({ success: true, newMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Mark a specific message as seen
 */
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params; // message ID
    if (!id) {
      return res.status(400).json({ success: false, message: "Message ID required" });
    }

    const updated = await Message.findByIdAndUpdate(id, { seen: true }, { new: true });
    res.json({ success: true, message: updated });
  } catch (error) {
    console.error("markMessageAsSeen error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
