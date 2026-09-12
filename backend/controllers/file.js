const mongoose = require("mongoose");
const getBucket = require("../config/gridFS");
const { Readable } = require("stream");
const { workbookToCsv } = require("../utils/exlTocsv");
const { generateInsights } = require("../services/InsightsService");

// schema
const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");

// get all files of a logged in user
exports.getUserFiles = async (req, res) => {
  try {
    const userFiles = await Sheet.find({ userId: req.id });

    if (userFiles.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No files Found",
        data: [],
      });
    }

    // response
    const payload = {
      status: true,
      message: "files fetched successfully",
      files: userFiles.map((file) => ({
        _id: file._id,
        originalName: file.originalName,
        fileSize: file.fileSize,
        insights: file.insights,
      })),
    };
    // success response
    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error: Unable to fetch files",
    });
  }
};

// helper fucntion for search files by name
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// search files by name
exports.searchFilesByName = async (req, res) => {
  try {
    const { name } = req.params;

    if (typeof name !== "string" || !name || !name.trim()) {
      return res.status(200).json({
        status: true,
        message: "No search term provided",
        data: [],
      });
    }

    const files = await Sheet.find({
      userId: req.id,
      originalName: { $regex: escapeRegex(name.trim()), $options: "i" },
    }).select("_id originalName fileSize insights");

    return res.status(200).json({
      status: true,
      message: "Files searched successfully",
      data: files,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: "Server Error: Unable to search files",
    });
  }
};

// hard delete file and its contents
exports.deleteFileAndContent = async (req, res) => {
  const session = await mongoose.startSession();
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: false, message: "Invalid file ID" });
  }

  try {
    session.startTransaction();

    const sheet = await Sheet.findOne({
      _id: id,
      userId: req.id,
    }).session(session);

    if (!sheet) {
      await session.abortTransaction();
      return res.status(404).json({ status: false, message: "File not found" });
    }

    const bucket = getBucket();

    await bucket.delete(new mongoose.Types.ObjectId(sheet.gridFsId), {
      session,
    });

    await CSV.deleteOne({ sheetId: sheet._id }).session(session);

    await ChatHistory.deleteMany({
      sheetId: sheet._id,
      userId: req.id,
    }).session(session);

    await Sheet.deleteOne({ _id: sheet._id, userId: req.id }).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      status: true,
      message: "File and related data deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    return res
      .status(500)
      .json({ stauts: false, message: "Failed to delete file" });
  } finally {
    session.endSession();
  }
};

// upload file and generate insights
exports.uploadFile = async (req, res) => {
  let uploadStream = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No file uploaded",
      });
    }

    const MAX_SIZE = 2 * 1024 * 1024;

    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({
        status: false,
        message: "File size cannot exceed 2 MB",
      });
    }

    // NOTE for CSV: this method formats the CSV putting first row as the sheet name and from
    // 2nd row the headers of the sheet start. The query engine skips the first row to handle
    // this , if this changes, update the query engine's parse_csv accordingly.
    const csv = workbookToCsv(req.parsedSheet);

    const sheetId = new mongoose.Types.ObjectId();

    const insightsStart = performance.now();
    let insightsResult;

    try {
      insightsResult = await generateInsights(
        sheetId.toString(),
        csv,
        req.totalRows,
      );
    } catch (firstError) {
      console.error(
        "First insight generation attempt failed. Retrying...",
        firstError,
      );
      try {
        insightsResult = await generateInsights(
          sheetId.toString(),
          csv,
          req.totalRows, // this is being generted in validation middleware.
        );
      } catch (retryError) {
        console.error("Insight generation failed after retry:", retryError);

        return res.status(502).json({
          status: false,
          message: "Failed to analyze the file. Please try again.",
        });
      }
    }

    const elapsed = ((performance.now() - insightsStart) / 1000).toFixed(2);
    console.log(`Insights (engine-backed): ${elapsed}s`);

    const insights = insightsResult.result.insights;
    const session = await mongoose.startSession();

    let file;

    try {
      session.startTransaction();

      const bucket = getBucket();

      uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);

        Readable.from(req.file.buffer).pipe(uploadStream);
      });

      file = await Sheet.create(
        [
          {
            _id: sheetId,
            userId: req.id,
            originalName: req.file.originalname,
            gridFsId: uploadStream.id,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            insights,
            insightsStatus: "ready",
          },
        ],
        { session },
      );

      file = file[0];

      await CSV.create(
        [
          {
            sheetId: file._id,
            csvData: csv,
          },
        ],
        { session },
      );

      await session.commitTransaction();
    } catch (storageError) {
      await session.abortTransaction();

      console.error("File storage failed:");
      console.error(storageError);

      if (uploadStream?.id) {
        try {
          const bucket = getBucket();
          await bucket.delete(uploadStream.id);
        } catch (deleteError) {
          console.error("Failed to cleanup GridFS file:", deleteError);
        }
      }

      return res.status(500).json({
        status: false,
        message: "Failed to upload file",
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      status: true,
      message: "File uploaded successfully",
      file,
    });
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: "Failed to upload file",
      });
    }
  }
};

// download logged in user's file
exports.downloadFile = async (req, res) => {
  try {
    const { sheetId } = req.params;

    if (!sheetId || !mongoose.Types.ObjectId.isValid(sheetId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid sheet Id" });
    }

    const file = await Sheet.findOne({
      _id: sheetId,
      userId: req.id,
    });

    if (!file) {
      return res.status(404).json({
        status: false,
        message: "File not found",
      });
    }

    if (!file.gridFsId) {
      return res.status(404).json({
        status: false,
        message: "File data not found",
      });
    }

    const bucket = getBucket();

    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(file.gridFsId),
    );

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`,
    );

    downloadStream.on("error", (error) => {
      console.error("GridFS download error:", error);

      if (!res.headersSent) {
        return res.status(404).json({
          status: false,
          message: "File data not found",
        });
      }

      res.end();
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: "Failed to download file",
      });
    }
  }
};
