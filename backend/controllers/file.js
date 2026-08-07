const mongoose = require("mongoose");
const getBucket = require("../config/gridfs");
const { Readable } = require("stream");
const {workbookToCsv} = require("../utils/exlTocsv");
const {generateInsights} = require("../services/geminiService");

// schema 
const Sheet = require("../models/sheetsSchema");

// upload file and generate insights.
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ message: "File size cannot exceed 2 MB" });
    }

    // this thing converts the parsed excel sheet to csv format.
    const csv = workbookToCsv(req.parsedSheet);
    let insights;
        try {
      const { result } = await generateInsights(csv);
      insights = result.insights;
    } catch (aiError) {
      console.error("Gemini insight generation failed:", aiError);
      return res.status(502).json({
        message: "Failed to analyze the file. Please try again.",
      });
    }


    const bucket = getBucket(); // fsGrid current bucket
    
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    Readable.from(req.file.buffer).pipe(uploadStream);

    uploadStream.on("finish", async () => {
      const file = await Sheet.create({
        userId: req.id,
        originalName: req.file.originalname,
        gridFsId: uploadStream.id,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        insights
      });

      return res.status(201).json({
        message: "File uploaded successfully",
        file,
      });
    });

    uploadStream.on("error", (err) => {
      console.error(err);
      return res.status(500).json({ message: "Failed to upload file" });
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload file" });
  }
};

// delete a file and its related chunks from GridFS and the database.
exports.deleteFile = async (req, res) => {
    try {
        const sheet = await Sheet.findOne({
            _id: req.params.id,
            userId: req.id, 
        });

        if (!sheet) {
            return res.status(404).json({ message: "File not found" });
        }

        const bucket = getBucket();

        // this thing deletes both the files doc and all associated chunks in one call
        await bucket.delete(new mongoose.Types.ObjectId(sheet.gridFsId));

        await Sheet.deleteOne({ _id: sheet._id });

        return res.status(200).json({ message: "File deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete file" });
    }
};