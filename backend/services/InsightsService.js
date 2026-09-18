const { generateInsightQueries } = require("./insightsQueryService");
const { humanizeInsights } = require("./insightsHumanizeService");
const { safeFetchJson } = require("../utils/Safefetchjson");

const QUERY_ENGINE_URL =
  process.env.QUERY_ENGINE_URL || "http://localhost:8000";

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

  const { sheets } = columnsResult.data;

  const queries = await generateInsightQueries(
    sheets,
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
