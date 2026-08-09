const express =require("express");
const router=express.Router();

// middleware
const verifyToken=require("../middlewares/auth/verifyJWT");
const validateChatMessage=require("../middlewares/chat/validateChatMessage");

// controller
const {chat,deleteMessage,deleteConversation,getMessages}=require("../controllers/chat");

//get paginated chat history
router.get("/:sheetId/messages", verifyToken, getMessages);

//send message 
router.post("/", verifyToken, validateChatMessage, chat);

// delete single message 
router.delete("/message/:chatId", verifyToken, deleteMessage);

//delete a whole conversation
router.delete("/conversation/:sheetId", verifyToken, deleteConversation);


module.exports=router;