const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

require("dotenv").config();

const router = express.Router();

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
});
const Message = mongoose.model("Message", messageSchema);

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Get Current User (Updated Route)
router.get("/user", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const user = await User.findById(userId).select(
      "name email skills profile hiredFreelancers hiredWorks clientWorks points rating reviews role field"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Populate hiredFreelancers
    await user.populate({
      path: "hiredFreelancers",
      select: "name skills",
      match: { _id: { $exists: true } },
    });

    // Compute clientWorks manually
    const clientWorks = await User.find({
      "hiredWorks.clientId": new mongoose.Types.ObjectId(userId),
    }).select("hiredWorks name");

    const clientWorkDetails = clientWorks
      .flatMap((u) =>
        u.hiredWorks
          .filter((work) => work.clientId && work.clientId.toString() === userId)
          .map((work) => ({
            freelancerId: u._id.toString(),
            freelancerName: u.name || "Unknown",
            project: work.project,
            status: work.status,
            date: work.date,
            review: work.review || "",
            rating: work.rating || 0,
            workId: work._id.toString(),
          }))
      );

    // Ensure profile exists
    const profile = user.profile || { rating: 0 };

    const userData = {
      id: user._id.toString(),
      name: user.name || "Unknown",
      email: user.email || "",
      skills: user.skills || [],
      profile: profile,
      hires: user.hiredFreelancers
        ? user.hiredFreelancers.map((f) => ({
            id: f._id.toString(),
            name: f.name || "Unknown",
            skills: f.skills || [],
          }))
        : [],
      clientWorks: clientWorkDetails.length > 0 ? clientWorkDetails : (user.clientWorks || []),
      points: user.points || (user.hiredWorks ? user.hiredWorks.filter((w) => w.review).length * 10 : 0),
      rating: profile.rating || 0,
      reviews: user.reviews || (user.hiredWorks ? user.hiredWorks.filter((w) => w.review).length : 0),
      role: user.role || (user.skills && user.skills.length > 0 ? "Freelancer & Client" : "Client"),
      field: user.field || (user.skills && user.skills.length > 0 ? user.skills[0] : "Not specified"),
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error.message, error.stack);
    res.status(500).json({ message: "Error fetching user data", error: error.message });
  }
});

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, skills } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      skills: Array.isArray(skills) ? skills.map(s => s.trim()).filter(s => s) : [],
      points: 0,
      rating: 0,
      reviews: 0,
      role: "Client",
      field: skills && skills.length > 0 ? skills[0] : "Not specified",
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error registering user:", error.message);
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        skills: user.skills || [],
      },
    });
  } catch (error) {
    console.error("Error logging in:", error.message);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// Search Freelancers Route
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const trimmedQuery = query.trim().toLowerCase();
    const freelancers = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: trimmedQuery, $options: "i" } },
            { skills: { $elemMatch: { $regex: trimmedQuery, $options: "i" } } },
          ],
        },
        { _id: { $ne: new mongoose.Types.ObjectId(userId) } },
      ],
    }).select("name skills profile.rating hiredWorks");

    const formattedFreelancers = freelancers
      .filter((user) => mongoose.Types.ObjectId.isValid(user._id))
      .map((user) => ({
        id: user._id.toString(),
        name: user.name || "Unknown",
        skill: user.skills.length > 0 ? user.skills[0] : "No skills listed",
        rating: user.profile.rating || 0,
        reviews: user.hiredWorks.filter((w) => w.review && w.review.length > 0).length || 0,
      }));

    res.status(200).json(formattedFreelancers);
  } catch (error) {
    console.error("Error searching freelancers:", error.message);
    res.status(500).json({ message: "Error searching freelancers", error: error.message });
  }
});

