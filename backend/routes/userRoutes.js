const express = require("express");
const router = express.Router();

//controller
const {
  getAllUsers,
  createUser,
  getVerifiedUser,
  deleteUserAcc,
  // deleteAUser,
  updateUser
} = require("../controllers/user");

// middlewares
const verifyToken = require("../middlewares/auth/verifyJWT");
const emailExists = require("../middlewares/user/emailExists");
const {isAdmin} = require("../middlewares/auth/isAdminMiddleware");


// get the details of JWT verified user
router.get("/me", verifyToken, getVerifiedUser);

//get all users
router.get("/", verifyToken,isAdmin, getAllUsers);

//create user
router.post("/",emailExists,createUser);

// delete logged in user's account and delete its current token
router.delete("/me", verifyToken,deleteUserAcc);

// update all details of user
router.put("/me",verifyToken,updateUser);

module.exports = router;
