const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: false,
      message: "Too many attempts. Please wait a moment and try again.",
      error: "rate_limit_exceeded_auth",
    });
  },
});

module.exports = authLimiter;
