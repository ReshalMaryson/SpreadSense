const cron = require("node-cron");
const mongoose = require("mongoose");
const getBucket = require("../config/gridFS");

//Schemas
const Sheet = require("../models/sheetsSchema");
const CSV = require("../models/csvSchema");
const chatHistory = require("../models/chatHistorySchema");

const RETENTION_DAYS = 20;

async function purgeOldSheets({ userId } = {}) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const query = { createdAt: { $lt: cutoff } };
  if (userId) {
    query.userId = userId;
  }

  const oldSheets = await Sheet.find(query, { _id: 1, gridFsId: 1 });

  if (oldSheets.length === 0) {
    console.log(
      `[purge] No sheets older than ${RETENTION_DAYS} days${userId ? ` for user ${userId}` : ""}.`,
    );
    return { purged: 0, gridFsFailures: 0 };
  }

  const sheetIds = oldSheets.map((s) => s._id);
  console.log(
    `[purge] Purging ${sheetIds.length} sheet(s)${userId ? ` for user ${userId}` : ""}.`,
  );

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await chatHistory.deleteMany({ sheetId: { $in: sheetIds } }, { session });
    await CSV.deleteMany({ sheetId: { $in: sheetIds } }, { session });
    await Sheet.deleteMany({ _id: { $in: sheetIds } }, { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error(
      "[purge] Batch Mongo delete failed, aborted — nothing was removed:",
      err.message,
    );
    throw err;
  } finally {
    await session.endSession();
  }

  // GridFS blob deletes happen AFTER the Mongo transaction commits (GridFS
  // itself isn't transactional), run in parallel, and are independently
  // caught — one bad id can't block the others, and Mongo records are
  // already gone regardless of GridFS outcome by this point.
  const bucket = getBucket();
  const gridFsResults = await Promise.allSettled(
    oldSheets
      .filter((s) => s.gridFsId)
      .map((s) => bucket.delete(new mongoose.Types.ObjectId(s.gridFsId))),
  );

  const gridFsFailures = gridFsResults.filter(
    (r) => r.status === "rejected",
  ).length;
  if (gridFsFailures > 0) {
    console.error(
      `[purge] ${gridFsFailures} GridFS blob(s) failed to delete (Mongo records already removed for all).`,
    );
  }

  console.log(
    `[purge] Done. Purged ${sheetIds.length} sheet(s), ${gridFsFailures} GridFS failure(s).`,
  );
  return { purged: sheetIds.length, gridFsFailures };
}

// Registers the daily 3 AM schedule — does not run anything immediately.
// Left in as a bonus for whenever this runs on an always-on instance; the
// real guarantee for a free-tier deploy is the login-triggered call.
function schedulePurgeJob() {
  cron.schedule("0 3 * * *", () => {
    console.log("[purge] Running scheduled purge job...");
    purgeOldSheets().catch((err) => {
      console.error("[purge] Unexpected error in scheduled purge job:", err);
    });
  });
  console.log("[purge] Purge job scheduled (daily at 3:00 AM).");
}

module.exports = { purgeOldSheets, schedulePurgeJob };
