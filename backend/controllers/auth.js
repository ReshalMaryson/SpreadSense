const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// schema
const Users = require("../models/userSchema");
const refreshTokenSchema = require("../models/refreshTokenSchema");

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!password || password.trim() == "" || !email || email.trim() == "") {
      return res.status(400).json({ message: "missing required fields" });
    }

    //fetch user by email
    const user = await Users.findOne({ email: email }).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "Un-Registered Credentials. Please Signup first.",
      });
    }

    // check the password
    const verified = await bcrypt.compare(password, user.password);
    if (!verified) {
      return res.status(400).json({ message: "invalid email or password" });
    }

    // creating JWT for current user logged in.
    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1m", // initial jwt expriy time for testing purpose.
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
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure:false, 
      sameSite: "strict",
   maxAge: 1 * 60 * 1000
    });

    // save refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:false, 
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000, 
    });

    // payload for the response
    const resUser = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    // success response
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
    // verify signature + expiry
    const tokenVerify = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);

    const tokenExist = await refreshTokenSchema.findOne({ token: rt });

    if (!tokenExist) {
      await refreshTokenSchema.deleteMany({ user: tokenVerify.id });

      res.clearCookie("token");
      res.clearCookie("refreshToken");

      return res.status(403).json({
        message: "Refresh token reuse detected. All sessions revoked, please login again.",
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

    await refreshTokenSchema.create({
      user: tokenVerify.id,
      token: newRefreshToken,
    });


    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    maxAge: 3 * 60 * 1000
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
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
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
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
      secure:true, 
      sameSite: "none", 
      maxAge: 3 * 60 * 1000,
    });

    // save refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:true, 
      sameSite: "none",
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