const readXlsxFile = require("read-excel-file/node");

const MAX_TABS = 3;
const MAX_COLS = 10;

async function validateFile(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const rows = await readXlsxFile(req.file.buffer);

        console.log("Tab count:", rows.length);

        if (rows.length > MAX_TABS) {
            return res.status(400).json({
                message: `Invalid: ${rows.length} tabs found, max is ${MAX_TABS}`
            });
        }

        for (const sheet of rows) {
            if (!sheet.data || sheet.data.length === 0) {
                return res.status(400).json({
                    message: `Invalid: sheet "${sheet.sheet}" is empty`
                });
            }
            const colCount = sheet.data[0].length;

            console.log(`Sheet "${sheet.sheet}" — columns: ${colCount}`);

            if (colCount > MAX_COLS) {
                return res.status(400).json({
                    message: `Invalid: sheet '${sheet.sheet}' has ${colCount} columns, max is ${MAX_COLS}`
                });
            }
        }
        const totalRows = rows.reduce((total, sheet) => {
            return total + sheet.data.length - 1;
        }, 0);

        req.totalRows = totalRows;
           console.log("rows : " + totalRows);
        console.log("File passed validation.");
        req.parsedSheet = rows;

        next();

    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: "Invalid or corrupted Excel file."
        });
    }
}

module.exports = validateFile;