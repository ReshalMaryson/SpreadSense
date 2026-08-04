const express = require("express");
const server = express();
// require("dotenv").config();
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const ConnectDB = require("./db/db");


// // routes source
// const userRoutes = require("./routes/userRoutes");
// const authRoutes = require("./routes/authRoutes");
// const apiRoutes = require("./routes/apiRoutes");
// const reviewRoutes=require("./routes/reviewRoutes");

// DB


//cors
// server.use(
//   cors({
//     origin: "https://critic-ai-lemon.vercel.app",
//     credentials: true,
//   }),
// );

//middlewares
server.use(express.json({limit:"1mb"}));
// server.use(cookieParser());

// db connect
// ConnectDB();

// server routes.
// server.use("/auth", authRoutes);
// server.use("/users", userRoutes);
// server.use("/api", apiRoutes);
// server.use("/reviews",reviewRoutes)

//server start
const PORT = process.env.PORT || 6000;
server.listen(PORT, () => {
  console.log(`live on port ${PORT}`);
});