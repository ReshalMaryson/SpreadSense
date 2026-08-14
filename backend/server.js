const express = require("express");
const server = express();

require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");

// DB
const ConnectDB = require("./db/db");

// db connect
ConnectDB();

// // routes source
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const chatRoutes = require("./routes/chatRoute");


  //cors
  server.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );

//middlewares
server.use(express.json({limit:"1mb"}));
server.use(cookieParser());


// server routes.
server.use("/auth", authRoutes);
server.use("/users", userRoutes);
server.use("/files", fileRoutes);
server.use("/chat", chatRoutes);

server.get("/timeout-test", (req, res) => {
  setTimeout(() => {
    res.json({ message: "Still alive after 45 seconds" });
  }, 100000);
});

//server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`live on port ${PORT}`);
});