// Get Freelancer Profile Route
router.get("/freelancer/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid freelancer ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const user = await User.findById(id).select(
      "name skills profile.bio profile.rating previousWorks hiredWorks"
    );

    if (!user) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    const freelancer = {
      id: user._id.toString(),
      name: user.name || "Unknown",
      skills: user.skills || [],
      bio: user.profile.bio || "No bio provided",
      rating: user.profile.rating || 0,
      reviews: user.hiredWorks
        .filter((work) => work.review && work.review.length > 0)
        .map((work) => ({
          review: work.review,
          rating: work.rating,
          project: work.project,
          client: work.client,
          date: work.date,
        })),
      previousWorks: user.previousWorks || [],
      hiredWorks: user.hiredWorks.map((work) => ({
        id: work._id.toString(),
        project: work.project,
        client: work.client,
        status: work.status,
        date: work.date,
        review: work.review || "",
        rating: work.rating || 0,
      })),
    };

    res.status(200).json(freelancer);
  } catch (error) {
    console.error("Error fetching freelancer profile:", error.message);
    res.status(500).json({ message: "Error fetching freelancer profile", error: error.message });
  }
});

// Hire Freelancer Route
router.post("/hire", verifyToken, async (req, res) => {
  try {
    const { freelancerId, project } = req.body;
    const clientId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res.status(400).json({ message: "Invalid freelancer ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID in token" });
    }

    if (!project || typeof project !== "string" || project.trim() === "") {
      return res.status(400).json({ message: "Project name is required" });
    }

    const client = await User.findById(clientId).select("name");
    const freelancer = await User.findById(freelancerId).select("name");

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    await User.updateOne(
      { _id: freelancerId },
      {
        $push: {
          hiredWorks: {
            client: client.name,
            clientId: new mongoose.Types.ObjectId(clientId),
            project: project.trim(),
            status: "Pending",
            date: new Date(),
            review: "",
            rating: 0,
          },
        },
      }
    );

    await User.updateOne(
      { _id: clientId },
      { $addToSet: { hiredFreelancers: new mongoose.Types.ObjectId(freelancerId) } }
    );

    // Add to client's clientWorks
    await User.updateOne(
      { _id: clientId },
      {
        $push: {
          clientWorks: {
            freelancerId: new mongoose.Types.ObjectId(freelancerId),
            freelancerName: freelancer.name,
            project: project.trim(),
            status: "Pending",
            date: new Date(),
            review: "",
            rating: 0,
          },
        },
      }
    );

    res.status(200).json({ message: `Successfully hired ${freelancer.name}` });
  } catch (error) {
    console.error("Error hiring freelancer:", error.message);
    res.status(500).json({ message: "Error hiring freelancer", error: error.message });
  }
});

// Get User's Work History Route
router.get("/workhistory", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const user = await User.findById(userId).select("hiredWorks profile.rating");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const asFreelancer = user.hiredWorks.map((work) => ({
      _id: work._id.toString(),
      client: work.client,
      clientId: work.clientId?.toString(),
      project: work.project,
      status: work.status,
      date: work.date,
      review: work.review || "",
      rating: work.rating || 0,
    }));

    const clientWorks = await User.find({
      "hiredWorks.clientId": new mongoose.Types.ObjectId(userId),
    }).select("hiredWorks name");

    const asClient = clientWorks
      .flatMap((user) =>
        user.hiredWorks
          .filter((work) => work.clientId && work.clientId.toString() === userId)
          .map((work) => ({
            _id: work._id.toString(),
            client: user.name || "Unknown",
            project: work.project,
            status: work.status,
            date: work.date,
            review: work.review || "",
            rating: work.rating || 0,
            freelancerId: user._id.toString(),
            freelancerName: user.name || "Unknown",
          }))
      );

    res.status(200).json({
      asFreelancer: asFreelancer || [],
      asClient: asClient || [],
    });
  } catch (error) {
    console.error("Error fetching work history:", error.message);
    res.status(500).json({ message: "Error fetching work history", error: error.message });
  }
});

