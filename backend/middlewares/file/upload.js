const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
        cb(null, true);
    } else {
        cb(new Error("Only Excel files are allowed"));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter
});

const uploadExcel = (req, res, next) => {

    upload.single("excelFile")(req, res, (err) => {

        if (err instanceof multer.MulterError) {

            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "File size cannot exceed 2 MB"
                });
            }

            return res.status(400).json({
                message: err.message
            });
        }

        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }

        next();
    });
};

module.exports = uploadExcel;