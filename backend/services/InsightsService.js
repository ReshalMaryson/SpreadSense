const { generateInsightQueries } = require("./insightsQueryService");
const { humanizeInsights } = require("./insightsHumanizeService");
const { safeFetchJson } = require("../utils/Safefetchjson"); // adjust path to match your project

const QUERY_ENGINE_URL =
  process.env.QUERY_ENGINE_URL || "http://localhost:8000";

/**
 * Full insight pipeline, engine-backed instead of codeExecution.
 * Now routes through safeFetchJson instead of raw fetch — this is what was
 * missing before: safeFetchJson automatically attaches the internal secret
 * header (required by the engine's auth), AND never throws an uncaught
 * SyntaxError if the engine ever returns something non-JSON (a crash, a
 * platform-level error page during a cold restart, etc.) — it returns a
 * clear { ok: false, error: "..." } instead, which we can log and handle.
 */
async function generateInsights(sheetId, csv, insightCount) {
  const columnsResult = await safeFetchJson(`${QUERY_ENGINE_URL}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetId, csv }),
  });

  if (!columnsResult.ok) {
    throw new Error(
      `Failed to fetch columns for insights: ${columnsResult.error}`,
    );
  }

  const { columns } = columnsResult.data;

  const queries = await generateInsightQueries(
    columns,
    insightCount < 500 ? 4 : 6,
  );

  const executed = [];
  for (const query of queries) {
    const engineResult = await safeFetchJson(`${QUERY_ENGINE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheetId,
        csv,
        steps: query.steps,
        final_step: query.final_step,
      }),
    });

    if (!engineResult.ok) {
      console.error(
        `Insight query '${query.topic}' failed (transport/parse):`,
        engineResult.error,
      );
      continue;
    }

    if (engineResult.data.status === "error") {
      console.error(
        `Insight query '${query.topic}' failed to execute:`,
        engineResult.data.detail || engineResult.data.error,
      );
      continue;
    }

    executed.push({ topic: query.topic, result: engineResult.data.data });
  }

  if (executed.length === 0) {
    throw new Error("No insight queries executed successfully");
  }

  const insights = await humanizeInsights(executed);

  return {
    result: { insights },
    usage: null,
  };
}

module.exports = { generateInsights };
