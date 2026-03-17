const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const http = require("http");
const { Server } = require("socket.io");
// ... other imports ...

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// CORS middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

app.set('io', io);
app.use("/api/auth", authRoutes);

// Sockets ...
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    }
  });

  socket.on("sendMessage", ({ senderId, receiverId, content, timestamp }) => {
    if (
      mongoose.Types.ObjectId.isValid(senderId) &&
      mongoose.Types.ObjectId.isValid(receiverId) &&
      typeof content === "string" &&
      content.trim()
    ) {
      const message = {
        senderId,
        receiverId,
        content: content.trim(),
        timestamp: timestamp || new Date(),
        isRead: false,
      };
      io.to(receiverId).emit("receiveMessage", message);
      io.to(senderId).emit("receiveMessage", message); // optional: echo back to sender
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("MongoDB connected ✅");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));