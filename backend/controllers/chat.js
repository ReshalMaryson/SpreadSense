const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");
const { chatWithSheet } = require("../services/geminiMessageService");

const HISTORY_LIMIT = 10; 

exports.chat = async (req, res) => {
    try {
        const { sheetId, message } = req.body;

        if (!sheetId || !message) {
            return res.status(400).json({ message: "sheetId and message are required" });
        }

        const sheet = await Sheet.findOne({ _id: sheetId, userId: req.id });

        if (!sheet) {
            return res.status(404).json({ message: "File not found" });
        }

        const content = await CSV.findOne({ sheetId: sheet._id });

        if (!content) {
            return res.status(404).json({ message: "File data not found" });
        }

        // pull recent history for context, oldest first
        const recentHistory = await ChatHistory.find({ userId: req.id, sheetId: sheet._id })
            .sort({ createdAt: -1 })
            .limit(HISTORY_LIMIT);

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

        return res.status(200).json({ reply });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to process message" });
    }
};