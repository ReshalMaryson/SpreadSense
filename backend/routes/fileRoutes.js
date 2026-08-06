const express = require("express");
const router = express.Router();

// middleware
const uploadExcel = require("../middlewares/file/upload");
const verifyToken = require("../middlewares/auth/verifyJWT");
const validateFile = require("../middlewares/file/validateFile");


// controller
const {uploadFile}  = require("../controllers/file");


router.post(
    "/upload",
    verifyToken,
    uploadExcel,
    validateFile,
    uploadFile
);

module.exports = router;