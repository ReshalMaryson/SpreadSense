const mongoose = require("mongoose");
const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");

const { generateQuery } = require("../services/geminiQueryService");
const { humanizeResult } = require("../services/Humanizeservice ");
const { safeFetchJson } = require("../utils/Safefetchjson");

// delete a single chat
exports.deleteMessage = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await ChatHistory.findOneAndDelete({
      _id: chatId,
      userId: req.id,
    });

    if (!chat) {
      return res.status(404).json({ status: false, message: "Chat not found" });
    }

    return res
      .status(200)
      .json({ status: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Failed to delete chat" });
  }
};

// delete chat for a file
exports.deleteConversation = async (req, res) => {
  try {
    const { sheetId } = req.params;

    if (!sheetId || !mongoose.Types.ObjectId.isValid(sheetId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid sheetId" });
    }

    const result = await ChatHistory.deleteMany({
      sheetId,
      userId: req.id,
    });

    if (!result.deletedCount) {
      return res
        .status(404)
        .json({ status: false, message: "No conversation found to delete" });
    }

    return res.status(200).json({
      status: true,
      message: "Conversation deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Failed to delete conversation" });
  }
};

// get chat history for upload window side bar
exports.getChatHistory = async (req, res) => {
  try {
    const chats = await ChatHistory.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.id),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$sheetId",
          latestChat: {
            $first: "$$ROOT",
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$latestChat",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    await ChatHistory.populate(chats, {
      path: "sheetId",
      select: "originalName insights fileSize createdAt _id",
    });

    // Handle chats whose Sheet no longer exists
    const validChats = chats.filter((chat) => chat.sheetId);

    return res.status(200).json({
      chats: validChats,
    });
  } catch (error) {
    console.error("Get chat history error:", error);

    return res.status(500).json({
      message: "Failed to fetch chat history",
    });
  }
};

// get paginated chat history
exports.getMessages = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { before } = req.query;

    if (!mongoose.Types.ObjectId.isValid(sheetId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid sheetId",
      });
    }

    const sheet = await Sheet.findOne({
      _id: sheetId,
      userId: req.id,
    });

    if (!sheet) {
      return res.status(404).json({
        status: false,
        message: "File not found",
      });
    }

    const filter = {
      sheetId,
      userId: req.id,
    };

    if (before) {
      filter.createdAt = {
        $lt: new Date(before),
      };
    }

    const messages = await ChatHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(51);

    if (messages.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No chats found",
        messages: [],
        hasMore: false,
      });
    }

    const hasMore = messages.length > 50;
    const result = messages.slice(0, 50).reverse();

    const formattedMessages = [];

    result.forEach((chat) => {
      formattedMessages.push({
        role: "user",
        text: chat.message,
        createdAt: chat.createdAt,
      });

      formattedMessages.push({
        role: "file",
        text: chat.response,
        createdAt: chat.createdAt,
      });
    });
    return res.status(200).json({
      status: true,
      messages: formattedMessages,
      hasMore,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch messages",
    });
  }
};

//send a message and create chat.
exports.chat = async (req, res) => {
  const HISTORY_LIMIT = 10;
  try {
    const { sheetId, message } = req.body;

    if (
      typeof message !== "string" ||
      !sheetId ||
      !message ||
      message.trim() === ""
    ) {
      return res
        .status(400)
        .json({ status: false, message: "sheetId and message are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(sheetId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid sheetId" });
    }

    const sheet = await Sheet.findOne({ _id: sheetId, userId: req.id });

    if (!sheet) {
      return res.status(404).json({ status: false, message: "File not found" });
    }

    const content = await CSV.findOne({ sheetId: sheet._id });

    if (!content) {
      return res
        .status(404)
        .json({ status: false, message: "File's CSV data not found" });
    }

    const recentHistory = await ChatHistory.find({
      userId: req.id,
      sheetId: sheet._id,
    })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT);

    const formattedHistory = recentHistory.reverse().flatMap((entry) => [
      { role: "user", text: entry.message },
      { role: "model", text: entry.response },
    ]);

    const columnsResult = await safeFetchJson(
      `${process.env.QUERY_ENGINE_URL}/columns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: sheet._id.toString(),
          csv: content.csvData,
        }),
      },
    );

    if (!columnsResult.ok) {
      console.error(
        "Failed to fetch columns from query engine:",
        columnsResult.error,
      );
      return res.status(502).json({
        status: false,
        message: "Could not read your data right now. Please try again.",
      });
    }

    const { columns } = columnsResult.data;

    let query;
    try {
      query = await generateQuery(message, columns, formattedHistory);
    } catch (queryError) {
      console.error("Gemini query generation failed:", queryError);
      return res.status(502).json({
        status: false,
        message: "Could not understand that question against your data.",
      });
    }

    let reply;
    let engineResult = null;

    if (query.type === "conversation") {
      reply = query.reply;
    } else {
      const executeResult = await safeFetchJson(
        `${process.env.QUERY_ENGINE_URL}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetId: sheet._id.toString(),
            csv: content.csvData,
            steps: query.steps,
            final_step: query.final_step,
          }),
        },
      );

      if (!executeResult.ok) {
        console.error(
          "Failed to execute query against query engine:",
          executeResult.error,
        );
        return res.status(502).json({
          status: false,
          message:
            "Something went wrong running that against your data. Please try again.",
        });
      }

      engineResult = executeResult.data;

      if (engineResult.status === "error") {
        return res.status(400).json({
          status: false,
          message: engineResult.detail || engineResult.error,
        });
      }

      let dataForHumanize = engineResult.data;
      if (engineResult.kind === "multiple" && query.final_labels) {
        dataForHumanize = {};
        for (const [stepId, valueObj] of Object.entries(engineResult.data)) {
          const label = query.final_labels[stepId] || stepId;
          dataForHumanize[label] = valueObj.data;
        }
      }

      try {
        reply = await humanizeResult(message, dataForHumanize);
      } catch (humanizeError) {
        console.error("Humanize step failed:", humanizeError);
        reply = `Answer: ${JSON.stringify(engineResult.data)}`;
      }
    }

    await ChatHistory.create({
      userId: req.id,
      sheetId: sheet._id,
      message,
      response: reply,
    });

    return res
      .status(200)
      .json({ status: true, response: reply, engineResult });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Failed to process message" });
  }
};