// Update Work Status Route
router.patch("/work/:workId/status", verifyToken, async (req, res) => {
  try {
    const { workId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({ message: "Invalid work ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    if (!["Pending", "Completed", "Denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      "hiredWorks._id": new mongoose.Types.ObjectId(workId),
    });

    if (!user) {
      return res.status(404).json({ message: "Work not found for this user" });
    }

    const work = user.hiredWorks.id(workId);
    if (!work) {
      return res.status(404).json({ message: "Work not found in hiredWorks" });
    }

    if (work.status === "Completed" || work.status === "Denied") {
      return res.status(400).json({ message: "Work status cannot be changed once finalized" });
    }

    // Update status in freelancer's hiredWorks
    await User.updateOne(
      { _id: userId, "hiredWorks._id": new mongoose.Types.ObjectId(workId) },
      { $set: { "hiredWorks.$.status": status } }
    );

    // Update status in client's clientWorks
    await User.updateOne(
      { _id: work.clientId, "clientWorks.project": work.project },
      { $set: { "clientWorks.$.status": status } }
    );

    if (status === "Completed") {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            previousWorks: {
              title: work.project,
              description: `Completed for ${work.client}`,
              client: work.client,
              date: new Date(),
            },
          },
          $inc: { points: 10 }, // Increment points for completing work
        }
      );
    }

    res.status(200).json({ message: `Work status updated to ${status}` });
  } catch (error) {
    console.error("Error updating work status:", error.message);
    res.status(500).json({ message: "Error updating work status", error: error.message });
  }
});

// Submit Review and Rating Route
router.patch("/work/:workId/review", verifyToken, async (req, res) => {
  try {
    const { workId } = req.params;
    const { review, rating } = req.body;
    const userId = req.user.userId;

    console.log("Review submission:", { workId, review, rating, userId });

    if (typeof review !== "string" || review.trim().length === 0) {
      console.log("Validation failed: Invalid review");
      return res.status(400).json({ message: "Review is required and must be a non-empty string" });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      console.log("Validation failed: Invalid rating");
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    if (!mongoose.Types.ObjectId.isValid(workId)) {
      console.log("Validation failed: Invalid work ID");
      return res.status(400).json({ message: "Invalid work ID" });
    }

    const freelancer = await User.findOne({
      "hiredWorks._id": new mongoose.Types.ObjectId(workId),
    });

    if (!freelancer) {
      console.log("Work not found for workId:", workId);
      return res.status(404).json({ message: "Work not found" });
    }

    const work = freelancer.hiredWorks.id(workId);
    if (!work) {
      console.log("Work not found in hiredWorks:", workId);
      return res.status(404).json({ message: "Work not found in hiredWorks" });
    }

    if (work.status !== "Completed") {
      console.log("Validation failed: Work not Completed, status:", work.status);
      return res.status(400).json({ message: "Reviews can only be submitted for Completed works" });
    }

    if (work.clientId && work.clientId.toString() !== userId) {
      console.log("Validation failed: User is not client, userId:", userId, "clientId:", work.clientId);
      return res.status(403).json({ message: "Only the client can submit a review" });
    }

    if (work.review && work.review.length > 0) {
      console.log("Validation failed: Work already reviewed");
      return res.status(400).json({ message: "This work has already been reviewed" });
    }

    // Update review and rating in freelancer's hiredWorks
    await User.updateOne(
      { _id: freelancer._id, "hiredWorks._id": new mongoose.Types.ObjectId(workId) },
      {
        $set: {
          "hiredWorks.$.review": review.trim(),
          "hiredWorks.$.rating": parsedRating,
        },
      }
    );

    // Update review and rating in client's clientWorks
    await User.updateOne(
      { _id: work.clientId, "clientWorks.project": work.project },
      {
        $set: {
          "clientWorks.$.review": review.trim(),
          "clientWorks.$.rating": parsedRating,
        },
      }
    );

    // Update freelancer's overall rating and reviews count
    const updatedFreelancer = await User.findById(freelancer._id);
    const ratings = updatedFreelancer.hiredWorks
      .filter((w) => w.rating > 0)
      .map((w) => w.rating);
    const newRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
        : 0;
    const reviewsCount = updatedFreelancer.hiredWorks.filter((w) => w.review).length;

    await User.updateOne(
      { _id: freelancer._id },
      {
        $set: { "profile.rating": newRating, reviews: reviewsCount },
        $inc: { points: 5 }, // Increment points for receiving a review
      }
    );

    console.log("Review saved successfully for workId:", workId);
    res.status(200).json({ message: "Review and rating submitted" });
  } catch (error) {
    console.error("Error submitting review:", error.message);
    res.status(500).json({ message: "Error submitting review", error: error.message });
  }
});

// Update User Profile Route
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { name, skills, bio } = req.body;
    const userId = req.user.userId;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Name is required and must be a non-empty string" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name.trim();
    user.skills = Array.isArray(skills) ? skills.map((s) => s.trim()).filter((s) => s) : [];
    user.profile.bio = typeof bio === "string" ? bio.trim() : "";
    user.field = user.skills && user.skills.length > 0 ? user.skills[0] : user.field;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        skills: user.skills,
        profile: user.profile,
        field: user.field,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

// Chat Routes
// Get all chat threads for the user
router.get("/chat/threads", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "name")
      .populate("receiverId", "name")
      .sort({ timestamp: -1 });

    const threads = {};
    messages.forEach((msg) => {
      const otherUserId = msg.senderId._id.toString() === userId ? msg.receiverId._id.toString() : msg.senderId._id.toString();
      const otherUserName = msg.senderId._id.toString() === userId ? msg.receiverId.name : msg.senderId.name;
      if (!threads[otherUserId] && otherUserName) {
        threads[otherUserId] = {
          userId: otherUserId,
          name: otherUserName || "Unknown",
          lastMessage: msg.content,
          timestamp: msg.timestamp,
          unreadCount: 0,
        };
      }
    });

    // Calculate unread counts for each thread
    for (const thread of Object.values(threads)) {
      const unreadCount = await Message.countDocuments({
        senderId: thread.userId,
        receiverId: userId,
        isRead: false,
      });
      thread.unreadCount = unreadCount;
    }

    res.status(200).json(Object.values(threads));
  } catch (err) {
    console.error("Error fetching chat threads:", err.message);
    res.status(500).json({ message: "Error fetching chat threads", error: err.message });
  }
});

