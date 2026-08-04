// middleware to verify JWT token.
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "JWT : Token not found" });
  }

  try {
    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);

    req.id = verifyToken.id;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
      });
    }

    return res.status(403).json({
      message: "Invalid token",
    });
  }
}

module.exports = verifyToken;
