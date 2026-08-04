const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, maxlength: 20, required: true },
    email: {
      type: String,
      required: false,
      maxlength: 30,
      unique: true,
      match: /.+\@.+\..+/, // simple email validation
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      required: true,
      default: "user",
    },
    password: {
      type: String,
      required: false,
      select: false, //will not be fetched by find()
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // allows multiple docs with no googleId without unique-index conflicts
    },
    avatar: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("user", userSchema);