// models/sheetContentSchema.js
const mongoose = require("mongoose");

const csvSchema = new mongoose.Schema(
    {
        sheetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sheet",
            required: true,
            unique: true,
        },
        csvData: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("csv", csvSchema);