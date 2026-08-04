const mongoose = require("mongoose");
const bcyrpt = require("bcryptjs");

//Schemas
// const Tokens = require("../models/refreshTokenSchema");
const User = require("../models/userSchema");

//get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    if (!users) {
      return res.status(404).json({
        status: "failure",
        message: "failed to fetch users",
      });
    }

    return res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      status: "failure",
      message: "Server Error",
    });
  }
};

//create a user
exports.createUser = async (req, res) => {
  try {
    const password = req.body.password;

    const hashedPass = await bcyrpt.hash(password, 10);

    const payload = {
      name: req.body.name,
      email: req.body.email,
      password: hashedPass,
      role:req.body.role ?req.body.role:"user" 
    };

    const userAdded = await User.create(payload);

    if (!userAdded) {
      return res.status(400).json({
        status: "failure",
        message: "failed to create user",
      });
    }
    userAdded.password = "";
    return res.status(201).json({
      status: "success",
      message: "created",
      data: userAdded,
    });
  } catch (err) {
    return res.status(500).json({
      status: "failure",
      message: "Server Error " + err.message,
    });
  }
};

// get JWT verified user
exports.getVerifiedUser = async (req, res) => {
  try {
    const id = req.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(500).json({ status: "failure", message: "invalid Id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "failure", message: "User not found" });
    }

    //success respose
    return res
      .status(200)
      .json({ status: "success", message: "details fetched", user: user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: "failure",
      message: "Server Error",
    });
  }
};

// delete logged in user's account and delete its current token
exports.deleteUserAcc = async (req, res) => {
  try {
    const deleteduser = await User.findByIdAndDelete({ _id: req.id });
    
    if (!deleteduser) {
      return res.status(404).json({
        status: "failure",
        message: `User not found with id: ${req.id}`,
      });
    }

    // clear the cookies on the client side.
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      status: "success",
      message: "user deleted",
      data: deleteduser._id,
    });
  } catch (err) {
    return res.status(500).json({
      status: "failure",
      message: "Server Error " + err.message,
    });
  }
};

//update user
exports.updateUser = async (req, res) => {
  try {
    const Id = req.id;

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return res.status(400).json({ message: "invalid Id" });
    }

    const payload = {
      name: req.body.name,
      email:req.body.email
    };
    // update in the DB
    const userupdated = await User.findByIdAndUpdate(Id, payload, {
      new: true,
      runValidators: true,
    });

    if (!userupdated) {
      return res.status(404).json({
        status: "faliure",
        message: "failed to update/User not Found",
      });
    }

    return res
      .status(200)
      .json({ status: "success", message: "updated", user: userupdated });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "failure", message: "server error " + err.message });
  }
};