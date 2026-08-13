const mongoose = require("mongoose");
const getBucket = require("../config/gridfs");
const { Readable } = require("stream");
const {workbookToCsv} = require("../utils/exlTocsv");
const {generateInsights} = require("../services/geminiService");

// schema 
const Sheet = require("../models/sheetsSchema");
const CSV=require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");

// upload file and generate insights.
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({stauts:false, message: "No file uploaded" });
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ stauts:false,message: "File size cannot exceed 2 MB" });
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
        stauts:false,
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

      // saving csv to DB
      await CSV.create({
        sheetId:file._id,
        csvData:csv
      });

      // success response with file details
      return res.status(201).json({
        stauts:true,
        message: "File uploaded successfully",
        file,
      });
    });

    uploadStream.on("error", (err) => {
      console.error(err);
      return res.status(500).json({ status :false, message: "Failed to upload file" });
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status :"failure",message: "Failed to upload file" });
  }
};

// get all files of a logged in user 
exports.getUserFiles=async (req,res)=>{
  try{
      const userFiles= await Sheet.find({userId:req.id});
      if(userFiles.length === 0){
            return res.status(200).json({
              status:true,
              message:"No files Found",
              data:[]
            })
      }

      // response
      const payload = {
        status: true,
        message: "files fetched successfully",
        files: userFiles.map((file) => ({
          fileid: file._id,
          originalName: file.originalName,
          fileSize: file.fileSize,
          insights: file.insights,
        })),
      };
      // success response
      return res.status(200).json(payload)

  }catch (error) {
        console.error(error);
        return res.status(500).json({
          status :false, 
          message: "Server Error: Unable to fetch files",
        });
    }
}
// delete a file and its related chunks from GridFS and the database.
exports.deleteFile = async (req, res) => {
    try {
        const sheet = await Sheet.findOne({
            _id: req.params.id,
            userId: req.id, 
        });

        if (!sheet) {
            return res.status(404).json({status :false, message: "File not found" });
        }

        const bucket = getBucket();

        // this thing deletes both the files doc and all associated chunks in one call
        await bucket.delete(new mongoose.Types.ObjectId(sheet.gridFsId));

        await Sheet.deleteOne({ _id: sheet._id });

        return res.status(200).json({ status:true ,message: "File deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({status :false, message: "Failed to delete file" });
    }
};

// hard delete file and its contents
exports.deleteFileAndContent = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const sheet = await Sheet.findOne({
            _id: req.params.id,
            userId: req.id,
        }).session(session);

        if (!sheet) {
            await session.abortTransaction();
            return res.status(404).json({ status : false, message: "File not found" });
        }

        const bucket = getBucket();

        await bucket.delete(new mongoose.Types.ObjectId(sheet.gridFsId), { session });

        await CSV.deleteOne({ sheetId: sheet._id }).session(session);

        await ChatHistory.deleteMany({ sheetId: sheet._id, userId: req.id }).session(session);

        await Sheet.deleteOne({ _id: sheet._id }).session(session);

        await session.commitTransaction();

        return res.status(200).json({status :true, message: "File and related data deleted successfully" });

    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.status(500).json({ stauts:false, message: "Failed to delete file" });
    } finally {
        session.endSession();
    }
};