// Get messages with a specific user
router.get("/chat/messages/:userId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid other user ID" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .populate("senderId", "name")
      .populate("receiverId", "name")
      .sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});

// Send a message
router.post("/chat/message", verifyToken, async (req, res) => {
  const { receiverId, content } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ message: "Invalid sender ID in token" });
    }
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = new Message({
      senderId: req.user.userId,
      receiverId,
      content: content.trim(),
      isRead: false,
    });
    await message.save();

    // Populate sender and receiver names for response
    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "name")
      .populate("receiverId", "name");

    const io = req.app.get('io');
    // Emit receiveMessage to both sender and receiver
    io.to(receiverId).emit('receiveMessage', populatedMessage);
    io.to(req.user.userId).emit('receiveMessage', populatedMessage);
    console.log(`Emitted receiveMessage to ${receiverId} and ${req.user.userId}:`, populatedMessage);

    // Emit unread count update to receiver
    const unreadCount = await Message.countDocuments({
      senderId: req.user.userId,
      receiverId,
      isRead: false,
    });
    io.to(receiverId).emit('updateUnread', {
      senderId: req.user.userId,
      unreadCount,
    });
    console.log(`Emitted updateUnread to ${receiverId}:`, { senderId: req.user.userId, unreadCount });

    res.status(200).json(populatedMessage);
  } catch (err) {
    console.error("Error sending message:", err.message);
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
});

// Mark messages as read
router.post("/chat/mark-read/:userId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid other user ID" });
    }

    await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    // Emit updated unread count
    const unreadCount = await Message.countDocuments({
      senderId: otherUserId,
      receiverId: userId,
      isRead: false,
    });
    const io = req.app.get('io');
    io.to(userId).emit('updateUnread', {
      senderId: otherUserId,
      unreadCount,
    });
    console.log(`Emitted updateUnread to ${userId}:`, { senderId: otherUserId, unreadCount });

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Error marking messages as read:", err.message);
    res.status(500).json({ message: "Error marking messages as read", error: err.message });
  }
});

// Get count of users with unread messages
router.get("/chat/unread-users", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    const unreadMessages = await Message.find({
      receiverId: userId,
      isRead: false,
    }).distinct('senderId');

    res.status(200).json({ unreadUsersCount: unreadMessages.length });
  } catch (err) {
    console.error("Error fetching unread users count:", err.message);
    res.status(500).json({ message: "Error fetching unread users count", error: err.message });
  }
});

module.exports = router;