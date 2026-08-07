require("dotenv").config();
const { generateInsights } = require("./services/geminiService");

const sampleCsv = `Sheet: Sheet1
Date,Brand,Category,Price
2025-01-02,Kia,SUV,5000000
2025-01-02,Toyota,Sedan,6046000
2025-02-02,Kia,SUV,9030000`;

async function test() {
    const { result, usage } = await generateInsights(sampleCsv);
    console.log(result);``
    console.log(usage);
}

test().catch(console.error);