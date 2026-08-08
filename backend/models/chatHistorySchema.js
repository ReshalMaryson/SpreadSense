const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sheetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sheet",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        response: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

chatHistorySchema.index({ userId: 1, sheetId: 1, createdAt: 1 });

module.exports = mongoose.model("ChatHistory", chatHistorySchema);