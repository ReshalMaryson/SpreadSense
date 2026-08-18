const mongoose = require("mongoose");
const getBucket = require("../config/gridFS");
const { Readable } = require("stream");
const {workbookToCsv} = require("../utils/exlTocsv");
const {generateInsights} = require("../services/geminiService");

// schema 
const Sheet = require("../models/sheetsSchema");
const CSV=require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");


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

// get all files of a logged in user 
exports.getFilesById=async (req,res)=>{
  try{
     const {sheetId}=req.params;

       if(!mongoose.Types.ObjectId.isValid(sheetId)){
        return res.status(400).json({
          status:false,
          message:"invalid Id"
        })
       }

      const file= await Sheet.findOne({_id:sheetId,userId:req.id});

      if(!file){
            return res.status(200).json({
              status:true,
              message:"No files Found",
              data:file
            })
      }

      // response
      const payload = {
        status: true,
        message: "files fetched successfully",
        fileid: file._id,
        originalName: file.originalName,
        fileSize: file.fileSize,
        insights: file.insights,
        // files: userFiles.map((file) => ({
        //   fileid: file._id,
        //   originalName: file.originalName,
        //   fileSize: file.fileSize,
        //   insights: file.insights,
        // })),
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

// upload file and generate insights.
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

    const csv = workbookToCsv(req.parsedSheet);

console.time("Gemini");
    let geminiResult;

    try {
      
      geminiResult = await generateInsights(csv, req.totalRows);
    } catch (firstError) {
      console.error("First Gemini attempt failed. Retrying...");

      try {
        geminiResult = await generateInsights(csv, req.totalRows);
      } catch (retryError) {
        console.error("Gemini failed after retry:");
        console.error(retryError);

        return res.status(502).json({
          status: false,
          message: "Failed to analyze the file. Please try again.",
        });
      }
    }

    const insights = geminiResult.result.insights;
      console.timeEnd("Gemini");
    
      const session = await mongoose.startSession();

    let file;

    try {
      session.startTransaction();

      const bucket = getBucket();

      uploadStream = bucket.openUploadStream(
        req.file.originalname,
        {
          contentType: req.file.mimetype,
        }
      );

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);

        Readable
          .from(req.file.buffer)
          .pipe(uploadStream);
      });

      file = await Sheet.create(
        [
          {
            userId: req.id,
            originalName: req.file.originalname,
            gridFsId: uploadStream.id,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            insights,
            insightsStatus: "ready",
          },
        ],
        { session }
      );

      file = file[0];

      await CSV.create(
        [
          {
            sheetId: file._id,
            csvData: csv,
          },
        ],
        { session }
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

// download file
exports.downloadFile = async (req, res) => {
    try {
        const { sheetId } = req.params;
        
        const file = await Sheet.findOne({
            _id: sheetId,
            userId: req.id
        });

        if (!file) {
            return res.status(404).json({
                status: false,
                message: "File not found"
            });
        }

        if (!file.gridFsId) {
            return res.status(404).json({
                status: false,
                message: "File data not found"
            });
        }

        const bucket = getBucket();

        const downloadStream = bucket.openDownloadStream(
            new mongoose.Types.ObjectId(file.gridFsId)
        );

        res.setHeader(
            "Content-Type",
            file.mimeType || "application/octet-stream"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.originalName}"`
        );

        downloadStream.on("error", (error) => {
            console.error("GridFS download error:", error);

            if (!res.headersSent) {
                return res.status(404).json({
                    status: false,
                    message: "File data not found"
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
                message: "Failed to download file"
            });
        }
    }
};