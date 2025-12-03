export const getReceiverSocketId = (receiverId) => {
  return globalThis.userSocketMap?.[receiverId];
};
