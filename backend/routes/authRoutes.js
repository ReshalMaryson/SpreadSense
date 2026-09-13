const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// controllers
const {
  Login,
  Logout,
  refreshToken,
  GoogleLogin,
} = require("../controllers/auth");

// middlewares
const verifyToken = require("../middlewares/auth/verifyJWT");
const authLimiter = require("../middlewares/rateLimit/authLimiter");

//----Login----
router.post("/login", authLimiter, Login);

//-----------google login route
router.post("/google", authLimiter, GoogleLogin);

// --------------logout with JWT + sessions + cookies + refresh token---------
router.post("/logout", verifyToken, Logout);

// -------------refresh token route----------------
router.post("/refresh", authLimiter, refreshToken);

module.exports = router;
