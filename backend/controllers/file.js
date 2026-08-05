const Sheet = require('../models/sheetsSchema');

exports.uploadFile = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const MAX_SIZE = 2 * 1024 * 1024;

        if (req.file.size > MAX_SIZE) {
            return res.status(400).json({
                message: "File size cannot exceed 2 MB"
            });
        }
   
        const file = await Sheet.create({
            userId: req.id,
            originalName: req.file.originalname,
            storedName: req.file.filename,
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            fileSize: req.file.size
        });

        return res.status(201).json({
            message: "File uploaded successfully",
            file
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to upload file"
        });
    }
};