const Sheet = require("../models/sheetsSchema");
const getBucket = require("../config/gridfs");
const { Readable } = require("stream");
const {workbookToCsv} = require("../utils/exlTocsv");

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
    // console.log(csv);  // whole CSV formated data

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