const mongoose = require("mongoose");
const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const ChatHistory = require("../models/chatHistorySchema");

const { generateQuery } = require("../services/geminiQueryService");
const { humanizeResult } = require("../services/Humanizeservice ");

//delete a single chat message
exports.deleteMessage = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await ChatHistory.findById(chatId);

    if (!chat) {
      return res.status(404).json({ status: false, message: "Chat not found" });
    }

    if (chat.userId.toString() !== req.id) {
      return res
        .status(403)
        .json({ status: false, message: "Unauthorized to delete this chat" });
    }

    await ChatHistory.findByIdAndDelete(chatId);

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

    if (!sheetId || !message) {
      return res
        .status(400)
        .json({ status: false, message: "sheetId and message are required" });
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

    // pull recent history for context, oldest first — also tells generateQuery
    // whether this is the very first message (empty array) and lets it match tone.
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

    const columnsResponse = await fetch(
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
    const { columns } = await columnsResponse.json();

    let query;
    try {
      query = await generateQuery(message, columns, formattedHistory);
      console.log(query);
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
      // No data was touched — Gemini decided this wasn't a real data question.
      reply = query.reply;
    } else {
      const executeResponse = await fetch(
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
      engineResult = await executeResponse.json();
      //console.log("from chat.js, engineResult:\n", engineResult);

      if (engineResult.status === "error") {
        return res.status(400).json({
          status: false,
          message: engineResult.detail || engineResult.error,
        });
      }

      // If it's a compound (multi-fact) answer, translate the raw step-id
      // keys into the real labels Gemini supplied — e.g. { s2: {...}, s3: {...} }
      // becomes { "sales rep name": ..., "their total revenue": ... }. Without
      // this, humanizeResult only sees opaque ids and either leaks them
      // verbatim or has to guess a label, which has produced wrong labels
      // before (e.g. calling a ratings count "views").
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
