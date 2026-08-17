const express =require("express");
const router=express.Router();

// middleware
const verifyToken=require("../middlewares/auth/verifyJWT");
const validateChatMessage=require("../middlewares/chat/validateChatMessage");
const dailyDbLimiter=require("../middlewares/rateLimit/dailyLimit");
const chatLimiter=require("../middlewares/rateLimit/rateLimit");

// controllers
const {chat,deleteMessage,deleteConversation,getMessages,getChatHistory}=require("../controllers/chat");

//get paginated chat history
router.get("/:sheetId",verifyToken,chatLimiter, getChatHistory);

//get paginated chat history
router.get("/:sheetId/messages",verifyToken,chatLimiter, getMessages);

//send message 
router.post("/",verifyToken, chatLimiter,dailyDbLimiter, validateChatMessage,chat);

// delete single message 
router.delete("/message/:chatId",chatLimiter, verifyToken, deleteMessage);

//delete a whole conversation
router.delete("/conversation/:sheetId", verifyToken, chatLimiter,deleteConversation);


module.exports=router;