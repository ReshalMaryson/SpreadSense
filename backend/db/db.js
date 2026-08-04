const mongoose = require("mongoose");

const ConnectDB = async () => {
  try {
    const db = await mongoose.connect(process.env.DB_URI);
    console.log("DB Connected");
  } catch (err) {
    console.log(err);
  }
};

module.exports = ConnectDB;
