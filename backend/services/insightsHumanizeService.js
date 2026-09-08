const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You will be given a list of already-computed facts about a spreadsheet — each
one has a topic label and the real, exact result already pulled from the data.
You do not calculate anything, look anything up, or use any outside knowledge —
even if a name in the data looks familiar to you, treat it as ordinary data,
never as something you already know facts about. You only phrase what is given.

For each item you are given, produce exactly one output item with:
- "topic": copy the exact topic string you were given for this item, unchanged — this is how
  your output gets matched back to the input, so it must be identical, not paraphrased.
- "title": a short 3-5 word title naming the theme WITHOUT revealing the actual number,
  comparison, or answer — it should make the reader want to read the finding, not replace it.
  ("Most Expensive Months", not "June-July Spending Hit 500K.")
- "finding": a single clear, professional sentence containing the actual specific detail — the
  real number(s)/name(s) already given to you for THIS topic. Never invent, adjust, round, or
  substitute a value or name that wasn't given to you for this exact topic.

CRITICAL — one-to-one correspondence:
- You MUST return exactly the same number of items you were given, one per input topic, in the
  same order.
- Never merge two input topics into one output, never split one into two.
- Never add an item for a fact you were not given, even if it seems interesting or you recall it
  from general knowledge. Every output must trace back to exactly one input item's given result.
- Never drop an input topic just because it seems less interesting than another.

Rules:
- Never mention spreadsheets, CSV, rows, columns, code, pandas, or that you are an AI.
- If a currency/unit is implied by the column names, use it consistently; otherwise state raw numbers.
- Tone: clear and natural, like a competent colleague explaining a finding — not stiff or jargon-heavy.
`;

function validateCorrespondence(inputItems, outputItems) {
  if (!Array.isArray(outputItems) || outputItems.length !== inputItems.length) {
    throw new Error(
      `Humanize returned ${outputItems?.length ?? 0} items, expected ${inputItems.length}`,
    );
  }

  const inputTopics = inputItems.map((i) => i.topic);
  const outputTopics = outputItems.map((i) => i.topic);

  for (const topic of inputTopics) {
    if (!outputTopics.includes(topic)) {
      throw new Error(`Humanize dropped or renamed topic: '${topic}'`);
    }
  }
  for (const topic of outputTopics) {
    if (!inputTopics.includes(topic)) {
      throw new Error(`Humanize invented an untracked topic: '${topic}'`);
    }
  }
}

async function humanizeInsights(items) {
  const prompt = JSON.stringify(items);

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                title: { type: "string" },
                finding: { type: "string" },
              },
              required: ["topic", "title", "finding"],
            },
          },
        },
        required: ["insights"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  const insights = parsed.insights;

  validateCorrespondence(items, insights);
  return insights.map(({ topic, ...rest }) => rest);
}

module.exports = { humanizeInsights };
