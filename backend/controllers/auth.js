const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// schema
const Users = require("../models/userSchema");
const refreshTokenSchema = require("../models/refreshTokenSchema");

// helper method
const { purgeOldSheets } = require("../cornjob/deleteOldFiles");
const { json } = require("express");

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof password != "string" ||
      typeof email != "string" ||
      !password ||
      password.trim() == "" ||
      !email ||
      email.trim() == ""
    ) {
      return res.status(400).json({ message: "missing required fields" });
    }

    const user = await Users.findOne({ email: email }).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "Un-Registered Credentials. Please Signup first.",
      });
    }

    const verified = await bcrypt.compare(password, user.password);
    if (!verified) {
      return res.status(400).json({ message: "invalid email or password" });
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1m",
      },
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "1d",
      },
    );

    if (refreshToken) {
      try {
        await refreshTokenSchema.create({
          user: user._id,
          token: refreshToken,
        });
      } catch (err) {
        console.error("Failed to persist refresh token during login:", err);
        return res
          .status(500)
          .json({ message: "Server error, please try again" });
      }
    }

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PROD" ? true : false,
      sameSite: process.env.APP_ENVIRONMENT === "PROD" ? "none" : "strict",
      maxAge: 1 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PROD" ? true : false,
      sameSite: process.env.APP_ENVIRONMENT === "PROD" ? "none" : "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    // delete files older than 20 days for the logged-in user
    await purgeOldSheets({ userId: user._id }).catch((err) => {
      console.error(
        `[purge] Login-triggered purge failed for user ${user._id}:`,
        err.message,
      );
    });

    // payload for the response
    const resUser = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    return res.status(200).json({ message: "login successful", data: resUser });
  } catch (err) {
    return res.status(500).json({ message: "server error " + err.message });
  }
};

// logout
exports.Logout = async (req, res) => {
  try {
    // get current refresh token
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await refreshTokenSchema.deleteOne({
        token: refreshToken,
      });
    }

    res.clearCookie("token");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: false,
      message: "failed Logout, Server Error",
    });
  }
};

exports.refreshToken = async (req, res) => {
  const rt = req.cookies.refreshToken;

  if (!rt) {
    return res.status(401).json({
      message: "Refresh token missing",
    });
  }

  try {
    const tokenVerify = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);

    const tokenExist = await refreshTokenSchema.findOne({ token: rt });

    if (!tokenExist) {
      await refreshTokenSchema.deleteMany({ user: tokenVerify.id });

      res.clearCookie("token");
      res.clearCookie("refreshToken");

      return res.status(403).json({
        message:
          "Refresh token reuse detected. All sessions revoked, please login again.",
      });
    }

    await refreshTokenSchema.deleteOne({ _id: tokenExist._id });

    const newAccessToken = jwt.sign(
      { id: tokenVerify.id },
      process.env.JWT_SECRET,
      { expiresIn: "1m" },
    );

    const newRefreshToken = jwt.sign(
      { id: tokenVerify.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1d" },
    );
    try {
      await refreshTokenSchema.create({
        user: tokenVerify.id,
        token: newRefreshToken,
      });
    } catch (err) {
      console.error("Failed to persist refresh token during login:", err);
      return res
        .status(500)
        .json({ message: "Server error, please try again" });
    }

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PRODUCTION" ? true : false,
      sameSite:
        process.env.APP_ENVIRONMENT === "PRODUCTION" ? "none" : "strict",
      maxAge: 1 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PRODUCTION" ? true : false,
      sameSite:
        process.env.APP_ENVIRONMENT === "PRODUCTION" ? "none" : "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Access token refreshed",
    });
  } catch (err) {
    return res.status(403).json({
      message: err.message,
    });
  }
};

// google login
exports.GoogleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "missing required fields" });
    }

    // verify token with Google
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );

    if (!googleRes.ok) {
      return res.status(401).json({ message: "invalid google token" });
    }

    const payload = await googleRes.json();

    // find or create user
    let user = await Users.findOne({ email: payload.email });
    if (!user) {
      user = await Users.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        avatar: payload.picture,
      });
    }

    // creating JWT for current user logged in.
    const jwtAccessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1m",
      },
    );

    // Refresh Token for the current user.
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // save refresh token in the DB
    if (refreshToken) {
      refreshTokenSchema.create({
        user: user._id,
        token: refreshToken,
      });
    }

    // save access token in cookie
    res.cookie("token", jwtAccessToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PRODUCTION" ? true : false,
      sameSite:
        process.env.APP_ENVIRONMENT === "PRODUCTION" ? "none" : "strict",
      maxAge: 3 * 60 * 1000,
    });

    // save refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.APP_ENVIRONMENT === "PRODUCTION" ? true : false,
      sameSite:
        process.env.APP_ENVIRONMENT === "PRODUCTION" ? "none" : "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    // payload for the response
    const resUser = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    return res.status(200).json({ message: "login successful", data: resUser });
  } catch (err) {
    return res.status(500).json({ message: "server error " + err.message });
  }
};
