import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupMessages, setGroupMessages] = useState([]);
    const [unseenGroupMessages, setUnseenGroupMessages] = useState({});

    const { socket, axios, authUser } = useContext(AuthContext);

    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) setMessages(data.messages);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const sendMessage = async (payload, onProgress) => {
        try {
            const isFormData = payload instanceof FormData;
            const { data } = await axios.post(
                `/api/messages/send/${selectedUser._id}`,
                payload,
                {
                    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
                    onUploadProgress: onProgress
                        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
                        : undefined,
                }
            );
            if (data.success) {
                setMessages((prev) => [...prev, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Delete a DM message
    const deleteMessage = async (messageId, deleteFor) => {
        try {
            const { data } = await axios.delete(`/api/messages/delete/${messageId}`, {
                data: { deleteFor },
            });
            if (data.success) {
                if (deleteFor === 'me') {
                    setMessages((prev) => prev.filter((m) => m._id !== messageId));
                }
                // 'everyone' is handled via socket event 'messageDeleted'
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Delete a group message
    const deleteGroupMessage = async (messageId, deleteFor) => {
        try {
            const { data } = await axios.delete(`/api/groups/message/${messageId}`, {
                data: { deleteFor },
            });
            if (data.success) {
                if (deleteFor === 'me') {
                    setGroupMessages((prev) => prev.filter((m) => m._id !== messageId));
                }
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ── Group functions ──────────────────────────────────────

    const getGroups = async () => {
        try {
            const { data } = await axios.get("/api/groups/my-groups");
            if (data.success) setGroups(data.groups);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const createGroup = async (groupData) => {
        try {
            const formData = new FormData();
            formData.append('name', groupData.name);
            formData.append('description', groupData.description || '');
            formData.append('members', JSON.stringify(groupData.members));
            const { data } = await axios.post("/api/groups/create", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data.success) {
                toast.success("Group created!");
                return data.group;
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const getGroupMessages = async (groupId) => {
        try {
            const { data } = await axios.get(`/api/groups/messages/${groupId}`);
            if (data.success) setGroupMessages(data.messages);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const sendGroupMessage = async (payload, onProgress) => {
        try {
            let body = payload instanceof FormData ? payload : new FormData();
            if (!(payload instanceof FormData) && payload.text) body.append('text', payload.text);
            const { data } = await axios.post(
                `/api/groups/send/${selectedGroup._id}`,
                body,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: onProgress
                        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
                        : undefined,
                }
            );
            if (data.success) {
                setGroupMessages((prev) => [...prev, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            const { data } = await axios.delete(`/api/groups/delete/${groupId}`);
            if (data.success) {
                setGroups((prev) => prev.filter((g) => g._id !== groupId));
                setSelectedGroup(null);
                setGroupMessages([]);
                toast.success("Group deleted");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ── Socket subscriptions ─────────────────────────────────

    const subscribeToMessages = () => {
        if (!socket) return;

        // New DM received
        socket.on("newMessage", (newMessage) => {
            if (newMessage.senderId === authUser._id) return; // skip own

            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prev) => [...prev, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`);
            } else {
                setUnseenMessages((prev) => ({
                    ...prev,
                    [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
                }));
            }
        });

        // ── Message deleted for everyone ──────────────────
        socket.on('messageDeleted', ({ messageId, groupId }) => {
            if (groupId) {
                setGroupMessages((prev) => prev.map((m) =>
                    m._id === messageId
                        ? { ...m, deletedForEveryone: true, text: null, image: null, video: null, audio: null, file: null }
                        : m
                ));
            } else {
                setMessages((prev) => prev.map((m) =>
                    m._id === messageId
                        ? { ...m, deletedForEveryone: true, text: null, image: null, video: null, audio: null, file: null }
                        : m
                ));
            }
        });

        // ── Read receipts ──────────────────────────────────

        // Someone opened your chat → mark ALL your sent messages to them as seen
        socket.on("messagesSeen", ({ by, to }) => {
            // `by` is the person who opened the chat (the receiver of your messages)
            // Update messages where YOU are the sender and THEY are the receiver
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.senderId === authUser._id && msg.receiverId === by.toString()
                        ? { ...msg, seen: true }
                        : msg
                )
            );
        });

        // A single message was individually marked seen
        socket.on("messageSeen", ({ messageId }) => {
            setMessages((prev) =>
                prev.map((msg) => (msg._id === messageId ? { ...msg, seen: true } : msg))
            );
        });

        // New group message
        socket.on("newGroupMessage", ({ message, groupId }) => {
            const senderId = message.senderId?._id || message.senderId;
            if (senderId === authUser._id) return;
            if (selectedGroup && selectedGroup._id === groupId) {
                setGroupMessages((prev) => [...prev, message]);
            } else {
                setUnseenGroupMessages((prev) => ({
                    ...prev,
                    [groupId]: (prev[groupId] || 0) + 1,
                }));
            }
        });

        socket.on("groupCreated", (group) => {
            setGroups((prev) => {
                if (prev.find((g) => g._id === group._id)) return prev;
                return [...prev, group];
            });
            const isAdmin = group.admin._id === authUser._id || group.admin === authUser._id;
            if (!isAdmin) toast.success(`You were added to "${group.name}"`);
        });

        socket.on("groupUpdated", (updatedGroup) => {
            setGroups((prev) => prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)));
            if (selectedGroup?._id === updatedGroup._id) setSelectedGroup(updatedGroup);
        });

        socket.on("groupDeleted", (groupId) => {
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            if (selectedGroup?._id === groupId) { setSelectedGroup(null); setGroupMessages([]); }
        });

        socket.on("removedFromGroup", (groupId) => {
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            if (selectedGroup?._id === groupId) { setSelectedGroup(null); setGroupMessages([]); }
            toast.error("You were removed from a group");
        });
    };

    const unsubscribeFromMessages = () => {
        if (socket) {
            socket.off("newMessage");
            socket.off("messagesSeen");
            socket.off("messageSeen");
            socket.off("newGroupMessage");
            socket.off("groupCreated");
            socket.off("groupUpdated");
            socket.off("groupDeleted");
            socket.off("removedFromGroup");
        }
    };

    useEffect(() => {
        subscribeToMessages();
        return () => unsubscribeFromMessages();
    }, [socket, selectedUser, selectedGroup, authUser]);

    const value = {
        messages, users, selectedUser, unseenMessages,
        getUsers, getMessages, sendMessage, setSelectedUser, setUnseenMessages,
        groups, selectedGroup, setSelectedGroup, groupMessages,
        unseenGroupMessages, setUnseenGroupMessages,
        getGroups, createGroup, getGroupMessages, sendGroupMessage, deleteGroup, deleteGroupMessage,
        deleteMessage,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
