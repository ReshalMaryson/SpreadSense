const express = require("express");
const router = express.Router();

// middleware
const uploadExcel = require("../middlewares/file/upload");
const verifyToken = require("../middlewares/auth/verifyJWT");
const validateFile = require("../middlewares/file/validateFile");


// controller
const {uploadFile,deleteFile,deleteFileAndContent,getUserFiles,uploadTest}  = require("../controllers/file");
const ratelimiter = require("../middlewares/rateLimit/rateLimit");

// upload file and generate insights.
router.post(
    "/upload",
    verifyToken,
    uploadExcel,
    validateFile,
    uploadTest
);

//get the files of logged in user
router.get("/me",verifyToken,getUserFiles);

// delete a file and its related chunks from GridFS and the database.
router.delete("/:id", verifyToken, ratelimiter,deleteFile);

// delete a file and its related chunks from GridFS and the database.
router.delete("/hard/:id", verifyToken, ratelimiter,deleteFileAndContent);

module.exports = router;