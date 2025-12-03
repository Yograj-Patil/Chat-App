// import express from 'express';
// import "dotenv/config";
// import cors from 'cors';
// import http from 'node:http';
// import { connectDB } from './lib/db.js';
// import userRouter from './routes/userRoutes.js';
// import messageRouter from './routes/messageRoutes.js';
// import { Server } from 'socket.io';

// // Create Express app and HTTP Server

// const app = express();

// const server = http.createServer(app);

// // Intialize socket.io server
// export const io = new Server(server,  {
//     cors: {origin: "*"}
// });

// // Store online users
// export const userSocketMap = {}; // { userId: socketId }

// // socket.io connection handler
// io.on("connection", (socket) => {
//     const userId = socket.handshake.query.userId;
//     console.log("User connected ", userId);

//     if(userId) userSocketMap[userId] = socket.id;

//     // Emit online users to all connected clients
//     io.emit("getOnlineUsers", Object.keys(userSocketMap));

//     socket.on("disconnect", () => {
//         console.log("User Disconnected", userId);
//         delete userSocketMap[userId];
//         io.emit("getOnlineUsers", Object.keys(userSocketMap))
//     })
// })

// // Middleware SetUp

// app.use(express.json({limit: "4mb"}))
// app.use(cors());

// // Routes Setup
// app.use("/api/status", (req, res) => res.send("Server is live"));
// app.use("/api/auth", userRouter);
// app.use("/api/messages", messageRouter);


// // Connect to MongoDB
// await connectDB();


// const PORT = process.env.PORT || 5000;

// server.listen(PORT, () => console.log("Server is running on PORT : " + PORT));

// server/server.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "node:http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// Create Express app and HTTP Server
const app = express();
const server = http.createServer(app);

// Initialize socket.io server
export const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
});

// Store online users map (userId -> socketId)
export const userSocketMap = {};

// Expose io and userSocketMap globally so controllers can access them at runtime
globalThis.io = io;
globalThis.userSocketMap = userSocketMap;

// socket.io connection handler
io.on("connection", (socket) => {
  // Expect client to pass userId as query param when connecting
  const userId = socket.handshake.query?.userId;
  console.log("Socket connected:", socket.id, "userId:", userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
    // broadcast updated online users list
    io.emit("online-users", Object.keys(userSocketMap));

  }

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id, "userId:", userId);
    if (userId && userSocketMap[userId]) {
      delete userSocketMap[userId];
      io.emit("online-users", Object.keys(userSocketMap));
    }
  });
});

// Middleware
app.use(express.json({ limit: "1024mb" }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Routes Setup (names left exactly as in your repo)
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);         // your userRoutes handles signup/login/check
app.use("/api/messages", messageRouter);  // your messageRoutes

// Connect to MongoDB (your original connectDB)
await connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server is running on PORT : " + PORT));
