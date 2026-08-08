const express =require("express");
const router=express.Router();

// middleware
const verifyToken=require("../middlewares/auth/verifyJWT");
const validateChatMessage=require("../middlewares/chat/validateChatMessage");

// controller
const {chat}=require("../controllers/chat");

router.post("/", verifyToken, validateChatMessage, chat);

module.exports=router;