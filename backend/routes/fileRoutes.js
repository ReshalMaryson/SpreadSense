const express = require("express");
const router = express.Router();

// middleware
const uploadExcel = require("../middlewares/file/upload");
const verifyToken = require("../middlewares/auth/verifyJWT");
const validateFile = require("../middlewares/file/validateFile");


// controller
const {uploadFile,deleteFile,deleteFileAndContent}  = require("../controllers/file");

// upload file and generate insights.
router.post(
    "/upload",
    verifyToken,
    uploadExcel,
    validateFile,
    uploadFile
);

// delete a file and its related chunks from GridFS and the database.
router.delete("/:id", verifyToken, deleteFile);

// delete a file and its related chunks from GridFS and the database.
router.delete("/hard/:id", verifyToken, deleteFileAndContent);

module.exports = router;