const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  skills: [String],
  profile: {
    bio: { type: String, default: "" },
    rating: { type: Number, default: 0 },
  },
  hiredFreelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  activeProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
  hiredWorks: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      client: { type: String, required: true },
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // Optional
      project: { type: String, required: true },
      status: { type: String, enum: ["Pending", "Completed", "Denied"], default: "Pending" },
      date: { type: Date, default: Date.now },
      review: { type: String, default: "" },
      rating: { type: Number, min: 0, max: 5, default: 0 }, // Allow 0
    },
  ],
  previousWorks: [
    {
      title: { type: String, required: true },
      description: { type: String },
      client: { type: String },
      date: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);