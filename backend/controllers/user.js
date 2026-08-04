const mongoose = require("mongoose");
const bcyrpt = require("bcryptjs");

//Schemas
// const Tokens = require("../models/refreshTokenSchema");
const User = require("../models/userSchema");

//create a user
exports.createUser = async (req, res) => {
  try {
    const password = req.body.password;

    const hashedPass = await bcyrpt.hash(password, 10);

    const payload = {
      name: req.body.name,
      email: req.body.email,
      password: hashedPass,
      role:req.body.role ? req.body.role : "user" 
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