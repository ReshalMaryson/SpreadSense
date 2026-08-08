const MAX_MESSAGE_LENGTH = 1000;
const MIN_MESSAGE_LENGTH = 1;

function validateMessage(req, res, next) {
    const { message, sheetId } = req.body;

    if (typeof message !== "string" || typeof sheetId !== "string") {
        return res.status(400).json({ message: "Invalid request format" });
    }

    const trimmed = message.trim();

    if (trimmed.length < MIN_MESSAGE_LENGTH) {
        return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
            message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
        });
    }

    if (!/^[a-f0-9]{24}$/i.test(sheetId)) {
        return res.status(400).json({ message: "Invalid file reference" });
    }

    req.body.message = trimmed;

    next();
}

module.exports = validateMessage;