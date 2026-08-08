const express =require("express");
const router=express.Router();

// middleware
const verifyToken=require("../middlewares/auth/verifyJWT");

// controller
const {chat}=require("../controllers/chat");

router.post("/", verifyToken, chat);

module.exports=router;