const mongoose = require("mongoose");

const sheetsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    gridFsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    insights: {
    type: [
        {
            title: { type: String, required: true },
            finding: { type: String, required: true },
        }
    ],
    default: [],
    },
    insightsStatus: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sheet", sheetsSchema);