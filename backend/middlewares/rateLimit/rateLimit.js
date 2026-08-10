const rateLimit = require("express-rate-limit");

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 5,
  standardHeaders: true, 
  legacyHeaders: false,

  keyGenerator: (req) => req.id,

  handler: (req, res) => {
    res.status(429).json({
      status: false,
      message: "Too many requests. Please wait a moment and try again.",
      error: "rate_limit_exceeded",
    });
  },
});

module.exports = chatLimiter;