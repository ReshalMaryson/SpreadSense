const Chat = require("../../models/chatHistorySchema");

const DAILY_LIMIT = 50;

async function dailyDbLimiter(req, res, next) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const countToday = await Chat.countDocuments({
      userId: req.id,
      createdAt: { $gte: startOfDay },
    });

    if (countToday >= DAILY_LIMIT) {
      return res.status(429).json({
        status: false,
        message: "Daily messages limit reached. Please try again tomorrow.",
        error: "rate_limit_exceeded_daily",
      });
    }

    next();
  } catch (err) {
    console.error("Daily rate limit check failed:", err);
    next();
  }
}

module.exports = dailyDbLimiter;