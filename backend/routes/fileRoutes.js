const express = require("express");
const router = express.Router();

// middleware
const uploadExcel = require("../middlewares/file/upload");
const verifyToken = require("../middlewares/auth/verifyJWT");


// controller
const {uploadFile}  = require("../controllers/file");


router.post(
    "/upload",
    verifyToken,
    uploadExcel,
    uploadFile
);

module.exports = router;