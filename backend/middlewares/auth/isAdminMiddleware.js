const User = require("../../models/userSchema");
const mongoose = require("mongoose");

exports.isAdmin = async (req, res, next) => {
  try {
    const Id = req.id;
    
    if (!Id || !mongoose.Types.ObjectId.isValid(Id)) {
      return res.status(400).json({
        status: "failure",
        message: "not a valid user id",
      });
    }

    const user = await User.findById(Id);

    if (!user) {
      return res.status(404).json({
        status: "failure",
        message: "user not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(401).json({
        status: "failure",
        message: "unauthorized | not an admin",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      status: "failure",
      message: "Server Error",
    });
  }
};
