const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// controllers
const { Login, Logout, refreshToken ,GoogleLogin} = require("../controllers/auth");

// middlewares
const verifyToken = require("../middlewares/auth/verifyJWT");
const rateLimit = require("../middlewares/rateLimit/rateLimit");

//----Login----
router.post("/login", ratelimiter,Login);

//-----------google login route
router.post("/google",ratelimiter,GoogleLogin);

// --------------logout with JWT + sessions + cookies + refresh token---------
router.post("/logout", verifyToken,ratelimiter,Logout);

// -------------refresh token route----------------
router.post("/refresh",ratelimiter,refreshToken);

module.exports = router;
