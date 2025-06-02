const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Make io accessible to routes
app.set('io', io);

app.use("/api/auth", authRoutes);

// Socket.IO: Handle real-time chat
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    } else {
      console.warn(`Invalid userId for join: ${userId}`);
    }
  });

  socket.on("sendMessage", ({ senderId, receiverId, content, timestamp }) => {
    if (
      mongoose.Types.ObjectId.isValid(senderId) &&
      mongoose.Types.ObjectId.isValid(receiverId) &&
      content && typeof content === "string" && content.trim()
    ) {
      const message = {
        senderId,
        receiverId,
        content: content.trim(),
        timestamp: timestamp || new Date(),
        isRead: false,
      };
      console.log('Emitting message:', message);
      io.to(receiverId).emit("receiveMessage", message);
      io.to(senderId).emit("receiveMessage", message);
    } else {
      console.warn("Invalid message data:", { senderId, receiverId, content });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// MongoDB connection with retry logic
mongoose.set("bufferCommands", false);
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.log("Retrying connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));