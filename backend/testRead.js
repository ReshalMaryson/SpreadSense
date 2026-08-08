require("dotenv").config();
const { chatWithSheet } = require("./services/geminiMessageService");

const sampleCsv = `Sheet: Sheet1
Date,Brand,Category,Price
2025-01-02,Kia,SUV,5000000
2025-01-02,Toyota,Sedan,6046000
2025-02-02,Kia,SUV,9030000`;

async function test() {
    const { reply, usage } = await chatWithSheet(sampleCsv, "what would be the sum of the price of only KIA and what are the category?");
    console.log(reply);
    console.log(usage);
}

test().catch(console.error);