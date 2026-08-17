const mongoose=require("mongoose");
const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");
const { chatWithSheet } = require("../services/geminiMessageService");



// create a chat.
exports.chat = async (req, res) => {
    try {
        const { sheetId,message } = req.body;

        if (!sheetId || !message) {
            return res.status(400).json({ status:false,message: "sheetId and message are required" });
        }

        const sheet = await Sheet.findOne({ _id: sheetId, userId: req.id });

        if (!sheet) {
            return res.status(404).json({ status:false,message: "File not found" });
        }

        const content = await CSV.findOne({ sheetId: sheet._id });

        if (!content) {
            return res.status(404).json({ status:false,message: "File's CSV data not found" });
        }

        // pull recent history for context, oldest first
        const recentHistory = await ChatHistory.find({ userId: req.id, sheetId: sheet._id })
            .sort({ createdAt: -1 })
            .limit(HISTORY_LIMIT)

        const formattedHistory = recentHistory
            .reverse() 
            .flatMap((entry) => [
                { role: "user", text: entry.message },
                { role: "model", text: entry.response },
            ]);

            // this is the call to the service don't touch it.
        const { reply, usage } = await chatWithSheet(content.csvData, message, formattedHistory);

        await ChatHistory.create({
            userId: req.id,
            sheetId: sheet._id,
            message,
            response: reply,
        });
     //success repsonse for a dummy like you
        return res.status(200).json({status:true, response:reply ,usage});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status :false,message: "Failed to process message" });
    }
};

//delete a single chat message
exports.deleteMessage = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await ChatHistory.findById(chatId);

        if (!chat) {
            return res.status(404).json({ status : false,message: "Chat not found" });
        }

        if (chat.userId.toString() !== req.id) {
            return res.status(403).json({ status :false,message: "Unauthorized to delete this chat" });
        }

        await ChatHistory.findByIdAndDelete(chatId);

        return res.status(200).json({ status : true, message: "Chat deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status :false,message: "Failed to delete chat" });
    }
};

// delete chat for a file
exports.deleteConversation = async (req, res) => {
    try {
        const { sheetId } = req.params;

        const result = await ChatHistory.deleteMany({
            sheetId,
            userId: req.id,
        });
        if(!result.deletedCount) {
            return res.status(404).json({status : false, message: "No conversation found to delete" });
        }

        return res.status(200).json({
            status : true,
            message: "Conversation deleted successfully",
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status :false,message: "Failed to delete conversation" });
    }
};

// get chat history for upload window side bar
exports.getChatHistory = async (req, res) => {
    try {
        const chats = await ChatHistory.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.id)
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $group: {
                    _id: "$sheetId",
                    latestChat: {
                        $first: "$$ROOT"
                    }
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$latestChat"
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);

        await ChatHistory.populate(chats, {
            path: "sheetId",
            select: "originalName insights fileSize createdAt _id"
        });
        
        // Handle chats whose Sheet no longer exists
        const validChats = chats.filter(chat => chat.sheetId);

        return res.status(200).json({
            chats: validChats
        });

    } catch (error) {
        console.error("Get chat history error:", error);

        return res.status(500).json({
            message: "Failed to fetch chat history"
        });
    }
};

// get paginated chat history
exports.getMessages = async (req, res) => {
    try {
        const { sheetId } = req.params;
        const { before } = req.query; 

        const sheet = await Sheet.findOne({ _id: sheetId, userId: req.id });

        if (!sheet) {
            return res.status(404).json({ status:false,message: "File not found" });
        }

        const filter = { sheetId, userId: req.id };

        if (before) {
            filter.createdAt = { $lt: new Date(before) };
        }

        const messages = await ChatHistory.find(filter)
            .sort({ createdAt: -1 }) 
            .limit(50);

        return res.status(200).json({
            status:true,
            messages: messages.reverse(), 
            hasMore: messages.length === 50, 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({status:false, message: "Failed to fetch messages" });
    }
};